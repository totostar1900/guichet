import Link from "next/link";
import { SwipePager } from "@/components/mobile/SwipePager";
import { GuideBar } from "../GuideBar";
import { LinkedParagraphs } from "@/components/TermSheet";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { indexSeries, indexStats, indexWeights } from "@/lib/market/index";
import { displayStatus, headlineYield, isActionable } from "@/lib/domain/status";
import type { Offer } from "@/lib/domain/types";
import { loadCompanies, loadLessons } from "@/lib/reference";
import { SECTIONS } from "@/data/parcours";
import { SectionShape } from "@/components/Illustrations";
import { LessonWidget, type Live } from "./LessonWidget";
import { Quiz } from "./Quiz";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: Props) {
  const { key } = await params;
  const [ls, t] = await Promise.all([loadLessons(), getT()]);
  const l = ls.find((x) => x.key === key);
  return { title: t(l ? l.title : "Leçon") };
}

/** Picks the real line the lesson plays with: an open one first, then any published one of the right kind. */
function pickLive(offers: Offer[], kinds: Offer["kind"][], instrument?: "action" | "obligation"): Offer | undefined {
  const now = new Date();
  const ok = offers.filter((o) => !o.hidden && kinds.includes(o.kind) && (!instrument || o.instrument === instrument));
  return ok.find((o) => isActionable(displayStatus(o, now))) ?? ok[0];
}

export default async function LessonPage({ params }: Props) {
  const { key } = await params;
  const all = await loadLessons();
  const me = all.find((x) => x.key === key);
  if (!me) notFound();
  // The course this lesson belongs to: its section of the parcours, or the first eight.
  const section = me.section ? SECTIONS.find((s) => s.key === me.section) : undefined;
  const lessons = all.filter((x) => (section ? x.section === section.key : !x.section)).sort((a, b) => a.order - b.order);
  const i = lessons.findIndex((x) => x.key === key);
  const l = lessons[i];
  const next = lessons[i + 1];
  // The last lesson of a section hands over to the next section's first.
  const parcours = all.filter((x) => x.section).sort((a, b) => a.order - b.order);
  const after = !next && section ? parcours[parcours.findIndex((x) => x.key === key) + 1] : undefined;
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
  } else if (l.widget === "indice") {
    const [bulletins, latest] = await Promise.all([repo().listBulletins(400).catch(() => []), repo().latestQuotes().catch(() => [])]);
    const st = indexStats(indexSeries(bulletins));
    live = st.last ? { title: "BVMAC All Share Index", href: "/indice", index: { level: st.last.value, date: st.last.date, day: st.day, month: st.month, ytd: st.ytd, year: st.year, weights: indexWeights(latest).map((x) => ({ mnemo: x.mnemo, wTotal: x.weightTotal, wFloat: x.weightFloat })) } } : { title: "BVMAC All Share Index" };
  } else {
    live = { title: "Les quatre risques" };
  }

  const t = await getT();
  if (live.title.startsWith("Exemple") || live.title === "Les quatre risques") live = { ...live, title: t(live.title) };
  // On the phone, a lesson has neighbours under the finger: the previous and the next of its course (the next section's first after the last).
  const prevL = i > 0 ? lessons[i - 1] : section ? parcours[parcours.findIndex((x) => x.key === key) - 1] : undefined;
  const nextL = next ?? after;
  const pos = (n: number) => `${section ? String.fromCharCode(64 + section.order) + " · " : ""}${n} / ${lessons.length}`;
  return (
    <SwipePager
      hintKey="lecon"
      prev={prevL ? { href: `/info/${prevL.key}`, title: t(prevL.title), pos: i > 0 ? pos(i) : t("Section précédente") } : undefined}
      next={nextL ? { href: `/info/${nextL.key}`, title: t(nextL.title), pos: next ? pos(i + 2) : t("Section suivante") } : undefined}
      hints={{ next: "Glissez vers la gauche : la leçon suivante", prev: "Glissez vers la droite : la leçon précédente" }}
    >
    <div className={styles.wrap}>
      <Link href={section ? "/info/parcours" : "/info"} className={styles.back}>
        ← {section ? t("Comprendre le marché CEMAC") : t("Guide")}
      </Link>
      <div className={styles.head}>
        <div className={`eyebrow ${styles.eyebrow}`}>
          {section && <SectionShape shape={section.shape} color={section.color} size={16} />}
          {section ? `${String.fromCharCode(64 + section.order)} · ${t(section.title)} · ` : ""}
          {t("Leçon {n} sur {total}", { n: i + 1, total: lessons.length })} · {l.minutes} min
        </div>
        <h1 className="display">{t(l.title)}</h1>
        <p className={styles.intro}>{t(l.intro)}</p>
      </div>
      <div className={styles.body}>
        <LinkedParagraphs paragraphs={l.body.map((p) => t(p))} />
      </div>
      <div className={styles.widget}>
        <LessonWidget kind={l.widget} live={live} focus={l.focus} />
      </div>
      <Quiz lessonKey={l.key} q={t(l.quiz.q)} options={l.quiz.options.map((o) => t(o))} answer={l.quiz.answer} why={t(l.quiz.why)} nextHref={next ? `/info/${next.key}` : after ? `/info/${after.key}` : section ? "/info/parcours" : undefined} nextTitle={next ? t(next.title) : after ? `${t("Section suivante")} : ${t(after.title)}` : section ? t("Retour au parcours") : undefined} />
      <GuideBar pos={{ label: pos(i + 1), index: i + 1, total: lessons.length }} prev={prevL ? { href: `/info/${prevL.key}`, title: t(prevL.title) } : undefined} next={nextL ? { href: `/info/${nextL.key}`, title: t(nextL.title) } : undefined} chapter={section ? { key: section.key, letter: String.fromCharCode(64 + section.order), color: section.color, title: t(section.title) } : { letter: String(i + 1), color: "var(--gold-ink)", title: t("Lire une ligne en trente secondes") }} lessonKey={l.key} />
      <nav className={styles.pager}>
        {i > 0 ? <Link href={`/info/${lessons[i - 1].key}`}>← {t(lessons[i - 1].title)}</Link> : <span />}
        {next ? <Link href={`/info/${next.key}`}>{t(next.title)} →</Link> : after ? <Link href={`/info/${after.key}`}>{t(after.title)} →</Link> : null}
      </nav>
    </div>
    </SwipePager>
  );
}
