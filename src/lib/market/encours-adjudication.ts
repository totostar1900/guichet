/**
 * L'ENCOURS DE LA DETTE PAR ADJUDICATION, RECONSTITUÉ SÉANCE PAR SÉANCE.
 *
 * LE MARCHÉ COTÉ N'EST PAS LE MARCHÉ. Les obligations du BOC pèsent 1 227
 * milliards et leur encours est publié chaque jour, table à l'appui. Les bons
 * et obligations du Trésor adjugés par la BEAC, eux, n'ont AUCUNE table
 * d'encours publiée : la BEAC publie des communiqués de séance, un par un, et
 * personne n'en fait un stock. Le stock se reconstitue donc, ou n'existe pas.
 *
 * LE PRINCIPE EST ÉLÉMENTAIRE ET C'EST SA FORCE : une ligne entre à l'encours
 * le jour de sa séance pour le montant SERVI, et en sort le jour de son
 * échéance. L'encours à une date est la somme de ce qui est entré et pas
 * encore sorti. Aucun modèle, aucune hypothèse de prix, aucune actualisation.
 *
 * CE QUE CE MODULE NE FAIT PAS, ET IL FAUT LE DIRE AVANT LE CHIFFRE :
 *
 *   IL NE CONNAÎT QUE CE QUI EST PUBLIÉ. La BEAC a mis en ligne 252 résultats
 *   et 382 annonces pour sept ans et six Trésors. Le Cameroun y compte UNE
 *   annonce en 2023 et deux en 2024, ce qui ne peut pas être une année entière
 *   d'un Trésor qui émet toutes les semaines. Le chiffre rendu ici est donc un
 *   PLANCHER, et `couverture()` dit de combien il est plancher.
 *
 *   IL SUPPOSE LE REMBOURSEMENT IN FINE. Un bon à 26 semaines l'est toujours.
 *   Une obligation à trois ans peut s'amortir, et le communiqué ne le dit pas
 *   toujours. Tant qu'on ne l'a pas lu, la ligne reste entière jusqu'à son
 *   échéance : l'encours est donc surévalué pour les OTA amortissables, et
 *   `AVERTISSEMENTS` le porte écrit.
 *
 * TROIS FAMILLES SORTENT DU COMPTE, ET AUCUNE NE SORT EN SILENCE. Une séance
 * écartée à la main, un doublon, un montant hors d'échelle : chacun est rendu
 * avec son motif, parce qu'un total dont on ne sait pas ce qu'il laisse dehors
 * ne vaut rien.
 */

/** Ce qu'une séance adjugée apporte au stock. */
export interface Adjugee {
  cle: string;
  codeEmission?: string;
  pays: string;
  instrument: "BTA" | "OTA";
  /** « 26 semaines », « 3 ans », tel que le Trésor l'écrit. */
  tenor?: string;
  seance: string;
  /** En francs. Sans lui, la ligne n'apporte rien au stock. */
  servi?: number;
  /** L'échéance imprimée sur le communiqué, quand elle y est. */
  echeance?: string;
  /** Le motif d'une mise à l'écart faite à la main. */
  ecartee?: string;
}

export type Motif = "ecartee" | "sans_servi" | "servi_nul" | "doublon" | "hors_echelle" | "sans_echeance";

export interface Laissee {
  ligne: Adjugee;
  motif: Motif;
  /** Ce qu'on en dit, en toutes lettres. */
  dit: string;
}

export interface Retenue extends Adjugee {
  servi: number;
  echeance: string;
  /** L'échéance vient-elle de la pièce, ou d'un calcul sur la durée ? */
  origineEcheance: "imprimee" | "calculee";
}

