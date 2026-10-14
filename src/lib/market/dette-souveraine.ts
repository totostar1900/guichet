import type { EncoursDette } from "./encours-dette";
import { principalDuCoupon } from "./principal-par-le-coupon";

/**
 * LA DETTE D'UN ÉTAT, COTÉE ET ADJUGÉE, AU MÊME ENDROIT.
 *
 * Aucun chiffre de cette page n'était visible avant aujourd'hui, et deux
 * d'entre eux n'existaient nulle part dans la zone. Un Trésor de la CEMAC
 * emprunte par deux portes qui ne se parlent pas :
 *
 *   LA COTE, dont la BVMAC publie l'encours à chaque séance, ligne par ligne,
 *   avec le cours et le nominal restant. C'est un stock, complet par
 *   construction, et notre lecteur l'écrit depuis la migration 0096.
 *
 *   L'ADJUDICATION, qui n'a AUCUNE table d'encours. Ni les communiqués de
 *   résultats, qui ne couvrent que 82 levées sur 536, ni les émissions du
 *   tableau de bord, qui sont des intentions, ne donnent le stock. Il se
 *   déduit du coupon : un paiement d'intérêts est exact et le taux facial est
 *   imprimé à côté, donc coupon ÷ taux rend le principal, vérifié 69 fois
 *   sur 80 contre une source indépendante.
 *
 * LES DEUX NE S'ADDITIONNENT PAS SANS PRÉCAUTION, et c'est le cœur de ce
 * module. Le coté est un stock du jour, l'adjugé est le dernier principal
 * connu de chaque ligne, daté du dernier coupon vu. Les additionner donne un
 * ordre de grandeur juste et une date floue : la fiche porte donc les deux
 * colonnes séparées, leur somme, ET la date de chaque moitié.
 *
 * RIEN N'EST EXTRAPOLÉ. L'adjugé ne compte que les lignes ayant payé un
 * coupon pendant les 81 semaines lues, et les bons n'en paient pas : c'est un
 * encours d'obligations, et la fiche le dit à côté du total plutôt qu'en note
 * de bas de page.
 */

/** Ce qu'un émetteur doit, par la porte de la cote. */
export interface CoteDeLEmetteur {
  encours: number;
  lignes: number;
  /** Le coupon annuel dû, en francs : la somme de nominal restant × taux. */
  coutAnnuel: number;
  /** Pondéré par l'encours, en pour cent. */
  tauxMoyen: number;
  /** La séance qui publie ce stock. */
  le: string;
}

/** Ce qu'un émetteur doit, par la porte de l'adjudication. */
export interface AdjugeDeLEmetteur {
  encours: number;
  lignes: number;
  coutAnnuel: number;
  tauxMoyen: number;
  /** Le coupon le plus récent qui fonde ce chiffre : la fraîcheur du stock. */
  le: string;
}

export interface FicheEmetteur {
  emetteur: string;
  cote?: CoteDeLEmetteur;
  adjuge?: AdjugeDeLEmetteur;
  /** La somme des deux portes, quand au moins une existe. */
  total: number;
  coutTotal: number;
}

/** Un coupon du livre des mouvements, réduit à ce qui fonde un principal. */
export interface CouponAdjuge {
  pays: string;
  code: string;
  taux: number;
  montant: number;
  le: string;
  /** L'échéance imprimée : sans elle on ne sait pas si la ligne vit encore. */
  echeance?: string;
}

const moyennePonderee = (n: number, d: number): number => (d > 0 ? (n / d) * 100 : 0);

/**
 * LES DEUX PORTES N APPELLENT PAS LE MEME ETAT DE LA MEME FACON, et la fiche
 * se brisait dessus : la cote ecrit « ETAT DU GABON », le livre des
 * mouvements ecrit « Gabon », et le Tresor gabonais paraissait DEUX FOIS,
 * 677 milliards d un cote et 424 de l autre, sa dette reelle de 1 101
 * milliards restant invisible.
 *
 * Le registre des emetteurs porte deja les deux ecritures comme alias du meme
 * profil. On l INJECTE plutot que de l importer, pour que ce module reste pur
 * et qu une seconde table d alias ne naisse pas a cote de la premiere : c est
 * la faute qui a coute dix-sept avis de Guinee equatoriale sous une clef
 * illisible, et 22 pieces BEAC jamais descendues.
 */
export type Nommer = (brut: string) => string;
const telQuel: Nommer = (x) => x;

