import { describe, expect, it, vi } from "vitest";
import type { Offer } from "@/lib/domain/types";

/**
 * LES DEUX ALERTES DE MARCHÉ (11 novembre 2026, planche « Alertes de séance et de seuil », 1B et 2A).
 *
 * LA SÉRIE se suit par le Trésor et l'instrument (toutes durées) : un seul message par séance annoncée APRÈS l'armement. LE SEUIL sonne une fois, puis s'éteint.
 * Le magasin en mémoire survit aux tests (il vit sur `globalThis`) : on ne compte que les messages qui portent NOS lignes.
 */
const envoyes: { offerId?: string; subject: string; to: string }[] = [];
vi.mock("@/lib/notify/dispatch", () => ({
  notifyRaw: vi.fn(async (_k: string, c: { id: string }, m: { subject: string }, meta?: { offerId?: string }) => {
    envoyes.push({ offerId: meta?.offerId, subject: m.subject, to: c.id });
  }),
}));
vi.mock("@/lib/reference", () => ({ loadRegistry: vi.fn(async () => undefined) }));
const { memoryRepository } = await import("@/lib/data/memory");
vi.mock("@/lib/data", () => ({ repo: () => memoryRepository }));
const { runAlertesDeMarche, seuilMessage, serieMessage } = await import("@/lib/watch");
const { cleDeSerie, memeSerie, seuilFranchi, valeurSurveillee } = await import("@/lib/domain/alertes");

const NOW = new Date("2026-11-11T09:00:00.000Z");
let n = 0;
const seance = (over: Partial<Offer> = {}): Offer =>
  ({
    id: `alerte-${++n}`,
    kind: "OTA",
    title: "OTA 6,25 % · 5 ans · Gabon",
    isin: "GA0000000AL1",
    issuer: "Trésor public de la République gabonaise",
    country: "Gabon",
    countryName: "Gabon",
    status: "published",
    operation: "nouvelle_ligne",
    opensAt: "2026-11-20T09:00:00",
    deadlineAt: "2026-11-27T12:00:00.000Z",
    resultsAt: "2026-11-27T15:00:00.000Z",
    settleOn: "2026-12-01",
    maturityOn: "2031-12-01",
    nominal: 10_000,
    couponRate: 6.25,
    precountRate: 6.9,
    commissionPct: 0,
    sizeLabel: "",
    documents: [],
    version: 1,
    ...over,
  }) as unknown as Offer;
const action = (over: Partial<Offer> = {}): Offer =>
  ({ id: `alerte-${++n}`, kind: "MARCHE", instrument: "action", title: "BGFI Holding", isin: "GA0000010074", issuer: "BGFI", country: "Gabon", status: "live", lastPrice: 90000, lastPriceOn: "2026-11-10", opensAt: "2026-01-01T09:00:00", deadlineAt: "2099-12-31T17:00:00", documents: [], version: 1, ...over }) as unknown as Offer;

describe("la série d'une séance : le Trésor et l'instrument, toutes durées", () => {
  it("une OTA du Gabon est de la série « OTA · Gabon », quelle que soit sa durée", () => {
    const a = seance({ title: "OTA 6,25 % · 5 ans · Gabon" });
    const b = seance({ title: "OTA 6,5 % · 3 ans · Gabon" });
    const cle = cleDeSerie(a)!;
    expect(cle).toMatchObject({ country: "Gabon", kind: "OTA", label: "OTA · Gabon" });
    expect(memeSerie(b, cle)).toBe(true);
    expect(memeSerie(seance({ kind: "BTA" }), cle), "un BTA n'est pas une OTA").toBe(false);
    expect(memeSerie(seance({ country: "Tchad" }), cle), "un autre Trésor n'est pas la série").toBe(false);
  });
  it("une ligne cotée n'a pas de série", () => {
    expect(cleDeSerie(action())).toBeNull();
  });
});

