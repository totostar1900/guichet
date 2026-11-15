import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHAMP_DATE_DE_L_ETAT, datesDeTransition, jourDesParts } from "@/lib/domain/intent";
import { memoryRepository } from "@/lib/data/memory";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LES DATES DES PASSAGES D'UN ORDRE, POSÉES UNE FOIS (15 novembre 2026, audit des dates, étape 2 ; migration 0131).
 */
describe("à chaque état, le champ qui date son premier passage", () => {
  it("confirmée, transmise, servie, réglée ont chacune leur date ; non servie et annulée datent la clôture ; reçue et contre-proposée n'en ont pas", () => {
    expect(CHAMP_DATE_DE_L_ETAT).toEqual({ confirmee: "confirmedAt", transmise: "transmittedAt", servie: "servedAt", reglee: "settledAt", non_servie: "closedAt", annulee: "closedAt" });
  });

  it("ne rend que ce qui manque encore : un deuxième passage dans le même état ne réécrit rien", () => {
    expect(datesDeTransition("reglee", {}, "2027-03-01T10:00:00Z")).toEqual({ settledAt: "2027-03-01T10:00:00Z" });
    expect(datesDeTransition("reglee", { settledAt: "2027-02-01T10:00:00Z" }, "2027-03-01T10:00:00Z")).toEqual({});
    expect(datesDeTransition("recue", {}, "2027-03-01T10:00:00Z")).toEqual({});
    expect(datesDeTransition("contre_proposee", {}, "2027-03-01T10:00:00Z")).toEqual({});
  });
});

describe("le dépôt pose la date au premier passage et ne la réécrit jamais", () => {
  const neuf = () => memoryRepository.createIntent({ offerId: "mkt-bhc", type: "achat", amount: 10, channel: "E-mail", clientName: "Test", clientSegment: "" });

  it("chaque transition date son état, par setIntentState comme par updateIntent", async () => {
    const i = await neuf();
    expect(i.confirmedAt).toBeUndefined();
    const c = await memoryRepository.setIntentState(i.id, "confirmee");
    expect(c.confirmedAt).toBeTruthy();
    const t = await memoryRepository.updateIntent(i.id, { state: "transmise" });
    expect(t.transmittedAt).toBeTruthy();
    const s = await memoryRepository.updateIntent(i.id, { state: "servie", servedUnits: 10 });
    expect(s.servedAt).toBeTruthy();
    const r = await memoryRepository.updateIntent(i.id, { state: "reglee" });
    expect(r.settledAt).toBeTruthy();
    expect(r.confirmedAt).toBe(c.confirmedAt);
    expect(r.closedAt).toBeUndefined();
  });

  it("une modification postérieure déplace updatedAt mais jamais la date du règlement", async () => {
    const i = await neuf();
    await memoryRepository.updateIntent(i.id, { state: "reglee" });
    const avant = (await memoryRepository.listIntents()).find((x) => x.id === i.id)!;
    await new Promise((ok) => setTimeout(ok, 5));
    const apres = await memoryRepository.updateIntent(i.id, { message: "corrigé après coup", state: "reglee" });
    expect(apres.settledAt).toBe(avant.settledAt);
    expect(apres.updatedAt >= avant.updatedAt).toBe(true);
  });

  it("une annulation et un non servi datent la clôture", async () => {
    const a = await memoryRepository.setIntentState((await neuf()).id, "annulee", "client");
    const b = await memoryRepository.updateIntent((await neuf()).id, { state: "non_servie" });
    expect(a.closedAt).toBeTruthy();
    expect(b.closedAt).toBeTruthy();
  });

  it("le règlement-livraison se garde tel quel", async () => {
    const i = await neuf();
    const r = await memoryRepository.updateIntent(i.id, { state: "reglee", valueOn: "2027-03-05" });
    expect(r.valueOn).toBe("2027-03-05");
  });
});

describe("la date des parts d'un client", () => {
  it("le règlement-livraison l'emporte, puis le clic du desk, puis la dernière modification faute de mieux", () => {
    expect(jourDesParts({ valueOn: "2027-03-05", settledAt: "2027-03-01T10:00:00Z", updatedAt: "2027-03-09T10:00:00Z" })).toBe("2027-03-05");
    expect(jourDesParts({ settledAt: "2027-03-01T10:00:00Z", updatedAt: "2027-03-09T10:00:00Z" })).toBe("2027-03-01");
    expect(jourDesParts({ updatedAt: "2027-03-09T10:00:00Z" })).toBe("2027-03-09");
  });

  it("la rétrocession date ses mouvements d'ici, plus d'updatedAt directement", () => {
    const p = lire("src/app/desk/frais/rapprochement/page.tsx");
    expect(p).toMatch(/jour: jourDesParts\(i\)/);
    expect(p).not.toMatch(/jour: localIso\(new Date\(i\.updatedAt\)\)/);
  });
});

describe("le schéma, la migration et le dépôt Supabase se répondent", () => {
  const m = lire("supabase/migrations/0131_dates_de_l_ordre.sql");

  it("six colonnes, un rattrapage depuis l'audit sans toucher updated_at", () => {
    for (const c of ["confirmed_at", "transmitted_at", "served_at", "settled_at", "closed_at", "value_on"]) expect(m).toMatch(new RegExp(`add column if not exists ${c}\\s`));
    expect(m).toMatch(/disable trigger intents_touch/);
    expect(m).toMatch(/enable trigger intents_touch/);
    expect(m).toMatch(/from audit where entity = 'intent'/);
  });

  it("le dépôt Supabase lit les six colonnes et pose la date seulement si elle est vide", () => {
    const s = lire("src/lib/data/supabase.ts");
    for (const c of ["confirmed_at", "transmitted_at", "served_at", "settled_at", "closed_at"]) expect(s, `${c} n'est plus lue`).toMatch(new RegExp(`\\w+: u\\(r\\.${c}\\)`));
    expect(s).toMatch(/valueOn: u\(r\.value_on\)/);
    expect(s).toMatch(/if \(patch\.valueOn !== undefined\) row\.value_on/);
    expect(s).toMatch(/\.is\(colonne, null\)/);
    expect(s).toMatch(/poserLaDateDuPassage\(id, state, data as IntentRow\)/);
  });

  it("avant l'application de la migration, un passage d'ordre n'échoue pas pour une date qu'on ne peut pas ranger", () => {
    const s = lire("src/lib/data/supabase.ts");
    expect(s).toMatch(/if \(error && new RegExp\(`\$\{colonne\}\|schema cache\|does not exist`\)\.test\(error\.message\)\) return repli;/);
    expect(s).toMatch(/if \(error\) fail\("poserLaDateDuPassage", error\);/);
  });

  it("le règlement du desk accepte un règlement-livraison facultatif, et les résultats en lot prennent celui de la séance", () => {
    const a = lire("src/app/desk/marche/actions.ts");
    expect(a).toMatch(/form\.get\("valeur"\)/);
    expect(a).toMatch(/valueOn: valeur/);
    expect(lire("src/lib/results/service.ts")).toMatch(/valueOn: offer\.settleOn/);
    expect(lire("src/app/desk/marche/Forms.tsx")).toMatch(/name="valeur" type="date"/);
  });
});
