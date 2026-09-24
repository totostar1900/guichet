"use server";

import { revalidatePath } from "next/cache";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { bulletinsToReread, REREAD_BATCH, rereadOrder } from "@/lib/health";
import { ingestBoc } from "@/lib/market/boc";
import { tradedSession } from "@/lib/domain/market";

export interface RereadResult {
  ok?: string;
  error?: string;
}


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
  // Les moins récemment reprises, pas les plus anciennes : sinon les mêmes six
  // repassent à chaque fois et le reste de la liste n'est jamais atteint.
  const todo = one ? pending.filter((b) => b.sessionDate === one) : rereadOrder(pending).slice(0, REREAD_BATCH);
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
  // Nommer les séances reprises : depuis que la file tourne, « six relues » ne
  // dit plus lesquelles, et c'est précisément ce qu'il faut pouvoir vérifier.
  const parts = [`${todo.length} bulletin${todo.length > 1 ? "s" : ""} relu${todo.length > 1 ? "s" : ""} : ${todo.map((b) => b.sessionDate).join(", ")}`];
  if (cleared) parts.push(`${cleared} passé${cleared > 1 ? "s" : ""} en « ok »`);
  if (gained) parts.push(`${gained} gagne${gained > 1 ? "nt" : ""} des cours`);
  if (failed) parts.push(`${failed} en échec`);
  // Le dire franchement : sans cela l'opérateur repasse, et repasse encore.
  if (!gained && !cleared && !failed) parts.push("aucune n'a gagné de cours : le lecteur d'aujourd'hui ne fait pas mieux sur ces séances");
  if (rest) parts.push(`${rest} encore à reprendre`);

  await repo().logEvent({ kind: "desk", html: `<b>Bulletins relus</b> : ${parts.join(" · ")} · par ${desk.name}` });
  revalidatePath("/desk/sante");
  revalidatePath("/desk/marche");
  return { ok: parts.join(" · ") };
}

/**
 * Retrouve, dans les séances déjà lues, la dernière où chaque ligne s'est
 * échangée.
 *
 * La colonne est née vide : sans ce rattrapage, une ligne resterait muette
 * jusqu'à ce qu'elle traite de nouveau, ce qui peut prendre des mois sur ce
 * marché et priverait le client de l'information au moment précis où elle lui
 * sert le plus. Les cotes sont déjà en base : il n'y a rien à retélécharger.
 *
 * La version de la ligne ne bouge pas. On ne change pas ses conditions, on
 * écrit un fait qu'elle portait depuis toujours et que personne n'avait noté.
 */
export async function backfillLastTradedAction(_prev: RereadResult | null): Promise<RereadResult> {
  const desk = await requireDesk("/desk/sante");
  const r = repo();
  const lines = (await r.listOffers()).filter((o) => o.kind === "MARCHE" && o.isin && !o.lastTradedOn);
  if (lines.length === 0) return { ok: "Toutes les lignes cotées portent déjà leur dernier échange." };

  let set = 0;
  let silent = 0;
  for (const o of lines) {
    const quotes = await r.listQuotes(o.isin, 2000);
    const traded = quotes.filter(tradedSession).sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))[0];
    if (!traded) {
      silent++;
      continue;
    }
    await r.upsertOffer({ ...o, lastTradedOn: traded.sessionDate });
    set++;
  }

  const parts = [`${set} ligne${set > 1 ? "s" : ""} datée${set > 1 ? "s" : ""}`];
  if (silent) parts.push(`${silent} sans aucun échange dans les séances lues`);
  await repo().logEvent({ kind: "desk", html: `<b>Dernier échange</b> : ${parts.join(" · ")} · retrouvé dans les cotes · par ${desk.name}` });
  revalidatePath("/desk/sante");
  revalidatePath("/desk/marche");
  revalidatePath("/titres");
  revalidatePath("/offres/[id]", "page");
  return { ok: parts.join(" · ") };
}

/**
 * Clôture une ligne cotée qui a quitté la cote : elle cesse d'être
 * commandable, sa page reste consultable. Réservé aux absences que l'échéance
 * ne tranche pas seule. Ce n'est pas un retrait : la maison ne retire rien,
 * la ligne n'est plus à la cote. Un vrai retrait se fait depuis la fiche de la
 * ligne, avec un motif et une seconde paire d'yeux.
 */
export async function withdrawLineAction(_prev: RereadResult | null, form: FormData): Promise<RereadResult> {
  const desk = await requireDesk("/desk/sante");
  const id = String(form.get("offerId") ?? "").trim();
  if (!id) return { error: "Ligne inconnue." };
  const offer = (await repo().listOffers()).find((o) => o.id === id);
  if (!offer) return { error: "Ligne introuvable." };
  if (offer.kind !== "MARCHE") return { error: "Seule une ligne cotée se retire ainsi." };
  await repo().upsertOffer({ ...offer, status: "matured", version: offer.version + 1 });
  await repo().logEvent({ kind: "desk", html: `<b>Ligne clôturée</b> : ${offer.title} · à la main · par ${desk.name}` });
  revalidatePath("/desk/sante");
  revalidatePath("/titres");
  return { ok: `${offer.title} : clôturée, la page reste consultable.` };
}
