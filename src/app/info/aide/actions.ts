"use server";

import { repo } from "@/lib/data";

/** « Cette réponse vous a aidé ? » : the desk sees which answers to rewrite, in its journal, with no name attached. */
export async function helpFeedback(slug: string, useful: boolean): Promise<void> {
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return;
  try {
    await repo().logEvent({ kind: "system", html: `Aide · « ${slug.replace(/-/g, " ")} » : ${useful ? "réponse utile" : "réponse jugée insuffisante"}` });
  } catch {
    // a thumb lost is not a page broken
  }
}
