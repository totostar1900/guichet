import type { Offer } from "./types";
import { summarize } from "./summary";
import { lieuDe } from "./sections";

/**
 * DEUX ALERTES QUE LE SUIVI D'UNE LIGNE NE SAVAIT PAS FAIRE (11 novembre 2026, planche « Alertes de séance et de seuil », 1B et 2A).
 *
 * LA SÉRIE (1B) : le Trésor et l'instrument, toutes durées. « Toute OTA du Gabon », pas « l'OTA à 5 ans » : moins de réglages, et le client qui veut une durée précise arrête l'alerte après le premier message qui ne lui convient pas.
 * LE SEUIL (2A) : un chiffre qui franchit un niveau. Il sonne une fois, puis s'éteint ; le client le remet d'un geste.
 */
export const PLAFOND_SEUILS = 10;

export type MetricDeSeuil = "cours" | "rendement" | "vl";
export type SensDeSeuil = "au_dessus" | "en_dessous";

export interface SerieSuivie {
  id: string;
  userId: string;
  country: string;
  kind: string;
  label: string;
  /** Les séances déjà annoncées au client : un message par séance. */
  notified: string[];
  createdAt: string;
}

export interface AlerteDeSeuil {
  id: string;
  userId: string;
  offerId: string;
  metric: MetricDeSeuil;
  sens: SensDeSeuil;
  value: number;
  state: "active" | "declenchee" | "annulee";
  firedAt?: string;
  firedValue?: number;
  createdAt: string;
}

/** La série d'une séance : son Trésor (le pays) et son instrument. Rien pour une ligne qui n'est pas une séance. */
export function cleDeSerie(o: Pick<Offer, "kind" | "instrument" | "typeKey" | "country">): { country: string; kind: string; label: string } | null {
  if (lieuDe(o) !== "adjudications") return null;
  return { country: o.country, kind: o.kind, label: `${o.kind} · ${o.country}` };
}

export const memeSerie = (o: Pick<Offer, "kind" | "instrument" | "typeKey" | "country">, f: Pick<SerieSuivie, "country" | "kind">): boolean => {
  const c = cleDeSerie(o);
  return Boolean(c) && c!.country === f.country && c!.kind === f.kind;
};

const nombre = (texte: string): number | null => {
  const n = Number(texte.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) && texte.trim() !== "" ? n : null;
};

/**
 * LE CHIFFRE QU'UNE ALERTE DE SEUIL SURVEILLE, par famille : le cours d'une action, la valeur liquidative d'un fonds, le rendement d'une obligation cotée.
 * Une séance n'en a pas : son taux ou son prix n'est publié qu'une fois, à la fin. Sans chiffre (cours absent), pas d'alerte.
 */
export function valeurSurveillee(o: Offer, now = new Date()): { metric: MetricDeSeuil; valeur: number; unite: string; nom: string } | null {
  if (lieuDe(o) === "adjudications") return null;
  if (o.kind === "FONDS" && o.fund) return { metric: "vl", valeur: o.fund.nav, unite: "FCFA", nom: "valeur liquidative" };
  if (o.kind === "MARCHE" && o.instrument === "action") return o.lastPrice != null ? { metric: "cours", valeur: o.lastPrice, unite: "FCFA", nom: "cours" } : null;
  if (o.kind === "MARCHE") {
    const s = summarize(o, now);
    const v = /%/.test(s.hero) ? nombre(s.hero) : null;
    return v != null ? { metric: "rendement", valeur: v, unite: "%", nom: "rendement" } : null;
  }
  return null;
}

export const NOM_DU_CHIFFRE: Record<MetricDeSeuil, string> = { cours: "cours", rendement: "rendement", vl: "valeur liquidative" };

/** Le niveau est franchi quand le chiffre est au-delà du seuil, ou égal. */
export const seuilFranchi = (a: Pick<AlerteDeSeuil, "sens" | "value">, valeur: number): boolean => (a.sens === "au_dessus" ? valeur >= a.value : valeur <= a.value);
