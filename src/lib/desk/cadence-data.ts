import "server-only";
import { repo } from "@/lib/data";
import { cadenceDe, MOIS_DE_CADENCE, type Cadence } from "@/lib/domain/cadence";
import type { ActionClient } from "@/lib/domain/journal-client";

/* LE FILTRE ATTEND UNE DATE, PAS UN HORODATAGE : le dépôt recolle
   « T00:00:00Z » derrière ce qu'on lui donne, donc un ISO complet
   fabriquerait « 2025-11-01T00:00:00.000ZT00:00:00Z » et la requête
   échouerait en silence, rendant une liste vide. Les barres seraient alors
   toutes à zéro sans qu'aucune erreur ne paraisse. */
const premierJourIl = (maintenant: Date, mois: number): string =>
  new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - mois, 1)).toISOString().slice(0, 10);

/**
 * LA CADENCE DE TOUT LE MONDE, EN UNE SEULE LECTURE.
 *
 * Le répertoire affiche une colonne par client. Vingt-huit lectures du même
 * registre seraient vingt-huit fois la même requête, et le cliquet du
 * domicile plafonne de toute façon ces lectures : la page demande donc la
 * cadence, jamais ce qu'il faut lire pour la calculer.
 *
 * ON NE LIT QUE CE QU'ON MONTRE : douze mois de gestes, pas le registre
 * entier. Il grossit de plusieurs milliers de lignes par mois, et une page de
 * liste n'a aucune raison de le traverser en entier pour dessiner douze
 * barres.
 */
export async function cadencesDeTous(maintenant = new Date()): Promise<Map<string, Cadence>> {
  const depuis = premierJourIl(maintenant, MOIS_DE_CADENCE - 1);
  const gestes = await repo()
    .listClientActions({ from: depuis, limit: 20000 })
    .catch(() => []);

  const parClient = new Map<string, ActionClient[]>();
  for (const g of gestes) {
    const liste = parClient.get(g.userId);
    if (liste) liste.push(g);
    else parClient.set(g.userId, [g]);
  }

  const out = new Map<string, Cadence>();
  for (const [userId, liste] of parClient) out.set(userId, cadenceDe(liste, maintenant));
  return out;
}

/**
 * La cadence d'un seul client, pour sa fiche.
 *
 * LE DERNIER GESTE PEUT ÊTRE PLUS VIEUX QUE DOUZE MOIS, et c'est justement le
 * cas qui intéresse : un dossier qui dort depuis deux ans doit dire depuis
 * quand. La lecture bornée à douze mois ne le rendrait pas, donc on redemande
 * le dernier geste sans borne quand les douze mois sont vides.
 */
export async function cadenceDUn(userId: string, maintenant = new Date()): Promise<Cadence> {
  const r = repo();
  const depuis = premierJourIl(maintenant, MOIS_DE_CADENCE - 1);
  const douzeMois = await r.listClientActions({ userId, from: depuis, limit: 5000 }).catch(() => []);
  const c = cadenceDe(douzeMois, maintenant);
  if (c.dernier) return c;
  const [plusVieux] = await r.listClientActions({ userId, limit: 1 }).catch(() => []);
  return plusVieux ? cadenceDe([plusVieux], maintenant) : c;
}
