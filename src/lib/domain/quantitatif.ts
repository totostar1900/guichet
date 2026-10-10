import type { CashEntry } from "@/lib/domain/cash";
import { isIncoming } from "@/lib/domain/cash";
import { FIRM_TYPES, INTENT_LABEL, sensDeLIntention } from "@/lib/domain/intent";
import type { EventLog, Intent, IntentType, Offer } from "@/lib/domain/types";
import { positionFor } from "@/lib/documents/position";
import { enDefaut as enDefautTenue } from "@/lib/domain/tenue";
import { transitions, type Period } from "@/lib/reporting";

/**
 * COMBIEN UN CLIENT A TRAITÉ AVEC LA MAISON, PAR PÉRIODE.
 *
 * Trois séries, et pas une de plus : ce qu'il a acheté et cédé, ce que son
 * argent a fait, ce que la maison a perçu. Chacune se découpe au mois, au
 * trimestre ou à l'année, sur une plage que le desk choisit.
 *
 * DEUX RÈGLES DE JUSTESSE, QUI DÉCIDENT DE TOUT LE RESTE.
 *
 * Un volume se compte à sa DATE DE RÈGLEMENT, pas à celle de l'ordre : un
 * ordre reçu en septembre et réglé en octobre appartient à octobre, sinon le
 * mois d'une adjudication porte un argent qui n'est pas encore arrivé.
 *
 * Un ordre servi mais jamais réglé ne compte dans AUCUNE période. Il n'est
 * pas du volume, il est une créance : il se montre à part, avec sa référence,
 * parce que le noyer dans un total ferait croire que l'argent est rentré.
 *
 * Rien n'est stocké : tout se recalcule depuis le journal des ordres et les
 * mouvements d'espèces, comme le reporting. Un chiffre faux se corrige à sa
 * source.
 */
export const GRANULARITES = ["mois", "trimestre", "annee"] as const;
export type Granularite = (typeof GRANULARITES)[number];

export const estGranularite = (s: string | undefined): s is Granularite => GRANULARITES.includes(s as Granularite);

