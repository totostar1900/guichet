import { describe, expect, it } from "vitest";
import { FENETRE_MS, fenetreWhatsApp } from "@/app/desk/messages/fenetre";
import { citation } from "@/app/desk/messages/message-exact";

/**
 * La fenêtre de 24 h, et le message cité.
 *
 * LA FENÊTRE. Meta n'accepte un texte libre que dans les 24 heures qui suivent
 * le dernier message du numéro. La règle ne vivait que dans le texte d'invite
 * du champ, en gris, sans dire si elle était ouverte : l'opérateur écrivait,
 * cliquait, et récoltait un échec sans comprendre lequel. Elle se calcule
 * maintenant, et elle s'affiche.
 *
 * ELLE N'INTERDIT RIEN, et ce n'est pas un oubli : une horloge qui se trompe
 * fermerait le desk sur une déduction. Ce cliquet tient donc le calcul, pas un
 * garde.
 *
 * LA CITATION part chez le client : elle est en français, et sa forme compte
 * parce que c'est elle qui sépare la réponse de la question.
 */
const T0 = Date.parse("2026-10-02T08:00:00.000Z");

describe("la fenêtre de 24 h", () => {
  it("est fermée quand le client n'a jamais écrit", () => {
    // Pas « inconnue » : sans message entrant, il n'y a jamais eu de fenêtre.
    expect(fenetreWhatsApp(undefined, T0).ouverte).toBe(false);
  });

  it("est fermée sur une date illisible, plutôt qu'ouverte par accident", () => {
    expect(fenetreWhatsApp("avant-hier", T0).ouverte).toBe(false);
  });

  it("est ouverte juste après un message du client", () => {
    const f = fenetreWhatsApp(new Date(T0 - 60_000).toISOString(), T0);
    expect(f.ouverte).toBe(true);
    expect(f.heures).toBe(23);
    expect(f.minutes).toBe(59);
  });

  it("se ferme exactement à 24 h, pas une milliseconde après", () => {
    expect(fenetreWhatsApp(new Date(T0 - FENETRE_MS + 1).toISOString(), T0).ouverte).toBe(true);
    expect(fenetreWhatsApp(new Date(T0 - FENETRE_MS).toISOString(), T0).ouverte).toBe(false);
  });

  it("ne rend jamais un reste négatif", () => {
    expect(fenetreWhatsApp(new Date(T0 - 3 * FENETRE_MS).toISOString(), T0).resteMs).toBe(0);
  });

  it("découpe le reste en heures pleines et minutes", () => {
    const f = fenetreWhatsApp(new Date(T0 - (FENETRE_MS - 3 * 3_600_000 - 20 * 60_000)).toISOString(), T0);
    expect([f.heures, f.minutes]).toEqual([3, 20]);
  });
});

describe("la citation du message reçu", () => {
  it("annonce la date, puis préfixe chaque ligne", () => {
    expect(citation("2 octobre 2026 à 07:14", "Bonjour,\nJe confirme.")).toBe("Le 2 octobre 2026 à 07:14, vous écriviez :\n> Bonjour,\n> Je confirme.");
  });

  it("garde le chevron sur une ligne vide, pour que la citation reste d'un bloc", () => {
    // Sans lui, le client voit deux citations au lieu d'une, et ne sait plus où
    // elle finit.
    expect(citation("hier", "A\n\nB")).toBe("Le hier, vous écriviez :\n> A\n>\n> B");
  });

  it("lit aussi les fins de ligne venues de Windows", () => {
    expect(citation("hier", "A\r\nB")).toBe("Le hier, vous écriviez :\n> A\n> B");
  });
});
