import { describe, expect, it } from "vitest";
import {
  concentration,
  niveauxDistincts,
  parMois,
  rendementDuDividende,
  repliMaximum,
  santeIndice,
  souffle,
  volatiliteMensuelle,
  betaMensuel,
  evenementsDeDividende,
  rendementTotal,
  type CotationLue,
  type PoidsValeur,
  type PointIndice,
} from "@/lib/market/sante-indice";

/**
 * LA SANTÉ DE L'INDICE.
 *
 * Les cas ci-dessous sont ceux où un calcul naïf ment : un rendement pondéré
 * sans dénominateur, un repli sans ses dates, une volatilité quotidienne sur
 * un marché qui ne cote pas, une concentration qui change du simple au double
 * selon la pondération.
 */
const pts = (vs: [string, number][]): PointIndice[] => vs.map(([date, value]) => ({ date, value }));

describe("le repli maximum", () => {
  it("rend le pire recul ET les deux dates qui le bornent", () => {
    /* « −20 % » sans dire d'où ne se vérifie pas et ne se raconte pas. */
    const r = repliMaximum(pts([["2024-01-02", 100], ["2024-03-01", 120], ["2024-06-01", 96], ["2024-09-01", 130]]));
    expect(r.pct).toBeCloseTo(-20, 6);
    expect(r.sommetLe).toBe("2024-03-01");
    expect(r.creuxLe).toBe("2024-06-01");
  });

  it("rend zéro sur une série qui ne recule jamais", () => {
    expect(repliMaximum(pts([["2024-01-02", 100], ["2024-02-02", 110]])).pct).toBe(0);
  });

  it("ignore les niveaux à zéro, qui sont des séances sans indice", () => {
    const r = repliMaximum(pts([["2024-01-02", 100], ["2024-02-02", 0], ["2024-03-02", 90]]));
    expect(r.pct).toBeCloseTo(-10, 6);
  });
});

describe("la volatilité", () => {
  it("se calcule au pas MENSUEL, sur le dernier niveau de chaque mois", () => {
    /* Au pas quotidien, l'écart type d'une série qui ne bouge qu'un jour sur
       cinq mesure la fréquence de cotation et non le risque : il tend vers
       zéro quand le marché s'assèche, soit l'inverse de la vérité. */
    const m = parMois(pts([["2024-01-02", 100], ["2024-01-31", 110], ["2024-02-28", 121]]));
    expect(m.map((x) => x.m)).toEqual(["2024-01", "2024-02"]);
    expect(m[0].v).toBe(110);
    expect(m[1].r).toBeCloseTo(10, 6);
  });

  it("ne rend rien sous deux mois, plutôt qu'un zéro rassurant", () => {
    expect(volatiliteMensuelle(pts([["2024-01-02", 100], ["2024-01-31", 110]]))).toBeUndefined();
  });

  it("rend l'écart type des variations mensuelles", () => {
    const v = volatiliteMensuelle(pts([["2024-01-31", 100], ["2024-02-29", 110], ["2024-03-31", 121], ["2024-04-30", 133.1]]));
    /* Trois variations de +10 % exactement : aucune dispersion. */
    expect(v).toBeCloseTo(0, 6);
  });
});

describe("la concentration", () => {
  const poids: PoidsValeur[] = [
    { mnemo: "BHC", close: 89000, capTotal: 1310, capFloat: 50, lastDividend: 2500 },
    { mnemo: "SOCAP", close: 50000, capTotal: 229, capFloat: 39, lastDividend: 2325 },
    { mnemo: "BANGE", close: 228085, capTotal: 127, capFloat: 11, lastDividend: 4830 },
    { mnemo: "SAF", close: 38500, capTotal: 48, capFloat: 10, lastDividend: 2200 },
  ];

  it("CHANGE DU SIMPLE AU DOUBLE SELON LA PONDÉRATION, et c'est le sujet", () => {
    /* En capitalisation l'indice est le thermomètre d'un émetteur ; en
       flottant il décrit ce qu'un investisseur peut acheter. */
    const tot = concentration(poids, "total");
    const flo = concentration(poids, "flottant");
    expect(tot.premier).toBeGreaterThan(70);
    expect(flo.premier).toBeLessThan(50);
    expect(tot.nom).toBe("BHC");
    expect(flo.nom).toBe("BHC");
  });

  it("additionne les trois premiers, dans l'ordre des parts", () => {
    const c = concentration(poids, "total");
    expect(c.parts.map((x) => x.mnemo)).toEqual(["BHC", "SOCAP", "BANGE", "SAF"]);
    expect(c.troisPremiers).toBeCloseTo(c.parts[0].pct + c.parts[1].pct + c.parts[2].pct, 6);
  });

  it("ne divise pas par zéro sur une cote vide", () => {
    expect(concentration([], "total")).toEqual({ premier: 0, troisPremiers: 0, parts: [] });
  });
});

