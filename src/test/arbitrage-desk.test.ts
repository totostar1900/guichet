import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * LE SECOND TEMPS D'UN ARBITRAGE, TEL QUE LE DESK LE DÉCLENCHE.
 *
 * Les règles sont tenues par « arbitrage.test.ts ». Ce qu'on mesure ici est ce
 * qu'elles deviennent quand l'ordre passe VRAIMENT par la main du desk, et que
 * la seconde jambe naît : son type, son UNITÉ, et les deux bornes signées.
 *
 * LE DÉFAUT QUE CETTE FEUILLE FERME, ET IL EST MUET. La seconde jambe était
 * « souscription » en dur avec le produit de la vente en francs dans
 * « amount ». Tant qu'un arbitrage n'allait que d'un fonds à un fonds, c'était
 * juste : une souscription se libelle en francs. Vers une LIGNE COTÉE, « amount »
 * compte des TITRES — et quatre millions de francs devenaient quatre millions de
 * titres. Les deux sont des nombres : ni le compilateur, ni une épreuve de type,
 * ni la revue d'un diff ne le disent. Seul un ordre passé en vrai le dit.
 *
 * ET LE PLANCHER DOIT RETENIR. C'est la moitié de ce que le client signe : un
 * carnet mince sert volontiers la moitié d'un ordre, et une moitié de produit
 * ne doit pas partir acheter ce qu'il n'aurait pas acheté pour cette somme-là.
 */
