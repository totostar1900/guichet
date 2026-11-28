import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { joursEntre, resumeDeLaSerie, serieJournaliere, SEUIL_DE_PORTEURS, type FondsDuCalcul } from "@/lib/domain/gestionnaire";

/* L'ESPACE GESTIONNAIRE (28 novembre 2026) : séries journalières par fonds ou au global, porteurs masqués sous cinq, aucune donnée de commissionnement. */
const m = (jour: string, porteur: string, units: number) => ({ jour, porteur, units });
const fonds = (mouvements: ReturnType<typeof m>[], vl = 10_000): FondsDuCalcul => ({ mouvements, navs: [{ navDate: "2026-11-01", nav: vl }] });

describe("la série journalière", () => {
  it("un point par jour, de la première date à la dernière incluses", () => {
    expect(joursEntre("2026-11-28", "2026-12-01")).toEqual(["2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01"]);
  });
  it("l'encours du jour est les parts détenues × la dernière valeur connue ; un jour sans valeur n'est pas valorisé", () => {
    const f: FondsDuCalcul = { mouvements: [m("2026-11-03", "a", 10)], navs: [{ navDate: "2026-11-05", nav: 10_000 }] };
    const s = serieJournaliere([f], "2026-11-03", "2026-11-06");
    expect(s.map((p) => p.encours)).toEqual([0, 0, 100_000, 100_000]);
  });
  it("souscriptions et rachats du jour sont aux parts × la valeur du jour", () => {
    const s = serieJournaliere([fonds([m("2026-11-10", "a", 10), m("2026-11-12", "a", -4)])], "2026-11-10", "2026-11-12");
    expect(s.map((p) => p.souscriptions)).toEqual([100_000, 0, 0]);
    expect(s.map((p) => p.rachats)).toEqual([0, 0, 40_000]);
    expect(s[2].encours).toBe(60_000);
  });
  it("au global, l'encours et les flux s'additionnent et un porteur de deux fonds ne compte qu'une fois", () => {
    const a = fonds([m("2026-11-10", "p1", 10), ...[2, 3, 4, 5].map((k) => m("2026-11-10", `p${k}`, 1))]);
    const b = fonds([m("2026-11-10", "p1", 5), m("2026-11-10", "p6", 1)], 2_000);
    const [pt] = serieJournaliere([a, b], "2026-11-10", "2026-11-10");
    expect(pt.encours).toBe(14 * 10_000 + 6 * 2_000);
    expect(pt.porteurs).toBe(6);
    expect(pt.vl).toBeUndefined();
  });
  it("un fonds seul porte sa valeur liquidative", () => {
    expect(serieJournaliere([fonds([m("2026-11-10", "a", 1)])], "2026-11-10", "2026-11-10")[0].vl).toBe(10_000);
  });
});

describe("les porteurs sous cinq ne sont pas dits", () => {
  const avec = (n: number) => serieJournaliere([fonds(Array.from({ length: n }, (_, k) => m("2026-11-10", `p${k}`, 1)))], "2026-11-10", "2026-11-10")[0].porteurs;
  it("de un à quatre : null ; zéro reste zéro ; cinq et plus sont dits", () => {
    expect(SEUIL_DE_PORTEURS).toBe(5);
    expect(avec(0)).toBe(0);
    for (const n of [1, 2, 3, 4]) expect(avec(n), String(n)).toBeNull();
    expect(avec(5)).toBe(5);
    expect(avec(12)).toBe(12);
  });
  it("un porteur qui a tout racheté n'est plus un porteur", () => {
    const s = serieJournaliere([fonds([...[1, 2, 3, 4, 5].map((k) => m("2026-11-10", `p${k}`, 2)), m("2026-11-11", "p1", -2)])], "2026-11-10", "2026-11-11");
    expect(s.map((p) => p.porteurs)).toEqual([5, null]);
  });
});

