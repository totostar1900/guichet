import { describe, expect, it } from "vitest";
import { rereadOrder } from "@/lib/health";
import type { MarketBulletin } from "@/lib/domain/market";

/**
 * La file des séances à reprendre doit tourner.
 *
 * Elle était triée par date de séance, donc les six plus anciennes passaient en
 * tête à chaque passe. Une séance dont le PDF ne porte pas la ligne manquante
 * ne s'améliore jamais : ces six-là repassaient indéfiniment et les vingt-six
 * autres n'étaient pas atteintes. Le bouton ne pouvait pas vider sa liste.
 */
const b = (sessionDate: string, ingestedAt: string): MarketBulletin => ({ id: sessionDate, number: 1, sessionDate, ingestedAt, ingestedBy: "cron", status: "partiel", counts: { equities: 6, bonds: 31, funds: 4 }, warnings: [], anomalies: [], notices: [] });

describe("la file des séances à reprendre", () => {
  it("prend la moins récemment relue, pas la plus ancienne", () => {
    const list = [
      b("2025-09-29", "2026-09-24T09:47:00Z"), // la plus ancienne séance, mais reprise à l'instant
      b("2026-03-02", "2025-12-01T00:00:00Z"),
      b("2026-01-15", "2025-11-02T00:00:00Z"),
    ];
    expect(rereadOrder(list).map((x) => x.sessionDate)).toEqual(["2026-01-15", "2026-03-02", "2025-09-29"]);
  });

  it("fait avancer la file d'une passe à l'autre", () => {
    // Six séances jamais reprises, deux passes de trois : la seconde passe ne
    // redonne pas les mêmes, ce qui était tout le défaut.
    let list = Array.from({ length: 6 }, (_, i) => b(`2026-0${i + 1}-01`, `2025-01-0${i + 1}T00:00:00Z`));
    const first = rereadOrder(list).slice(0, 3);
    // Une reprise met la séance à jour, qu'elle ait gagné quelque chose ou non.
    const seen = new Set(first.map((x) => x.sessionDate));
    list = list.map((x) => (seen.has(x.sessionDate) ? { ...x, ingestedAt: "2026-09-24T10:00:00Z" } : x));
    const second = rereadOrder(list).slice(0, 3);
    expect(second.map((x) => x.sessionDate)).not.toEqual(first.map((x) => x.sessionDate));
    expect(second.some((x) => seen.has(x.sessionDate))).toBe(false);
  });

  it("départage deux reprises simultanées par la date de séance", () => {
    const list = [b("2026-02-01", "2026-09-24T09:00:00Z"), b("2026-01-01", "2026-09-24T09:00:00Z")];
    expect(rereadOrder(list).map((x) => x.sessionDate)).toEqual(["2026-01-01", "2026-02-01"]);
  });

  it("ne touche pas à la liste qu'on lui donne", () => {
    // La page affiche la même liste par date de séance : la trier sur place
    // changerait l'ordre du tableau sous les yeux du desk.
    const list = [b("2026-02-01", "2026-09-01T00:00:00Z"), b("2026-01-01", "2026-09-02T00:00:00Z")];
    rereadOrder(list);
    expect(list.map((x) => x.sessionDate)).toEqual(["2026-02-01", "2026-01-01"]);
  });
});
