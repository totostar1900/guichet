import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { isLang, LANG_COOKIE, translator, type Lang, type T } from "./core";

/** The viewer's language: the cookie set by the switch, else the browser's preference, else French. */
export const getLang = cache(async (): Promise<Lang> => {
  const jar = await cookies();
  const c = jar.get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^en\b/i.test(accept.split(",")[0] ?? "") ? "en" : "fr";
});

export const getT = cache(async (): Promise<T> => translator(await getLang()));
