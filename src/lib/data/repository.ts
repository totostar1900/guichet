import type { EventLog, Intent, IntentState, NewIntentInput, Offer } from "@/lib/domain/types";

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

  listEvents(limit?: number): Promise<EventLog[]>;
  logEvent(e: Omit<EventLog, "id" | "at">): Promise<EventLog>;
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
