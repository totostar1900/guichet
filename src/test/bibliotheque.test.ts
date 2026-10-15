import { describe, expect, it } from "vitest";
import { avecMarque, cheminBeac, cheminDuBulletin, cheminEmetteur, DOSSIERS, empreinteCourte, familleDuTitre, lienBibliotheque, marquesDeCollision, nomDeFichier } from "@/lib/intake/bibliotheque";

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

describe("deux pièces qui réclament un seul chemin", () => {
  const p = (url: string, c: string) => ({ url, c });
  const lot = [p("https://b/z.pdf", "a/x.pdf"), p("https://b/a.pdf", "a/x.pdf"), p("https://b/seule.pdf", "a/y.pdf")];

  it("LAISSE LE NOM NU AU PREMIER PAR ORDRE D'ADRESSE, pour ne pas bouger l'existant", () => {
    const m = marquesDeCollision(lot, (x) => x.c);
    expect(m.has("https://b/a.pdf")).toBe(false);
    expect(m.get("https://b/z.pdf")).toMatch(/^[0-9a-f]{6}$/);
    expect(m.has("https://b/seule.pdf")).toBe(false);
  });

  it("REND LES MÊMES CHEMINS À DEUX EXÉCUTIONS, quel que soit l'ordre d'entrée", () => {
    /* Sinon une pièce change de nom à chaque passage du robot, et l'archive
       accumule des copies sous des noms différents. */
    const a = marquesDeCollision(lot, (x) => x.c);
    const b = marquesDeCollision([...lot].reverse(), (x) => x.c);
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
  });

  it("insère la marque avant l'extension, jamais après", () => {
    expect(avecMarque("a/x.pdf", "abc123")).toBe("a/x [abc123].pdf");
    expect(avecMarque("a/x.jpg", "abc123")).toBe("a/x [abc123].jpg");
    expect(avecMarque("a/x.pdf")).toBe("a/x.pdf");
  });

  it("l'empreinte est stable et distincte", () => {
    expect(empreinteCourte("https://b/z.pdf")).toBe(empreinteCourte("https://b/z.pdf"));
    expect(empreinteCourte("https://b/z.pdf")).not.toBe(empreinteCourte("https://b/a.pdf"));
  });
});

/**
 * UNE PIÈCE APPARTIENT À CE QU'ELLE EST, PAS À LA PAGE QUI LA SERT.
 *
 * Mesuré le 15 octobre 2026 : la colonne de droite de la page des statistiques
 * mensuelles sert quinze communiqués de 2019, annonces et résultats
 * d'adjudication. Ils ont dormi sous « Statistiques mensuelles », où personne
 * ne les aurait cherchés, parce que le ramasseur donnait à chaque pièce le
 * genre de sa page.
 */
describe("la famille se lit dans le titre", () => {
  it("reconnaît un résultat d'adjudication servi par une page de statistiques", () => {
    const c = cheminBeac({ titre: "Communiqué des résultats d'ajudications de BTA du 5 juin 2019 - République du Gabon", genre: "statistiques", pays: "Gabon" });
    expect(c.startsWith(DOSSIERS.beacResultats)).toBe(true);
    expect(c).toContain("/Gabon/2019/");
  });

  it("reconnaît une annonce, en français comme en anglais", () => {
    expect(familleDuTitre("Communiqué d'annonce d'émission de BTA du 24 juillet 2019")).toBe("annonce");
    expect(familleDuTitre("Announcement issuance of Fungible Treasury Bills of the Republic of Cameroon")).toBe("annonce");
    expect(familleDuTitre("Communiqué des résultats d’adjudications de BTA du 17 juillet 2019")).toBe("resultats");
  });

  it("LE MOT « RÉSULTATS » PASSE AVANT « ANNONCE », les deux figurant dans le même titre", () => {
    /* « Communiqué des résultats de l'appel d'offres … annoncé le … » : classer
       sur le premier mot rencontré rangerait un résultat chez les annonces. */
    expect(familleDuTitre("Communiqué des résultats de l’annonce du 23 juillet 2019")).toBe("resultats");
  });

  it("ne réquisitionne pas ce qui n'est pas un communiqué", () => {
    expect(familleDuTitre("Statistiques Mensuelles du Marché des valeurs du Trésor de la CEMAC - N° 60 juillet 2026")).toBe(null);
    expect(familleDuTitre("Courbe des taux de rendement des titres publics du Gabon - juillet 2026")).toBe(null);
    /* Un tableau de bord annonce des opérations à venir : le mot « annonce »
       n'en fait pas un communiqué d'adjudication. */
    expect(familleDuTitre("Tableau de bord hebdomadaire des opérations du marché des valeurs du trésor")).toBe(null);
  });

  it("garde le nom nommé quand la séance est connue, le titre entier sinon", () => {
    const avec = cheminBeac({ titre: "Communiqué des résultats", genre: "resultats", pays: "Congo", seance: "2026-09-15", instrument: "BTA", tenor: "26 semaines" });
    expect(avec).toContain("2026-09-15 BTA 26 semaines - resultats.pdf");
    const sans = cheminBeac({ titre: "Communiqué des résultats d'ajudications de BTA du 5 juin 2019 - République du Congo", genre: "resultats", pays: "Congo" });
    expect(sans).toContain("Communique des resultats d'ajudications de BTA du 5 juin 2019 - Republique du Congo.pdf");
  });
});
