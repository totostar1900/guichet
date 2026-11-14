import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/core";

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

describe("la vitrine se lit en thème clair (vu le 14 novembre 2026 : 1,43 pour le rang, 1,37 pour le contour)", () => {
  it("le rang de tous les gestes (01 à 04 et 1 à 4) est à l'encre dorée, et le contour du téléphone à l'encre tertiaire", () => {
    const css = lire("src/app/Accueil.module.css");
    expect(css, "le rang des gestes est revenu au filet pâle").toMatch(/\n\.rang \{[^}]*color: var\(--gold-ink\)/);
    expect(css, "le rang des gestes est revenu au filet pâle").not.toMatch(/\.rang \{[^}]*color: var\(--gold-line\)/);
    expect(lire("src/components/accueil/Visuels.module.css")).toMatch(/\.coque \{[^}]*stroke: var\(--ink-3\)/);
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

describe("l'anglais de l'intro et de la vitrine se lit (relu le 14 novembre 2026)", () => {
  const en = translator("en");

  it("traduit chaque scène de l'intro, titre, phrase et étiquette, sans laisser de français", () => {
    const p = lire("src/components/mobile/Presentation.tsx");
    const debut = p.indexOf("const SCREENS");
    const scenes = p.slice(debut, p.indexOf("const STEPS", debut));
    const textes = [...scenes.matchAll(/(?:kick|title|text): "((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
    expect(textes.length).toBe(12);
    /* Un nom propre s'écrit pareil dans les deux langues. */
    for (const fr of textes.filter((x) => x !== "Guichet · Purpose Capital")) expect(en(fr), `« ${fr} » n'est pas traduit`).not.toBe(fr);
  });

  it("dit « See · Say · Talk · Follow » pour les quatre gestes d'usage, et « licensed by COSUMAF » partout", () => {
    expect(en("1 · Voir")).toBe("1 · See");
    expect(en("2 · Dire")).toBe("2 · Say");
    expect(en("3 · Parler")).toBe("3 · Talk");
    expect(en("4 · Suivre")).toBe("4 · Follow");
    expect(en("Société de bourse agréée COSUMAF.")).toBe("Brokerage firm licensed by COSUMAF.");
    expect(en("Société de bourse agréée COSUMAF.")).not.toMatch(/the COSUMAF/);
  });

  it("garde la mise en garde du risque dans les mêmes mots que la vitrine : « a risk of losing capital »", () => {
    const risque = en("Vos titres sont à votre nom, vos espèces séparées, et vous seul donnez les ordres. Tout placement comporte un risque de perte en capital.");
    expect(risque).toMatch(/risk of losing capital/);
    expect(risque).not.toMatch(/capital loss/);
  });
});
