import { describe, expect, it } from "vitest";
import { anneesDeTenor, couverture, nommerPays, rapprocher, trimestreDe, vueBeac, type LigneCourbe, type LigneEncours, type LigneOperation } from "@/lib/market/beac-vue";

/**
 * CE QUE LA BEAC PUBLIE, MIS EN SÉRIES.
 *
 * Le module décide d'une seule chose, et elle commande la page : d'où vient un
 * chiffre. Les cas ci-dessous sont ceux qui ont coûté quelque chose, pas des
 * cas d'école : un pays écrit de deux façons, un mois incomplet, une maturité
 * qui n'existe pas le même mois des deux côtés.
 */
const courbe = (mois: string, pays: string, pts: [string, number, number][]): LigneCourbe[] =>
  pts.map(([tenor, annees, taux]) => ({ mois, pays, tenor, annees, taux }));

describe("le nom d'un pays, ramené à un", () => {
  it("reconnaît la Centrafrique sous ses deux écritures", () => {
    /* Mesuré le 15 octobre 2026 : le rapport hebdomadaire écrit
       « Centrafrique », la statistique mensuelle « RCA », et la fiche était
       vide d'un côté. « centrafric » n'est pas dans « Centrafrique ». */
    expect(nommerPays("Centrafrique")).toBe("RCA");
    expect(nommerPays("RCA")).toBe("RCA");
    expect(nommerPays("République Centrafricaine")).toBe("RCA");
  });

  it("reconnaît les six Trésors et la zone", () => {
    expect(nommerPays("CAMEROUN")).toBe("Cameroun");
    expect(nommerPays("GUINEE EQUATORIALE")).toBe("Guinée éq.");
    expect(nommerPays("Guinée éq.")).toBe("Guinée éq.");
    expect(nommerPays("CEMAC")).toBe("CEMAC");
  });

  it("rend tel quel ce qu'il ne reconnaît pas, plutôt que de ranger au hasard", () => {
    expect(nommerPays("Sénégal")).toBe("Sénégal");
    expect(nommerPays(null)).toBe("");
  });
});

describe("la durée d'un titre, en années", () => {
  it("rend les trois unités de la zone", () => {
    expect(anneesDeTenor("26 semaines")).toBeCloseTo(0.5, 6);
    expect(anneesDeTenor("3 mois")).toBeCloseTo(0.25, 6);
    expect(anneesDeTenor("5 ans")).toBe(5);
    expect(anneesDeTenor("3,5A")).toBe(3.5);
  });
  it("refuse ce qui n'est pas une durée", () => {
    expect(anneesDeTenor("—")).toBeUndefined();
    expect(anneesDeTenor("11,60")).toBeUndefined();
  });
});

