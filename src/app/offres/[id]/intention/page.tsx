import Link from "next/link";
import { notFound } from "next/navigation";
import { IntentForm } from "@/components/IntentForm";
import { Kpis } from "../Kpis";
import { summarize } from "@/lib/domain/summary";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { statusLabel } from "@/lib/domain/status";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { tenorText } from "@/lib/finance";
import { getLang, getT } from "@/i18n/server";
import { loadIntentContext } from "../intent-context";
import styles from "./page.module.css";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ intent?: string; qty?: string; de?: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const o = await repo().getOffer(id);
  return { title: o ? `Votre intention · ${o.title}` : "Votre intention" };
}

/**
 * The intention on its own page: the line's three figures and its price
 * stamp pinned in the head, then the form, step by step, with nothing else
 * around it. Opened from the fiche's bar, a card's pull, the desk's WhatsApp
 * link. On a desk-sized screen the fiche keeps the form in its side column;
 * this page still works there, as the address a link points to.
 */
export default async function IntentionPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [t, lang, o, session] = await Promise.all([getT(), getLang(), repo().getOffer(id), getSession()]);
  if (!o || (o.status === "withdrawn" && !isDesk(session))) notFound();
  const c = await loadIntentContext(o, sp, session);
  const summary = summarize(o, new Date());
  const stampPending = o.kind !== "MARCHE" && Boolean(o.priceNote || o.rateNote);
  const stamp = o.kind === "FONDS" && o.fund ? `VL du ${fmtDate(o.fund.navDate)} publiée par ${o.fund.manager}` : o.kind === "MARCHE" ? `Dernier cours BVMAC${o.pricedAt ? ` · ${fmtDateTime(o.pricedAt)}` : ""}` : o.servedPricePct ? "Prix servi à l'adjudication" : stampPending ? "Indicatif : prix à fixer par le desk" : `Prix fixé par le desk · ${o.pricedAt ? fmtDateTime(o.pricedAt) : "—"}`;
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <Link href={`/offres/${o.id}`} className={styles.back}>
          ← {t("La fiche")}
        </Link>
        <div className={styles.line}>
          <span className="eyebrow">{t(summary.subtitle)}</span>
          <h1>{o.title}</h1>
          <div className={styles.meta}>
            <span className={`pill ${c.st}`}>{t(statusLabel(o, c.st))}</span>
            <span className="mono">{o.isin}</span>
          </div>
        </div>
        <Kpis o={o} />
        <span className={`stamp ${stampPending ? "pending" : ""}`}>{t(stamp)}</span>
      </div>

      <div className={styles.form} id="intention" data-coach="action">
        <IntentForm offer={o} types={c.types} initialType={c.initial} initialAmount={c.qty} held={c.held} priceText={c.priceText} past={c.past} signedIn={Boolean(session)} tier={o.kind === "FONDS" && session?.kycStatus === "approuve" ? 2 : (session?.tier ?? 0)} phone={session?.phone ?? ""} email={session?.email ?? ""} name={session?.name ?? ""} channels={c.channels} bridge={c.bridge} profileFlag={c.mark?.level === "warn" ? c.mark[lang] : undefined} investable={c.fin?.investable} />
        {o.maturityOn && !c.past && (
          <div className={styles.note}>
            {t("Durée réelle")} <b>{tenorText(o.settleOn, o.maturityOn)}</b> · {t("règlement le")} {fmtDate(o.settleOn)} · {o.sizeLabel ?? ""}
          </div>
        )}
      </div>
    </div>
  );
}
