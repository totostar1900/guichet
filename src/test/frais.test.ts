import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BAREME_DE_FRAIS_FERME, REGLES_LUES_PAR_L_ORDRE, REGLE_FERMEE, baremePourLeClient, baremeDeFraisLu, departRefuse, exigeUnPreavis, fraisDeLOrdre, fraisDuClient, fraisLusParLeClient, premierDepartPossible, recetteDeTiers, retrocessionDuMois, type BaremeDeFrais } from "@/lib/domain/frais";

import type { Intent, Offer } from "@/lib/domain/types";
import { positionFor } from "@/lib/documents/position";
import { plafondPropose } from "@/lib/domain/plafond";
import { setFraisClient } from "@/lib/frais-registre";

const lire = (f: string) => readFileSync(f, "utf8");
const JOUR = "2026-11-14";
const ouverte = (o: Partial<typeof REGLE_FERMEE>) => ({ ...REGLE_FERMEE, ...o });
const bareme = (cle: keyof BaremeDeFrais, r: Partial<typeof REGLE_FERMEE>): BaremeDeFrais => ({ ...BAREME_DE_FRAIS_FERME, [cle]: ouverte(r) });

describe("le barème des frais est fermé tant que la direction n'a rien arrêté", () => {
  it("ne prend rien, et ni plancher ni date ne déclenchent un prélèvement tout seuls", () => {
    expect(fraisDuClient(REGLE_FERMEE, 10_000_000, JOUR)).toBe(0);
    expect(fraisDuClient(ouverte({ clientMin: 5_000 }), 10_000_000, JOUR)).toBe(0);
    expect(fraisDuClient(ouverte({ effetLe: "2026-01-01", clientMin: 5_000 }), 10_000_000, JOUR)).toBe(0);
    expect(fraisLusParLeClient(BAREME_DE_FRAIS_FERME, JOUR)).toEqual([]);
  });

  it("une clé absente de la base ne casse rien", () => {
    const b = baremeDeFraisLu({ "titres.achat": { clientPct: 0.5, effetLe: "2027-02-03" } });
    expect(b["titres.achat"].clientPct).toBe(0.5);
    expect(b["fonds.rachat"]).toEqual(REGLE_FERMEE);
    expect(baremeDeFraisLu(undefined)).toEqual(BAREME_DE_FRAIS_FERME);
  });
});

describe("la date de départ est propre à chaque règle", () => {
  const r = ouverte({ clientPct: 0.5, clientMin: 500, effetLe: "2027-02-03" });

  it("avant sa date la règle calcule zéro, le jour même et après elle s'applique", () => {
    expect(fraisDuClient(r, 1_000_000, "2027-02-02")).toBe(0);
    expect(fraisDuClient(r, 1_000_000, "2027-02-03")).toBe(5_000);
  });

  it("le plancher ne s'applique qu'à ce qui est déjà dû, le plafond coupe, un montant nul ne doit rien", () => {
    expect(fraisDuClient(r, 10_000, "2027-02-03")).toBe(500);
    expect(fraisDuClient(ouverte({ ...r, clientMax: 3_000 }), 1_000_000, "2027-02-03")).toBe(3_000);
    expect(fraisDuClient(r, 0, "2027-02-03")).toBe(0);
  });

  it("deux règles ont chacune leur date", () => {
    const b: BaremeDeFrais = { ...BAREME_DE_FRAIS_FERME, "titres.achat": r, "titres.vente": ouverte({ clientPct: 0.5, effetLe: "2027-05-01" }) };
    const lues = fraisLusParLeClient(b, "2027-03-01");
    expect(lues.map((l) => [l.cle, l.enVigueur])).toEqual([["titres.achat", true], ["titres.vente", false]]);
  });
});

