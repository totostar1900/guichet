import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { suiviDesFrais, type OrdreExecute } from "@/lib/domain/frais-suivi";
import { BAREME_DE_FRAIS_FERME, REGLES_LUES_PAR_L_ORDRE, baremeALaDate, historiqueLu, historiquePourLeClient, regleALaDate, type HistoriqueDeFrais, REGLE_FERMEE, baremePourLeClient, baremeDeFraisLu, departRefuse, exigeUnPreavis, fraisDeLOrdre, fraisDuClient, fraisLusParLeClient, premierDepartPossible, recetteDeTiers, retrocessionDuMois, type BaremeDeFrais } from "@/lib/domain/frais";

import type { Intent, Offer } from "@/lib/domain/types";
import { positionFor } from "@/lib/documents/position";
import { plafondPropose } from "@/lib/domain/plafond";
import { setFraisClient } from "@/lib/frais-registre";
import { fourchetteDePassage, fourchetteDeFonds, pctTotal, souscriptionNette } from "@/lib/domain/frais-fonds";

const lire = (f: string) => readFileSync(f, "utf8");
const JOUR = "2026-11-14";
const ouverte = (o: Partial<typeof REGLE_FERMEE>) => ({ ...REGLE_FERMEE, ...o });
const bareme = (cle: keyof BaremeDeFrais, r: Partial<typeof REGLE_FERMEE>): BaremeDeFrais => ({ ...BAREME_DE_FRAIS_FERME, [cle]: ouverte(r) });
const offre = (extra: Record<string, unknown> = {}) =>
  ({ id: "o", kind: "MARCHE", instrument: "action", status: "published", hidden: false, isin: "CMX", title: "X", nominal: 10000, lastPrice: 1000, ask: 1000, bid: 1000, commissionPct: 0, country: "Cameroun", issuer: "x", blurb: "", documents: [], opensAt: "2020-01-01T09:00:00", deadlineAt: "2099-01-01T00:00:00", settleOn: "2027-03-05", version: 1, ...extra }) as unknown as Offer;
