import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLEFS_CARTE, CODE_PAYS, codeCourt, codeLisible, ligneGrise, origineDuChiffre, titreCourt } from "@/lib/domain/carte-compacte";
import { backFacts } from "@/lib/domain/back";
import { ISSUER_REGISTRY } from "@/data/issuer-registry";
import { EN_ALL, translate } from "@/i18n/core";
import type { Offer } from "@/lib/domain/types";

/**
 * LA CARTE COMPACTE DU TÉLÉPHONE : TROIS CHAMPS COURTS.
 *
 * Le défaut corrigé est une troncature, mesurée le 4 octobre 2026 : la
 * deuxième ligne portait 89 caractères dans une place qui en laisse 33, et le
 * lecteur voyait « actuariel annuel brut au cours 9… ». Les qualificatifs
 * passaient, « aucun échange relevé » et « coupon 6,60 % » tombaient.
 *
 * Ce qui est tenu ici : un seul chiffre en avant, le chiffre dit d'où il
 * vient, la ligne grise ne dit que la promesse de l'émetteur, aucun champ ne
 * dépasse sa place, et chaque clef existe en anglais.
 */
const NOW = new Date("2026-10-04T09:00:00Z");
const base = { id: "x", country: "Gabon" as const, countryName: "Gabon", issuer: "État du Gabon", status: "quoted", settleOn: "2026-10-07", commissionPct: 0.5, sizeLabel: "", operation: "secondaire", documents: [], version: 1, deadlineAt: "2026-10-15T14:00:00.000Z" };
const cotee = (o: Partial<Offer> = {}): Offer =>
  ({ ...base, kind: "MARCHE", market: "BVMAC", instrument: "obligation", title: "État du Gabon · EOG MT 6,6 % NET 2024-2027-II", isin: "GA0000020552", nominal: 10_000, couponRate: 6.6, maturityOn: "2027-12-30", lastPrice: 97, lastPriceOn: "2026-10-02", priceSince: "2026-03-26", lotSize: 1, settlementDays: 3, ...o }) as unknown as Offer;
const dit = (p: { key: string; params?: Record<string, string> }): string => translate("fr", p.key, p.params);

describe("le code court d'un émetteur", () => {
  it("donne trois lettres à un État, et RCA à la Centrafrique", () => {
    expect(codeCourt(cotee())).toBe("GAB");
    expect(CODE_PAYS.RCA).toBe("RCA");
    /* Le seul écart à l'ISO, et il est voulu : « CAF » se lit confédération de
       football en zone francophone. */
    expect(Object.values(CODE_PAYS)).not.toContain("CAF");
  });

  it("reprend le slug du registre pour tous les autres", () => {
    // Le registre porte déjà le mnémonique BVMAC : le redoubler le ferait diverger.
    expect(codeCourt(cotee({ title: "BDEAC · BDEAC 5,95 % NET 2024-2029", isin: "CG0000020436", issuer: "BDEAC" }))).toBe("BDEAC");
    expect(codeCourt(cotee({ title: "Alios Finance · ALIOS 6,5 % BRUT 2023-2028", isin: "CM0000020412", issuer: "Alios Finance", country: "Cameroun" }))).toBe("Alios");
  });

  it("refuse de deviner un nom propre", () => {
    /* « La Régionale » coupé au premier mot donnerait « LA ». Aucune règle ne
       devine un nom propre : un slug illisible n'a pas de code, et le cliquet
       suivant le dit avant l'écran. */
    expect(codeLisible("la-regionale")).toBe(false);
    expect(codeLisible("semc")).toBe(true);
  });

  it("couvre tout le registre d'aujourd'hui", () => {
    const sans = ISSUER_REGISTRY.filter((p) => p.family !== "etat" && !codeLisible(p.slug)).map((p) => `${p.slug} (${p.name})`);
    expect(sans, `ces émetteurs sortiraient leur nom entier sur une carte compacte :\n  ${sans.join("\n  ")}`).toEqual([]);
    expect(ISSUER_REGISTRY.length, "registre vide : le cliquet ne regarde plus rien").toBeGreaterThan(10);
  });
});

