import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/core";
import { estPublic } from "@/lib/porte";

const lire = (f: string) => readFileSync(f, "utf8");
/* Les phrases de l'accueil vivent dans le fichier des messages (tirées au hasard) : elles s'y lisent. */
const vm = () => lire("src/lib/domain/vitrine-messages.ts");

/**
 * LA VITRINE ET L'INTRO UNIQUE (14 novembre 2026, planche « vitrine et intro », options 1A et 2A).
 * Les décisions du 12 octobre tiennent : un seul bouton en tête, aucun taux, aucun rendement, aucun montant. Ce qui change est dit ici, et gardé.
 */
describe("la vitrine : sept écrans, un par lecture, qui s'arrêtent comme des statuts, sur un seul fond bleu nuit (18 novembre 2026)", () => {
  const v = lire("src/app/Accueil.tsx");
  const css = lire("src/app/Accueil.module.css");
  /* Une tranche de source : de son début à la première fin qui le suit. */
  const tranche = (src: string, debut: string, fin: string) => src.split(debut)[1]?.split(fin)[0] ?? "";
  const code = v.replace(/\/\*[\s\S]*?\*\//g, "");
  const g = lire("src/app/globals.css");

  it("a sept écrans : le titre, les produits, investir, la région, « en toute sérénité », « à chaque étape », l'espace dédié, et un message tiré au hasard dans les cinq premiers", () => {
    expect((v.match(/<section className=/g) ?? []).length, "la vitrine n'a plus sept écrans").toBe(7);
    expect(v).toMatch(/const m = tirerLesMessages\(\);/);
    for (const k of ["hub", "futur", "investir", "region", "vous"]) expect(v, `le message « ${k} » n'est plus tiré`).toContain(`titre(m.${k})`);
    expect(code).toContain('t("À chaque étape, à vos côtés.")');
  });

  it("chaque écran est une page de lecture : la page s'arrête à chacun et n'en saute aucun", () => {
    expect(g).toMatch(/html:has\(\[data-vitrine\]\) \{\s*scroll-snap-type: y mandatory;/);
    expect(css).toMatch(/scroll-snap-align: start;\s*scroll-snap-stop: always;/);
  });

  it("n'a plus un seul titre jaune, plus un numéro, et plus de ligne d'agrément sur le premier écran", () => {
    expect(code, "une étiquette dorée est revenue au-dessus d'un titre").not.toMatch(/styles\.etiquette/);
    expect(code, "des numéros sont revenus dans les listes").not.toMatch(/styles\.rang|n: "\d"/);
    expect(css).not.toMatch(/\.etiquette/);
    expect(css, "l'agrément a quitté le premier écran et ne doit plus y revenir").not.toMatch(/\.agrement/);
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
    expect(v).toContain("t(ph.conseillers[0])");
    expect(vm()).toContain("Des conseillers à votre écoute, en français, en anglais et sans jargon, à chaque étape.");
  });

  it("le dernier écran est un espace dédié : les conseillers, le risque, les trois liens et la maison (nom, agrément, version)", () => {
    const debut = code.indexOf("styles.pied");
    expect(debut, "l'espace dédié a disparu").toBeGreaterThan(-1);
    const pied = code.slice(debut, code.length);
    for (const k of ["styles.conseillers", "styles.avertissement", "styles.liens", "styles.maison", "COMPANY.legalName", "COMPANY.licence", "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA"]) expect(pied, `« ${k} » a quitté l'espace dédié`).toContain(k);
    for (const k of ["styles.conseillers", "styles.avertissement", "styles.liens", "styles.maison"]) expect(code.slice(0, debut), `« ${k} » est aussi dans un autre écran`).not.toContain(k);
  });

  it("la courbe financière est le fond du premier écran, et la carte de la zone CEMAC celui du quatrième : des traits, sans graduation, sans légende, sans chiffre", () => {
    expect(tranche(v, "ÉCRAN 1", "ÉCRAN 2")).toContain("<CourbeFinanciere");
    expect(tranche(v, "ÉCRAN 4", "ÉCRAN 5")).toContain("<CarteCemac");
    const courbe = lire("src/components/accueil/CourbeFinanciere.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
    const carte = lire("src/components/accueil/CarteCemac.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [nom, src] of [["la courbe", courbe], ["la carte", carte]] as const) {
      expect(src, `${nom} écrit un texte`).not.toMatch(/<text\b|<title\b|<tspan\b/);
      expect(src, `${nom} porte un taux ou un montant écrit`).not.toMatch(/\d+\s?%|FCFA/);
      expect(src, `${nom} a un fond ou un dégradé`).not.toMatch(/<rect|Gradient|<image/);
    }
    for (const pays of ["Tchad", "Cameroun", "République centrafricaine", "Gabon", "Congo", "Guinée équatoriale"]) expect(carte, `le pays « ${pays} » manque à la carte`).toContain(`data-pays="${pays}"`);
    expect((carte.match(/data-trait=""/g) ?? []).length).toBe(6);
    expect((courbe.match(/data-ligne=/g) ?? []).length, "la courbe n'a plus son cours et sa moyenne").toBe(2);
    expect(v, "la carte ne se trace plus avec le défilement").toMatch(/<TraceAuDefilement className=\{styles\.fond\}>\s*<CarteCemac/);
    expect(css, "le filigrane de la carte n'est plus à 14 %").toMatch(/\.carte path \{[^}]*14%/);
    expect(css, "l'écran de la carte n'est plus un écran haut, à contenu collé").toMatch(/\.longue \{[^}]*min-height: 250svh/);
    expect(css).toMatch(/\.colle \{[^}]*position: sticky/);
    expect(css).toMatch(/\.fond\[data-vu="oui"\] \.courbe \[data-trait\] \{/);
    expect(css, "un fond dessiné prend le toucher").toMatch(/\.fond \{[^}]*pointer-events: none;/);
  });

  it("toute la page de présentation est bleu nuit : le menu latéral et la pastille prennent les jetons sombres, quel que soit le thème", () => {
    expect(g).toMatch(/\nbody:has\(\[data-vitrine\]\) \{\s*color-scheme: dark;\s*--paper: #0e1928;/);
    expect(g, "le thème sombre doit rester écrit seul, intact").toMatch(/\n:root\[data-theme="dark"\] \{\s*color-scheme: dark;/);
  });

  it("garde l'agrément, le risque de perte en capital et ses trois liens, sans la phrase retirée", () => {
    expect(code, "l'agrément a quitté la maison").toMatch(/COMPANY\.licence/);
    expect(v).toMatch(/Tout placement comporte un risque de perte en capital\./);
    expect(v).toMatch(/Les performances passées ne préjugent pas des performances futures\./);
    /* DEUX LIENS, PLUS TROIS (21 novembre 2026, le client : « retire le lien vers éclairages, aide et contact ») : « Éclairages » et « Aide et contact » ont quitté le pied de l'accueil ; les contacts y sont écrits à la place. */
    for (const h of ["/info/risques", "/info/textes"]) {
      expect(code, `le lien ${h} a disparu`).toContain(`href="${h}"`);
      expect(estPublic(h), `${h} n'est pas public`).toBe(true);
    }
    for (const h of ["/info/eclairages", "/info/aide"]) expect(code, `le lien ${h} est revenu dans le pied de l'accueil`).not.toContain(`href="${h}"`);
    for (const phrase of ["Société de bourse agréée COSUMAF · n° COSUMAF-SDB-01/2026", "Prêtez aux États et aux institutions de la zone", "Ce que chaque placement peut vous apporter", "Les conditions de chaque placement vous sont remises avant toute décision", "Un conseiller vous répond, en français et sans jargon", "Voici ce que vous y trouvez", "Et aussi : l'épargne programmée", "Où va votre argent", "Ce que vous risquez"]) expect(code, `« ${phrase} » est revenu`).not.toContain(phrase);
  });

  it("le pied a le nom de la maison, son agrément et ses contacts (téléphone, e-mail), et ni adresse postale ni mention longue", () => {
    expect(code).toMatch(/COMPANY\.legalName/);
    expect(code, "l'adresse postale est revenue dans la page").not.toMatch(/COMPANY\.address/);
    expect(code, "le téléphone a quitté le pied").toMatch(/href=\{`tel:\$\{COMPANY\.phone/);
    expect(code, "l'adresse e-mail a quitté le pied").toMatch(/href=\{`mailto:\$\{COMPANY\.email\}`\}/);
    expect(code, "la mention longue est revenue dans la page").not.toMatch(/DISCLAIMER|Communication à caractère promotionnel/);
    expect(g).toMatch(/body:has\(\[data-vitrine\]\) footer \{\s*display: none;/);
  });

  it("le dessin de la famille se trace sur l'écran investir, sans fond, avec un texte sur la famille (« aide », sans « rien n'est garanti » depuis le 21 novembre 2026)", () => {
    const debut = code.indexOf("<FamilleDessin");
    expect(debut, "le dessin de la famille a quitté la vitrine").toBeGreaterThan(-1);
    const d = lire("src/components/accueil/FamilleDessin.tsx");
    const sansNotes = d.replace(/\/\*[\s\S]*?\*\//g, "");
    expect((sansNotes.match(/<circle /g) ?? []).length, "les trois têtes ne sont plus trois cercles").toBe(3);
    expect((sansNotes.match(/data-trait=""/g) ?? []).length, "le dessin n'a plus ses traits").toBeGreaterThanOrEqual(9);
    expect(sansNotes, "le dessin a un fond").not.toMatch(/<rect|fill="(?!none)/);
    expect(v).toContain("t(ph.famille[0])");
    expect(vm()).toMatch(/Investir, c'est penser à ceux qui comptent\./);
    /* LE CLIENT L'A DEMANDÉ (21 novembre 2026) : « retirer rien n'est garanti, remplacer peut aider par aide ». L'avertissement général reste au pied de l'accueil (écran 7) et sur la page des risques. */
    const famille = vm().match(/famille: \[[\s\S]*?\n  \],/)?.[0] ?? "";
    expect(famille).toMatch(/aide à préparer les projets d'une famille/);
    expect(famille, "« peut aider » est revenu").not.toMatch(/peut aider/);
    expect(famille, "« rien n'est garanti » est revenu").not.toMatch(/rien n'est garanti/i);
    expect(code, "l'avertissement de perte en capital a quitté le pied de l'accueil").toMatch(/Tout placement comporte un risque de perte en capital/);
    expect(tranche(code, "styles.texte", "</section>").length, "le texte sur la famille est redevenu long").toBeLessThan(520);
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
