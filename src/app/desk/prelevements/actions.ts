"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { REJETS_AVANT_SUSPENSION, type MandatPrelevement } from "@/lib/domain/mandat";
import { echeanceDuJour, jourDuPreavis, MOTIFS, pourquoiPasRemettre, refDeLaRemise, suiteDuRejet, type MotifDeRejet } from "@/lib/domain/prelevement";
import { direLeRejet, envoyerPreavisDePrelevement } from "@/lib/notify/prelevement";
import { escapeHtml, fmt, fmtDate } from "@/lib/format";

export type PrelevementResult = { ok: true; message: string } | { ok: false; error: string };

const jourSchema = z.object({ dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/**
 * PRÉPARER ET ANNONCER UNE ÉCHÉANCE, d'un seul geste.
 *
 * Les deux sont séparables en théorie et ne le sont pas en pratique : une
 * échéance préparée qu'on oublie d'annoncer est une échéance qui ne partira
 * pas, et personne ne saura pourquoi. Le geste fait donc les deux, et il rend
 * le compte de ce qui est parti et de ce qui ne l'est pas.
 *
 * L'ANNONCE EST IDEMPOTENTE. Relancer le geste ne recrée pas les tirages (la
 * base tient l'unicité par mandat et par échéance) et ne renvoie un préavis
 * qu'à ceux dont il n'est pas parti : c'est exactement ce qu'on veut faire le
 * lendemain d'un canal cassé qui a été réparé.
 */
export async function preparerLEcheance(_p: PrelevementResult | null, form: FormData): Promise<PrelevementResult> {
  const desk = await requireDesk("/desk/prelevements");
  const p = jourSchema.safeParse({ dueOn: String(form.get("dueOn") ?? "") });
  if (!p.success) return { ok: false, error: "Indiquez le jour de l'échéance." };
  const { dueOn } = p.data;

  const r = repo();
  const [mandats, standings, deja] = await Promise.all([r.listMandats(), r.listStandingOrders().catch(() => []), r.listTirages({ dueOn })]);
  const { aTirer } = echeanceDuJour(mandats, standings, dueOn);
  /* LES SECONDES PRÉSENTATIONS SONT DE LA PARTIE.
     Un tirage né d'un rejet tombe quinze jours plus tard, un jour qui n'est
     celui d'aucun mandat : « aTirer » est alors vide, l'action refusait tout,
     et le tirage restait préparé sans jamais être annoncé ni remis. La
     promesse « nous le représenterons une fois, et nous vous préviendrons
     avant » ne pouvait pas être tenue. Mesuré à l'écran le 10 octobre 2026. */
  const parMandat = new Map(deja.map((t) => [t.mandatId, t]));
  const aAnnoncer = [
    ...aTirer,
    ...deja
      .filter((t) => t.state === "prepare" && !t.noticeSent && !aTirer.some((a) => a.mandat.id === t.mandatId))
      .map((t) => ({ mandat: mandats.find((m) => m.id === t.mandatId), amount: t.amount }))
      .filter((x): x is { mandat: MandatPrelevement; amount: number } => Boolean(x.mandat)),
  ];
  if (!aAnnoncer.length) return { ok: false, error: "Aucun mandat ne se présente à cette échéance." };
  let crees = 0;
  let partis = 0;
  const muets: string[] = [];

  for (const { mandat, amount } of aAnnoncer) {
    let t = parMandat.get(mandat.id);
    if (!t) {
      try {
        t = await r.creerTirage({ mandatId: mandat.id, userId: mandat.userId, dueOn, amount });
        crees += 1;
      } catch {
        // L'unicité a parlé : un autre onglet vient de préparer la même échéance.
        continue;
      }
    }
    if (t.state !== "prepare" || t.noticeSent) continue;
    const envoi = await envoyerPreavisDePrelevement(mandat, { dueOn, amount: t.amount });
    await r.updateTirage(t.id, { announcedAt: new Date().toISOString(), noticeSent: envoi.sent, noticeError: envoi.error });
    if (envoi.sent) partis += 1;
    else muets.push(`${mandat.ref} (${envoi.error ?? "canal muet"})`);
  }

  await audit("prelevement.echeance", "echeance", dueOn, { after: { crees, partis, muets: muets.length }, reason: `Échéance du ${dueOn} : ${aAnnoncer.length} tirages, ${partis} préavis partis` });
  await r.logEvent({ kind: "desk", html: `Échéance de prélèvement du ${dueOn} préparée : <b>${aAnnoncer.length} tirages</b>, ${partis} préavis partis${muets.length ? `, <b>${muets.length} sans canal</b>` : ""} · par ${desk.name}` });
  revalidatePath("/desk/prelevements");
  revalidatePath("/moi/prelevements");
  return {
    ok: true,
    message: muets.length
      ? `${crees} tirages préparés, ${partis} préavis partis. ${muets.length} sans canal, donc ils ne partiront pas : ${muets.join(" · ")}`
      : `${crees} tirages préparés, ${partis} préavis partis.`,
  };
}

/**
 * REMETTRE L'ÉCHÉANCE À LA BANQUE.
 *
 * La remise ne prend que les tirages dont le préavis est parti, et les autres
 * restent en l'état plutôt que d'être abandonnés : un canal réparé demain les
 * fait partir à l'échéance suivante, et un tirage abandonné en silence serait
 * une épargne qui saute sans que personne ne le voie.
 */
export async function remettreALaBanque(_p: PrelevementResult | null, form: FormData): Promise<PrelevementResult> {
  const desk = await requireDesk("/desk/prelevements");
  const p = jourSchema.safeParse({ dueOn: String(form.get("dueOn") ?? "") });
  if (!p.success) return { ok: false, error: "Indiquez le jour de l'échéance." };
  const { dueOn } = p.data;
  const aujourdHui = new Date().toISOString().slice(0, 10);

  const r = repo();
  const tirages = await r.listTirages({ dueOn });
  const prets = tirages.filter((t) => pourquoiPasRemettre(t, aujourdHui) === null);
  if (!prets.length) {
    const attente = tirages.filter((t) => pourquoiPasRemettre(t, aujourdHui) === "pas_parti").length;
    return { ok: false, error: attente ? `Aucun tirage remettable : ${attente} attendent encore que leur préavis parte.` : "Aucun tirage remettable à cette échéance, ou l'échéance n'est pas venue." };
  }

  const remises = await r.listRemises(200);
  let remise = remises.find((x) => x.dueOn === dueOn);
  if (remise?.state === "remise") return { ok: false, error: `La remise ${remise.ref} est déjà partie. Un second fichier pour le même jour serait un double prélèvement.` };
  if (!remise) remise = await r.creerRemise({ ref: refDeLaRemise(dueOn), dueOn, createdBy: desk.name });

  const quand = new Date().toISOString();
  for (const t of prets) await r.updateTirage(t.id, { state: "remis", remiseId: remise.id, handedAt: quand });
  await r.remettreRemise(remise.id, { handedBy: desk.name });

  const total = prets.reduce((s, t) => s + t.amount, 0);
  await audit("prelevement.remise", "remise", remise.id, { after: { ref: remise.ref, dueOn, lignes: prets.length, total }, reason: `Remise ${remise.ref} : ${prets.length} tirages, ${fmt(total)} FCFA` });
  await r.logEvent({ kind: "desk", html: `Remise <b>${escapeHtml(remise.ref)}</b> : ${prets.length} prélèvements, <b>${fmt(total)} FCFA</b>, échéance du ${dueOn} · par ${desk.name}` });
  revalidatePath("/desk/prelevements");
  revalidatePath("/moi/prelevements");
  return { ok: true, message: `Remise ${remise.ref} constituée : ${prets.length} tirages, ${fmt(total)} FCFA. Téléchargez le fichier et déposez-le à la banque.` };
}

const sortSchema = z.object({
  id: z.string().min(1),
  sort: z.enum(["encaisse", "rejete"]),
  motif: z.enum(["provision_insuffisante", "compte_clos", "opposition", "coordonnees_erronees", "mandat_inconnu", "autre"]).optional(),
  note: z.string().trim().max(200).optional(),
});

/**
 * LE SORT D'UN TIRAGE, et tout ce qu'il entraîne.
 *
 * Encaissé : le mouvement entre au journal du client comme une provision, sans
 * affectation. C'est le même chemin qu'un virement reçu, et c'est voulu : il
 * n'y a qu'une façon pour l'argent d'entrer chez un client.
 *
 * Rejeté : la CAUSE décide. Rejouable, on remet une seconde présentation au
 * calendrier et on le dit au client ; sinon, le mandat se suspend sur-le-champ.
 * Le compteur de rejets du mandat ne sert qu'à la seule cause transitoire, et
 * il se remet à zéro au premier encaissement : deux rejets séparés de six mois
 * ne sont pas un acharnement.
 */
export async function direLeSort(_p: PrelevementResult | null, form: FormData): Promise<PrelevementResult> {
  const desk = await requireDesk("/desk/prelevements");
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim()) raw[k] = v.trim();
  });
  const p = sortSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Geste incomplet : rien n'a bougé." };
  const { id, sort, motif, note } = p.data;

  const r = repo();
  const t = (await r.listTirages()).find((x) => x.id === id);
  if (!t) return { ok: false, error: "Ce tirage n'existe plus." };
  if (t.state !== "remis") return { ok: false, error: `Ce tirage est déjà ${t.state === "encaisse" ? "encaissé" : t.state === "rejete" ? "rejeté" : "en préparation"} : rechargez la file.` };
  const mandats = await r.listMandats();
  const mandat = mandats.find((m) => m.id === t.mandatId);
  if (!mandat) return { ok: false, error: "Le mandat de ce tirage est introuvable." };
  const quand = new Date().toISOString();
  /* L AVIS SUIT LE SORT, ET SEULEMENT LUI : un prélèvement annoncé n a rien
     prouvé tant qu il n est pas passé. Son échec ne retient pas le sort. */
  const avisDuTirage = async () => {
    try {
      const { generateAvisTirage } = await import("@/lib/documents/generate");
      await generateAvisTirage(id, desk.name);
    } catch (e) {
      await r.logEvent({ kind: "system", html: `Avis de prélèvement non produit pour ${t.ref} : ${e instanceof Error ? e.message : "erreur"}` });
    }
  };

  if (sort === "encaisse") {
    const entry = await r.addCash({
      userId: t.userId,
      amount: t.amount,
      kind: "provision",
      label: `Prélèvement encaissé · mandat ${mandat.ref} · échéance du ${t.dueOn}`,
      evidence: `Remise ${refDeLaRemise(t.dueOn)} · tirage ${t.ref}`,
      at: `${t.dueOn}T12:00:00.000Z`,
      createdBy: desk.name,
    });
    await r.updateTirage(id, { state: "encaisse", settledAt: quand, cashEntry: entry.id });
    /* Le compteur repart de zéro : deux rejets séparés par un encaissement ne
       sont pas deux rejets consécutifs, et c'est « consécutifs » qui suspend. */
    if (mandat.rejects) await r.updateMandat(mandat.id, { rejects: 0 });
    await avisDuTirage();
    await audit("prelevement.encaisse", "client", t.userId, { after: { tirage: t.ref, amount: t.amount, entry: entry.id }, reason: `${fmt(t.amount)} FCFA prélevés et encaissés · mandat ${mandat.ref}` });
    await r.logEvent({ kind: "desk", html: `<b>${fmt(t.amount)} FCFA</b> encaissés par prélèvement · mandat ${escapeHtml(mandat.ref)} · échéance du ${t.dueOn} · par ${desk.name}` });
    revalidatePath("/desk/prelevements");
    revalidatePath("/moi/prelevements");
    revalidatePath("/moi/provision");
    return { ok: true, message: `${fmt(t.amount)} FCFA portés à la provision du client.` };
  }

  if (!motif) return { ok: false, error: "Dites pourquoi la banque a refusé : c'est la cause qui décide de la suite, pas le nombre de rejets." };
  const consecutifs = (mandat.rejects ?? 0) + 1;
  const suite = suiteDuRejet(motif, consecutifs, t.dueOn);
  await r.updateTirage(id, { state: "rejete", settledAt: quand, rejectCode: motif, rejectNote: note });
  await avisDuTirage();

  if (suite.suite === "suspend") {
    await r.updateMandat(mandat.id, { state: "suspendu", rejects: consecutifs });
  } else {
    await r.updateMandat(mandat.id, { rejects: consecutifs });
    /* La seconde présentation entre au calendrier TOUT DE SUITE, et non à la
       main plus tard : « on le représentera » dit au client une chose que
       personne n'aurait eu la charge de faire. */
    try {
      await r.creerTirage({ mandatId: mandat.id, userId: t.userId, dueOn: suite.le, amount: t.amount, retryOf: t.id });
    } catch {
      // Une présentation existe déjà à cette date : rien à ajouter.
    }
  }

  const dit = await direLeRejet(mandat, { dueOn: t.dueOn, amount: t.amount, motif, represente: suite.suite === "represente" ? suite.le : undefined });
  await audit("prelevement.rejet", "client", t.userId, { after: { tirage: t.ref, motif, suite: suite.suite, prevenu: dit.sent }, reason: `${MOTIFS[motif].libelle} · mandat ${mandat.ref} · ${suite.suite === "suspend" ? "mandat suspendu" : `représenté le ${suite.le}`}` });
  await r.logEvent({
    kind: "desk",
    html: `Prélèvement <b>rejeté</b> : ${escapeHtml(MOTIFS[motif].libelle)} · ${fmt(t.amount)} FCFA · mandat ${escapeHtml(mandat.ref)} · ${suite.suite === "suspend" ? "<b>mandat suspendu</b>" : `seconde présentation le ${suite.le}`}${dit.sent ? "" : " · <b>client non prévenu</b>"} · par ${desk.name}`,
  });
  revalidatePath("/desk/prelevements");
  revalidatePath("/moi/prelevements");
  return {
    ok: true,
    message:
      (suite.suite === "suspend"
        ? `Mandat suspendu : ${suite.pourquoi}`
        : `Seconde présentation inscrite au ${fmtDate(suite.le)}. Au prochain rejet de cette cause (${consecutifs + 1}ᵉ sur ${REJETS_AVANT_SUSPENSION}), le mandat se suspendra.`) + (dit.sent ? " Le client est prévenu." : " Le client n'a pas pu être prévenu : appelez-le."),
  };
}

/** Réactiver un mandat suspendu : à la main, après un mot au client. */
export async function reactiverLeMandat(_p: PrelevementResult | null, form: FormData): Promise<PrelevementResult> {
  const desk = await requireDesk("/desk/prelevements");
  const id = String(form.get("id") ?? "");
  const r = repo();
  const m = (await r.listMandats()).find((x) => x.id === id);
  if (!m) return { ok: false, error: "Ce mandat n'existe plus." };
  if (m.state !== "suspendu") return { ok: false, error: "Ce mandat n'est pas suspendu." };
  await r.updateMandat(id, { state: "actif", rejects: 0 });
  await audit("prelevement.reactive", "client", m.userId, { after: { mandat: m.ref }, reason: `Mandat ${m.ref} réactivé` });
  await r.logEvent({ kind: "desk", html: `Mandat ${escapeHtml(m.ref)} <b>réactivé</b> · par ${desk.name}` });
  revalidatePath("/desk/prelevements");
  revalidatePath("/moi/prelevements");
  return { ok: true, message: `Mandat ${m.ref} réactivé. Il se présentera à sa prochaine échéance, annoncé comme les autres.` };
}
