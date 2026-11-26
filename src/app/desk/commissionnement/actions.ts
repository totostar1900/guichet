"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { chargerLeCommissionnement, dusDuMois, moisObservesDe, moisRecents } from "@/lib/commissionnement-donnees";
import { cleDeGestionnaire } from "@/data/gestionnaires";
import {
  KIND_FONDS,
  KIND_RELEVE,
  KIND_SOCIETE,
  LIBELLE_DE_L_ETAT,
  cleDuReleve,
  codeSuivant,
  conditionsRefusees,
  departRefuse,
  etatsSuivants,
  moisFige,
  simuler,
  societeAu,
  type Accord,
  type ConditionsDeFonds,
  type EtatDuReleve,
  type FondsCommissionne,
  type ReleveSuivi,
  type Simulation,
  type Societe,
} from "@/lib/domain/commissionnement";

/**
 * LE COMMISSIONNEMENT SE MODIFIE PAR LA DIRECTION SEULE, PAR UNE PROCÉDURE (25 novembre 2026, planche « Deux tableaux », point 7 : brouillon, aperçu d'impact, motif, date, application).
 *
 * Chaque geste passe par `requireResponsable` ; rien n'est écrit sans motif ; un départ ne peut pas tomber dans un mois dont le relevé est parti. LES TAUX NE VONT PAS À L'AUDIT : le journal
 * d'audit est lu par tout le desk, et ce qu'un partenaire verse à la maison ne se lit que par la direction. L'audit dit QUI a posé QUELLE version, QUAND et POURQUOI ; l'avant et l'après
 * des taux sont dans les versions du fonds, rangées dans la table réservée à la direction (chaque version garde son motif, son auteur, son jour).
 */

export type CommissionResult = { ok: true; message: string } | { ok: false; error: string };

const nombre = z.coerce.number().min(0).max(1e12);
const schema = z.object({
  offerId: z.string().min(1),
  societe: z.string().trim().min(2, "Nommez la société de gestion."),
  effetLe: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de départ invalide."),
  motif: z.string().trim().min(3, "Un motif est obligatoire : sans lui, rien n'est écrit."),
  sousPct: nombre,
  sousPart: nombre,
  sousMin: nombre,
  sousMax: nombre,
  rachPct: nombre,
  rachPart: nombre,
  rachMin: nombre,
  rachMax: nombre,
  encPct: nombre,
  encMin: nombre,
  encMax: nombre,
  accordRef: z.string().trim().max(80).optional(),
  echeanceLe: z.string().optional(),
  delai: z.string().optional(),
  tousLesFonds: z.string().optional(),
});

const defauts = { sousPart: "0", sousMin: "0", sousMax: "0", rachPart: "0", rachMin: "0", rachMax: "0", encMin: "0", encMax: "0" };

/** Les champs d'un formulaire de conditions, lus en conditions de fonds. */
function conditionsDuFormulaire(f: Record<string, unknown>): ConditionsDeFonds | null {
  const p = schema.pick({ sousPct: true, sousPart: true, sousMin: true, sousMax: true, rachPct: true, rachPart: true, rachMin: true, rachMax: true, encPct: true, encMin: true, encMax: true }).safeParse({ ...defauts, ...f });
  if (!p.success) return null;
  const d = p.data;
  return {
    souscription: { pct: d.sousPct, partDesDroitsPct: d.sousPart, min: d.sousMin, max: d.sousMax },
    rachat: { pct: d.rachPct, partDesDroitsPct: d.rachPart, min: d.rachMin, max: d.rachMax },
    encours: { pct: d.encPct, min: d.encMin, max: d.encMax },
  };
}

const sansAccent = (s: string): string => cleDeGestionnaire(s);

