import { NextResponse, type NextRequest } from "next/server";
import { loadRegistry } from "@/lib/reference";
import { COMPANY } from "@/lib/config";
import { repo } from "@/lib/data";
import type { Contact, NotifyChannel } from "@/lib/domain/types";
import { fmt, fmtDate } from "@/lib/format";
import { emailConfigured, sendEmail, sendWhatsAppText, whatsappConfigured } from "@/lib/notify/providers";
import { positionsFrom, upcomingFlows } from "@/lib/positions";
import { flushQueuedOpportunities } from "@/lib/notify/broadcast";

/**
 * Coupon and redemption notices : J-3 and the day itself.
 * Call daily (Vercel cron or any scheduler) with `Authorization: Bearer <CRON_SECRET>`.
 * Idempotent: one notification per (intent, flow date, horizon), keyed on `subject`.
 */
export async function GET(req: NextRequest) {
  await loadRegistry();
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });

  const r = repo();
  const [intents, offers, existing] = await Promise.all([r.listIntents(), r.listOffers(), r.listNotifications(1000)]);
  const positions = positionsFrom(intents, offers);
  const due = upcomingFlows(positions, 3).filter((u) => u.inDays === 3 || u.inDays === 0);
  const sent = new Set(existing.map((n) => n.subject));
  let created = 0;

  for (const u of due) {
    const key = `coupon:${u.position.intent.id}:${u.flow.date}:${u.inDays === 0 ? "J" : "J-3"}`;
    if (sent.has(key)) continue;
    const c: Contact | undefined = u.position.intent.clientId ? await r.getContact(u.position.intent.clientId) : undefined;
    if (!c) continue;
    const o = u.position.offer;
    const what = u.flow.label === "Coupon" ? "coupon" : u.flow.label === "Remboursement" ? "remboursement" : "coupon et remboursement du capital";
    const text = `${COMPANY.name} : ${u.inDays === 0 ? "aujourd'hui" : "dans 3 jours"} : ${what} de ${fmt(u.flow.amount)} FCFA brut sur ${o.title} (${o.isin}), ${fmt(u.position.units)} ${u.position.unitWord}, payé le ${fmtDate(u.flow.date)} par l'émetteur sur votre compte de règlement.`;
    const target: { channel: NotifyChannel; to: string } | undefined = c.phone && c.whatsappOptIn ? { channel: "whatsapp", to: c.phone } : c.email ? { channel: "email", to: c.email } : undefined;
    if (!target) continue;
    const row = await r.createNotification({ kind: "results", channel: target.channel, to: target.to, contactName: c.name, subject: key, body: text, intentId: u.position.intent.id, offerId: o.id, status: "queued" });
    const configured = target.channel === "whatsapp" ? whatsappConfigured() : emailConfigured();
    if (!configured) {
      await r.updateNotification(row.id, { status: "skipped", error: "canal non configuré" });
    } else {
      try {
        const id = target.channel === "whatsapp" ? await sendWhatsAppText(target.to, text) : await sendEmail(target.to, `${what} : ${o.title}`, `<p>${text}</p>`, text);
        await r.updateNotification(row.id, { status: "sent", providerId: id, sentAt: new Date().toISOString() });
      } catch (e) {
        await r.updateNotification(row.id, { status: "failed", error: e instanceof Error ? e.message : "échec" });
      }
    }
    created += 1;
  }
  if (created) await r.logEvent({ kind: "system", html: `Avis de coupon : ${created} message${created > 1 ? "s" : ""} préparé${created > 1 ? "s" : ""} (${due.length} flux à J-3 / J)` });
  const released = await flushQueuedOpportunities();
  return NextResponse.json({ positions: positions.length, due: due.length, created, released });
}
