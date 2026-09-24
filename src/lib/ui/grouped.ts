import type { ChangeEvent } from "react";

/**
 * Un champ de montant qui sépare les milliers pendant qu'on tape.
 *
 * Les champs groupaient au départ du curseur seulement : on tapait
 * « 10000000 » et on ne voyait « 10 000 000 » qu'après avoir quitté la case.
 * Or c'est pendant la frappe qu'on a besoin de compter les zéros, et c'est là
 * qu'on se trompe d'un facteur dix.
 *
 * Le piège, et la raison pour laquelle ce n'est pas trois lignes : reformater
 * à chaque touche remplace la valeur du champ, et le curseur saute à la fin.
 * On compte donc les chiffres qui précèdent le curseur, on reformate, puis on
 * replace le curseur après le même nombre de chiffres. Le lecteur qui corrige
 * un zéro au milieu de son million reste où il était.
 *
 * L'espace posée est l'espace fine insécable, celle que « Intl » emploie pour
 * le français : les analyseurs de l'application retirent tous les caractères
 * qui ne sont pas des chiffres, donc rien ne dépend de ce choix.
 */
const THIN = " ";

/** « 10000000 » → « 10 000 000 », sans passer par un nombre (aucune perte au-delà de 2^53). */
export const groupDigits = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, THIN);

/**
 * Le texte tapé, regroupé. Avec `decimals`, la partie décimale est laissée
 * telle quelle : des parts de fonds se saisissent au millième et se groupent
 * du seul côté entier.
 */
export function regroup(raw: string, decimals = false): string {
  if (!decimals) {
    const d = raw.replace(/\D/g, "");
    return d ? groupDigits(d) : "";
  }
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/\./g, ",");
  const i = cleaned.indexOf(",");
  const whole = (i < 0 ? cleaned : cleaned.slice(0, i)).replace(/\D/g, "");
  const frac = i < 0 ? "" : "," + cleaned.slice(i + 1).replace(/\D/g, "").slice(0, 3);
  if (!whole && !frac) return "";
  return groupDigits(whole) + frac;
}

/** Combien de caractères pour retrouver `n` chiffres depuis le début. */
function caretAfter(text: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i])) seen++;
    if (seen === n) return i + 1;
  }
  return text.length;
}

/**
 * Les gestionnaires à poser sur un champ de montant contrôlé :
 * `<input value={x} {...groupedInput(setX)} />`.
 */
export function groupedInput(set: (v: string) => void, opts: { decimals?: boolean } = {}) {
  return {
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const caret = el.selectionStart ?? el.value.length;
      const before = el.value.slice(0, caret).replace(/\D/g, "").length;
      const next = regroup(el.value, opts.decimals);
      set(next);
      // Après le rendu : le champ contrôlé vient de reprendre sa valeur, et
      // sans cela le curseur se retrouverait au bout à chaque touche.
      requestAnimationFrame(() => {
        const pos = caretAfter(next, before);
        try {
          el.setSelectionRange(pos, pos);
        } catch {
          // un champ qui ne porte pas de sélection : rien à replacer
        }
      });
    },
    onBlur: (e: ChangeEvent<HTMLInputElement>) => set(regroup(e.currentTarget.value, opts.decimals)),
  };
}
