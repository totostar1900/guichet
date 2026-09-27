import { describe, expect, it } from "vitest";
import type { AuctionResult } from "@/lib/market/auction-results";
import { buildCurve, horizon, serie, spreadComparable, spreads, SPREAD_COMPARABLE_DAYS } from "@/lib/market/curve";
import { actuarialFromDiscount, auctionYield, priceOf, tenorDays, tenorYears, vieRestante, yieldMissing, ytm } from "@/lib/market/yield";

/**
 * Le rendement, et ce qu'il ne faut jamais lui faire dire.
 *
 * Trois chemins mènent à un chiffre : le Trésor l'imprime, un prix et un
 * coupon le donnent, un taux précompté s'y convertit. Les trois se ressemblent
 * une fois tracés, et c'est précisément pourquoi chacun porte son origine. Les
 * règles ci-dessous portent moins sur l'arithmétique, qui est celle de tout le
 * monde, que sur ce que le code refuse de faire : combler un blanc, moyenner
 * deux pays, ou présenter un écart de six semaines comme un écart de crédit.
 */

const s = (over: Partial<AuctionResult>): AuctionResult => ({
  id: over.id ?? "x",
  country: "Congo",
  instrument: "BTA",
  tenor: "52 semaines",
  sessionOn: "2026-09-15",
  abondement: false,
  sourceUrl: `https://beac.int/${over.id ?? "x"}.pdf`,
  sourceTitle: "RESULTATS",
  createdAt: "2026-09-16T10:00:00Z",
  updatedAt: "2026-09-16T10:00:00Z",
  ...over,
});
const relue = (over: Partial<AuctionResult>) => s({ confirmedBy: "Desk", confirmedAt: "2026-09-16T10:00:00Z", ...over });

describe("les durées", () => {
  it("comptent les jours de la BEAC, pas des trimestres ronds", () => {
    // Treize semaines font quatre-vingt-onze jours : arrondir à trois mois
    // déplacerait le rendement de plusieurs points de base.
    expect(tenorDays("13 semaines")).toBe(91);
    expect(tenorDays("26 semaines")).toBe(182);
    expect(tenorDays("52 semaines")).toBe(364);
    expect(tenorDays("3 ans")).toBe(1095);
    expect(tenorDays("—")).toBeUndefined();
    expect(tenorDays(undefined)).toBeUndefined();
  });

  it("donnent une abscisse en années", () => {
    expect(tenorYears("52 semaines")).toBeCloseTo(0.997, 2);
    expect(tenorYears("5 ans")).toBeCloseTo(5, 5);
  });
});

describe("la vie restante", () => {
  /**
   * L'étiquette nomme la ligne, l'échéance la date.
   *
   * « OTA-3 ans 6,50 % 27-JUIN-2027 », adjugée le 21 juillet 2026 : le titre
   * s'appelle trois ans parce que c'est la durée de la ligne à son émission, et
   * il lui restait onze mois. Le communiqué congolais du 15 septembre 2026 écrit
   * même « par abondement » en toutes lettres. Actualiser sur l'étiquette
   * donnait 7,66 % là où la pièce dit 10,5 % : trois cents points de base sur un
   * chiffre affiché.
   */
  it("prend l'échéance imprimée avant l'étiquette, et dit laquelle", () => {
    const v = vieRestante({ tenor: "3 ans", sessionOn: "2026-07-21", maturityOn: "2027-06-27" });
    expect(v!.from).toBe("échéance");
    expect(v!.years).toBeCloseTo(0.93, 2);
  });

  it("retombe sur l'étiquette quand l'échéance manque, et le dit aussi", () => {
    const v = vieRestante({ tenor: "3 ans", sessionOn: "2026-07-21" });
    expect(v!.from).toBe("durée annoncée");
    expect(v!.years).toBeCloseTo(3, 5);
  });

  /**
   * Une échéance déjà passée n'est pas une vie restante négative : c'est une
   * lecture douteuse, et l'étiquette vaut mieux qu'un nombre absurde.
   */
  it("ignore une échéance antérieure à la séance", () => {
    expect(vieRestante({ tenor: "5 ans", sessionOn: "2026-07-21", maturityOn: "2024-06-27" })!.from).toBe("durée annoncée");
  });

  it("ne dit rien quand ni l'échéance ni l'étiquette ne se lisent", () => {
    expect(vieRestante({ tenor: "—", sessionOn: "2026-07-21" })).toBeUndefined();
  });
});

