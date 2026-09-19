import "server-only";
import { repo } from "@/lib/data";
import type { Contact, Notification, NotifyChannel, Offer } from "@/lib/domain/types";
import { summarize } from "@/lib/domain/summary";
import { fmtDateTime } from "@/lib/format";
import { emailHtml, type Message } from "./compose";
import { emailConfigured, sendEmail, sendWhatsAppTemplate, sendWhatsAppText, whatsappConfigured } from "./providers";
import { pushConfigured, sendPush } from "./push";

/**
 * « Opportunité du moment » : one desk action fans out to every channel a
 * client accepted: push (installed phones), WhatsApp (opt-in), e-mail. Rules:
 * segment match or follower, at most one such alert per client per day, none
 * between 21 h and 7 h (queued for the morning cron), every send journalled.
 */
export interface BroadcastPlan {
  recipients: { contact: Contact; follower: boolean }[];
  pushDevices: number;
  quiet: boolean;
  capped: number;
}

const HOUR = () => Number(new Date().toLocaleString("en-GB", { timeZone: "Africa/Douala", hour: "2-digit", hour12: false }).slice(0, 2));
export const quietHours = (): boolean => {
  const h = HOUR();
  return h >= 21 || h < 7;
};

function matchesSegment(c: Contact, segment: string): boolean {
  if (!segment || /tous/i.test(segment)) return true;
  const s = c.segment.toLowerCase();
  if (/institution/i.test(segment)) return /institution|entreprise/.test(s);
  if (/physique/i.test(segment)) return /physique|groupement|diaspora/.test(s);
  return true;
}

/** Who would receive it, before sending : the desk sees the count (and the four-eyes threshold applies). */
export async function planBroadcast(o: Offer, segment: string): Promise<BroadcastPlan> {
  const r = repo();
  const [contacts, watches, notifications] = await Promise.all([r.listContacts(), r.listWatches(), r.listNotifications(500)]);
  const followers = new Set(watches.filter((w) => w.offerId === o.id).map((w) => w.userId));
  const since = Date.now() - 24 * 3600_000;
  const alertedToday = new Set(notifications.filter((n) => n.kind === "opportunity" && new Date(n.createdAt).getTime() > since && n.status !== "failed").map((n) => n.contactName + "|" + n.to));
  const recipients: BroadcastPlan["recipients"] = [];
  let capped = 0;
  for (const c of contacts) {
    const follower = followers.has(c.id);
    if (!follower && !matchesSegment(c, segment)) continue;
    const key = (to?: string) => c.name + "|" + (to ?? "");
    if ([c.phone, c.email].some((to) => to && alertedToday.has(key(to)))) {
      capped++;
      continue;
    }
    recipients.push({ contact: c, follower });
  }
  const subs = await r.listPushSubscriptions(recipients.map((x) => x.contact.id));
  return { recipients, pushDevices: subs.length, quiet: quietHours(), capped };
}

