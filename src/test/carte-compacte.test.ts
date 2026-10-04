import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLEFS_CARTE, CODE_PAYS, codeCourt, codeLisible, ligneGrise, origineDuChiffre, titreCourt } from "@/lib/domain/carte-compacte";
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
   * CE QUI TIENT MAINTENANT L'ÉCART : le coin ne dépasse pas deux rangs, la
   * pastille puis les deux icônes côte à côte. Soixante-seize de haut contre
   * soixante-dix-huit pour la plus courte des quarante-cinq identités
   * mesurées en portrait. La marge est de deux pixels : réempiler les icônes
   * la reprendrait, et l'écart se remettrait à varier sans que rien d'autre
   * ne le signale.
   */
  const css = readFileSync("C:/dev/guichet/src/components/OfferCard.module.css", "utf8");
  const coin = css.slice(css.indexOf(".corner {"), css.indexOf("}", css.indexOf(".corner {")));

  it("le coin tient sur deux rangs, pas trois", () => {
    expect(coin, "le coin doit rester une grille à deux colonnes").toMatch(/grid-template-columns:\s*auto auto/);
    expect(css, "la pastille occupe le premier rang à elle seule").toMatch(/\.corner > \.pill \{[^}]*grid-column: 1 \/ -1/);
    expect(coin, "une colonne le remettrait sur trois rangs").not.toMatch(/flex-direction:\s*column/);
  });

  it("le coin reste dans le flux, qui lui réserve sa largeur", () => {
    /* Le sortir du flux a été essayé : la hauteur devenait bien celle de
       l'identité, mais il fallait alors deviner une réservation à droite,
       alors que le coin fait 94,6 px sur une ligne cotée et davantage dès que
       la pastille porte un compte à rebours. Le flux la calcule exactement. */
    expect(css, "le coin hors du flux force à deviner sa largeur").not.toMatch(/\.head > \.corner \{[^}]*position: absolute/);
    expect(css, "une réserve fixe à droite de l'en-tête est cette devinette").not.toMatch(/\.head \{[^}]*padding-right/);
  });

  it("l'écart sous l'ISIN est écrit comme un écart, pas comme une marge", () => {
    // La marge négative s'en déduit ; c'est l'écart qui se lit sur l'écran.
    expect(css).toMatch(/--ecart-ytm:[^;]+;\s*margin-top: calc\(var\(--ecart-ytm\) - var\(--s-6\)\)/);
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
    expect(apres, "l'écart est redéfini dans une requête média").not.toMatch(/--ecart-ytm/);
    expect(css, "aucune règle de cette carte ne dépend de l'orientation").not.toMatch(/@media \(orientation/);
  });
});