describe("le préavis de trente jours", () => {
  it("refuse une date plus proche que aujourd'hui + 30 jours, accepte celle-là", () => {
    expect(premierDepartPossible("2026-11-14")).toBe("2026-12-14");
    expect(departRefuse("2026-12-13", "2026-11-14")).toMatch(/préavis/);
    expect(departRefuse("2026-12-14", "2026-11-14")).toBeNull();
    expect(departRefuse("pas une date", "2026-11-14")).toMatch(/invalide/i);
  });

  it("une hausse se prévient, une baisse ou une fermeture non", () => {
    const avant = ouverte({ clientPct: 0.5, clientMin: 500, clientMax: 5_000, effetLe: "2026-12-01" });
    expect(exigeUnPreavis(avant, ouverte({ ...avant, clientPct: 0.75 }))).toBe(true);
    expect(exigeUnPreavis(avant, ouverte({ ...avant, clientMin: 1_000 }))).toBe(true);
    expect(exigeUnPreavis(avant, ouverte({ ...avant, clientMax: 0 }))).toBe(true);
    expect(exigeUnPreavis(avant, ouverte({ ...avant, clientPct: 0.25 }))).toBe(false);
    expect(exigeUnPreavis(avant, ouverte({ ...avant, clientPct: 0 }))).toBe(false);
    expect(exigeUnPreavis(REGLE_FERMEE, ouverte({ clientPct: 0.3 }))).toBe(true);
  });
});

describe("ce que le client lit ne dit jamais ce que la maison reçoit", () => {
  const b = bareme("fonds.souscription", { clientPct: 1, effetLe: "2027-02-03", tiersPct: 0.4, tiersPartDesDroitsPct: 40, tiersEncoursPct: 0.3 });

  it("la lecture du client ne porte aucun champ « tiers »", () => {
    const lue = fraisLusParLeClient(b, "2027-03-01")[0];
    expect(Object.keys(lue).filter((k) => /tiers|encours|partdesdroits/i.test(k))).toEqual([]);
  });

  it("une règle sans taux client n'est pas écrite, même quand la maison reçoit quelque chose", () => {
    expect(fraisLusParLeClient(bareme("fonds.rachat", { tiersPct: 1, effetLe: "2027-02-03" }), "2027-03-01")).toEqual([]);
  });

  it("les recettes de tiers se calculent au desk, jamais avant la date", () => {
    const r = b["fonds.souscription"];
    expect(recetteDeTiers(r, 1_000_000, "2027-02-02", 10_000)).toBe(0);
    expect(recetteDeTiers(r, 1_000_000, "2027-02-03", 10_000)).toBe(4_000 + 4_000);
    expect(retrocessionDuMois(r, 120_000_000, "2027-02-03")).toBe(30_000);
    expect(retrocessionDuMois(r, 120_000_000, "2027-01-01")).toBe(0);
  });
});

describe("chaque montant du barème a un plancher et un plafond, client comme tiers", () => {
  const r = ouverte({ effetLe: "2027-02-03", tiersPct: 0.4, tiersMin: 300, tiersMax: 2_000, tiersEncoursPct: 0.3, tiersEncoursMin: 10_000, tiersEncoursMax: 50_000 });

  it("la recette par opération est bornée, et le plancher ne crée pas une recette là où il n'y en a pas", () => {
    expect(recetteDeTiers(r, 10_000, "2027-02-03")).toBe(300);
    expect(recetteDeTiers(r, 1_000_000, "2027-02-03")).toBe(2_000);
    expect(recetteDeTiers(r, 400_000, "2027-02-03")).toBe(1_600);
    expect(recetteDeTiers(ouverte({ effetLe: "2027-02-03", tiersMin: 300 }), 1_000_000, "2027-02-03")).toBe(0);
  });

  it("la rétrocession mensuelle est bornée de la même façon", () => {
    expect(retrocessionDuMois(r, 12_000_000, "2027-02-03")).toBe(10_000);
    expect(retrocessionDuMois(r, 400_000_000, "2027-02-03")).toBe(50_000);
    expect(retrocessionDuMois(r, 0, "2027-02-03")).toBe(0);
  });

  it("le desk refuse un plafond inférieur au plancher, pour chacun des trois montants", () => {
    const a = readFileSync("src/app/desk/frais/actions.ts", "utf8");
    for (const c of ["clientMax", "tiersMax", "tiersEncoursMax"]) expect(a, `${c} n'est pas comparé à son plancher`).toMatch(new RegExp(`prochaine\\.${c} > 0 && prochaine\\.${c} < `));
  });
});

describe("les frais d'un ordre se lisent d'un seul endroit", () => {
  const b = bareme("titres.achat", { clientPct: 0.5, clientMin: 500, effetLe: "2027-02-03" });

  it("le taux propre à la ligne l'emporte sur le barème, sinon le barème, sinon rien", () => {
    expect(fraisDeLOrdre(b, "titres", "achat", 200_000, "2027-03-01", 1)).toEqual({ montant: 2_000, pct: 1, source: "ligne" });
    expect(fraisDeLOrdre(b, "titres", "achat", 200_000, "2027-03-01")).toEqual({ montant: 1_000, pct: 0.5, source: "bareme" });
    expect(fraisDeLOrdre(b, "titres", "achat", 200_000, "2027-01-01")).toEqual({ montant: 0, pct: 0, source: "aucune" });
    expect(fraisDeLOrdre(b, "titres", "vente", 200_000, "2027-03-01").source).toBe("aucune");
    expect(fraisDeLOrdre(b, "adjudication", "rachat", 200_000, "2027-03-01").source).toBe("aucune");
  });
});

