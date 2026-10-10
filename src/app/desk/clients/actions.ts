"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { generateKycDocument } from "@/lib/documents/generate";
import { REVIEW_YEARS } from "@/lib/kyc/checklist";
import { notifyKycDecision } from "@/lib/kyc/notify";
import { screenFile } from "@/lib/kyc/screening";
import { correspondancesDuDossier } from "@/lib/desk/registre-data";

export type ReviewResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  fileId: z.string().min(1),
  decision: z.enum(["en_revue", "approuve", "complements", "refuse"]),
  risk: z.enum(["faible", "moyen", "eleve"]).optional(),
  custodianAccount: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
  requestedItems: z.string().trim().max(1000).optional(),
  screeningLists: z.string().trim().max(300).optional(),
  screeningOutcome: z.enum(["aucun", "faux_positif", "confirme"]).optional(),
  screeningNotes: z.string().trim().max(1000).optional(),
});

/** The compliance decision on a file. Approval opens the account: tier 2, convention + custodian file generated, client told. */
export async function reviewAction(_p: ReviewResult | null, form: FormData): Promise<ReviewResult> {
  const desk = await requireDesk("/desk/clients");
  // Empty selects and inputs mean « not given », not an invalid value.
  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== ""));
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, error: `Saisie invalide : ${p.error.issues[0]?.path.join(".") ?? ""} : ${p.error.issues[0]?.message ?? ""}` };
  const { fileId, decision, risk, custodianAccount, notes, requestedItems, screeningLists, screeningOutcome, screeningNotes } = p.data;
  const r = repo();
  const f = await r.getClientFile(fileId);
  if (!f) return { ok: false, error: "Dossier introuvable." };
  const now = new Date();
  const verified = form.getAll("verified").map(String);
  const documents = f.documents.map((d) => ({ ...d, verified: verified.includes(d.kind) || d.verified }));
  // The compliance officer's attestation: recorded whenever lists + outcome are given.
  const screening = screeningOutcome && screeningLists ? { ...f.screening, attestedBy: desk.name, attestedAt: now.toISOString(), lists: screeningLists, outcome: screeningOutcome, notes: screeningNotes } : f.screening;

  if (decision === "approuve") {
    if (!risk) return { ok: false, error: "Attribuez une notation de risque avant d'approuver." };
    /* LA CONVENTION N'EST PLUS UNE CONDITION DE L'APPROBATION.
       Elle l'était, et elle inversait le parcours documenté : le client signait
       avant de savoir si son compte serait ouvert. L'approbation est désormais la
       décision du desk ; l'acceptation par code suit, et c'est elle qui produit la
       convention. Le compte ne devient actif que quand les deux sont là, plus le
       sous-compte du teneur (voir getSession). */
    if (!screening?.attestedAt) return { ok: false, error: "Renseignez le contrôle sanctions / PPE (listes consultées et résultat) avant d'approuver." };
    if (screening.outcome === "confirme") return { ok: false, error: "Correspondance sanctions / PPE confirmée : approbation impossible sans diligence renforcée documentée (notes) et changement de résultat." };
    /* LE REGISTRE N'EST PAS UN AVIS, C'EST UN ARRÊT.
       Le bandeau au-dessus de la décision serait décoratif si l'approbation
       passait quand même : c'est exactement ce que le garde des mesures a
       appris il y a deux jours. Il ne refuse pas pour autant, parce qu'une
       homonymie n'est pas une fraude : il exige que la personne qui approuve
       ÉCRIVE ce qui écarte la correspondance, et cette phrase reste avec la
       décision. Une note déjà présente ne suffit pas : elle doit avoir été
       écrite en voyant le registre, donc nommer ce qu'on écarte. */
    const hits = await correspondancesDuDossier(f);
    if (hits.length > 0) {
      const dit = (notes ?? "").trim();
      if (dit.length < 20) {
        const qui = hits.map((h) => `${h.personne.nom} (${h.personne.role})`).join(", ");
        return {
          ok: false,
          error: `Registre des personnes écartées : ${hits.length} correspondance(s) sur ce dossier (${qui}). Approbation possible, mais écrivez d'abord dans « Notes internes » ce qui l'écarte (homonymie vérifiée, inscription levée, pièce rendue).`,
        };
      }
      await audit("registre.passe_outre", "kyc_file", fileId, { after: { hits: hits.map((h) => ({ nom: h.personne.nom, role: h.personne.role, niveau: h.niveau, ecarte: h.ecarte.id })) }, reason: dit });
      await r.logEvent({ kind: "desk", html: `Dossier ${f.identity.name} : <b>approuvé malgré ${hits.length} correspondance(s)</b> au registre des personnes écartées · ${desk.name} · ${dit}` });
    }
    const next = new Date(now);
    next.setFullYear(next.getFullYear() + REVIEW_YEARS[risk]);
    const updated = await r.updateClientFile(fileId, {
      status: "approuve",
      documents,
      screening,
      review: { ...f.review, risk, notes, reviewedBy: desk.name, reviewedAt: now.toISOString(), nextReviewOn: next.toISOString().slice(0, 10), custodianAccount: custodianAccount || f.review.custodianAccount },
    });
    /* La convention sort à l'acceptation du client, pas ici : générée à
       l'approbation, elle portait un bloc de signature vide et se présentait
       pourtant comme la convention du dossier. */
    await generateKycDocument("dossier_svt", updated, desk.name);
    await r.logEvent({ kind: "desk", html: `<b>Dossier approuvé</b> : ${updated.identity.name} (${updated.kind}, risque ${risk}${custodianAccount ? `, compte ${custodianAccount}` : ""}) · par ${desk.name}` });
    await notifyKycDecision(updated, "approuve");
    revalidatePath("/desk/clients");
    revalidatePath("/desk");
    return { ok: true, message: updated.consents.conventionAt ? "Dossier approuvé : demande d'ouverture de sous-compte générée." : "Dossier approuvé, client prévenu : il lui reste à accepter la convention par code. Saisissez le numéro de sous-compte dès retour du SVT." };
  }
  if (decision === "complements") {
    if (!requestedItems) return { ok: false, error: "Indiquez les compléments demandés dans le champ « Compléments à demander » (ex. justificatif de domicile lisible), puis cliquez à nouveau." };
    const updated = await r.updateClientFile(fileId, { status: "complements", documents, screening, review: { ...f.review, notes, requestedItems, reviewedBy: desk.name, reviewedAt: now.toISOString() } });
    await r.logEvent({ kind: "desk", html: `Dossier ${updated.identity.name} : <b>compléments demandés</b> : ${requestedItems} · ${desk.name}` });
    await notifyKycDecision(updated, "complements", requestedItems);
    revalidatePath("/desk/clients");
    return { ok: true, message: "Compléments demandés, client prévenu." };
  }
  if (decision === "refuse") {
    const updated = await r.updateClientFile(fileId, { status: "refuse", documents, screening, review: { ...f.review, risk, notes, reviewedBy: desk.name, reviewedAt: now.toISOString() } });
    await r.logEvent({ kind: "desk", html: `Dossier ${updated.identity.name} : <b>refusé</b> · ${desk.name}${notes ? ` : ${notes}` : ""}` });
    await notifyKycDecision(updated, "refuse", notes);
    revalidatePath("/desk/clients");
    return { ok: true, message: "Dossier refusé." };
  }
  await r.updateClientFile(fileId, { status: "en_revue", documents, screening, review: { ...f.review, risk: risk ?? f.review.risk, notes: notes ?? f.review.notes, reviewedBy: desk.name } });
  revalidatePath("/desk/clients");
  return { ok: true, message: "Revue enregistrée." };
}

