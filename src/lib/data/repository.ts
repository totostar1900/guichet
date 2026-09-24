import type { FinancialProfile } from "@/data/profile";
import type { Approval, AuditEntry, ChannelCode, ChannelStatus, ClientPrefs, Contact, DocumentType, TemplateText, TemplateTextStatus, DeviceKind, EventLog, GeneratedDocument, IntakeItem, Intent, IntentState, NewAuditEntry, NewIntentInput, Notification, Offer, OfferVersion, ProofChannel, PushSubscription, ReferenceDraft, ReferenceRow, StaffMember, StaffRole, TrustedDevice, Watch, InboundMessage } from "@/lib/domain/types";
import type { ClientFile } from "@/lib/domain/kyc";
import type { FundNav, IssuerDocument, MarketBulletin, Quote, QuoteActivity } from "@/lib/domain/market";
import type { NewsItem } from "@/lib/news/model";

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
  /** `closedReason` n’a de sens qu’avec l’état « annulee » : c’est le motif que le client lit. */
  setIntentState(id: string, state: IntentState, closedReason?: string): Promise<Intent>;
  updateIntent(id: string, patch: Partial<Pick<Intent, "state" | "allocationPct" | "servedUnits" | "message" | "executedPrice" | "amount" | "limitPrice" | "counter">>): Promise<Intent>;

  listEvents(limit?: number): Promise<EventLog[]>;
  logEvent(e: Omit<EventLog, "id" | "at">): Promise<EventLog>;

  /** Intake queue (desk « À valider »). */
  listIntake(): Promise<IntakeItem[]>;
  getIntake(id: string): Promise<IntakeItem | undefined>;
  createIntake(item: Omit<IntakeItem, "id">): Promise<IntakeItem>;
  updateIntake(id: string, patch: Partial<IntakeItem>): Promise<IntakeItem>;
  /** Create or replace a whole offer (publication from a draft). */
  /** Writes the offer; with expectedVersion, refuses (ConflictError) when the stored version moved. Keeps a full snapshot per version. */
  upsertOffer(offer: Offer, opts?: { expectedVersion?: number; by?: string; note?: string }): Promise<Offer>;
  listOfferVersions(offerId: string): Promise<OfferVersion[]>;
  /** Audit trail (append-only, hash-chained). */
  logAudit(e: NewAuditEntry): Promise<AuditEntry>;
  listAudit(filter?: { entity?: string; entityId?: string; limit?: number }): Promise<AuditEntry[]>;
  /** Four-eyes: proposals waiting for a responsable. */
  listApprovals(open?: boolean): Promise<Approval[]>;
  createApproval(a: Omit<Approval, "id" | "requestedAt">): Promise<Approval>;
  decideApproval(id: string, decision: "approuve" | "refuse", by: string, note?: string): Promise<Approval>;

  /** Generated documents (PDFs on the letterhead). */
  listDocuments(): Promise<GeneratedDocument[]>;
  getDocument(id: string): Promise<GeneratedDocument | undefined>;
  createDocument(doc: Omit<GeneratedDocument, "id">): Promise<GeneratedDocument>;
  updateDocument(id: string, patch: Partial<GeneratedDocument>): Promise<GeneratedDocument>;

  /** Reachable contacts. */
  listContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  setContactOptIn(id: string, optIn: boolean): Promise<void>;
  /** Le consentement aux informations par courrier : le service n’en dépend pas. */
  setEmailOptIn(id: string, optIn: boolean): Promise<void>;
  /** Desk team: who has desk access, at which level, with MFA or not. */
  listStaff(): Promise<StaffMember[]>;
  findProfileByEmail(email: string): Promise<StaffMember | undefined>;
  setRole(userId: string, role: StaffRole | "client", by: string): Promise<void>;
  markMfaEnrolled(userId: string): Promise<void>;
  /** Reference data the desk edits in the app (product types, bond terms, companies, issuers, glossary). */
  listReference(kind: string): Promise<ReferenceRow[]>;
  upsertReference(kind: string, key: string, data: unknown, by?: string): Promise<void>;
  deleteReference(kind: string, key: string): Promise<void>;
  /** Stages a change on one entry; nothing the app reads moves until publishReference. */
  saveReferenceDraft(kind: string, key: string, draft: ReferenceDraft, by: string): Promise<void>;
  /** Applies the drafts of one kind (all, or the given keys): set → published, reset → row removed. Returns the keys applied. */
  publishReference(kind: string, keys?: string[]): Promise<string[]>;
  /** Drops the drafts of one kind (all, or the given keys); a row with no published value disappears. */
  discardReference(kind: string, keys?: string[]): Promise<string[]>;
  /** Lines followed by clients (all of them for the daily alert, one client's for their page). */
  listWatches(userId?: string): Promise<Watch[]>;
  addWatch(userId: string, offerId: string, snapshot: { hero: string; status: string }): Promise<Watch>;
  removeWatch(userId: string, offerId: string): Promise<void>;
  updateWatch(id: string, patch: Partial<Pick<Watch, "lastHero" | "lastStatus" | "alertedAt">>): Promise<void>;
  /** Client-side updates to reachability (phone, e-mail) : the desk keeps the last one given. */
  updateContact(id: string, patch: Partial<Pick<Contact, "name" | "phone" | "email" | "segment">>): Promise<void>;
  /** The client's personal preferences, set from the account sheet. */
  getPrefs(userId: string): Promise<ClientPrefs>;
  /** The document models' wording: every version (newest first), for one type or all. */
  listTemplateTexts(docType?: TemplateText["docType"]): Promise<TemplateText[]>;
  addTemplateText(t: Omit<TemplateText, "id" | "at" | "version">): Promise<TemplateText>;
  setTemplateTextStatus(id: string, status: TemplateTextStatus, approvedBy?: string): Promise<void>;
  setPrefs(userId: string, p: ClientPrefs): Promise<void>;
  /** Proven channels of a client, and the proof itself (a code, six digits, ten minutes, five tries). */
  /** The legal text the client accepted: its version (a date) and when. */
  getConsent(userId: string): Promise<{ version?: string; at?: string }>;
  /** The client's financial profile, as computed from their answers. */
  getFinancialProfile(userId: string): Promise<FinancialProfile | undefined>;
  setFinancialProfile(userId: string, p: FinancialProfile): Promise<void>;
  setConsent(userId: string, version: string): Promise<void>;
  getChannelStatus(userId: string): Promise<ChannelStatus>;
  markChannelVerified(userId: string, channel: "phone" | "email", target: string): Promise<void>;
  createChannelCode(c: Omit<ChannelCode, "id" | "createdAt" | "attempts">): Promise<ChannelCode>;
  findChannelCode(channel: ProofChannel, target: string): Promise<ChannelCode | undefined>;
  updateChannelCode(id: string, patch: Partial<Pick<ChannelCode, "attempts" | "verifiedAt">>): Promise<void>;
  /** Devices a client trusts for a fast return (passkeys, four-digit codes). */
  listDevices(userId: string): Promise<TrustedDevice[]>;
  findDevice(by: { credentialId?: string; id?: string }): Promise<TrustedDevice | undefined>;
  addDevice(d: Omit<TrustedDevice, "id" | "createdAt" | "failures">): Promise<TrustedDevice>;
  updateDevice(id: string, patch: Partial<Pick<TrustedDevice, "counter" | "failures" | "lastUsedAt" | "name">>): Promise<void>;
  removeDevice(id: string, userId?: string): Promise<void>;
  removeDevices(userId: string, kind?: DeviceKind): Promise<void>;

  /** Browsers that accepted push notifications. */
  listPushSubscriptions(userIds?: string[]): Promise<PushSubscription[]>;
  savePushSubscription(s: Omit<PushSubscription, "id" | "createdAt" | "failures">): Promise<void>;
  removePushSubscription(endpoint: string): Promise<void>;
  markPushFailure(endpoint: string, gone: boolean): Promise<void>;
  /** Outbound messages, whatever the channel. */
  listNotifications(limit?: number): Promise<Notification[]>;
  listInbound(limit?: number): Promise<InboundMessage[]>;
  createInbound(m: Omit<InboundMessage, "id" | "receivedAt"> & { receivedAt?: string }): Promise<InboundMessage>;
  markInboundHandled(id: string, by: string): Promise<void>;
  createNotification(n: Omit<Notification, "id" | "createdAt">): Promise<Notification>;
  updateNotification(id: string, patch: Partial<Notification>): Promise<Notification>;

  /** KYC files : one per user. */
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
  /** Les volumes échangés depuis une date, toutes lignes : de quoi calculer un taux de service. */
  quoteActivity(since: string): Promise<QuoteActivity[]>;
  /** Idempotent on (fundKey, navDate). */
  upsertFundNavs(navs: FundNav[]): Promise<void>;
  listFundNavs(fundKey: string, limit?: number): Promise<FundNav[]>;
  /** Latest NAV of every fund. */
  latestFundNavs(): Promise<FundNav[]>;

  /** Documents published by listed companies (collected from the BVMAC site). */
  listIssuerDocuments(mnemo?: string): Promise<IssuerDocument[]>;
  upsertIssuerDocument(d: IssuerDocument): Promise<IssuerDocument>;

  // Actualités : its own table: only published items are readable by everyone.
  listNews(): Promise<NewsItem[]>;
  upsertNews(n: NewsItem): Promise<void>;
  deleteNews(id: string): Promise<void>;
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

/** No I, L, O, U, 0 or 1: a reference is read out on the phone and typed on a transfer form. */
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * PF-0914-K7Q4 : the operation, the day, then four characters drawn at random.
 * The client quotes this one, and it is the reference of their bank transfer.
 * It carries no rank: an order says nothing about how many the firm has taken.
 */
export function makeRef(type: NewIntentInput["type"], now = new Date()): string {
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const tail = [...bytes].map((b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
  return `${INTENT_PREFIX[type]}-${mmdd}-${tail}`;
}

/**
 * PC-ORD-000018 : the order journal, one unbroken sequence, desk and audit only.
 * It is never printed on what a client receives.
 */
export const makeOrderNo = (seq: number): string => `PC-ORD-${String(seq).padStart(6, "0")}`;