describe("la ligne grise ne dit que la promesse de l'émetteur", () => {
  it("coupon et échéance pour une obligation", () => {
    expect(dit(ligneGrise(cotee()))).toBe("Coupon 6,60 % · déc. 2027");
  });

  it("marque un coupon brut, parce que la retenue s'applique", () => {
    expect(dit(ligneGrise(cotee({ title: "Alios Finance · ALIOS 6,5 % BRUT 2023-2028", couponRate: 6.5 })))).toContain("brut");
  });

  it("une action n'a ni coupon ni échéance", () => {
    expect(dit(ligneGrise(cotee({ instrument: "action", dividendPerShare: 800, couponRate: undefined, maturityOn: undefined })))).toBe("Dividende 800 FCFA");
  });

  it("ne porte aucun rendement : c'est le chiffre de droite", () => {
    // La première ligne annonce l'émetteur, la grise la promesse, et un seul nombre est en avant.
    expect(dit(ligneGrise(cotee()))).not.toContain("11,09");
  });

  it("la ligne grise tient dans sa colonne : trente-quatre caractères au plus", () => {
    /* Mesuré sur la production le 4 octobre 2026 : « Rachat au pair · éch.
       initiale nov. 2026 » demandait 180 px et en recevait 130, parce que son
       origine en occupait 133 à droite. C'était la seule des treize à déborder,
       et l'ellipse mangeait la date, c'est-à-dire le fait. « initiale » est
       parti, « par tranches » aussi : la forme complète du coupon faisait 44
       caractères. */
    const cas = [cotee(), cotee({ title: "ALIOS 6,5 % BRUT 2023-2028" }), cotee({ kind: "BTA", maturityOn: "2027-09-23" }), cotee({ instrument: "action", dividendPerShare: 2_500 }), { ...base, kind: "RACHAT", title: "Rachat OTA 3 ans", isin: "CF2J00000091", nominal: 10_000, maturityOn: "2026-11-29" } as unknown as Offer];
    const trop = cas.map((o) => dit(ligneGrise(o))).filter((x) => x.length > 34);
    expect(trop, `ces lignes grises débordent :\n  ${trop.join("\n  ")}`).toEqual([]);
  });
});

describe("le chiffre de droite dit d'où il vient", () => {
  it("un cours de référence porte son âge", () => {
    /* Sans l'âge, « 11,09 % » se lit comme un rendement de marché. Mesuré sur
       douze mois : zéro transaction sur 7 709 couples ligne-séance. */
    expect(dit(origineDuChiffre(cotee(), NOW))).toBe("97 % · 192 j");
  });

  it("un prix au pair s'écrit 100 %, comme les autres", () => {
    /* « au pair » est 100 % du nominal : l'écrire en lettres à côté de « 97 % »
       obligeait le lecteur à convertir pour comparer deux lignes. La colonne
       commence donc toujours par un prix. */
    expect(dit(origineDuChiffre(cotee({ lastPrice: 100, couponRate: 6.75, priceSince: "2025-09-02" }), NOW))).toBe("100 % · 397 j");
  });

  it("sans date d'immobilité, le champ nomme le cours au lieu d'inventer un âge", () => {
    expect(dit(origineDuChiffre(cotee({ priceSince: undefined }), NOW))).toBe("cours 97 %");
  });

  it("un taux imprimé par le Trésor se distingue d'un prix proposé", () => {
    const bta = { ...base, kind: "BTA", title: "BTA 52 semaines", isin: "CG1300001480", nominal: 1_000_000, maturityOn: "2027-09-23", precountRate: 5.5 } as unknown as Offer;
    expect(dit(origineDuChiffre(bta, NOW))).toBe("si adjugé à 5,50 % précompté");
    expect(dit(origineDuChiffre({ ...bta, servedPricePct: 97 } as Offer, NOW))).toBe("adjugé à 5,50 % précompté");
  });

  it("un rachat n'a pas de rendement, et le dit", () => {
    expect(dit(origineDuChiffre({ ...base, kind: "RACHAT", title: "Rachat OTA 3 ans", isin: "CF2J00000091", nominal: 10_000 } as unknown as Offer, NOW))).toBe("du nominal, pas un rendement");
  });

  it("tient dans la place : vingt-huit caractères au plus", () => {
    /* La mesure qui a ouvert ce chantier. À 10 px sur 390 de large, la colonne
       de droite en prend vingt-huit ; au-delà le champ se tronque, et c'est la
       fin de la phrase, donc le fait, qui disparaît. */
    const cas = [cotee(), cotee({ lastPrice: 100, priceSince: "2025-09-02" }), cotee({ lastPrice: 94.96, priceSince: "2025-10-11" }), cotee({ instrument: "action", lastPrice: 53_000 }), { ...base, kind: "RACHAT", title: "R", isin: "CF2J00000091", nominal: 1 } as unknown as Offer];
    const trop = cas.map((o) => dit(origineDuChiffre(o, NOW))).filter((x) => x.length > 28);
    expect(trop, `ces origines débordent :\n  ${trop.join("\n  ")}`).toEqual([]);
  });
});

