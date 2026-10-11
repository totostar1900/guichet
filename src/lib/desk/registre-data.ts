import "server-only";
import { repo } from "@/lib/data";
import { REF } from "@/lib/reference";
import type { ClientFile } from "@/lib/domain/kyc";
import { clefDeNom, correspondances, parForce, type Correspondance, type Ecarte, type PersonneDuDossier } from "@/lib/domain/registre-ecartes";

/**
 * LE REGISTRE VIT AU RÉFÉRENTIEL, avec ses brouillons et sa publication.
 *
 * Il n'a pas eu besoin de sa table : une inscription est de la donnée que la
 * maison tient à la main, exactement comme un modèle ou un barème, et le
 * référentiel sait déjà la garder en brouillon, la publier sous quatre
 * étages de confirmation, l'auditer et la réserver au desk. Une table de
 * plus aurait réécrit ces quatre choses moins bien.
 */

/** Les inscriptions publiées. Le brouillon n'écarte personne : il attend d'être publié. */
export async function registrePublie(): Promise<Ecarte[]> {
  const rows = await repo().listReference(REF.ecartes).catch(() => []);
  return rows
    .map((r) => r.data as Ecarte | null)
    .filter((e): e is Ecarte => Boolean(e && e.nom && e.motif))
    .sort((a, b) => b.le.localeCompare(a.le));
}

/** Ce que la publication poserait : une inscription en attente, ou une levée en attente. */
export async function registreEnBrouillon(): Promise<Ecarte[]> {
  const rows = await repo().listReference(REF.ecartes).catch(() => []);
  return rows
    .map((r) => (r.draft && r.draft.op === "set" ? (r.draft.data as Ecarte) : null))
    .filter((e): e is Ecarte => Boolean(e && e.nom && e.motif))
    .sort((a, b) => b.le.localeCompare(a.le));
}

/**
 * LES PERSONNES QU'UN DOSSIER PRÉSENTE, et pas seulement son titulaire.
 *
 * C'est le cas qui compte : quelqu'un d'écarté revient rarement en son nom
 * propre. Il revient comme représentant légal d'une société, comme
 * cotitulaire d'une indivision, ou comme bénéficiaire effectif. Ne regarder
 * que le titulaire laisserait passer les trois.
 *
 * Le mandataire ne figure plus dans cette liste : la maison a retiré la
 * procuration le 10 octobre 2026, et le titulaire est seul à donner ses
 * ordres.
 */
export function personnesDuDossier(f: ClientFile): PersonneDuDossier[] {
  const out: PersonneDuDossier[] = [
    { role: "le titulaire", nom: f.identity.name, naissance: f.identity.birthDate, pieceType: f.identity.idType, pieceNumero: f.identity.idNumber },
  ];
  const ROLE: Record<string, string> = { representant: "représentant", cotitulaire: "cotitulaire", beneficiaire_effectif: "bénéficiaire effectif" };
  /* Le dossier ne leur demande pas le TYPE de leur pièce, et c'est sans
     conséquence : un type manquant ne contredit pas un numéro. La date de
     naissance, elle, leur est demandée depuis le 10 octobre 2026, et c'est
     elle qui permet la ressemblance, donc la seule prise qui survive à une
     pièce neuve. */
  for (const p of f.persons) out.push({ role: ROLE[p.role] ?? p.role, nom: p.name, naissance: p.birthDate, pieceNumero: p.idNumber });
  return out.filter((p) => p.nom);
}

/** Ce que le registre a à dire sur un dossier, la correspondance la plus forte en tête. */
export async function correspondancesDuDossier(f: ClientFile, now = new Date()): Promise<Correspondance[]> {
  return correspondances(await registrePublie(), personnesDuDossier(f), now).sort(parForce);
}

/**
 * QUI, PARMI LES DOSSIERS QUI EXISTENT, ACCROCHE CES INSCRIPTIONS.
 *
 * Sert à deux moments, et c'est la même question. Avant de publier : on
 * inscrit quelqu'un PARCE QUE quelque chose s'est passé, et ce quelqu'un
 * est le plus souvent déjà client ; publier à l'aveugle laisserait son
 * compte tourner. Et pour chercher un nom sans ouvrir de dossier, quand
 * quelqu'un appelle avant même qu'un dossier existe.
 *
 * Le statut remonte avec le dossier : un compte OUVERT qui accroche est
 * plus pressant qu'un dossier qui attend encore sa décision.
 */
export async function dossiersQuiAccrochent(inscriptions: Ecarte[], now = new Date()): Promise<{ f: ClientFile; hits: Correspondance[] }[]> {
  if (inscriptions.length === 0) return [];
  const dossiers = await repo().listClientFiles().catch(() => []);
  return dossiers
    .map((f) => ({ f, hits: correspondances(inscriptions, personnesDuDossier(f), now).sort(parForce) }))
    .filter((x) => x.hits.length > 0)
    .sort((a, b) => Number(b.f.status === "approuve") - Number(a.f.status === "approuve"));
}

/**
 * Chercher un nom au registre, sans dossier sous la main.
 *
 * Le bandeau ne se lève que sur un dossier, et le moment le plus utile est
 * AVANT qu'il existe : quelqu'un appelle, donne un nom, et on voudrait
 * savoir. La recherche porte sur le nom et sur le numéro de pièce, et elle
 * montre aussi les inscriptions éteintes, parce que « il a été écarté
 * l'an dernier, puis levé » est une réponse utile.
 */
export async function chercherAuRegistre(q: string): Promise<Ecarte[]> {
  const terme = clefDeNom(q);
  const chiffres = (q ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (terme.length < 2 && chiffres.length < 3) return [];
  return (await registrePublie()).filter((e) => {
    const nom = clefDeNom(e.nom);
    const piece = (e.pieceNumero ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    return (terme.length >= 2 && nom.includes(terme)) || (chiffres.length >= 3 && piece.length > 0 && piece.includes(chiffres));
  });
}