/** After approval: the SVT returned the nominative sub-account number → account active (tier 2), client told. */
export async function setCustodianAccountAction(_p: ReviewResult | null, form: FormData): Promise<ReviewResult> {
  const desk = await requireDesk("/desk/clients");
  const fileId = String(form.get("fileId") ?? "");
  const custodianAccount = String(form.get("custodianAccount") ?? "").trim();
  if (!custodianAccount) return { ok: false, error: "Indiquez le numéro de sous-compte attribué par le SVT." };
  const r = repo();
  const f = await r.getClientFile(fileId);
  if (!f || f.status !== "approuve") return { ok: false, error: "Le dossier doit être approuvé." };
  const updated = await r.updateClientFile(fileId, { review: { ...f.review, custodianAccount } });
  await r.logEvent({ kind: "desk", html: `<b>Sous-compte nominatif ouvert</b> : ${updated.identity.name} · n° ${custodianAccount} · par ${desk.name}` });
  await notifyKycDecision(updated, "approuve");
  revalidatePath("/desk/clients");
  revalidatePath("/desk");
  return { ok: true, message: "Compte actif : le client peut passer des prises fermes." };
}

/** Optional automatic pre-check (OpenSanctions) : hints for the officer, stored on the file. */
export async function autoScreenAction(_p: ReviewResult | null, form: FormData): Promise<ReviewResult> {
  const desk = await requireDesk("/desk/clients");
  const fileId = String(form.get("fileId") ?? "");
  const r = repo();
  const f = await r.getClientFile(fileId);
  if (!f) return { ok: false, error: "Dossier introuvable." };
  const auto = await screenFile(f);
  await r.updateClientFile(fileId, { screening: { ...f.screening, auto } });
  await r.logEvent({ kind: "desk", html: `Pré-contrôle sanctions / PPE : ${f.identity.name} : ${auto.provider === "none" ? "fournisseur non configuré" : `${auto.hits.length} correspondance(s)${auto.error ? ` (${auto.error})` : ""}`} · ${desk.name}` });
  revalidatePath("/desk/clients");
  return auto.provider === "none" ? { ok: false, error: "Le pré-contrôle automatique n'est pas activé sur cette plateforme : consultez les listes par les liens ci-dessous et attestez." } : { ok: true, message: `Pré-contrôle effectué : ${auto.hits.length} correspondance(s) à examiner.` };
}

