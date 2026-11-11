import "server-only";
import { loadRegistry } from "@/lib/reference";
import { repo } from "@/lib/data";
import { displayStatus, statusLabel } from "@/lib/domain/status";
import { joursAvant, joursEnMots } from "./domain/echeances";
import { translate } from "@/i18n/core";
import { summarize } from "@/lib/domain/summary";
import type { Contact, Offer, Watch } from "@/lib/domain/types";
import { COMPANY } from "@/lib/config";
import { notifyRaw } from "@/lib/notify/dispatch";
import { memeSerie, NOM_DU_CHIFFRE, seuilFranchi, valeurSurveillee, type AlerteDeSeuil, type SerieSuivie } from "@/lib/domain/alertes";
import { fmt } from "@/lib/format";

/**
 * Followed lines: what a client is told when the figure or the state of a
 * line moves : a new close, a price set by the desk, a closing tomorrow,
 * results published. One message per change, never twice for the same state.
 */
export function watchSnapshot(o: Offer, now = new Date()): { hero: string; status: string } {
  const s = summarize(o, now);
  return { hero: `${s.hero} ${s.heroUnit ?? s.heroSub}`.trim(), status: statusLabel(o, displayStatus(o, now)) };
}

export function watchMessage(o: Offer, prev: Watch, next: { hero: string; status: string }, firstName?: string): { subject: string; text: string } {
  const s = summarize(o, new Date());
  const changes: string[] = [];
  if (prev.lastStatus && prev.lastStatus !== next.status) changes.push(`statut : ${prev.lastStatus} → ${next.status}`);
  if (prev.lastHero && prev.lastHero !== next.hero) changes.push(`${s.kind === "Action" || s.kind === "OPCVM" ? "rendement / cours" : "rendement"} : ${prev.lastHero} → ${next.hero}`);
  const text = `${firstName ? `Bonjour ${firstName},\n\n` : ""}${COMPANY.name} · ligne suivie\n${o.title}\n${changes.join("\n")}\n\n${s.primary ? `${s.primary.label} : ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/offres/${o.id}?intent=${s.primary.intent}` : `Fiche : ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/offres/${o.id}`}\nPour ne plus suivre cette ligne : votre espace › Lignes suivies.`;
  return { subject: `${o.title} : ${changes[0] ?? "mise à jour"}`, text };
}

/**
 * LE MESSAGE D'UNE SÉANCE N'EST PAS CELUI D'UNE LIGNE COTÉE.
 *
 * Sur la cote on écrit quand quelque chose a bougé. À l'adjudication rien ne
 * bouge jusqu'à la séance, et c'est la séance qu'il ne faut pas manquer : on
 * écrit donc le temps qui reste, une fois par jour, et on s'arrête à la
 * clôture. Rien à désactiver : passé le dépôt, le suivi n'a plus d'objet.
 */
export function rappelMessage(o: Offer, jours: number, firstName?: string): { subject: string; text: string } {
  /* LES MÊMES MOTS QUE LA BANDE DES ÉCHÉANCES, et c'est maintenant la même
     fonction. Le courriel part en français quelle que soit la langue de
     lecture — c'est l'état des messages de cette maison, non une décision
     prise ici — d'où `translate("fr", …)` plutôt qu'un `t` de requête : dans
     ce dépôt la clef EST la phrase française, donc la traduire en français la
     rend telle quelle, trous remplis. */
  const mots = joursEnMots(jours);
  const quand = translate("fr", mots.key, mots.params);
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/offres/${o.id}`;
  return {
    subject: `${o.title} : dépôt ${quand}`,
    text: `${firstName ? `Bonjour ${firstName},\n\n` : ""}${COMPANY.name} · séance suivie\n${o.title}\nLe dépôt des soumissions ferme ${quand}.\n\nDéclarer une intention : ${url}?intent=ferme\nLa fiche : ${url}\nPour ne plus être rappelé : votre espace › Lignes suivies.`,
  };
}

/** Daily pass: compare each watch with today's snapshot and message the client on change. */
const chiffre = (metric: AlerteDeSeuil["metric"], v: number): string => (metric === "rendement" ? `${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %` : `${fmt(v)} FCFA`);

/** LA PROCHAINE SÉANCE D'UNE SÉRIE SUIVIE (planche « Alertes de séance et de seuil », 1B) : un fait, la clôture, et la porte vers la fiche. */
export function serieMessage(o: Offer, serie: Pick<SerieSuivie, "label">, jours: number, firstName?: string): { subject: string; text: string } {
  const quand = translate("fr", joursEnMots(jours).key, joursEnMots(jours).params);
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/offres/${o.id}`;
  return {
    subject: `${o.title} : nouvelle séance annoncée`,
    text: `${firstName ? `Bonjour ${firstName},\n\n` : ""}${COMPANY.name} · prochaine séance de la série ${serie.label}\n${o.title}\nLe dépôt des soumissions ferme ${quand}.\n\nLa fiche : ${url}\nPour ne plus être prévenu de cette série : votre espace › Lignes suivies.`,
  };
}

/** UN SEUIL FRANCHI (2A) : le chiffre et le niveau fixé, sans conseil ni urgence ; la porte est la fiche, jamais un ordre. */
export function seuilMessage(o: Offer, a: Pick<AlerteDeSeuil, "metric" | "sens" | "value">, valeur: number, firstName?: string): { subject: string; text: string } {
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/offres/${o.id}`;
  const sens = a.sens === "au_dessus" ? "au-dessus de" : "au niveau ou sous";
  return {
    subject: `${o.title} : seuil franchi`,
    text: `${firstName ? `Bonjour ${firstName},\n\n` : ""}${COMPANY.name} · alerte de seuil\n${o.title}\nLe ${NOM_DU_CHIFFRE[a.metric]} est à ${chiffre(a.metric, valeur)}, ${sens} ${chiffre(a.metric, a.value)} que vous aviez fixé.\n\nLa fiche : ${url}\nCette alerte s'est éteinte ; vous pouvez la remettre depuis la fiche ou depuis votre espace › Lignes suivies.`,
  };
}

