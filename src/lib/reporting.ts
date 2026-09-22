import type { ClientFile } from "@/lib/domain/kyc";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { KIND_LABEL } from "@/lib/domain/status";
import type { EventLog, GeneratedDocument, Intent, IntentState, Notification, Offer } from "@/lib/domain/types";
import { positionFor } from "@/lib/documents/position";
import { KIND_LABEL as CLIENT_KIND_LABEL, RISK_LABEL } from "@/lib/kyc/checklist";
import { positionsFrom } from "@/lib/positions";

/**
 * Regulatory and management reporting, computed from the same rows the desk
 * works on. Nothing here is stored: every figure is reproducible from the
 * intents, events, offers, files and notifications of the period.
 */

export interface Period {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}
const inPeriod = (iso: string, p: Period) => iso.slice(0, 10) >= p.from && iso.slice(0, 10) <= p.to;

const FIRM: Intent["type"][] = ["ferme", "cession", "achat", "vente", "souscription", "rachat"];
const STATE_ORDER: IntentState[] = ["confirmee", "transmise", "servie", "non_servie", "reglee", "annulee"];

/** Transition timestamps recovered from the desk's log lines (« : <b>Confirmée</b> »). */
function transitions(intentId: string, events: EventLog[]): Partial<Record<IntentState, string>> {
  const out: Partial<Record<IntentState, string>> = {};
  for (const e of events.filter((x) => x.intentId === intentId)) {
    for (const st of STATE_ORDER) {
      const label = INTENT_STATE_LABEL[st];
      if (e.html.includes(`<b>${label}</b>`) || e.html.includes(`<b>${label.toLowerCase()}</b>`)) out[st] = out[st] ?? e.at;
    }
    if (/<b>exécuté<\/b>/.test(e.html)) out.servie = out.servie ?? e.at;
    if (/<b>réglé(e)?<\/b>/.test(e.html)) out.reglee = out.reglee ?? e.at;
    if (/<b>transmise<\/b>|<b>transmis<\/b>/.test(e.html)) out.transmise = out.transmise ?? e.at;
    if (/servie à \d+ %/.test(e.html)) out.servie = out.servie ?? e.at;
  }
  return out;
}

export interface OrderRow {
  ref: string;
  /** The journal entry, PC-ORD-000018. Falls back to the reference for older orders. */
  registerNo: string;
  receivedAt: string;
  client: string;
  segment: string;
  instrument: string;
  line: string;
  isin: string;
  sens: string;
  quantity: number;
  amount: number; // FCFA estimated / settled
  price: string;
  channel: string;
  state: string;
  confirmedAt?: string;
  transmittedAt?: string;
  executedAt?: string;
  settledAt?: string;
  advisor?: string;
}

export function orderJournal(intents: Intent[], offers: Offer[], events: EventLog[], p: Period): OrderRow[] {
  const byId = new Map(offers.map((o) => [o.id, o]));
  return intents
    .filter((i) => FIRM.includes(i.type) && inPeriod(i.createdAt, p))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((i) => {
      const o = byId.get(i.offerId);
      const pos = o ? positionFor(i, o) : undefined;
      const t = transitions(i.id, events);
      const advisor = events.find((e) => e.intentId === i.id && /par ([^·<]+)$/.test(e.html))?.html.match(/par ([^·<]+)$/)?.[1]?.trim();
      const price = o?.kind === "MARCHE" ? (i.executedPrice != null ? `exécuté ${i.executedPrice}` : i.limitPrice != null ? `limite ${i.limitPrice}` : "marché") : o?.servedPricePct != null ? `servi ${o.servedPricePct}` : o?.pricePct != null ? `publié ${o.pricePct}` : o?.precountRate != null ? `taux ${o.precountRate}` : "";
      return {
        ref: i.ref,
        registerNo: i.registerNo ?? i.ref,
        receivedAt: i.createdAt,
        client: i.clientName,
        segment: i.clientSegment,
        instrument: o ? KIND_LABEL[o.kind] : "",
        line: o?.title ?? i.offerId,
        isin: o?.isin ?? "",
        sens: INTENT_LABEL[i.type],
        quantity: i.servedUnits ?? pos?.units ?? 0,
        amount: pos ? Math.abs(pos.total) : (i.amount ?? 0),
        price,
        channel: i.channel,
        state: INTENT_STATE_LABEL[i.state],
        confirmedAt: t.confirmee,
        transmittedAt: t.transmise,
        executedAt: t.servie,
        settledAt: t.reglee,
        advisor,
      };
    });
}

