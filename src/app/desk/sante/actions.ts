"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { ARRIERE_PAR_TOUR, bulletinsToReread, REREAD_BATCH, rereadOrder } from "@/lib/health";
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
 * LANCER LE ROBOT, ET NE PAS L'ATTENDRE.
 *
 * Deux cent quatre-vingt-sept séances à quatre secondes font dix-neuf
 * minutes : aucune action de page ne tient cela, et une page qui tourne
 * dix-neuf minutes serait abandonnée bien avant la fin. Le robot de lecture,
 * lui, dispose de trois cents secondes par tour.
 *
 * Donc : on lui envoie une requête, et on rend la main tout de suite. La
 * requête part dans un "after", exécuté après la réponse : sans lui,
 * l'instance peut être gelée avant que l'appel ne soit émis, et le robot ne
 * démarrerait jamais. Une fois la requête reçue, le tour vit dans sa propre
 * fonction, avec son propre budget, même si celle-ci a rendu la main.
 *
 * CE QUE LE DESK VOIT : rien dans l'instant, et le compte des séances en
 * attente qui baisse au rafraîchissement suivant. Le tour s'inscrit au
 * registre comme un tour « à la main », donc il n'éteint aucune alarme :
 * lancer une reprise ne doit pas faire croire que l'ordonnanceur va bien.
 */
export async function lancerArriereAction(_prev: RereadResult | null): Promise<RereadResult> {
  const desk = await requireDesk("/desk/sante");
  const enAttente = await bulletinsToReread();
  if (enAttente.length === 0) return { ok: "Aucun bulletin à relire : la liste est vide." };

  /* UN SEUL TOUR À LA FOIS. Deux reprises concurrentes prendraient les mêmes
     séances, puisque la file ne bouge qu'une fois chacune relue : du travail
     fait deux fois, et deux fois le temps de la BVMAC. Un tour ouvert et non
     refermé depuis moins de dix minutes suffit à le dire. */
  const tours = await repo().listTours(60).catch(() => []);
  const dernier = tours.filter((x) => x.robot === "boc").sort((x, y) => y.startedAt.localeCompare(x.startedAt))[0];
  if (dernier && !dernier.finishedAt && Date.now() - new Date(dernier.startedAt).getTime() < 10 * 60_000) {
    return { error: "Une lecture est déjà en cours, commencée il y a moins de dix minutes. Rafraîchissez la page pour voir où elle en est." };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return { error: "Hôte introuvable : la reprise n'a pas pu être lancée." };
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)/.test(host) ? "http" : "https");
  const n = Math.min(ARRIERE_PAR_TOUR, enAttente.length);
  const url = `${proto}://${host}/api/cron/boc?arriere=1&n=${n}`;
  const secret = process.env.CRON_SECRET;

  after(async () => {
    try {
      await fetch(url, { headers: secret ? { authorization: `Bearer ${secret}` } : {} });
    } catch {
      /* Le tour est parti ou il ne l'est pas ; dans les deux cas le registre
         des robots en portera la trace, et la page la montrera. Personne
         n'attend plus cette réponse. */
    }
  });

  await repo().logEvent({ kind: "desk", html: `<b>Reprise de l'arriéré</b> : ${n} séances confiées au robot de lecture, ${enAttente.length} en attente, par ${desk.name}` });
  revalidatePath("/desk/sante");
  return { ok: `${n} séances confiées au robot. Il travaille à part, environ quatre secondes par bulletin : rafraîchissez dans quelques minutes, le compte en attente aura baissé.` };
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
