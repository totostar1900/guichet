import { describe, expect, it } from "vitest";
import { sansSignature } from "@/app/desk/messages/modeles";
import { refusDePiece, taillePiece, PLAFOND_PIECE } from "@/app/desk/messages/piece-jointe";

/**
 * Un modèle inséré dans la boîte aux lettres ne signe pas deux fois.
 *
 * LE PIÈGE. Le cadre du Référentiel finit par « {conseiller} · {societe} », et
 * ce fil signe déjà de son côté, à l'envoi. Un modèle inséré tel quel partirait
 * signé deux fois, à deux formats différents, sous le nom de la maison. On
 * remplit donc le cadre avec une signature vide, puis on laisse tomber les
 * dernières lignes qui ne portent plus ni lettre ni chiffre.
 *
 * Ce qui reste visible si le desk réécrit le cadre autrement : le doublon
 * reparaîtra dans l'aperçu de relecture, qui montre le message exact. C'est à
 * cela qu'il sert, et c'est pourquoi on n'ajoute pas ici un garde de plus.
 */
describe("le cadre sans sa signature", () => {
  it("laisse tomber la ligne de signature devenue vide", () => {
    const cadre = "Bonjour Awa,\n\nVotre ordre est à l'étude.\n\nNous restons à votre disposition.\n · ";
    expect(sansSignature(cadre)).toBe("Bonjour Awa,\n\nVotre ordre est à l'étude.\n\nNous restons à votre disposition.");
  });

  it("garde une ligne qui porte encore un chiffre", () => {
    // « 2026 » est du contenu : la règle enlève des séparateurs, pas du texte.
    expect(sansSignature("Le point\n2026")).toBe("Le point\n2026");
  });

  it("ne touche à rien quand le cadre ne finit pas par une signature", () => {
    expect(sansSignature("Bonjour,\n\nVoici.")).toBe("Bonjour,\n\nVoici.");
  });

  it("n'avale pas tout quand il ne reste que des séparateurs", () => {
    expect(sansSignature(" · \n—\n")).toBe("");
  });
});

describe("la pièce jointe", () => {
  it("accepte un document ordinaire", () => {
    expect(refusDePiece("bordereau.pdf", 240_000)).toBeUndefined();
  });

  it("refuse un fichier vide, qui se choisit par accident", () => {
    expect(refusDePiece("vide.pdf", 0)).toContain("vide");
  });

  it("refuse au delà du plafond, en disant le chiffre", () => {
    const refus = refusDePiece("scan.pdf", PLAFOND_PIECE + 1);
    expect(refus).toBeDefined();
    expect(refus).toContain("10 Mo");
  });

  it("accepte exactement le plafond", () => {
    // Une borne se teste des deux côtés, sinon elle se déplace d'un octet sans
    // que personne ne le voie.
    expect(refusDePiece("scan.pdf", PLAFOND_PIECE)).toBeUndefined();
  });

  it("dit la taille en ko sous le méga, en Mo au delà", () => {
    expect(taillePiece(240_000)).toBe("234 ko");
    expect(taillePiece(2_400_000)).toBe("2.3 Mo");
  });
});
