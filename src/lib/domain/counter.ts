import type { Intent, Offer } from "./types";
import { fmt, fmtDate, fmtDateTime, fmtPrice } from "@/lib/format";

/**
 * La contre-proposition : d'autres conditions, soumises au client.
 *
 * Un carnet étroit impose presque à chaque séance de servir autrement que
 * demandé : pas à ce prix-là mais à celui-ci, pas cent titres mais quarante.
 * Le desk n'avait que deux issues, exécuter autrement que demandé, ce qu'on ne
 * fait pas, ou clore, ce qui perd l'ordre.
 *
 * Deux règles tiennent l'objet :
 *
 * 1. **L'acceptation du client engage, pas le clic du desk.** C'est une offre
 *    que nous faisons ; son oui la transforme en ordre. L'état attend donc.
 * 2. **Une proposition a une fin.** Un prix ne tient pas, et une offre sans
 *    échéance est une position ouverte qu'on a oubliée.
 */
export interface Counter {
  /** La quantité proposée, quand elle change. */
  amount?: number;
  /** Le prix proposé : FCFA par action, ou % du nominal. */
  limitPrice?: number;
  /** La phrase du desk : c'est elle que le client lit en premier. */
  note?: string;
  /** Au-delà, elle ne vaut plus. */
  until: string;
  by: string;
  at: string;
}

export const counterLapsed = (c: Counter, now = new Date()): boolean => new Date(c.until).getTime() <= now.getTime();

/** L'unité dans laquelle cette ligne se commande : la même que celle du formulaire. */
export const counterUnit = (o: Offer): string => (o.kind === "FONDS" ? "parts" : o.kind === "MARCHE" ? (o.instrument === "obligation" ? "titres" : "actions") : o.kind === "RACHAT" ? "titres" : "FCFA");

/** Le prix, dit comme la ligne le cote. */
export const counterPriceText = (o: Offer, p: number): string => (o.instrument === "obligation" ? `${fmtPrice(p)} du nominal` : `${fmt(p)} FCFA`);

/**
 * Ce qui change, en une phrase, pour le client comme pour le desk.
 *
 * On ne nomme que ce qui bouge : répéter les conditions inchangées noierait la
 * seule information qui compte.
 */
export function counterTerms(c: Counter, i: Intent, o: Offer): string {
  const bits: string[] = [];
  if (c.amount != null && c.amount !== i.amount) bits.push(`${fmt(c.amount)} ${counterUnit(o)} au lieu de ${i.amount != null ? fmt(i.amount) : "—"}`);
  if (c.limitPrice != null && c.limitPrice !== i.limitPrice) bits.push(`${counterPriceText(o, c.limitPrice)}${i.limitPrice != null ? ` au lieu de ${counterPriceText(o, i.limitPrice)}` : ""}`);
  return bits.join(" · ");
}

/** Ce que le client lit dans son message, et relit sur la page où il décide. */
export function counterText(c: Counter, i: Intent, o: Offer): string {
  const terms = counterTerms(c, i, o);
  const when = fmtDateTime(c.until);
  const head = c.note?.trim() ? `${c.note.trim()} ` : "";
  return `${head}Nous vous proposons ${terms || "d'autres conditions"} sur ${o.title}. Cette proposition vaut jusqu'au ${when} ; passé ce délai votre ordre ${i.ref} revient tel qu'il était, et nous en reparlons.`;
}

/** Par défaut, une proposition vaut deux jours : le temps de lire et de répondre, pas celui d'oublier. */
export function defaultUntil(o: Offer, now = new Date()): string {
  const twoDays = new Date(now.getTime() + 48 * 3600 * 1000);
  // Jamais au-delà de la clôture de la ligne : une proposition ne survit pas à ce qu'elle porte.
  const close = o.deadlineAt ? new Date(o.deadlineAt) : undefined;
  const at = close && close.getTime() < twoDays.getTime() ? close : twoDays;
  return at.toISOString();
}

/** La date telle qu'un champ « datetime-local » la veut. */
export const forInput = (iso: string): string => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const untilText = (c: Counter): string => fmtDate(c.until);