/**
 * LES ALERTES DE MARCHÉ, au passage du robot « suivi » (planche « Alertes de séance et de seuil »).
 *
 * UNE SÉRIE : chaque séance annoncée APRÈS l'armement de l'alerte, du même Trésor et du même instrument, est notifiée une fois ; « notified » garde celles qui l'ont été.
 * UN SEUIL : lu une fois par passage (la cote ne change qu'une fois par séance) ; franchi, il notifie, puis s'éteint.
 */
export async function runAlertesDeMarche(now = new Date(), offers?: Offer[], contacts?: Contact[]): Promise<{ series: number; seuils: number }> {
  const r = repo();
  const [series, seuils, toutes, gens] = await Promise.all([r.listSerieFollows(), r.listThresholdAlerts(), offers ? Promise.resolve(offers) : r.listOffers(), contacts ? Promise.resolve(contacts) : r.listContacts()]);
  const contactById = new Map<string, Contact>(gens.map((c) => [c.id, c]));
  const byId = new Map(toutes.map((o) => [o.id, o]));
  let nSeries = 0;
  for (const f of series) {
    for (const o of toutes) {
      if (f.notified.includes(o.id) || !memeSerie(o, f)) continue;
      const st = displayStatus(o, now);
      if (st !== "upcoming" && st !== "open" && st !== "closing") continue;
      if (o.opensAt.slice(0, 19) <= f.createdAt.slice(0, 19)) continue; // déjà ouverte quand l'alerte a été armée : ce n'est pas « la prochaine »
      const c = contactById.get(f.userId);
      if (c) {
        await notifyRaw("watch", c, serieMessage(o, f, joursAvant(o.deadlineAt, now), c.name.split(" ")[0]), { offerId: o.id });
        nSeries++;
      }
      await r.markSerieNotified(f.id, o.id);
    }
  }
  let nSeuils = 0;
  for (const a of seuils) {
    if (a.state !== "active") continue;
    const o = byId.get(a.offerId);
    const v = o ? valeurSurveillee(o, now) : null;
    if (!o || !v || v.metric !== a.metric || !seuilFranchi(a, v.valeur)) continue;
    const c = contactById.get(a.userId);
    if (c) {
      await notifyRaw("watch", c, seuilMessage(o, a, v.valeur, c.name.split(" ")[0]), { offerId: o.id });
      nSeuils++;
    }
    await r.updateThresholdAlert(a.id, { state: "declenchee", firedAt: now.toISOString(), firedValue: v.valeur });
  }
  return { series: nSeries, seuils: nSeuils };
}

export async function runWatchAlerts(now = new Date()): Promise<{ watches: number; alerted: number; rappeles: number; series: number; seuils: number }> {
  await loadRegistry();
  const r = repo();
  const [watches, offers, contacts] = await Promise.all([r.listWatches(), r.listOffers(), r.listContacts()]);
  const byId = new Map(offers.map((o) => [o.id, o]));
  const contactById = new Map<string, Contact>(contacts.map((c) => [c.id, c]));
  let alerted = 0;
  const jour = now.toISOString().slice(0, 10);
  let rappeles = 0;
  for (const w of watches) {
    const o = byId.get(w.offerId);
    if (!o) continue;
    /* Le suivi quotidien d'une séance : un message par jour jusqu'à la clôture,
       et plus rien après. Un seul par jour même si le robot repasse. */
    if (w.mode === "quotidien") {
      const reste = joursAvant(o.deadlineAt, now);
      if (reste < 0 || w.lastDaily === jour) continue;
      const c = contactById.get(w.userId);
      if (c) {
        await notifyRaw("watch", c, rappelMessage(o, reste, c.name.split(" ")[0]), { offerId: o.id });
        rappeles++;
      }
      await r.updateWatch(w.id, { lastDaily: jour, alertedAt: now.toISOString() });
      continue;
    }
    const next = watchSnapshot(o, now);
    if (next.hero === w.lastHero && next.status === w.lastStatus) continue;
    const c = contactById.get(w.userId);
    if (c) {
      const m = watchMessage(o, w, next, c.name.split(" ")[0]);
      await notifyRaw("watch", c, m, { offerId: o.id });
      alerted++;
    }
    await r.updateWatch(w.id, { lastHero: next.hero, lastStatus: next.status, alertedAt: now.toISOString() });
  }
  const marche = await runAlertesDeMarche(now, offers, contacts);
  return { watches: watches.length, alerted, rappeles, ...marche };
}