/** La part cotée, depuis le relevé d'encours d'une séance. */
export function coteParEmetteur(lignes: EncoursDette[], nommer: Nommer = telQuel): Map<string, CoteDeLEmetteur> {
  const out = new Map<string, CoteDeLEmetteur>();
  for (const l of lignes) {
    const nom = nommer(l.issuer);
    const e = out.get(nom) ?? { encours: 0, lignes: 0, coutAnnuel: 0, tauxMoyen: 0, le: l.sessionDate };
    e.encours += l.outstanding;
    e.lignes += 1;
    /* LE COUPON SE CALCULE SUR LE NOMINAL RESTANT, PAS SUR L'ENCOURS. L'encours
       est au cours du jour ; un titre à 95 doit son coupon sur cent. Les
       confondre sous-estimerait le service de cinq pour cent. */
    e.coutAnnuel += (l.units * l.nominalRemaining * l.couponRate) / 100;
    if (l.sessionDate > e.le) e.le = l.sessionDate;
    out.set(nom, e);
  }
  for (const e of out.values()) e.tauxMoyen = moyennePonderee(e.coutAnnuel, e.encours);
  return out;
}

/**
 * La part adjugée, déduite des coupons.
 *
 * ON GARDE LE COUPON LE PLUS RÉCENT DE CHAQUE LIGNE : sur une ligne
 * amortissable il diminue avec le capital, donc le dernier vu est le plus
 * proche de ce qui reste dû. `vivante` décide de l'appartenance au stock,
 * parce qu'une ligne échue a payé son dernier coupon et ne doit plus rien.
 */
export function adjugeParEmetteur(coupons: CouponAdjuge[], auj: string, nommer: Nommer = telQuel): Map<string, AdjugeDeLEmetteur> {
  const dernier = new Map<string, CouponAdjuge>();
  for (const c of [...coupons].sort((a, b) => (a.le ?? "").localeCompare(b.le ?? ""))) dernier.set(c.code, c);

  const out = new Map<string, AdjugeDeLEmetteur>();
  for (const c of dernier.values()) {
    if (!c.echeance || c.echeance <= auj) continue;
    const principal = principalDuCoupon(c);
    if (principal === undefined) continue;
    const nom = nommer(c.pays);
    const e = out.get(nom) ?? { encours: 0, lignes: 0, coutAnnuel: 0, tauxMoyen: 0, le: c.le };
    e.encours += principal;
    e.lignes += 1;
    e.coutAnnuel += c.montant;
    if (c.le > e.le) e.le = c.le;
    out.set(nom, e);
  }
  for (const e of out.values()) e.tauxMoyen = moyennePonderee(e.coutAnnuel, e.encours);
  return out;
}

/**
 * Les deux portes réunies, du plus endetté au moins endetté.
 *
 * UN ÉMETTEUR QUI N'EMPRUNTE QUE PAR UNE PORTE PARAÎT QUAND MÊME, avec
 * l'autre colonne vide : la BDEAC et les émetteurs privés n'adjugent pas, et
 * les trier hors de la liste ferait croire que la cote est souveraine.
 */
export function fiches(cote: Map<string, CoteDeLEmetteur>, adjuge: Map<string, AdjugeDeLEmetteur>): FicheEmetteur[] {
  const noms = new Set([...cote.keys(), ...adjuge.keys()]);
  const out: FicheEmetteur[] = [];
  for (const emetteur of noms) {
    const c = cote.get(emetteur);
    const a = adjuge.get(emetteur);
    out.push({
      emetteur,
      cote: c,
      adjuge: a,
      total: (c?.encours ?? 0) + (a?.encours ?? 0),
      coutTotal: (c?.coutAnnuel ?? 0) + (a?.coutAnnuel ?? 0),
    });
  }
  return out.sort((x, y) => y.total - x.total);
}

/**
 * CE QU'IL FAUT DIRE AVEC CES CHIFFRES, et qui ne tient pas dans une note.
 *
 * Un total dont on ignore ce qu'il laisse dehors ne vaut rien, et celui-ci
 * laisse dehors trois choses nommables.
 */
export const RESERVES = [
  "La colonne cotée est un stock publié à une séance ; la colonne adjugée est le dernier principal connu de chaque ligne, à la date de son dernier coupon. Les deux dates diffèrent, et la fiche les porte.",
  "L'adjugé ne compte que les lignes ayant payé un coupon pendant les semaines lues du tableau de bord. Les bons du Trésor n'en paient aucun : ils sont absents par nature.",
  "Un émetteur qui n'emprunte que par une porte garde l'autre colonne vide. La BDEAC et les émetteurs privés n'adjugent pas.",
] as const;

/** La somme de la zone, et la part de chaque porte. */
export function total(fiches: FicheEmetteur[]): { cote: number; adjuge: number; total: number; coutTotal: number; partAdjugee: number } {
  const cote = fiches.reduce((a, f) => a + (f.cote?.encours ?? 0), 0);
  const adjuge = fiches.reduce((a, f) => a + (f.adjuge?.encours ?? 0), 0);
  const coutTotal = fiches.reduce((a, f) => a + f.coutTotal, 0);
  const t = cote + adjuge;
  return { cote, adjuge, total: t, coutTotal, partAdjugee: t > 0 ? (adjuge / t) * 100 : 0 };
}