export async function enregistrerConditions(_p: CommissionResult | null, form: FormData): Promise<CommissionResult> {
  const me = await requireResponsable("/desk/commissionnement");
  const p = schema.safeParse({ ...defauts, ...Object.fromEntries(form) });
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Conditions invalides." };
  const d = p.data;
  const conditions = conditionsDuFormulaire(d);
  if (!conditions) return { ok: false, error: "Conditions invalides : des taux en pourcentage, des montants en francs." };
  const refus = conditionsRefusees(conditions);
  if (refus) return { ok: false, error: refus };

  const r = repo();
  const c = await chargerLeCommissionnement();
  const offre = await r.getOffer(d.offerId);
  if (!offre || offre.kind !== "FONDS") return { ok: false, error: "Ce n'est pas un fonds du Guichet." };

  const moisFiges = [...c.releves.entries()].filter(([, v]) => moisFige(v)).map(([k]) => k.split("|")[1]);
  const departMauvais = departRefuse(d.effetLe, moisFiges);
  if (departMauvais) return { ok: false, error: departMauvais };

  /* LA SOCIÉTÉ SE RETROUVE PAR SON NOM OU L'UNE DE SES GRAPHIES : un seul code, pas de doublon. */
  const cle = sansAccent(d.societe);
  let societe: Societe | undefined = [...c.societes.values()].find((s) => sansAccent(s.nom) === cle || s.alias.some((a) => sansAccent(a) === cle));
  const nouvelleSociete = !societe;
  if (!societe) societe = { code: codeSuivant("SG", [...c.societes.keys()]), nom: d.societe, alias: [], actif: true };

  const maintenant = new Date().toISOString();
  const aujourdHui = maintenant.slice(0, 10);
  const accord: Accord = {
    ...(d.accordRef ? { ref: d.accordRef } : {}),
    ...(d.echeanceLe && /^\d{4}-\d{2}-\d{2}$/.test(d.echeanceLe) ? { echeanceLe: d.echeanceLe } : {}),
    ...(d.delai && Number.isFinite(Number(d.delai)) && Number(d.delai) > 0 ? { delaiDePaiementJours: Math.round(Number(d.delai)) } : {}),
  };

  /* « APPLIQUER À TOUS LES FONDS DE LA SOCIÉTÉ » : le même geste, un fonds après l'autre, chacun avec sa version. Rien n'est hérité en silence. */
  const cibles = d.tousLesFonds === "on"
    ? (await r.listOffers()).filter((o) => o.kind === "FONDS" && o.fund && (c.fonds.get(o.id) ? societeAu(c.fonds.get(o.id)!, aujourdHui) === societe!.code : o.id === d.offerId)).map((o) => o.id)
    : [d.offerId];
  const codesPris = [...[...c.fonds.values()].map((f) => f.code)];
  const ecrits: string[] = [];
  for (const offerId of cibles) {
    const ancien = c.fonds.get(offerId);
    const code = ancien?.code ?? codeSuivant("FD", codesPris);
    if (!ancien) codesPris.push(code);
    const rattachements = [...(ancien?.rattachements ?? [])];
    const actuelle = ancien ? societeAu(ancien, aujourdHui) : undefined;
    if (actuelle !== societe.code) rattachements.push({ societe: societe.code, depuis: ancien ? d.effetLe : "0000-01-01" });
    const versions = (ancien?.versions ?? []).filter((v) => v.effetLe !== d.effetLe);
    versions.push({ ...conditions, effetLe: d.effetLe, motif: d.motif, par: me.name, le: maintenant });
    versions.sort((a, b) => a.effetLe.localeCompare(b.effetLe));
    const fonds: FondsCommissionne = { code, offerId, rattachements, versions, ...(Object.keys(accord).length ? { accord } : ancien?.accord ? { accord: ancien.accord } : {}) };
    await r.upsertPrive(KIND_FONDS, code, fonds, me.name);
    await audit("commissionnement.conditions", "commission_fonds", code, { before: { versions: (ancien?.versions ?? []).length }, after: { versions: versions.length, effetLe: d.effetLe }, reason: `${code} · ${societe.code} · ${d.motif}` });
    ecrits.push(code);
  }
  if (nouvelleSociete || !societe.alias.includes(d.societe)) {
    const aliasDe = nouvelleSociete || sansAccent(societe.nom) === cle ? societe.alias : [...societe.alias, d.societe];
    await r.upsertPrive(KIND_SOCIETE, societe.code, { ...societe, alias: aliasDe }, me.name);
    if (nouvelleSociete) await audit("commissionnement.societe", "partenaire", societe.code, { after: { code: societe.code }, reason: `société posée : ${societe.code}` });
  }
  revalidatePath("/desk/commissionnement");
  return { ok: true, message: ecrits.length > 1 ? `Conditions posées sur ${ecrits.length} fonds de ${societe.code}, départ le ${d.effetLe}.` : `Conditions de ${ecrits[0]} posées, départ le ${d.effetLe}.` };
}

