import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  codeSuivant,
  conditionsAu,
  conditionsRefusees,
  departRefuse,
  duDuMois,
  duParSociete,
  ecartsDuTableau,
  etatsSuivants,
  fondsLu,
  simuler,
  societeAu,
  type ConditionsDeFonds,
  type FondsCommissionne,
  type OrdreDeFonds,
  type VersionDeConditions,
} from "@/lib/domain/commissionnement";

/* LE COMMISSIONNEMENT, FONDS PAR FONDS (25 novembre 2026). Les sommes sont celles du barème (`recetteDeTiers`, `retrocessionDuMois`) lues des conditions du fonds à la date de chaque ordre. */
const cond = (o: Partial<ConditionsDeFonds> = {}): ConditionsDeFonds => ({
  souscription: { pct: 0.5, partDesDroitsPct: 0, min: 0, max: 0 },
  rachat: { pct: 0.2, partDesDroitsPct: 0, min: 0, max: 0 },
  encours: { pct: 0.3, min: 0, max: 0 },
  ...o,
});
const version = (effetLe: string, c: ConditionsDeFonds = cond()): VersionDeConditions => ({ ...c, effetLe, motif: "accord", par: "dir", le: `${effetLe}T08:00:00Z` });
const fonds = (versions: VersionDeConditions[], p: Partial<FondsCommissionne> = {}): FondsCommissionne => ({ code: "FD-0021", offerId: "o1", rattachements: [{ societe: "SG-0007", depuis: "2026-01-01" }], versions, ...p });
const ordre = (o: Partial<OrdreDeFonds> = {}): OrdreDeFonds => ({ jour: "2026-11-10", operation: "souscription", base: 10_000_000, droitsDuFonds: 0, ...o });

describe("les codes", () => {
  it("le suivant est le plus grand plus un, jamais un code réutilisé", () => {
    expect(codeSuivant("SG", [])).toBe("SG-0001");
    expect(codeSuivant("SG", ["SG-0001", "SG-0007", "SG-0003"])).toBe("SG-0008");
    expect(codeSuivant("FD", ["SG-0009", "FD-0021"])).toBe("FD-0022");
    expect(codeSuivant("FD", ["FD-0021", "n'importe quoi"])).toBe("FD-0022");
  });
});

describe("le rattachement et les conditions sont datés", () => {
  it("un fonds relève de la société de la date ; son code ne bouge pas", () => {
    const f = fonds([], { rattachements: [{ societe: "SG-0007", depuis: "2026-01-01" }, { societe: "SG-0012", depuis: "2026-09-01" }] });
    expect(societeAu(f, "2026-08-31")).toBe("SG-0007");
    expect(societeAu(f, "2026-09-01")).toBe("SG-0012");
    expect(societeAu(f, "2025-12-31")).toBeUndefined();
  });
  it("les conditions sont celles de la dernière version atteinte : le passé n'est pas réécrit", () => {
    const f = fonds([version("2026-01-01", cond()), version("2026-11-01", cond({ souscription: { pct: 0.8, partDesDroitsPct: 0, min: 0, max: 0 } }))]);
    expect(conditionsAu(f, "2026-10-31")?.souscription.pct).toBe(0.5);
    expect(conditionsAu(f, "2026-11-01")?.souscription.pct).toBe(0.8);
    expect(conditionsAu(f, "2025-06-01")).toBeUndefined();
  });
});

