import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { Offer } from "@/lib/domain/types";

/**
 * DEUX MARCHÉS NE SE SUIVENT PAS PAREIL.
 *
 * Sur la cote, ce qui mérite un message est un CHANGEMENT : un cours qui bouge,
 * un statut qui change. Mesuré sur douze mois, zéro transaction au compartiment
 * obligataire : ces messages sont rares, et c'est voulu.
 *
 * À l'adjudication rien ne bouge jusqu'à la séance, et c'est justement la
 * séance qu'il ne faut pas manquer : l'annonce tombe une semaine avant, le
 * dépôt ferme à une heure, et après il n'y a plus rien à faire. Le message
 * utile n'est donc pas « ça a changé » mais « il vous reste n jours ».
 *
 * CE QUE CE CLIQUET TIENT SURTOUT : que le quotidien s'arrête tout seul. Un
 * rappel qui survit à son objet est la façon la plus sûre de faire couper les
 * notifications, et le suivi de la cote mourrait avec lui.
 *
 * LE MAGASIN EN MÉMOIRE SURVIT AUX TESTS (il vit sur `globalThis`), donc on ne
 * compte pas les messages du tour : on regarde ceux qui portent NOTRE ligne.
 * Le piège a déjà coûté une demi-journée dans ce dépôt.
 */
const envoyes: { offerId?: string; subject: string }[] = [];
vi.mock("@/lib/notify/dispatch", () => ({
  notifyRaw: vi.fn(async (_k: string, _c: unknown, m: { subject: string }, meta?: { offerId?: string }) => {
    envoyes.push({ offerId: meta?.offerId, subject: m.subject });
  }),
}));
vi.mock("@/lib/reference", () => ({ loadRegistry: vi.fn(async () => undefined) }));

const { memoryRepository } = await import("@/lib/data/memory");
vi.mock("@/lib/data", () => ({ repo: () => memoryRepository }));
const { rappelMessage, runWatchAlerts, watchSnapshot } = await import("@/lib/watch");

const NOW = new Date("2026-10-04T09:00:00.000Z");
let n = 0;
const ligne = (over: Partial<Offer>): Offer =>
  ({
    id: `suivi-${++n}`,
    kind: "BTA",
    title: "BTA 52 semaines · sept. 2027",
    isin: "CG1300001480",
    issuer: "Trésor public de la République du Congo",
    country: "Congo",
    countryName: "Congo",
    status: "published",
    operation: "nouvelle_ligne",
    settleOn: "2026-10-07",
    deadlineAt: "2026-10-09T12:00:00.000Z",
    resultsAt: "2026-10-09T15:00:00.000Z",
    maturityOn: "2027-09-23",
    nominal: 1_000_000,
    precountRate: 5.5,
    commissionPct: 0.5,
    sizeLabel: "",
    documents: [],
    version: 1,
    ...over,
  }) as unknown as Offer;

/** Une ligne, un client à elle, et un suivi à la cadence demandée. */
const monter = async (o: Offer, mode: "evenement" | "quotidien", snap?: { hero: string; status: string }) => {
  await memoryRepository.upsertOffer(o);
  const userId = `client-${o.id}`;
  await memoryRepository.updateContact(userId, { name: "Test Toto", email: `${userId}@exemple.test` });
  await memoryRepository.addWatch(userId, o.id, snap ?? { hero: "5,90 %", status: "Ouverte" }, mode);
  return o.id;
};
const pour = (id: string) => envoyes.filter((e) => e.offerId === id);