describe("le taux précompté", () => {
  /**
   * Un bon se vend escompté : on paie moins de cent, on reçoit cent. Le taux
   * affiché est l'escompte, jamais le rendement, et il est toujours le plus
   * petit des deux. Confondre les deux aplatit la courbe là où elle est la
   * plus lue.
   */
  it("vaut toujours moins que le rendement qu'il procure", () => {
    const y = actuarialFromDiscount(6.97, 364);
    expect(y).toBeDefined();
    expect(y!).toBeGreaterThan(6.97);
    expect(y!).toBeCloseTo(7.6, 1);
  });

  it("s'écarte d'autant plus que la durée est longue", () => {
    const court = actuarialFromDiscount(6.6, 91)! - 6.6;
    const long = actuarialFromDiscount(6.6, 364)! - 6.6;
    expect(long).toBeGreaterThan(court);
  });

  it("refuse un escompte qui mangerait tout le prix", () => {
    expect(actuarialFromDiscount(400, 364)).toBeUndefined();
    expect(actuarialFromDiscount(6, 0)).toBeUndefined();
  });
});

describe("le rendement à l'échéance", () => {
  it("rend le coupon quand l'obligation s'adjuge au pair", () => {
    expect(ytm(100, 6.5, 5)).toBeCloseTo(6.5, 6);
  });

  it("dépasse le coupon sous le pair, et reste dessous au-dessus", () => {
    expect(ytm(95, 6.25, 5)!).toBeGreaterThan(6.25);
    expect(ytm(103, 6.25, 5)!).toBeLessThan(6.25);
  });

  it("vérifie l'actualisation elle-même", () => {
    // 95,00 % sur cinq ans à 6,25 % : la somme actualisée au rendement rendu
    // doit redonner le prix, sans quoi la dichotomie ment.
    const y = ytm(95, 6.25, 5)! / 100;
    let v = 0;
    for (let t = 1; t <= 5; t++) v += 6.25 / (1 + y) ** t;
    v += 100 / (1 + y) ** 5;
    expect(v).toBeCloseTo(95, 6);
  });

  /**
   * Une demi-année n'est plus un refus : c'est la vie restante d'un abondement,
   * et la refuser laissait un trou sur la courbe là où la pièce donnait un
   * chiffre. Ce qui reste refusé est l'absurde.
   */
  it("accepte une durée brisée et refuse l'absurde", () => {
    expect(ytm(95, 6, 0.5)).toBeGreaterThan(6);
    expect(ytm(0, 6, 5)).toBeUndefined();
    expect(ytm(95, 6, 0)).toBeUndefined();
    expect(ytm(95, 6, -1)).toBeUndefined();
    expect(ytm(95, 6, 99)).toBeUndefined();
  });
});

