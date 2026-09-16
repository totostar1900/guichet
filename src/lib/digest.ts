import "server-only";
import { repo } from "@/lib/data";
import { healthChecks } from "@/lib/health";
import { displayStatus, statusLabel } from "@/lib/domain/status";
import { summarize } from "@/lib/domain/summary";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { fmt, fmtDate, fmtDateTime, localIso } from "@/lib/format";
import { emailConfigured } from "@/lib/notify/providers";

/**
 * The desk's morning brief: what closes today and tomorrow, what came in
 * overnight, what is waiting at each step, what moved on the bulletin, what
 * the health checks say. E-mailed to DESK_EMAILS when e-mail is configured;
 * always kept in the event log and the notification journal.
 */
export interface Digest {
  subject: string;
  text: string;
  html: string;
}

export async function buildDigest(now = new Date()): Promise<Digest> {
  const r = repo();
  const [offers, intents, bulletins, checks] = await Promise.all([r.listOffers(), r.listIntents(), r.listBulletins(2), healthChecks(now)]);
  const today = localIso(now);
  const tomorrow = localIso(new Date(now.getTime() + 86_400_000));
  const since = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const live = offers.filter((o) => !o.hidden && o.status === "published");

  const closing = live.filter((o) => o.kind !== "MARCHE" && o.kind !== "FONDS" && o.deadlineAt.slice(0, 10) >= today && o.deadlineAt.slice(0, 10) <= tomorrow);
  const fresh = intents.filter((i) => i.createdAt >= since);
  const waiting = intents.filter((i) => i.state === "recue" || i.state === "confirmee");
  const byState = new Map<string, number>();
  for (const i of waiting) byState.set(i.state, (byState.get(i.state) ?? 0) + 1);
  const last = bulletins[0];
  const movers = live
    .filter((o) => o.kind === "MARCHE" && last && o.lastPriceOn === last.sessionDate)
    .map((o) => ({ o, s: summarize(o, now) }))
    .slice(0, 8);
  const bad = checks.filter((c) => c.level !== "ok");
  const app = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const nameOf = (id: string) => offers.find((o) => o.id === id)?.title ?? id;

  const sections: [string, string[]][] = [
    ["Clôtures aujourd'hui et demain", closing.length ? closing.map((o) => `${o.title} — ${fmtDateTime(o.deadlineAt)} · ${statusLabel(o, displayStatus(o, now))} · ${intents.filter((i) => i.offerId === o.id && i.state !== "annulee").length} intention(s)`) : ["aucune"]],
    ["Intentions reçues depuis hier", fresh.length ? fresh.map((i) => `${i.ref} · ${i.clientName} · ${INTENT_LABEL[i.type]} sur ${nameOf(i.offerId)}${i.amount ? ` · ${fmt(i.amount)}` : ""} · ${i.channel}${i.contactPhone ? ` ${i.contactPhone}` : ""}`) : ["aucune"]],
    ["En attente du desk", waiting.length ? [...byState.entries()].map(([st, n]) => `${n} ${INTENT_STATE_LABEL[st as keyof typeof INTENT_STATE_LABEL].toLowerCase()}`) : ["rien en attente"]],
    ["Dernier bulletin", last ? [`BOC n° ${last.number} du ${fmtDate(last.sessionDate)} · ${last.status} · ${last.counts.equities} actions, ${last.counts.bonds} obligations, ${last.counts.funds} OPCVM`, ...movers.map(({ o, s }) => `${o.title} : ${s.hero} ${s.heroUnit ?? ""}`.trim())] : ["aucun bulletin ingéré"]],
    ["Santé", bad.length ? bad.map((c) => `${c.level === "crit" ? "ROUGE" : "orange"} · ${c.label} : ${c.value}`) : ["tout est vert"]],
  ];
  const subject = `Guichet — ${fmtDate(today)} · ${closing.length} clôture(s), ${fresh.length} intention(s) reçue(s), ${waiting.length} en attente`;
  const text = sections.map(([h, lines]) => `${h.toUpperCase()}\n${lines.map((l) => `- ${l}`).join("\n")}`).join("\n\n") + `\n\n${app}/desk`;
  const html = sections.map(([h, lines]) => `<h3 style="margin:14px 0 4px;font-size:14px">${h}</h3><ul style="margin:0;padding-left:18px">${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`).join("") + `<p><a href="${app}/desk">Ouvrir le desk</a> · <a href="${app}/desk/sante">Santé</a></p>`;
  return { subject, text, html };
}

export async function sendDigest(now = new Date()): Promise<{ mailed: number; subject: string }> {
  const d = await buildDigest(now);
  const r = repo();
  await r.logEvent({ kind: "system", html: `<b>Point du matin</b> — ${d.subject.replace(/^Guichet — /, "")}` });
  const to = (process.env.DESK_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  let mailed = 0;
  for (const addr of to) {
    const row = await r.createNotification({ kind: "digest", channel: "email", to: addr, contactName: "Desk", subject: d.subject, body: d.text, status: "queued" });
    if (!emailConfigured()) {
      await r.updateNotification(row.id, { status: "skipped", error: "E-mail non configuré" });
      continue;
    }
    try {
      const { sendEmail } = await import("@/lib/notify/providers");
      const id = await sendEmail(addr, d.subject, d.html, d.text);
      await r.updateNotification(row.id, { status: "sent", providerId: id, sentAt: now.toISOString() });
      mailed++;
    } catch (e) {
      await r.updateNotification(row.id, { status: "failed", error: e instanceof Error ? e.message : "échec d'envoi" });
    }
  }
  return { mailed, subject: d.subject };
}
