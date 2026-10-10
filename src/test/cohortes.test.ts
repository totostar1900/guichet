import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COHORTES,
  COHORTE_LABEL,
  COHORTE_QUOI,
  cohorteDe,
  cohorteDuSegment,
  MOIS_AVANT_SOMMEIL,
  SCORE_FIDELE,
  segmentDeCohorte,
} from "@/lib/domain/cohortes";

/**
 * LES COHORTES : CE QU'ELLES AUTORISENT, ET CE QU'ELLES N'AUTORISENT PAS.
 *
 * Elles servent à choisir qui prévenir d'une ligne. Deux limites les
 * encadrent, et ce sont elles qui font qu'un classement de clientèle reste
 * honnête : une cohorte ne décide jamais d'un prix, et le consentement
 * commande l'envoi, jamais l'appartenance au groupe.
 */
const MAINTENANT = new Date("2026-10-10T12:00:00.000Z");
const ilYaDesMois = (n: number) => {
  const d = new Date(MAINTENANT);
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};

describe("où tombe un client", () => {
  it("un manquement passe avant tout le reste", () => {
    /* Écrire une offre à quelqu'un dont un ordre n'est pas réglé serait au
       mieux maladroit : le groupe le dit avant le score. */
    expect(cohorteDe("en_defaut", 95, MAINTENANT.toISOString(), MAINTENANT)).toBe("a_surveiller");
    expect(cohorteDe("a_surveiller", 95, MAINTENANT.toISOString(), MAINTENANT)).toBe("a_surveiller");
  });

  it("le sommeil passe avant la fidélité", () => {
    // Un ancien fidèle qui dort est d'abord quelqu'un qu'on a perdu de vue.
    expect(cohorteDe("impeccable", 90, ilYaDesMois(MOIS_AVANT_SOMMEIL + 1), MAINTENANT)).toBe("dormant");
    expect(cohorteDe("impeccable", 90, ilYaDesMois(MOIS_AVANT_SOMMEIL - 1), MAINTENANT)).toBe("fidele");
  });

  it("un compte sans aucun geste connu dort", () => {
    expect(cohorteDe("impeccable", 0, undefined, MAINTENANT)).toBe("dormant");
  });

  it("et le score départage les présents", () => {
    expect(cohorteDe("correcte", SCORE_FIDELE, MAINTENANT.toISOString(), MAINTENANT)).toBe("fidele");
    expect(cohorteDe("correcte", SCORE_FIDELE - 1, MAINTENANT.toISOString(), MAINTENANT)).toBe("tiede");
  });

  it("chaque client n'est que dans une cohorte", () => {
    // Quatre groupes, et jamais deux à la fois : une liste de diffusion ne se
    // construit pas sur des appartenances qui se recouvrent.
    const cas = [cohorteDe("en_defaut", 90, MAINTENANT.toISOString(), MAINTENANT), cohorteDe("impeccable", 10, ilYaDesMois(9), MAINTENANT)];
    for (const c of cas) expect(COHORTES).toContain(c);
    expect(new Set(cas).size).toBe(2);
  });
});

describe("une cohorte voyage comme un segment", () => {
  it("son nom se pose dans l'adresse et se relit", () => {
    for (const c of COHORTES) expect(cohorteDuSegment(segmentDeCohorte(c))).toBe(c);
  });

  it("et un segment ordinaire n'en est pas une", () => {
    expect(cohorteDuSegment("Tous les clients")).toBeUndefined();
    expect(cohorteDuSegment("cohorte:inconnue")).toBeUndefined();
  });
});

describe("ce que l'envoi fait d'une cohorte", () => {
  const lire = (f: string) => readFileSync(f, "utf8");

  it("elle borne la liste, y compris pour ceux qui suivent la ligne", () => {
    /* Sans cela, un suiveur hors du groupe choisi recevrait quand même : le
       desk croirait écrire à vingt fidèles et en toucherait trente. */
    const src = lire("src/lib/notify/broadcast.ts");
    expect(src).toMatch(/if \(cohorte && !cohorte\.has\(c\.id\)\) continue;/);
    const i = src.indexOf("if (cohorte && !cohorte.has(c.id)) continue;");
    const j = src.indexOf("if (!follower && !matchesSegment(c, segment)) continue;");
    expect(i, "la borne de cohorte doit précéder le passe-droit des suiveurs").toBeLessThan(j);
  });

  it("et elle ne change rien au consentement ni aux autres gardes", () => {
    /* Le consentement commande l'envoi, jamais l'appartenance : un client qui
       n'a rien accepté reste dans sa cohorte et ne reçoit rien. */
    const src = lire("src/lib/notify/broadcast.ts");
    expect(src).toMatch(/const joignable = .*mayReceive/);
    expect(src).toMatch(/alertedToday/);
    expect(src).toMatch(/quietHours|plan\.quiet/);
  });

  it("le seuil des quatre yeux tient aussi pour une cohorte", () => {
    const src = lire("src/app/desk/featured/actions.ts");
    expect(src).toMatch(/plan\.recipients\.length > 50 && !isResponsable\(desk\)/);
    expect(src).toMatch(/cohorteDuSegment\(p\.data\.segment\)/);
  });
});

describe("les comptes de démonstration ne sont dans aucune cohorte", () => {
  it("la maison ne s'écrit pas à elle-même", () => {
    expect(readFileSync("src/lib/desk/cohortes-data.ts", "utf8")).toMatch(/if \(demo\.has\(c\.id\)\) continue;/);
  });
});

describe("tout ce que les cohortes affichent est traduit", () => {
  it("les noms et les définitions passent par une variable, donc le scanner ne les voit pas", async () => {
    const { EN_JOURNAL } = await import("@/i18n/en-journal");
    const manquants: string[] = [];
    for (const c of COHORTES) {
      if (!EN_JOURNAL[COHORTE_LABEL[c]]) manquants.push(COHORTE_LABEL[c]);
      if (!EN_JOURNAL[COHORTE_QUOI[c]]) manquants.push(COHORTE_QUOI[c]);
    }
    expect(manquants, `sans traduction : ${manquants.join(" · ")}`).toEqual([]);
  });
});