describe("les séries de la page", () => {
  const SIX: LigneEncours[] = [
    { mois: "2026-06", pays: "CAMEROUN", encours: 2_000_000 },
    { mois: "2026-06", pays: "CONGO", encours: 3_000_000 },
    { mois: "2026-06", pays: "GABON", encours: 3_400_000 },
    { mois: "2026-06", pays: "TCHAD", encours: 1_100_000 },
    { mois: "2026-06", pays: "RCA", encours: 400_000 },
    { mois: "2026-06", pays: "GUINEE EQUATORIALE", encours: 380_000 },
  ];

  it("rend l'encours en milliards, et refait la zone par la somme", () => {
    const v = vueBeac([], SIX, [], []);
    expect(v.encours.Cameroun).toEqual([{ m: "2026-06", v: 2000 }]);
    expect(v.encours.CEMAC).toEqual([{ m: "2026-06", v: 10280 }]);
  });

  it("NE REFAIT PAS LA ZONE SUR UN MOIS INCOMPLET, qui la ferait rétrécir", () => {
    /* Quatre pays sur six un mois donné : additionner donnerait une zone en
       chute de trente pour cent, et le lecteur y verrait un remboursement. */
    const partiel = [...SIX, { mois: "2026-07", pays: "CAMEROUN", encours: 2_100_000 }, { mois: "2026-07", pays: "CONGO", encours: 3_100_000 }];
    const v = vueBeac([], partiel, [], []);
    expect(v.encours.CEMAC?.map((x) => x.m)).toEqual(["2026-06"]);
    expect(v.encours.Cameroun).toHaveLength(2);
  });

  it("range les courbes par mois et par pays, et par maturité croissante", () => {
    const v = vueBeac(courbe("2026-07", "Cameroun", [["5 ans", 5, 9.6], ["1 an", 1, 8.2]]), [], [], []);
    expect(v.courbes["2026-07|Cameroun"].map((q) => q.annees)).toEqual([1, 5]);
    expect(v.moisCourbe).toEqual(["2026-07"]);
    expect(v.maturites).toEqual([1, 5]);
  });

  it("LA PENTE DEMANDE LES DEUX POINTS LE MÊME MOIS", () => {
    /* Prendre le dix ans d'un mois et le un an d'un autre comparerait deux
       dates, pas deux maturités. */
    const lignes = [
      ...courbe("2026-06", "Gabon", [["1 an", 1, 7], ["10 ans", 10, 9.5]]),
      ...courbe("2026-07", "Gabon", [["10 ans", 10, 9.8]]),
    ];
    const v = vueBeac(lignes, [], [], []);
    expect(v.pente.Gabon).toEqual([{ m: "2026-06", v: 2.5 }]);
  });

  it("agrège le prévu, le réalisé et la souscription par mois", () => {
    const ops: LigneOperation[] = [
      { pays: "Congo", operation: "emission", montant: 10e9, montantRealise: 8e9, tauxSouscription: 80, operationOn: "2026-03-04" },
      { pays: "Congo", operation: "abondement", montant: 5e9, montantRealise: 5e9, tauxSouscription: 120, operationOn: "2026-03-18" },
      /* Un remboursement n'est pas une offre : il ne doit pas entrer dans le
         prévu, sans quoi le taux de service n'aurait plus de sens. */
      { pays: "Congo", operation: "remboursement", montant: 4e9, montantRealise: 4e9, operationOn: "2026-03-25" },
    ];
    const v = vueBeac([], [], [], ops);
    expect(v.offre.Congo).toEqual([{ m: "2026-03", prevu: 15, realise: 13, n: 2 }]);
    expect(v.souscription.Congo).toEqual([{ m: "2026-03", v: 100, n: 2 }]);
  });

  it("NE COMPTE DANS L'OFFRE QUE CE DONT LES DEUX CÔTÉS SONT CONNUS", () => {
    /* Mesuré le 15 octobre 2026 : le tableau de bord annonce 2 189 opérations,
       le rapport hebdomadaire n'en a constaté que 1 128. Additionner tout le
       prévu contre le réalisé connu donnait un taux de service de 33 %, qui ne
       mesure pas la demande mais notre retard de lecture. */
    const ops: LigneOperation[] = [
      { pays: "Gabon", operation: "emission", montant: 10e9, montantRealise: 8e9, operationOn: "2026-04-07" },
      { pays: "Gabon", operation: "emission", montant: 20e9, operationOn: "2026-04-21" },
    ];
    const v = vueBeac([], [], [], ops);
    expect(v.offre.Gabon).toEqual([{ m: "2026-04", prevu: 10, realise: 8, n: 1 }]);
  });

  it("range le mur par trimestre d'échéance, et seulement les émissions chiffrées", () => {
    const ops: LigneOperation[] = [
      { pays: "Tchad", operation: "emission", montantRealise: 6e9, operationOn: "2024-01-10", maturityOn: "2027-08-14" },
      { pays: "Tchad", operation: "emission", montantRealise: 4e9, operationOn: "2024-02-10", maturityOn: "2027-09-02" },
      /* Sans montant réalisé, rien à poser sur le mur : une échéance sans
         montant n'est pas une charge, c'est une ligne qu'on ne sait pas. */
      { pays: "Tchad", operation: "emission", operationOn: "2024-03-10", maturityOn: "2027-09-30" },
    ];
    const v = vueBeac([], [], [], ops);
    expect(v.mur.Tchad).toEqual([{ m: "2027-T3", v: 10 }]);
    expect(trimestreDe("2026-01-01")).toBe("2026-T1");
    expect(trimestreDe("2026-12-31")).toBe("2026-T4");
  });
});

