import type { LigneSondee } from "./types";
import { cleDeGroupe, prete, type Consensus } from "./sondage";

/**
 * L'ANALYSE D'UN SONDAGE, À PLAT : ce que le desk lit pour décider, sans recalculer le consensus (12 novembre 2026, planche « Annonces », choix 2A et 3A).
 *
 * `consensus()` donne ce qu'on peut PORTER (le ferme, le niveau pondéré, l'échelle). Ce module y ajoute ce qu'il faut pour CONDUIRE UNE ANALYSE : l'origine du sondage (une
 * question du desk, ou des demandes que des clients ont poussées d'eux-mêmes), les taux et le prix minimaux et maximaux, la fraîcheur de la dernière réponse, la répartition du
 * taux demandé, et le détail réponse par réponse. Il ne lit rien et n'écrit rien : les lignes lui arrivent.
 *
 * LE NIVEAU MOYEN N'EST PAS RECALCULÉ ICI : c'est celui du consensus, pondéré par les montants. Une moyenne simple donnerait la voix du petit client au même volume que celle du gros.
 */
export interface ReponseDeSondage {
  id: string;
  ref: string;
  client: string;
  segment?: string;
  montant: number;
  taux?: number;
  prix?: number;
  preteLe?: string;
  recueLe: string;
  /** Ce que le client a modifié depuis, quand il l'a fait. */
  modifiee?: string;
}

export interface ClasseDeTaux {
  de: number;
  a: number;
  montant: number;
  clients: number;
}

export interface AnalyseDeGroupe {
  cle: string;
  /** « desk » : les réponses à une question que la maison a posée. « clients » : des demandes que des clients ont poussées eux-mêmes. */
  origine: "desk" | "clients";
  /** La référence de la question du desk, quand il y en a une. */
  refDesk?: string;
  instrument: string;
  country: string;
  tenor: string;
  clients: number;
  clientsFermes: number;
  ferme: number;
  possible: number;
  /** Ce que la question cherchait, quand c'est une question du desk. */
  cherche?: number;
  tauxMin?: number;
  tauxMoyen?: number;
  tauxMax?: number;
  prixMin?: number;
  auPlusTot?: string;
  /** La date de la dernière réponse (ISO). */
  derniere?: string;
  /** Son âge en jours au jour de la lecture, posé par l'appelant. */
  age?: number;
  atteint: boolean;
  reponses: ReponseDeSondage[];
  repartition: ClasseDeTaux[];
  echelle: { limite: number | null; tenu: number; clients: number }[];
}

const bornes = (v: number[]): { min?: number; max?: number } => (v.length ? { min: Math.min(...v), max: Math.max(...v) } : {});

/** Le taux demandé, rangé en au plus `n` classes égales de l'étendue lue : tout égal se range en une seule. */
export function repartitionDesTaux(lignes: Pick<LigneSondee, "rate" | "montant">[], n = 4): ClasseDeTaux[] {
  const l = lignes.filter((x): x is { rate: number; montant: number } => x.rate != null);
  if (!l.length) return [];
  const { min, max } = bornes(l.map((x) => x.rate));
  if (min === undefined || max === undefined || max - min < 1e-9) return [{ de: min ?? 0, a: min ?? 0, montant: l.reduce((s, x) => s + x.montant, 0), clients: l.length }];
  const pas = (max - min) / n;
  const classes: ClasseDeTaux[] = Array.from({ length: n }, (_, i) => ({ de: min + i * pas, a: i === n - 1 ? max : min + (i + 1) * pas, montant: 0, clients: 0 }));
  for (const x of l) {
    const i = Math.min(n - 1, Math.floor((x.rate - min) / pas));
    classes[i].montant += x.montant;
    classes[i].clients += 1;
  }
  return classes;
}

/** Une ligne sondée, lue comme une réponse : ce que le desk affiche d'un client et de sa demande. */
export function versReponse(l: LigneSondee, modifs: Map<string, string>): ReponseDeSondage {
  return { id: l.id, ref: l.ref, client: l.clientName ?? "—", segment: l.clientSegment, montant: l.montant, taux: l.rate, prix: l.pricePct, preteLe: prete(l), recueLe: l.createdAt, modifiee: modifs.get(l.id) };
}

