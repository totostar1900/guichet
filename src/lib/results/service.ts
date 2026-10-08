import "server-only";
import { repo } from "@/lib/data";
import { generateForIntent } from "@/lib/documents/generate";
import { positionFor } from "@/lib/documents/position";
import { depasseLePlafond } from "@/lib/domain/plafond";
import type { Intent, Offer } from "@/lib/domain/types";
import { fmt, fmtPct, fmtPrice } from "@/lib/format";
import { notifyIntentUpdated } from "@/lib/notify/dispatch";
import { servedUnits } from "@/lib/positions";

/**
 * Auction results and settlement, applied to a whole auction at once:
 *  results   → offers get their served price, transmitted orders become servie /
 *              non_servie with an allocation, avis generated and sent;
 *  settlement→ servie orders become reglee, offers go live, avis d'opéré generated.
 */

export interface LineResult {
  offerId: string;
  servedPricePct?: number; // OTA / APE (also RACHAT = 100)
  servedRatePct?: number; // BTA
  allocations: { intentId: string; allocationPct: number }[];
}

export async function applyResults(lines: LineResult[], advisor: string): Promise<{ served: number; notServed: number; horsPlafond: number }> {
  const r = repo();
  const intents = await r.listIntents();
  let served = 0;
  let notServed = 0;
  let horsPlafond = 0;
  for (const line of lines) {
    const offer = await r.getOffer(line.offerId);
    if (!offer) continue;
    const priced: Offer = {
      ...offer,
      status: "results",
      servedPricePct: offer.kind === "BTA" ? undefined : offer.kind === "RACHAT" ? 100 : (line.servedPricePct ?? offer.pricePct),
      precountRate: offer.kind === "BTA" ? (line.servedRatePct ?? offer.precountRate) : offer.precountRate,
      resultLine:
        offer.kind === "BTA"
          ? `Taux servi ${fmtPct(line.servedRatePct ?? offer.precountRate ?? 0, 2)} précompté`
          : `Servie à ${fmtPrice(line.servedPricePct ?? offer.pricePct ?? 100)}`,
    };
    await r.upsertOffer(priced);
    for (const a of line.allocations) {
      const i = intents.find((x) => x.id === a.intentId);
      if (!i || i.state !== "transmise") continue;
      const p = positionFor(i, priced);
      let units = Math.floor(p.units * (a.allocationPct / 100));
      /* AU-DELÀ DE LA BORNE SIGNÉE, ON NE SERT PAS, ET ON PASSE QUAND MÊME.
         Un dépouillement porte cinquante lignes. L'arrêter en entier parce
         qu'une seule dépasse le plafond d'un client ferait attendre les
         quarante-neuf autres pour un, et le desk recommencerait son import
         au lieu de régler le cas. Cette ligne-là devient donc non servie, le
         journal en nomme la cause et les deux chiffres, et le compte rendu
         le redit en haut de l'écran : passer, et signaler.

         Le client, lui, n'est pas servi, ce qui est la vérité : il reçoit
         l'avis de non-allocation habituel. Ce qu'il n'apprend pas tout seul,
         c'est la cause, et c'est pour cela que le desk doit l'appeler. */
      let horsBorne: { cout: number; plafond: number } | undefined;
      if (units > 0 && i.signedAt && i.maxAmount != null) {
        const v = depasseLePlafond({ ...i, amount: units * offer.nominal }, priced, priced.servedPricePct);
        if (v.depasse) {
          horsBorne = { cout: v.cout, plafond: v.plafond };
          units = 0;
        }
      }
      const state: Intent["state"] = units > 0 ? "servie" : "non_servie";
      const updated = await r.updateIntent(i.id, { state, allocationPct: a.allocationPct, servedUnits: units });
      await r.logEvent({
        kind: "desk",
        intentId: i.id,
        offerId: offer.id,
        html: horsBorne
          ? `${i.ref} (${i.clientName}) : <b>non servie, au-delà du plafond signé</b> · ${priced.resultLine} porterait l'ordre à ${fmt(Math.round(horsBorne.cout))} FCFA pour un plafond de ${fmt(horsBorne.plafond)} FCFA · appelez le client · par ${advisor}`
          : `${i.ref} (${i.clientName}) : <b>${state === "servie" ? `servie à ${a.allocationPct} % · ${fmt(units)} ${p.unitWord}` : "non servie"}</b> · ${priced.resultLine} · par ${advisor}`,
      });
      try {
        await generateForIntent(state === "servie" ? "allocation" : "non_allocation", i.id, { advisor, allocation: a.allocationPct / 100 });
      } catch (e) {
        await r.logEvent({ kind: "system", intentId: i.id, html: `Avis non généré : ${e instanceof Error ? e.message : "erreur"}` });
      }
      await notifyIntentUpdated(updated, priced, state, advisor);
      if (horsBorne) horsPlafond += 1;
      if (state === "servie") served += 1;
      else notServed += 1;
    }
  }
  return { served, notServed, horsPlafond };
}

export async function applySettlement(offerIds: string[], advisor: string): Promise<number> {
  const r = repo();
  const intents = await r.listIntents();
  let n = 0;
  for (const offerId of offerIds) {
    const offer = await r.getOffer(offerId);
    if (!offer) continue;
    await r.upsertOffer({ ...offer, status: "live", resultLine: `${offer.resultLine ?? ""} · réglée le ${offer.settleOn}`.replace(/^ · /, "") });
    for (const i of intents.filter((x) => x.offerId === offerId && x.state === "servie")) {
      const updated = await r.updateIntent(i.id, { state: "reglee" });
      const units = servedUnits(updated, offer);
      await r.logEvent({ kind: "desk", intentId: i.id, offerId, html: `${i.ref} (${i.clientName}) : <b>réglée</b> · ${fmt(units)} titres inscrits · par ${advisor}` });
      try {
        await generateForIntent("opere", i.id, { advisor, allocation: (updated.allocationPct ?? 100) / 100 });
      } catch (e) {
        await r.logEvent({ kind: "system", intentId: i.id, html: `Avis d'opéré non généré : ${e instanceof Error ? e.message : "erreur"}` });
      }
      await notifyIntentUpdated(updated, offer, "reglee", advisor);
      n += 1;
    }
  }
  return n;
}
