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
 * propre. Il revient comme représentant d'une société, comme mandataire sur
 * le compte d'un proche, ou comme bénéficiaire effectif d'un groupement. Ne
 * regarder que le titulaire laisserait passer les trois.
 */
export function personnesDuDossier(f: ClientFile): PersonneDuDossier[] {
  const out: PersonneDuDossier[] = [
    { role: "le titulaire", nom: f.identity.name, naissance: f.identity.birthDate, pieceType: f.identity.idType, pieceNumero: f.identity.idNumber },
  ];
  const ROLE: Record<string, string> = { representant: "représentant", mandataire: "mandataire", beneficiaire_effectif: "bénéficiaire effectif" };
  /* Un mandataire ne donne que son numéro : le dossier ne lui demande ni sa
     date de naissance ni le type de sa pièce. Il peut donc produire une
     correspondance de numéro, jamais une ressemblance de nom. */
  for (const p of f.persons) out.push({ role: ROLE[p.role] ?? p.role, nom: p.name, pieceNumero: p.idNumber });
  return out.filter((p) => p.nom);
}

/** Ce que le registre a à dire sur un dossier, la correspondance la plus forte en tête. */
export async function correspondancesDuDossier(f: ClientFile, now = new Date()): Promise<Correspondance[]> {
  return correspondances(await registrePublie(), personnesDuDossier(f), now).sort(parForce);
}
