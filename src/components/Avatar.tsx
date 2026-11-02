import type { Country, Offer } from "@/lib/domain/types";
import styles from "./Avatar.module.css";

/**
 * LE ROND QUI DIT DE QUI ON PARLE (Accueil, 2 novembre 2026).
 *
 * Une ligne du Trésor porte le drapeau de son pays ; toute autre ligne, le
 * monogramme de son émetteur. Rien d'autre : pas de logo, pas de photo — la
 * maison n'a pas le droit d'en inventer, et un rond vide serait un trou.
 */
const ISO: Record<Country, string> = { RCA: "CF", Congo: "CG", Cameroun: "CM", Gabon: "GA", Tchad: "TD", "Guinée éq.": "GQ" };

/** Le drapeau d'un pays, par ses deux lettres (indicateurs régionaux). */
export function drapeauDe(pays: Country): string {
  return [...ISO[pays]].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
}

/** Le monogramme : deux lettres au plus, tirées du premier mot utile du nom. */
export function monogrammeDe(nom: string): string {
  const mots = nom.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter((m) => m.length > 1 || /\d/.test(m));
  return (mots[0] ?? nom).slice(0, 2).toUpperCase();
}

/** Ce que l'avatar d'une offre montre : le drapeau pour le Trésor, sinon le monogramme de l'émetteur. */
export function avatarDe(o: Pick<Offer, "issuer" | "country" | "title">): { drapeau?: string; mono: string } {
  return /tr[ée]sor/i.test(o.issuer) ? { drapeau: drapeauDe(o.country), mono: "" } : { mono: monogrammeDe(o.issuer || o.title) };
}

export function Avatar({ offre }: { offre: Pick<Offer, "issuer" | "country" | "title"> }) {
  const a = avatarDe(offre);
  return (
    <span className={styles.rond} aria-hidden="true">
      {a.drapeau ?? a.mono}
    </span>
  );
}
