import "server-only";
import { repo } from "@/lib/data";
import { REF } from "@/lib/reference";
import type { ClientFile } from "@/lib/domain/kyc";
import { correspondances, parForce, type Correspondance, type Ecarte, type PersonneDuDossier } from "@/lib/domain/registre-ecartes";

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