export const minimum = (v: (number | undefined)[]): number | undefined => {
  const n = v.filter((x): x is number => x != null);
  return n.length ? Math.min(...n) : undefined;
};

export function analyserGroupe(c: Consensus, demandes: LigneSondee[], question: LigneSondee | undefined, modifs: Map<string, string>, seuilAtteint: boolean): AnalyseDeGroupe {
  const taux = demandes.flatMap((l) => (l.rate != null ? [l.rate] : []));
  const prix = demandes.flatMap((l) => (l.pricePct != null ? [l.pricePct] : []));
  const dates = demandes.map((l) => l.updatedAt || l.createdAt).sort();
  return {
    cle: c.cle,
    origine: question || c.cle.startsWith("desk:") ? "desk" : "clients",
    refDesk: question?.ref,
    instrument: c.instrument,
    country: c.country,
    tenor: c.tenor,
    clients: c.clients,
    clientsFermes: c.clientsFermes,
    ferme: c.ferme,
    possible: c.montant,
    cherche: question?.montant,
    tauxMin: bornes(taux).min,
    tauxMoyen: c.niveau ?? undefined,
    tauxMax: bornes(taux).max,
    prixMin: bornes(prix).min,
    auPlusTot: c.auPlusTot ?? undefined,
    derniere: dates[dates.length - 1],
    atteint: seuilAtteint,
    reponses: demandes.map((l) => versReponse(l, modifs)),
    repartition: repartitionDesTaux(demandes),
    echelle: c.echelle.rows.map((r) => ({ limite: r.limit, tenu: r.soft + r.firm, clients: r.orders })),
  };
}

/** Les jours entre une date ISO et aujourd'hui, jamais négatifs. */
export const ageEnJours = (iso: string | undefined, aujourdhui: string): number | undefined =>
  iso ? Math.max(0, Math.round((Date.parse(`${aujourdhui}T00:00:00Z`) - Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)) / 86_400_000)) : undefined;

/**
 * LES LIGNES DU FICHIER D'ANALYSE : une par réponse, avec tout ce que le desk en sait. Les coordonnées du client y sont (nom, segment) : le desk les voit déjà dans le détail, et un
 * fichier qui les retirerait ne servirait pas à conduire l'analyse.
 */
export function lignesDExport(lignes: LigneSondee[], parId: Map<string, LigneSondee>): (string | number | undefined)[][] {
  const num = (v: number | undefined, d = 2) => (v == null ? "" : v.toFixed(d).replace(".", ","));
  return lignes.map((l) => {
    const q = l.repondA ? parId.get(l.repondA) : undefined;
    return [l.ref, l.origine === "desk" ? "question du desk" : q ? "réponse à une question" : "demande de client", q?.ref ?? "", l.instrument, l.country, l.tenor, l.clientName ?? "", l.clientSegment ?? "", l.montant, num(l.rate), num(l.pricePct), prete(l) ?? "", l.createdAt.slice(0, 10), l.state, l.closedReason ?? ""];
  });
}
export const ENTETES_D_EXPORT = ["Réf.", "Nature", "Réponse à", "Compartiment", "Trésor", "Durée", "Client", "Segment", "Montant (FCFA)", "Taux %", "Prix %", "Prêt le", "Reçue le", "État", "Motif de clôture"];

/**
 * LES DEMANDES D'UN GROUPE, telles qu'elles sont arrivées : la page et l'export les lisent ici, d'une seule façon. La clef vient du domaine (`cleDeGroupe`), et une réponse à
 * une question du desk se range sous la question (`desk:{id}`), pas sous sa propre durée. Une clef écrite à deux endroits finit par valoir deux choses.
 */
export function demandesDuGroupe(lignes: LigneSondee[], cle: string): LigneSondee[] {
  const parId = new Map(lignes.map((l) => [l.id, l]));
  return lignes.filter((l) => {
    if (l.origine === "desk" || l.state === "close") return false;
    const sur = l.repondA ? parId.get(l.repondA) : undefined;
    return sur ? `desk:${sur.id}` === cle : cleDeGroupe(l) === cle;
  });
}
