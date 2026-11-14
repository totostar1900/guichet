import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * LES SKILLS SE CONSULTENT À CHAQUE AMÉLIORATION, ET LE TON DES RISQUES EST ÉCRIT (6 novembre 2026).
 *
 * Un skill qu'on lit une fois et qu'on oublie ne garde rien. Cette épreuve tient trois choses : la doctrine (`CLAUDE.md`) dit de les consulter à chaque demande et de les
 * nommer au compte rendu ; chaque skill renvoie à ses voisins ; et le ton des mises en garde (`ETALON.md` § 10 : rassurer sans rien retirer) est appliqué au texte réel
 * du « i » des instruments.
 */
const ROOT = process.cwd();
const lire = (p: string) => readFileSync(join(ROOT, p), "utf8");
const SKILLS = ["guichet-maquette", "guichet-benchmark", "guichet-espace-tuiles", "guichet-bamboo"] as const;
const skill = (n: string) => lire(`.claude/skills/${n}/SKILL.md`);

describe("les skills du projet se consultent à chaque demande", () => {
  const claude = lire("CLAUDE.md");

  it("CLAUDE.md nomme les quatre skills et dit de les consulter à chaque amélioration", () => {
    for (const n of SKILLS) expect(claude, `« ${n} » n'est plus nommé dans CLAUDE.md`).toContain(`\`${n}\``);
    expect(claude, "la règle « chaque amélioration, pas une fois » a disparu").toMatch(/Les skills se consultent à chaque amélioration et à chaque développement d'écran, pas une fois/);
    expect(claude, "le compte rendu ne nomme plus les skills utilisés").toMatch(/Le compte rendu final nomme les skills utilisés/);
    expect(claude, "le ton des risques n'est plus renvoyé à la doctrine").toMatch(/ETALON\.md` § 10/);
  });

  it("chaque skill porte son nom de dossier dans son en-tête", () => {
    for (const n of SKILLS) expect(skill(n), `l'en-tête de ${n} ne porte plus son nom`).toMatch(new RegExp(`^---\\nname: ${n}\\n`));
  });

  it("chaque skill renvoie à ses voisins", () => {
    const m = skill("guichet-maquette");
    expect(m, "la maquette ne renvoie plus à guichet-benchmark").toContain("guichet-benchmark");
    expect(m, "la maquette ne renvoie plus à guichet-espace-tuiles").toContain("guichet-espace-tuiles");
    expect(m, "la maquette ne renvoie plus au ton des risques").toContain("§ 10");
    expect(m, "la maquette n'impose plus de nommer les skills au compte rendu").toMatch(/les skills utilisés/);
    expect(m, "la maquette n'impose plus la capture réelle de l'état actuel").toMatch(/capture réelle, jamais un dessin/);
    const b = skill("guichet-benchmark");
    expect(b, "le benchmark ne renvoie plus à guichet-maquette").toContain("guichet-maquette");
    expect(b, "le benchmark ne renvoie plus au ton des risques").toContain("§ 10");
    expect(b, "le benchmark a perdu la règle du prix et de la variation").toMatch(/Règle du prix et de la variation d'une action/);
    const bb = skill("guichet-bamboo");
    expect(bb, "le skill Bamboo ne renvoie plus à guichet-benchmark").toContain("guichet-benchmark");
    expect(bb, "le skill Bamboo ne renvoie plus à guichet-maquette").toContain("guichet-maquette");
    expect(bb, "le skill Bamboo ne renvoie plus au ton des risques").toContain("§ 10");
    expect(bb, "le journal des mentions de Bamboo a disparu").toMatch(/## 1\. Journal des mentions/);
    expect(bb, "la règle « une ligne au journal à chaque mention » a disparu").toMatch(/À chaque nouvelle mention, ajouter une ligne au journal/);
    expect(bb, "le skill Bamboo n'interdit plus de reprendre la marque, le texte ou le visuel").toMatch(/Ce qu'on ne reprend jamais/);
    expect(b, "le benchmark ne renvoie plus au skill Bamboo").toContain("guichet-bamboo");
    expect(m, "la maquette ne renvoie plus au skill Bamboo").toContain("guichet-bamboo");
    expect(claude, "CLAUDE.md ne dit plus de consulter guichet-bamboo quand le client cite Bamboo").toMatch(/dès que le client cite Bamboo, `guichet-bamboo`/);
    const e = skill("guichet-espace-tuiles");
    expect(e, "l'espace des tuiles ne renvoie plus à guichet-maquette").toContain("guichet-maquette");
    expect(e, "l'espace des tuiles ne renvoie plus à guichet-benchmark").toContain("guichet-benchmark");
  });
});

describe("le ton des risques : rassurer sans rien retirer", () => {
  const etalon = lire("ETALON.md");

  it("la doctrine écrit les deux moitiés de la règle", () => {
    expect(etalon, "la section du ton a disparu").toMatch(/## 10\. Le ton des risques et des mises en garde — rassurer sans rien retirer/);
    expect(etalon, "« rien n'est retiré » a disparu de la doctrine").toMatch(/\*\*Rien n'est retiré\*\*/);
    expect(etalon, "« le geste avant la menace » a disparu de la doctrine").toMatch(/\*\*Le geste avant la menace\*\*/);
    expect(etalon, "« la liquidité d'abord » a disparu de la doctrine").toMatch(/\*\*La liquidité d'abord, sur ce marché\*\*/);
  });

  it("le texte du « i » est calme, garde ses mentions, et nomme la liquidité d'abord", () => {
    const i = lire("src/components/EnBrefInstruments.tsx");
    const debut = i.indexOf("function VariationEtRisques");
    expect(debut, "le texte du « i » est introuvable : l'épreuve ne mesure plus rien").toBeGreaterThan(-1);
    const texte = i.slice(debut, i.indexOf("export function EnBrefInstruments", debut));
    expect(texte, "une mention a quitté le « i » : « ne préjuge pas des performances futures »").toMatch(/ne préjuge pas des performances futures/);
    expect(texte, "une mention a quitté le « i » : « le capital investi n'est pas garanti »").toMatch(/le capital investi n'est pas garanti/);
    expect(texte, "le « i » a pris un ton d'alerte").not.toMatch(/attention|danger|!/i);
    expect(texte.indexOf("Liquidité."), "la liquidité n'est plus le premier point").toBeGreaterThan(-1);
    expect(texte.indexOf("Liquidité.")).toBeLessThan(texte.indexOf("Prix."));
    expect(texte.indexOf("Prix.")).toBeLessThan(texte.indexOf("Dividende."));
    expect([...texte.matchAll(/href="([^"]+)"/g)].map((m) => m[1]), "le « i » n'a plus un seul lien, vers le texte opposable").toEqual(["/info/risques#risques"]);
  });
});