describe("le rendement du dividende", () => {
  it("SE DIVISE PAR LA SOMME DES POIDS RETENUS, jamais par la cote entière", () => {
    /* Sans ce dénominateur, on additionne des rendements multipliés par des
       milliards : la maquette a annoncé 5 460 %. */
    const r = rendementDuDividende(
      [
        { mnemo: "A", close: 100, capTotal: 900, capFloat: 90, lastDividend: 5 },
        { mnemo: "B", close: 100, capTotal: 100, capFloat: 10, lastDividend: 1 },
      ],
      "total",
    );
    /* 5 % pondéré 900 et 1 % pondéré 100 : 4,6 %. */
    expect(r.pct).toBeCloseTo(4.6, 6);
    expect(r.comptees).toBe(2);
  });

  it("NE COMPTE PAS UNE VALEUR SANS DIVIDENDE COMME EN VERSANT ZÉRO", () => {
    /* On ne sait pas, et ignorer la différence entre « zéro » et « inconnu »
       ferait baisser le rendement de toute la cote sans raison. */
    const r = rendementDuDividende(
      [
        { mnemo: "A", close: 100, capTotal: 900, capFloat: 90, lastDividend: 5 },
        { mnemo: "B", close: 100, capTotal: 100, capFloat: 10 },
      ],
      "total",
    );
    expect(r.pct).toBeCloseTo(5, 6);
    expect(r.comptees).toBe(1);
    expect(r.total).toBe(2);
  });

  it("ne rend rien quand aucune valeur ne verse", () => {
    expect(rendementDuDividende([{ mnemo: "A", close: 100, capTotal: 10, capFloat: 1 }], "total").pct).toBeUndefined();
  });
});

describe("le souffle du marché", () => {
  it("COMPTE DES COUPLES VALEUR-SÉANCE, pas des séances", () => {
    /* « 20 % des séances ont un échange » et « 20 % des cotations ont un
       échange » sont deux phrases différentes, et c'est la seconde qui dit si
       une valeur se négocie. */
    const s = souffle([
      { quotes: [{ sessionDate: "2026-01-05", volumeTraded: 10, variationPct: 1 }, { sessionDate: "2026-01-06" }] },
      { quotes: [{ sessionDate: "2026-01-05" }, { sessionDate: "2026-01-06", trades: 2 }] },
    ]);
    expect(s).toEqual({ cotations: 4, negociees: 2, bougees: 1, seances: 2 });
  });
});

describe("les niveaux distincts", () => {
  it("mesurent l'immobilité : combien de valeurs différentes pour combien de séances", () => {
    expect(niveauxDistincts(pts([["2024-01-02", 100], ["2024-01-03", 100], ["2024-01-04", 101]]))).toEqual({ distincts: 2, points: 3 });
  });
});

describe("tout d'un coup", () => {
  it("rend les six mesures et la pondération retenue", () => {
    const s = santeIndice(
      pts([["2024-01-31", 100], ["2024-02-29", 90], ["2024-03-29", 95]]),
      [{ mnemo: "A", close: 100, capTotal: 100, capFloat: 20, lastDividend: 4 }],
      [{ quotes: [{ sessionDate: "2024-01-31", volumeTraded: 5 }] }],
      "flottant",
    );
    expect(s.ponderation).toBe("flottant");
    expect(s.repli.pct).toBeCloseTo(-10, 6);
    expect(s.concentration.premier).toBe(100);
    expect(s.rendement.pct).toBeCloseTo(4, 6);
    expect(s.souffle.negociees).toBe(1);
    expect(s.niveaux.distincts).toBe(3);
  });
});

