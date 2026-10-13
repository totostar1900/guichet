import { describe, expect, it } from "vitest";
import { anomalies, FOIS_LA_MEDIANE, medianeParPays } from "@/lib/market/anomalies";
import type { AuctionResult } from "@/lib/market/auction-results";

/**
 * LE CLIQUET D'ÉCHELLE, MESURÉ SUR L'ÉCHELLE DU PAYS ET NON SUR UN PLAFOND.
 *
 * Un plafond absolu à 500 milliards attrape l'absurde et rien d'autre. Il ne
 * peut pas voir un facteur dix sur un Trésor dont les séances pèsent cinq
 * milliards : cinquante milliards est un chiffre ordinaire pour le Cameroun
 * et impossible pour la RCA, et le plafond ne sait pas de qui il parle.
 *
 * Le cas de référence est la séance tchadienne du 24 janvier 2024, lue à
 * 30 000 milliards annoncés là où la médiane du Tchad est à 15 milliards.
 * Soumissions et servis sont inflatés du même facteur, donc le taux de
 * couverture publié se reconstitue parfaitement : le ratio est juste et
 * l'échelle est fausse, ce qu'aucun contrôle interne à la rangée ne voit.
 */

/* Object.assign plutôt qu'un littéral : les valeurs par défaut que l'appelant
   peut remplacer ne se déclarent pas deux fois dans le même objet. */
const seance = (p: Partial<AuctionResult> & { country: AuctionResult["country"]; announced: number }): AuctionResult =>
  Object.assign(
    {
      id: `${p.country}-${p.announced}-${p.sessionOn ?? "x"}`,
      instrument: "OTA",
      tenor: "2 ans",
      abondement: false,
      sessionOn: "2024-01-24",
      bid: p.announced,
      served: p.announced,
    },
    p,
  ) as unknown as AuctionResult;

/** Un Trésor ordinaire : dix séances autour de quinze milliards. */
const dixSeancesNormales = (pays: AuctionResult["country"], md: number) =>
  Array.from({ length: 10 }, (_, i) => seance({ country: pays, announced: md * 1e9, sessionOn: `2024-0${(i % 9) + 1}-15` }));

describe("le cliquet d'échelle", () => {
  it("ATTRAPE LA SÉANCE TCHADIENNE DU 24 JANVIER 2024", () => {
    const rows = [
      ...dixSeancesNormales("Tchad", 15),
      seance({ country: "Tchad", announced: 30_000e9, bid: 16_678.63e9, served: 16_678.63e9, sessionOn: "2024-01-24" }),
    ];
    const trouvees = anomalies(rows).filter((a) => a.quoi.key.includes("fois la médiane"));
    expect(trouvees.length).toBeGreaterThan(0);
    expect(trouvees[0]?.quand).toBe("2024-01-24");
    expect(trouvees[0]?.pays).toBe("Tchad");
  });

  it("NE SE LAISSE PAS BLANCHIR PAR L'ABERRATION QU'IL CHERCHE", () => {
    /* C'est la raison de la médiane. Une moyenne sur ces onze séances vaut
       2 740 milliards, et la séance fautive tomberait alors sous onze fois
       « la normale », donc sous le seuil : elle se serait blanchie toute
       seule. La médiane ne bouge pas d'un franc. */
    const rows = [
      ...dixSeancesNormales("Tchad", 15),
      seance({ country: "Tchad", announced: 30_000e9, sessionOn: "2024-01-24" }),
    ];
    expect(medianeParPays(rows).get("Tchad")).toBe(15e9);
    const moyenne = rows.reduce((a, r) => a + r.announced!, 0) / rows.length;
    expect(30_000e9 / moyenne).toBeLessThan(FOIS_LA_MEDIANE);
  });

  it("VOIT UN FACTEUR DIX QUE LE PLAFOND ABSOLU NE PEUT PAS VOIR", () => {
    /* Cinquante milliards : très au-dessous du plafond de 500, et pourtant
       dix fois l'échelle d'un petit Trésor. C'est exactement le trou que ce
       cliquet est censé fermer. */
    const rows = [...dixSeancesNormales("RCA", 3), seance({ country: "RCA", announced: 50e9, sessionOn: "2024-02-02" })];
    const trouvees = anomalies(rows).filter((a) => a.quoi.key.includes("fois la médiane"));
    expect(trouvees.map((a) => a.quand)).toContain("2024-02-02");
    const plafond = anomalies(rows).filter((a) => a.quoi.key.includes("hors de toute échelle"));
    expect(plafond).toHaveLength(0);
  });

  it("NE CRIE PAS SUR UNE GROSSE SÉANCE ORDINAIRE", () => {
    /* Mesuré sur le corpus du 13 octobre 2026 : le second plus grand écart
       de toute la zone est à six fois la médiane de son pays. Un seuil à
       quinze ne discute donc avec personne. */
    const rows = [...dixSeancesNormales("Cameroun", 20), seance({ country: "Cameroun", announced: 120e9, sessionOn: "2024-03-03" })];
    expect(anomalies(rows).filter((a) => a.quoi.key.includes("fois la médiane"))).toHaveLength(0);
  });

  it("SE TAIT QUAND UN TRÉSOR N'A PAS ASSEZ DE SÉANCES POUR AVOIR UNE ÉCHELLE", () => {
    /* Une médiane sur deux séances ne décrit rien, et crierait sur la
       troisième émission d'un Trésor qui commence. */
    const rows = [
      seance({ country: "Guinée éq.", announced: 1e9, sessionOn: "2024-04-01" }),
      seance({ country: "Guinée éq.", announced: 1e9, sessionOn: "2024-04-02" }),
      seance({ country: "Guinée éq.", announced: 40e9, sessionOn: "2024-04-03" }),
    ];
    expect(medianeParPays(rows).has("Guinée éq.")).toBe(false);
    expect(anomalies(rows).filter((a) => a.quoi.key.includes("fois la médiane"))).toHaveLength(0);
  });

  it("REGARDE LES TROIS MONTANTS, PAS LE SEUL ANNONCÉ", () => {
    /* Une inflation qui ne touche que le servi laisse l'annoncé juste, donc
       un cliquet posé sur le seul annoncé la manquerait. */
    const rows = [...dixSeancesNormales("Congo", 10), seance({ country: "Congo", announced: 10e9, bid: 10e9, served: 900e9, sessionOn: "2024-05-05" })];
    const trouvees = anomalies(rows).filter((a) => a.quoi.key.includes("fois la médiane"));
    expect(trouvees.map((a) => a.quand)).toContain("2024-05-05");
  });
});