describe("le résumé", () => {
  it("l'encours du dernier jour, les flux de la période, la variation depuis le premier jour", () => {
    const s = serieJournaliere([fonds([m("2026-11-10", "a", 10), m("2026-11-12", "a", -4)])], "2026-11-10", "2026-11-12");
    expect(resumeDeLaSerie(s)).toMatchObject({ encours: 60_000, souscriptions: 100_000, rachats: 40_000, variationEncours: -40_000 });
  });
});

describe("le résumé ne transforme pas « non dit » en zéro", () => {
  it("avec trois porteurs le résumé dit null, et avec aucune série il dit zéro", () => {
    const s = serieJournaliere([fonds([m("2026-11-10", "a", 1), m("2026-11-10", "b", 1), m("2026-11-10", "c", 1)])], "2026-11-10", "2026-11-10");
    expect(resumeDeLaSerie(s).porteurs).toBeNull();
    expect(resumeDeLaSerie([]).porteurs).toBe(0);
  });
});

describe("ce que le gestionnaire ne voit jamais", () => {
  it("le domaine ne lit ni le commissionnement, ni un nom de client, ni un dépôt", () => {
    const d = readFileSync("src/lib/domain/gestionnaire.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(d).not.toMatch(/commissionnement|retrocessionDuMois|recetteDeTiers|from "@\/lib\/(data|auth|policy)/);
    expect(d).not.toMatch(/name|email|phone/i);
  });
});

describe("la porte : un accès posé par la direction, rien d'autre", () => {
  const lire = (f: string) => readFileSync(f, "utf8");
  it("inviter et retirer ne passent que par la direction, et sont tracés", () => {
    const a = lire("src/app/desk/gestionnaires/actions.ts");
    expect((a.match(/requireResponsable\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(a).toMatch(/audit\("gestionnaire\.invite|audit\(avant \? "gestionnaire\.acces_modifie"/);
    expect(a).toMatch(/audit\("gestionnaire\.retire"/);
  });
  it("l'espace demande une session et un accès actif ; sans accès, retour à l'accueil du client", () => {
    expect(lire("src/app/gestion/layout.tsx")).toMatch(/requireGestionnaire\(\)/);
    const d = lire("src/lib/gestionnaire-donnees.ts");
    expect(d).toMatch(/if \(!acces\) redirect\(/);
    expect(d).toMatch(/mfaRequired\(\)/);
  });
  it("les données du gestionnaire ne lisent jamais le commissionnement ni ce que la maison reçoit", () => {
    const d = lire("src/lib/gestionnaire-donnees.ts").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(d).not.toMatch(/commissionnement|retrocession|recetteDeTiers|trailer/i);
    for (const f of ["src/components/gestion/TableauDeBord.tsx", "src/app/gestion/page.tsx"]) expect(lire(f).replace(/\/\*[\s\S]*?\*\//g, ""), f).not.toMatch(/commissionnement|clientName|clientId|email\b/i);
  });
  it("la démonstration n'ouvre l'espace qu'en mode démonstration", () => {
    expect(lire("src/lib/gestionnaire-donnees.ts")).toMatch(/authMode\(\) === "dev" && cle === EMAIL_DE_DEMONSTRATION/);
    expect(lire("src/app/connexion/actions.ts")).toMatch(/export async function devLoginGestionnaire[\s\S]{0,120}if \(authMode\(\) !== "dev"\) return;/);
  });
  it("l'espace a sa mise en page à lui et son hôte optionnel", () => {
    expect(lire("src/app/layout.tsx")).toMatch(/x-chemin[\s\S]{0,200}\/gestion/);
    expect(lire("src/proxy.ts")).toMatch(/gestionSplit\(\)/);
    expect(lire("src/lib/hosts.ts")).toMatch(/export const isGestionPath = \(path: string\): boolean => path === "\/gestion" \|\| path\.startsWith\("\/gestion\/"\)/);
  });
});
