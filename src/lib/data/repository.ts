import type { Contact, EventLog, GeneratedDocument, IntakeItem, Intent, IntentState, NewIntentInput, Notification, Offer, Watch } from "@/lib/domain/types";
import type { ClientFile } from "@/lib/domain/kyc";
import type { FundNav, IssuerDocument, MarketBulletin, Quote } from "@/lib/domain/market";

/**
 * Single access point for offers, intents and the event log.
 * Two implementations: in-memory (seed, dev without backend) and Supabase.
 */
export interface Repository {
  listOffers(): Promise<Offer[]>;
  getOffer(id: string): Promise<Offer | undefined>;
  /** Desk: publish a price → new version, status published. */
  publishOffer(id: string, patch: Partial<Offer>): Promise<Offer>;

  listIntents(): Promise<Intent[]>;
  createIntent(input: NewIntentInput): Promise<Intent>;
  setIntentState(id: string, state: IntentState): Promise<Intent>;
  updateIntent(id: string, patch: Partial<Pick<Intent, "state" | "allocationPct" | "servedUnits" | "message" | "executedPrice">>): Promise<Intent>;

  listEvents(limit?: number): Promise<EventLog[]>;
  logEvent(e: Omit<EventLog, "id" | "at">): Promise<EventLog>;

  /** Intake queue (desk « À valider »). */
  listIntake(): Promise<IntakeItem[]>;
  getIntake(id: string): Promise<IntakeItem | undefined>;
  createIntake(item: Omit<IntakeItem, "id">): Promise<IntakeItem>;
  updateIntake(id: string, patch: Partial<IntakeItem>): Promise<IntakeItem>;
  /** Create or replace a whole offer (publication from a draft). */
  upsertOffer(offer: Offer): Promise<Offer>;

  /** Generated documents (PDFs on the letterhead). */
  listDocuments(): Promise<GeneratedDocument[]>;
  getDocument(id: string): Promise<GeneratedDocument | undefined>;
  createDocument(doc: Omit<GeneratedDocument, "id">): Promise<GeneratedDocument>;
  updateDocument(id: string, patch: Partial<GeneratedDocument>): Promise<GeneratedDocument>;

  /** Reachable contacts. */
  listContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  setContactOptIn(id: string, optIn: boolean): Promise<void>;
  /** Lines followed by clients (all of them for the daily alert, one client's for their page). */
  listWatches(userId?: string): Promise<Watch[]>;
  addWatch(userId: string, offerId: string, snapshot: { hero: string; status: string }): Promise<Watch>;
  removeWatch(userId: string, offerId: string): Promise<void>;
  updateWatch(id: string, patch: Partial<Pick<Watch, "lastHero" | "lastStatus" | "alertedAt">>): Promise<void>;
  /** Client-side updates to reachability (phone, e-mail) — the desk keeps the last one given. */
  updateContact(id: string, patch: Partial<Pick<Contact, "name" | "phone" | "email">>): Promise<void>;

  /** Outbound messages, whatever the channel. */
  listNotifications(limit?: number): Promise<Notification[]>;
  createNotification(n: Omit<Notification, "id" | "createdAt">): Promise<Notification>;
  updateNotification(id: string, patch: Partial<Notification>): Promise<Notification>;

  /** KYC files — one per user. */
  listClientFiles(): Promise<ClientFile[]>;
  getClientFile(id: string): Promise<ClientFile | undefined>;
  getClientFileByUser(userId: string): Promise<ClientFile | undefined>;
  createClientFile(f: Omit<ClientFile, "id">): Promise<ClientFile>;
  updateClientFile(id: string, patch: Partial<ClientFile>): Promise<ClientFile>;

  /** Market data from the BVMAC bulletin (ingested, never typed). */
  listBulletins(limit?: number): Promise<MarketBulletin[]>;
  getBulletin(sessionDate: string): Promise<MarketBulletin | undefined>;
  upsertBulletin(b: MarketBulletin): Promise<MarketBulletin>;
  /** Idempotent on (isin, sessionDate). */
  upsertQuotes(quotes: Quote[]): Promise<void>;
  /** History of one line, most recent first. */
  listQuotes(isin: string, limit?: number): Promise<Quote[]>;
  /** Latest quote of every line. */
  latestQuotes(): Promise<Quote[]>;
  /** Every line quoted at one session. */
  quotesOn(sessionDate: string): Promise<Quote[]>;
  /** Idempotent on (fundKey, navDate). */
  upsertFundNavs(navs: FundNav[]): Promise<void>;
  listFundNavs(fundKey: string, limit?: number): Promise<FundNav[]>;
  /** Latest NAV of every fund. */
  latestFundNavs(): Promise<FundNav[]>;

  /** Documents published by listed companies (collected from the BVMAC site). */
  listIssuerDocuments(mnemo?: string): Promise<IssuerDocument[]>;
  upsertIssuerDocument(d: IssuerDocument): Promise<IssuerDocument>;
}

export const INTENT_PREFIX: Record<NewIntentInput["type"], string> = {
  appetit: "AP",
  ferme: "PF",
  info: "IN",
  rappel: "RP",
  cession: "CS",
  achat: "OA",
  vente: "OV",
  souscription: "SO",
  rachat: "RA",
};

/** PF-0914-018 — prefix, MMDD, running number for the day. */
export function makeRef(type: NewIntentInput["type"], seq: number, now = new Date()): string {
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `${INTENT_PREFIX[type]}-${mmdd}-${String(seq).padStart(3, "0")}`;
}
