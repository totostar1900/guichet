import { describe, expect, it } from "vitest";
import { applicables, bande, controler, incoherences, passes } from "./coherence";
import type { Quote } from "@/lib/domain/market";

/**
 * LES CINQ CONTRÔLES DE COHÉRENCE D'UNE COTE.
 *
 * Un écart dit ce qui a bougé ; un contrôle dit si ce qu'on lit peut
 * seulement être vrai. Les cinq règles tiennent PAR CONSTRUCTION dans le
 * bulletin, donc une ligne qui les dément n'est pas un événement de marché,
 * c'est un chiffre mal lu. Elles ne jugent pas le marché, elles jugent notre
 * lecture, et c'est ce qui autorise à en faire une alarme.
 */
const q = (o: Partial<Quote> & { isin: string }): Quote => ({
  sessionDate: "2026-10-02",
  bulletinNo: 1,
  instrument: "action",
  mnemo: o.isin.slice(-4),
  issuer: "ESSAI",
  designation: "ESSAI",
  previousClose: 1000,
  previousDate: "2026-10-01",
  open: 1000,
  close: 1000,
  thresholdHigh: 1100,
  thresholdLow: 900,
  variationPct: 0,
  referenceNext: 1000,
  volumeTraded: 0,
  valueTraded: 0,
  trades: 0,
  status: "NC",
  ...o,
});
const trouve = (cs: ReturnType<typeof controler>, id: string) => cs.find((c) => c.id === id)!;
/* Les montants sont écrits à la française, donc séparés par une espace fine
   insécable. L'assertion porte sur les chiffres, pas sur la typographie. */
const sansEspaces = (s: string) => s.replace(/\s/g, " ").replace(/ | /g, " ");

describe("la bande de variation", () => {
  it("vaut dix pour cent sur une action, six sur une obligation", () => {
    expect(bande(q({ isin: "A", instrument: "action" }))).toBe(0.1);
    expect(bande(q({ isin: "B", instrument: "obligation" }))).toBe(0.06);
  });

  it("et zéro avant le 1er novembre 2023, parce que le régime a changé ce jour-là", () => {
    /* Mesuré : seuil haut = cours précédent sur les 501 lignes d'avant, et
       cours précédent × 1,1 sur les 4 340 d'après. Appliquer dix pour cent
       au passé condamnerait toutes les séances de 2023. */
    expect(bande(q({ isin: "A", sessionDate: "2023-10-30" }))).toBe(0);
    expect(bande(q({ isin: "A", sessionDate: "2023-11-01" }))).toBe(0.1);
  });
});

describe("le chaînage des cours", () => {
  const veille = [q({ isin: "X", close: 1000 })];

  it("accepte un précédent égal à la clôture de la veille", () => {
    const cs = controler(veille, [q({ isin: "X", previousClose: 1000 })], true);
    expect(trouve(cs, "chainage").fautes).toEqual([]);
    expect(trouve(cs, "chainage").examinees).toBe(1);
  });

  it("refuse un précédent qui ne la vaut pas, et dit les deux chiffres", () => {
    const cs = controler(veille, [q({ isin: "X", previousClose: 980, thresholdHigh: 1078, thresholdLow: 882 })], true);
    const f = trouve(cs, "chainage").fautes;
    expect(f).toHaveLength(1);
    expect(sansEspaces(f[0].lu), "ce que le bulletin dit").toBe("980");
    expect(sansEspaces(f[0].attendu), "ce que la règle veut").toBe("1 000");
  });

  it("se déclare sans objet entre deux séances éloignées, au lieu de mentir", () => {
    /* Entre le 3 mars et le 2 octobre, le « précédent » de B est la clôture
       du 1er octobre, pas celle de A. La règle ne s'applique pas. */
    const cs = controler(veille, [q({ isin: "X", previousClose: 1500, thresholdHigh: 1650, thresholdLow: 1350 })], false);
    expect(trouve(cs, "chainage").applicable).toBe(false);
    expect(trouve(cs, "chainage").fautes).toEqual([]);
  });
});

