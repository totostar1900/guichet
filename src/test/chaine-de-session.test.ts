import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { memoRepo } from "@/lib/data/memo";
import type { Repository } from "@/lib/data/repository";

const lire = (p: string) => fs.readFileSync(path.join(__dirname, "../..", p), "utf8");

/**
 * LA CHAÎNE DE LECTURES AVANT UNE PAGE (11 novembre 2026, point 2 de la lenteur, mesuré par simulation).
 *
 * Avant la première ligne d'une page : la fiche du client (la session), puis les préférences (la langue), puis la page. La langue n'a besoin que de la PERSONNE qui se présente, pas du
 * dossier : ses préférences partent avec la recherche du dossier. Et deux lectures de l'accès nommé, non classées, vidaient la mémoire de la requête, donc le dossier était relu.
 */
describe("la mémoire de la requête ne se vide pas pour l'accès nommé", () => {
  it("garde le dossier déjà lu quand on lit l'accès d'une personne ou son canal", async () => {
    const appels: string[] = [];
    const faux = new Proxy({} as Record<string, unknown>, {
      get: (_t, prop) => (prop === "then" ? undefined : async (...args: unknown[]) => (appels.push(`${String(prop)}(${JSON.stringify(args)})`), { prop })),
    }) as unknown as Repository;
    const sac = new Map<string, Promise<unknown>>();
    const r = memoRepo(faux, () => sac);
    await r.getClientFileByUser("u1");
    await r.accesDeLaPersonne("u1");
    await r.accesParCanal("email:a@b.c");
    await r.getClientFileByUser("u1");
    expect(appels.filter((a) => a.startsWith("getClientFileByUser")), "le dossier est relu : une lecture de l'accès nommé a vidé la mémoire de la requête").toHaveLength(1);
  });
  it("vide toujours la mémoire sur une écriture", async () => {
    const appels: string[] = [];
    const faux = new Proxy({} as Record<string, unknown>, { get: (_t, prop) => (prop === "then" ? undefined : async (...args: unknown[]) => (appels.push(`${String(prop)}(${JSON.stringify(args)})`), { prop })) }) as unknown as Repository;
    const r = memoRepo(faux, () => new Map());
    await r.getClientFileByUser("u1");
    await r.lierAcces("a", "u1");
    await r.getClientFileByUser("u1");
    expect(appels.filter((a) => a.startsWith("getClientFileByUser")), "une écriture ne vide plus la mémoire : on lirait du périmé").toHaveLength(2);
  });
});

describe("la langue du compte part avec la recherche du dossier", () => {
  const langue = () => lire("src/i18n/server.ts");
  const auth = () => lire("src/lib/auth/index.ts");
  it("lit les préférences de la personne qui se présente AVANT d'attendre la session, et relit celles du compte quand l'accès nommé en change", () => {
    const s = langue();
    expect(s, "la langue ne part plus de l'authentification nue").toMatch(/const base = await lireLaSessionDeBase\(\);/);
    expect(s, "les préférences ne partent plus avant la session").toMatch(/const enParallele = repo\(\)\s*\.getPrefs\(base\.userId\)\s*\.catch\(\(\) => undefined\);\s*const s = await getSession\(\);/);
    expect(s, "le compte d'un accès nommé n'a plus ses propres préférences").toMatch(/s\.userId === base\.userId \? await enParallele : await repo\(\)\.getPrefs\(s\.userId\)/);
  });
  it("lit l'authentification nue une fois par requête, et la session en travaille une copie", () => {
    const a = auth();
    expect(a, "l'authentification nue n'est plus gardée par requête").toMatch(/export const lireLaSessionDeBase = cache\(async \(\): Promise<Session \| null> => \{/);
    expect(a, "la session écrit de nouveau dans la session de base").toMatch(/let s: Session \| null = base \? \{ \.\.\.base \} : null;/);
  });
});
