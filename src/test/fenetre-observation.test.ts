import { describe, expect, it } from "vitest";
import { fundCurveFrom } from "@/lib/domain/fund-curve";
import { FENETRES, fenetresDe, raisonSansFenetre, TOLERANCE_AN } from "@/lib/domain/fund-perf";

/**
 * LA FENÊTRE D'OBSERVATION DE LA LISTE DES FONDS.
 *
 * Mesuré le 6 octobre 2026 sur les 28 fonds comparables aux trois fenêtres :
 * la corrélation des rangs entre un an et trois ans vaut 0,83, et VINGT
 * FONDS SUR VINGT-HUIT bougent d'au moins cinq places. La fenêtre change donc
 * la réponse pour sept fonds sur dix, et une liste qui n'en offre qu'une en
 * cache neuf autres.
 */

/** Une VL par semaine, comme quarante fonds sur quarante-cinq. */
const serie = (depuis: string, semaines: number, parSemaine = 0.1) => {
  const out: { navDate: string; nav: number }[] = [];
  const d = new Date(`${depuis}T00:00:00Z`);
  for (let i = 0; i < semaines; i += 1) {
    out.push({ navDate: d.toISOString().slice(0, 10), nav: 10_000 * (1 + (parSemaine / 100) * i) });
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
};

describe("les six fenêtres", () => {
  it("se mesurent toutes sur une série assez longue", () => {
    const s = serie("2021-01-04", 300); // presque six ans
    const f = fenetresDe(s, s[s.length - 1]);
    expect(Object.keys(f).sort()).toEqual(["a1", "a2", "a3", "a4", "m3", "m6"]);
    /* La série monte régulièrement, donc plus la fenêtre est longue, plus le
       chiffre est grand : c'est la vérification que chacune mesure bien sa
       propre durée et non celle d'à côté. */
    expect(f.m3!.pct).toBeLessThan(f.m6!.pct);
    expect(f.m6!.pct).toBeLessThan(f.a1!.pct);
    expect(f.a1!.pct).toBeLessThan(f.a2!.pct);
    expect(f.a2!.pct).toBeLessThan(f.a3!.pct);
    expect(f.a3!.pct).toBeLessThan(f.a4!.pct);
  });

  it("manquent toutes quand la série est trop courte, et ne rendent pas zéro", () => {
    const s = serie("2026-08-01", 4);
    expect(fenetresDe(s, s[s.length - 1])).toEqual({});
  });

  it("la plus longue manque seule quand la série couvre les trois autres", () => {
    const s = serie("2024-01-05", 95); // un an et neuf mois
    const f = fenetresDe(s, s[s.length - 1]);
    expect(f.a1).toBeDefined();
    expect(f.a3).toBeUndefined();
  });

  it("refusent une borne trop lointaine plutôt que de l'appeler par le nom de la fenêtre", () => {
    /* Un fonds qui cesse de publier pendant six mois : la VL la plus proche
       d'il y a un an est à bien plus de quarante-cinq jours de la cible.
       Rendre ce chiffre sous le nom « 1 an » serait le nommer de travers. */
    const vieux = serie("2024-01-05", 20); // jusqu'à mi-mai 2024
    const recent = serie("2026-06-05", 18);
    const tout = [...vieux, ...recent];
    const f = fenetresDe(tout, tout[tout.length - 1]);
    expect(f.a1).toBeUndefined();
    expect(TOLERANCE_AN).toBe(45);
  });
});

describe("la courbe porte les fenêtres", () => {
  it("les calcule sur la série entière, et non sur les soixante VL dessinées", () => {
    /* La courbe ne garde que soixante points pour le tracé. Soixante VL
       hebdomadaires font quatorze mois : si les fenêtres se mesuraient
       dessus, trois ans serait introuvable pour tout le monde. */
    const s = serie("2022-01-03", 210);
    const c = fundCurveFrom(s, 60)!;
    expect(c.ys).toHaveLength(60);
    expect(c.fenetres?.a3).toBeDefined();
  });

  it("n'emporte pas de clef vide quand le fonds est trop jeune", () => {
    const c = fundCurveFrom(serie("2026-08-01", 4), 60)!;
    expect(c.fenetres).toBeUndefined();
  });
});

describe("pourquoi une fenêtre est vide", () => {
  it("dit « trop jeune » en mois de calendrier, pas en moyenne de jours", () => {
    /* Trente jours et demi par mois avait fait rater la borne d'un an d'un
       quart de jour, et un fonds né il y a tout juste un an redevenait
       « trop jeune ». */
    expect(raisonSansFenetre(12, "2025-09-26", "2026-09-25")).toBe("jeune");
    expect(raisonSansFenetre(12, "2025-09-26", "2026-09-26")).not.toBe("jeune");
    expect(raisonSansFenetre(36, "2023-10-07", "2026-10-06")).toBe("jeune");
    expect(raisonSansFenetre(36, "2023-10-06", "2026-10-06")).not.toBe("jeune");
  });

  it("vaut pour les quatre durées offertes", () => {
    for (const f of FENETRES) expect(raisonSansFenetre(f.mois, "2026-10-01", "2026-10-06")).toBe("jeune");
  });
});

describe("ce que la rangée de boutons promet", () => {
  it("s'arrête à quatre ans : cinq n'existe pour personne avant 2028", () => {
    /* La plus ancienne VL du dépôt est du 5 janvier 2023. Quatre ans
       n'ouvre qu'en janvier 2027, cinq ans en janvier 2028. */
    expect(FENETRES.map((f) => f.id)).toEqual(["m3", "m6", "a1", "a2", "a3", "a4"]);
    expect(FENETRES.some((f) => f.mois >= 60)).toBe(false);
  });

  it("n'offre pas un mois non plus : quatre points ne classent pas quarante fonds", () => {
    expect(FENETRES.some((f) => f.mois === 1)).toBe(false);
  });
});