const desk: Session = { userId: "u-desk", role: "desk", name: "Desk Test", email: "desk@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };

vi.mock("@/lib/auth", () => ({
  getSession: async () => desk,
  requireSession: async () => desk,
  requireDesk: async () => desk,
  requireResponsable: async () => desk,
  authMode: () => "dev",
}));
vi.mock("next/cache", () => FAUX_NEXT_CACHE);

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

/** Un rachat de parts, armé vers la ligne demandée, placé et prêt à être exécuté. */
async function armer(over: { switchToOfferId: string; switchFloor: number; switchBy?: string; parts?: number }) {
  const { repo } = await import("@/lib/data");
  const r = repo();
  const i = await r.createIntent({
    offerId: "fcp-monetaire",
    type: "rachat",
    amount: over.parts ?? 100,
    channel: "E-mail",
    clientId: "u-essai-desk",
    clientName: "Essai Desk",
    clientSegment: "Personne physique",
    switchToOfferId: over.switchToOfferId,
    switchFloor: over.switchFloor,
    switchBy: over.switchBy ?? "2099-12-31",
  });
  await r.updateIntent(i.id, { state: "transmise" });
  return i;
}

const executer = async (intentId: string, prix: number, parts: number) => {
  const { executeOrderAction } = await import("@/app/desk/marche/actions");
  const f = new FormData();
  f.set("intentId", intentId);
  f.set("executedPrice", String(prix));
  f.set("executedUnits", String(parts));
  return executeOrderAction(null, f);
};

describe("l'arbitrage quand le desk exécute la vente", () => {
  it("vers un fonds : la seconde jambe est une souscription, en francs", async () => {
    const { repo } = await import("@/lib/data");
    const r = repo();
    const i = await armer({ switchToOfferId: "fcp-obligataire", switchFloor: 1 });
    const res = await executer(i.id, 10_500, 100);
    expect(res.ok, res.ok ? "" : res.error).toBe(true);

    const suite = (await r.listIntents()).find((x) => x.switchFromIntentId === i.id);
    expect(suite, "aucune seconde jambe n'est née").toBeTruthy();
    expect(suite!.type).toBe("souscription");
    expect(suite!.state).toBe("confirmee");
    /* En francs : le produit de cent parts à 10 500, net des droits de sortie.
       Un ordre de cent mille francs serait passé pour cent mille PARTS si
       l'unité se perdait. */
    expect(suite!.amount).toBeGreaterThan(1_000_000);
  });

  it("vers une ligne cotée : la seconde jambe est un achat, et son montant compte des TITRES", async () => {
    const { repo } = await import("@/lib/data");
    const r = repo();
    const dest = await r.getOffer("mkt-bhc");
    expect(dest?.kind, "le jeu d'essai doit porter une action cotée").toBe("MARCHE");

    const i = await armer({ switchToOfferId: "mkt-bhc", switchFloor: 1 });
    const res = await executer(i.id, 10_500, 100);
    expect(res.ok, res.ok ? "" : res.error).toBe(true);

    const suite = (await r.listIntents()).find((x) => x.switchFromIntentId === i.id);
    expect(suite, "aucune seconde jambe n'est née").toBeTruthy();
    expect(suite!.type, "une souscription sur une ligne cotée : le type ne suit pas l'arrivée").toBe("achat");
    /* LA MESURE QUI COMPTE. Le produit vaut plus d'un million de francs ; le
       cours de l'action se compte en milliers. Un « amount » au-delà de
       quelques milliers ici veut dire que les francs ont été écrits dans la
       case des titres — l'ordre serait des centaines de fois trop gros. */
    const produit = 100 * 10_500;
    expect(suite!.amount!, "le produit en francs a été inscrit dans la case des titres").toBeLessThan(produit / 100);
    expect(suite!.amount!, "la seconde jambe n'achète rien").toBeGreaterThan(0);
    expect(Number.isInteger(suite!.amount), "on n'achète pas une fraction de titre au carnet").toBe(true);
    expect(suite!.message, "la seconde jambe ne dit plus d'où vient son montant").toMatch(/Arbitrage depuis/);
  });

  it("sous le plancher signé : rien ne part, et le desk l'apprend par sa réponse", async () => {
    const { repo } = await import("@/lib/data");
    const r = repo();
    const i = await armer({ switchToOfferId: "fcp-obligataire", switchFloor: 900_000_000 });
    const res = await executer(i.id, 10_500, 100);

    /* LA VENTE, ELLE, A BIEN EU LIEU : le plancher retient le REPLACEMENT, pas
       l'exécution. C'est la seule lecture honnête d'un ordre déjà au carnet —
       on ne défait pas une exécution. */
    expect(res.ok).toBe(true);
    expect(res.ok && res.message, "le desk ne saurait pas que l'arbitrage n'est pas parti").toMatch(/n'est PAS parti/);
    expect(res.ok && res.message).toMatch(/plancher/);
    expect((await r.listIntents()).find((x) => x.switchFromIntentId === i.id), "une seconde jambe est née sous le plancher").toBeFalsy();
  });

  it("après la date limite : rien ne part non plus", async () => {
    const { repo } = await import("@/lib/data");
    const r = repo();
    const i = await armer({ switchToOfferId: "fcp-obligataire", switchFloor: 1, switchBy: "2020-01-01" });
    const res = await executer(i.id, 10_500, 100);
    expect(res.ok).toBe(true);
    expect(res.ok && res.message).toMatch(/date limite/);
    expect((await r.listIntents()).find((x) => x.switchFromIntentId === i.id), "une seconde jambe est née après la date limite").toBeFalsy();
  });

  /* NON VACUITÉ : sans arbitrage, aucune seconde jambe et aucune phrase. Sans
     cette ligne, les deux refus ci-dessus passeraient au vert sur un desk qui
     n'enchaînerait plus jamais rien. */
  it("et sans arrivée, le desk exécute comme avant, sans rien enchaîner", async () => {
    const { repo } = await import("@/lib/data");
    const r = repo();
    const i = await r.createIntent({
      offerId: "fcp-monetaire",
      type: "rachat",
      amount: 100,
      channel: "E-mail",
      clientId: "u-essai-desk",
      clientName: "Essai Desk",
      clientSegment: "Personne physique",
    });
    await r.updateIntent(i.id, { state: "transmise" });
    const res = await executer(i.id, 10_500, 100);
    expect(res.ok).toBe(true);
    expect(res.ok && res.message).not.toMatch(/arbitrage|plancher/i);
    expect((await r.listIntents()).find((x) => x.switchFromIntentId === i.id)).toBeFalsy();
  });
});