describe("la bande, le nominal, le saut", () => {
  it("refuse des seuils qui ne sortent pas du cours précédent", () => {
    const cs = controler([], [q({ isin: "X", previousClose: 1000, thresholdHigh: 1200, thresholdLow: 900 })], true);
    const f = trouve(cs, "bande").fautes[0];
    expect(sansEspaces(f.lu)).toBe("1 200 / 900");
    expect(sansEspaces(f.attendu)).toBe("1 100 / 900");
  });

  it("tolère l'arrondi du bulletin à six centimes près", () => {
    const cs = controler([], [q({ isin: "X", previousClose: 207110, thresholdHigh: 227821, thresholdLow: 186399 })], true);
    expect(trouve(cs, "bande").fautes).toEqual([]);
  });

  it("refuse un nominal restant qui remonte, même entre séances éloignées", () => {
    /* Une obligation amortit : le 5 décembre 2024 la BDEAC 5,6 % est à 8 000
       après avoir été à 10 000. L'inverse n'arrive pas. */
    const a = [q({ isin: "O", instrument: "obligation", nominalRemaining: 8000 })];
    const b = [q({ isin: "O", instrument: "obligation", nominalRemaining: 10000, previousClose: 100, thresholdHigh: 106, thresholdLow: 94, close: 100 })];
    const cs = controler(a, b, false);
    expect(trouve(cs, "nominal").applicable).toBe(true);
    const f = trouve(cs, "nominal").fautes[0];
    expect(sansEspaces(f.lu)).toBe("10 000");
    expect(sansEspaces(f.attendu)).toBe("≤ 8 000");
  });

  it("accepte qu'il descende, qui est son métier", () => {
    const a = [q({ isin: "O", instrument: "obligation", nominalRemaining: 10000 })];
    const b = [q({ isin: "O", instrument: "obligation", nominalRemaining: 8000, previousClose: 100, thresholdHigh: 106, thresholdLow: 94, close: 100 })];
    expect(trouve(controler(a, b, true), "nominal").fautes).toEqual([]);
  });

  it("refuse une clôture qui franchit les seuils de la veille", () => {
    const a = [q({ isin: "X", close: 1000, thresholdHigh: 1100, thresholdLow: 900 })];
    const b = [q({ isin: "X", previousClose: 1000, close: 1250, thresholdHigh: 1100, thresholdLow: 900 })];
    const f = trouve(controler(a, b, true), "saut").fautes;
    expect(f).toHaveLength(1);
    expect(sansEspaces(f[0].lu)).toBe("1 250");
    expect(sansEspaces(f[0].attendu), "les seuils de la veille").toBe("900 – 1 100");
  });
});

describe("un ISIN garde son nom", () => {
  it("signale un mnémonique qui change sous le même ISIN", () => {
    /* La leçon du fonds BGFI, portée sur les cotations : un nom qui bouge
       sous une identité stable est le signe d'une ligne mal lue. */
    const a = [q({ isin: "X", mnemo: "SOCAP" })];
    const b = [q({ isin: "X", mnemo: "SOCAPALM" })];
    const f = trouve(controler(a, b, true), "identite").fautes[0];
    expect(f.lu).toBe("SOCAPALM");
    expect(f.attendu).toBe("SOCAP");
  });

  it("mais une espace ou un trait d'union ne font pas un autre nom", () => {
    const a = [q({ isin: "X", issuer: "FCP BGFI Bank ATLAS" })];
    const b = [q({ isin: "X", issuer: "FCP BGFIBank ATLAS" })];
    expect(trouve(controler(a, b, true), "identite").fautes).toEqual([]);
  });
});

describe("le compte d'ensemble", () => {
  it("ne compte que les contrôles applicables", () => {
    const cs = controler([q({ isin: "X" })], [q({ isin: "X" })], false);
    expect(applicables(cs)).toBe(3);
    expect(passes(cs)).toBe(3);
    expect(incoherences(cs)).toBe(0);
  });

  it("et les cinq passent sur un couple sain", () => {
    const a = [q({ isin: "X", close: 1000 })];
    const b = [q({ isin: "X", previousClose: 1000, close: 1050, thresholdHigh: 1100, thresholdLow: 900 })];
    const cs = controler(a, b, true);
    expect(applicables(cs)).toBe(5);
    expect(passes(cs)).toBe(5);
  });

  it("une cote vide ne déclenche rien : il n'y a rien à juger", () => {
    const cs = controler([], [], true);
    expect(incoherences(cs)).toBe(0);
    expect(cs.every((c) => c.examinees === 0)).toBe(true);
  });
});

