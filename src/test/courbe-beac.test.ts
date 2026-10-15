import { describe, expect, it } from "vitest";
import { anneesDuTenor, moisDuTitre, paysDuTitre } from "@/lib/market/courbe-beac";

/**
 * LA BEAC PUBLIE SA COURBE EN DESSIN, ET IL A FALLU LA LIRE.
 *
 * Deux cent soixante-dix-sept feuilles depuis 2015, dont la feuille de zone qui
 * porte trois courbes à la fois. Ce fichier tient les trois fonctions qui
 * nomment une pièce : son mois, son pays et ses durées. Le reste est de la
 * géométrie, et c'est le document lui-même qui l'a vérifiée, 809 points lus
 * deux fois par le tracé et par le chiffre imprimé, écart maximum de 0,01 point
 * de pourcentage.
 */
describe("ce que le titre d'une courbe dit", () => {
  it("rend le mois, quelle que soit la façon dont la BEAC écrit le titre", () => {
    expect(moisDuTitre("Courbe des taux de rendement des titres publics de la CEMAC - juillet 2026")).toBe("2026-07");
    expect(moisDuTitre("Courbe de rendements des titres publics camerounais - novembre 2019")).toBe("2019-11");
    expect(moisDuTitre("Courbe des taux de rendement des titres publics gabonais pour le mois de decembre 2015")).toBe("2015-12");
    expect(moisDuTitre("CBT Cameroun et Gabon Octobre 2016")).toBe("2016-10");
  });

  it("ne rend pas de mois quand le titre n'en porte pas", () => {
    expect(moisDuTitre("Note méthodologique - Elaboration de la courbe de rendement")).toBeUndefined();
    expect(moisDuTitre("")).toBeUndefined();
  });

  it("LIT LE PAYS DANS SON ADJECTIF, qui est souvent la seule forme du titre", () => {
    /* Une feuille par pays n'a pas de légende : « camerounais » est le seul
       endroit où le pays figure, et sans lui la courbe serait anonyme. */
    expect(paysDuTitre("Courbe de rendements des titres publics camerounais - novembre 2019")).toBe("Cameroun");
    expect(paysDuTitre("Courbe des rendements des titres publics gabonais - juin 2019")).toBe("Gabon");
    expect(paysDuTitre("Courbe de rendements des titres publics du Congo - fevrier 2026")).toBe("Congo");
    expect(paysDuTitre("Courbe des taux de rendement des titres publics tchadiens pour le mois de juin 2016")).toBe("Tchad");
  });

  it("LA ZONE PASSE AVANT LE PAYS, la feuille CEMAC nommant les trois", () => {
    /* « Courbes de rendements des titres publics de la CEMAC » ne doit pas être
       attribuée au premier pays que son texte mentionne. */
    expect(paysDuTitre("Courbe des taux de rendement des titres publics de la CEMAC - juillet 2026")).toBe("CEMAC");
  });

  it("rend les durées de l'axe en années, y compris l'abréviation", () => {
    expect(anneesDuTenor("3 mois")).toBeCloseTo(0.25, 6);
    expect(anneesDuTenor("6 mois")).toBeCloseTo(0.5, 6);
    expect(anneesDuTenor("1 an")).toBe(1);
    expect(anneesDuTenor("1,5 ans")).toBe(1.5);
    /* « 3,5A » : la BEAC abrège « ans » en « A » à un seul endroit de l'axe,
       toujours le même, et l'oublier perdait un point de chaque courbe. */
    expect(anneesDuTenor("3,5A")).toBe(3.5);
    expect(anneesDuTenor("15 ans")).toBe(15);
  });

  it("refuse ce qui n'est pas une durée, un montant compris", () => {
    expect(anneesDuTenor("11,60")).toBeUndefined();
    expect(anneesDuTenor("Maturités")).toBeUndefined();
    expect(anneesDuTenor("")).toBeUndefined();
  });
});

/**
 * DIX « COURBES » SONT DES CLASSEURS EXCEL.
 *
 * De septembre 2016 à août 2017, la BEAC a publié dix feuilles sous un nom en
 * « .pdf » dont les octets commencent par « PK ». pdfjs n'y voyait qu'une
 * « Invalid PDF structure », et elles portent pourtant mieux que les autres :
 * la donnée source, une feuille par pays, sans graphique à relire.
 */