describe("le prix", () => {
  it("se convertit depuis les francs par titre, et le dit", () => {
    const p = priceOf({ priceAvgFcfa: 9899.45 });
    expect(p!.pct).toBeCloseTo(98.9945, 4);
    // L'espace du français est insécable : on cherche la phrase, pas le nombre formaté.
    expect(p!.assumed!.key).toContain("valeur nominale");
  });

  /**
   * Le Trésor gabonais publie deux conventions dans le même tableau : ses prix
   * minimum, maximum et limite sont pied de coupon, son prix moyen pondéré
   * inclut le couru. Une moyenne au-dessus du maximum proposé n est pas une
   * moyenne de la même chose, et l actualiser comme un prix pied de coupon
   * écraserait le rendement de tout le coupon couru.
   */
  it("écarte un prix moyen qui dépasse le maximum proposé", () => {
    const p = priceOf({ priceMax: 91.5, priceLimit: 91.5, priceAvg: 93.7937 });
    expect(p!.pct).toBe(91.5);
    expect(p!.assumed!.key).toContain("coupon couru");
  });

  it("garde le prix moyen quand il tient dans les bornes", () => {
    expect(priceOf({ priceMax: 95, priceLimit: 91, priceAvg: 93 })).toEqual({ pct: 93 });
  });

  /**
   * Le Trésor congolais imprime « maximum 90,00 » puis « minimum 95,00 ».
   *
   * Aucune séance n'arrive ici dans ce désordre, l'ingestion triant déjà ses
   * bornes : ce cliquet garde une porte plutôt qu'il n'en répare une. Il vaut
   * la peine parce que onze rendements gabonais reposent sur cette comparaison,
   * et qu'ils dépendraient sinon d'un tri fait dans un autre fichier.
   */
  it("trie les bornes au lieu de croire leurs étiquettes", () => {
    expect(priceOf({ priceMin: 95, priceMax: 90, priceLimit: 90, priceAvg: 90.59 })).toEqual({ pct: 90.59 });
    // Le cas gabonais reste attrapé : 93,79 dépasse le haut réel de la fourchette.
    const ga = priceOf({ priceMin: 88, priceMax: 91.5, priceLimit: 91.5, priceAvg: 93.7937 });
    expect(ga!.pct).toBe(91.5);
    expect(ga!.assumed!.key).toContain("coupon couru");
  });

  it("préfère un pourcentage imprimé à une conversion", () => {
    expect(priceOf({ priceAvg: 95, priceAvgFcfa: 9899.45 })).toEqual({ pct: 95 });
  });
});

describe("le rendement d'une séance", () => {
  it("prend ce que le Trésor imprime avant ce que nous calculons", () => {
    const y = auctionYield({ instrument: "OTA", tenor: "5 ans", yieldAvg: 4.36, priceAvg: 95, couponRate: 6.25 });
    expect(y).toEqual({ pct: 4.36, origin: "imprimé", assumptions: [] });
  });

  it("convertit un bon, et nomme les conventions", () => {
    const y = auctionYield({ instrument: "BTA", tenor: "52 semaines", rateAvg: 6.97 });
    expect(y!.origin).toBe("taux précompté");
    expect(y!.pct).toBeCloseTo(7.6, 1);
    expect(y!.assumptions.map((h) => h.key).join(" ")).toContain("360");
  });

  it("calcule une obligation, et déclare l'échéancier supposé", () => {
    const y = auctionYield({ instrument: "OTA", tenor: "5 ans", priceAvg: 95, couponRate: 6.25 });
    expect(y!.origin).toBe("prix et coupon");
    expect(y!.assumptions.map((h) => h.key).join(" ")).toContain("in fine");
  });

  /**
   * L'abondement du 21 juillet 2026, sur la pièce.
   *
   * « CG2J00000578 OTA-3 ans 6,50 % 27-JUIN-2027 ». Le calcul sur l'étiquette
   * donnait 7,66 %, celui sur l'échéance 10,5 %. Le second est le rendement
   * qu'un acheteur a réellement obtenu, et c'est celui qui doit sortir d'ici.
   */
  it("actualise un abondement sur ce qu'il lui reste à courir", () => {
    const y = auctionYield({ instrument: "OTA", tenor: "3 ans", sessionOn: "2026-07-21", maturityOn: "2027-06-27", priceAvg: 97, couponRate: 6.5 });
    expect(y!.pct).toBeCloseTo(10.5, 0);
    expect(y!.assumptions.map((h) => h.key).join(" ")).toContain("échéance imprimée");
    // Le chiffre qu'on affichait, et qu'aucune pièce ne portait.
    expect(auctionYield({ instrument: "OTA", tenor: "3 ans", priceAvg: 97, couponRate: 6.5 })!.pct).toBeCloseTo(7.66, 1);
  });

  it("garde le résultat entier quand la vie restante tombe juste", () => {
    // Un titre à cinq ans pleins ne change pas de rendement parce que le calcul
    // sait désormais compter les années brisées.
    expect(ytm(95, 6.25, 5)).toBeCloseTo(7.4853, 3);
    const y = auctionYield({ instrument: "OTA", tenor: "5 ans", sessionOn: "2026-09-15", maturityOn: "2031-09-15", priceAvg: 95, couponRate: 6.25 });
    expect(y!.pct).toBeCloseTo(7.4853, 2);
  });

  /**
   * Le seul refus qui compte.
   *
   * Un prix d'obligation sans coupon ne dit rien : 95,00 % peut être un
   * rendement de 7 % comme de 12 % selon ce que la ligne paie. Le combler par
   * un coupon moyen donnerait une courbe lisse et fausse, dont personne ne
   * verrait qu'elle est fausse.
   */
  it("ne fabrique pas un rendement quand le coupon manque", () => {
    const sans = { instrument: "OTA" as const, tenor: "5 ans", priceAvg: 95 };
    expect(auctionYield(sans)).toBeUndefined();
    expect(yieldMissing(sans)).toContain("coupon");
  });

  it("ne fabrique rien non plus sans durée", () => {
    expect(auctionYield({ instrument: "BTA", tenor: "—", rateAvg: 6.5 })).toBeUndefined();
    expect(yieldMissing({ instrument: "BTA", tenor: "—", rateAvg: 6.5 })).toContain("durée");
  });
});

