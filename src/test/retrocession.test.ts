import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cleDuRecu, encoursMoyenDuMois, finDuMois, joursDuMois, partsAuJour, rapprocherLeRecu, vlAuJour } from "@/lib/domain/retrocession";
import { REGLE_FERMEE, retrocessionDuMois } from "@/lib/domain/frais";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LA RÉTROCESSION SUR L'ENCOURS ET LE RAPPROCHEMENT DE CE QUI EST REÇU DE TIERS (15 novembre 2026).
 */
describe("les jours d'un mois", () => {
  it("dit le dernier jour, bissextile compris, et liste les jours", () => {
    expect(finDuMois("2027-02")).toBe("2027-02-28");
    expect(finDuMois("2028-02")).toBe("2028-02-29");
    expect(finDuMois("2027-12")).toBe("2027-12-31");
    expect(joursDuMois("2027-04")).toHaveLength(30);
    expect(joursDuMois("2027-04")[0]).toBe("2027-04-01");
  });
});

describe("les parts détenues et la VL d'un jour", () => {
  const m = [{ jour: "2027-03-05", units: 100 }, { jour: "2027-03-20", units: 50 }, { jour: "2027-03-25", units: -30 }];

  it("la somme des mouvements jusqu'au jour inclus, jamais négative", () => {
    expect(partsAuJour(m, "2027-03-04")).toBe(0);
    expect(partsAuJour(m, "2027-03-05")).toBe(100);
    expect(partsAuJour(m, "2027-03-31")).toBe(120);
    expect(partsAuJour([{ jour: "2027-03-01", units: -5 }], "2027-03-31")).toBe(0);
  });

  it("la dernière VL connue ce jour-là, rien avant la première, dans n'importe quel ordre", () => {
    const navs = [{ navDate: "2027-03-10", nav: 11 }, { navDate: "2027-03-01", nav: 10 }, { navDate: "2027-03-20", nav: 12 }];
    expect(vlAuJour(navs, "2027-02-28")).toBeUndefined();
    expect(vlAuJour(navs, "2027-03-09")).toBe(10);
    expect(vlAuJour(navs, "2027-03-31")).toBe(12);
    expect(vlAuJour([{ navDate: "2027-03-01", nav: 0 }], "2027-03-02")).toBeUndefined();
  });
});

describe("l'encours moyen d'un mois", () => {
  it("la moyenne, jour par jour, des parts détenues × la VL du jour", () => {
    /* 10 parts du 1er au 15 avril (15 jours à VL 100), puis 20 parts du 16 au 30 (15 jours à VL 100) : (15×1000 + 15×2000) / 30 = 1500. */
    const m = [{ jour: "2027-04-01", units: 10 }, { jour: "2027-04-16", units: 10 }];
    expect(encoursMoyenDuMois(m, [{ navDate: "2027-03-01", nav: 100 }], "2027-04")).toBe(1_500);
  });

  it("un jour sans VL connue ne compte pas, et rien sans aucun jour valorisable", () => {
    const m = [{ jour: "2027-04-01", units: 10 }];
    expect(encoursMoyenDuMois(m, [{ navDate: "2027-04-16", nav: 100 }], "2027-04")).toBe(1_000);
    expect(encoursMoyenDuMois(m, [], "2027-04")).toBe(0);
  });

  it("une VL qui bouge dans le mois pèse jour après jour", () => {
    const m = [{ jour: "2027-04-01", units: 10 }];
    const navs = [{ navDate: "2027-04-01", nav: 100 }, { navDate: "2027-04-16", nav: 200 }];
    expect(encoursMoyenDuMois(m, navs, "2027-04")).toBe(1_500);
  });
});

describe("la rétrocession du mois : encours × taux annuel ÷ 12, bornée", () => {
  const regle = { ...REGLE_FERMEE, effetLe: "2027-01-01", tiersEncoursPct: 0.3, tiersEncoursMin: 10_000, tiersEncoursMax: 50_000 };
  it("sur un encours moyen, avec plancher et plafond mensuels, et rien avant la date de départ", () => {
    expect(retrocessionDuMois(regle, 120_000_000, "2027-03-31")).toBe(30_000);
    expect(retrocessionDuMois(regle, 1_000_000, "2027-03-31")).toBe(10_000);
    expect(retrocessionDuMois(regle, 900_000_000, "2027-03-31")).toBe(50_000);
    expect(retrocessionDuMois(regle, 120_000_000, "2026-12-31")).toBe(0);
    expect(retrocessionDuMois(regle, 0, "2027-03-31")).toBe(0);
  });
});

describe("le rapprochement du reçu", () => {
  it("sans reçu : rien à comparer ; à un franc près : juste ; sinon écart signé (reçu moins attendu)", () => {
    expect(rapprocherLeRecu(30_000, undefined)).toEqual({ etat: "sans_recu", ecart: 0 });
    expect(rapprocherLeRecu(30_000, { montant: 30_001, le: "2027-04-05" })).toEqual({ etat: "juste", ecart: 1 });
    expect(rapprocherLeRecu(30_000, { montant: 29_600, le: "2027-04-05" })).toEqual({ etat: "ecart", ecart: -400 });
    expect(rapprocherLeRecu(30_000, { montant: 31_000, le: "2027-04-05" }).ecart).toBe(1_000);
  });

  it("l'arrondi d'un franc n'est pas un écart, deux francs en sont un", () => {
    expect(rapprocherLeRecu(30_000, { montant: 29_999, le: "2027-04-05" }).etat).toBe("juste");
    expect(rapprocherLeRecu(30_000, { montant: 30_002, le: "2027-04-05" }).etat).toBe("ecart");
    expect(rapprocherLeRecu(30_000, { montant: 30_050, le: "2027-04-05" }).etat).toBe("ecart");
  });

  it("le reçu se range par source et par mois", () => {
    expect(cleDuRecu("f1", "2027-04")).toBe("f1|2027-04");
  });
});

describe("le rapprochement est écrit par le desk, dans la table du desk, avec l'audit", () => {
  const a = lire("src/app/desk/frais/rapprochement/actions.ts");
  const p = lire("src/app/desk/frais/rapprochement/page.tsx");

  it("la saisie passe par requireDesk, par l'audit avant/après et par la table réservée au desk", () => {
    expect(a).toMatch(/requireDesk\("\/desk\/frais\/rapprochement"\)/);
    expect(a).toMatch(/^\s*await audit\("frais\.recu"[^\n]*before: avant, after: apres/m);
    expect(a).toMatch(/upsertPrive\(RECU_KIND/);
    expect(a).not.toMatch(/upsertReference/);
  });

  it("la page compte les mêmes ordres que le suivi et prend la règle de la date, avec la rétrocession de la règle « souscription »", () => {
    expect(p).toMatch(/ordreExecute\(i, o\)/);
    expect(p).toMatch(/suiviDesFrais\(ordres, bareme, historique\)/);
    expect(p).toMatch(/regleALaDate\(bareme, historique, "fonds\.souscription", fin\)/);
    expect(p).toMatch(/retrocessionDuMois\(regleDeRetro, encours, fin\)/);
    expect(p).toMatch(/await loadRegistry\(\)/);
    expect(lire("src/app/desk/frais/suivi/page.tsx")).toMatch(/from "@\/lib\/frais-ordres"/);
  });

  it("la rétrocession sur l'encours ne se règle que sur la règle « Fonds · souscription », une seule fois", () => {
    const f = lire("src/app/desk/frais/Formulaire.tsx");
    expect(f.match(/disabled=\{cle !== "fonds\.souscription"\}/g)).toHaveLength(3);
  });
});
