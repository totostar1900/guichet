import { repo } from "@/lib/data";
import { allowedIntents } from "@/lib/domain/intent";
import { displayStatus, isPast } from "@/lib/domain/status";
import type { IntentType, Offer } from "@/lib/domain/types";
import type { Session } from "@/lib/auth/types";
import type { ChannelStatus } from "@/lib/domain/types";
import { positionsFrom } from "@/lib/positions";
import { fmt, fmtPct, fmtPrice } from "@/lib/format";
import type { FinancialProfile } from "@/data/profile";

/**
 * What the intention form needs, loaded once for the fiche (desk-sized
 * screens, the form in the side column) and for its own page on the phone
 * (/offres/[id]/intention): the line, the client and their proven channels,
 * the desk's WhatsApp bridge, the financial profile against this line, the
 * allowed intent types, what the client already holds, the price in words.
 */
export interface IntentContext {
  o: Offer;
  session: Session | null;
  channels?: ChannelStatus;
  bridge?: { phone: string; token: string };
  fin?: FinancialProfile;
  mark: ReturnType<typeof import("@/data/profile").profileFlag>;
  types: IntentType[];
  initial: IntentType;
  held: number;
  qty?: number;
  st: ReturnType<typeof displayStatus>;
  past: boolean;
  priceText: string;
}

export type IntentSearch = { intent?: string; qty?: string; de?: string };

export async function loadIntentContext(o: Offer, sp: IntentSearch, session: Session | null): Promise<IntentContext> {
  const channels = session ? await repo().getChannelStatus(session.userId) : undefined;
  // Came through the desk's WhatsApp link: that number is vouched for, the form asks for the e-mail code only.
  const { readLineLink } = await import("@/lib/channels");
  const bridgedPhone = readLineLink(sp.de);
  const bridge = bridgedPhone && sp.de ? { phone: bridgedPhone, token: sp.de } : undefined;
  // The client's financial profile against this line: a word by the status, a confirmation before an intention that leaves it.
  const { profileFlag } = await import("@/data/profile");
  const fin = session ? await repo().getFinancialProfile(session.userId).catch(() => undefined) : undefined;
  const tenorYears = o.maturityOn ? Math.max(0, (new Date(o.maturityOn).getTime() - new Date().getTime()) / (365.25 * 864e5)) : undefined;
  const equity = o.kind === "ACTIONS" || o.instrument === "action" || (o.kind === "FONDS" && o.fund?.category === "A");
  const mark = profileFlag(fin, { tenorYears, equity });
  const st = displayStatus(o);
  const past = isPast(st);
  const types = allowedIntents(o, st);
  const initial = (types.includes(sp.intent as IntentType) ? sp.intent : types[0]) as IntentType;
  // What the signed-in client already holds on this line : caps sales / redemptions and pre-fills « tout vendre ».
  let held = 0;
  if (session && (o.kind === "MARCHE" || o.kind === "FONDS")) {
    const [allIntents, allOffers] = await Promise.all([repo().listIntents(), repo().listOffers()]);
    held = positionsFrom(allIntents.filter((i) => i.clientId === session.userId), allOffers).filter((p) => p.offer.isin === o.isin).reduce((s, p) => s + p.units, 0);
  }
  const qty = sp.qty && /^[\d.,]+$/.test(sp.qty) ? Number(sp.qty.replace(",", ".")) : undefined;
  const priceText = o.kind === "FONDS" && o.fund ? `VL ${fmt(o.fund.nav)} FCFA` : o.kind === "MARCHE" ? `cours ${o.instrument === "obligation" ? fmtPrice(o.lastPrice ?? 0) : fmt(o.lastPrice ?? 0) + " FCFA"}` : o.kind === "RACHAT" ? "au pair (100 %)" : o.kind === "ACTIONS" ? `${fmt(o.pricePerShare ?? 0)} FCFA / action` : o.kind === "BTA" ? `taux ${fmtPct(o.precountRate ?? 0, 2)}` : `prix ${fmtPrice(o.servedPricePct ?? o.pricePct ?? 100)}`;
  return { o, session, channels, bridge, fin, mark, types, initial, held, qty, st, past, priceText };
}

/** The intention page for a line, with the type or quantity a caller pre-selects. */
export function intentHref(id: string, opts?: { intent?: string; qty?: number | string; de?: string }): string {
  const q = new URLSearchParams();
  if (opts?.intent) q.set("intent", opts.intent);
  if (opts?.qty != null) q.set("qty", String(opts.qty));
  if (opts?.de) q.set("de", opts.de);
  const s = q.toString();
  return `/offres/${id}/intention${s ? `?${s}` : ""}`;
}


