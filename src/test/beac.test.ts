import { describe, expect, it } from "vitest";
import { beacCountry, beacLabel, forthcoming, nearestComparable, parseBeacRows, readBeacDoc, resultsFor, type BeacDoc } from "@/lib/market/beac";

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

  it("rend ce qui suit la date donnée, séance close comprise : c'est au robot de se garder", () => {
    // Le contrat est « à partir de cette date », pas « à partir d'aujourd'hui ».
    // Posé au mois précédent pour rattraper un jour manqué, le paramètre a fait
    // tomber vingt annonces déjà clôturées dans « À valider », que le desk
    // n'avait plus qu'à rejeter une par une. Le garde-fou est chez l'appelant,
    // qui compare au jour même ; cette fonction ne ment pas sur ce qu'elle fait.
    const vieilles = forthcoming(rows, "2026-08-01");
    expect(vieilles.length).toBeGreaterThan(forthcoming(rows, "2026-09-26").length);
    expect(vieilles.some((a) => (a.on ?? "") < "2026-09-26")).toBe(true);
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

/**
 * Le mois s'abrège, et cinq séances en dépendaient.
 *
 * « COMMUNIQUE DES RESULTATS DE LEMISSION DES OTA 3 ANS_14 SEPT 2026_TRESOR DU
 * CAMEROUN » : le Trésor camerounais écrit le mois en quatre lettres et sépare
 * par des soulignés. Le lecteur attendait « septembre » en toutes lettres et un
 * espace, et laissait donc tomber les cinq résultats du 14 septembre 2026, du
 * 3 ans au 7 ans, c'est-à-dire une journée entière de la courbe camerounaise.
 *
 * Le silence était complet : la reprise annonçait quarante-et-une séances sur
 * quarante-six sans dire lesquelles manquaient ni pourquoi.
 */
describe("la date, quelle que soit la main qui l'écrit", () => {
  const lu = (titre: string) => readBeacDoc({ url: "https://beac.int/x.pdf", title: titre, country: "CAMEROUN", year: "2026" });

  it("lit un mois abrégé, séparé par des soulignés", () => {
    expect(lu("COMMUNIQUE DES RESULTATS DE LEMISSION DES OTA 3 ANS_14 SEPT 2026_TRESOR DU CAMEROUN").on).toBe("2026-09-14");
  });

  it("lit encore le mois en toutes lettres, comme avant", () => {
    expect(lu("COMMUNIQUE DANNONCE DE LEMISSION DES BTA 26 SEMAINES DU LUNDI 21 SEPTEMBRE 2026").on).toBe("2026-09-21");
  });

  it("accepte le point de l'abréviation", () => {
    expect(lu("RESULTATS OTA 5 ANS 3 DEC. 2025 TRESOR").on).toBe("2025-12-03");
  });

  it("ne confond pas juin et juillet, qui ne se séparent qu'à la quatrième lettre", () => {
    expect(lu("RESULTATS BTA 26 SEMAINES 8 JUIN 2026").on).toBe("2026-06-08");
    expect(lu("RESULTATS BTA 26 SEMAINES 8 JUIL 2026").on).toBe("2026-07-08");
    expect(lu("RESULTATS BTA 26 SEMAINES 8 JUILLET 2026").on).toBe("2026-07-08");
  });

  it("garde l'ordinal du premier du mois", () => {
    expect(lu("RESULTATS BTA 52 SEMAINES 1er NOVEMBRE 2025").on).toBe("2025-11-01");
  });
});

/**
 * LE CAMEROUN PUBLIE AUSSI EN ANGLAIS, ET LA PAGE A UNE COLONNE DE DROITE.
 *
 * Mesuré le 15 octobre 2026, à la suite d'une remarque de Georges : sur les
 * 1 002 documents de la page, quinze échappaient au lecteur parce qu'ils sont
 * servis par une liste et non par le tableau, et quarante-deux autres étaient
 * vus sans être compris, leur titre étant en anglais. Six résultats
 * d'adjudication et quarante-six annonces ont été déposés le jour même.
 */
describe("les titres anglais et la colonne de droite", () => {
  const doc = (title: string, country = "", year = ""): BeacDoc => ({ url: "https://www.beac.int/x.pdf", title, country, year });

  it("lit une annonce anglaise entièrement : nature, instrument, date, pays", () => {
    const a = readBeacDoc(doc("Announcement issuance of Fungible Treasury Bills of the Republic of Cameroon : 19th of june 2019 session"));
    expect(a.kind).toBe("annonce");
    expect(a.instrument).toBe("BTA");
    expect(a.on).toBe("2019-06-19");
    expect(a.country).toBe("Cameroun");
  });

  it("lit les deux ordres de date anglais, et l'ordinal collé au chiffre", () => {
    expect(readBeacDoc(doc("Announcement issuance of Fungible Treasury Bonds 5 years of the Republic of Cameroon - September 5th 2022")).on).toBe("2022-09-05");
    expect(readBeacDoc(doc("… of the Republic of Cameroon - 24th November 2021 session")).on).toBe("2021-11-24");
    expect(readBeacDoc(doc("… of the Republic of Cameroon - 21st of March 2022 session")).on).toBe("2022-03-21");
  });

  it("rend « 13 weeks » et « 5 years » dans la langue de la table", () => {
    expect(readBeacDoc(doc("Announcement issuance of 13 weeks Fungible Treasury Bills of the Republic of Cameroon - 30th of October 2023")).tenor).toBe("13 semaines");
    expect(readBeacDoc(doc("Announcement issuance of Fungible Treasury Bonds 5 years of the Republic of Cameroon - September 5th 2022")).tenor).toBe("5 ans");
  });

  it("lit la date écrite en chiffres, et refuse un mois impossible", () => {
    expect(readBeacDoc(doc("Communiqué des résultats d'adjudication des BTA du 14-08-2019 - République du Gabon")).on).toBe("2019-08-14");
    expect(readBeacDoc(doc("Communiqué d'annonce OTA 4ans 01/07/2020 - République Gabonaise")).on).toBe("2020-07-01");
    expect(readBeacDoc(doc("Communiqué d'annonce BTA 01-13-2020")).on).toBeUndefined();
  });

  it("PREND LES LIENS HORS DU TABLEAU, qui sont la colonne de droite", () => {
    const html = `<table><tr><td><a href="/a.pdf">Communiqué d'annonce d'émission de BTA du 12 juin 2019</a></td><td>1 MB</td><td>Gabon</td><td>2019</td></tr></table>
      <div class="documents"><ul><li><a href="/b.pdf">Communiqué des résultats d'ajudications de BTA du 5 juin 2019 - République du Congo</a></li></ul></div>`;
    const rows = parseBeacRows(html);
    expect(rows.map((r) => r.url)).toEqual(["/a.pdf", "/b.pdf"]);
    /* Hors tableau il n'y a pas de colonne « pays » : l'année se lit au titre. */
    expect(rows[1].country).toBe("");
    expect(rows[1].year).toBe("2019");
    expect(readBeacDoc(rows[1]).country).toBe("Congo");
  });

  it("SE TAIT ENCORE QUAND LE TABLEAU DISPARAÎT, et c'est le garde qui compte", () => {
    /* La liste de droite ramasserait des liens même sans tableau, et le robot
       croirait la page intacte alors que son gabarit a changé. */
    expect(parseBeacRows(`<div><a href="/c.pdf">Communiqué d'annonce</a></div>`)).toEqual([]);
  });
});

/**
 * « CENTRAFRIC » N'EST PAS DANS « CENTRAFRIQUE ».
 *
 * Le mot s'arrête à « centrafri », et la zone écrit les deux : le communiqué
 * dit « République Centrafricaine », le rapport hebdomadaire dit
 * « Centrafrique ». Mesuré le 15 octobre 2026 en rapprochant deux tables : la
 * fiche de la RCA était vide d'un côté.
 */
describe("le nom d'un pays, sous ses deux formes", () => {
  it("reconnaît la Centrafrique écrite en entier comme en adjectif", () => {
    expect(beacCountry("Centrafrique")).toBe("RCA");
    expect(beacCountry("République Centrafricaine")).toBe("RCA");
    expect(beacCountry("RCA")).toBe("RCA");
    expect(beacCountry("Republic of Central African")).toBe("RCA");
  });

  it("ne prend pas « rca » au milieu d'un mot", () => {
    /* Sans la borne de mot, « marché » et « recherche » deviendraient la RCA. */
    expect(beacCountry("marcap")).toBeUndefined();
    expect(beacCountry("Gabon")).toBe("Gabon");
  });
});

/**
 * LA TROISIÈME LANGUE DE LA ZONE, ET LES COQUILLES DE LA SOURCE.
 *
 * Les titres ci-dessous sont recopiés tels quels du journal de la BEAC, le
 * 15 octobre 2026. La Guinée Équatoriale publie en espagnol : trente-sept
 * pièces, et c'était le seul État dont nos communiqués n'expliquaient rien de
 * l'encours officiel. Neuf annonces camerounaises de 2020 restaient dehors
 * pour un « Annoucement » sans second n.
 */
describe("les titres espagnols, et ce que la BEAC tape de travers", () => {
  const doc = (title: string, country = "", year = ""): BeacDoc => ({ url: "https://www.beac.int/x.pdf", title, country, year });

  it("lit une annonce espagnole : nature, date, pays", () => {
    const a = readBeacDoc(doc("Aviso de comunicado de la emision de BTA del 28 de Octubre 2020 - Republica de Guinea Ecuatorial"));
    expect(a.kind).toBe("annonce");
    expect(a.instrument).toBe("BTA");
    expect(a.on).toBe("2020-10-28");
    expect(a.country).toBe("Guinée éq.");
  });

  it("lit un communiqué de résultats espagnol", () => {
    const a = readBeacDoc(doc("Comunicado de resultados de adjudicaciones - sesion del 25 de septiembre 2019 - Republica de Guinea Ecuatorial"));
    expect(a.kind).toBe("resultats");
    expect(a.on).toBe("2019-09-25");
    expect(a.country).toBe("Guinée éq.");
  });

  it("accepte les quatre façons d'écrire la date espagnole", () => {
    /* Le « de » est facultatif devant le mois comme devant l'année, et la
       Guinée emploie les quatre formes la même année. */
    expect(readBeacDoc(doc("Aviso de comunicado de la emision de BTA del 01 Abril 2020 - Republica de Guinea Ecuatorial")).on).toBe("2020-04-01");
    expect(readBeacDoc(doc("Aviso de comunicado de la emision de BTA el 28 de Agosto 2019 - Republica de Guinea Ecuatorial")).on).toBe("2019-08-28");
    expect(readBeacDoc(doc("Comunicado de resultadaos de adjudicaciones de Bonos del Tesoro del 09 de Junio de 2021")).on).toBe("2021-06-09");
    expect(readBeacDoc(doc("Comunicado de resultos de adjudicaciones-sesion del 08 enero 2020-Guinée Equatoriale")).on).toBe("2020-01-08");
  });

  it("RECONNAÎT LES QUATRE COQUILLES DE LA SOURCE", () => {
    /* Un lecteur qui exige l'orthographe exacte perd une pièce sur vingt-trois,
       et toujours les mêmes : celles d'un Trésor qui tape vite. */
    expect(readBeacDoc(doc("Annoucement insuance of Treasury Bills january 08th 2020 - Republic of Cameroon")).kind).toBe("annonce");
    expect(readBeacDoc(doc("Communicado de resultados de adjudicaciones -sesion del 8 de Enero 2020 - Repùblica de Guinea Ecuatorial")).kind).toBe("resultats");
    expect(readBeacDoc(doc("Comunicado de resultadaos de adjudicaciones de Bonos del Tesoro del 30 de Junio de 2021")).kind).toBe("resultats");
    expect(readBeacDoc(doc("Comunicado de resultos de adjudicaciones-sesion del 08 enero 2020-Guinée Equatoriale")).kind).toBe("resultats");
  });

  it("lit l'annonce camerounaise mal tapée jusqu'au bout", () => {
    const a = readBeacDoc(doc("Annoucement issuance of Fungible Treasury Bonds of the Republic of Cameroon- 27th of May 2020 session"));
    expect(a.kind).toBe("annonce");
    expect(a.instrument).toBe("OTA");
    expect(a.on).toBe("2020-05-27");
    expect(a.country).toBe("Cameroun");
  });

  it("NE DEVINE PAS L'INSTRUMENT SUR « BONOS DEL TESORO »", () => {
    /* C'est le calque de « bons du Trésor », donc des BTA ; mais la Guinée
       écrit aussi « OTA » en toutes lettres la même année. Une seule pièce
       lisible tranche, et un cas ne fait pas une règle. */
    const a = readBeacDoc(doc("Aviso de comunicado de la emision de Bonos del tesoro del 04 de septiembre 2019 - Republica de Guinea Ecuatorial"));
    expect(a.kind).toBe("annonce");
    expect(a.instrument).toBeUndefined();
    expect(a.on).toBe("2019-09-04");
  });

  it("rend « 52 semanas » et « 3 años » dans la langue de la table", () => {
    /* Le titre espagnol ne porte jamais la durée : c'est la pièce qui l'écrit,
       et c'est le même lecteur qui la lira. */
    expect(readBeacDoc(doc("Côdigo de Emisiôn: GQ1300000692 BTA 52 semanas")).tenor).toBe("52 semaines");
    expect(readBeacDoc(doc("OTA 3 años")).tenor).toBe("3 ans");
  });

  it("lit « Febuary » sans le r, et février reste février", () => {
    /* Deux annonces camerounaises de 2020 restaient sans date pour cette
       lettre-là, et une annonce sans date ne rejoint aucune séance. */
    expect(readBeacDoc(doc("Annoucement issuance of Fungible Treasury Bills of the Republic of Cameroon - 12th Febuary 2020 session")).on).toBe("2020-02-12");
    expect(readBeacDoc(doc("Announcement issuance of Treasury Bills of the Republic of Cameroon - 19th February 2020 session")).on).toBe("2020-02-19");
  });

  it("UN MOIS ESPAGNOL NE SE PREND PAS POUR UN MOIS FRANÇAIS", () => {
    /* « marzo » commence par « mar » et « octubre » par « oct » : le motif
       français les laisse passer parce qu'il veut le mois collé au chiffre. */
    expect(readBeacDoc(doc("Aviso de comunicado de la emision de BTA del 11 Marzo 2020")).on).toBe("2020-03-11");
    expect(readBeacDoc(doc("Aviso de comunicado de la emision de Bonos del tesoro del 16 de octubre 2019")).on).toBe("2019-10-16");
    expect(readBeacDoc(doc("Communiqué d'annonce des BTA 26 semaines du 16 octobre 2019 - République du Congo")).on).toBe("2019-10-16");
  });
});

/**
 * QUI DIT LE PAYS : LE TITRE, PUIS LA COLONNE.
 *
 * Mesuré le 15 octobre 2026 sur les 1 347 pièces du journal : 1 019 fois les
 * deux s'accordent, 308 fois le titre se tait, et 20 fois ils se contredisent.
 * Sur ces vingt, le nom du fichier publié par la BEAC donne raison au titre
 * treize fois et à la colonne jamais.
 */
describe("le pays, quand la colonne et le titre ne disent pas la même chose", () => {
  it("SUIT LE TITRE, qui est la parole du document", () => {
    const a = readBeacDoc({ url: "https://www.beac.int/Résultats-BTA-Gabon-18-01-2023.pdf", title: "Communiqué des résultats d'adjudication des BTA du 18 janvier 2023 - République du Gabon", country: "Tchad", year: "2023" });
    expect(a.country).toBe("Gabon");
  });

  it("se rabat sur la colonne quand le titre ne nomme personne", () => {
    const a = readBeacDoc({ url: "https://www.beac.int/x.pdf", title: "Communiqué d'annonce d'émission des BTA du 18 mai 2022", country: "Tchad", year: "2022" });
    expect(a.country).toBe("Tchad");
  });

  it("et la colonne rattrape « EQUTORIALE », que le titre écrit de travers", () => {
    /* C'est la raison pour laquelle la colonne passait en premier : illisible
       n'est pas faux, et c'est tout le point. */
    const a = readBeacDoc({ url: "https://www.beac.int/x.pdf", title: "Communiqué d'annonce des BTA du 3 février 2021 - République de Guinée EQUTORIALE", country: "Guinée éq.", year: "2021" });
    expect(a.country).toBe("Guinée éq.");
  });
});
