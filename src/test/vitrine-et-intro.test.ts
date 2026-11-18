import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/core";
import { estPublic } from "@/lib/porte";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LA VITRINE ET L'INTRO UNIQUE (14 novembre 2026, planche « vitrine et intro », options 1A et 2A).
 * Les décisions du 12 octobre tiennent : un seul bouton en tête, aucun taux, aucun rendement, aucun montant. Ce qui change est dit ici, et gardé.
 */
describe("la vitrine : six écrans, un par lecture, qui s'arrêtent comme des statuts, sur un seul fond bleu nuit (18 novembre 2026)", () => {
  const v = lire("src/app/Accueil.tsx");
  const css = lire("src/app/Accueil.module.css");
  const code = v.replace(/\/\*[\s\S]*?\*\//g, "");
  const g = lire("src/app/globals.css");

  it("a six écrans : le titre, les produits, investir, la région, « en toute sérénité », « à chaque étape », et un message tiré au hasard dans les cinq premiers", () => {
    expect((v.match(/<section className=/g) ?? []).length, "la vitrine n'a plus six écrans").toBe(6);
    expect(v).toMatch(/const m = tirerLesMessages\(\);/);
    for (const k of ["hub", "futur", "investir", "region", "vous"]) expect(v, `le message « ${k} » n'est plus tiré`).toContain(`t(m.${k})`);
    expect(code).toContain('t("À chaque étape, à vos côtés.")');
  });

  it("chaque écran est une page de lecture : la page s'arrête à chacun et n'en saute aucun", () => {
    expect(g).toMatch(/html:has\(\[data-vitrine\]\) \{\s*scroll-snap-type: y mandatory;/);
    expect(css).toMatch(/scroll-snap-align: start;\s*scroll-snap-stop: always;/);
  });

  it("n'a plus un seul titre jaune, plus un numéro, et l'agrément n'est plus en or", () => {
    expect(code, "une étiquette dorée est revenue au-dessus d'un titre").not.toMatch(/styles\.etiquette/);
    expect(code, "des numéros sont revenus dans les listes").not.toMatch(/styles\.rang|n: "\d"/);
    expect(css).not.toMatch(/\.etiquette/);
    const agrement = /\.agrement \{([^}]*)\}/.exec(css);
    expect(agrement?.[1], "l'agrément est redevenu doré").not.toMatch(/--gold/);
    expect(css, "un titre de la vitrine est doré").not.toMatch(/(h1|h2|h3|\.sousTitre)[^{]*\{[^}]*color: var\(--gold/);
  });

  it("l'écran des produits fusionne les quatre tuiles et leur contenu, à plat, et dit ce qu'ils ne garantissent pas", () => {
    const debut = code.indexOf("const produits");
    const ecran = code.slice(debut, code.indexOf("const garanties", debut));
    for (const p of ["Titres du Trésor", "Actions cotées", "Fonds agréés", "Adjudications"]) expect(ecran, `« ${p} » a quitté l'écran des produits`).toContain(p);
    expect(v, "la réserve sur l'émetteur a quitté l'écran").toMatch(/tant que l'émetteur tient ses engagements/);
    expect(v, "la réserve sur le dividende a quitté l'écran").toMatch(/rien ne le garantit/);
    expect(ecran.length, "l'écran des produits est introuvable").toBeGreaterThan(300);
    expect(ecran, "l'écran des produits promet un rendement ou une sécurité").not.toMatch(/rendement|s[ée]curis|\bgaranti(e|s|es)?\b/i);
    expect(code, "les quatre tuiles sont revenues sur le premier écran").not.toMatch(/styles\.produit/);
  });

  it("les trois listes sont à plat et leurs icônes géométriques se dessinent à l'entrée dans l'écran", () => {
    expect((code.match(/<ListeAPlat rangees=/g) ?? []).length, "une liste n'est plus à plat").toBe(3);
    const l = lire("src/components/accueil/ListeAPlat.tsx");
    expect(l).toMatch(/pathLength=\{1\} data-trait=""/);
    expect(l).toMatch(/<TraceSurVue className=\{styles\.trace\}>/);
    const lc = lire("src/components/accueil/ListeAPlat.module.css");
    expect(lc).toMatch(/\.trace\[data-vu="oui"\] \.icone \[data-trait\] \{\s*animation: trace/);
    expect(lc).toMatch(/\.trace\[data-pret="oui"\] \.icone \[data-trait\] \{\s*stroke-dashoffset: 1;/);
    expect(lc, "une carte, un cadre ou un fond est revenu dans la liste").not.toMatch(/background|border-radius|box-shadow/);
    const t = lire("src/components/accueil/TraceSurVue.tsx");
    expect(t, "le tracé ne se retient plus quand le mouvement est réduit").toMatch(/prefers-reduced-motion: reduce/);
    expect(t).toMatch(/el\.dataset\.pret = "oui"/);
    expect(t).toMatch(/el\.dataset\.vu = "oui"/);
  });

  it("l'écran « sérénité » écrit la COSUMAF en toutes lettres, et l'accompagnement a quatre étapes sans numéro", () => {
    expect(v).toContain("Commission de Surveillance du Marché Financier de l'Afrique Centrale (COSUMAF)");
    for (const k of ["Une société agréée", "Vos titres à votre nom", "Vos espèces séparées", "Vous seul donnez les ordres", "Ouvrir votre compte", "Choisir une ligne", "Passer votre ordre", "Suivre vos placements"]) expect(v, `« ${k} » a quitté la vitrine`).toContain(k);
    expect(v).toContain("Des conseillers à votre écoute, en français, en anglais et sans jargon, à chaque étape.");
  });

  it("garde l'agrément, le risque de perte en capital et ses trois liens, sans la phrase retirée", () => {
    expect(v).toMatch(/Société de bourse agréée COSUMAF/);
    expect(v).toMatch(/Tout placement comporte un risque de perte en capital\./);
    expect(v).toMatch(/Les performances passées ne préjugent pas des performances futures\./);
    for (const h of ["/info/eclairages", "/info/aide", "/info/risques"]) {
      expect(code, `le lien ${h} a disparu`).toContain(`href="${h}"`);
      expect(estPublic(h), `${h} n'est pas public`).toBe(true);
    }
    for (const phrase of ["Les conditions de chaque placement vous sont remises avant toute décision", "Un conseiller vous répond, en français et sans jargon", "Voici ce que vous y trouvez", "Et aussi : l'épargne programmée", "Où va votre argent", "Ce que vous risquez"]) expect(code, `« ${phrase} » est revenu`).not.toContain(phrase);
  });

  it("le pied a le nom de la maison et son agrément, et ni adresse, ni téléphone, ni mention longue", () => {
    expect(code).toMatch(/COMPANY\.legalName/);
    expect(code, "l'adresse est revenue dans la page").not.toMatch(/COMPANY\.(address|phone|email)/);
    expect(code, "la mention longue est revenue dans la page").not.toMatch(/DISCLAIMER|Communication à caractère promotionnel/);
    expect(g).toMatch(/body:has\(\[data-vitrine\]\) footer \{\s*display: none;/);
  });

  it("le dessin de la famille se trace sur l'écran investir, sans fond, avec un texte qui dit « peut » et « rien n'est garanti »", () => {
    const debut = code.indexOf("<FamilleDessin");
    expect(debut, "le dessin de la famille a quitté la vitrine").toBeGreaterThan(-1);
    const d = lire("src/components/accueil/FamilleDessin.tsx");
    const sansNotes = d.replace(/\/\*[\s\S]*?\*\//g, "");
    expect((sansNotes.match(/<circle /g) ?? []).length, "les trois têtes ne sont plus trois cercles").toBe(3);
    expect((sansNotes.match(/data-trait=""/g) ?? []).length, "le dessin n'a plus ses traits").toBeGreaterThanOrEqual(9);
    expect(sansNotes, "le dessin a un fond").not.toMatch(/<rect|fill="(?!none)/);
    expect(v).toMatch(/peut aider à préparer les projets d'une famille/);
    expect(v).toMatch(/Rien n'est garanti/);
    expect(css).toMatch(/\.famille\[data-vu="oui"\] \.dessin \[data-trait\] \{\s*animation: tracer/);
  });

  it("nomme les produits, sans un chiffre ni un taux", () => {
    const net = code.replace(/(COSUMAF-SDB-01\/2026|path|d="[^"]*"|viewBox="[^"]*"|width="\d+"|height="\d+"|strokeWidth="[^"]*"|cx=\{[^}]*\}|cy=\{[^}]*\}|r=\{[^}]*\}|<T d="[^"]*" \/>)/g, "");
    expect(net, "un taux ou un montant est écrit dans la vitrine").not.toMatch(/\d+\s?%|\d[  ]\d{3}\s?FCFA|FCFA/);
  });

  it("n'a plus aucun bouton d'entrée dans la page : l'entrée est dans la bande basse, un seul endroit", () => {
    expect(code, "un bouton « Créer mon compte » est revenu dans la page").not.toMatch(/Créer mon compte/);
    expect(code, "un lien de connexion est revenu dans la page").not.toMatch(/href="\/connexion/);
    const porte = lire("src/components/PorteVitrine.tsx");
    expect(porte).toMatch(/data-bande-entree=""/);
    expect(porte).toMatch(/<LangSwitch compact clair \/>/);
    expect(g).toMatch(/body:has\(\[data-bande-entree\]\) \{\s*padding-bottom:/);
  });

  it("chaque pièce arrive à son tour (le moteur de mouvement de la maison)", () => {
    expect((v.match(/data-anim=""/g) ?? []).length, "les pièces de la vitrine ne sont plus marquées pour le mouvement").toBeGreaterThanOrEqual(12);
    expect(v).toMatch(/data-vitrine=""/);
  });

  it("n'a AUCUNE LUEUR et un seul fond : le bleu nuit, d'un bord à l'autre, pied compris", () => {
    for (const mot of [/\.halo/, /\.anneaux/, /@keyframes respire/, /@keyframes onde/, /box-shadow/, /backdrop-filter/, /linear-gradient/, /radial-gradient/, /text-shadow/, /filter:\s*blur/]) expect(css, `la feuille de la vitrine garde ${mot}`).not.toMatch(mot);
    expect(css).toMatch(/\.page \{[^}]*background: var\(--navy\)/);
    const ecran = /\n\.ecran \{([^}]*)\}/.exec(css);
    expect(ecran?.[1], "un écran pose son propre fond : le fond n'est plus le même tout le long").not.toMatch(/background/);
    expect(g).toMatch(/main:has\(\[data-vitrine\]\),\s*body:has\(\[data-vitrine\]\),\s*html:has\(\[data-vitrine\]\) \{\s*background: var\(--navy\);/);
    expect(lire("src/components/PorteVitrine.module.css"), "la bande d'entrée a gardé sa lueur").not.toMatch(/box-shadow: 0 0 var\(--s-9\)/);
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
