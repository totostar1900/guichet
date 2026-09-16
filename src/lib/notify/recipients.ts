import "server-only";
import { repo } from "@/lib/data";

/** Desk mailing list: every staff member with an e-mail, plus the DESK_EMAILS bootstrap addresses. */
export async function deskRecipients(): Promise<string[]> {
  const env = (process.env.DESK_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  let staff: string[] = [];
  try {
    staff = (await repo().listStaff()).map((s) => s.email?.toLowerCase() ?? "").filter(Boolean);
  } catch {
    // Table not migrated yet: the env list alone.
  }
  return [...new Set([...staff, ...env])];
}
