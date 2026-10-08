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
