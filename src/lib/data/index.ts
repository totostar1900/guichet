import "server-only";
import type { Repository } from "./repository";
import { memoryRepository } from "./memory";
import { memoRepo } from "./memo";

/**
 * Picks the backend: Supabase when NEXT_PUBLIC_SUPABASE_URL is set,
 * otherwise the in-memory seed (runs with no configuration at all).
 */
let wrapped: Repository | undefined;

/**
 * Le dépôt, enveloppé une fois : voir `memo.ts`. Une lecture par requête, et
 * une écriture qui oublie ce qui précède.
 */
export function repo(): Repository {
  if (wrapped) return wrapped;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Lazy import keeps the seed-only path free of the Supabase client.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { supabaseRepository } = require("./supabase") as typeof import("./supabase");
    wrapped = memoRepo(supabaseRepository);
  } else {
    wrapped = memoRepo(memoryRepository);
  }
  return wrapped;
}

export const backendName = (): "supabase" | "memory" => (process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "memory");