describe("l'écran du client dit « Frais » et ne nomme aucune destination (14 novembre 2026)", () => {
  const annexe = lire("src/app/moi/tarifs/page.tsx");

  it("l'annexe n'a plus de colonne « Ce que … prend » ni de formule qui nomme qui perçoit", () => {
    expect(annexe).not.toMatch(/Ce que \{c\} prend|Ce que le produit prend|sans que cela nous revienne|BVMAC/);
    expect(annexe).toMatch(/<th>\{t\("Frais"\)\}<\/th>/);
  });

  it("l'annexe ne lit que la vue du client, jamais le barème brut", () => {
    expect(annexe).toMatch(/fraisLusParLeClient\(/);
    expect(annexe).not.toMatch(/recetteDeTiers|retrocessionDuMois|tiersPct|tiersEncours|tiersPart/);
  });

  it("le récapitulatif de l'ordre dit « frais », pas « commission »", () => {
    const ordre = lire("src/app/moi/ordres/[id]/page.tsx");
    expect(ordre).toMatch(/t\("dont frais \{p\} %"/);
    expect(ordre).not.toMatch(/t\("dont commission/);
  });
});

describe("le desk arrête une règle par la direction, avec l'avant et l'après", () => {
  const actions = lire("src/app/desk/frais/actions.ts");

  it("passe par requireResponsable, l'audit avant/après et le préavis", () => {
    expect(actions).toMatch(/requireResponsable\("\/desk\/frais"\)/);
    expect(actions).toMatch(/^\s*await audit\("policy\.frais"[^\n]*before: ancienne, after: prochaine/m);
    expect(actions).toMatch(/departRefuse\(/);
    expect(actions).toMatch(/exigeUnPreavis\(/);
  });

  it("refuse un taux client sur une règle que le calcul de l'ordre ne lit pas (les fonds)", () => {
    expect(actions).toMatch(/clientPct > 0 && !REGLES_LUES_PAR_L_ORDRE\.includes\(cle\)/);
    expect(REGLES_LUES_PAR_L_ORDRE).toEqual(["titres.achat", "titres.vente", "adjudication.souscription"]);
  });

  it("le barème se lit fermé sur une panne de lecture", () => {
    const p = lire("src/lib/policy.ts");
    expect(p).toMatch(/loadBaremeDeFrais[\s\S]*?catch \{\s*return BAREME_DE_FRAIS_FERME;/);
  });
});

describe("le calcul d'un ordre lit le barème (14 novembre 2026)", () => {
  const offre = (extra: Record<string, unknown> = {}) =>
    ({ id: "o", kind: "MARCHE", instrument: "action", status: "published", hidden: false, isin: "CMX", title: "X", nominal: 10000, lastPrice: 1000, ask: 1000, bid: 1000, commissionPct: 0, country: "Cameroun", issuer: "x", blurb: "", documents: [], opensAt: "2020-01-01T09:00:00", deadlineAt: "2099-01-01T00:00:00", settleOn: "2027-03-05", version: 1, ...extra }) as unknown as Offer;
  const ordre = (type: "achat" | "vente", extra: Record<string, unknown> = {}) => ({ id: "i", type, amount: 100, createdAt: "2027-03-01T10:00:00", limitPrice: 1000, ...extra }) as unknown as Intent;
  const poser = (cle: keyof BaremeDeFrais, r: Partial<typeof REGLE_FERMEE>) => setFraisClient(baremePourLeClient(bareme(cle, r)));

  it("avant la date de départ ou sans barème : rien, comme avant", () => {
    setFraisClient(BAREME_DE_FRAIS_FERME);
    expect(positionFor(ordre("achat"), offre()).commission).toBe(0);
    poser("titres.achat", { clientPct: 0.5, effetLe: "2027-04-01" });
    expect(positionFor(ordre("achat"), offre()).commission).toBe(0);
  });

  it("un achat de titres paie la règle « achat », plancher et plafond compris, et le total suit", () => {
    poser("titres.achat", { clientPct: 0.5, clientMin: 700, clientMax: 800, effetLe: "2027-02-03" });
    const p = positionFor(ordre("achat"), offre());
    expect(p.principal).toBe(100_000);
    expect(p.commission).toBe(700);
    expect(p.total).toBe(100_700);
    expect(positionFor(ordre("achat", { amount: 1000, limitPrice: 1000 }), offre()).commission).toBe(800);
  });

  it("une vente paie la règle « vente », et le client reçoit le net", () => {
    setFraisClient(baremePourLeClient({ ...BAREME_DE_FRAIS_FERME, "titres.achat": ouverte({ clientPct: 2, effetLe: "2027-02-03" }), "titres.vente": ouverte({ clientPct: 1, effetLe: "2027-02-03" }) }));
    const p = positionFor(ordre("vente"), offre());
    expect(p.commission).toBe(1_000);
    expect(p.total).toBe(-99_000);
  });

  it("le taux propre à la ligne l'emporte sur le barème, comme avant", () => {
    poser("titres.achat", { clientPct: 0.5, effetLe: "2027-02-03" });
    expect(positionFor(ordre("achat"), offre({ commissionPct: 1 })).commission).toBeCloseTo(1_000, 6);
  });

  it("le plafond signé couvre les frais : il ne peut pas être inférieur au coût avec frais", () => {
    poser("titres.achat", { clientPct: 1, effetLe: "2027-02-03" });
    const sans = positionFor(ordre("achat"), offre());
    expect(sans.total).toBe(101_000);
    expect(plafondPropose(ordre("achat"), offre())).toBeGreaterThanOrEqual(101_000);
  });

  it("l'adjudication paie sa règle ; un fonds n'est pas touché", () => {
    poser("adjudication.souscription", { clientPct: 0.25, effetLe: "2027-02-03" });
    const adj = positionFor({ id: "i", type: "ferme", amount: 1_000_000, createdAt: "2027-03-01T10:00:00" } as unknown as Intent, offre({ kind: "BTA", instrument: undefined, precountRate: 5, maturityOn: "2027-09-05", settleOn: "2027-03-05", nominal: 1_000_000 }));
    expect(adj.commission).toBeGreaterThan(0);
    setFraisClient(baremePourLeClient({ ...BAREME_DE_FRAIS_FERME, "fonds.souscription": ouverte({ clientPct: 2, effetLe: "2027-02-03" }) }));
    const fonds = offre({ kind: "FONDS", fund: { nav: 10_000, entryFeePct: 1, exitFeePct: 0 } });
    const f = positionFor({ id: "i", type: "souscription", amount: 1_010_000, createdAt: "2027-03-01T10:00:00" } as unknown as Intent, fonds);
    expect(f.commission).toBeCloseTo(10_000, 0);
  });

  it("le barème posé pour le calcul ne porte jamais ce que la maison reçoit de tiers", () => {
    const pose = baremePourLeClient(bareme("fonds.souscription", { clientPct: 1, effetLe: "2027-02-03", tiersPct: 1, tiersMin: 5, tiersMax: 9, tiersPartDesDroitsPct: 40, tiersEncoursPct: 0.3, tiersEncoursMin: 1, tiersEncoursMax: 2 }));
    for (const cle of Object.keys(pose) as (keyof BaremeDeFrais)[]) {
      expect(pose[cle].tiersPct + pose[cle].tiersMin + pose[cle].tiersMax + pose[cle].tiersPartDesDroitsPct + pose[cle].tiersEncoursPct + pose[cle].tiersEncoursMin + pose[cle].tiersEncoursMax).toBe(0);
    }
    expect(pose["fonds.souscription"].clientPct).toBe(1);
  });

  it("loadRegistry installe le barème, fermé sur une panne de lecture", () => {
    const r = readFileSync("src/lib/reference.ts", "utf8");
    expect(r).toMatch(/setFraisClient\(frais\)/);
    expect(r).toMatch(/loadFraisClient[\s\S]*?catch \{\s*return BAREME_DE_FRAIS_FERME;/);
  });

  it("l'ordre signé, le plafond et les avis passent par la même fonction", () => {
    const pos = readFileSync("src/lib/documents/position.ts", "utf8");
    expect(pos.match(/\.\.\.frais\(offer, intent,/g)?.length).toBe(6);
  });
});
