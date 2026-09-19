import type { IntakeItem, Offer, OfferDraft } from "@/lib/domain/types";

/** What the desk decides at publication : the only human inputs on an offer. */
export interface DeskDecision {
  pricePct?: number; // OTA / APE / RACHAT
  precountRate?: number; // BTA
  commissionPct: number;
  checked?: string[]; // checklist items ticked by the desk
  minTitles?: number;
  segment: string;
  channels: string[];
}

const REQUIRED: (keyof OfferDraft)[] = ["kind", "operation", "country", "countryName", "issuer", "title", "isin", "deadlineAt", "settleOn", "nominal"];

/** Fields still missing before an offer can be published. */
export function missingFields(d: OfferDraft): string[] {
  const miss = REQUIRED.filter((k) => d[k] === undefined || d[k] === null || d[k] === "");
  if ((d.kind === "OTA" || d.kind === "APE") && d.couponRate == null) miss.push("couponRate");
  if (d.kind !== "ACTIONS" && !d.maturityOn) miss.push("maturityOn");
  if (d.kind === "ACTIONS" && !d.pricePerShare) miss.push("pricePerShare");
  return miss;
}

export function slugFor(d: OfferDraft): string {
  return `${d.country ?? "x"}-${d.kind ?? "x"}-${d.isin ?? Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * Builds the offer row a publication produces. `existing` carries over what a
 * draft does not know (documents, previous version number, equity extras).
 */
export function buildOffer(item: IntakeItem, decision: DeskDecision, existing: Offer | undefined, now = new Date()): Offer {
  const d = item.draft;
  const miss = missingFields(d);
  if (miss.length) throw new Error(`Champs manquants : ${miss.join(", ")}`);
  const version = (existing?.version ?? 0) + 1;
  const iso = (s: string) => (s.length === 16 ? `${s}:00` : s);

  const offer: Offer = {
    id: existing?.id ?? item.offerId ?? slugFor(d),
    kind: d.kind!,
    operation: d.operation!,
    country: d.country!,
    countryName: d.countryName!,
    issuer: d.issuer!,
    title: d.title!,
    isin: d.isin!,
    status: "published",
    blurb: d.blurb ?? existing?.blurb ?? "",
    documents: existing?.documents?.length ? existing.documents : item.fileName ? [{ name: item.title, meta: item.mimeType === "application/pdf" ? "PDF" : "Source" }] : [],
    opensAt: d.opensAt ? iso(d.opensAt) : (existing?.opensAt ?? now.toISOString()),
    deadlineAt: iso(d.deadlineAt!),
    resultsAt: d.resultsAt ? iso(d.resultsAt) : existing?.resultsAt,
    settleOn: d.settleOn!,
    maturityOn: d.maturityOn ?? existing?.maturityOn,
    lastCouponOn: d.lastCouponOn === undefined ? (existing?.lastCouponOn ?? null) : d.lastCouponOn,
    nominal: d.nominal!,
    couponRate: d.couponRate ?? existing?.couponRate,
    precountRate: d.kind === "BTA" ? decision.precountRate : undefined,
    pricePct: d.kind === "BTA" ? undefined : d.kind === "RACHAT" ? 100 : decision.pricePct,
    commissionPct: decision.commissionPct,
    typeKey: d.typeKey ?? existing?.typeKey,
    extra: d.extra ?? existing?.extra,
    minTitles: decision.minTitles ?? existing?.minTitles,
    sizeLabel: d.sizeLabel ?? existing?.sizeLabel,
    pricePerShare: d.pricePerShare ?? existing?.pricePerShare,
    minShares: d.minShares ?? existing?.minShares,
    sharesOffered: d.sharesOffered ?? existing?.sharesOffered,
    dividendPerShare: d.dividendPerShare ?? existing?.dividendPerShare,
    lastPrice: existing?.lastPrice,
    lastPriceOn: existing?.lastPriceOn,
    version,
    pricedAt: now.toISOString(),
  };
  return offer;
}
