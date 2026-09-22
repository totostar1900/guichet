import Link from "next/link";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import type { IndexPoint, IndexWeight } from "@/lib/market/index";
import { base100 } from "@/lib/market/index";
import { getT } from "@/i18n/server";
import styles from "./IndexVsShare.module.css";

/**
 * Under a share's price chart: the share and the BVMAC All Share Index on
 * the same period, both rebased to 100 at the first session, and the one
 * sentence that matters (did the share move with the market, or alone),
 * with the weight of the share in the index and its last dividend.
 */
export async function IndexVsShare({ name, share, index, from, weight, dividendPerShare, close }: { name: string; share: { date: string; value: number }[]; index: IndexPoint[]; from: string; weight?: IndexWeight; dividendPerShare?: number; close?: number }) {
  const t = await getT();
  const s = base100(share, from);
  const i = base100(index, from);
  if (s.length < 2 || i.length < 2) return null;
  const all = [...s, ...i];
  const dates = [...new Set(all.map((p) => p.date))].sort();
  const x = (d: string) => 34 + (dates.indexOf(d) / Math.max(1, dates.length - 1)) * 642;
  const lo = Math.min(...all.map((p) => p.value)) - 2;
  const hi = Math.max(...all.map((p) => p.value)) + 2;
  const y = (v: number) => 150 - ((v - lo) / (hi - lo)) * 130;
  const path = (pts: { date: string; value: number }[]) => pts.map((p) => `${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const sEnd = s[s.length - 1].value - 100;
  const iEnd = i[i.length - 1].value - 100;
  const ticks = [lo + 2, (lo + hi) / 2, hi - 2];
  const alone = Math.abs(sEnd - iEnd) >= 2;
  const big = weight && weight.weightTotal >= 50 ? weight : undefined;
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <b>{t("Cours et indice, base 100 depuis le {d}", { d: fmtDate(dates[0]) })}</b>
        <span className={styles.keys}>
          <i className={styles.kShare} /> {name} <i className={styles.kIndex} /> <Link href="/indice">BVMAC-AS →</Link>
        </span>
      </div>
      <svg viewBox="0 0 680 170" role="img" aria-label={t("Cours de {n} et indice BVMAC, base 100", { n: name })} className={styles.svg}>
        <title>{t("Cours de {n} et indice BVMAC, base 100", { n: name })}</title>
        {ticks.map((v) => (
          <g key={v}>
            <line x1="34" x2="676" y1={y(v)} y2={y(v)} className={styles.grid} />
            <text x="4" y={y(v) + 3} className={styles.tick}>
              {Math.round(v)}
            </text>
          </g>
        ))}
        <polyline points={path(i)} className={styles.index} />
        <polyline points={path(s)} className={styles.share} />
        <text x="676" y="166" textAnchor="end" className={styles.tick}>
          {fmtDate(dates[0])} → {fmtDate(dates[dates.length - 1])}
        </text>
      </svg>
      <p className={styles.read}>
        <b>
          {name} {sEnd >= 0 ? "+" : ""}
          {fmtPct(sEnd, 1)}, {t("l'indice")} {iEnd >= 0 ? "+" : ""}
          {fmtPct(iEnd, 1)}
        </b>{" "}
        : {alone ? (sEnd > iEnd ? t("la valeur a fait plus que le marché") : t("la valeur a fait moins que le marché")) : t("la valeur a suivi le marché")}
        {big ? ` ; ${t("le marché, c'est pour {w} {m}", { w: `${Math.round(big.weightTotal)} %`, m: big.mnemo })}` : ""}.
        {weight ? ` ${t("Poids de {n} dans l'indice : {w} (capital global), {f} (flottant)", { n: name, w: fmtPct(weight.weightTotal, 1), f: fmtPct(weight.weightFloat, 1) })}.` : ""}
        {dividendPerShare != null && close ? ` ${t("Dernier dividende : {d} FCFA par action, {y} du cours, non compté dans l'indice", { d: fmt(dividendPerShare), y: fmtPct((dividendPerShare / close) * 100, 1) })}.` : ""}
      </p>
    </div>
  );
}
