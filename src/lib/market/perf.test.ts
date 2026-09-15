import { describe, expect, it } from "vitest";
import type { FundNav } from "@/lib/domain/market";
import { perf1y } from "./boc";

const nav = (navDate: string, nav: number): FundNav => ({ fundKey: "f", name: "F", manager: "", depositary: "", category: "M", frequency: "hebdomadaire", navDate, nav, navOrigin: 10000, inceptionDate: "2020-01-01", perfSinceInceptionPct: 0, bulletinNo: 1, sessionDate: navDate });

describe("perf1y", () => {
  it("takes the closest print at or before one year earlier", () => {
    const h = [nav("2025-09-05", 10000), nav("2025-09-12", 10100), nav("2026-03-01", 10500)];
    const r = perf1y(h, nav("2026-09-11", 11000));
    expect(r?.from).toBe("2025-09-05");
    expect(r?.pct).toBeCloseTo(10, 5);
  });
  it("gives up when the history is too short or the gap too wide", () => {
    expect(perf1y([nav("2026-03-01", 10500)], nav("2026-09-11", 11000))).toBeUndefined();
    expect(perf1y([nav("2025-05-01", 10000)], nav("2026-09-11", 11000))).toBeUndefined();
  });
});
