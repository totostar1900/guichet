"use server";

import { requireSession } from "@/lib/auth";
import { noter } from "@/lib/journal";

/**
 * Le code du compte, côté serveur : le poser (ou le remplacer), et lever le verrou avec lui. Voir `poserCodeDuCompte` pour ce que le code est, et n'est pas.
 */

export async function poserLeCode(pin: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const s = await requireSession("/");
  const { poserCodeDuCompte } = await import("@/lib/auth/devices");
  const r = await poserCodeDuCompte(s, pin);
  if (r.ok) await noter("securite.code.compte.pose", { detail: "code du compte" });
  return r;
}

export async function verifierLeCode(pin: string): Promise<{ ok: true } | { ok: false; error: string; bloque?: boolean; left?: number }> {
  const s = await requireSession("/");
  const { verifierCodeDuCompte } = await import("@/lib/auth/devices");
  const r = await verifierCodeDuCompte(s, pin);
  /* Les échecs comptent, la réussite ordinaire non : un verrou levé trente fois par jour n'est pas un événement. Le cinquième échec, lui, en est un. */
  if (!r.ok && r.bloque) await noter("securite.verrou.bloque", { detail: "cinq codes faux" });
  return r;
}

/**
 * Changer le code : l'ANCIEN d'abord, vérifié ici même (la page l'a déjà fait pour montrer le pas suivant, le serveur ne s'y fie pas). Cinq faux, et l'on est déconnecté comme au verrou.
 */
export async function modifierLeCode(actuel: string, nouveau: string): Promise<{ ok: true } | { ok: false; error: string; bloque?: boolean; left?: number }> {
  const s = await requireSession("/");
  const { aUnCodeDuCompte, poserCodeDuCompte, verifierCodeDuCompte } = await import("@/lib/auth/devices");
  if (await aUnCodeDuCompte(s.userId)) {
    const v = await verifierCodeDuCompte(s, actuel);
    if (!v.ok) {
      if (v.bloque) await noter("securite.verrou.bloque", { detail: "cinq codes faux" });
      return v;
    }
  }
  const r = await poserCodeDuCompte(s, nouveau);
  if (r.ok) await noter("securite.code.compte.pose", { detail: "code du compte modifié" });
  return r;
}
