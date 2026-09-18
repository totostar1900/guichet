"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLang, LANG_COOKIE } from "./core";

/** The language switch: a cookie for a year, then back to the same page. */
export async function setLangAction(form: FormData): Promise<void> {
  const lang = form.get("lang");
  const back = String(form.get("back") ?? "/");
  if (isLang(lang)) {
    const jar = await cookies();
    jar.set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  redirect(back.startsWith("/") ? back : "/");
}