describe("le dû du mois, par fonds", () => {
  it("la part des opérations se calcule avec les conditions de la date de chaque ordre", () => {
    const f = fonds([version("2026-01-01"), version("2026-11-15", cond({ souscription: { pct: 1, partDesDroitsPct: 0, min: 0, max: 0 } }))]);
    const du = duDuMois(f, [ordre({ jour: "2026-11-10" }), ordre({ jour: "2026-11-20" })], [], [], "2026-11");
    expect(du.transactions).toBe(50_000 + 100_000);
    expect(du.souscriptions).toBe(20_000_000);
  });
  it("une part des droits du fonds s'ajoute au taux, avec ses bornes", () => {
    const f = fonds([version("2026-01-01", cond({ souscription: { pct: 0.1, partDesDroitsPct: 40, min: 0, max: 0 } }))]);
    const du = duDuMois(f, [ordre({ droitsDuFonds: 150_000 })], [], [], "2026-11");
    expect(du.transactions).toBe(10_000 + 60_000);
  });
  it("la rétrocession se calcule sur l'encours moyen du mois, au taux annuel divisé par douze", () => {
    const f = fonds([version("2026-01-01", cond({ encours: { pct: 0.3, min: 0, max: 0 } }))]);
    const du = duDuMois(f, [], [{ jour: "2026-10-01", units: 1000 }], [{ navDate: "2026-10-01", nav: 10_000 }], "2026-11");
    expect(du.encoursMoyen).toBe(10_000_000);
    expect(du.encours).toBe(2_500);
  });
  it("un ordre sans condition à sa date compte zéro, et le tableau le dit", () => {
    const f = fonds([version("2026-12-01")]);
    const du = duDuMois(f, [ordre()], [], [], "2026-11");
    expect(du.transactions).toBe(0);
    expect(du.ordresSansCondition).toBe(1);
  });
  it("le dû d'une société est la somme de ses fonds, chacun rangé sous la société de la fin du mois", () => {
    const a = fonds([version("2026-01-01")], { code: "FD-0021" });
    const b = fonds([version("2026-01-01")], { code: "FD-0022", rattachements: [{ societe: "SG-0012", depuis: "2026-01-01" }] });
    const dus = [a, b].map((f) => ({ code: f.code, du: duDuMois(f, [ordre()], [], [], "2026-11") }));
    const par = duParSociete(dus, "2026-11");
    expect(par.map((s) => s.societe)).toEqual(["SG-0007", "SG-0012"]);
    expect(par[0].total).toBe(50_000);
    expect(par[1].fonds).toHaveLength(1);
  });
});

describe("le bandeau d'écarts (4B)", () => {
  const connus = [{ offerId: "o1", titre: "Fonds 1", distribue: true, ordresRegles: 2 }];
  it("un fonds distribué sans conditions est un écart, avec ses ordres réglés", () => {
    const e = ecartsDuTableau([], connus, "2026-11-25");
    expect(e).toHaveLength(1);
    expect(e[0].genre).toBe("sans_accord");
    expect(e[0].phrase).toMatch(/2 ordre\(s\) réglé\(s\)/);
  });
  it("un fonds retiré de la distribution n'en est pas un", () => {
    expect(ecartsDuTableau([], [{ ...connus[0], distribue: false }], "2026-11-25")).toEqual([]);
  });
  it("une case vide sur un fonds qui a des conditions se voit", () => {
    const f = fonds([version("2026-01-01", cond({ rachat: { pct: 0, partDesDroitsPct: 0, min: 0, max: 0 } }))]);
    expect(ecartsDuTableau([f], connus, "2026-11-25").map((x) => x.genre)).toEqual(["case_vide"]);
  });
  it("un accord qui échoit sous soixante jours est signalé, pas un accord plus lointain", () => {
    const proche = fonds([version("2026-01-01")], { accord: { ref: "A", echeanceLe: "2026-12-31" } });
    const loin = fonds([version("2026-01-01")], { accord: { ref: "A", echeanceLe: "2027-06-30" } });
    expect(ecartsDuTableau([proche], connus, "2026-11-25").map((x) => x.genre)).toContain("echeance");
    expect(ecartsDuTableau([loin], connus, "2026-11-25").map((x) => x.genre)).not.toContain("echeance");
  });
  it("on reçoit plus que le client ne paie : une marge négative, jugée seulement quand le côté client est connu", () => {
    const f = fonds([version("2026-01-01", cond({ souscription: { pct: 2, partDesDroitsPct: 0, min: 0, max: 0 } }))]);
    expect(ecartsDuTableau([f], connus, "2026-11-25").map((x) => x.genre)).not.toContain("negatif");
    const e = ecartsDuTableau([f], connus, "2026-11-25", (_o, op) => (op === "souscription" ? 1.5 : 1));
    expect(e.map((x) => x.genre)).toContain("negatif");
  });
});

