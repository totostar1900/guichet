import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DESK_BOOT, DESK_T_COOKIE, DESK_T_KEY, DESK_THEMES, P_COOKIE, P_KEY, T_COOKIE, T_KEY, deskAttrs, paletteAttrs } from "@/lib/palette";

/**
 * LES TROIS THÈMES DU DESK (8 novembre 2026, planche « Thèmes du Desk », 1A · 2A · 3A) : clair, sombre, sable ; séparés de Guichet, sans palette ; sombre par défaut.
 */
const lire = (f: string) => readFileSync(`${process.cwd()}/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const LAYOUT = lire("src/app/layout.tsx");
const SWITCH = lire("src/components/DeskThemeSwitch.tsx");
const ACTIONS = lire("src/lib/display-actions.ts");
const CSS = readFileSync(`${process.cwd()}/src/app/globals.css`, "utf8");

describe("le Desk a son aspect, et trois thèmes", () => {
  it("clair, sombre, sable ; sans choix le Desk est sombre ; jamais de palette", () => {
    expect([...DESK_THEMES].sort()).toEqual(["dark", "light", "sable"]);
    expect(deskAttrs()).toEqual({ "data-theme": "dark", "data-defaut": "dark" });
    expect(deskAttrs("light")["data-theme"]).toBe("light");
    expect(deskAttrs("sable")).toMatchObject({ "data-theme": "light", "data-desk": "sable" });
    expect(deskAttrs("tamise" as string)["data-theme"], "un thème inconnu ne passe pas").toBe("dark");
    expect(Object.keys(deskAttrs("sable"))).not.toContain("data-palette");
  });
  it("le sable est un clair : il ne redit que les couleurs", () => {
    expect(CSS).toMatch(/:root\[data-theme="light"\]\[data-desk="sable"\]\s*\{/);
  });
  it("contrastes du sable : l'encre se lit sur le fond de page et sur les cartes", () => {
    const bloc = /:root\[data-theme="light"\]\[data-desk="sable"\]\s*\{([^}]*)\}/.exec(CSS)![1];
    const v = (n: string) => new RegExp(`--${n}:\\s*(#[0-9a-f]{6})`, "i").exec(bloc)![1];
    const L = (h: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const C = (a: string, b: string) => (Math.max(L(a), L(b)) + 0.05) / (Math.min(L(a), L(b)) + 0.05);
    for (const fond of ["paper", "surface"]) {
      expect(C(v("ink"), v(fond))).toBeGreaterThanOrEqual(7);
      expect(C(v("ink-2"), v(fond))).toBeGreaterThanOrEqual(4.5);
      expect(C(v("ink-3"), v(fond)), `l'encre tertiaire sur ${fond}`).toBeGreaterThanOrEqual(4.5);
      expect(C(v("gold-ink"), v(fond))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("le Desk et Guichet sont totalement séparés", () => {
  it("autres clés d'appareil, autres témoins", () => {
    for (const k of [DESK_T_KEY, DESK_T_COOKIE]) expect([P_KEY, T_KEY, P_COOKIE, T_COOKIE]).not.toContain(k);
  });
  it("le Desk ne lit ni ne pose le choix du client, et le client ne lit pas celui du Desk", () => {
    expect(DESK_BOOT).not.toContain(P_KEY);
    expect(DESK_BOOT).not.toContain(T_KEY);
    expect(SWITCH, "le sélecteur du Desk touche à la palette du client").not.toMatch(/\b(P_KEY|T_KEY|P_COOKIE|T_COOKIE|PALETTES|saveDisplay)\b/);
    expect(paletteAttrs("ivoire", "dark", "travail")).not.toHaveProperty("data-desk");
  });
  it("la mise en page choisit selon le Desk : attributs, script d'amorçage et gardien", () => {
    expect(LAYOUT).toMatch(/deskUi \? deskAttrs\(jar\.get\(DESK_T_COOKIE\)\?\.value\) : paletteAttrs\(/);
    expect(LAYOUT).toMatch(/__html: deskUi \? DESK_BOOT : PALETTE_BOOT/);
    expect(LAYOUT).toMatch(/deskUi \? <DeskThemeKeeper saved=\{account\?\.prefs\?\.deskTheme\} \/> : <PaletteKeeper/);
  });
  it("le sélecteur est au pied de la barre latérale, au-dessus du profil", () => {
    expect(LAYOUT).toMatch(/<DeskThemeSwitch \/>\s*<PosteDuDesk/);
  });
  it("le compte garde le choix du Desk dans un champ à part, sans écrire la palette ni le thème du client", () => {
    const corps = ACTIONS.slice(ACTIONS.indexOf("export async function saveDeskTheme"));
    expect(corps).toMatch(/\{ deskTheme: theme \}/);
    expect(corps).not.toMatch(/palette|theme: d\.theme/);
    expect(corps).toMatch(/isDeskTheme\(theme\)/);
  });
});
