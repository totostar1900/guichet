"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { MOIS_REFUSES_AVANT_ARRET } from "@/lib/domain/mandat";
import { echeanceDuJour, jourDeTirage, jourDuPreavis, MOTIFS, pourquoiPasRemettre, refDeLaRemise, suiteDuRejet, type MotifDeRejet } from "@/lib/domain/prelevement";
import { direLEncaissement, direLeRejet, envoyerPreavisDePrelevement } from "@/lib/notify/prelevement";
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
  /* LES SECONDES PRÉSENTATIONS NE SONT PLUS DE LA PARTIE : il n'y en a plus.
     Ce geste rattrapait les tirages nés d'un rejet, qui tombaient quinze jours
     plus tard, un jour qui n'était celui d'aucun mandat. Depuis le 25 octobre
     2026, un mois refusé est sauté : toute échéance est donc celle d'un
     mandat, et un tirage déjà préparé se retrouve par son mandat. Ce qui
     reste — et qui était le vrai service rendu — c'est de RENVOYER un préavis
     qui n'est pas parti, le lendemain d'un canal réparé. */
  const { aTirer } = echeanceDuJour(mandats, standings, dueOn);
  const parMandat = new Map(deja.map((t) => [t.mandatId, t]));
  if (!aTirer.length) return { ok: false, error: "Aucun mandat ne se présente à cette échéance." };
  let crees = 0;
  let partis = 0;
  const muets: string[] = [];

  for (const { mandat, amount } of aTirer) {
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

  await audit("prelevement.echeance", "echeance", dueOn, { after: { crees, partis, muets: muets.length }, reason: `Échéance du ${dueOn} : ${aTirer.length} tirages, ${partis} préavis partis` });
  await r.logEvent({ kind: "desk", html: `Échéance de prélèvement du ${dueOn} préparée : <b>${aTirer.length} tirages</b>, ${partis} préavis partis${muets.length ? `, <b>${muets.length} sans canal</b>` : ""} · par ${desk.name}` });
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
 * Rejeté : la CAUSE décide. Une provision insuffisante saute le mois, et le
 * mandat reprend à l'échéance suivante ; toute autre cause l'arrête sur-le-champ,
 * parce que le mois prochain n'y changerait rien. Et deux mois refusés de suite
 * arrêtent aussi : le compteur se remet à zéro au premier encaissement, donc
 * deux rejets séparés de six mois ne sont pas un acharnement.
 *
 * DANS LES DEUX CAS, ET DANS LE CAS HEUREUX, LE CLIENT EST PRÉVENU. L'issue
 * réussie était muette : l'argent entrait, la page le montrait à qui venait
 * voir, et personne ne disait rien. « Vous êtes prévenu à chaque fois » ne se
 * tient pas à moitié.
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
  const [mandats, standings] = await Promise.all([r.listMandats(), r.listStandingOrders().catch(() => [])]);
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
    /* Le compteur repart de zéro : deux mois refusés séparés par un
       encaissement ne sont pas deux mois consécutifs, et c'est « de suite »
       qui arrête. */
    if (mandat.rejects) await r.updateMandat(mandat.id, { rejects: 0 });
    await avisDuTirage();
    /* LE CAS HEUREUX SE DIT AUSSI, depuis le 25 octobre 2026. Il ne se disait
       pas : le client avait reçu l'annonce cinq jours plus tôt, puis plus
       rien — et « rien » ressemble trait pour trait à un prélèvement qui n'a
       pas abouti, le jour où il regarde son relevé. */
    const prochaine = jourDeTirage(mandat, standings.find((x) => x.id === mandat.standingId));
    const ditOk = await direLEncaissement(mandat, { dueOn: t.dueOn, amount: t.amount, prochaine });
    await audit("prelevement.encaisse", "client", t.userId, { after: { tirage: t.ref, amount: t.amount, entry: entry.id, prevenu: ditOk.sent }, reason: `${fmt(t.amount)} FCFA prélevés et encaissés · mandat ${mandat.ref}` });
    await r.logEvent({
      kind: "desk",
      html: `<b>${fmt(t.amount)} FCFA</b> encaissés par prélèvement · mandat ${escapeHtml(mandat.ref)} · échéance du ${t.dueOn}${ditOk.sent ? "" : " · <b>client non prévenu</b>"} · par ${desk.name}`,
    });
    revalidatePath("/desk/prelevements");
    revalidatePath("/moi/prelevements");
    revalidatePath("/moi/provision");
    return { ok: true, message: `${fmt(t.amount)} FCFA portés à la provision du client.${ditOk.sent ? " Le client est prévenu." : " Le client n'a pas pu être prévenu : appelez-le."}` };
  }

  if (!motif) return { ok: false, error: "Dites pourquoi la banque a refusé : c'est la cause qui décide de la suite, pas le nombre de rejets." };
  const deSuite = (mandat.rejects ?? 0) + 1;
  const suite = suiteDuRejet(motif, deSuite, t.dueOn, jourDeTirage(mandat, standings.find((x) => x.id === mandat.standingId)));
  await r.updateTirage(id, { state: "rejete", settledAt: quand, rejectCode: motif, rejectNote: note });
  await avisDuTirage();

  /* RIEN N'ENTRE AU CALENDRIER ICI, et c'est tout le changement du 25 octobre
     2026. Une seconde présentation s'y inscrivait quinze jours plus tard ; le
     mois est maintenant sauté, et la prochaine échéance est celle du mois
     suivant, que l'échéance du jour fabriquera comme toutes les autres. */
  await r.updateMandat(mandat.id, suite.suite === "arrete" ? { state: "suspendu", rejects: deSuite } : { rejects: deSuite });

  const dit = await direLeRejet(mandat, { dueOn: t.dueOn, amount: t.amount, motif, prochaine: suite.suite === "passe" ? suite.prochaine : undefined });
  await audit("prelevement.rejet", "client", t.userId, {
    after: { tirage: t.ref, motif, suite: suite.suite, prevenu: dit.sent },
    reason: `${MOTIFS[motif].libelle} · mandat ${mandat.ref} · ${suite.suite === "arrete" ? "prélèvement arrêté" : `mois sauté, prochaine échéance le ${suite.prochaine}`}`,
  });
  await r.logEvent({
    kind: "desk",
    html: `Prélèvement <b>rejeté</b> : ${escapeHtml(MOTIFS[motif].libelle)} · ${fmt(t.amount)} FCFA · mandat ${escapeHtml(mandat.ref)} · ${suite.suite === "arrete" ? "<b>prélèvement arrêté</b>" : `mois sauté, prochaine échéance le ${suite.prochaine}`}${dit.sent ? "" : " · <b>client non prévenu</b>"} · par ${desk.name}`,
  });
  revalidatePath("/desk/prelevements");
  revalidatePath("/moi/prelevements");
  return {
    ok: true,
    message:
      (suite.suite === "arrete"
        ? `Prélèvement arrêté : ${suite.pourquoi}`
        : `Ce mois est sauté : rien n'est représenté avant le ${fmtDate(suite.prochaine)}. Si ce mois-là est refusé aussi (${deSuite + 1}ᵉ sur ${MOIS_REFUSES_AVANT_ARRET}), le prélèvement s'arrêtera.`) +
      (dit.sent ? " Le client est prévenu." : " Le client n'a pas pu être prévenu : appelez-le."),
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
