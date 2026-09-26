import { describe, expect, it } from "vitest";
import { beacLabel, forthcoming, nearestComparable, parseBeacRows, readBeacDoc, resultsFor, type BeacDoc } from "@/lib/market/beac";

/**
 * Les six Trésors n'écrivent pas pareil, et c'est tout le problème.
 *
 * Les titres ci-dessous sont recopiés tels quels de la page de la BEAC, le
 * 26 septembre 2026 : majuscules ou non, accents ou non, apostrophe mangée,
 * jour de la semaine glissé devant la date, tiret ou souligné avant le pays.
 * Un lecteur qui ne tiendrait que sur l'un d'eux laisserait passer une
 * adjudication sur deux, et personne ne s'en apercevrait avant qu'un client
 * demande pourquoi celle du Tchad n'était pas au calendrier.
 */

const doc = (title: string, country = "Congo"): BeacDoc => ({ url: `https://www.beac.int/x/${encodeURIComponent(title)}.pdf`, title, country, year: "2026" });

describe("le titre d'un communiqué", () => {
  it("lit le Congo, qui écrit court et sans apostrophe", () => {
    expect(readBeacDoc(doc("Communiqué dannonce BTA 13 semaines du 22 septembre 2026 - Congo"))).toMatchObject({
      kind: "annonce",
      instrument: "BTA",
      on: "2026-09-22",
      abondement: false,
      country: "Congo",
    });
  });

  it("lit le Cameroun, qui écrit tout en majuscules et nomme le jour", () => {
    expect(readBeacDoc(doc("COMMUNIQUE DANNONCE DE LEMISSION DES BTA 26 SEMAINES DU LUNDI 21 SEPTEMBRE 2026_TRESOR DU CAMEROUN", "Cameroun"))).toMatchObject({
      kind: "annonce",
      instrument: "BTA",
      on: "2026-09-21",
      country: "Cameroun",
    });
  });

  it("lit le Gabon, qui garde ses accents et son apostrophe", () => {
    expect(readBeacDoc(doc("Communiqué d'annonce d’émission des BTA à 26 semaines du 12 août 2026 - Gabon", "Gabon"))).toMatchObject({
      kind: "annonce",
      instrument: "BTA",
      on: "2026-08-12",
      country: "Gabon",
    });
  });

  it("lit la Guinée équatoriale malgré la coquille du titre, parce que le pays a sa colonne", () => {
    const a = readBeacDoc(doc("COMMUNIQUE DANNONCE DE LEMISSION DES OTA 3 ANS DU MARDI 22 SEPTEMBRE 2026_TRESOR PUBLIC DE LA GUINEE EQUTORIALE", "Guinée Equatoriale"));
    expect(a).toMatchObject({ instrument: "OTA", on: "2026-09-22", country: "Guinée éq." });
  });

  it("reconnaît un abondement", () => {
    expect(readBeacDoc(doc("Communiqué dannonce OTA 2 ans abondement du 22 septembre 2026 - Congo"))).toMatchObject({ instrument: "OTA", abondement: true });
  });

  it("distingue une annonce d'un résultat et d'un calendrier", () => {
    expect(readBeacDoc(doc("Communiqué des résultats BTA 26 semaines du 15 septembre 2026 - Congo")).kind).toBe("resultats");
    expect(readBeacDoc(doc("Calendrier indicatif des émissions de titres publics du troisième trimestre 2026 du Tchad", "Tchad")).kind).toBe("calendrier");
  });

  it("lit le premier du mois, qui porte son ordinal", () => {
    // Sans cela, une annonce sur trente-huit se perdait, toujours en début de mois.
    expect(readBeacDoc(doc("Communiqué d'annonce d'émission des BTA à 52 semaines du 1er novembre 2023 - République du Congo")).on).toBe("2023-11-01");
  });

  it("lit l'instrument écrit en toutes lettres", () => {
    expect(readBeacDoc(doc("Communiqué d'annonce d'émission d'Obligations du Trésor Assimilables à 4 ans du 18 mars 2020 - Gabon", "Gabon")).instrument).toBe("OTA");
  });

  it("ne devine rien quand le titre ne dit rien", () => {
    const a = readBeacDoc(doc("COMMUNIQUE ANNONCE SYNDICATION DOMESTIQUE DU TRESOR DE LA RCA AU 28 AVRIL 25", "RCA"));
    expect(a.instrument).toBeUndefined();
    expect(a.on).toBeUndefined();
  });
});

describe("le tableau de la page", () => {
  const html = `
    <table><tbody>
      <tr>
        <td><a href="https://www.beac.int/wp-content/uploads/2026/09/A.pdf" title="Télécharger le document">Communiqué dannonce BTA 52 semaines du 22 septembre 2026 - Congo</a></td>
        <td>351 KB</td><td>Congo</td><td>2026</td>
      </tr>
      <tr>
        <td><a href="https://www.beac.int/wp-content/uploads/2026/09/B.pdf" title="Télécharger le document">Communiqué des résultats OTA 3 ans du 15 septembre 2026 - Congo</a></td>
        <td>242 KB</td><td>Congo</td><td>2026</td>
      </tr>
    </tbody></table>`;

  it("lit les quatre cellules dans l'ordre", () => {
    const rows = parseBeacRows(html);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ url: "https://www.beac.int/wp-content/uploads/2026/09/A.pdf", country: "Congo", year: "2026" });
    expect(rows[0].title).toBe("Communiqué dannonce BTA 52 semaines du 22 septembre 2026 - Congo");
  });

  it("ne rend rien d'une page qui aurait changé de forme", () => {
    // Le jour où le gabarit bouge, le compte tombe à zéro et le robot le dit :
    // mieux vaut un silence bruyant qu'une moitié de calendrier.
    expect(parseBeacRows("<div>plus de tableau du tout</div>")).toEqual([]);
  });
});

