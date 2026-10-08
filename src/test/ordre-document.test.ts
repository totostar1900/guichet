import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { Intent, Offer } from "@/lib/domain/types";

/**
 * CE QUE PORTE UN ORDRE SIGNÉ, LU DANS LE PDF LUI-MÊME.
 *
 * Deux affirmations avaient été faites sans être vérifiées, et une des deux
 * était fausse : le document d'un ordre signé dans l'application se terminait
 * quand même par « lu et approuvé, date et signature », un bloc vide sous un
 * engagement déjà pris. On lit donc le texte du PDF produit, plutôt que le
 * code qui le produit.
 *
 * Et l'appel de fonds est fondu dedans : le montant est ferme dès la
 * signature, le compte ségrégué ne change pas, donc une seconde pièce
 * n'apprenait rien et obligeait à tenir deux papiers pour une opération.
 */
const offer = {
  id: "fund-x",
  kind: "FONDS",
  title: "FCP Essai",
  issuer: "SG Essai",
  nominal: 1,
  fund: { key: "f", manager: "SG Essai", depositary: "Ecobank", category: "O", frequency: "quotidienne", nav: 13285, navDate: "2026-09-25", navOrigin: 10000, inceptionDate: "2020-01-01", perfSinceInceptionPct: 32, distributed: true, entryFeePct: 2, exitFeePct: 0, minAmount: 100000, cutoff: "mardi 12 h pour la VL du jeudi", settlementDays: 2 },
} as unknown as Offer;

const base: Intent = { id: "i1", ref: "PF-1008-AAAA", offerId: "fund-x", offerVersion: 1, clientName: "Test Toto", clientSegment: "Personne physique", type: "souscription", amount: 5_000_000, channel: "E-mail", state: "recue", createdAt: "2026-10-08T10:00:00Z", updatedAt: "2026-10-08T10:00:00Z" };
const signe: Intent = { ...base, signedAt: "2026-10-08T12:34:00Z", signedMethod: "code à usage unique", signedTo: "georges.nitcheu@gmail.com" };
const position = { label: "parts", units: 376.366, unitWord: "parts", nominalAmount: 5_000_000, principal: 4_901_961, accrued: 0, accruedDays: 0, commission: 98_039, total: 5_000_000, schedule: [], flows: [] };

async function texte(intent: Intent, quel: "bulletin" | "rachat"): Promise<string> {
  const { Document, Page, renderToBuffer } = await import("@react-pdf/renderer");
  const mod = await import("@/lib/documents/pdf/fund-templates");
  const C = quel === "bulletin" ? mod.BulletinSouscriptionOpcvm : mod.DemandeRachatOpcvm;
  const ctx = { number: "PC-BUL-2026-0009", intent, offer, position, now: new Date("2026-10-08T12:34:00Z"), allocation: 1, texts: {} } as never;
  const buf = await renderToBuffer(createElement(Document, null, createElement(Page, { size: "A4" }, createElement(C, ctx))) as never);
  // « pdf-parse » lit un fichier d essai a l import de son index : la maison passe par la lib.
  const parse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  return (await parse(buf as Buffer)).text.replace(/\s+/g, " ");
}

describe("l'ordre signé porte sa signature et où virer", () => {
  it("une souscription signée : signature électronique, canal du code, coordonnées de virement", async () => {
    const t = await texte(signe, "bulletin");
    expect(t).toContain("Signature électronique");
    expect(t).toContain("georges.nitcheu@gmail.com");
    expect(t).toContain("PF-1008-AAAA");
    expect(t).toMatch(/RIB . IBAN/);
    // Et plus de ligne manuscrite vide sous un engagement déjà pris.
    expect(t).not.toMatch(/lu et approuvé/);
  }, 30_000);

  it("une souscription NON signée garde l'ancien chemin : ligne manuscrite, pas de coordonnées", async () => {
    const t = await texte(base, "bulletin");
    expect(t).toMatch(/lu et approuvé/);
    expect(t).not.toContain("Signature électronique");
    // L'appel de fonds reste une pièce à part tant que l'ordre n'est pas signé.
    expect(t).not.toMatch(/RIB . IBAN/);
  }, 30_000);

  it("un rachat signé porte la signature, et aucun appel de fonds : rien à verser", async () => {
    const t = await texte({ ...signe, type: "rachat", amount: 376.366 }, "rachat");
    expect(t).toContain("Signature électronique");
    expect(t).not.toMatch(/Montant à virer/);
  }, 30_000);
});

/**
 * LE BULLETIN D'UN TITRE PORTE LA BORNE, PAS UNE ESTIMATION.
 *
 * Tant que ces ordres n'étaient pas signables, « montant total estimé »
 * suffisait à informer. Du moment qu'on demande une signature, la pièce doit
 * porter CE QUI EST SIGNÉ : le plafond « au plus », et la signature
 * électronique à la place du bloc manuscrit vide. Lu dans le PDF, comme
 * au-dessus, parce que c'est la seule lecture qui ait déjà démenti le code.
 */
describe("l'ordre signé sur un titre", () => {
  const ligne = {
    id: "rca-ota",
    kind: "OTA",
    title: "OTA 6,50 % · 14 févr. 2028",
    issuer: "Trésor public de la République centrafricaine",
    country: "RCA",
    isin: "CF2K00000056",
    nominal: 10_000,
    couponRate: 6.5,
    pricePct: 94,
    commissionPct: 0,
    version: 1,
    settleOn: "2026-09-16",
    maturityOn: "2028-02-14",
    lastCouponOn: "2026-02-14",
    deadlineAt: "2026-10-14T12:00:00",
  } as unknown as Offer;

  const titre = async (intent: Intent): Promise<string> => {
    const { Document, Page, renderToBuffer } = await import("@react-pdf/renderer");
    const { Bulletin } = await import("@/lib/documents/pdf/templates");
    const { positionFor } = await import("@/lib/documents/position");
    const ctx = { number: "PC-BUL-2026-0010", intent, offer: ligne, position: positionFor(intent, ligne), now: new Date("2026-10-09T10:00:00Z"), texts: {} } as never;
    const buf = await renderToBuffer(createElement(Document, null, createElement(Page, { size: "A4" }, createElement(Bulletin, ctx))) as never);
    const parse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    return (await parse(buf as Buffer)).text.replace(/\s+/g, " ");
  };

  const ferme: Intent = { ...base, id: "i2", ref: "PF-1009-ZZZZ", offerId: "rca-ota", type: "ferme", amount: 10_000_000, limitPrice: 94 };

  it("imprime « au plus », la signature, et ce que la borne protège", async () => {
    const t = await titre({ ...ferme, maxAmount: 9_460_000, signedAt: "2026-10-09T09:00:00Z", signedMethod: "code à usage unique", signedTo: "georges.nitcheu@gmail.com" });
    expect(t).toContain("Vous engagez au plus");
    expect(t).toContain("Plafond signé");
    expect(t).toContain("9 460 000");
    expect(t).toContain("Signature électronique");
    expect(t).not.toMatch(/lu et approuvé/);
    // Ce que la borne protège se dit sur la pièce, pas seulement à l'écran.
    expect(t).toMatch(/servi en partie/i);
  }, 30_000);

  it("non signé, il garde l'estimation et la ligne manuscrite", async () => {
    const t = await titre(ferme);
    expect(t).not.toContain("Vous engagez au plus");
    expect(t).not.toContain("Plafond signé");
    expect(t).toMatch(/lu et approuvé/);
  }, 30_000);
});