describe("la courbe", () => {
  const lot = [
    relue({ id: "cg26", country: "Congo", tenor: "26 semaines", rateAvg: 7.0, sessionOn: "2026-09-15", bidders: 5, announced: 10e9, bid: 5.34e9 }),
    relue({ id: "cg52", country: "Congo", tenor: "52 semaines", rateAvg: 6.97, sessionOn: "2026-09-15", bidders: 4, announced: 10e9, bid: 12e9 }),
    relue({ id: "cg3a", country: "Congo", instrument: "OTA", tenor: "3 ans", priceAvg: 90, couponRate: 6.5, sessionOn: "2026-09-15", bidders: 5, announced: 5e9, bid: 6e9 }),
    relue({ id: "cm26", country: "Cameroun", tenor: "26 semaines", rateAvg: 6.7, sessionOn: "2026-08-03", bidders: 3, announced: 10e9, bid: 11e9 }),
    // Sans coupon : elle ne donne pas de point, et le trou se nomme.
    relue({ id: "cm5a", country: "Cameroun", instrument: "OTA", tenor: "5 ans", priceAvg: 95, sessionOn: "2026-09-14" }),
    // Pas relue : elle n'entre pas, quels que soient ses chiffres.
    s({ id: "td", country: "Tchad", tenor: "26 semaines", rateAvg: 8.5, sessionOn: "2026-09-10" }),
  ];

  it("ne retient que les séances relues", () => {
    const c = buildCurve(lot, { on: "2026-09-25" });
    expect(c.countries.map((x) => x.country).sort()).toEqual(["Cameroun", "Congo"]);
  });

  it("compte et nomme ce qui manque au lieu de le combler", () => {
    const c = buildCurve(lot, { on: "2026-09-25" });
    expect(c.gaps.map((g) => g.id)).toEqual(["cm5a"]);
    expect(c.gaps[0].why).toContain("coupon");
  });

  it("range les points par durée croissante, en années", () => {
    const c = buildCurve(lot, { on: "2026-09-25" });
    const congo = c.countries.find((x) => x.country === "Congo")!;
    expect(congo.points.map((p) => p.tenor)).toEqual(["26 semaines", "52 semaines", "3 ans"]);
    expect(congo.points[0].years).toBeLessThan(congo.points[2].years);
  });

  it("écarte ce qui est hors de la fenêtre", () => {
    const c = buildCurve(lot, { on: "2026-09-25", windowDays: 20 });
    expect(c.countries.map((x) => x.country)).toEqual(["Congo"]);
  });

  it("préfère une séance représentative à une séance plus récente mais mince", () => {
    const deux = [
      relue({ id: "vieille", country: "Gabon", tenor: "26 semaines", rateAvg: 6.0, sessionOn: "2026-09-01", bidders: 6, announced: 10e9, bid: 15e9 }),
      relue({ id: "mince", country: "Gabon", tenor: "26 semaines", rateAvg: 9.0, sessionOn: "2026-09-20", bidders: 1, announced: 10e9, bid: 1e9 }),
    ];
    const c = buildCurve(deux, { on: "2026-09-25" });
    expect(c.countries[0].points[0].from.id).toBe("vieille");
  });

  /**
   * Le coupon arrivé après la signature.
   *
   * La colonne est née après que cinquante-sept séances eurent été relues. Le
   * robot peut la remplir, sans quoi la courbe reste sans obligations ; ce qui
   * tient la règle des quatre yeux n'est pas l'abstention mais la trace, et
   * les deux horodatages la portent déjà.
   */
  it("marque un point dont un champ est entré après la confirmation", () => {
    const apres = relue({
      id: "tard",
      country: "Gabon",
      instrument: "OTA",
      tenor: "5 ans",
      priceAvg: 95,
      couponRate: 6.25,
      confirmedAt: "2026-09-16T10:00:00Z",
      updatedAt: "2026-09-27T08:00:00Z",
    });
    const tot = relue({ id: "tot", country: "Gabon", instrument: "OTA", tenor: "3 ans", priceAvg: 96, couponRate: 6, confirmedAt: "2026-09-16T10:00:00Z", updatedAt: "2026-09-16T10:00:20Z" });
    const c = buildCurve([apres, tot], { on: "2026-09-27" });
    const pts = c.countries[0].points;
    expect(pts.find((p) => p.from.id === "tard")!.toVerify).toBe(true);
    expect(pts.find((p) => p.from.id === "tot")!.toVerify).toBe(false);
  });

  it("garde l'âge du point le plus vieux : une courbe ne vaut pas mieux que lui", () => {
    const c = buildCurve(lot, { on: "2026-09-25" });
    expect(c.countries.find((x) => x.country === "Cameroun")!.oldestDays).toBe(53);
  });
});

