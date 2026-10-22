import { RACINE } from "./racine";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { estPublic } from "@/lib/porte";

/**
 * LE SITEMAP NE PROPOSE QUE CE QUE LA PORTE OUVRE.
 *
 * Mesuré le 22 octobre 2026 sur la production : « /sitemap.xml » était dans
 * la liste blanche de la porte et rendait 404, sur le déploiement du jour
 * comme sur le précédent. Une liste nommait une page qui n'existait pas, et
 * rien ne le disait.
 *
 * TROIS LISTES, et chacune est plus étroite que la précédente :
 *   `porte.ts`    ce qui se LIT sans compte,
 *   `robots.ts`   ce qu'un moteur a le DROIT de lire,
 *   `sitemap.ts`  ce qu'on lui PROPOSE.
 *
 * Le contrôle va dans UN SEUL SENS. Une adresse proposée doit être ouverte
 * ET autorisée. L'inverse n'est pas exigé : « /offres/<id> » reste lisible
 * pour qu'un lien partagé continue de travailler, sans que le catalogue des
 * identifiants paraisse dans un moteur.
 */
const SRC = `${RACINE}/src`;

/** Les préfixes que robots.txt rouvre, lus dans le fichier plutôt que recopiés. */
const autorisesParRobots = (): string[] => {
  const src = readFileSync(`${SRC}/app/robots.ts`, "utf8");
  const bloc = src.match(/allow:\s*\[([^\]]+)\]/)?.[1];
  expect(bloc, "robots.ts ne porte plus de liste « allow » reconnaissable").toBeTruthy();
  return [...bloc!.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
};

const permisParRobots = (chemin: string, regles: string[]): boolean =>
  regles.some((r) => (r.endsWith("$") ? chemin === r.slice(0, -1) : chemin === r || chemin.startsWith(r) || `${chemin}/` === r));

/** Le sitemap, rendu sur l'hôte du Guichet, sans toucher à la base. */
const rendre = async (hote: string): Promise<string[]> => {
  vi.resetModules();
  /* `DESK_HOST` est lu au chargement du module : la poser AVANT l'import, sinon
     l'hôte du desk passe pour un hôte client et le contrôle devient complaisant. */
  vi.stubEnv("NEXT_PUBLIC_DESK_HOST", "desk.purposecapital.africa");
  vi.doMock("next/headers", () => ({ headers: async () => new Map([["host", hote]]) }));
  /* Les deux lectures sont neutralisées : ce contrôle porte sur les adresses,
     pas sur le contenu du référentiel ni sur l'indice. Le repli du sitemap est
     mesuré à part, juste en dessous. */
  vi.doMock("@/lib/reference", () => ({ loadLessons: async () => [{ key: "une-lecon" }, { key: "une-autre" }] }));
  vi.doMock("@/lib/market/index-data", () => ({ indexPageData: async () => ({ stats: { points: [{ date: "2026-02-10" }] } }) }));
  vi.doMock("@/lib/market/index-quarter", () => ({ quarters: () => [{ key: "2026-T1" }] }));
  const { default: sitemap } = await import("@/app/sitemap");
  return (await sitemap()).map((e) => new URL(e.url).pathname);
};

describe("le sitemap s'accorde avec la porte et avec robots.txt", () => {
  it("chaque adresse proposée se lit sans compte", async () => {
    const chemins = await rendre("guichet.purposecapital.africa");
    const fermees = chemins.filter((p) => !estPublic(p));
    expect(fermees, `le sitemap propose des adresses que la porte ferme :\n  ${fermees.join("\n  ")}`).toEqual([]);
  });

  it("chaque adresse proposée est autorisée par robots.txt", async () => {
    const regles = autorisesParRobots();
    const chemins = await rendre("guichet.purposecapital.africa");
    const interdites = chemins.filter((p) => !permisParRobots(p, regles));
    expect(interdites, `robots.txt interdit ces adresses que le sitemap propose :\n  ${interdites.join("\n  ")}`).toEqual([]);
  });

  it("le socle et les pages tirées des données y sont", async () => {
    const chemins = await rendre("guichet.purposecapital.africa");
    for (const p of ["/", "/info", "/info/aide", "/indice/notes", "/ouvrir-un-compte"]) expect(chemins).toContain(p);
    expect(chemins, "une leçon du référentiel doit paraître").toContain("/info/une-lecon");
    expect(chemins, "une note publiée doit paraître, en minuscules").toContain("/indice/note/2026-t1");
  });

  it("aucune adresse n'est écrite deux fois", async () => {
    const chemins = await rendre("guichet.purposecapital.africa");
    expect([...new Set(chemins)]).toEqual(chemins);
  });

  it("le desk ne propose rien : son robots.txt ferme tout", async () => {
    expect(await rendre("desk.purposecapital.africa")).toEqual([]);
  });

  it("une lecture en panne laisse le socle, elle n'écroule pas l'adresse", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DESK_HOST", "desk.purposecapital.africa");
    vi.doMock("next/headers", () => ({ headers: async () => new Map([["host", "guichet.purposecapital.africa"]]) }));
    vi.doMock("@/lib/reference", () => ({ loadLessons: async () => { throw new Error("base injoignable"); } }));
    vi.doMock("@/lib/market/index-data", () => ({ indexPageData: async () => { throw new Error("base injoignable"); } }));
    const { default: sitemap } = await import("@/app/sitemap");
    const chemins = (await sitemap()).map((e) => new URL(e.url).pathname);
    expect(chemins).toContain("/");
    expect(chemins).toContain("/indice/notes");
    expect(chemins.some((p) => p.startsWith("/indice/note/"))).toBe(false);
  });

  it("la porte nomme « /sitemap.xml », et le fichier existe", () => {
    /* Le défaut d'origine : la liste nommait une page absente. Le contrôle
       part de la porte, pas du dossier, pour qu'il tombe dans les deux sens. */
    expect(readFileSync(`${SRC}/lib/porte.ts`, "utf8")).toContain("/sitemap.xml");
    expect(() => readFileSync(`${SRC}/app/sitemap.ts`, "utf8")).not.toThrow();
  });
});
