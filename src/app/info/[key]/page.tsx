import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { displayStatus, headlineYield, isActionable } from "@/lib/domain/status";
import type { Offer } from "@/lib/domain/types";
import { loadCompanies, loadLessons } from "@/lib/reference";
import { LessonWidget, type Live } from "./LessonWidget";
import { Quiz } from "./Quiz";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: Props) {
  const { key } = await params;
  const l = (await loadLessons()).find((x) => x.key === key);
  return { title: l ? l.title : "Leçon" };
}

/** Picks the real line the lesson plays with: an open one first, then any published one of the right kind. */
function pickLive(offers: Offer[], kinds: Offer["kind"][], instrument?: "action" | "obligation"): Offer | undefined {
  const now = new Date();
  const ok = offers.filter((o) => !o.hidden && kinds.includes(o.kind) && (!instrument || o.instrument === instrument));
  return ok.find((o) => isActionable(displayStatus(o, now))) ?? ok[0];
}

export default async function LessonPage({ params }: Props) {
  const { key } = await params;
  const lessons = await loadLessons();
  const i = lessons.findIndex((x) => x.key === key);
  if (i < 0) notFound();
  const l = lessons[i];
  const next = lessons[i + 1];
  const offers = await repo().listOffers();

  let live: Live = { title: "Exemple : OTA 6,00 % · 31 mars 2028", nominal: 10_000, couponRate: 6, settleOn: "2026-09-17", maturityOn: "2028-03-31", lastCouponOn: "2026-03-31", pricePct: 96, exampleNote: "exemple" };
  if (l.widget === "bond_price" || l.widget === "read_ota" || l.widget === "tenor" || l.widget === "auction") {
    const o = pickLive(offers, ["OTA", "APE"]);
    if (o && o.couponRate != null && o.maturityOn) live = { title: o.title, href: `/offres/${o.id}`, nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn ?? null, pricePct: o.pricePct ?? 100, yieldPct: headlineYield(o) ?? undefined };
  } else if (l.widget === "bta_rate") {
    const o = pickLive(offers, ["BTA"]);
    live = o ? { title: o.title, href: `/offres/${o.id}`, nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn, precountRate: o.precountRate ?? 5.5 } : { title: "Exemple : BTA 52 semaines", nominal: 1_000_000, settleOn: "2026-09-17", maturityOn: "2027-09-16", precountRate: 5.5, exampleNote: "exemple" };
  } else if (l.widget === "equity") {
    const o = pickLive(offers, ["ACTIONS", "MARCHE"], undefined) ?? pickLive(offers, ["MARCHE"], "action");
    const companies = await loadCompanies();
    const c = o ? companies.find((x) => x.isin === o.isin) : undefined;
    const last = c?.figures[c.figures.length - 1];
    const price = o?.pricePerShare ?? o?.lastPrice;
    const div = o?.dividendPerShare ?? last?.dividendPerShare ?? undefined;
    const eps = c && last ? last.netIncome / c.sharesTotal : undefined;
    live = o && price ? { title: o.title, href: `/offres/${o.id}`, pricePerShare: price, dividendPerShare: div ?? undefined, eps } : { title: "Exemple : action à 45 000 FCFA", pricePerShare: 45_000, dividendPerShare: 2_500, eps: 5_000, exampleNote: "exemple" };
  } else if (l.widget === "fund") {
    const o = offers.find((x) => x.kind === "FONDS" && x.fund?.distributed && !x.hidden) ?? offers.find((x) => x.kind === "FONDS" && x.fund);
    live = o?.fund ? { title: o.title, href: `/offres/${o.id}`, nav: o.fund.nav, entryFeePct: o.fund.entryFeePct } : { title: "Exemple : FCP monétaire", nav: 13_262, entryFeePct: 0, exampleNote: "exemple" };
  } else {
    live = { title: "Les quatre risques" };
  }

  return (
    <div className={styles.wrap}>
      <Link href="/info" className={styles.back}>
        ← Info
      </Link>
      <div className={styles.head}>
        <div className="eyebrow">
          Leçon {l.order} sur {lessons.length} · {l.minutes} min
        </div>
        <h1 className="display">{l.title}</h1>
        <p className={styles.intro}>{l.intro}</p>
      </div>
      <div className={styles.body}>
        {l.body.map((p, k) => (
          <p key={k}>{p}</p>
        ))}
      </div>
      <div className={styles.widget}>
        <LessonWidget kind={l.widget} live={live} />
      </div>
      <Quiz lessonKey={l.key} q={l.quiz.q} options={l.quiz.options} answer={l.quiz.answer} why={l.quiz.why} nextHref={next ? `/info/${next.key}` : undefined} nextTitle={next?.title} />
      <nav className={styles.pager}>
        {i > 0 ? <Link href={`/info/${lessons[i - 1].key}`}>← {lessons[i - 1].title}</Link> : <span />}
        {next && <Link href={`/info/${next.key}`}>{next.title} →</Link>}
      </nav>
    </div>
  );
}