describe("l'écart entre deux Trésors", () => {
  const lot = [
    relue({ id: "cg", country: "Congo", tenor: "26 semaines", rateAvg: 7.0, sessionOn: "2026-09-15" }),
    relue({ id: "cm", country: "Cameroun", tenor: "26 semaines", rateAvg: 6.7, sessionOn: "2026-08-03" }),
  ];

  it("se compte en points de base sur les rendements, pas sur les taux affichés", () => {
    const c = buildCurve(lot, { on: "2026-09-25" });
    const [e] = spreads(c, "Congo", "Cameroun");
    expect(e.bp).toBeGreaterThan(0);
    // Les deux sont des bons convertis : l'écart de rendement n'est pas
    // exactement l'écart des taux précomptés.
    expect(e.bp).not.toBe(30);
  });

  /**
   * L'écart daté.
   *
   * Six semaines séparent les deux séances. La soustraction fonctionne quand
   * même, et c'est le piège : ce qu'elle donne n'est pas un écart de crédit,
   * c'est un écart de date. Le chiffre porte donc toujours sa distance.
   */
  it("porte le nombre de jours qui sépare les deux séances", () => {
    const c = buildCurve(lot, { on: "2026-09-25" });
    const [e] = spreads(c, "Congo", "Cameroun");
    expect(e.apart).toBe(43);
    expect(e.apart).toBeGreaterThan(SPREAD_COMPARABLE_DAYS);
  });

  /**
   * Un « 3 ans » n'est pas comparable à un « 3 ans ».
   *
   * Un abondement congolais à onze mois du terme contre une obligation
   * camerounaise à trois ans pleins portent la même étiquette et deux horizons
   * sans rapport. L'écart qu'on en tirerait ne dirait rien d'une signature :
   * l'appariement se fait donc sur la vie restante.
   */
  it("n'apparie pas deux étiquettes identiques à des horizons différents", () => {
    expect(spreadComparable(3, 3.01)).toBe(true);
    expect(spreadComparable(0.93, 3)).toBe(false);
    const c = buildCurve(
      [
        relue({ id: "cgab", country: "Congo", instrument: "OTA", tenor: "3 ans", sessionOn: "2026-09-15", maturityOn: "2027-08-15", priceAvg: 90, couponRate: 6 }),
        relue({ id: "cm3", country: "Cameroun", instrument: "OTA", tenor: "3 ans", sessionOn: "2026-09-15", maturityOn: "2029-09-15", priceAvg: 95, couponRate: 6 }),
      ],
      { on: "2026-09-25" },
    );
    expect(spreads(c, "Congo", "Cameroun")).toHaveLength(0);
  });
});