const ordre = (type: "achat" | "vente", extra: Record<string, unknown> = {}) => ({ id: "i", type, amount: 100, createdAt: "2027-03-01T10:00:00", limitPrice: 1000, ...extra }) as unknown as Intent;
const poser = (cle: keyof BaremeDeFrais, r: Partial<typeof REGLE_FERMEE>) => setFraisClient(baremePourLeClient(bareme(cle, r)));



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
    expect(ordre).toMatch(/t\("dont frais"\)/);
    expect(ordre).not.toMatch(/t\("dont commission|droits d'entrée/);
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

  it("refuse un taux client sur une règle que le calcul de l'ordre ne lit pas", () => {
    expect(actions).toMatch(/clientPct > 0 && !REGLES_LUES_PAR_L_ORDRE\.includes\(cle\)/);
    expect(REGLES_LUES_PAR_L_ORDRE).toEqual(["fonds.souscription", "fonds.rachat", "titres.achat", "titres.vente", "adjudication.souscription"]);
  });

  it("le barème se lit fermé sur une panne de lecture", () => {
    const p = lire("src/lib/policy.ts");
    expect(p).toMatch(/loadBaremeDeFrais[\s\S]*?catch \{\s*return BAREME_DE_FRAIS_FERME;/);
  });
});

describe("le calcul d'un ordre lit le barème (14 novembre 2026)", () => {
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

  it("l'adjudication paie sa règle", () => {
    poser("adjudication.souscription", { clientPct: 0.25, effetLe: "2027-02-03" });
    const adj = positionFor({ id: "i", type: "ferme", amount: 1_000_000, createdAt: "2027-03-01T10:00:00" } as unknown as Intent, offre({ kind: "BTA", instrument: undefined, precountRate: 5, maturityOn: "2027-09-05", settleOn: "2027-03-05", nominal: 1_000_000 }));
    expect(adj.commission).toBeGreaterThan(0);
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
    expect(r).toMatch(/setFraisClient\(frais\.bareme, frais\.historique\)/);
    expect(r).toMatch(/loadFraisClient[\s\S]*?catch \{\s*return \{ bareme: BAREME_DE_FRAIS_FERME, historique: \[\] \};/);
  });

  it("l'ordre signé, le plafond et les avis passent par la même fonction", () => {
    const pos = readFileSync("src/lib/documents/position.ts", "utf8");
    expect(pos.match(/\.\.\.frais\(offer, intent,/g)?.length).toBe(6);
  });
});

describe("un fonds : les frais ajoutés se lisent en un seul total avec ceux du fonds (14 novembre 2026)", () => {
  const fonds = () => offre({ kind: "FONDS", fund: { nav: 10_000, entryFeePct: 1, exitFeePct: 0.5, navDate: "2027-03-01" } });
  const souscription = (amount: number) => ({ id: "i", type: "souscription", amount, createdAt: "2027-03-01T10:00:00" }) as unknown as Intent;
  const rachat = (units: number) => ({ id: "i", type: "rachat", amount: units, createdAt: "2027-03-01T10:00:00" }) as unknown as Intent;

  it("sans règle en vigueur : exactement les droits du fonds, au même arrondi qu'avant", () => {
    setFraisClient(BAREME_DE_FRAIS_FERME);
    expect(souscriptionNette({ entryFeePct: 1 }, 1_010_000).net).toBe(1_010_000 / 1.01);
    const p = positionFor(souscription(1_010_000), fonds());
    expect(p.principal).toBe(1_000_000);
    expect(p.commission).toBe(10_000);
    expect(p.total).toBe(1_010_000);
    poser("fonds.souscription", { clientPct: 2, effetLe: "2027-04-01" });
    expect(positionFor(souscription(1_010_000), fonds()).commission).toBe(10_000);
  });

  it("la règle s'ajoute aux droits : le montant versé reste ferme, le net baisse, le total des frais est unique", () => {
    poser("fonds.souscription", { clientPct: 2, effetLe: "2027-02-03" });
    const p = positionFor(souscription(1_030_000), fonds());
    expect(p.principal).toBe(1_000_000);
    expect(p.commission).toBeCloseTo(30_000, 6);
    expect(p.total).toBe(1_030_000);
  });

  it("le plancher de la règle se prend sur le montant versé : net + frais = montant", () => {
    poser("fonds.souscription", { clientPct: 2, clientMin: 50_000, effetLe: "2027-02-03" });
    const { net, frais } = souscriptionNette({ entryFeePct: 1 }, 1_060_000, "2027-03-01");
    expect(Math.round(net)).toBe(1_000_000);
    expect(Math.round(frais)).toBe(60_000);
  });

  it("un rachat : droits de sortie + règle, en un total, et le client reçoit le net", () => {
    poser("fonds.rachat", { clientPct: 1, effetLe: "2027-02-03" });
    const p = positionFor(rachat(100), fonds());
    expect(p.commission).toBeCloseTo(15_000, 6);
    expect(p.total).toBeCloseTo(-985_000, 6);
  });

  it("le taux affiché sur une carte ou une fiche est le total, seulement quand la règle est en vigueur", () => {
    poser("fonds.souscription", { clientPct: 2, effetLe: "2027-02-03" });
    expect(pctTotal({ entryFeePct: 1, exitFeePct: 0 }, "souscription", "2027-03-01")).toBe(3);
    expect(pctTotal({ entryFeePct: 1, exitFeePct: 0 }, "souscription", "2027-01-01")).toBe(1);
    expect(pctTotal({ entryFeePct: 1, exitFeePct: 0.5 }, "rachat", "2027-03-01")).toBe(0.5);
  });
});

/**
 * LA RÈGLE DE LA MAISON (14 novembre 2026) : le client ne voit jamais la destination d'un frais, ni sa décomposition. Pour toute
 * transaction il lit UNE ligne, les frais totaux à payer.
 */
describe("le passage d'un fonds à l'autre se lit en une fourchette cumulée (14 novembre 2026)", () => {
  const fonds = [{ entryFeePct: 1, exitFeePct: 0.5 }, { entryFeePct: 3, exitFeePct: 0 }, { entryFeePct: 0, exitFeePct: 1 }];

  it("sans règle : du plus bas au plus haut de la sortie plus ceux de l'entrée", () => {
    setFraisClient(BAREME_DE_FRAIS_FERME);
    expect(fourchetteDeFonds(fonds, "souscription", "2027-03-01")).toEqual({ min: 1, max: 3 });
    expect(fourchetteDeFonds(fonds, "rachat", "2027-03-01")).toEqual({ min: 0.5, max: 1 });
    expect(fourchetteDePassage(fonds, "2027-03-01")).toEqual({ min: 1.5, max: 4 });
  });

  it("les règles de la maison s'ajoutent des deux côtés, seulement quand elles sont en vigueur", () => {
    setFraisClient(baremePourLeClient({ ...BAREME_DE_FRAIS_FERME, "fonds.souscription": ouverte({ clientPct: 2, effetLe: "2027-02-03" }), "fonds.rachat": ouverte({ clientPct: 1, effetLe: "2027-02-03" }) }));
    expect(fourchetteDePassage(fonds, "2027-03-01")).toEqual({ min: 3, max: 7 });
    expect(fourchetteDePassage(fonds, "2027-01-01")).toEqual({ min: 1.5, max: 4 });
  });

  it("sans aucun frais d'un côté, ce côté compte zéro ; sans frais du tout, rien", () => {
    setFraisClient(BAREME_DE_FRAIS_FERME);
    expect(fourchetteDePassage([{ entryFeePct: 2, exitFeePct: 0 }], "2027-03-01")).toEqual({ min: 2, max: 2 });
    expect(fourchetteDePassage([{ entryFeePct: 0, exitFeePct: 0 }], "2027-03-01")).toBeUndefined();
  });

  it("l'annexe lit la fourchette de passage au lieu d'une phrase", () => {
    const a = lire("src/app/moi/tarifs/page.tsx");
    expect(a).toMatch(/frais: fraisDePassage\(\)/);
    expect(a).not.toMatch(/Deux ordres, un rachat puis une souscription/);
  });
});

describe("une seule ligne de frais totaux, sans destination ni décomposition", () => {
  const ECRANS_DU_CLIENT = [
    "src/app/moi/tarifs/page.tsx",
    "src/app/moi/ordres/[id]/page.tsx",
    "src/app/moi/provision/PlacerLaProvision.tsx",
    "src/app/offres/[id]/FicheReading.tsx",
    "src/lib/documents/pdf/fund-templates.tsx",
    "src/lib/documents/pdf/templates.tsx",
    "src/lib/domain/estimate.ts",
    "src/lib/domain/sheet.ts",
    "src/lib/domain/back.ts",
    "src/lib/domain/summary.ts",
  ];
  const INTERDITS = /droits d['’](entrée|sortie)|Droits d['’](entrée|sortie)|Frais du fonds|frais du fonds|acquis au fonds|Commission d'intermédiation|[Ff]rais de marché|sans que cela nous revienne/;

  it("aucun écran ni document du client ne nomme une part du fonds, une destination ou une commission", () => {
    for (const f of ECRANS_DU_CLIENT) expect(lire(f).match(INTERDITS)?.[0], `${f} décompose ou nomme la destination d'un frais`).toBeUndefined();
  });

  it("la fiche d'un fonds écrit le total des frais à la sortie ; l'avertissement de performance « avant frais » reste un texte réglementaire à part", () => {
    const f = lire("src/app/offres/[id]/FicheFonds.tsx");
    expect(f).toMatch(/pctTotal\(f, "rachat"\)/);
    expect(f).toMatch(/t\("Frais à la sortie"\)/);
    expect(f).not.toMatch(/Frais du fonds|frais du fonds|acquis au fonds/);
  });

  it("les calculs de fonds additionnent les droits et la règle à un seul endroit", () => {
    for (const f of ["src/lib/documents/position.ts", "src/lib/domain/estimate.ts", "src/lib/domain/sheet.ts", "src/lib/domain/back.ts", "src/app/offres/[id]/FicheReading.tsx", "src/app/moi/ordres/[id]/page.tsx"]) {
      expect(lire(f), `${f} ne passe pas par frais-fonds`).toMatch(/from "(@\/lib\/domain|\.)\/frais-fonds"/);
    }
    for (const f of ["src/lib/domain/estimate.ts", "src/lib/domain/sheet.ts", "src/lib/domain/back.ts", "src/app/offres/[id]/FicheReading.tsx"]) {
      expect(lire(f), `${f} recalcule le net d'une souscription à la main`).not.toMatch(/amount \/ \(1 \+ f\.entryFeePct/);
    }
  });

  it("le navigateur reçoit le même barème que le serveur (la part client seule)", () => {
    expect(lire("src/app/layout.tsx")).toMatch(/frais=\{getFraisClient\(\)\}/);
    expect(lire("src/components/RegistryProvider.tsx")).toMatch(/setFraisClient\(frais, historiqueDeFrais\)/);
  });
});

describe("le passé ne se réécrit pas : chaque ordre se calcule avec la règle de sa date (14 novembre 2026)", () => {
  const ancienne = ouverte({ clientPct: 0.5, effetLe: "2027-01-10" });
  const nouvelle = ouverte({ clientPct: 1, effetLe: "2027-03-15", tiersPct: 0.2 });
  const h: HistoriqueDeFrais = [{ cle: "titres.achat", jusquAu: "2027-02-10", regle: ancienne }];
  const courant = { ...BAREME_DE_FRAIS_FERME, "titres.achat": nouvelle };

  it("avant le changement : l'ancienne règle ; après : la courante", () => {
    expect(regleALaDate(courant, h, "titres.achat", "2027-02-09")).toBe(ancienne);
    expect(regleALaDate(courant, h, "titres.achat", "2027-02-10")).toBe(nouvelle);
    expect(regleALaDate(courant, [], "titres.achat", "2020-01-01")).toBe(nouvelle);
  });

  it("deux changements : chaque période garde sa règle", () => {
    const milieu = ouverte({ clientPct: 0.7, effetLe: "2027-02-20" });
    const deux: HistoriqueDeFrais = [...h, { cle: "titres.achat", jusquAu: "2027-03-01", regle: milieu }];
    expect(regleALaDate(courant, deux, "titres.achat", "2027-02-01").clientPct).toBe(0.5);
    expect(regleALaDate(courant, deux, "titres.achat", "2027-02-25").clientPct).toBe(0.7);
    expect(regleALaDate(courant, deux, "titres.achat", "2027-03-20").clientPct).toBe(1);
  });

  it("le barème d'un jour recompose toutes les règles", () => {
    expect(baremeALaDate(courant, h, "2027-02-01")["titres.achat"]).toBe(ancienne);
    expect(baremeALaDate(courant, h, "2027-03-20")["titres.achat"]).toBe(nouvelle);
  });

  it("le calcul d'un ordre prend la règle de sa date, même après un changement de taux", () => {
    setFraisClient(baremePourLeClient(courant), historiquePourLeClient(h));
    expect(positionFor(ordre("achat", { createdAt: "2027-02-01T10:00:00" }), offre()).commission).toBe(500);
    expect(positionFor(ordre("achat", { createdAt: "2027-03-20T10:00:00" }), offre()).commission).toBe(1_000);
    setFraisClient(BAREME_DE_FRAIS_FERME);
  });

  it("l'historique envoyé au navigateur ne porte rien de ce que la maison reçoit de tiers", () => {
    const [v] = historiquePourLeClient([{ cle: "titres.achat", jusquAu: "2027-02-10", regle: ouverte({ clientPct: 1, effetLe: "2027-01-01", tiersPct: 2, tiersMax: 9, tiersEncoursPct: 1 }) }]);
    expect(v.regle.tiersPct + v.regle.tiersMax + v.regle.tiersEncoursPct).toBe(0);
    expect(v.regle.clientPct).toBe(1);
  });

  it("un historique mal formé se lit sans casser", () => {
    expect(historiqueLu(undefined)).toEqual([]);
    expect(historiqueLu([{ cle: "nimporte", jusquAu: "2027-01-01" }, { cle: "titres.achat" }, { cle: "titres.vente", jusquAu: "2027-01-01", regle: { clientPct: 1 } }])).toHaveLength(1);
  });

  it("le desk range l'ancienne règle quand elle change, et seulement alors", () => {
    const a = lire("src/app/desk/frais/actions.ts");
    expect(a).toMatch(/JSON\.stringify\(ancienne\) !== JSON\.stringify\(prochaine\)/);
    expect(a).toMatch(/jusquAu: aujourdHui, regle: ancienne/);
  });
});

describe("le suivi des frais : trois chiffres et un tableau, calculés avec la règle de la date (14 novembre 2026)", () => {
  const regleTitres = ouverte({ clientPct: 1, effetLe: "2027-01-01", tiersPct: 0.3 });
  const regleFonds = ouverte({ clientPct: 2, effetLe: "2027-01-01", tiersPartDesDroitsPct: 50, tiersPct: 0.1 });
  const bar: BaremeDeFrais = { ...BAREME_DE_FRAIS_FERME, "titres.achat": regleTitres, "fonds.souscription": regleFonds };
  const o = (extra: Partial<OrdreExecute>): OrdreExecute => ({ id: "x", offerId: "f1", ref: "R", jour: "2027-03-01", famille: "titres", operation: "achat", base: 1_000_000, droitsDuFonds: 0, fraisDeLaLigne: 0, regle: false, ...extra });

  it("à encaisser : les frais du client sur les ordres non réglés ; encaissés : sur les réglés", () => {
    const s = suiviDesFrais([o({ id: "a" }), o({ id: "b", regle: true, base: 500_000 })], bar, []);
    expect(s.aEncaisser).toBe(10_000);
    expect(s.encaisses).toBe(5_000);
  });

  it("à recevoir de tiers : le taux sur le montant plus la part des droits du fonds, jamais le frais du client", () => {
    const s = suiviDesFrais([o({ famille: "fonds", operation: "souscription", base: 1_000_000, droitsDuFonds: 10_000 })], bar, []);
    expect(s.aRecevoirDeTiers).toBe(1_000 + 5_000);
    expect(s.aEncaisser).toBe(20_000);
  });

  it("une règle changée plus tard ne bouge pas le mois d'avant", () => {
    const h: HistoriqueDeFrais = [{ cle: "titres.achat", jusquAu: "2027-04-01", regle: ouverte({ clientPct: 0.5, effetLe: "2027-01-01" }) }];
    const nouveau = { ...bar, "titres.achat": ouverte({ clientPct: 3, effetLe: "2027-05-01" }) };
    expect(suiviDesFrais([o({ jour: "2027-03-01" })], nouveau, h).aEncaisser).toBe(5_000);
    expect(suiviDesFrais([o({ jour: "2027-06-01" })], nouveau, h).aEncaisser).toBe(30_000);
  });

  it("le taux propre à la ligne remplace la règle ; un ordre avant la date de départ ne doit rien", () => {
    expect(suiviDesFrais([o({ fraisDeLaLigne: 12_345.4 })], bar, []).aEncaisser).toBe(12_345);
    expect(suiviDesFrais([o({ jour: "2026-12-31" })], bar, []).aEncaisser).toBe(0);
  });

  it("le tableau garde une ligne par règle, même vide : une case absente se voit", () => {
    const s = suiviDesFrais([o({})], bar, []);
    expect(s.parRegle.map((l) => l.cle)).toEqual(["fonds.souscription", "fonds.rachat", "titres.achat", "titres.vente", "adjudication.souscription"]);
    expect(s.parRegle.find((l) => l.cle === "fonds.rachat")!.ordres).toBe(0);
    expect(s.parRegle.find((l) => l.cle === "titres.achat")!.ordres).toBe(1);
  });

  it("la page lit les ordres exécutés et ne s'ouvre qu'au desk, avec le registre chargé", () => {
    const p = lire("src/app/desk/frais/suivi/page.tsx");
    expect(p).toMatch(/requireDesk\("\/desk\/frais\/suivi"\)/);
    expect(p).toMatch(/await loadRegistry\(\)/);
    expect(p).toMatch(/i\.state === "servie" \|\| i\.state === "reglee"/);
    expect(p).toMatch(/suiviDesFrais\(ordres, bareme, historique\)/);
  });
});
