import "server-only";
import { loadNews } from "@/lib/news";
import { isVisible } from "@/lib/news/model";
import { deskRecipients } from "@/lib/notify/recipients";
import { repo } from "@/lib/data";
import { emailConfigured, whatsappConfigured } from "@/lib/notify/providers";
import { localIso } from "@/lib/format";
import { bondTerms } from "@/lib/domain/status";
import { indexCheck } from "@/lib/market/index";
import { ABSENCE_SESSIONS, reconcileLines, reconcileSummary, type LineIssue } from "@/lib/market/reconcile";
import { positionsFrom } from "@/lib/positions";
import type { MarketBulletin } from "@/lib/domain/market";

/**
 * One glance at whether the machine is running: last bulletin, freshness of
 * prices and NAVs, messaging that could not go out, and offers with a
 * maturity we only guessed. Used by the desk's « Santé » page and by the
 * daily check that warns the desk.
 */
export interface HealthCheck {
  key: string;
  label: string;
  level: "ok" | "warn" | "crit";
  value: string;
  detail?: string;
}

/**
 * Les bulletins que le lecteur a laissés incomplets, sur toute l'histoire :
 * un statut autre que « ok », ou aucune action lue. C'est l'arriéré qu'une
 * relecture referme. Un lecteur corrigé ne rattrape pas le passé tout seul,
 * et ces séances manquantes faussent la lecture de l'indice.
 */
export async function bulletinsToReread(): Promise<MarketBulletin[]> {
  const all = await repo().listBulletins(2000);
  return all.filter((b) => b.status !== "ok" || !b.counts?.equities).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
}

/**
 * Les écarts entre les lignes cotées publiées et le bulletin, sur la
 * dernière séance lue. Ce que le Guichet copie se vérifie ; ce qu'il cesse
 * de copier aussi.
 */
export async function lineIssues(): Promise<LineIssue[]> {
  const r = repo();
  const bulletins = await r.listBulletins(ABSENCE_SESSIONS);
  if (bulletins.length === 0) return [];
  const quotesByDate = new Map<string, Awaited<ReturnType<typeof r.quotesOn>>>();
  await Promise.all(bulletins.map(async (b) => quotesByDate.set(b.sessionDate, await r.quotesOn(b.sessionDate))));
  const [offers, intents] = await Promise.all([r.listOffers(), r.listIntents()]);
  // qui détient encore la ligne : c'est ce qui décide de l'urgence, pas la ligne elle-même
  const holdersByOffer = new Map<string, number>();
  for (const p of positionsFrom(intents, offers)) {
    const key = p.offer.id;
    holdersByOffer.set(key, (holdersByOffer.get(key) ?? 0) + 1);
  }
  return reconcileLines({ offers, bulletins, quotesByDate, holdersByOffer });
}

/** Business days between two dates (Mon–Fri, holidays not known). */
function businessDaysBetween(from: string, to: string): number {
  let n = 0;
  const d = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (d < end) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return n;
}