/**
 * LES TÉMOINS, et ce qu'ils empêchent.
 *
 * Un contrôle sans faute n'avait rien à montrer, donc ne s'ouvrait pas, donc
 * ressemblait à un contrôle cassé — et un contrôle qui ne montre jamais rien
 * est indiscernable d'un contrôle qui ne tourne pas, la famille de pannes la
 * plus coûteuse de ce projet. Trois lignes vues passer prouvent qu'il a mordu.
 */
describe("les témoins d'un contrôle", () => {
  it("un contrôle qui passe en garde, donc il a quelque chose à ouvrir", () => {
    const a = [q({ isin: "X", close: 1000 })];
    const b = [q({ isin: "X", previousClose: 1000, close: 1050, thresholdHigh: 1100, thresholdLow: 900 })];
    const cs = controler(a, b, true);
    expect(cs.every((c) => c.fautes.length === 0)).toBe(true);
    /* Quatre sur cinq : le nominal n'examine rien sur une action, qui n'en a
       pas. C'EST LE TROISIÈME ÉTAT — applicable, sans faute, et sans rien à
       montrer non plus — et l'écran ne doit pas lui promettre de s'ouvrir. */
    expect(cs.filter((c) => c.temoins.length === 1).map((c) => c.id)).toEqual(["chainage", "bande", "saut", "identite"]);
    expect(cs.find((c) => c.id === "nominal")).toMatchObject({ applicable: true, examinees: 0, temoins: [] });
  });

  it("ils ne dépassent jamais trois, même sur vingt lignes saines", () => {
    const vingt = Array.from({ length: 20 }, (_, i) => `L${i}`);
    const a = vingt.map((isin) => q({ isin, close: 1000 }));
    const b = vingt.map((isin) => q({ isin, previousClose: 1000, close: 1000 }));
    const cs = controler(a, b, true);
    expect(cs.map((c) => c.temoins.length)).toEqual([3, 3, 0, 3, 3]);
  });

  it("un contrôle sans objet n'en a aucun : il reste muet et le dit", () => {
    const a = [q({ isin: "X", close: 1000 })];
    const b = [q({ isin: "X", previousClose: 1000 })];
    const cs = controler(a, b, false);
    for (const c of cs.filter((x) => !x.applicable)) expect(c.temoins).toEqual([]);
  });

  it("la ligne fautive ne devient pas un témoin", () => {
    const a = [q({ isin: "BON", close: 1000 }), q({ isin: "MAL", close: 1000 })];
    const b = [q({ isin: "BON", previousClose: 1000 }), q({ isin: "MAL", previousClose: 777 })];
    const chainage = controler(a, b, true)[0];
    expect(chainage.fautes.map((f) => f.isin)).toEqual(["MAL"]);
    expect(chainage.temoins.map((f) => f.isin)).toEqual(["BON"]);
  });

  it("et le témoin tient les deux montants que la règle a rapprochés", () => {
    const a = [q({ isin: "X", close: 1234 })];
    const b = [q({ isin: "X", previousClose: 1234, close: 1234, thresholdHigh: 1357.4, thresholdLow: 1110.6 })];
    const [chainage] = controler(a, b, true);
    /* L'espace est NORMALISÉE : « fr-FR » sépare les milliers par une espace
       fine insécable (U+202F), qui ne s'écrit pas au clavier et rend une
       assertion littérale illisible à l'échec — « 1 234 » contre « 1 234 ». */
    const plat = (s: string) => s.replace(/\s/g, " ");
    expect(plat(chainage.temoins[0].lu)).toBe("1 234");
    expect(plat(chainage.temoins[0].attendu)).toBe("1 234");
  });
});
