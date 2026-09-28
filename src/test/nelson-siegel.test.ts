import { describe, expect, it } from "vitest";
import { abouti, ajuster, facteurs, tauxCourt, type Obs } from "@/lib/market/nelson-siegel";

/**
 * Un ajustement se vérifie en lui donnant une courbe dont on connaît la réponse.
 *
 * On fabrique des observations avec des β choisis, on ajuste, et on regarde si
 * les β reviennent. C'est le seul contrôle qui distingue un code qui calcule
 * d'un code qui rend un nombre.
 */
describe("Nelson-Siegel", () => {
  const vrai = { b0: 7, b1: -3, b2: 4, lambda: 1.5 };
  const yVrai = (a: number) => {
    const { f1, f2 } = facteurs(a, vrai.lambda);
    return vrai.b0 + vrai.b1 * f1 + vrai.b2 * f2;
  };
  const DUREES = [0.25, 0.5, 1, 2, 3, 5, 7, 10];

  it("les facteurs valent 1 et 0 à l'origine", () => {
    const { f1, f2 } = facteurs(0, 2);
    expect(f1).toBe(1);
    expect(f2).toBe(0);
  });

  it("la pente s'éteint et la courbure s'annule au loin", () => {
    const { f1, f2 } = facteurs(200, 1.5);
    expect(f1).toBeLessThan(0.01);
    expect(f2).toBeLessThan(0.01);
  });

  it("retrouve les paramètres d'une courbe qu'il a servi à fabriquer", () => {
    const obs: Obs[] = DUREES.map((a) => ({ annees: a, pct: yVrai(a) }));
    const r = ajuster(obs);
    expect(abouti(r)).toBe(true);
    if (!abouti(r)) return;
    expect(r.b0).toBeCloseTo(vrai.b0, 2);
    expect(r.b1).toBeCloseTo(vrai.b1, 2);
    expect(r.b2).toBeCloseTo(vrai.b2, 2);
    expect(r.lambda).toBeCloseTo(vrai.lambda, 1);
    expect(r.rmsePb).toBeLessThan(1);
  });

  it("rend le taux instantané comme somme du niveau et de la pente", () => {
    const obs: Obs[] = DUREES.map((a) => ({ annees: a, pct: yVrai(a) }));
    const r = ajuster(obs);
    if (!abouti(r)) throw new Error(r.refus);
    const f = r;
    expect(tauxCourt(f)).toBeCloseTo(yVrai(1e-6), 2);
  });

  it("interpole une durée que personne n'a adjugée", () => {
    /* Rien à quatre ans dans les observations : c'est exactement le service
       qu'on attend d'une courbe ajustée. */
    const obs: Obs[] = [0.25, 0.5, 1, 2, 3, 7, 10].map((a) => ({ annees: a, pct: yVrai(a) }));
    const r = ajuster(obs);
    if (!abouti(r)) throw new Error(r.refus);
    const f = r;
    expect(f.taux(4)).toBeCloseTo(yVrai(4), 1);
  });

  it("refuse d'ajuster sous quatre durées distinctes", () => {
    expect(ajuster([1, 2, 3].map((a) => ({ annees: a, pct: yVrai(a) })))).toEqual({ refus: "moins de quatre durées distinctes" });
    /* Quatre points sur trois durées ne font pas quatre durées. */
    expect(ajuster([{ annees: 1, pct: 5 }, { annees: 1, pct: 5.2 }, { annees: 2, pct: 6 }, { annees: 3, pct: 6.5 }])).toEqual({ refus: "moins de quatre durées distinctes" });
  });

  it("écarte ce qui n'est pas une observation", () => {
    const obs: Obs[] = [
      ...DUREES.map((a) => ({ annees: a, pct: yVrai(a) })),
      { annees: 0, pct: 5 },
      { annees: -1, pct: 5 },
      { annees: 2, pct: Number.NaN },
      { annees: 3, pct: 9, poids: 0 },
    ];
    const r = ajuster(obs);
    if (!abouti(r)) throw new Error(r.refus);
    const f = r;
    expect(f.n).toBe(DUREES.length);
    expect(f.b0).toBeCloseTo(vrai.b0, 2);
  });

  it("élargit sa bande là où il extrapole", () => {
    /* Du bruit, sans quoi les résidus sont nuls et la bande aussi. */
    const obs: Obs[] = [0.25, 0.5, 1, 2, 3].map((a, i) => ({ annees: a, pct: yVrai(a) + [0.1, -0.08, 0.05, -0.06, 0.09][i] }));
    const r = ajuster(obs);
    if (!abouti(r)) throw new Error(r.refus);
    const f = r;
    expect(f.bande(1)).toBeLessThan(f.bande(15));
    expect(f.borne).toEqual({ court: 0.25, long: 3 });
  });

  it("suit les poids : une observation lourde tire la courbe à elle", () => {
    const base: Obs[] = DUREES.map((a) => ({ annees: a, pct: yVrai(a) }));
    const sans = ajuster(base);
    const avec = ajuster(base.map((o) => (o.annees === 10 ? { ...o, pct: o.pct + 2, poids: 50 } : o)));
    if (!abouti(sans) || !abouti(avec)) throw new Error("ajustement refusé");
    expect(avec.taux(10)).toBeGreaterThan(sans.taux(10) + 0.5);
  });

  it("accepte qu'on lui impose la décroissance de la zone", () => {
    const obs: Obs[] = DUREES.map((a) => ({ annees: a, pct: yVrai(a) }));
    const r = ajuster(obs, { lambda: 3 });
    if (!abouti(r)) throw new Error(r.refus);
    const f = r;
    expect(f.lambda).toBe(3);
    /* Une décroissance imposée ajuste moins bien, et c'est le prix assumé. */
    const libre = ajuster(obs);
    if (!abouti(libre)) throw new Error(libre.refus);
    expect(f.rmsePb).toBeGreaterThan(libre.rmsePb);
  });
});
