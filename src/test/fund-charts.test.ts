import { describe, expect, it } from "vitest";
import { changes, drawdown, invested, REF_AMOUNT, rollingAnnualised } from "@/components/FundCharts";
import type { NavPoint } from "@/components/NavChart";

// A weekly NAV rising 0.1 % a week for two years, with one dip.
const weekly = (): NavPoint[] => {
  const out: NavPoint[] = [];
  let nav = 10000;
  const d = new Date("2024-09-06T00:00:00Z");
  for (let i = 0; i < 105; i++) {
    nav = i === 60 ? nav * 0.995 : nav * 1.001;
    out.push({ date: d.toISOString().slice(0, 10), nav: Math.round(nav * 100) / 100, perfSinceInceptionPct: (nav / 10000 - 1) * 100, bulletinNo: 2000 + i });
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
};

describe("fund chart readings", () => {
  const s = weekly();
  it("rolling annualised return needs a full window and lands near the weekly drift annualised", () => {
    const r = rollingAnnualised(s, 365);
    expect(r.length).toBeGreaterThan(40);
    expect(r[0].from).toBeDefined();
    // 0.1 % a week ≈ 5.3 % a year (with one 0.5 % dip somewhere in most windows)
    const last = r[r.length - 1].y;
    expect(last).toBeGreaterThan(4);
    expect(last).toBeLessThan(6);
    expect(rollingAnnualised(s.slice(0, 10), 365)).toHaveLength(0);
  });
  it("a reference amount follows the NAV from the first point", () => {
    const v = invested(s);
    expect(v[0].y).toBe(REF_AMOUNT);
    expect(v[v.length - 1].y).toBeCloseTo((REF_AMOUNT * s[s.length - 1].nav) / s[0].nav, 6);
  });
  it("changes are one per NAV after the first, the dip is the only fall", () => {
    const c = changes(s);
    expect(c).toHaveLength(s.length - 1);
    const falls = c.filter((p) => p.y < 0);
    expect(falls).toHaveLength(1);
    expect(falls[0].date).toBe(s[60].date);
    expect(falls[0].y).toBeCloseTo(-0.5, 1);
  });
  it("drawdown is zero at every new high and negative right after the dip", () => {
    const dd = drawdown(s);
    expect(dd[0].y).toBe(0);
    expect(dd[59].y).toBe(0);
    expect(dd[60].y).toBeCloseTo(-0.5, 1);
    expect(dd[dd.length - 1].y).toBe(0);
  });
});

describe("x axis", () => {
  it("shows every date when few, six over a short span, five with the year over a long one", async () => {
    const { axisLabel } = await import("@/components/NavChart");
    const s = weekly().map((p) => p.date);
    expect(axisLabel(s.slice(0, 5)).ticks).toEqual([0, 1, 2, 3, 4]);
    const short = axisLabel(s.slice(0, 30));
    expect(short.ticks).toEqual([0, 6, 12, 17, 23, 29]);
    expect(short.label(s[0])).not.toMatch(/2024/);
    const long = axisLabel(s);
    expect(long.ticks).toHaveLength(5);
    expect(long.ticks[4]).toBe(s.length - 1);
    expect(long.label(s[0])).toMatch(/2024/);
  });
});