describe("la courbe quand la pièce est un classeur", () => {
  const classeur = async (lignes: [string, string, number][]): Promise<Uint8Array> => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    for (const feuille of [...new Set(lignes.map((l) => l[0]))]) {
      const ws = wb.addWorksheet(feuille);
      ws.addRow(["Courbe des taux de rendement"]);
      ws.addRow(["Source : BEAC"]);
      ws.addRow(["échéance", new Date("2016-11-30")]);
      for (const l of lignes.filter((x) => x[0] === feuille)) ws.addRow([l[1], l[2]]);
    }
    return new Uint8Array(await wb.xlsx.writeBuffer());
  };

  it("lit une feuille par pays, échéance par échéance", async () => {
    const { courbesDuClasseur } = await import("@/lib/market/courbe-beac");
    const bytes = await classeur([
      ["Donnees Cameroun", "3 mois", 2.2020230458302597],
      ["Donnees Cameroun", "5 ans", 7.027372658832301],
      ["Donnees Gabon", "3 mois", 4.397268040846289],
    ]);
    const r = await courbesDuClasseur(bytes, "CBT Cameroun et Gabon novembre 2016");
    expect(r.mois).toBe("2016-11");
    expect(r.points).toHaveLength(3);
    /* Deux décimales comme partout ailleurs : une colonne où cohabitent 2,20
       et 2,2020230458302597 invite à des comparaisons sans objet. */
    expect(r.points.find((p) => p.pays === "Cameroun" && p.tenor === "3 mois")?.taux).toBe(2.2);
    expect(r.points.find((p) => p.pays === "Cameroun" && p.tenor === "5 ans")?.annees).toBe(5);
    expect(r.points.find((p) => p.pays === "Gabon")?.taux).toBe(4.4);
  });

  it("ÉCARTE UN TAUX QU'AUCUN TRÉSOR DE LA ZONE N'A PAYÉ, et le dit", () => {
    /* Une feuille scannée de juillet 2018 portait un axe reconnu « 31,00
       26,00 21,00 » là où le Gabon se finançait autour de 6 % : le point
       sorti valait 26,27 %. Un point indéfendable vaut moins qu'un trou. */
    return (async () => {
      const { courbesDuClasseur } = await import("@/lib/market/courbe-beac");
      const bytes = await classeur([
        ["Donnees Gabon", "3 mois", 4.39],
        ["Donnees Gabon", "5 ans", 26.27],
        ["Donnees Gabon", "10 ans", 0.47],
      ]);
      const r = await courbesDuClasseur(bytes, "CBT Gabon novembre 2016");
      expect(r.points.map((p) => p.taux)).toEqual([4.39]);
      expect(r.reserves.join(" ")).toContain("26.27 % écarté");
      expect(r.reserves.join(" ")).toContain("0.47 % écarté");
    })();
  });

  it("ignore une feuille qui ne nomme aucun pays, et le dit", async () => {
    const { courbesDuClasseur } = await import("@/lib/market/courbe-beac");
    const bytes = await classeur([["Feuil1", "3 mois", 4.39]]);
    const r = await courbesDuClasseur(bytes, "CBT novembre 2016");
    expect(r.points).toHaveLength(0);
    expect(r.reserves.join(" ")).toContain("aucune feuille de pays");
  });

  it("reconnaît un classeur à ses octets, sous un nom en « .pdf »", async () => {
    const { courbesDuPdf } = await import("@/lib/market/courbe-beac");
    const bytes = await classeur([["Donnees Tchad", "2 ans", 5.01]]);
    const r = await courbesDuPdf(bytes, "CBT Cameroun, Gabon et Tchad fevrier 2017");
    expect(r.points).toEqual([{ pays: "Tchad", tenor: "2 ans", annees: 2, taux: 5.01 }]);
  });
});

describe("le pays, et la coquille de « Centrafrique »", () => {
  it("reconnaît la Centrafrique, que « centrafric » ne contient pas", () => {
    /* Le mot s'arrête à « centrafri » : le motif d'avant ne prenait que
       l'adjectif « centrafricaine ». Même coquille qu'au lecteur des
       communiqués. */
    expect(paysDuTitre("Courbe de rendements des titres publics de la Centrafrique - mai 2024")).toBe("RCA");
    expect(paysDuTitre("Courbe de rendements des titres publics centrafricains - mai 2024")).toBe("RCA");
  });
});
