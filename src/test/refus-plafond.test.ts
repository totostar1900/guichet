import { describe, expect, it } from "vitest";
import { repo } from "@/lib/data";
import { direLeRefus } from "@/lib/intake/refus";

/**
 * Un refus se dit une fois par heure, et pas une fois par coup frappé.
 *
 * LE CLIQUET TIENT UNE CORRECTION DE MA PROPRE CORRECTION. Les deux routes de
 * courrier entrant refusaient en silence, et j'ai posé une ligne au flux à
 * chaque refus pour qu'un jeton désaccordé se voie enfin. Mais ces routes sont
 * publiques : mille coups frappés auraient écrit mille lignes et noyé le flux du
 * desk. Le remède devenait une porte.
 *
 * Le plafond répond aux deux à la fois : un apporteur mal configuré frappe
 * toutes les minutes et se voit à la première ligne, un curieux qui insiste
 * n'en écrit qu'une.
 */
describe("le refus se dit une fois par heure", () => {
  it("écrit la première fois et se taît ensuite", async () => {
    const r = repo();
    const message = "Courrier entrant <b>refusé</b> : essai du plafond horaire";
    const compter = async () => (await r.listEvents(100)).filter((e) => e.html === message).length;

    expect(await compter()).toBe(0);
    await direLeRefus(message);
    expect(await compter()).toBe(1);

    // Vingt coups de plus : le flux n'en garde qu'un.
    for (let i = 0; i < 20; i++) await direLeRefus(message);
    expect(await compter()).toBe(1);
  });

  it("ne confond pas deux refus différents", async () => {
    const r = repo();
    const a = "Courrier entrant <b>refusé</b> : premier motif distinct";
    const b = "Courrier entrant <b>refusé</b> : second motif distinct";
    await direLeRefus(a);
    await direLeRefus(b);
    const events = await r.listEvents(100);
    expect(events.filter((e) => e.html === a)).toHaveLength(1);
    expect(events.filter((e) => e.html === b)).toHaveLength(1);
  });
});
