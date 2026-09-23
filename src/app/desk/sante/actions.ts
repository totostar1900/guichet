"use server";

import { revalidatePath } from "next/cache";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { bulletinsToReread } from "@/lib/health";
import { ingestBoc } from "@/lib/market/boc";

export interface RereadResult {
  ok?: string;
  error?: string;
}

/** How many a single pass takes on: enough to make progress, short enough to finish. */
const BATCH = 6;

/**
 * Relit des bulletins laissés incomplets, depuis l'adresse d'origine gardée
 * pour chacun. Un lecteur corrigé ne rattrape pas le passé tout seul : cette
 * action est ce qui referme la série après une correction.
 *
 * Sans date, elle reprend les plus anciens de la liste, six à la fois.
 */
export async function rereadAction(_prev: RereadResult | null, form: FormData): Promise<RereadResult> {
  const desk = await requireDesk("/desk/sante");
  const one = String(form.get("date") ?? "").trim();

  const pending = await bulletinsToReread();
  const todo = one ? pending.filter((b) => b.sessionDate === one) : pending.slice(0, BATCH);
  if (todo.length === 0) return { error: "Aucun bulletin à relire." };

  let gained = 0;
  let cleared = 0;
  let failed = 0;
  for (const b of todo) {
    const sourceUrl = b.sourceUrl && !b.sourceUrl.startsWith("upload:") ? b.sourceUrl : undefined;
    try {
      const res = await ingestBoc({ sessionDate: b.sessionDate, sourceUrl, by: "desk" });
      if (!res.found || !res.bulletin) {
        failed++;
        continue;
      }
      if ((res.bulletin.counts?.equities ?? 0) > (b.counts?.equities ?? 0)) gained++;
      if (res.bulletin.status === "ok") cleared++;
    } catch {
      failed++;
    }
  }

  const rest = Math.max(0, pending.length - todo.length);
  const parts = [`${todo.length} bulletin${todo.length > 1 ? "s" : ""} relu${todo.length > 1 ? "s" : ""}`];
  if (cleared) parts.push(`${cleared} passé${cleared > 1 ? "s" : ""} en « ok »`);
  if (gained) parts.push(`${gained} gagne${gained > 1 ? "nt" : ""} des cours`);
  if (failed) parts.push(`${failed} en échec`);
  if (rest) parts.push(`${rest} encore à reprendre`);

  await repo().logEvent({ kind: "desk", html: `<b>Bulletins relus</b> : ${parts.join(" · ")} · par ${desk.name}` });
  revalidatePath("/desk/sante");
  revalidatePath("/desk/marche");
  return { ok: parts.join(" · ") };
}
