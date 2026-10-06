import { beforeEach, describe, expect, it } from "vitest";
import type { Quote } from "@/lib/domain/market";

/**
 * LES MOUVEMENTS DE LA COTE, le jumeau en mémoire de la fonction en base.
 *
 * La frise du comparateur compte, par mois, les séances où une ligne entre ou
 * sort de la cote. Elle ne se fie plus à l'écart des comptes du bulletin :
 * mesuré le 6 octobre 2026 sur 806 couples consécutifs, ce raccourci
 * désignait 40 séances dont 6 sans aucun mouvement, et en ratait 40 autres.
 * Moins d'une fois sur deux.
 *
 * DEUX ÉCRITURES DE LA MÊME RÈGLE, et c'est assumé : Postgres ne lit pas un
 * tableau JavaScript, et le jeu d'essai n'a pas de base. Ce qu'on peut faire,
 * et qui est fait ici, c'est éprouver la seconde sur des cas que la première
 * doit rendre pareils — la veille qui est celle de la SÉRIE, la première
 * séance qui n'est pas un mouvement, et les deux sens comptés séparément.
 */
const q = (isin: string, sessionDate: string): Quote => ({
  isin,
  sessionDate,
  bulletinNo: 1,
  instrument: "action",
  mnemo: isin,
  issuer: "ESSAI",
  designation: "ESSAI",
  previousClose: 1000,
  previousDate: sessionDate,
  open: 1000,
  close: 1000,
  thresholdHigh: 1100,
  thresholdLow: 900,
  variationPct: 0,
  referenceNext: 1000,
  volumeTraded: 0,
  valueTraded: 0,
  trades: 0,
  status: "",
});

const { memoryRepository } = await import("@/lib/data/memory");

beforeEach(() => {
  /* Le magasin mémoire vit sur globalThis et survit d'un cas à l'autre. */
  delete (globalThis as { __guichetStore?: unknown }).__guichetStore;
});

/** Les séances du jeu de référence, pour ne juger que ce qu'on vient d'ajouter. */
const depuis = async (d: string) => (await memoryRepository.marketMovements()).filter((m) => m.sessionDate >= d);

describe("les mouvements d'une séance à l'autre", () => {
  it("comptent les deux sens séparément", async () => {
    await memoryRepository.upsertQuotes([
      q("RESTE", "2099-01-02"),
      q("PART", "2099-01-02"),
      q("RESTE", "2099-01-03"),
      q("ARRIVE", "2099-01-03"),
    ]);
    const [m] = await depuis("2099-01-03");
    expect(m).toMatchObject({ sessionDate: "2099-01-03", prevDate: "2099-01-02", partis: 1, arrivees: 1 });
  });

  it("ne comptent rien quand la cote porte exactement les mêmes lignes", async () => {
    await memoryRepository.upsertQuotes([q("A", "2099-02-02"), q("A", "2099-02-03")]);
    const [m] = await depuis("2099-02-03");
    expect(m).toMatchObject({ partis: 0, arrivees: 0 });
  });

  it("la veille est la séance PRÉCÉDENTE DE LA SÉRIE, pas le jour d'avant", async () => {
    /* La bourse ne cote pas tous les jours : la veille d'un lundi est un
       vendredi. Un calcul sur la date civile verrait partir toute la cote
       chaque fin de semaine. */
    await memoryRepository.upsertQuotes([q("A", "2099-03-06"), q("A", "2099-03-09"), q("B", "2099-03-09")]);
    const [m] = await depuis("2099-03-09");
    expect(m).toMatchObject({ prevDate: "2099-03-06", partis: 0, arrivees: 1 });
  });

  it("la première séance de la série n'est pas un mouvement, c'est un début", async () => {
    /* Sans ce retrait, elle sortait avec toutes ses lignes comptées comme des
       arrivées, et la frise aurait allumé le premier mois pour rien. */
    await memoryRepository.upsertQuotes([q("A", "2099-04-01"), q("B", "2099-04-01"), q("A", "2099-04-02")]);
    const tous = await memoryRepository.marketMovements();
    expect(tous.map((m) => m.sessionDate)).not.toContain("2099-04-01");
    expect(tous).toHaveLength(1);
    expect(tous[0]).toMatchObject({ sessionDate: "2099-04-02", prevDate: "2099-04-01", partis: 1, arrivees: 0 });
  });
});