describe("nos séances contre leur courbe", () => {
  const v = vueBeac(courbe("2026-07", "Congo", [["1 an", 1, 9.59], ["5 ans", 5, 11.48]]), [], [], []);

  it("rapproche une séance de la maturité voisine", () => {
    const r = rapprocher([{ pays: "Congo", instrument: "BTA", tenor: "52 semaines", sessionOn: "2026-07-14", taux: 6.98 }], v);
    expect(r).toHaveLength(1);
    expect(r[0].beac).toBe(9.59);
    expect(r[0].nous).toBe(6.98);
  });

  it("NE RAPPROCHE PAS DE LOIN : un bon de treize semaines n'est pas le point d'un an", () => {
    /* Sinon l'écart mesuré serait une différence de durée prise pour une
       différence de prix. */
    expect(rapprocher([{ pays: "Congo", instrument: "BTA", tenor: "13 semaines", sessionOn: "2026-07-14", taux: 6.4 }], v)).toEqual([]);
  });

  it("ne rapproche pas une séance d'un mois sans courbe", () => {
    expect(rapprocher([{ pays: "Congo", tenor: "1 an", sessionOn: "2026-05-14", taux: 7 }], v)).toEqual([]);
  });

  it("ignore une séance sans taux relu", () => {
    expect(rapprocher([{ pays: "Congo", tenor: "1 an", sessionOn: "2026-07-14" }], v)).toEqual([]);
  });
});

describe("notre couverture", () => {
  const enc: LigneEncours[] = [
    { mois: "2026-06", pays: "Gabon", encours: 3_000_000 },
    { mois: "2026-07", pays: "Gabon", encours: 3_400_000 },
  ];

  it("compte au dernier mois connu, et laisse de côté ce qui est échu", () => {
    const c = couverture(
      enc,
      [
        { pays: "Gabon", sessionOn: "2024-01-10", maturityOn: "2025-01-10", servi: 50e9 },
        { pays: "Gabon", sessionOn: "2025-01-10", maturityOn: "2030-01-10", servi: 200e9 },
      ],
      [],
    );
    expect(c.auMois).toBe("2026-07");
    const g = c.lignes.find((l) => l.pays === "Gabon")!;
    expect(g.beac).toBe(3400);
    expect(g.communiques).toBe(200);
    expect(g.seances).toBe(2);
  });

  it("compte le flux net : les émissions moins les remboursements", () => {
    const c = couverture(
      enc,
      [],
      [
        { pays: "Gabon", operation: "emission", montantRealise: 100e9, operationOn: "2026-01-05" },
        { pays: "Gabon", operation: "remboursement", montantRealise: 30e9, operationOn: "2026-02-05" },
        { pays: "Gabon", operation: "paiement_interets", montantRealise: 5e9, operationOn: "2026-03-05" },
      ],
    );
    const g = c.lignes.find((l) => l.pays === "Gabon")!;
    expect(g.flux).toBe(70);
    /* Les intérêts comptent comme pièce lue mais pas comme flux de principal. */
    expect(g.operations).toBe(3);
  });

  it("rend les six Trésors même sans une seule pièce, plutôt qu'une table trouée", () => {
    const c = couverture(enc, [], []);
    expect(c.lignes).toHaveLength(6);
    expect(c.lignes.find((l) => l.pays === "RCA")).toEqual({ pays: "RCA", beac: 0, communiques: 0, flux: 0, seances: 0, operations: 0 });
  });
});
