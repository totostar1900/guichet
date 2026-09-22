import "server-only";
import { repo } from "@/lib/data";
import type { DocumentType, GeneratedDocument } from "@/lib/domain/types";
import { DOC_KIND, DOC_PREFIX } from "./registry";

/**
 * Two references per document, because they do two different jobs.
 *
 * The **register number** (`PC-AF-2026-0002`) is the firm's own log: one
 * unbroken sequence per model and per year, what a controller reads. It never
 * leaves the desk for a document a client holds.
 *
 * The **reference** (`number`) is what the document prints and what a client
 * quotes on the phone. For anything a client sees it carries no rank: the day
 * it was issued and four characters drawn at random, so two documents received
 * weeks apart say nothing about how many the firm has issued in between.
 *
 * Documents sent to a counterparty (bordereaux, dossier SVT) keep the sequence
 * as their reference: the BVMAC and the Trésor read a register, and there is no
 * volume to protect from them. A note on the index keeps the reference of its
 * period (`PC-IDX-2026T2`), which is what makes its preparation idempotent.
 *
 * Documents issued before this split keep the reference they were given: a
 * reference already in a client's hands never changes. Their register number is
 * their reference, read back from it.
 */

/** No I, L, O, U, 0 or 1: a reference has to survive being read out loud. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface DocNumbers {
  /** Printed on the document, quoted by the client. */
  number: string;
  /** The firm's log entry. Desk and audit only. */
  registerNo: string;
}

/** A counterparty document keeps its sequence: nothing to protect, and a register is expected. */
export const isSequentialRef = (type: DocumentType): boolean => DOC_KIND[type] === "interne";

/** The register number a document carries, falling back to its reference for the older ones. */
export const registerOf = (d: Pick<GeneratedDocument, "number" | "registerNo">): string => d.registerNo ?? d.number;

const pad = (n: number) => String(n).padStart(4, "0");
const yymmdd = (d: Date) => `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

const suffix = (n = 4) => {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
};

/**
 * The next register number and the reference that goes with it.
 * `fixed` imposes the reference (a note on the index names its period).
 */
export async function nextNumbers(type: DocumentType, now: Date, fixed?: string): Promise<DocNumbers> {
  const prefix = DOC_PREFIX[type];
  const year = now.getFullYear();
  const docs = await repo().listDocuments();

  // the highest entry already logged, not the number of entries: a removed
  // document must never hand its number to the next one
  const head = `PC-${prefix}-${year}-`;
  const seq = docs.reduce((max, d) => {
    const r = registerOf(d);
    if (!r.startsWith(head)) return max;
    const n = Number(r.slice(head.length));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  const registerNo = `${head}${pad(seq + 1)}`;

  if (fixed) return { number: fixed, registerNo };
  if (isSequentialRef(type)) return { number: registerNo, registerNo };

  const taken = new Set(docs.map((d) => d.number));
  const day = yymmdd(now);
  for (let i = 0; i < 50; i++) {
    const ref = `PC-${prefix}-${day}-${suffix()}`;
    if (!taken.has(ref)) return { number: ref, registerNo };
  }
  // 810 000 references a day and per model: getting here means something else is wrong
  return { number: `PC-${prefix}-${day}-${suffix(6)}`, registerNo };
}
