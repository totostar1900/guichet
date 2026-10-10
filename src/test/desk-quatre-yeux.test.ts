import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * LES DEUX TROUS DES QUATRE YEUX DU DESK, RÉPARÉS LE 10 OCTOBRE 2026.
 *
 * Audités le 26 septembre, laissés en place sur décision de la maison, repris
 * aujourd'hui. Les deux se ressemblaient : un contrôle qui existait, que
 * personne ne voyait ne pas s'appliquer.
 *
 *   1. Le garde de l'entrée ne tirait jamais. Il lisait le nom du demandeur
 *      d'une PHRASE, avec une expression qui attendait un tiret cadratin
 *      quand la note s'écrivait avec deux points. Une personne seule pouvait
 *      demander une relecture, puis publier elle-même.
 *   2. Un responsable passait TOUJOURS seul. Avec un desk de deux
 *      responsables, la file d'approbations restait vide pour toujours.
 */
const desk = (role: Session["role"], name: string): Session => ({ userId: `u-${name}`, role, name, segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true });
const lire = (f: string) => readFileSync(f, "utf8");

describe("le garde de l'entrée lit un champ, pas une phrase", () => {
  it("le demandeur se lit de reviewBy", async () => {
    const { demandeurDeLaRevue } = await import("@/lib/desk/revue");
    expect(demandeurDeLaRevue({ reviewBy: "Awa" })).toBe("Awa");
  });

  it("et les brouillons d'avant le champ se lisent encore, deux points ou tiret", async () => {
    /* La phrase reste lisible pour les brouillons écrits avant le champ, et
       cette fois les deux ponctuations sont acceptées : c'est la maison qui a
       changé de tiret en cours de route, pas le desk. */
    const { demandeurDeLaRevue } = await import("@/lib/desk/revue");
    expect(demandeurDeLaRevue({ notes: "Revue demandée par Awa : vérifier le prix" })).toBe("Awa");
    expect(demandeurDeLaRevue({ notes: "Revue demandée par Awa — vérifier le prix" })).toBe("Awa");
    expect(demandeurDeLaRevue({ notes: "Renvoyé par Awa : à corriger" })).toBeUndefined();
    expect(demandeurDeLaRevue({})).toBeUndefined();
  });

  it("la demande de relecture écrit le champ, et la publication le lit", () => {
    const src = lire("src/app/desk/a-valider/actions.ts");
    expect(src).toMatch(/state: "en_revue", notes, reviewBy: desk\.name/);
    expect(src).toMatch(/item\.state === "en_revue" && demandeurDeLaRevue\(item\) === desk\.name/);
    // Le nom ne se relit plus d'une phrase pour décider : la phrase n'est qu'un repli.
    expect(src).not.toMatch(/reviewRequester/);
  });
});

describe("quatre yeux veut dire deux personnes, pas deux rôles", () => {
  const poser = (staff: { name: string; role: string }[]) => {
    vi.resetModules();
    vi.doMock("@/lib/data", () => ({ repo: () => ({ listStaff: async () => staff }) }));
    vi.doMock("@/lib/audit", () => ({ audit: async () => ({}) }));
  };

  it("un geste sans raison de sensibilité passe, et ne fait rien attendre", async () => {
    poser([]);
    const { quatreYeux } = await import("@/lib/desk/quatre-yeux");
    expect(await quatreYeux(desk("responsable", "Georges"), undefined)).toEqual({ quoi: "passe" });
    expect(await quatreYeux(desk("desk", "Awa"), null)).toEqual({ quoi: "passe" });
  });

  it("un opérateur ne passe jamais seul, même sans responsable en poste", async () => {
    /* Le contrôle manquant est alors un problème d'effectif, pas une
       permission : sa proposition attend, et c'est juste. */
    poser([]);
    const { quatreYeux } = await import("@/lib/desk/quatre-yeux");
    expect(await quatreYeux(desk("desk", "Awa"), "prix hors bornes")).toEqual({ quoi: "attend", raison: "prix hors bornes" });
  });

  it("un responsable attend quand un second responsable existe", async () => {
    /* C'est le trou réparé : il passait toujours seul, donc deux responsables
       se contrôlaient à zéro œil. */
    poser([
      { name: "Georges", role: "responsable" },
      { name: "Awa", role: "responsable" },
    ]);
    const { quatreYeux } = await import("@/lib/desk/quatre-yeux");
    expect(await quatreYeux(desk("responsable", "Georges"), "prix hors bornes")).toEqual({ quoi: "attend", raison: "prix hors bornes" });
  });

  it("et passe seul, en le disant, quand il est le seul responsable", async () => {
    poser([
      { name: "Georges", role: "responsable" },
      { name: "Awa", role: "desk" },
    ]);
    const { quatreYeux } = await import("@/lib/desk/quatre-yeux");
    const v = await quatreYeux(desk("responsable", "Georges"), "prix hors bornes");
    expect(v.quoi).toBe("seul");
    expect(v).toMatchObject({ motif: "aucun autre responsable en poste" });
  });
});