/**
 * Retirer un appareil de confiance, depuis le desk.
 *
 * Un client qui perd son téléphone appelle, et jusqu'ici personne ne pouvait
 * rien : seul le porteur retirait ses appareils, depuis son propre espace,
 * c'est-à-dire depuis l'appareil qu'il n'a plus. Le desk pouvait le laisser
 * sans recours ou lui demander de se connecter pour se déconnecter.
 *
 * LE GESTE NE VA QUE DANS UN SENS : il retire, il n'ajoute jamais. Le desk ne
 * peut pas enrôler un appareil au nom d'un client, parce que cela reviendrait à
 * se donner sa clef ; il peut seulement en reprendre une, ce qui ferme une
 * porte et n'en ouvre aucune. C'est la seule forme sous laquelle cette capacité
 * est acceptable sur un compte-titres.
 *
 * Elle se journalise deux fois, à l'audit et au flux : retirer la clef de
 * quelqu'un se lit dans son dossier, et porte un nom.
 */
/**
 * Nommer le conseiller d'un client, ou le retirer.
 *
 * Le rattachement est facultatif : « Le desk » est une valeur, pas un vide à
 * remplir. Une maison qui n'affecte personne fonctionne, et la carte du client
 * dit alors que le desk répond.
 *
 * LE RÔLE SE VÉRIFIE AVANT D'ÉCRIRE. La liste du formulaire vient du serveur,
 * mais un formulaire se rejoue avec l'identifiant qu'on veut : sans ce contrôle,
 * on rattacherait un client à un autre client, dont le numéro partirait alors
 * dans un lien WhatsApp affiché à un tiers.
 */
export async function setAdvisorAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/clients");
  const userId = String(form.get("userId") ?? "");
  const advisorId = String(form.get("advisorId") ?? "").trim();
  if (!userId) return;
  const r = repo();
  const equipe = await r.listStaff();
  const choisi = advisorId ? equipe.find((x) => x.id === advisorId) : undefined;
  if (advisorId && !choisi) return;
  const avant = await r.findAdvisor(userId);
  if (avant?.id === choisi?.id) return;
  await r.setAdvisor(userId, choisi?.id);
  await audit("client.advisor", "profile", userId, {
    before: avant ? { advisorId: avant.id, name: avant.name } : null,
    after: choisi ? { advisorId: choisi.id, name: choisi.name } : null,
    reason: `rattachement modifié depuis le desk par ${desk.name}`,
  });
  const porteur = String(form.get("clientName") ?? "").trim();
  await r.logEvent({
    kind: "desk",
    html: choisi
      ? `Conseiller <b>${choisi.name}</b> rattaché par ${desk.name}${porteur ? ` à ${porteur}` : ""}`
      : `Rattachement <b>retiré</b> par ${desk.name}${porteur ? ` chez ${porteur}` : ""} : le desk répond`,
  });
  revalidatePath("/desk/clients");
  revalidatePath("/trader");
}

export async function removeClientDeviceAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/clients");
  const id = String(form.get("deviceId") ?? "");
  const userId = String(form.get("userId") ?? "");
  if (!id || !userId) return;
  const device = await repo().findDevice({ id });
  // L'identifiant du porteur voyage avec : sans lui, un identifiant d'appareil
  // devine par un autre dossier retirerait la clef d'un client qu'on ne
  // regardait pas.
  if (!device || device.userId !== userId) return;
  await repo().removeDevice(id, userId);
  await audit("device.remove", "trusted_device", id, {
    before: { userId, kind: device.kind, name: device.name },
    after: null,
    reason: `retiré depuis le desk par ${desk.name}`,
  });
  // Le flux ne porte pas de client : le nom entre dans la phrase, sans quoi
  // « Appareil retiré » ne dirait pas chez qui.
  const porteur = String(form.get("clientName") ?? "").trim();
  await repo().logEvent({
    kind: "desk",
    html: `Appareil <b>retiré</b> par ${desk.name}${porteur ? ` chez ${porteur}` : ""} : ${device.name} (${device.kind === "passkey" ? "clef d'accès" : "code à quatre chiffres"})`,
  });
  revalidatePath("/desk/clients");
  revalidatePath("/moi/securite");
}