/**
 * LE RENDEMENT TOTAL, LE BÊTA ET LES AVANCES-RECULS.
 *
 * Les trois mesures que le tableau de fin de page annonçait comme calculables
 * aujourd'hui. Chacune a un piège, et chaque piège a son cas.
 */
describe("le rendement total", () => {
  const hist = (mnemo: string, q: Partial<CotationLue>[]) => ({ mnemo, quotes: q.map((x) => ({ sessionDate: "", ...x }) as CotationLue) });

  it("NE COMPTE UN DIVIDENDE QU'UNE FOIS, le bulletin le reportant des mois durant", () => {
    /* « Dernier dividende » est une colonne d'état, pas un événement : elle
       répète le même montant à chaque séance jusqu'au suivant. */
    const { evenements } = evenementsDeDividende([
      hist("A", [
        { sessionDate: "2024-05-02", lastDividend: 100, dividendDate: "2024-05-02", dividendYear: 2023, sharesTotal: 1000 },
        { sessionDate: "2024-05-03", lastDividend: 100, dividendDate: "2024-05-02", dividendYear: 2023, sharesTotal: 1000 },
        { sessionDate: "2025-05-02", lastDividend: 120, dividendDate: "2025-05-02", dividendYear: 2024, sharesTotal: 1000 },
      ]),
    ]);
    expect(evenements).toHaveLength(2);
    expect(evenements[0]).toEqual({ date: "2024-05-02", mnemo: "A", parAction: 100, total: 100000 });
  });

  it("UN EXERCICE, UN PAIEMENT : la BVMAC re-date le même dividende un an plus tard", () => {
    /* Mesuré : BANGE 2022 paraît au 29 juillet 2023 sur 358 séances, puis au
       19 septembre 2024 sur six. Compter les deux faisait payer deux fois. */
    const { evenements, conflits } = evenementsDeDividende([
      hist("BANGE", [
        ...Array.from({ length: 8 }, (_, i) => ({ sessionDate: `2023-08-0${i + 1}`, lastDividend: 8397.4, dividendDate: "2023-07-29", dividendYear: 2022, sharesTotal: 558_000 })),
        { sessionDate: "2024-09-20", lastDividend: 8397.4, dividendDate: "2024-09-19", dividendYear: 2022, sharesTotal: 558_000 },
      ]),
    ]);
    expect(evenements).toHaveLength(1);
    expect(evenements[0].date).toBe("2023-07-29");
    expect(conflits).toHaveLength(1);
  });

  it("LA MAJORITÉ DES BULLETINS FAIT FOI sur un montant corrigé", () => {
    /* BANGE 2024 : 4 025,33 sur 241 séances contre 4 472,59 sur deux. Le
       nombre de séances est un fait, « le dernier publié » serait un pari. */
    const { evenements } = evenementsDeDividende([
      hist("BANGE", [
        ...Array.from({ length: 6 }, (_, i) => ({ sessionDate: `2025-08-1${i + 2}`, lastDividend: 4025.33, dividendDate: "2025-08-11", dividendYear: 2024, sharesTotal: 558_000 })),
        { sessionDate: "2025-08-20", lastDividend: 4472.59, dividendDate: "2025-08-11", dividendYear: 2024, sharesTotal: 558_000 },
      ]),
    ]);
    expect(evenements).toHaveLength(1);
    expect(evenements[0].parAction).toBe(4025.33);
  });

  it("garde la date la plus ancienne quand deux rapports pèsent autant", () => {
    const { evenements } = evenementsDeDividende([
      hist("A", [
        { sessionDate: "2024-06-01", lastDividend: 100, dividendDate: "2024-05-02", dividendYear: 2023, sharesTotal: 1000 },
        { sessionDate: "2024-10-01", lastDividend: 100, dividendDate: "2024-09-02", dividendYear: 2023, sharesTotal: 1000 },
      ]),
    ]);
    expect(evenements[0].date).toBe("2024-05-02");
  });

  it("ajoute le détachement au rendement du prix, rapporté à la capitalisation de la veille", () => {
    /* Prix plat, un détachement de 10 % de la capitalisation : le porteur a
       gagné dix pour cent, l'indice de prix n'en dit rien. */
    const points = pts([["2024-05-01", 100], ["2024-05-02", 100]]);
    const h = [
      hist("A", [
        { sessionDate: "2024-05-01", marketCapTotal: 1000, close: 10 },
        { sessionDate: "2024-05-02", marketCapTotal: 1000, close: 10, lastDividend: 1, dividendDate: "2024-05-02", sharesTotal: 100 },
      ]),
    ];
    const r = rendementTotal(points, h);
    expect(r.prix).toBeCloseTo(0, 6);
    expect(r.total).toBeCloseTo(10, 6);
    expect(r.detachements).toBe(1);
  });

  it("rend la performance du prix seul quand rien n'est détaché", () => {
    const r = rendementTotal(pts([["2024-05-01", 100], ["2024-06-01", 110]]), [hist("A", [{ sessionDate: "2024-05-01", marketCapTotal: 1000 }])]);
    expect(r.prix).toBeCloseTo(10, 6);
    expect(r.total).toBeCloseTo(10, 6);
    expect(r.detachements).toBe(0);
  });

  it("ne rend rien sous deux points", () => {
    expect(rendementTotal(pts([["2024-05-01", 100]]), []).serie).toEqual([]);
  });
});