/**
 * LA BANDE DE PLAUSIBILITÉ, ET POURQUOI ELLE N'EST PAS ARBITRAIRE.
 *
 * Une séance d'adjudication souveraine de la zone sert entre quelques
 * milliards et quelques dizaines de milliards. Deux défauts d'unité mesurés le
 * 14 octobre 2026 tombent très loin de part et d'autre :
 *
 *   Tchad, OTA 2 ans du 24 janvier 2024 : 16 678,63 Mds servis. La pièce
 *   imprime « 16678630 » sous un en-tête « en millions de FCFA », alors que le
 *   BTA de la MÊME PAGE imprime « 2703 ». Un Trésor n'adjuge pas 2,7 milliards
 *   et 16 678 milliards le même jour : la table des OTA est en milliers, mal
 *   étiquetée. LA FAUTE EST DANS LA PIÈCE, notre lecture est fidèle.
 *
 *   Guinée équatoriale, dix-huit séances : 3 à 20 MILLIONS servis. Un État ne
 *   lève pas trois millions de francs. Les pièces sont des scans sans couche
 *   texte, donc lues par un modèle, et le facteur mille y manque.
 *
 * Le remède n'est pas de multiplier en douce : c'est de sortir la ligne du
 * total EN LE DISANT, et de relire la pièce. Un encours corrigé au jugé est
 * pire qu'un encours amputé, parce qu'il ne se discute plus.
 */
export const PLANCHER = 100_000_000;
export const PLAFOND = 300_000_000_000;

export const AVERTISSEMENTS = [
  "Le stock ne compte que les séances publiées par la BEAC : c'est un plancher, jamais la dette adjugée réelle.",
  "Les obligations sont comptées entières jusqu'à leur échéance : une ligne amortissable est donc surévaluée.",
  "Une séance servie à zéro est un résultat, pas une absence : elle n'ajoute rien au stock et ne l'enlève pas.",
] as const;


/**
 * La durée telle que le Trésor l'écrit, rendue en jours.
 *
 * On accepte ce qu'on a vu passer et rien de plus : deviner une durée inconnue
 * placerait une échéance fausse, donc ferait sortir une ligne du stock un jour
 * qui n'est pas le sien.
 */
export function dureeEnJours(tenor?: string): number | undefined {
  if (!tenor) return undefined;
  const t = tenor.toLowerCase().replace(/\s+/g, " ").trim();
  const semaines = t.match(/^(\d{1,3})\s*semaines?$/);
  if (semaines) return Number(semaines[1]) * 7;
  const mois = t.match(/^(\d{1,2})\s*mois$/);
  if (mois) return Math.round(Number(mois[1]) * 30.4375);
  const ans = t.match(/^(\d{1,2})\s*ans?$/);
  if (ans) return Math.round(Number(ans[1]) * 365.25);
  return undefined;
}

/** L'échéance déduite de la séance et de la durée, quand la pièce la tait. */
export function echeanceCalculee(seance: string, tenor?: string): string | undefined {
  const jours = dureeEnJours(tenor);
  if (!jours) return undefined;
  const d = new Date(`${seance}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Date(d.getTime() + jours * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Ce qui entre dans le stock, et ce qui en reste dehors avec son motif.
 *
 * L'ORDRE DES REFUS EST UNE DÉCISION : on dit d'abord ce qu'une personne a
 * décidé (écartée), ensuite ce qui manque, enfin ce qui est invraisemblable.
 * Une ligne écartée à la main pour « ce n'est pas un résultat » ne doit pas
 * être rendue comme « hors d'échelle » : le motif humain prime sur le nôtre.
 */
export function preparer(lignes: Adjugee[]): { retenues: Retenue[]; laissees: Laissee[] } {
  const retenues: Retenue[] = [];
  const laissees: Laissee[] = [];
  /* UN CODE QUI REPARAÎT À UNE AUTRE DATE EST UN ABONDEMENT, pas un doublon :
     le Trésor rouvre sa ligne, et les deux montants s'ajoutent. Au MÊME jour,
     c'est la même pièce comptée deux fois. */
  const vus = new Set<string>();

  for (const l of [...lignes].sort((a, b) => a.seance.localeCompare(b.seance) || a.cle.localeCompare(b.cle))) {
    if (l.ecartee) { laissees.push({ ligne: l, motif: "ecartee", dit: `écartée à la main : ${l.ecartee}` }); continue; }

    const empreinte = l.codeEmission ? `${l.codeEmission}|${l.seance}` : `${l.pays}|${l.instrument}|${l.tenor}|${l.seance}|${l.servi}`;
    if (vus.has(empreinte)) { laissees.push({ ligne: l, motif: "doublon", dit: `déjà comptée le ${l.seance}${l.codeEmission ? ` sous le code ${l.codeEmission}` : ""}` }); continue; }

    if (l.servi == null) { laissees.push({ ligne: l, motif: "sans_servi", dit: "aucun montant servi n'a été lu sur la pièce" }); continue; }
    if (l.servi === 0) { vus.add(empreinte); laissees.push({ ligne: l, motif: "servi_nul", dit: "séance servie à zéro : un résultat, qui n'ajoute rien" }); continue; }
    if (l.servi < PLANCHER || l.servi > PLAFOND) {
      laissees.push({ ligne: l, motif: "hors_echelle", dit: `${(l.servi / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} Mds servis : hors de la bande ${PLANCHER / 1e6} millions à ${PLAFOND / 1e9} Mds, l'unité de la pièce est en cause` });
      continue;
    }

    const echeance = l.echeance ?? echeanceCalculee(l.seance, l.tenor);
    if (!echeance) { laissees.push({ ligne: l, motif: "sans_echeance", dit: `ni échéance imprimée ni durée exploitable${l.tenor ? ` (« ${l.tenor} »)` : ""}` }); continue; }

    vus.add(empreinte);
    retenues.push({ ...l, servi: l.servi, echeance, origineEcheance: l.echeance ? "imprimee" : "calculee" });
  }
  return { retenues, laissees };
}