export interface ClientRow {
  name: string;
  kind: string;
  status: string;
  risk: string;
  city: string;
  country: string;
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  nextReviewOn?: string;
  custodianAccount?: string;
  screening: string;
}

export function clientRegister(files: ClientFile[], p?: Period): ClientRow[] {
  return files
    .filter((f) => !p || inPeriod(f.createdAt, p) || (f.review.reviewedAt && inPeriod(f.review.reviewedAt, p)))
    .map((f) => ({
      name: f.identity.name,
      kind: CLIENT_KIND_LABEL[f.kind],
      status: f.status,
      risk: f.review.risk ? RISK_LABEL[f.review.risk] : "",
      city: f.identity.city ?? "",
      country: f.identity.country ?? "",
      createdAt: f.createdAt,
      submittedAt: f.submittedAt,
      approvedAt: f.status === "approuve" ? f.review.reviewedAt : undefined,
      nextReviewOn: f.review.nextReviewOn,
      custodianAccount: f.review.custodianAccount,
      screening: f.screening?.attestedAt ? `${f.screening.outcome ?? ""} · ${f.screening.attestedBy ?? ""} · ${f.screening.attestedAt.slice(0, 10)}` : "non attesté",
    }));
}

export interface Activity {
  intents: Record<string, number>;
  firmAmount: number;
  executedCount: number;
  settledCount: number;
  settledByInstrument: Record<string, number>;
  settledBySegment: Record<string, number>;
  newAccounts: number;
  documents: Record<string, number>;
  notifications: Record<string, number>;
  positionsNominal: number;
  holders: number;
}

export function activity(intents: Intent[], offers: Offer[], files: ClientFile[], docs: GeneratedDocument[], notifs: Notification[], p: Period): Activity {
  const byId = new Map(offers.map((o) => [o.id, o]));
  const inP = intents.filter((i) => inPeriod(i.createdAt, p));
  const counts: Record<string, number> = {};
  inP.forEach((i) => (counts[INTENT_LABEL[i.type]] = (counts[INTENT_LABEL[i.type]] ?? 0) + 1));
  const firm = inP.filter((i) => FIRM.includes(i.type));
  const firmAmount = firm.reduce((s, i) => {
    const o = byId.get(i.offerId);
    return s + (o ? Math.abs(positionFor(i, o).total) : (i.amount ?? 0));
  }, 0);
  const settled = intents.filter((i) => FIRM.includes(i.type) && i.state === "reglee" && inPeriod(i.updatedAt, p));
  const byInstrument: Record<string, number> = {};
  const bySegment: Record<string, number> = {};
  settled.forEach((i) => {
    const o = byId.get(i.offerId);
    const v = o ? Math.abs(positionFor(i, o).total) : (i.amount ?? 0);
    const k = o ? KIND_LABEL[o.kind] : "—";
    byInstrument[k] = (byInstrument[k] ?? 0) + v;
    const seg = i.clientSegment.split("·")[0].trim() || "—";
    bySegment[seg] = (bySegment[seg] ?? 0) + v;
  });
  const documents: Record<string, number> = {};
  docs.filter((d) => inPeriod(d.createdAt, p)).forEach((d) => (documents[d.type] = (documents[d.type] ?? 0) + 1));
  const notifications: Record<string, number> = {};
  notifs.filter((n) => inPeriod(n.createdAt, p)).forEach((n) => (notifications[`${n.channel} · ${n.status}`] = (notifications[`${n.channel} · ${n.status}`] ?? 0) + 1));
  const positions = positionsFrom(intents, offers);
  return {
    intents: counts,
    firmAmount,
    executedCount: intents.filter((i) => FIRM.includes(i.type) && (i.state === "servie" || i.state === "reglee") && inPeriod(i.updatedAt, p)).length,
    settledCount: settled.length,
    settledByInstrument: byInstrument,
    settledBySegment: bySegment,
    newAccounts: files.filter((f) => f.status === "approuve" && f.review.reviewedAt && inPeriod(f.review.reviewedAt, p)).length,
    documents,
    notifications,
    positionsNominal: positions.reduce((s, x) => s + x.nominalAmount, 0),
    holders: new Set(positions.map((x) => x.intent.clientId)).size,
  };
}

/** CSV for French Excel: UTF-8 BOM, semicolon separator, quoted cells. */
export function toCsv(headers: string[], rows: (string | number | undefined)[][]): string {
  const cell = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return "﻿" + [headers.map(cell).join(";"), ...rows.map((r) => r.map(cell).join(";"))].join("\r\n");
}

export function defaultPeriod(now = new Date()): Period {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}