describe("les clefs de la carte passent en anglais", () => {
  const source = readFileSync("C:/dev/guichet/src/lib/domain/carte-compacte.ts", "utf8");

  it("chacune est au dictionnaire", () => {
    /* Premier angle mort du scanner : ces clefs traversent t() sous forme de
       variable, donc rien d'autre ne peut les voir. */
    const trous = CLEFS_CARTE.filter((k) => EN_ALL[k] == null);
    expect(trous, `ces clefs sortiraient en français :\n  ${trous.join("\n  ")}`).toEqual([]);
  });

  it("la liste dit vraiment ce que le code produit", () => {
    /* Une liste tenue à la main dérive : si elle oubliait une clef, le contrôle
       ci-dessus passerait au vert sur une clef absente du dictionnaire. On
       relit donc les clefs écrites dans le module, hors de la liste elle-même. */
    const i = source.indexOf("export const CLEFS_CARTE");
    const code = source.slice(0, i);
    const ecrites = [...code.matchAll(/key: "((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
    expect(ecrites.length, "aucune clef lue dans le code : le cliquet ne regarde plus rien").toBeGreaterThan(20);
    const oubliees = [...new Set(ecrites)].filter((k) => !CLEFS_CARTE.includes(k));
    expect(oubliees, `clefs produites mais absentes de CLEFS_CARTE :\n  ${oubliees.join("\n  ")}`).toEqual([]);
  });

  it("l'anglais compte les jours en « d », pas en « j »", () => {
    // Le seul mot à traduire dans « 97 % · 192 j », et le plus facile à oublier.
    expect(translate("en", "{p} · {n} j", { p: "97 %", n: "192" })).toBe("97 % · 192 d");
    expect(translate("en", "cours {p}", { p: "97 %" })).toBe("price 97 %");
  });
});

describe("le titre abrège son émetteur", () => {
  /**
   * « État du Gabon » revient sur vingt-cinq des trente-cinq lignes cotées et
   * redit le drapeau posé juste dessous ; ses quatorze signes repoussent à la
   * deuxième ligne la seule partie qui distingue une ligne gabonaise d'une
   * autre, son coupon et son échéance. Demandé le 4 octobre 2026.
   */
  it("remplace le nom de l'émetteur par son code court", () => {
    expect(titreCourt(cotee())).toBe("GAB · EOG MT 6,6 % NET 2024-2027-II");
  });

  it("ne répète pas un code que le nom de la ligne porte déjà", () => {
    /* « BDEAC · BDEAC 5,45 % NET 2020-2027 » deviendrait « BDEAC · BDEAC
       5,45 % … » : répéter est pire que le nom long, donc le préfixe part. */
    const bdeac = cotee({ issuer: "BDEAC", title: "BDEAC · BDEAC 5,45 % NET 2020 - 2027", isin: "CG0000020220", country: "Congo" });
    expect(titreCourt(bdeac)).toBe("BDEAC 5,45 % NET 2020 - 2027");
  });

  it("laisse intact un titre qui ne commence pas par son émetteur", () => {
    // Aucune supposition sur la forme du libellé : sans le préfixe exact, on ne touche à rien.
    const libre = cotee({ title: "Obligation gabonaise 6,6 % 2027" });
    expect(titreCourt(libre)).toBe("Obligation gabonaise 6,6 % 2027");
  });

  it("le nom complet reste en tête de page", () => {
    /* LA FICHE ET LA LIGNE DU DESK GARDENT LE NOM LÉGAL : ce sont les deux
       pages où l'on vérifie de quelle ligne on parle avant de passer un ordre
       en banque, et le dos de la carte est fait pour la même chose. */
    const src = readFileSync("C:/dev/guichet/src/components/LineIdentity.tsx", "utf8");
    expect(src, "l'en-tête de page doit garder s.title").toContain('Tag === "h1" ? s.title : titreCourt(o)');
  });
});

describe("le code colle au nom quand le nom le porte déjà", () => {
  it("« Alios » devant « ALIOS 6,5 % » ne se répète pas", () => {
    /* Trouvé à l'écran, pas à la relecture : le référentiel écrit « Alios »,
       le bulletin « ALIOS ». La règle comparait les chaînes telles quelles et
       laissait passer « Alios · ALIOS 6,5 % BRUT 2023-2028 ». */
    const alios = cotee({ issuer: "Alios Finance", title: "Alios Finance · ALIOS 6,5 % BRUT 2023-2028", isin: "CM0000020412", country: "Cameroun" });
    expect(titreCourt(alios)).toBe("ALIOS 6,5 % BRUT 2023-2028");
  });

  it("« Alios » devant « ALIOS-05 » non plus", () => {
    /* Deuxième passage à l'écran : la borne était « une espace », et
       « ALIOS-05 6 % BRUT 2025-2028 » passait au travers par son trait
       d'union. La borne est « pas une lettre ni un chiffre ». */
    const a5 = cotee({ issuer: "Alios Finance", title: "Alios Finance · ALIOS-05 6 % BRUT 2025-2028", isin: "CM0000020610", country: "Cameroun" });
    expect(titreCourt(a5)).toBe("ALIOS-05 6 % BRUT 2025-2028");
  });

  it("mais une lettre qui suit fait un autre mot, et le préfixe reste", () => {
    // « BGFI » devant « BGFIBank » n'est pas une répétition : ce sont deux noms.
    const bgfi = cotee({ issuer: "BGFI Holding", title: "BGFI Holding · BGFIBank 6 % 2027", isin: "GA0000099999" });
    expect(titreCourt(bgfi)).toContain(" · BGFIBank");
  });
});

describe("l'en-tête de la carte est réglé par son identité", () => {
  /**
   * L'ÉCART SOUS L'ISIN SUIVAIT LA LONGUEUR DU NOM, ce qu'un écart ne doit
   * jamais faire. La hauteur de l'en-tête vaut le plus grand de ses deux
   * enfants : le coin empilé sur trois rangs faisait cent, l'identité d'une
   * ligne cotée en faisait moins, et l'ISIN flottait trente-sept au-dessus du
   * bord inférieur. Mesuré le 4 octobre 2026 : 42 px sur la plupart des
   * cartes, 24 dès qu'un nom passait sur deux lignes.
   *
   * DEUX PIXELS DE MARGE N'EN ÉTAIENT PAS. Le coin ramené à deux rangs
   * mesurait 76 contre 78 pour la plus courte identité À 375 px, et cela
   * suffisait là. À 412 px, la largeur d'un téléphone courant, les titres
   * tiennent sur une ligne, l'identité tombe à 58,6, et QUARANTE-DEUX CARTES
   * SUR QUARANTE-CINQ redevenaient réglées par le coin : quatre écarts
   * distincts, jusqu'à 17,98 px. Mesurer une seule largeur ne prouvait rien.
   *
   * CE QUI TIENT L'ÉCART MAINTENANT : le coin tient sur UN SEUL RANG, la
   * pastille et les deux icônes côte à côte. Trente-quatre de haut contre
   * cinquante-huit, vingt-quatre de marge au lieu de deux.
   */
  const css = readFileSync("C:/dev/guichet/src/components/OfferCard.module.css", "utf8");
  const coin = css.slice(css.indexOf(".corner {"), css.indexOf("}", css.indexOf(".corner {")));

  it("le coin ne donne pas sa hauteur à l'en-tête", () => {
    /* Dans une rangée flex, la hauteur de ligne se calcule sur la taille
       EXTERNE des enfants : une marge basse plus grande que sa hauteur retire
       le coin du calcul, pendant que sa largeur reste mesurée par le flux.
       Sans elle, un coin en colonne redevient plus haut que l'identité et
       l'écart sous l'ISIN se remet à suivre la longueur du nom. */
    expect(coin, "sans marge basse négative, le coin règle de nouveau la hauteur").toMatch(/margin:[^;]*calc\(-1 \* var\(--s-11\)/);
  });

  it("et la ligne du grand chiffre laisse passer ce qui déborde", () => {
    /* Ce qui descend sous l'en-tête, ce sont les deux icônes : trente-quatre
       de large, une constante. La pastille, elle, reste dans l'en-tête. Sans
       cette réserve, les cartes sans rendement passent leur phrase sous
       l'icône : quatre l'ont fait, mesurées. */
    expect(css, "la ligne du grand chiffre doit réserver la largeur des icônes").toMatch(/\.big \{[^}]*padding-right/);
  });

  it("le coin reste dans le flux, qui lui réserve sa largeur", () => {
    /* Le sortir du flux a été essayé : la hauteur devenait bien celle de
       l'identité, mais il fallait alors deviner une réservation à droite,
       alors que le coin fait 94,6 px sur une ligne cotée et davantage dès que
       la pastille porte un compte à rebours. Le flux la calcule exactement. */
    expect(css, "le coin hors du flux force à deviner sa largeur").not.toMatch(/\.head > \.corner \{[^}]*position: absolute/);
    expect(css, "une réserve fixe à droite de l'en-tête est cette devinette").not.toMatch(/\.head \{[^}]*padding-right/);
  });

  it("l'écart sous la ligne grise s'écrit comme un écart, pas comme une marge", () => {
    /* La gouttière de la carte vaut douze et ne se règle pas par paire : la
       marge reprend la différence jusqu'à l'écart voulu. On écrit donc
       l'écart, et la marge s'en déduit — c'est l'écart qui se lit sur
       l'écran, et c'est lui qu'on vient changer quand on le change.
       Il a valu 3,5 puis 4 puis 12 puis 18 en une journée : autant que la
       valeur soit à un seul endroit, nommée. */
    expect(css, "la gouttière de la carte vaut douze").toMatch(/\.card \{[^}]*gap: 12px/);
    expect(css, "l'écart doit être nommé, et la marge s'en déduire").toMatch(/--ecart-ytm:[^;]+;\s*margin-top: calc\(var\(--ecart-ytm\) - var\(--s-6\)\)/);
  });
});

describe("l'écart sous l'ISIN ne dépend pas de l'orientation", () => {
  /**
   * La règle a vécu un jour dans « @media (orientation: portrait) », parce que
   * la demande disait « en portrait ». Mesuré le 4 octobre 2026 : 3,5 px
   * debout, 12,59 px couché. Un écart qui change selon la façon de tenir le
   * téléphone a le même défaut que celui qui changeait avec la longueur du
   * nom. C'est le lecteur qui tourne son écran, pas la carte qui change d'avis.
   */
  it("la règle n'est enfermée dans aucune requête d'orientation", () => {
    /* Les commentaires CITENT la requete qui a ete retiree : on les enleve
       avant de chercher, sinon l epreuve se prend elle-meme au piege. */
    const css = readFileSync("C:/dev/guichet/src/components/OfferCard.module.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const apres = css.slice(css.indexOf("@media"));
    expect(apres, "l'écart est redéfini dans une requête média").not.toMatch(/\.big \{[^}]*margin-top/);
    expect(css, "aucune règle de cette carte ne dépend de l'orientation").not.toMatch(/@media \(orientation/);
  });
});

describe("au dos, la glose du cours tient sur deux lignes", () => {
  /**
   * « depuis le 18 août 2026, 47 jours » sur une seule ligne se coupe où la
   * colonne le décide, et la virgule se retrouve en bout de ligne. Séparées,
   * chacune se lit d'un coup : la première dit QUAND, la seconde DEPUIS
   * COMBIEN DE TEMPS. Demandé le 4 octobre 2026.
   *
   * Le jeu d'essai local ne porte pas « priceSince », donc cette branche ne
   * se voit pas à l'écran en développement : elle se tient ici.
   */
  it("la date d'abord, la durée en dessous", () => {
    const f = backFacts(cotee({ priceSince: "2026-08-18" }), new Date("2026-10-04T12:00:00"));
    const cours = f.band!.find(([k]) => k === "Cours")!;
    expect(cours[2]).toBe("depuis le 18 août 2026");
    expect(cours[3]).toBe("47 jours");
  });

  it("sans date de changement, une seule glose et pas de seconde vide", () => {
    const f = backFacts(cotee({ priceSince: undefined, lastPriceOn: "2026-10-02" }), new Date("2026-10-04T12:00:00"));
    const cours = f.band!.find(([k]) => k === "Cours")!;
    expect(cours[2]).toBe("séance du 2 oct. 2026");
    expect(cours[3]).toBeUndefined();
  });

  it("le dos rend les deux gloses, l'une sous l'autre", () => {
    const src = readFileSync("C:/dev/guichet/src/components/mobile/CardBack.tsx", "utf8");
    expect(src, "la seconde glose doit être rendue").toContain("{note2 && <em>{t(note2)}</em>}");
    const css = readFileSync("C:/dev/guichet/src/components/mobile/CardBack.module.css", "utf8");
    expect(css, "chaque glose occupe sa ligne").toMatch(/\.band em \{[^}]*display: block/);
  });
});

/**
 * LE COMPORTEMENT DE LA BANDE A DÉMÉNAGÉ, PAS DISPARU.
 *
 * Il vivait dans « SectionChips » ; les fonds ont voulu la même bande pour
 * leurs groupes, et ce qui a coûté cher à régler — le repère qui suit le
 * défilement, le saut instantané, la barre qui ne bouge que de côté — ne doit
 * exister qu'une fois. Il est dans « lib/ui/sommaire.ts », et les deux
 * barres l'appellent. Les épreuves ci-dessous lisent donc les deux fichiers
 * ensemble : elles tiennent le comportement où qu'il soit écrit.
 */
const BANDE = [readFileSync("C:/dev/guichet/src/components/SectionChips.tsx", "utf8"), readFileSync("C:/dev/guichet/src/lib/ui/sommaire.ts", "utf8")].join("\n");

describe("les deux bandes collantes", () => {
  /**
   * Trois défauts mesurés à l'écran le 4 octobre 2026, dont aucun ne se
   * voyait à la relecture :
   *
   *  1. UNE BANDE DE LIEUX AJOUTÉE EN DOUBLON. « OngletsMarche » portait déjà
   *     Titres, Fonds et Adjudications ; j'en ai posé une seconde vingt
   *     pixels plus bas. C'est la rangée qui existe qui devient collante.
   *  2. LES PASTILLES NE COLLAIENT PAS. Elles vivaient dans « top », un bloc
   *     court : un élément collant ne dépasse pas la boîte de son parent, et
   *     elles partaient avec lui. Mesuré à -1223 après un défilement de 1400.
   *  3. LE REPÈRE ÉTAIT EN RETARD D'UNE SECTION. Il comparait les TITRES, qui
   *     sont eux-mêmes collants et restent épinglés tant que leur section est
   *     à l'écran. Le bloc, lui, ne colle pas.
   */
  const chips = BANDE;
  const browser = readFileSync("C:/dev/guichet/src/components/OfferBrowser.tsx", "utf8");

  it("une seule rangée de lieux, celle qui existait", () => {
    expect(browser, "une seconde bande de lieux ferait doublon avec OngletsMarche").not.toMatch(/LieuBar/);
    /* Elle a collé, et elle ne colle plus : voir « la pile collante » plus
       bas. Ce qui reste tenu ici est qu'il n'y en a qu'UNE, ce qui était le
       défaut d'origine — j'en avais posé une seconde vingt pixels sous celle
       qui existait déjà. */
    /* Elle ne tient plus sa liste en dur : elle lit celle du siège, dans
       « nav-onglets ». Ce qui est tenu ici reste qu'elle porte bien des lieux,
       donc qu'une seconde bande n'a pas à en porter. */
    expect(readFileSync("C:/dev/guichet/src/components/market/OngletsMarche.tsx", "utf8"), "c'est elle qui porte les pages du siège").toMatch(/pages = ongletsDuSiege\(path\)/);
  });

  it("les pastilles ne vivent pas dans un bloc court", () => {
    /* Dans « top », elles se décollaient au bout de quarante pixels. Leur
       parent doit être « wrap », aussi haut que la liste. */
    const dansTop = /<div className=\{styles\.top\}[\s\S]{0,400}?<SectionChips/.test(browser);
    expect(dansTop, "les pastilles sont retombées dans « top » : elles ne colleront plus").toBe(false);
    expect(readFileSync("C:/dev/guichet/src/components/SectionChips.module.css", "utf8")).toMatch(/\.bar \{[^}]*position: sticky/);
  });

  it("le repère mesure la section, pas son titre collant", () => {
    expect(chips, "le titre est collant : il donnerait toujours la section précédente").toContain('[aria-labelledby="sec-');
    expect(chips, "la section doit encore contenir la bande, pas seulement l'avoir dépassée").toContain("r.bottom > bas");
  });

  it("les deux bandes partagent une seule hauteur", () => {
    /* Mesurée à 44,5 et devinée à 40, la bande des sections chevauchait la
       rangée de quatre pixels et demi. Deux modules, un seul nombre. */
    expect(readFileSync("C:/dev/guichet/src/app/globals.css", "utf8"), "la hauteur est posée une fois, dans globals").toMatch(/--lieux-h:/);
    expect(readFileSync("C:/dev/guichet/src/components/market/OngletsMarche.module.css", "utf8"), "la rangée doit VALOIR cette hauteur, pas la laisser au contenu").toMatch(/height: var\(--lieux-h\)/);
  });
});

describe("la bande des sections conduit, et le saut est instantané", () => {
  /**
   * TROIS CHEMINS MESURÉS LE 4 OCTOBRE 2026 sur un saut vers « Entreprises »,
   * et deux qui ratent :
   *
   *  - cible calculée puis glissement doux : 158 px trop haut, dans la
   *    section d'avant, parce que la cible est mesurée à l'instant du clic et
   *    que la mise en page bouge pendant le voyage ;
   *  - « scrollIntoView » avec « scroll-margin-top » : régulier mais 76 px
   *    trop bas, toujours dans la section d'avant ;
   *  - défilement mesuré et INSTANTANÉ : le bloc se pose à quatre pixels sous
   *    la bande, aux cinq sections.
   *
   * ET « instant » DOIT ÊTRE ÉCRIT. La page déclare « scroll-behavior:
   * smooth » : « auto » veut dire « ce que dit le CSS », donc un glissement.
   * L'atterrissage variait alors de -3743 à +624 selon le moment où l'on
   * regardait, ce qui ressemblait à un défaut de calcul et n'en était pas un.
   */
  const chips = BANDE;
  /* Les commentaires CITENT ce qui a été retiré : on les enlève avant de
     chercher, sinon l'épreuve se prend elle-même au piège. Troisième fois
     aujourd'hui. */
  const code = chips.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("la pastille conduit à la section, elle ne filtre plus", () => {
    expect(chips, "le clic doit conduire").toContain("conduire(s)");
    expect(chips, "le saut se mesure depuis la bande collante").toContain("bande.getBoundingClientRect().bottom");
  });

  it("le saut est instantané, écrit noir sur blanc", () => {
    expect(chips, '« auto » suivrait « scroll-behavior: smooth » de la page').toContain('behavior: "instant"');
    expect(readFileSync("C:/dev/guichet/src/app/globals.css", "utf8"), "si la page cessait d'être douce, ce commentaire deviendrait faux").toMatch(/scroll-behavior: smooth/);
  });

  it("la barre ne déplace jamais la page pour se recadrer", () => {
    /* « scrollIntoView » sur la pastille active déplaçait AUSSI la page quand
       il jugeait la barre mal cadrée, pendant que le doigt défilait : c'était
       le tremblement signalé. On n'écrit que « scrollLeft ». */
    expect(code, "scrollIntoView sur la pastille fait trembler la page").not.toMatch(/scrollIntoView/);
    expect(chips, "seul l'axe horizontal de la barre bouge").toContain("b.scrollTo({ left:");
  });

  it("les deux bandes couvrent toute la largeur", () => {
    /* Collantes et à la gouttière de la page, elles laissaient les cartes
       défiler VISIBLEMENT de part et d'autre. */
    expect(readFileSync("C:/dev/guichet/src/components/SectionChips.module.css", "utf8")).toMatch(/\.bar \{[^}]*margin: 0 -20px/);
    expect(readFileSync("C:/dev/guichet/src/components/market/OngletsMarche.module.css", "utf8")).toMatch(/margin-left: calc\(-1 \* var\(--s-8\)\)/);
  });

  it("la rangée d'onglets ne se replie plus", () => {
    /* Le repli rendait quarante pixels et faisait trembler : le seuil
       basculait pendant que la page bougeait, la hauteur s'animait, et la
       bande des sections changeait de « top » au même instant. */
    const css = readFileSync("C:/dev/guichet/src/components/market/OngletsMarche.module.css", "utf8");
    expect(css, "une hauteur qui s'anime sur une barre collante tremble").not.toMatch(/transition:[^;]*height/);
    expect(readFileSync("C:/dev/guichet/src/components/market/OngletsMarche.tsx", "utf8"), "plus d'écoute du défilement sur cette rangée").not.toMatch(/addEventListener\("scroll"/);
  });
});

describe("la pile collante commence sous l'en-tête de l'application", () => {
  /**
   * L'EN-TÊTE DE L'APPLICATION EST LUI-MÊME COLLANT, à z-index 40 et sur
   * cinquante-deux pixels. Une barre qui collerait à zéro disparaîtrait
   * derrière lui sans que rien ne le signale : c'est ce qui est arrivé à la
   * rangée d'onglets, invisible à l'écran alors que ses coordonnées la
   * disaient en place — elle était bien à 0-44, mais sous un en-tête opaque.
   *
   * TROIS ÉTAGES, ET NON PLUS QUATRE. La rangée d'onglets a quitté la pile
   * le 4 octobre 2026 : elle ne colle plus, elle s'en va avec la page, parce
   * qu'une rangée de liens vers d'AUTRES pages ne vaut pas quarante pixels
   * sur chaque écran pendant toute la lecture. Mesuré après : 0-52
   * l'application, 52-93 les sections, 100 le titre de section.
   *
   * CE QUI NE COLLE PLUS NE DOIT PLUS RÉSERVER SA HAUTEUR, sans quoi les
   * bandes flottent quarante pixels sous l'en-tête, devant du vide.
   */
  it("chaque étage ajoute la hauteur de celui du dessus", () => {
    const g = readFileSync("C:/dev/guichet/src/app/globals.css", "utf8");
    expect(g, "la hauteur de l'en-tête doit être nommée une fois").toMatch(/--barre-app:/);
    expect(g, "elle ne vaut que sur téléphone, où cet en-tête existe").toMatch(/@media \(max-width: 760px\)[\s\S]{0,200}--barre-app: calc\(var\(--mobile-bar\)/);
    const onglets = readFileSync("C:/dev/guichet/src/components/market/OngletsMarche.module.css", "utf8");
    expect(onglets, "la rangée des pages ne colle plus : elle n'a donc plus de « top »").not.toMatch(/\.onglets \{[^}]*position: sticky/);
    expect(readFileSync("C:/dev/guichet/src/components/SectionChips.module.css", "utf8"), "les sections se posent directement sous l'en-tête").toMatch(/\.bar \{[^}]*top: var\(--barre-app, 0px\);/);
    const o = readFileSync("C:/dev/guichet/src/components/OfferBrowser.module.css", "utf8");
    expect(o, "le titre de section se pose sous la bande des sections, et sous elle seule").toMatch(/top: calc\(var\(--barre-app[^)]*\) \+ var\(--sections-h\)\)/);
    expect(o, "et le saut réserve la même hauteur").toMatch(/scroll-margin-top: calc\(var\(--barre-app/);
  });

  it("aucun étage ne passe devant l'en-tête de l'application", () => {
    // Il est à 40 : ce qui se glisse dessous doit rester en dessous.
    const z = (css: string, sel: RegExp) => Number((css.match(sel) ?? [])[1] ?? 0);
    expect(z(readFileSync("C:/dev/guichet/src/components/market/OngletsMarche.module.css", "utf8"), /\.onglets \{[^}]*z-index: (\d+)/)).toBeLessThan(40);
    expect(z(readFileSync("C:/dev/guichet/src/components/SectionChips.module.css", "utf8"), /\.bar \{[^}]*z-index: (\d+)/)).toBeLessThan(40);
  });
});