describe("les cinq gestes sensibles passent par la même porte", () => {
  const SITES = ["src/app/desk/a-valider/actions.ts", "src/app/desk/lignes/[id]/actions.ts", "src/app/desk/marche/actions.ts"];

  it("plus un seul site ne regarde le rôle pour sauter la file", () => {
    for (const f of SITES) expect(lire(f), f).not.toMatch(/reason && !isResponsable\(desk\)/);
  });

  it("et chacun appelle le verdict, puis dit le geste passé seul", () => {
    const sites = SITES.map(lire).join("\n");
    expect((sites.match(/await quatreYeux\(desk, reason\)/g) ?? []).length).toBe(5);
    expect((sites.match(/direLeGestePasseSeul\(/g) ?? []).length).toBe(5);
    expect((sites.match(/second\.quoi === "attend"/g) ?? []).length).toBe(5);
  });

  it("la file, elle, interdit toujours d'approuver sa propre proposition", () => {
    // C'est la règle de fond : le verdict ci-dessus ne fait que la porter en amont.
    expect(lire("src/app/desk/approbations/actions.ts")).toMatch(/a\.requestedBy === me\.name/);
  });
});

describe("ce qui passe sans contrôle se dit", () => {
  it("écrit l'audit dédié ET la ligne du journal du desk", async () => {
    /* « Acquitter n'est pas se taire » : un geste passé sans second regard
       qui ne laisserait qu'un audit serait invisible le jour même, et un
       geste qui ne laisserait qu'une ligne de journal ne se compterait pas. */
    vi.resetModules();
    const audits: { action: string; entity: string; reason?: string }[] = [];
    const events: { html: string }[] = [];
    vi.doMock("@/lib/audit", () => ({ audit: async (action: string, entity: string, _id: string, d: { reason?: string }) => void audits.push({ action, entity, reason: d.reason }) }));
    vi.doMock("@/lib/data", () => ({ repo: () => ({ logEvent: async (e: { html: string }) => void events.push(e), listStaff: async () => [] }) }));
    const { direLeGestePasseSeul } = await import("@/lib/desk/quatre-yeux");
    await direLeGestePasseSeul(desk("responsable", "Georges"), "Cours de SIAT 9 %", "o-1", "cours loin du dernier bulletin", "aucun autre responsable en poste");
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: "quatre_yeux.seul", entity: "quatre-yeux" });
    expect(audits[0].reason).toContain("sans second regard");
    expect(events).toHaveLength(1);
    expect(events[0].html).toContain("aucun autre responsable en poste");
    expect(events[0].html).toContain("Georges");
  });
});

describe("ce qui passe sans contrôle se compte", () => {
  it("Santé porte le point, avec son mode d'emploi et son anglais", async () => {
    const { HEALTH_HOW } = await import("@/lib/health-how");
    const { EN_ALL } = await import("@/i18n/core");
    const how = HEALTH_HOW["quatre-yeux"];
    expect(how, "le point n'a pas de mode d'emploi").toBeTruthy();
    expect(how.href).toBe("/desk/approbations");
    expect(EN_ALL[how.label]).toBeTruthy();
    expect(EN_ALL[how.how]).toBeTruthy();
    // Le compteur lit l'audit dédié : sans lui, un geste passé seul ne laisse aucune trace comptable.
    expect(readFileSync("src/lib/health.ts", "utf8")).toMatch(/listAudit\(\{ entity: "quatre-yeux"/);
    expect(readFileSync("src/lib/desk/quatre-yeux.ts", "utf8")).toMatch(/audit\("quatre_yeux\.seul", "quatre-yeux"/);
  });
});
