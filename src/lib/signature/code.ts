import "server-only";
import { createHash } from "node:crypto";

/**
 * LA SIGNATURE PAR CODE À USAGE UNIQUE, À UN SEUL ENDROIT.
 *
 * Elle est née pour la convention d'ouverture, et elle sert maintenant aussi à
 * signer un ordre. Deux copies d'un mécanisme de signature, c'est deux
 * politiques de validité, deux comptages d'essais et deux façons de se tromper :
 * elle vit donc ici, avec ses trois durées et sa vérification.
 *
 * Ce qu'elle garantit, et pourquoi chaque borne existe :
 *   dix minutes  : au-delà, un code lu sur un écran resté ouvert ne vaut plus ;
 *   cinq essais  : au-delà, le code est brûlé, pas la patience du client ;
 *   quarante-cinq secondes avant un renvoi : sans quoi un doigt impatient vide
 *                  le quota du fournisseur et déclenche ses propres limites.
 */
export const VALIDITE_MS = 10 * 60_000;
export const DELAI_RENVOI_MS = 45_000;
export const ESSAIS_MAX = 5;

/** Le code en clair ne quitte jamais le serveur : on n'en garde que l'empreinte. */
export const empreinte = (code: string): string => createHash("sha256").update(`${process.env.AUTH_SECRET ?? "guichet"}:${code}`).digest("hex");

export const nouveauCode = (): string => String(Math.floor(100000 + Math.random() * 900000));

/** Ce qu'une ligne garde du code en cours, quelle que soit la table qui le porte. */
export interface CodeEnCours {
  hash?: string;
  at?: string;
  tries?: number;
  to?: string;
}

export type Verdict = { ok: true } | { ok: false; erreur: string; essais: number };

/**
 * Le code saisi vaut-il celui qui est parti ?
 *
 * Rend aussi le nouveau compte d'essais, pour que l'appelant l'écrive là où il
 * range son code : ce module ne connaît aucune table.
 */
export function verifier(saisi: string, c: CodeEnCours): Verdict {
  const code = String(saisi ?? "").replace(/\s/g, "");
  const essais = c.tries ?? 0;
  if (!c.hash || !c.at || Date.now() - new Date(c.at).getTime() > VALIDITE_MS) return { ok: false, erreur: "Code expiré : demandez-en un nouveau.", essais };
  if (essais >= ESSAIS_MAX) return { ok: false, erreur: "Trop d'essais sur ce code : demandez-en un nouveau.", essais };
  if (empreinte(code) !== c.hash) {
    const reste = ESSAIS_MAX - essais - 1;
    return { ok: false, erreur: reste > 0 ? `Code incorrect : ${reste} essai${reste > 1 ? "s" : ""} avant de devoir en demander un nouveau.` : "Code incorrect : ce code est épuisé, demandez-en un nouveau.", essais: essais + 1 };
  }
  return { ok: true };
}

/** Un code vient-il de partir ? Rend les secondes à attendre, zéro si la voie est libre. */
export function attenteAvantRenvoi(at?: string): number {
  if (!at) return 0;
  const depuis = Date.now() - new Date(at).getTime();
  return depuis < DELAI_RENVOI_MS ? Math.ceil((DELAI_RENVOI_MS - depuis) / 1000) : 0;
}