describe("le bêta", () => {
  const moisDe = (mnemo: string, cours: [string, number][], variations = 0) => ({
    mnemo,
    quotes: cours.map(([sessionDate, close], i) => ({ sessionDate, close, variationPct: i < variations ? 1 : 0 })),
  });

  it("SE TAIT SOUS TROIS MOIS, plutôt que de rendre un chiffre sur deux points", () => {
    const b = betaMensuel(pts([["2024-01-31", 100], ["2024-02-29", 110]]), [moisDe("A", [["2024-01-31", 10], ["2024-02-29", 11]])]);
    expect(b[0].beta).toBeUndefined();
    expect(b[0].mois).toBe(1);
  });

  it("rend un bêta de un pour une valeur qui suit l'indice exactement", () => {
    const dates: [string, number][] = [["2024-01-31", 100], ["2024-02-29", 110], ["2024-03-31", 99], ["2024-04-30", 118.8]];
    const b = betaMensuel(pts(dates), [moisDe("A", dates)]);
    expect(b[0].beta).toBeCloseTo(1, 6);
    expect(b[0].mois).toBe(3);
  });

  it("COMPTE LES MOIS OÙ LA VALEUR A BOUGÉ, qui disent si le bêta veut dire quelque chose", () => {
    /* Une valeur immobile rend un bêta de zéro : ce n'est pas de la stabilité,
       c'est l'absence d'échange, et il faut pouvoir le voir. */
    const dates: [string, number][] = [["2024-01-31", 100], ["2024-02-29", 110], ["2024-03-31", 99], ["2024-04-30", 118.8]];
    const plate: [string, number][] = dates.map(([d]) => [d, 50]);
    const b = betaMensuel(pts(dates), [moisDe("A", plate)]);
    expect(b[0].beta).toBeCloseTo(0, 6);
    expect(b[0].moisActifs).toBe(0);
  });

  it("compte les hausses et les baisses de chaque valeur", () => {
    const b = betaMensuel(pts([["2024-01-31", 100]]), [
      { mnemo: "A", quotes: [{ sessionDate: "2024-01-30", variationPct: 2 }, { sessionDate: "2024-01-31", variationPct: -1 }, { sessionDate: "2024-02-01" }] },
    ]);
    expect(b[0].hausses).toBe(1);
    expect(b[0].baisses).toBe(1);
  });
});
