import { repo } from "@/lib/data";
import { healthChecks } from "@/lib/health";
import { displayStatus, isActionable } from "@/lib/domain/status";
import type { Offer } from "@/lib/domain/types";
import { fmtDate } from "@/lib/format";
import { positionsFrom } from "@/lib/positions";
import type { Tile } from "./TodayPanel";

/**
 * The figures of « Aujourd'hui », computed from what the desk already keeps:
 * the last bulletin against the session expected today, lines whose price
 * is older than that bulletin or whose window closed without the state
 * following, the selection, the queue of intentions, the sources to
 * validate, the health checks. Never throws: a tile that cannot be computed
 * is quiet.
 */
const yaounde = (now: Date) => new Date(now.getTime() + 60 * 60 * 1000); // UTC+1, no DST
const isTradingDay = (d: Date) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5;
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

export async function todayTiles(t: (s: string, v?: Record<string, string>) => string, now = new Date(), offers?: Offer[]): Promise<{ tiles: Tile[]; bulletin: { expected: boolean; missing: boolean; failed: boolean }; today: string }> {
  const r = repo();
  const local = yaounde(now);
  const today = dayOf(local);
  const [all, bulletins, intents, intake, checks] = await Promise.all([offers ?? r.listOffers(), r.listBulletins(3).catch(() => []), r.listIntents(), r.listIntake().catch(() => []), healthChecks(now).catch(() => [])]);
  const tiles: Tile[] = [];

  // 1. The bulletin: expected once the session's run is due (19:30 Yaoundé on a trading day).
  const last = bulletins[0];
  // The session whose bulletin should be in by now: today's once the evening run is due (19:30 Yaoundé), the previous trading day's before that.
  const lastTradingDay = (from: Date, inclusive: boolean) => {
    const d = new Date(from);
    if (!inclusive) d.setUTCDate(d.getUTCDate() - 1);
    while (!isTradingDay(d)) d.setUTCDate(d.getUTCDate() - 1);
    return dayOf(d);
  };
  const due = isTradingDay(local) ? local.getUTCHours() * 60 + local.getUTCMinutes() >= 19 * 60 + 30 : true;
  const expected = lastTradingDay(local, due);
  const have = last && last.sessionDate >= expected;
  const failed = Boolean(have && last!.status === "echec");
  const partial = Boolean(have && last!.status === "partiel");
  const missing = !have;
  tiles.push({
    key: "boc",
    label: t("Bulletin BVMAC"),
    value: last ? `n° ${last.number || "?"}` : t("aucun"),
    detail: last ? (missing ? t("dernier lu : séance du {d} · celle du {e} attendue", { d: fmtDate(last.sessionDate), e: fmtDate(expected) }) : `${t("séance du {d}", { d: fmtDate(last.sessionDate) })} · ${last.counts.equities + last.counts.bonds + last.counts.funds} ${t("lignes")} · ${t(failed ? "échec" : partial ? "à vérifier" : "complet")}`) : t("aucun bulletin lu pour l'instant"),
    tone: failed ? "crit" : missing || partial ? "warn" : "ok",
    href: "/desk/marche",
    action: t(failed || missing ? "réparer ci-dessous" : partial ? "voir les anomalies" : "voir le marché"),
  });

  // 2. Lines to refresh: a listed line priced before the last bulletin, a primary line past its window still open.
  const stale = last ? all.filter((o) => !o.hidden && o.kind === "MARCHE" && o.priceSource === "boc" && (o.pricedAt ?? "").slice(0, 10) < last.sessionDate).length : 0;
  // published, results day passed, results not entered: the desk has them to key in
  const overdue = all.filter((o) => !o.hidden && o.kind !== "MARCHE" && o.kind !== "FONDS" && o.status === "published" && (o.resultsAt ?? o.deadlineAt).slice(0, 10) < today).length;
  tiles.push({
    key: "lines",
    label: t("Lignes à rafraîchir"),
    value: String(stale + overdue),
    detail: stale + overdue ? [stale ? t("{n} cotée(s) sans le dernier cours", { n: String(stale) }) : "", overdue ? t("{n} résultat(s) à saisir", { n: String(overdue) }) : ""].filter(Boolean).join(" · ") : t("cours et états à jour"),
    tone: overdue ? "warn" : stale ? "warn" : "ok",
    href: "/desk/marche",
    action: stale + overdue ? t("mettre à jour") : undefined,
  });

  // 3. The selection.
  const featured = all.filter((o) => o.featured && o.featured.until >= today);
  const closedFeatured = featured.filter((o) => !isActionable(displayStatus(o, now))).length;
  tiles.push({
    key: "une",
    label: t("À la une"),
    value: `${featured.length}/3`,
    detail: closedFeatured ? t("{n} clôturée(s) à retirer", { n: String(closedFeatured) }) : featured.length ? t("sélection en place") : t("aucune ligne mise en avant"),
    tone: closedFeatured ? "warn" : featured.length ? "ok" : "quiet",
    href: "/desk#une",
    action: closedFeatured ? t("retirer") : undefined,
  });

  // 4. Intentions waiting for a first call.
  const waiting = intents.filter((i) => i.state === "recue").length;
  const oldest = intents.filter((i) => i.state === "recue").map((i) => i.createdAt).sort()[0];
  const hoursOld = oldest ? Math.floor((now.getTime() - new Date(oldest).getTime()) / 36e5) : 0;
  tiles.push({
    key: "intents",
    label: t("Intentions non traitées"),
    value: String(waiting),
    detail: waiting ? t("la plus ancienne attend depuis {h} h", { h: String(hoursOld) }) : t("tout est rappelé"),
    tone: waiting ? (hoursOld >= 24 ? "crit" : "warn") : "ok",
    href: "/desk?etat=recue",
    action: waiting ? t("rappeler") : undefined,
  });

  // 5. Sources to validate.
  const toValidate = intake.filter((i) => i.state === "a_valider" || i.state === "en_revue").length;
  tiles.push({
    key: "intake",
    label: t("À valider"),
    value: String(toValidate),
    detail: toValidate ? t("sources reçues, extraction faite") : t("rien en attente"),
    tone: toValidate ? "warn" : "ok",
    href: "/desk/a-valider",
    action: toValidate ? t("publier") : undefined,
  });

  // 6. Coupons and redemptions paid without a notice (positions of every client, last 120 days).
  try {
    const [intents, docs] = await Promise.all([r.listIntents(), r.listDocuments()]);
    const done = new Set(docs.filter((d) => d.flowKey).map((d) => d.flowKey));
    const since = new Date(now.getTime() - 120 * 86400e3).toISOString().slice(0, 10);
    const clients = [...new Set(intents.map((i) => i.clientId).filter((x): x is string => Boolean(x)))];
    let flows = 0;
    const who = new Set<string>();
    const lines = new Set<string>();
    for (const clientId of clients)
      for (const p of positionsFrom(intents.filter((i) => i.clientId === clientId), offers ?? (await r.listOffers())))
        for (const f of p.paid) {
          if (f.date < since || done.has(`${clientId}|${p.offer.isin}|${f.date}`)) continue;
          flows++;
          who.add(clientId);
          lines.add(p.offer.title.slice(0, 28));
        }
    tiles.push({
      key: "coupons",
      label: t("Coupons et remboursements à aviser"),
      value: flows ? t("{n} flux · {c} client(s)", { n: String(flows), c: String(who.size) }) : "0",
      detail: flows ? [...lines].slice(0, 3).join(" · ") : t("chaque flux payé a son avis"),
      tone: flows ? "warn" : "ok",
      href: "/desk/clients",
      action: flows ? t("émettre les avis") : undefined,
    });
  } catch {
    /* quiet */
  }

  // 7. Health.
  const worst = checks.some((c) => c.level === "crit") ? "crit" : checks.some((c) => c.level === "warn") ? "warn" : "ok";
  const bad = checks.filter((c) => c.level !== "ok");
  tiles.push({
    key: "health",
    label: t("Santé"),
    value: t(worst === "ok" ? "au vert" : worst === "warn" ? "un point orange" : "un point rouge"),
    detail: bad.length ? bad.map((c) => c.label).slice(0, 2).join(" · ") : t("{n} contrôles passés", { n: String(checks.length) }),
    tone: worst,
    href: "/desk/sante",
    action: bad.length ? t("voir") : undefined,
  });

  return { tiles, bulletin: { expected: Boolean(expected), missing, failed }, today };
}
