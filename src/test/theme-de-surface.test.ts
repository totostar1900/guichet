import { describe, expect, it } from "vitest";
import { PALETTE_BOOT, paletteAttrs, themeDeSurface } from "@/lib/palette";

/**
 * La surface décide du thème, et l'utilisateur peut encore changer.
 *
 * CE QUE CE CLIQUET TIENT, décidé le 2026-10-02. Le système de design décrit
 * deux surfaces depuis le 2026-09-30 : vitrine CLAIRE devant la porte, espace de
 * travail en NUIT derrière. Ni l'une ni l'autre n'était implémentée : toute
 * l'application suivait le réglage du système d'exploitation.
 *
 * Ce n'était pas théorique. Les titres de la page d'accueil publique étaient en
 * `var(--navy)`, qui ne s'éclaircit jamais, sur un papier qui devenait #0e1928
 * dès que l'OS du visiteur était en sombre : **1,15:1**, c'est-à-dire
 * invisibles. Le sombre est majoritaire sur téléphone, donc ce n'était pas un
 * cas de coin.
 *
 * Trois propriétés, et elles se contredisent si on les mélange :
 *
 *  - la surface donne le défaut, pas l'OS ;
 *  - un choix explicite de l'utilisateur passe devant la surface ;
 *  - « auto » veut dire « selon la surface », et plus « selon l'OS ».
 *
 * Vérifiées en navigateur le 2026-10-02 avant d'être écrites ici : OS en clair
 * sur une page connectée rend bien `--paper: #0e1928`, et un choix « light »
 * stocké rend `#f6f7f9`.
 */
describe("le thème suit la surface", () => {
  it("la vitrine s'ouvre en clair, l'espace de travail en nuit", () => {
    expect(themeDeSurface("vitrine")).toBe("light");
    expect(themeDeSurface("travail")).toBe("dark");
  });

  it("timbre le défaut de la surface quand l'utilisateur n'a rien choisi", () => {
    // « data-theme » est toujours posé : c'est lui qui bat la requête média.
    expect(paletteAttrs(undefined, undefined, "vitrine")["data-theme"]).toBe("light");
    expect(paletteAttrs(undefined, undefined, "travail")["data-theme"]).toBe("dark");
    // Et le défaut voyage à part, pour que « auto » sache vers quoi revenir.
    expect(paletteAttrs(undefined, undefined, "travail")["data-defaut"]).toBe("dark");
  });

  it("« auto » veut dire la surface, et non le système d'exploitation", () => {
    expect(paletteAttrs(undefined, "auto", "travail")["data-theme"]).toBe("dark");
    expect(paletteAttrs(undefined, "auto", "vitrine")["data-theme"]).toBe("light");
  });

  it("un choix explicite passe devant la surface", () => {
    const a = paletteAttrs(undefined, "light", "travail");
    expect(a["data-theme"]).toBe("light");
    // Le défaut de la surface reste lisible : revenir à « auto » doit le retrouver.
    expect(a["data-defaut"]).toBe("dark");
    expect(paletteAttrs(undefined, "dark", "vitrine")["data-theme"]).toBe("dark");
    expect(paletteAttrs(undefined, "dim", "travail")["data-theme"]).toBe("dim");
  });

  it("le script d'amorçage retombe sur le défaut, et non sur rien", () => {
    /* Ce script s'exécute avant le premier rendu et aucun test ne peut
       l'exécuter : on vérifie donc son texte. S'il revenait à
       « removeAttribute », la requête média reprendrait la main et la vitrine
       s'ouvrirait en sombre chez un visiteur dont l'OS l'est, ce qui est
       exactement le défaut corrigé. */
    expect(PALETTE_BOOT).toContain('getAttribute("data-defaut")');
    expect(PALETTE_BOOT).not.toContain('removeAttribute("data-theme")');
  });

  it("la palette garde son propre comportement : « navy » ne timbre rien", () => {
    // Le thème et la palette sont deux réglages : celui-ci n'a pas de surface.
    expect(paletteAttrs("navy", undefined, "travail")["data-palette"]).toBeUndefined();
    expect(paletteAttrs("inconnue", undefined, "travail")["data-palette"]).toBeUndefined();
  });
});