export interface Photo {
  date: string;
  total: number;
  lignes: number;
  parPays: Record<string, number>;
  parInstrument: Record<string, number>;
}

/** Le stock à une date : ce qui est entré et pas encore sorti. */
export function encoursA(retenues: Retenue[], date: string): Photo {
  const photo: Photo = { date, total: 0, lignes: 0, parPays: {}, parInstrument: {} };
  for (const r of retenues) {
    /* L échéance est le jour de la sortie : une ligne échue CE jour-là n est
       plus au stock le soir, et c est la convention du BOC. */
    if (r.seance > date || r.echeance <= date) continue;
    photo.total += r.servi;
    photo.lignes++;
    photo.parPays[r.pays] = (photo.parPays[r.pays] ?? 0) + r.servi;
    photo.parInstrument[r.instrument] = (photo.parInstrument[r.instrument] ?? 0) + r.servi;
  }
  return photo;
}

/** Le stock mois par mois, du premier au dernier jour utile. */
export function serieMensuelle(retenues: Retenue[], jusqua?: string): Photo[] {
  if (!retenues.length) return [];
  const debut = retenues.reduce((m, r) => (r.seance < m ? r.seance : m), retenues[0].seance);
  const borne = jusqua ?? retenues.reduce((m, r) => (r.echeance > m ? r.echeance : m), retenues[0].echeance);
  const out: Photo[] = [];
  const d = new Date(`${debut.slice(0, 7)}-01T12:00:00Z`);
  for (;;) {
    /* Le dernier jour du mois : le zéro du mois suivant moins un jour. */
    const fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12));
    const iso = fin.toISOString().slice(0, 10);
    if (iso > borne) break;
    out.push(encoursA(retenues, iso));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

/**
 * DE COMBIEN LE STOCK EST-IL UN PLANCHER ?
 *
 * La BEAC publie une ANNONCE pour chaque séance qu'elle prépare et un RÉSULTAT
 * pour une partie seulement. Le rapport des deux ne dit pas tout, mais il dit
 * l'essentiel : à soixante-six pour cent de résultats publiés, un tiers des
 * séances annoncées n'ont jamais rendu de montant servi, et leur encours
 * manque. C'est la seule façon honnête de présenter un total incomplet.
 */
export function couverture(resultats: number, annonces: number): { part: number; dit: string } {
  const part = annonces > 0 ? resultats / annonces : 0;
  return {
    part,
    dit: annonces > 0
      ? `${resultats} résultats publiés pour ${annonces} séances annoncées, soit ${Math.round(part * 100)} %. Le stock reconstitué est un plancher.`
      : "aucune annonce connue : la part publiée ne se mesure pas.",
  };
}