describe("le simulateur et l'aperçu d'impact (4C, 3B) : même moteur", () => {
  const f = fonds([version("2026-01-01")]);
  const observes = ["2026-09", "2026-10", "2026-11"].map((mois) => ({ mois, ordres: [ordre({ jour: `${mois}-10` })], mouvements: [], navs: [] }));
  it("rejoue les mois observés avec les conditions proposées et dit l'écart", () => {
    const s = simuler(f, observes, cond({ souscription: { pct: 1, partDesDroitsPct: 0, min: 0, max: 0 } }));
    expect(s.mois.map((m) => m.actuel)).toEqual([50_000, 50_000, 50_000]);
    expect(s.mois.map((m) => m.propose)).toEqual([100_000, 100_000, 100_000]);
    expect(s.moyenneActuelle).toBe(50_000);
    expect(s.surDouzeMois).toEqual({ actuel: 600_000, propose: 1_200_000, ecart: 600_000 });
  });
  it("la projection est une estimation, dite comme telle, et ne touche pas au fonds réel", () => {
    const avant = JSON.stringify(f);
    const s = simuler(f, observes, cond());
    expect(s.estimation).toBe(true);
    expect(s.surDouzeMois.ecart).toBe(0);
    expect(JSON.stringify(f)).toBe(avant);
  });
});

describe("les contrôles d'une modification (7B)", () => {
  it("refuse des taux hors de leurs bornes et un plafond sous le plancher", () => {
    expect(conditionsRefusees(cond())).toBeNull();
    expect(conditionsRefusees(cond({ souscription: { pct: 11, partDesDroitsPct: 0, min: 0, max: 0 } }))).toMatch(/Souscription/);
    expect(conditionsRefusees(cond({ rachat: { pct: 0.2, partDesDroitsPct: 101, min: 0, max: 0 } }))).toMatch(/Rachat/);
    expect(conditionsRefusees(cond({ encours: { pct: 0.3, min: 500, max: 100 } }))).toMatch(/Encours/);
  });
  it("un départ ne peut pas tomber dans un mois dont le relevé est parti", () => {
    expect(departRefuse("2026-11-20", ["2026-10"])).toBeNull();
    expect(departRefuse("2026-10-15", ["2026-10"])).toMatch(/figé/);
    expect(departRefuse("2026-09-01", ["2026-10"])).toMatch(/figé/);
    expect(departRefuse("pas une date", [])).toMatch(/invalide/);
  });
  it("un relevé avance et ne recule pas ; un contesté peut repartir", () => {
    expect(etatsSuivants("calcule")).toEqual(["envoye"]);
    expect(etatsSuivants("encaisse")).toEqual([]);
    expect(etatsSuivants("conteste")).toContain("envoye");
  });
  it("lit un fonds stocké sans faire confiance à sa forme", () => {
    expect(fondsLu("FD-0001", { offerId: "o9" })).toEqual({ code: "FD-0001", offerId: "o9", rattachements: [], versions: [] });
    expect(fondsLu("FD-0001", null)).toBeUndefined();
    expect(fondsLu("FD-0001", { offerId: "o9", versions: [{ effetLe: "2026-01-01", souscription: { pct: "x" } }] })?.versions[0].souscription.pct).toBe(0);
  });
});

describe("① ne lit jamais ② : le domaine du commissionnement ne s'importe pas du côté client", () => {
  const ou = (f: string) => readFileSync(f, "utf8");
  it("aucune page ni composant du client n'importe le domaine du commissionnement", () => {
    const fichiers = ["src/app/moi/tarifs/page.tsx", "src/lib/domain/tarifs.ts", "src/lib/domain/frais-fonds.ts", "src/app/offres/[id]/page.tsx", "src/components/IntentForm.tsx"];
    for (const f of fichiers) expect(ou(f), `${f} importe le commissionnement`).not.toMatch(/from "[^"]*commissionnement/);
  });
  it("le domaine n'importe que les calculs du barème, jamais son stockage ni un composant", () => {
    const d = ou("src/lib/domain/commissionnement.ts");
    expect(d).not.toMatch(/from "@\/lib\/(data|policy|auth|reference)/);
    expect(d).not.toMatch(/from "@\/components/);
  });
});