describe("ce qui reste devant nous", () => {
  const rows: BeacDoc[] = [
    doc("Communiqué dannonce BTA 52 semaines du 22 septembre 2026 - Congo"),
    doc("Communiqué dannonce BTA 13 semaines du 12 octobre 2026 - Congo"),
    doc("Communiqué des résultats OTA 3 ans du 12 octobre 2026 - Congo"),
    doc("Calendrier indicatif des émissions du quatrième trimestre 2026 - Congo"),
  ];

  it("ne garde que les annonces datées encore à venir, dans l'ordre", () => {
    const a = forthcoming(rows, "2026-09-26");
    expect(a).toHaveLength(1);
    expect(a[0].on).toBe("2026-10-12");
    expect(a[0].instrument).toBe("BTA");
  });

  it("garde la séance du jour même : elle n'est pas passée", () => {
    expect(forthcoming(rows, "2026-09-22")).toHaveLength(2);
  });

  it("écrit un titre court et lisible", () => {
    expect(beacLabel(forthcoming(rows, "2026-09-26")[0])).toBe("BTA 13 semaines · Congo");
  });
});

/**
 * Une adjudication n'est finie que lorsque le Trésor publie ce qu'il a servi.
 * L'appariement de l'annonce et des résultats se fait sur quatre choses qui ne
 * varient pas d'un Trésor à l'autre : le pays, l'instrument, la durée, la date.
 */
describe("les résultats d'une séance", () => {
  const annonce = readBeacDoc(doc("Communiqué dannonce BTA 52 semaines du 22 septembre 2026 - Congo"));
  const resultat = readBeacDoc(doc("Communiqué des résultats BTA 52 semaines du 22 septembre 2026 - Congo"));

  it("retrouve les résultats de la bonne séance", () => {
    expect(resultsFor(annonce, [resultat])?.doc.title).toContain("résultats");
  });

  it("ne confond pas deux séances voisines", () => {
    const autreDate = readBeacDoc(doc("Communiqué des résultats BTA 52 semaines du 15 septembre 2026 - Congo"));
    const autreDuree = readBeacDoc(doc("Communiqué des résultats BTA 26 semaines du 22 septembre 2026 - Congo"));
    const autrePays = readBeacDoc(doc("Communiqué des résultats BTA 52 semaines du 22 septembre 2026 - Gabon", "Gabon"));
    expect(resultsFor(annonce, [autreDate, autreDuree, autrePays])).toBeUndefined();
  });

  it("ne prend pas un abondement pour une ligne neuve", () => {
    const abondement = readBeacDoc(doc("Communiqué des résultats BTA 52 semaines abondement du 22 septembre 2026 - Congo"));
    expect(resultsFor(annonce, [abondement])).toBeUndefined();
  });
});

/**
 * Le taux d'un bon sort de l'adjudication. L'indication affichée avant la séance
 * se fonde donc sur ce que le marché vient de payer, et le choix du comparable
 * doit être écrit : même durée, même émetteur d'abord, et rien de trop vieux.
 */
describe("le comparable d'une séance à venir", () => {
  const cible = readBeacDoc(doc("Communiqué dannonce BTA 52 semaines du 22 septembre 2026 - Congo"));
  const memePays = readBeacDoc(doc("Communiqué des résultats BTA 52 semaines du 15 septembre 2026 - Congo"));
  const voisinPlusRecent = readBeacDoc(doc("Communiqué des résultats BTA 52 semaines du 18 septembre 2026 - Gabon", "Gabon"));

  it("préfère le même émetteur, même s'il est un peu plus ancien", () => {
    const c = nearestComparable(cible, [voisinPlusRecent, memePays]);
    expect(c?.doc.country).toBe("Congo");
    expect(c?.sameCountry).toBe(true);
    expect(c?.daysBefore).toBe(7);
  });

  it("se rabat sur un voisin de la zone quand l'émetteur n'a rien de récent", () => {
    const c = nearestComparable(cible, [voisinPlusRecent]);
    expect(c?.sameCountry).toBe(false);
    expect(c?.doc.country).toBe("Gabon");
  });

  it("ne rend rien d'une durée différente, ni d'une séance à venir", () => {
    const autreDuree = readBeacDoc(doc("Communiqué des résultats BTA 26 semaines du 15 septembre 2026 - Congo"));
    const apres = readBeacDoc(doc("Communiqué des résultats BTA 52 semaines du 29 septembre 2026 - Congo"));
    expect(nearestComparable(cible, [autreDuree, apres])).toBeUndefined();
  });

  it("laisse tomber un repère périmé", () => {
    // Un taux servi il y a huit mois ne dit plus rien du marché d'aujourd'hui.
    const vieux = readBeacDoc(doc("Communiqué des résultats BTA 52 semaines du 15 janvier 2026 - Congo"));
    expect(nearestComparable(cible, [vieux])).toBeUndefined();
    expect(nearestComparable(cible, [vieux], 400)?.daysBefore).toBe(250);
  });
});
