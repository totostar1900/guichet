import "server-only";
import type { IntentState } from "@/lib/domain/types";
import { fill } from "./passages-catalog";
import { FRAME, messagesFor } from "./messages-catalog";
import { resolvePassages } from "./passages";

/** Un message préparé, prêt à être relu : le texte en vigueur, rempli avec l'ordre. */
export interface PreparedMessage {
  key: string;
  label: string;
  hint: string;
  /** Ce que l'opérateur doit préciser ; sans quoi le message ne part pas. */
  askNote?: string;
  /** Le texte, {precision} laissé en place : c'est l'écran qui le remplace, à mesure. */
  text: string;
}

/**
 * Les messages préparés pour un ordre donné, dans l'ordre où son état les
 * appelle, avec les mots en vigueur au Référentiel plutôt que ceux du code
 * lorsque le desk les a réécrits.
 */
export async function preparedMessages(state: IntentState, vars: Record<string, string | undefined>, lang: "fr" | "en" = "fr"): Promise<PreparedMessage[]> {
  const wording = await resolvePassages("message", lang);
  const frame = wording.text[FRAME.key] ?? FRAME[lang];
  return messagesFor(state).map((m) => ({
    key: m.key,
    label: m.label,
    hint: m.hint,
    askNote: m.askNote,
    // Le corps d'abord, puis l'enveloppe autour : {precision} traverse les deux
    // sans être remplie, parce qu'elle appartient à l'opérateur, pas à l'ordre.
    text: fill(frame, { ...vars, precision: undefined, corps: fill(wording.text[m.key] ?? m[lang], { ...vars, precision: undefined }) }),
  }));
}