function message(o: Offer, reason: string, firstName?: string): Message & { push: { title: string; body: string } } {
  const s = summarize(o, new Date());
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${base}/offres/${o.id}`;
  const when = s.deadlineAt && o.kind !== "MARCHE" && o.kind !== "FONDS" ? ` · clôture ${fmtDateTime(s.deadlineAt)}` : "";
  const hero = s.gold ? `${s.hero} ${s.heroUnit ?? ""}`.trim() : s.hero;
  const text = `${firstName ? `Bonjour ${firstName}, ` : ""}opportunité du moment au Guichet : ${o.title} : ${hero}${when}. ${reason}. Détails et intention : ${url}\n\nBrut, avant fiscalité, sous réserve du prix servi. Ceci est une information, pas un conseil. STOP pour ne plus recevoir ces messages.`;
  return {
    subject: `Opportunité du moment : ${o.title}`,
    text,
    template: { name: process.env.WA_TEMPLATE_OFFER ?? "guichet_offre", params: [o.title, `${hero}${when} · ${reason}`, s.deadline, url] },
    push: { title: `${o.title} · ${hero}`, body: `${reason}${when}. Ouvrir la fiche.` },
  };
}

/** Sends (or queues, in quiet hours) the alert to the planned recipients on every configured channel. */
export async function broadcastOpportunity(o: Offer, reason: string, segment: string, by: string): Promise<{ sent: number; queued: number; skipped: number; failed: number; recipients: number }> {
  const r = repo();
  const plan = await planBroadcast(o, segment);
  const tally = { sent: 0, queued: 0, skipped: 0, failed: 0, recipients: plan.recipients.length };
  const subs = await r.listPushSubscriptions(plan.recipients.map((x) => x.contact.id));
  const quiet = plan.quiet;
  const record = (channel: NotifyChannel, to: string, name: string, m: Message) => r.createNotification({ kind: "opportunity", channel, to, contactName: name, subject: channel === "email" ? m.subject : channel === "push" ? m.subject : m.template?.name, body: m.text, offerId: o.id, status: "queued" });
  const finish = async (row: Notification, run: () => Promise<string>) => {
    if (quiet) {
      tally.queued++;
      return r.updateNotification(row.id, { status: "queued", error: "En attente : envoi différé à 7 h" });
    }
    try {
      const providerId = await run();
      tally.sent++;
      return r.updateNotification(row.id, { status: "sent", providerId, sentAt: new Date().toISOString() });
    } catch (e) {
      tally.failed++;
      return r.updateNotification(row.id, { status: "failed", error: e instanceof Error ? e.message : "échec d'envoi" });
    }
  };
  for (const { contact: c } of plan.recipients) {
    const m = message(o, reason, c.name.split(" ")[0]);
    const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/offres/${o.id}`;
    // Push: every device of this client.
    for (const sub of subs.filter((s) => s.userId === c.id)) {
      const row = await record("push", sub.endpoint.slice(0, 60) + "…", c.name, { ...m, subject: m.push.title });
      if (!pushConfigured()) {
        tally.skipped++;
        await r.updateNotification(row.id, { status: "skipped", error: "Push non configuré (VAPID)" });
        continue;
      }
      await finish(row, async () => {
        await sendPush(sub, { title: m.push.title, body: m.push.body, url, tag: `opp-${o.id}` });
        return "push";
      });
    }
    if (c.phone && c.whatsappOptIn) {
      const row = await record("whatsapp", c.phone, c.name, m);
      if (!whatsappConfigured()) {
        tally.skipped++;
        await r.updateNotification(row.id, { status: "skipped", error: "WhatsApp Cloud API non configuré" });
      } else await finish(row, () => (m.template && process.env.WA_FREEFORM !== "1" ? sendWhatsAppTemplate(c.phone!, m.template.name, m.template.params) : sendWhatsAppText(c.phone!, m.text)));
    }
    if (c.email) {
      const row = await record("email", c.email, c.name, m);
      if (!emailConfigured()) {
        tally.skipped++;
        await r.updateNotification(row.id, { status: "skipped", error: "E-mail non configuré" });
      } else await finish(row, () => sendEmail(c.email!, m.subject, emailHtml(m), m.text));
    }
  }
  await r.logEvent({ kind: "desk", offerId: o.id, html: `Opportunité du moment <b>${o.title}</b> diffusée par ${by} à ${tally.recipients} client${tally.recipients > 1 ? "s" : ""} : ${tally.sent} envoyé${tally.sent > 1 ? "s" : ""}, ${tally.queued} différé${tally.queued > 1 ? "s" : ""}, ${tally.skipped} en attente de configuration, ${tally.failed} en échec` });
  return tally;
}

/** Morning cron: sends what the quiet hours held back. */
export async function flushQueuedOpportunities(): Promise<number> {
  if (quietHours()) return 0;
  const r = repo();
  const queued = (await r.listNotifications(500)).filter((n) => n.kind === "opportunity" && n.status === "queued");
  let n = 0;
  const subsAll = await r.listPushSubscriptions();
  for (const q of queued) {
    try {
      let providerId = "";
      if (q.channel === "push") {
        const sub = subsAll.find((s) => s.endpoint.startsWith(q.to.replace(/…$/, "")));
        if (!sub || !pushConfigured()) throw new Error("appareil désinscrit");
        await sendPush(sub, { title: q.subject ?? "Guichet", body: q.body.slice(0, 120), url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/offres/${q.offerId ?? ""}`, tag: `opp-${q.offerId}` });
        providerId = "push";
      } else if (q.channel === "whatsapp") {
        if (!whatsappConfigured()) continue;
        providerId = await sendWhatsAppText(q.to, q.body);
      } else {
        if (!emailConfigured()) continue;
        providerId = await sendEmail(q.to, q.subject ?? "Guichet", emailHtml({ subject: q.subject ?? "Guichet", text: q.body }), q.body);
      }
      await r.updateNotification(q.id, { status: "sent", providerId, sentAt: new Date().toISOString(), error: undefined });
      n++;
    } catch (e) {
      await r.updateNotification(q.id, { status: "failed", error: e instanceof Error ? e.message : "échec d'envoi" });
    }
  }
  return n;
}