describe("le rappel d'une séance", () => {
  it("écrit tant que le dépôt est ouvert", async () => {
    const id = await monter(ligne({}), "quotidien");
    await runWatchAlerts(NOW);
    expect(pour(id)).toHaveLength(1);
    expect(pour(id)[0].subject).toContain("dépôt");
  });

  it("n'écrit qu'une fois par jour, même si le robot repasse", async () => {
    /* L'ordonnanceur peut relancer un tour, et un robot relancé à la main ne
       doit pas doubler le message. */
    const id = await monter(ligne({}), "quotidien");
    await runWatchAlerts(NOW);
    await runWatchAlerts(new Date("2026-10-04T18:00:00.000Z"));
    expect(pour(id)).toHaveLength(1);
  });

  it("s'arrête de lui-même à la clôture, sans rien à désactiver", async () => {
    // Le défaut qu'on refuse : un rappel qui survit à son objet fait couper les notifications.
    const id = await monter(ligne({ deadlineAt: "2026-10-02T12:00:00.000Z" }), "quotidien");
    await runWatchAlerts(NOW);
    expect(pour(id)).toHaveLength(0);
  });

  it("dit le temps qui reste, pas qu'il reste du temps", () => {
    const o = ligne({});
    expect(rappelMessage(o, 5).subject).toContain("dans 5 jours");
    expect(rappelMessage(o, 1).subject).toContain("demain");
    expect(rappelMessage(o, 0).subject).toContain("aujourd'hui");
  });
});

describe("le suivi d'une ligne cotée", () => {
  it("se tait quand rien n'a bougé", async () => {
    /* C'est le cas ordinaire : vingt et une lignes sur trente-cinq sont au même
       cours depuis 397 jours. Un suivi qui écrirait quand même serait un rappel
       quotidien déguisé. */
    const o = ligne({ kind: "MARCHE", instrument: "obligation", market: "BVMAC", lastPrice: 100, couponRate: 6.5, priceSince: "2025-09-02" } as Partial<Offer>);
    const id = await monter(o, "evenement", watchSnapshot(o, NOW));
    await runWatchAlerts(NOW);
    expect(pour(id)).toHaveLength(0);
  });

  it("écrit quand le chiffre a bougé", async () => {
    const o = ligne({ kind: "MARCHE", instrument: "obligation", market: "BVMAC", lastPrice: 97, couponRate: 6.5, priceSince: "2026-03-26" } as Partial<Offer>);
    const id = await monter(o, "evenement", { hero: "autre chose", status: "Cotée" });
    await runWatchAlerts(NOW);
    expect(pour(id)).toHaveLength(1);
  });
});

describe("le geste dit laquelle des deux cadences il arme", () => {
  const src = readFileSync("C:/dev/guichet/src/components/mobile/SwipeActions.tsx", "utf8");

  it("la carte passe la cadence de son lieu", () => {
    const carte = readFileSync("C:/dev/guichet/src/components/OfferCard.tsx", "utf8");
    expect(carte).toMatch(/cadence=\{lieuDe\(o\) === "adjudications" \? "quotidien" : "evenement"\}/);
  });

  it("le mot qui suit l'appui nomme la cadence, pas seulement l'état", () => {
    /* « Suivie » ne dit pas ce qui arrivera. Le lecteur doit savoir s'il sera
       prévenu à chaque changement ou chaque jour : ce sont deux promesses. */
    expect(src).toContain("un message par jour jusqu'à la clôture");
    expect(src).toContain("un message à chaque mouvement");
  });

  it("trois actions, et les deux premières ne changent jamais", () => {
    /* « Declarer » engage, « Contacter » demande une personne, la troisieme arme
       une notification : trois gestes de nature differente, et seul le dernier
       depend du lieu. */
    /* Un motif plutôt qu'un littéral : le scanner de clefs cherche « t( » suivi
       d'une chaîne, et un test qui en contiendrait un serait compté comme une
       chaîne de l'interface à traduire. */
    expect(src).toMatch(/\{t\("Déclarer"\)\}/);
    expect(src).toMatch(/\{t\("Contacter"\)\}/);
    // « Contacter » demande une personne : l'intention « rappel » de la fiche.
    expect(src).toContain("intention?intent=rappel");
  });

  it("un second appui désarme", () => {
    // Sans cela un suivi s'arme et ne se retire que depuis une autre page.
    expect(src).toMatch(/toggleWatch\(id, !on, cadence\)/);
  });
});
