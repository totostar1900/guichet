import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/core";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LA VITRINE ET L'INTRO UNIQUE (14 novembre 2026, planche « vitrine et intro », options 1A et 2A).
 * Les décisions du 12 octobre tiennent : un seul bouton en tête, aucun taux, aucun rendement, aucun montant. Ce qui change est dit ici, et gardé.
 */
describe("la vitrine : quatre écrans plein écran, un message chacun (18 novembre 2026, planche « Accueil en quatre écrans »)", () => {
  const v = lire("src/app/Accueil.tsx");
  const css = lire("src/app/Accueil.module.css");

  it("a quatre écrans : le hub, investir, la région, vous, et un message tiré au hasard dans chacun", () => {
    for (const k of ["hub", "investir", "region", "vous"]) expect(v, `l'écran « ${k} » a disparu`).toContain(`styles.${k}`);
    expect((v.match(/<section className=/g) ?? []).length, "la vitrine n'a plus quatre écrans").toBe(4);
    expect(v).toMatch(/const m = tirerLesMessages\(\);/);
    for (const k of ["hub", "investir", "region", "vous"]) expect(v, `le message « ${k} » n'est plus tiré`).toContain(`t(m.${k})`);
  });

  it("garde l'agrément COSUMAF, le risque écrit et le lien vers les risques", () => {
    expect(v).toMatch(/Société de bourse agréée COSUMAF/);
    expect(v).toMatch(/Tout placement comporte un risque de perte en capital\./);
    expect(v).toMatch(/Les performances passées ne préjugent pas des performances futures\./);
    expect(v).toMatch(/href="\/info\/risques"/);
  });

  it("nomme les produits et les services, sans un chiffre ni un taux", () => {
    for (const p of ["Titres du Trésor", "Actions cotées", "Fonds agréés", "Adjudications"]) expect(v, `« ${p} » a quitté le hub`).toContain(p);
    expect(v).toMatch(/l'épargne programmée, les notes de marché, un conseiller qui répond/);
    const code = v.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(COSUMAF-SDB-01\/2026|Dix minutes|path|d="[^"]*"|viewBox="[^"]*"|width="\d+"|height="\d+"|strokeWidth="[^"]*")/g, "");
    expect(code, "un taux ou un montant est écrit dans la vitrine").not.toMatch(/\d+\s?%|\d[  ]\d{3}\s?FCFA|FCFA/);
  });

  it("n'a plus aucun bouton dans la page : l'entrée est dans la bande basse, un seul endroit", () => {
    const code = v.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code, "un bouton « Créer mon compte » est revenu dans la page").not.toMatch(/Créer mon compte/);
    expect(code, "un lien de connexion est revenu dans la page").not.toMatch(/href="\/connexion/);
    const porte = lire("src/components/PorteVitrine.tsx");
    expect(porte).toMatch(/data-bande-entree=""/);
    expect(porte).toMatch(/t\("Créer mon compte"\)/);
    expect(porte).toMatch(/t\("Se connecter"\)/);
    expect(porte, "la langue a quitté le coin haut-droit").toMatch(/<LangSwitch compact clair \/>/);
    expect(lire("src/app/globals.css")).toMatch(/body:has\(\[data-bande-entree\]\) \{\s*padding-bottom:/);
  });

  it("chaque pièce arrive à son tour (le moteur de mouvement de la maison) et la page accroche au défilement", () => {
    expect((v.match(/data-anim=""/g) ?? []).length, "les pièces de la vitrine ne sont plus marquées pour le mouvement").toBeGreaterThanOrEqual(14);
    expect(v).toMatch(/data-vitrine=""/);
    expect(lire("src/app/globals.css")).toMatch(/html:has\(\[data-vitrine\]\) \{\s*scroll-snap-type: y proximity;/);
    expect(css).toMatch(/scroll-snap-align: start;/);
  });

  it("a le design qui glow : un halo qui respire, des cartes de verre, et se tait si le mouvement est réduit", () => {
    expect(css).toMatch(/\.halo \{[^}]*animation: respire/);
    expect(css).toMatch(/backdrop-filter: blur/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.halo,\s*\.anneaux \{\s*animation: none;/);
  });
});

describe("la vitrine se lit : l'or sur la nuit, le blanc sur la nuit (les couples de la maison)", () => {
  it("le rang des pas est du marine sur l'or, le titre du hub un dégradé blanc vers l'or", () => {
    const css = lire("src/app/Accueil.module.css");
    expect(css).toMatch(/\.rang \{[^}]*color: var\(--navy\);[^}]*background: var\(--gold\)/);
    expect(css).toMatch(/\.hub h1 \{[^}]*linear-gradient\(120deg, var\(--on-navy\)/);
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
