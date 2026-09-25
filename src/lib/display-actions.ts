"use server";

import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { isLang, LANG_COOKIE, type Lang } from "@/i18n/core";
import { P_COOKIE, PALETTES, T_COOKIE, THEMES, YEAR } from "@/lib/palette";

/**
 * L'apparence, enregistrée par le serveur et non par le navigateur.
 *
 * La palette et le thème vivaient dans `localStorage`, et deux témoins écrits
 * par `document.cookie` les suivaient pour que le serveur puisse timbrer
 * `<html>` avant la première peinture. Sur iOS, Safari plafonne à **sept
 * jours** tout témoin écrit par un script, et efface le `localStorage` d'un
 * site qu'on n'a pas ouvert depuis sept jours. Les deux copies du choix
 * expiraient donc ensemble, et l'application repartait en « auto », c'est-à-dire
 * clair : « l'application se ferme sur fond sombre et se rouvre en clair ».
 *
 * Un témoin posé par le serveur n'est pas plafonné de la sorte. C'est ce que
 * la langue fait depuis toujours (`src/i18n/actions.ts`) ; la palette et le
 * thème le font désormais aussi.
 *
 * Et pour qui est connecté, le choix s'écrit en plus dans son profil : il suit
 * alors le compte d'un appareil à l'autre, et survit à n'importe quel effacement
 * du stockage. Le témoin reste la source que le serveur lit à chaque rendu,
 * parce qu'il faut timbrer `<html>` avant d'avoir lu quoi que ce soit en base.
 */
export interface Display {
  palette?: string;
  theme?: string;
  lang?: Lang;
}

const okPalette = (v: unknown): v is string => typeof v === "string" && PALETTES.some((p) => p.key === v);
const okTheme = (v: unknown): v is string => typeof v === "string" && (THEMES as readonly string[]).includes(v);

/** Pose les témoins pour un an, et garde le choix au compte quand il y en a un. */
export async function saveDisplay(d: Display): Promise<void> {
  const jar = await cookies();
  const opts = { path: "/", maxAge: YEAR, sameSite: "lax" as const };
  if (okPalette(d.palette)) jar.set(P_COOKIE, d.palette, opts);
  if (okTheme(d.theme)) jar.set(T_COOKIE, d.theme, opts);
  if (isLang(d.lang)) jar.set(LANG_COOKIE, d.lang, opts);

  const session = await getSession();
  if (!session) return;
  try {
    const prefs = await repo().getPrefs(session.userId);
    await repo().setPrefs(session.userId, {
      ...prefs,
      ...(okPalette(d.palette) ? { palette: d.palette } : {}),
      ...(okTheme(d.theme) ? { theme: d.theme } : {}),
      ...(isLang(d.lang) ? { lang: d.lang } : {}),
    });
  } catch {
    // Le compte n'a pas pu être écrit : le témoin tient déjà le choix sur cet
    // appareil, et l'apparence n'est pas une raison de faire échouer une page.
  }
}
