import type { Contact, EventLog, GeneratedDocument, IntakeItem, Intent, IntentState, NewIntentInput, Notification, Offer } from "@/lib/domain/types";
import type { ClientFile } from "@/lib/domain/kyc";

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
  updateIntent(id: string, patch: Partial<Pick<Intent, "state" | "allocationPct" | "servedUnits" | "message">>): Promise<Intent>;

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
}

export const INTENT_PREFIX: Record<NewIntentInput["type"], string> = {
  appetit: "AP",
  ferme: "PF",
  info: "IN",
  rappel: "RP",
  cession: "CS",
};

/** PF-0914-018 — prefix, MMDD, running number for the day. */
export function makeRef(type: NewIntentInput["type"], seq: number, now = new Date()): string {
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `${INTENT_PREFIX[type]}-${mmdd}-${String(seq).padStart(3, "0")}`;
}
