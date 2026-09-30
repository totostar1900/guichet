import "server-only";
import type { Repository } from "./repository";
import { memoryRepository } from "./memory";
import { estEssai } from "@/lib/essai";
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
  // Une seule autorité sur le choix du dépôt. La ligne testait la variable
  // d'environnement pendant que « backendName » testait aussi la branche : les
  // deux pouvaient répondre autrement, et l'essai aurait alors écrit dans la
  // production que sa garde lui interdit.
  if (backendName() === "supabase") {
    // Lazy import keeps the seed-only path free of the Supabase client.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { supabaseRepository } = require("./supabase") as typeof import("./supabase");
    wrapped = memoRepo(supabaseRepository);
  } else {
    wrapped = memoRepo(memoryRepository);
  }
  return wrapped;
}

// Sur la branche d essai, memoire quoi que disent les variables : voir src/lib/essai.ts.
export const backendName = (): "supabase" | "memory" => (!estEssai() && process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "memory");
