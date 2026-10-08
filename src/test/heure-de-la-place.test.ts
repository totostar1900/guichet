import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fmtDate, fmtDateTime, fmtDay, fmtTime, fmtWhen, setFormatLang, setFormatLangSource } from "@/lib/format";

/**
 * L'HEURE AFFICHÉE NE DÉPEND PLUS DE LA MACHINE QUI L'AFFICHE.
 *
 * Les formateurs lisaient l'heure locale du moteur : Vercel tourne en UTC, le
 * poste de travail en UTC+3, et la même pièce sortait « 18 h 42 » d'un côté,
 * « 21 h 42 » de l'autre. Un texte que le serveur rend et que le client
 * réécrit, c'est un échec d'hydratation (React #418) : mesuré le 8 octobre 2026
 * sur « Ouvrir un compte », où plus un bouton ne répondait.
 *
 * Ces attentes sont celles de la place, UTC+01:00 toute l'année. Elles sont
 * donc vraies dans tous les fuseaux, et c'est précisément ce qu'on veut tenir :
 * avant la correction, elles échouaient partout sauf sur une machine réglée en
 * UTC+1.
 */
describe("l'heure de la place est épinglée", () => {
  it("projette un instant sur UTC+01:00, même au passage de minuit", () => {
    setFormatLang("fr");
    // 23 h 30 UTC le 7, donc 00 h 30 le 8 à Douala : le jour ET la date changent.
    expect(fmtDateTime("2026-10-07T23:30:00Z")).toBe("jeu. 8 oct. 00 h 30");
    expect(fmtDate("2026-10-07T23:30:00Z")).toBe("8 oct. 2026");
    expect(fmtDay("2026-10-07T23:30:00Z")).toBe("jeu. 8 oct. 2026");
    expect(fmtTime("2026-10-07T23:30:00Z")).toBe("00:30");
  });

  it("lit l'heure de la place, pas celle du lecteur", () => {
    setFormatLang("fr");
    expect(fmtDateTime("2026-09-17T17:42:00Z")).toBe("jeu. 17 sept. 18 h 42");
    // Un décalage explicite autre qu'UTC se ramène au même instant.
    expect(fmtDateTime("2026-09-17T20:42:00+03:00")).toBe("jeu. 17 sept. 18 h 42");
  });

  it("ne déplace pas une date seule, qui ne porte aucune heure", () => {
    setFormatLang("fr");
    expect(fmtDate("2026-10-08")).toBe("8 oct. 2026");
    expect(fmtDay("2026-01-01")).toBe("jeu. 1 janv. 2026");
    expect(fmtDate("2026-10-08", false)).toBe("8 oct.");
  });

  it("prend un horodatage sans fuseau pour l'heure écrite sur la pièce", () => {
    setFormatLang("fr");
    // Les séances ingérées portent l'heure de clôture telle que le document la donne.
    expect(fmtDateTime("2026-09-22T09:00:00")).toBe("mar. 22 sept. 09 h 00");
    expect(fmtTime("2026-09-22T09:00:00")).toBe("09:00");
  });

  it("garde minuit pour silence : fmtWhen juge la chaîne, pas l'instant", () => {
    setFormatLang("fr");
    expect(fmtWhen("2026-09-22T00:00:00")).toBe("22 sept. 2026");
    expect(fmtWhen("2026-09-22T09:00:00")).toBe("mar. 22 sept. 09 h 00");
  });

  it("l'anglais change les mots et le séparateur, pas l'heure", () => {
    setFormatLang("en");
    expect(fmtDateTime("2026-10-07T23:30:00Z")).toBe("Thu 8 Oct 00:30");
    setFormatLang("fr");
  });
});

/**
 * LA LANGUE DES DATES NE SE PARTAGE PAS ENTRE DEUX LECTEURS.
 *
 * Elle vivait dans une variable de module que le serveur réécrivait à chaque
 * requête. Un processus Node sert plusieurs lecteurs à la fois : la dernière
 * langue posée gagnait pour tout ce qui restait à rendre, y compris dans la
 * requête d'à côté. Un PDF réglementaire pouvait sortir avec les mois d'un
 * inconnu, et une page française recevoir « 3 Oct 2025 » que le navigateur
 * réécrivait aussitôt en « 3 oct. 2025 », donc un échec d'hydratation de plus.
 *
 * Le formateur reçoit maintenant une LECTURE, interrogée à chaque date écrite,
 * et c'est elle que le serveur branche sur la requête en cours.
 */
describe("la langue des dates suit son lecteur", () => {
  it("se relit à chaque date, au lieu de figer la dernière posée", () => {
    let courant: "fr" | "en" = "fr";
    setFormatLangSource(() => courant);
    courant = "en";
    const anglais = fmtDate("2026-10-08");
    courant = "fr";
    const francais = fmtDate("2026-10-08");
    // Deux lectures du même formateur, deux langues : aucune n'a écrasé l'autre.
    expect(anglais).toBe("8 Oct 2026");
    expect(francais).toBe("8 oct. 2026");
    setFormatLang("fr");
  });

  it("le serveur ne pose plus une valeur, mais une lecture", () => {
    const serveur = readFileSync("src/i18n/server.ts", "utf8");
    // setFormatLang écrit un global : sur le serveur il traverse les requêtes.
    expect(serveur).not.toMatch(/\bsetFormatLang\s*\(/);
    expect(serveur).toContain("setFormatLangSource");
  });
});

/**
 * Le fournisseur de langue est un composant « client », mais il s'exécute aussi
 * au rendu serveur : y poser une valeur fixe écrase la lecture par requête et
 * ramène la fuite entre lecteurs, par la porte de derrière.
 */
describe("le fournisseur ne pose la langue que dans le navigateur", () => {
  it("garde setFormatLang derrière une garde de navigateur", () => {
    const provider = readFileSync("src/i18n/client.tsx", "utf8");
    expect(provider).toMatch(/typeof window !== "undefined"\s*&&\s*setFormatLang|if \(typeof window !== "undefined"\) setFormatLang/);
  });
});