describe("le robot : une série", () => {
  it("prévient d'une séance annoncée après l'armement, une seule fois", async () => {
    const userId = "client-serie";
    await memoryRepository.updateContact(userId, { name: "Test Toto", email: "serie@exemple.test" });
    const f = await memoryRepository.addSerieFollow(userId, { country: "Gabon", kind: "OTA", label: "OTA · Gabon" });
    // armée « avant » : on recule la date d'armement pour que la séance de demain soit « la prochaine »
    (await memoryRepository.listSerieFollows(userId)).forEach(() => undefined);
    const prochaine = seance({ opensAt: "2026-12-01T09:00:00", deadlineAt: "2026-12-08T12:00:00.000Z" });
    await memoryRepository.upsertOffer(prochaine);
    const deja = seance({ opensAt: "2020-01-01T09:00:00" }); // déjà ouverte avant l'armement
    await memoryRepository.upsertOffer(deja);
    await runAlertesDeMarche(NOW);
    await runAlertesDeMarche(new Date("2026-11-11T18:00:00.000Z"));
    const siens = envoyes.filter((e) => e.to === userId);
    expect(siens.map((e) => e.offerId), "une séance déjà ouverte à l'armement n'est pas « la prochaine »").toEqual([prochaine.id]);
    expect(f.notified).toEqual([]);
    expect((await memoryRepository.listSerieFollows(userId))[0].notified).toEqual([prochaine.id]);
  });
});

describe("le chiffre qu'un seuil surveille, et quand il est franchi", () => {
  it("le cours d'une action, la valeur liquidative d'un fonds ; rien pour une séance", () => {
    expect(valeurSurveillee(action())).toMatchObject({ metric: "cours", valeur: 90000, unite: "FCFA" });
    expect(valeurSurveillee(action({ lastPrice: undefined }))).toBeNull();
    expect(valeurSurveillee(seance()), "le taux d'une séance n'est publié qu'une fois").toBeNull();
  });
  it("au-dessus : égal ou plus ; en dessous : égal ou moins", () => {
    expect(seuilFranchi({ sens: "au_dessus", value: 85000 }, 85000)).toBe(true);
    expect(seuilFranchi({ sens: "au_dessus", value: 85000 }, 84999)).toBe(false);
    expect(seuilFranchi({ sens: "en_dessous", value: 85000 }, 85000)).toBe(true);
    expect(seuilFranchi({ sens: "en_dessous", value: 85000 }, 85001)).toBe(false);
  });
});

describe("le robot : un seuil", () => {
  it("sonne une fois, puis s'éteint ; une alerte non franchie ne sonne pas", async () => {
    const userId = "client-seuil";
    await memoryRepository.updateContact(userId, { name: "Test Toto", email: "seuil@exemple.test" });
    const o = action({ lastPrice: 84000 });
    await memoryRepository.upsertOffer(o);
    const franchi = await memoryRepository.addThresholdAlert({ userId, offerId: o.id, metric: "cours", sens: "en_dessous", value: 85000 });
    const pas = await memoryRepository.addThresholdAlert({ userId, offerId: o.id, metric: "cours", sens: "au_dessus", value: 95000 });
    await runAlertesDeMarche(NOW);
    await runAlertesDeMarche(NOW);
    expect(envoyes.filter((e) => e.to === userId && e.offerId === o.id)).toHaveLength(1);
    const apres = await memoryRepository.listThresholdAlerts(userId);
    expect(apres.find((a) => a.id === franchi.id)).toMatchObject({ state: "declenchee", firedValue: 84000 });
    expect(apres.find((a) => a.id === pas.id)?.state).toBe("active");
  });
  it("dit un fait, sans conseil ni urgence", () => {
    const m = seuilMessage(action({ lastPrice: 84000 }), { metric: "cours", sens: "en_dessous", value: 85000 }, 84000, "Toto");
    const texte = m.text.replace(/\s/g, " ");
    expect(texte).toContain("84 000");
    expect(texte).toContain("85 000");
    expect(m.text).not.toMatch(/achet|vend|profit|vite|urgent|manquez/i);
    expect(serieMessage(seance(), { label: "OTA · Gabon" }, 5, "Toto").subject).toContain("nouvelle séance");
  });
});