/** L'aperçu d'impact et le simulateur : le même moteur, sur les six derniers mois observés, sans rien écrire. */
export async function apercuDesConditions(offerId: string, brut: Record<string, string>): Promise<{ ok: true; simulation: Simulation } | { ok: false; error: string }> {
  await requireResponsable("/desk/commissionnement");
  const conditions = conditionsDuFormulaire(brut);
  if (!conditions) return { ok: false, error: "Conditions invalides." };
  const refus = conditionsRefusees(conditions);
  if (refus) return { ok: false, error: refus };
  const r = repo();
  const [c, offre, intents] = await Promise.all([chargerLeCommissionnement(), r.getOffer(offerId), r.listIntents()]);
  if (!offre || offre.kind !== "FONDS") return { ok: false, error: "Ce n'est pas un fonds du Guichet." };
  const actuel: FondsCommissionne = c.fonds.get(offerId) ?? { code: "—", offerId, rattachements: [], versions: [] };
  const observes = await moisObservesDe(offre, intents, moisRecents(6).reverse());
  return { ok: true, simulation: simuler(actuel, observes, conditions) };
}

/** Un relevé avance : calculé, envoyé (le total se fige), confirmé ou contesté, encaissé. */
export async function changerEtatDuReleve(_p: CommissionResult | null, form: FormData): Promise<CommissionResult> {
  const me = await requireResponsable("/desk/commissionnement");
  const societe = String(form.get("societe") ?? "");
  const mois = String(form.get("mois") ?? "");
  const vers = String(form.get("etat") ?? "") as EtatDuReleve;
  if (!/^SG-\d{4}$/.test(societe) || !/^\d{4}-\d{2}$/.test(mois)) return { ok: false, error: "Relevé introuvable." };
  const r = repo();
  const c = await chargerLeCommissionnement();
  const cle = cleDuReleve(societe, mois);
  const avant: ReleveSuivi = c.releves.get(cle) ?? { etat: "calcule" };
  if (!etatsSuivants(avant.etat).includes(vers)) return { ok: false, error: `Un relevé « ${LIBELLE_DE_L_ETAT[avant.etat]} » ne passe pas à « ${LIBELLE_DE_L_ETAT[vers] ?? vers} ».` };
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const apres: ReleveSuivi = { ...avant, etat: vers };
  if (vers === "envoye") {
    /* L'ENVOI FIGE LE MOIS : le total d'aujourd'hui est écrit, et plus aucune version ne peut départ dans ce mois. */
    const dus = (await dusDuMois(mois, c)).filter((x) => x.du.societe === societe);
    apres.totalFige = dus.reduce((s, x) => s + x.du.total, 0);
    apres.envoyeLe = aujourdHui;
    const delais = dus.map((x) => x.fonds.accord?.delaiDePaiementJours).filter((n): n is number => typeof n === "number");
    if (delais.length) apres.echeanceLe = new Date(Date.parse(`${aujourdHui}T12:00:00Z`) + Math.min(...delais) * 86_400_000).toISOString().slice(0, 10);
  }
  await r.upsertPrive(KIND_RELEVE, cle, apres, me.name);
  await audit("commissionnement.releve", "releve_commissionnement", cle, { before: { etat: avant.etat }, after: { etat: vers }, reason: `relevé ${societe} · ${mois} : ${LIBELLE_DE_L_ETAT[avant.etat]} → ${LIBELLE_DE_L_ETAT[vers]}` });
  revalidatePath("/desk/commissionnement");
  return { ok: true, message: vers === "envoye" ? `Relevé envoyé : le mois ${mois} est figé.` : `Relevé : ${LIBELLE_DE_L_ETAT[vers]}.` };
}
