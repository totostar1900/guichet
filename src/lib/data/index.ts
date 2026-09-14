import "server-only";
import type { Repository } from "./repository";
import { memoryRepository } from "./memory";

/**
 * Picks the backend: Supabase when NEXT_PUBLIC_SUPABASE_URL is set,
 * otherwise the in-memory seed (runs with no configuration at all).
 */
export function repo(): Repository {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Lazy import keeps the seed-only path free of the Supabase client.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { supabaseRepository } = require("./supabase") as typeof import("./supabase");
    return supabaseRepository;
  }
  return memoryRepository;
}

export const backendName = (): "supabase" | "memory" => (process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "memory");