export async function healthChecks(now = new Date()): Promise<HealthCheck[]> {
  const r = repo();
  const today = localIso(now);
  const [bulletins, offers, notifications, navs] = await Promise.all([r.listBulletins(30), r.listOffers(), r.listNotifications(300), r.latestFundNavs()]);
  const out: HealthCheck[] = [];

  // 1. Last bulletin: the BOC comes out after each session; two missed business days is a problem.
  const last = bulletins[0];
  const lag = last ? businessDaysBetween(last.sessionDate, today) : 99;
  out.push({
    key: "boc",
    label: "Dernier bulletin BVMAC",
    level: !last ? "crit" : lag >= 3 ? "crit" : lag >= 2 ? "warn" : "ok",
    value: last ? `BOC n° ${last.number} du ${last.sessionDate}` : "aucun",
    detail: last ? `ingéré ${last.ingestedAt.slice(0, 16).replace("T", " ")} par ${last.ingestedBy} · ${last.status}${last.anomalies.length ? ` · ${last.anomalies.length} anomalie(s)` : ""}${lag >= 2 ? ` · ${lag} jours ouvrés sans bulletin` : ""}` : "le cron de 18:30 n'a encore rien ingéré",
  });

  // 2. Failed / partial ingests in the last 30 bulletins.
  const bad = bulletins.filter((b) => b.status !== "ok");
  out.push({
    key: "ingests",
    label: "Ingestions à vérifier (30 derniers bulletins)",
    level: bulletins.some((b) => b.status === "echec") ? "crit" : bad.length > 5 ? "warn" : "ok",
    value: `${bad.length} partiel(s) ou échec(s)`,
    detail: bad.slice(0, 5).map((b) => `${b.sessionDate} ${b.status}${b.anomalies[0] ? ` : ${b.anomalies[0].slice(0, 80)}` : ""}`).join(" · ") || "tout est propre",
  });

  // 2 bis. The whole backlog, not just the last 30: incomplete readings distort the index.
  const arriere = await bulletinsToReread();
  const sansCours = arriere.filter((b) => !b.counts?.equities).length;
  out.push({
    key: "relire",
    label: "Bulletins à relire",
    level: sansCours ? "crit" : arriere.length ? "warn" : "ok",
    value: `${arriere.length} séance${arriere.length > 1 ? "s" : ""}`,
    detail: arriere.length
      ? `${sansCours ? `${sansCours} sans aucun cours d'action · ` : ""}du ${arriere[0].sessionDate} au ${arriere[arriere.length - 1].sessionDate} · relisibles depuis leur adresse d'origine`
      : "chaque séance lue est complète",
  });

  // 2 ter. Every published listed line against the bulletin, both ways.
  const issues = await lineIssues();
  const sorties = issues.filter((i) => i.kind === "sortie");
  out.push({
    key: "lignes",
    label: "Lignes publiées contre le bulletin",
    level: issues.some((i) => i.kind !== "sortie") ? "crit" : sorties.length ? "warn" : "ok",
    value: issues.length ? `${issues.length} écart${issues.length > 1 ? "s" : ""}` : `${offers.filter((o) => o.kind === "MARCHE" && o.status !== "withdrawn").length} lignes conformes`,
    detail: reconcileSummary(issues),
  });

  // 3. Listed lines whose price is older than the last bulletin.
  const listed = offers.filter((o) => o.kind === "MARCHE" && !o.hidden);
  const stale = listed.filter((o) => last && o.lastPriceOn && o.lastPriceOn < last.sessionDate);
  out.push({
    key: "prices",
    label: "Lignes cotées sans cours à la dernière séance",
    level: stale.length > listed.length / 2 ? "warn" : "ok",
    value: `${stale.length} / ${listed.length}`,
    detail: stale.length ? stale.slice(0, 6).map((o) => `${o.title.slice(0, 40)} (${o.lastPriceOn})`).join(" · ") : "toutes au dernier bulletin",
  });

  // 4. NAVs: a weekly fund older than 3 weeks is suspect.
  const oldNavs = navs.filter((n) => businessDaysBetween(n.navDate, today) > 15 && (n.frequency === "quotidienne" || n.frequency === "hebdomadaire"));
  out.push({
    key: "navs",
    label: "VL quotidiennes / hebdomadaires en retard (> 3 semaines)",
    level: oldNavs.length > 5 ? "warn" : "ok",
    value: `${oldNavs.length} / ${navs.length}`,
    detail: oldNavs.slice(0, 6).map((n) => `${n.name} (${n.navDate})`).join(" · ") || "à jour",
  });

  // 5. Messaging.
  const recent = notifications.filter((n) => n.createdAt >= localIso(new Date(now.getTime() - 7 * 86_400_000)));
  const skipped = recent.filter((n) => n.status === "skipped").length;
  const failed = recent.filter((n) => n.status === "failed").length;
  out.push({
    key: "notify",
    label: "Messages clients (7 jours)",
    level: failed ? "crit" : !whatsappConfigured() || !emailConfigured() ? "warn" : "ok",
    value: `${recent.length} préparés · ${recent.filter((n) => n.status === "sent").length} envoyés · ${skipped} non envoyés · ${failed} échecs`,
    detail: `WhatsApp ${whatsappConfigured() ? "configuré" : "non configuré"} · e-mail ${emailConfigured() ? "configuré" : "non configuré"}${skipped ? " : les accusés de réception sont à envoyer à la main" : ""}`,
  });

  // 6. Bonds priced on a guessed maturity.
  const guessed = listed.filter((o) => o.instrument === "obligation" && !bondTerms(o.isin) && o.priceSource !== "desk");
  out.push({
    key: "terms",
    label: "Obligations cotées sans échéancier exact",
    level: guessed.length ? "warn" : "ok",
    value: `${guessed.length}`,
    detail: guessed.map((o) => o.issuer).filter((v, i, a) => a.indexOf(v) === i).join(" · ") || "toutes documentées",
  });

  // 7. Offers closing without a published price.
  const pending = offers.filter((o) => (o.kind === "OTA" || o.kind === "APE" || o.kind === "BTA") && o.status === "published" && o.deadlineAt > now.toISOString() && (o.pricePct == null && o.precountRate == null));
  out.push({
    key: "pricing",
    label: "Lignes ouvertes sans prix du desk",
    level: pending.length ? "warn" : "ok",
    value: `${pending.length}`,
    detail: pending.map((o) => o.title).join(" · ") || "—",
  });

  // 8. The index against the share prices of the last two sessions read.
  try {
    const [b0, b1] = bulletins;
    const [q0, q1] = await Promise.all([b0 ? r.quotesOn(b0.sessionDate) : [], b1 ? r.quotesOn(b1.sessionDate) : []]);
    const chk = indexCheck(b0, q1, q0);
    out.push({ key: "index", label: "Indice BVMAC et cours d'actions", level: chk.ok ? "ok" : "warn", value: b0?.indexValue != null ? `${b0.indexValue.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${(b0.indexVariationPct ?? 0) >= 0 ? "+" : ""}${(b0.indexVariationPct ?? 0).toFixed(2).replace(".", ",")} %` : "non lu", detail: chk.detail });
  } catch {
    /* quiet */
  }

  // 9. Actualités : les liens morts, et la file d'attente de relecture.
  //
  // Le compte ne portait que sur les liens reçus depuis plus de sept jours :
  // une file fraîche restait invisible, et « personne n'a trié » se lisait
  // comme « rien n'est arrivé ». Le point compte désormais tout ce qui attend,
  // et ne s'alarme qu'au-delà de sept jours : voir la file est normal, la
  // laisser vieillir ne l'est pas.
  const news = await loadNews();
  const dead = news.filter((n) => n.status === "publiee" && isVisible(n, now) && n.linkOk === false);
  const waiting = news.filter((n) => n.status === "recu");
  const aged = waiting.filter((n) => now.getTime() - new Date(n.createdAt).getTime() > 7 * 86_400_000);
  const days = (n: (typeof waiting)[number]) => Math.floor((now.getTime() - new Date(n.createdAt).getTime()) / 86_400_000);
  const oldest = [...waiting].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  out.push({
    key: "news",
    label: "Actualités : liens à trier / liens morts",
    level: dead.length || aged.length ? "warn" : "ok",
    value: `${waiting.length} à trier · ${dead.length} mort${dead.length > 1 ? "s" : ""}`,
    detail:
      [
        ...(oldest ? [`le plus ancien attend depuis ${days(oldest)} jour${days(oldest) > 1 ? "s" : ""} : ${oldest.domain}`] : []),
        ...(aged.length ? [`${aged.length} au-delà de sept jours`] : []),
        ...dead.map((n) => `lien mort : ${n.title.slice(0, 50)}`),
      ]
        .slice(0, 3)
        .join(" · ") || "aucun lien en attente, aucun lien mort",
  });

  return out;
}

/**
 * After the evening ingest: log the state, and e-mail the desk when a point is
 * red (needs RESEND_API_KEY + EMAIL_FROM; otherwise the event log is the alert).
 */
export async function alertDesk(now = new Date()): Promise<{ level: HealthCheck["level"]; mailed: boolean }> {
  const checks = await healthChecks(now);
  const crit = checks.filter((c) => c.level === "crit");
  const warn = checks.filter((c) => c.level === "warn");
  const level: HealthCheck["level"] = crit.length ? "crit" : warn.length ? "warn" : "ok";
  const r = repo();
  await r.logEvent({
    kind: "system",
    html: `<b>Santé</b> : ${level === "ok" ? "tout est vert" : [...crit, ...warn].map((c) => `${c.level === "crit" ? "🔴" : "🟠"} ${c.label} : ${c.value}`).join(" · ")}`,
  });
  if (!crit.length) return { level, mailed: false };
  const to = await deskRecipients();
  if (!to.length || !emailConfigured()) return { level, mailed: false };
  const { sendEmail } = await import("@/lib/notify/providers");
  const text = crit.map((c) => `${c.label}\n${c.value}${c.detail ? `\n${c.detail}` : ""}`).join("\n\n");
  const html = `<p>Points en rouge après le passage du soir :</p>${crit.map((c) => `<p><b>${c.label}</b><br>${c.value}${c.detail ? `<br><small>${c.detail}</small>` : ""}</p>`).join("")}<p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/desk/sante">Voir la page Santé</a></p>`;
  for (const addr of to) {
    try {
      await sendEmail(addr, `Guichet : ${crit.length} point(s) à traiter`, html, text);
    } catch {
      /* the event log already carries the alert */
    }
  }
  return { level, mailed: true };
}
