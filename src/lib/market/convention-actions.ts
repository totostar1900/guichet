"use server";

import { cookies } from "next/headers";
import { CONVENTION_COOKIE } from "./convention";

/**
 * Le choix de convention, posé par le serveur pour un an.
 *
 * La règle et le lecteur vivent dans `convention.ts` ; ce fichier ne porte
 * que le geste, parce qu'un fichier « use server » n'exporte que des actions.
 */
const AN = 60 * 60 * 24 * 365;

export async function choisirConvention(form: FormData): Promise<void> {
  const v = String(form.get("convention") ?? "");
  const jar = await cookies();
  /* Le défaut ne s'écrit pas : un témoin absent vaut « guichet », et le
     retirer est la façon de revenir à la mesure de la maison. */
  if (v === "beac") jar.set(CONVENTION_COOKIE, "beac", { path: "/", maxAge: AN, sameSite: "lax" });
  else jar.delete(CONVENTION_COOKIE);
}
