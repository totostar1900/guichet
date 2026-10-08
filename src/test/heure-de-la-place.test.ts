import { describe, expect, it } from "vitest";
import { fmtDate, fmtDateTime, fmtDay, fmtTime, fmtWhen, setFormatLang } from "@/lib/format";

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