export interface Tranche {
  clef: string;
  libelle: string;
  from: string;
  to: string;
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const jour = (iso: string) => iso.slice(0, 10);
const deuxChiffres = (n: number) => String(n).padStart(2, "0");

/** Le dernier jour d'un mois, sans passer par un fuseau. */
const finDuMois = (an: number, mois: number) => new Date(Date.UTC(an, mois + 1, 0)).getUTCDate();

/**
 * Les tranches qui couvrent la plage, de la première entamée à la dernière.
 *
 * Une tranche entamée compte en entier : un client arrivé le 21 septembre a un
 * mois de septembre, même s'il n'en a vécu que dix jours. Couper la tranche à
 * la date d'arrivée donnerait une première barre toujours basse, qu'on
 * relirait comme un démarrage lent.
 */
export function tranches(plage: Period, g: Granularite): Tranche[] {
  const [a1, m1] = [Number(plage.from.slice(0, 4)), Number(plage.from.slice(5, 7)) - 1];
  const [a2, m2] = [Number(plage.to.slice(0, 4)), Number(plage.to.slice(5, 7)) - 1];
  if (!Number.isFinite(a1) || !Number.isFinite(a2) || plage.to < plage.from) return [];
  const out: Tranche[] = [];
  if (g === "annee") {
    for (let a = a1; a <= a2; a++) out.push({ clef: String(a), libelle: String(a), from: `${a}-01-01`, to: `${a}-12-31` });
    return out;
  }
  if (g === "trimestre") {
    for (let a = a1, t = Math.floor(m1 / 3); a < a2 || (a === a2 && t <= Math.floor(m2 / 3)); t === 3 ? ((a += 1), (t = 0)) : (t += 1)) {
      const debut = t * 3;
      out.push({ clef: `${a}-T${t + 1}`, libelle: `T${t + 1} ${a}`, from: `${a}-${deuxChiffres(debut + 1)}-01`, to: `${a}-${deuxChiffres(debut + 3)}-${finDuMois(a, debut + 2)}` });
    }
    return out;
  }
  for (let a = a1, m = m1; a < a2 || (a === a2 && m <= m2); m === 11 ? ((a += 1), (m = 0)) : (m += 1)) {
    out.push({ clef: `${a}-${deuxChiffres(m + 1)}`, libelle: `${MOIS[m]} ${String(a).slice(2)}`, from: `${a}-${deuxChiffres(m + 1)}-01`, to: `${a}-${deuxChiffres(m + 1)}-${finDuMois(a, m)}` });
  }
  return out;
}

/**
 * Les découpages qu'on peut proposer sans mentir.
 *
 * Un graphique à une seule barre n'est pas un graphique, et un découpage
 * annuel sur trois semaines d'histoire en donnerait un. Le mois reste toujours
 * offert : c'est le plus fin, et il doit rester possible de regarder de près
 * même quand il n'y a qu'un mois à voir.
 */
const trancheEntiere = (t: Tranche, p: Period) => t.from >= p.from && t.to <= p.to;

export const granularitesPossibles = (plage: Period): Granularite[] =>
  GRANULARITES.filter((g) => {
    if (g === "mois") return true;
    const ts = tranches(plage, g);
    /* Deux tranches ne suffisent pas si les deux sont entamées : du 21
       septembre au 10 octobre, le découpage trimestriel donnerait deux barres
       dont aucune ne couvre un trimestre. Il faut qu'au moins une tranche
       tienne tout entière dans la plage pour que la comparaison ait un sens. */
    return ts.length >= 2 && ts.some((t) => trancheEntiere(t, plage));
  });

/**
 * Le découpage le plus large qui donne encore trois barres.
 *
 * Trois est le minimum pour qu'une forme se lise ; en dessous, le plus fin
 * vaut mieux. À l'ouverture de la plateforme c'est donc le mois, et cela le
 * restera jusqu'à ce que l'histoire soit assez longue.
 */
export function granulariteParDefaut(plage: Period): Granularite {
  const possibles = granularitesPossibles(plage);
  for (const g of ["annee", "trimestre"] as const) if (possibles.includes(g) && tranches(plage, g).length >= 3) return g;
  return "mois";
}

/**
 * LES DURÉES D'OBSERVATION, ET POURQUOI ELLES SE RABOTENT.
 *
 * Demander cinq ans à un compte qui en a trois semaines dessinerait soixante
 * barres vides, et une suite de zéros se relit comme une chute. La plage
 * demandée est donc ramenée à ce qui existe, et l'écran dit qu'elle l'a été :
 * une fenêtre qu'on ne peut pas remplir doit le dire, pas faire semblant.
 */
export const DUREES = [
  { id: "a1", ans: 1, nom: "1 an" },
  { id: "a2", ans: 2, nom: "2 ans" },
  { id: "a3", ans: 3, nom: "3 ans" },
  { id: "a5", ans: 5, nom: "5 ans" },
] as const;
export type DureeId = (typeof DUREES)[number]["id"] | "tout";
export const estDuree = (s: string | undefined): s is DureeId => s === "tout" || DUREES.some((d) => d.id === s);

export function plageDeLaDuree(duree: DureeId, ouverture: string, aujourdHui: string): { plage: Period; rabotee: boolean } {
  const debutVoulu = duree === "tout" ? ouverture : `${Number(aujourdHui.slice(0, 4)) - DUREES.find((d) => d.id === duree)!.ans}${aujourdHui.slice(4, 10)}`;
  const from = debutVoulu < ouverture ? ouverture : debutVoulu;
  return { plage: { from, to: aujourdHui }, rabotee: duree !== "tout" && debutVoulu < ouverture };
}

/* LE SENS SE LIT DANS intent.ts, ET LE CARACTÈRE FERME ICI. Un appétit
   augmente lui aussi ce que le client voudrait détenir, mais il n'a traité
   avec personne : cette vue compte ce qui s'est fait, pas ce qui s'est dit. */
export const estAchat = (t: IntentType) => FIRM_TYPES.includes(t) && sensDeLIntention(t) === "augmente";
export const estCession = (t: IntentType) => FIRM_TYPES.includes(t) && sensDeLIntention(t) === "reduit";

export interface OperationQ {
  ref: string;
  /** La date qui la situe : son règlement s'il a eu lieu, sinon son exécution, sinon sa réception. */
  date: string;
  reglee: boolean;
  /** Servie puis jamais réglée : une créance, pas un volume. */
  enDefaut: boolean;
  sens: "achat" | "cession";
  nature: string;
  ligne: string;
  montant: number;
  etat: Intent["state"];
}

export interface Barre extends Tranche {
  achats: number;
  cessions: number;
  entrees: number;
  sorties: number;
  commissions: number;
  /** Le cumul des achats réglés moins les cessions réglées, à la fin de la tranche. */
  investiNet: number;
}

export interface Quantitatif {
  granularite: Granularite;
  plage: Period;
  barres: Barre[];
  operations: OperationQ[];
  totaux: {
    traite: number;
    achats: number;
    cessions: number;
    entrees: number;
    sorties: number;
    commissions: number;
    operations: number;
    enDefaut: number;
    refsEnDefaut: string[];
    ticketMedian: number;
  };
}

const dans = (iso: string | undefined, t: Tranche) => Boolean(iso) && jour(iso!) >= t.from && jour(iso!) <= t.to;

/** Les opérations fermes d'un client, situées dans le temps et nommées. */
export function operationsDuClient(userId: string, intents: Intent[], offers: Offer[], events: EventLog[]): OperationQ[] {
  const byId = new Map(offers.map((o) => [o.id, o]));
  return intents
    .filter((i) => i.clientId === userId && (estAchat(i.type) || estCession(i.type)) && i.state !== "annulee")
    .map((i) => {
      const o = byId.get(i.offerId);
      const pos = o ? positionFor(i, o) : undefined;
      const t = transitions(i.id, events);
      const reglee = i.state === "reglee";
      return {
        ref: i.ref,
        date: jour(t.reglee ?? t.servie ?? i.createdAt),
        reglee,
        /* SERVI N'EST PAS EN DÉFAUT. Tout ordre resté en « servie » était
           compté comme créance, y compris celui de la veille : la page
           appelait « jamais réglé » un virement qui n'avait pas eu le temps
           d'arriver. Le délai de cinq jours ouvrés se lit dans tenue.ts. */
        enDefaut: enDefautTenue(t.servie, i.state),
        sens: estAchat(i.type) ? ("achat" as const) : ("cession" as const),
        nature: INTENT_LABEL[i.type],
        ligne: o?.title ?? i.offerId,
        /* UN MONTANT QUI NE SE CALCULE PAS VAUT CELUI QUI A ÉTÉ DEMANDÉ, et
           jamais NaN : une ligne sans prix ni nominal rendrait un total
           « NaN » qui emporterait tous les autres chiffres de l'écran. */
        montant: pos && Number.isFinite(pos.total) ? Math.abs(pos.total) : (i.amount ?? 0),
        etat: i.state,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

const mediane = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

export function quantitatif(
  userId: string,
  intents: Intent[],
  offers: Offer[],
  events: EventLog[],
  cash: CashEntry[],
  plage: Period,
  granularite: Granularite,
): Quantitatif {
  const toutes = operationsDuClient(userId, intents, offers, events);
  const operations = toutes.filter((x) => x.date >= plage.from && x.date <= plage.to);
  const mouvements = cash.filter((c) => jour(c.at) >= plage.from && jour(c.at) <= plage.to);

  let cumul = 0;
  const barres: Barre[] = tranches(plage, granularite).map((t) => {
    const reglees = operations.filter((x) => x.reglee && dans(x.date, t));
    const achats = reglees.filter((x) => x.sens === "achat").reduce((s, x) => s + x.montant, 0);
    const cessions = reglees.filter((x) => x.sens === "cession").reduce((s, x) => s + x.montant, 0);
    const dedans = mouvements.filter((c) => dans(c.at, t));
    cumul += achats - cessions;
    return {
      ...t,
      achats,
      cessions,
      entrees: dedans.filter((c) => isIncoming(c.kind)).reduce((s, c) => s + c.amount, 0),
      sorties: dedans.filter((c) => !isIncoming(c.kind)).reduce((s, c) => s + c.amount, 0),
      commissions: dedans.filter((c) => c.kind === "frais").reduce((s, c) => s + c.amount, 0),
      investiNet: cumul,
    };
  });

  const enDefaut = operations.filter((x) => x.enDefaut);
  const reglees = operations.filter((x) => x.reglee);
  return {
    granularite,
    plage,
    barres,
    operations,
    totaux: {
      traite: barres.reduce((s, b) => s + b.achats + b.cessions, 0),
      achats: barres.reduce((s, b) => s + b.achats, 0),
      cessions: barres.reduce((s, b) => s + b.cessions, 0),
      entrees: barres.reduce((s, b) => s + b.entrees, 0),
      sorties: barres.reduce((s, b) => s + b.sorties, 0),
      commissions: barres.reduce((s, b) => s + b.commissions, 0),
      operations: reglees.length,
      enDefaut: enDefaut.reduce((s, x) => s + x.montant, 0),
      refsEnDefaut: enDefaut.map((x) => x.ref),
      ticketMedian: mediane(reglees.map((x) => x.montant)),
    },
  };
}