describe("la courbe passée à la vie restante", () => {
  /**
   * Deux abondements peuvent s'appeler « 6 ans » le même mois.
   *
   * Le dédoublonnage se faisait par étiquette : le second point écrasait le
   * premier, et la courbe perdait une observation sans rien dire. C'est
   * l'échéance qui identifie la ligne.
   */
  it("garde deux abondements de même nom quand leurs échéances diffèrent", () => {
    const c = buildCurve(
      [
        relue({ id: "a", country: "Congo", instrument: "OTA", tenor: "6 ans", sessionOn: "2026-09-15", maturityOn: "2028-03-31", priceAvg: 90, couponRate: 6 }),
        relue({ id: "b", country: "Congo", instrument: "OTA", tenor: "6 ans", sessionOn: "2026-09-08", maturityOn: "2031-03-31", priceAvg: 90, couponRate: 6 }),
      ],
      { on: "2026-09-25" },
    );
    const pts = c.countries[0].points;
    expect(pts).toHaveLength(2);
    // Et ils ne se posent pas au même endroit, ce qui est tout l'intérêt.
    expect(pts[0].years).toBeLessThan(2);
    expect(pts[1].years).toBeGreaterThan(4);
  });

  it("fond bien deux séances de la même ligne, en gardant la plus récente", () => {
    const c = buildCurve(
      [
        relue({ id: "vieux", country: "Congo", instrument: "OTA", tenor: "6 ans", sessionOn: "2026-08-15", maturityOn: "2028-03-31", priceAvg: 88, couponRate: 6 }),
        relue({ id: "recent", country: "Congo", instrument: "OTA", tenor: "6 ans", sessionOn: "2026-09-15", maturityOn: "2028-03-31", priceAvg: 90, couponRate: 6 }),
      ],
      { on: "2026-09-25" },
    );
    expect(c.countries[0].points).toHaveLength(1);
    expect(c.countries[0].points[0].from.id).toBe("recent");
  });

  /**
   * L'abscisse mise en mots.
   *
   * Sous l'année les mois se lisent mieux que les décimales, et au-delà une
   * décimale suffit : un abondement se pose à 1,5 an, pas à 1,54.
   */
  it("nomme l'horizon en mois sous l'année et en années au-delà", () => {
    expect(horizon(0.93)).toEqual({ n: 11, unit: "mois" });
    expect(horizon(1.54)).toEqual({ n: 1.5, unit: "ans" });
    expect(horizon(5)).toEqual({ n: 5, unit: "ans" });
  });
});

describe("la série d'une durée", () => {
  it("suit une même durée dans le temps, du plus ancien au plus récent", () => {
    const lot = [
      relue({ id: "b", country: "Cameroun", tenor: "26 semaines", rateAvg: 6.7, sessionOn: "2026-08-03" }),
      relue({ id: "a", country: "Cameroun", tenor: "26 semaines", rateAvg: 2.37, sessionOn: "2019-08-28" }),
      relue({ id: "autre", country: "Congo", tenor: "26 semaines", rateAvg: 7, sessionOn: "2026-09-15" }),
    ];
    const s26 = serie(lot, "Cameroun", "26 semaines");
    expect(s26.map((p) => p.id)).toEqual(["a", "b"]);
    expect(s26[0].pct).toBeLessThan(s26[1].pct);
  });
});
