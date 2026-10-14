import { describe, expect, it } from "vitest";
import { cheminBeac, cheminDuBulletin, cheminEmetteur, DOSSIERS, lienBibliotheque, nomDeFichier } from "@/lib/intake/bibliotheque";

/**
 * LE LIEN EST DEVENU LA PIÈCE : IL NE PEUT PLUS SE TROMPER EN SILENCE.
 *
 * Depuis le 14 octobre 2026, les bulletins ne sont plus au dépôt : mille
 * quatre-vingt-seize mégaoctets sont partis, et le desk ne sert plus que
 * cette adresse. Une règle d'encodage approximative ne rendrait pas une
 * erreur, elle rendrait une page « introuvable » chez SharePoint, ce qui se
 * lit comme un document perdu.
 */
describe("l'adresse d'une pièce de la bibliothèque", () => {
  it("ENCODE CHAQUE SEGMENT, ET GARDE LES BARRES", () => {
    /* `encodeURIComponent` sur le chemin entier mangerait les barres et
       rendrait une adresse plate ; le fichier serait introuvable. */
    const l = lienBibliotheque("1. Donnees de marche/2. BVMAC - Bulletin officiel de la cote/2023/BOC 1786 du 2023-03-03.pdf");
    expect(l).toContain("/sites/PurpCapSahredLib/Guichet/");
    expect(l).toContain("1.%20Donnees%20de%20marche/");
    expect(l).toContain("BOC%201786%20du%202023-03-03.pdf");
    expect(l.split("/").length).toBeGreaterThan(7);
  });

  it("ENCODE LE DIÈSE, QU'UN TITRE DE COMMUNIQUÉ PORTE PARFOIS", () => {
    /* `encodeURI` le laisserait passer, et il coupe une adresse en deux sans
       prévenir : tout ce qui suit devient une ancre. */
    expect(lienBibliotheque("a/b # c.pdf")).toContain("b%20%23%20c.pdf");
    expect(lienBibliotheque("a/b # c.pdf")).not.toContain("#");
  });

  it("supporte un chemin en barres inverses et une barre initiale", () => {
    expect(lienBibliotheque("/a\\b.pdf")).toBe(lienBibliotheque("a/b.pdf"));
  });
});

describe("où chaque pièce est rangée", () => {
  it("nomme un bulletin comme un humain le cherche", () => {
    expect(cheminDuBulletin("2023-03-08", 1788)).toBe(`${DOSSIERS.bulletins}/2023/BOC 1788 du 2023-03-08.pdf`);
  });

  it("DIT « SANS NUMERO » PLUTÔT QUE DE LAISSER UN TROU", () => {
    /* Un bulletin sans numéro existe, celui du 4 janvier 2023. « BOC  du … »
       se range mal et se cherche encore plus mal. */
    expect(cheminDuBulletin("2023-01-04", null)).toContain("BOC sans numero du 2023-01-04.pdf");
  });

  it("range une pièce BEAC par genre, pays et année", () => {
    expect(cheminBeac({ genre: "resultats", pays: "Tchad", seance: "2024-01-24", instrument: "BTA", tenor: "26 semaines" })).toBe(
      `${DOSSIERS.beacResultats}/Tchad/2024/2024-01-24 BTA 26 semaines - resultats.pdf`,
    );
  });

  it("met « Zone » quand le pays n'est pas l'un des six", () => {
    expect(cheminBeac({ genre: "annonce", pays: null, seance: "2024-01-24", instrument: "BTA" })).toContain("/Zone/2024/");
  });

  it("SÉPARE DEUX FICHES DU MÊME ÉMETTEUR PAR LEUR ANNÉE", () => {
    /* Sans l'année, deux fiches signalétiques de la BANGE se heurtent et la
       seconde n'est jamais descendue : c'est ce qui a coûté 22 pièces à
       l'archive BEAC avant qu'on le mesure. */
    const a = cheminEmetteur({ mnemo: "BANGE", year: 2024, title: "Fiche signalétique" }, "x.pdf");
    const b = cheminEmetteur({ mnemo: "BANGE", year: 2025, title: "Fiche signalétique" }, "x.pdf");
    expect(a).not.toBe(b);
    expect(a).toContain("2024 Fiche signaletique.pdf");
  });

  it("retombe sur le nom du fichier quand le titre est vide", () => {
    expect(cheminEmetteur({ mnemo: "SAF", year: null, title: null }, "logo.jpg")).toContain("/SAF/logo.jpg");
  });
});

describe("le nom de fichier", () => {
  it("ôte les accents et ce que Windows refuse, et coupe", () => {
    expect(nomDeFichier('Communiqué: résultats/BTA*2024?')).toBe("Communique resultats BTA 2024");
    expect(nomDeFichier("x".repeat(200)).length).toBe(110);
  });
});

describe("le tableau de bord hebdomadaire", () => {
  it("A SON PROPRE DOSSIER, pour que le ramasseur et le lecteur s'accordent", () => {
    /* Si le lecteur les déplaçait de son côté, le ramasseur ne les trouverait
       plus où il calcule et retéléchargerait 81 pièces à chaque passage. */
    const c = cheminBeac({ genre: "autre", titre: "Tableau de bord hebdomadaire des opérations du marché des valeurs du Trésor de la CEMAC : semaine du 23 au 27 février 2026" });
    expect(c).toContain(DOSSIERS.beacTableaux);
    expect(c).toContain("/2026/");
  });

  it("laisse les autres communiqués où ils sont", () => {
    expect(cheminBeac({ genre: "autre", titre: "Communiqué de presse du 12 mars 2024" })).toContain(DOSSIERS.beacAutres);
  });
});
