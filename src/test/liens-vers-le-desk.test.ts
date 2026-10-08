import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deskHostServes } from "@/lib/hosts";

/**
 * UNE SURFACE CLIENT NE RENVOIE PAS VERS LE DESK.
 *
 * Depuis que le desk a son propre hôte, le proxy envoie toute adresse en
 * « /desk/ » vers desk.purposecapital.africa, et le layout du desk y refoule un
 * client vers le site client. Un lien « /desk/… » posé sur une page client est
 * donc un cul-de-sac silencieux : rien ne casse, la page s'ouvre ailleurs.
 *
 * Mesuré le 8 octobre 2026 : « Mes documents » listait chaque pièce avec un lien
 * « /desk/documents/pdf/… ». Le client ne pouvait ouvrir aucun de ses relevés,
 * aucun de ses avis, ni la convention qu'on lui demandait d'accepter. Le
 * contrôle d'accès de la route prévoyait pourtant le client depuis le début :
 * le code disait oui, l'adresse disait non.
 *
 * Les fichiers servis aux deux publics vivent sous « /api », que les deux hôtes
 * servent (DESK_HOST_ALLOW), et gardent leur propre garde.
 */
const SURFACES_CLIENT = ["src/app/moi", "src/app/ouvrir-un-compte", "src/app/offres", "src/app/trader", "src/app/indice", "src/app/titres", "src/app/fonds", "src/app/comparer", "src/app/societes"];

function fichiers(racine: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".tsx") || p.endsWith(".ts")) out.push(p);
    }
  };
  walk(racine);
  return out;
}

describe("les pages du client ne renvoient pas vers le desk", () => {
  it("aucun href vers /desk sur une surface client", () => {
    const fautifs: string[] = [];
    for (const racine of SURFACES_CLIENT) {
      for (const f of fichiers(racine)) {
        const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
        for (const m of src.matchAll(/href[=:]\s*[{]?\s*[`"'](\/desk[^`"']*)/g)) {
          fautifs.push(`${f.replace(/\\/g, "/")} -> ${m[1]}`);
        }
      }
    }
    expect(fautifs, "servez le fichier depuis /api, que les deux hôtes servent").toEqual([]);
  });

  /* revalidatePath("/desk/…") depuis une action client est légitime et reste :
     c'est le cache du desk qu'on rafraîchit, pas une navigation du client. */
  it("les fichiers partagés vivent bien à une adresse que les deux hôtes servent", () => {
    expect(deskHostServes("/api/documents/abc")).toBe(true);
    expect(deskHostServes("/api/documents/convention-modele")).toBe(true);
    // Et le contre-exemple : l'ancienne adresse n'était servie que par un hôte.
    expect(deskHostServes("/moi/documents")).toBe(false);
  });
});
