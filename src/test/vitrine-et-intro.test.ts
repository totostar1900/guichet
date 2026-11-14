import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LA VITRINE ET L'INTRO UNIQUE (14 novembre 2026, planche « vitrine et intro », options 1A et 2A).
 * Les décisions du 12 octobre tiennent : un seul bouton en tête, aucun taux, aucun rendement, aucun montant. Ce qui change est dit ici, et gardé.
 */
describe("la vitrine : quatre gestes, un visuel du produit, la donnée par sa forme", () => {
  const v = lire("src/app/Accueil.tsx");

  it("garde tout ce qu'elle disait avant et ajoute, sans retirer", () => {
    for (const titre of ["La porte d'entrée des marchés financiers d'Afrique centrale.", "Le marché de la zone, lu et commenté.", "Créer votre compte, puis l'ouvrir", "Un conseiller vous répond.", "Ce qui protège votre argent.", "Le marché de la zone, à portée de main."]) {
      expect(v, `« ${titre} » a disparu de la vitrine`).toContain(titre);
    }
    expect(v).toMatch(/Société de bourse agréée COSUMAF/);
    expect(v).toMatch(/<BandeInstruments lignes=\{lignes\} \/>/);
    for (const k of ["epargner", "financer", "investir"]) expect(v, `le geste « ${k} » a disparu`).toContain(`clef: "${k}"`);
  });

  it("ouvre la liste des gestes par « S'informer », le plus tranquille, et la numérote 01 à 04", () => {
    expect(v).toMatch(/clef: "informer",\s*n: "01"/);
    expect(v).toMatch(/clef: "epargner",\s*n: "02"/);
    expect(v).toMatch(/clef: "financer",\s*n: "03"/);
    expect(v).toMatch(/clef: "investir",\s*n: "04"/);
  });

  it("garde UN SEUL bouton en tête (la décision du 12 octobre) et le visuel du produit à côté du texte", () => {
    const debut = v.indexOf("<section className={styles.ouverture}>");
    const tete = v.slice(debut, v.indexOf("</section>", debut));
    expect((tete.match(/<Link\b/g) ?? []).length, "l'ouverture porte plus d'un bouton").toBe(1);
    expect(tete).toMatch(/<VisuelProduit \/>/);
  });

  it("dit les quatre gestes d'usage, avec les phrases qui protègent le client", () => {
    for (const phrase of ["C'est une intention, que le desk reçoit", "Rien n'est débité sans votre accord", "la décision reste la vôtre"]) {
      expect(v, `la phrase « ${phrase} » a quitté la vitrine`).toContain(phrase);
    }
    expect(v).toMatch(/Une fois votre compte ouvert, quatre gestes\./);
  });

  it("ne dessine ni mot, ni chiffre, ni taux (la règle de la vitrine)", () => {
    for (const f of ["src/components/accueil/VisuelProduit.tsx", "src/components/accueil/FormesDeLaDonnee.tsx"]) {
      const c = lire(f).replace(/\/\*[\s\S]*?\*\//g, "");
      expect(c, `${f} dessine un texte`).not.toMatch(/<text\b/);
      expect(c, `${f} porte un chiffre ou un taux écrit`).not.toMatch(/\d+\s?%|\d[  ]\d{3}\s?FCFA/);
    }
    expect(v, "une légende de la donnée n'avertit plus que les valeurs s'ouvrent avec le compte").toMatch(/Les valeurs se lisent une fois connecté\./);
  });
});

describe("une seule intro, qui parle des bienfaits", () => {
  const p = lire("src/components/mobile/Presentation.tsx");
  const l = lire("src/app/layout.tsx");

  it("n'a plus qu'une séquence : « Premiers pas » est retirée du gabarit, du menu et du dépôt", () => {
    expect(l, "le gabarit monte encore « Premiers pas »").not.toMatch(/Onboarding/);
    expect(lire("src/components/AppMenu.tsx")).not.toMatch(/Onboarding|onboarding/);
    expect(lire("src/components/menu/Pieces.tsx")).not.toMatch(/Onboarding|onboarding/);
    expect(() => lire("src/components/mobile/Onboarding.tsx")).toThrow();
  });

  it("joue quatre scènes de bienfaits, du plus large au plus rassurant", () => {
    const debutScenes = p.indexOf("const SCREENS");
    const scenes = p.slice(debutScenes, p.indexOf("const STEPS", debutScenes));
    expect((scenes.match(/kick: "/g) ?? []).length).toBe(4);
    for (const k of ["Guichet · Purpose Capital", "L'information", "À vos côtés", "En confiance"]) expect(scenes).toContain(`kick: "${k}"`);
  });

  it("garde les phrases qui protègent : une intention n'est pas un ordre, rien n'est débité sans accord, la COSUMAF, le risque de perte", () => {
    for (const phrase of ["C'est une intention, pas un ordre", "rien n'est débité sans votre accord", "Société de bourse agréée COSUMAF", "risque de perte en capital"]) {
      expect(p, `« ${phrase} » a quitté l'intro`).toContain(phrase);
    }
  });

  it("ne dessine aucun chiffre, taux ni montant (elle se joue devant la porte)", () => {
    const debutDessins = p.indexOf("const Art1");
    const dessins = p.slice(debutDessins, p.indexOf("const SCREENS", debutDessins));
    expect(dessins, "un dessin de l'intro porte un taux ou un montant").not.toMatch(/\d+[,.]?\d*\s?%|FCFA/);
  });

  it("se joue d'abord sur la vitrine pour un visiteur, et mène à la création du compte", () => {
    expect(l).toMatch(/<Presentation visiteur=\{!session\} \/>/);
    expect(p).toMatch(/\(path === "\/" && !visiteur\)/);
    expect(p).toMatch(/href="\/connexion\?creer=1"/);
  });
});
