"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { fmtPct } from "@/lib/format";
import styles from "./YieldRange.module.css";

/**
 * The yield filter as a gauge: the distribution of the lines' yields as bars,
 * a two-thumb range over it, presets underneath. The chosen range lives in the
 * URL as `rendement=min-max` (either side optional).
 */
export function parseYieldRange(v: string | null): { min?: number; max?: number } {
  if (!v) return {};
  const [a, b] = v.split("-");
  const min = a ? Number(a.replace(",", ".")) : undefined;
  const max = b ? Number(b.replace(",", ".")) : undefined;
  return { min: min != null && !isNaN(min) ? min : undefined, max: max != null && !isNaN(max) ? max : undefined };
}
export const yieldRangeParam = (min?: number, max?: number): string | undefined => (min == null && max == null ? undefined : `${min ?? ""}-${max ?? ""}`.replace(/-$/, ""));
export const yieldRangeLabel = (r: { min?: number; max?: number }): string => (r.min != null && r.max != null ? `${fmtPct(r.min, 1)} – ${fmtPct(r.max, 1)}` : r.min != null ? `≥ ${fmtPct(r.min, 1)}` : r.max != null ? `≤ ${fmtPct(r.max, 1)}` : "");

const STEP = 0.25;
const BINS = 24;

export function YieldGauge({ values, min, max, onChange }: { values: number[]; min?: number; max?: number; onChange: (min?: number, max?: number) => void }) {
  const t = useT();
  const lo = Math.floor(Math.min(0, ...values) / 1) || 0;
  const hi = Math.max(1, Math.ceil(Math.max(0, ...values)));
  const bins = useMemo(() => {
    const out = new Array(BINS).fill(0);
    for (const v of values) out[Math.min(BINS - 1, Math.max(0, Math.floor(((v - lo) / (hi - lo)) * BINS)))]++;
    return out;
  }, [values, lo, hi]);
  const peak = Math.max(1, ...bins);
  const a = min ?? lo;
  const b = max ?? hi;
  // Local state while dragging; the URL updates on release.
  const [drag, setDrag] = useState<{ a: number; b: number } | null>(null);
  const cur = drag ?? { a, b };
  const commit = (na: number, nb: number) => {
    setDrag(null);
    onChange(na > lo ? na : undefined, nb < hi ? nb : undefined);
  };
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const presets: [string, number | undefined, number | undefined][] = [
    [t("Tout"), undefined, undefined],
    ["≥ 5 %", 5, undefined],
    ["≥ 7 %", 7, undefined],
    ["≥ 9 %", 9, undefined],
    ["5 – 8 %", 5, 8],
  ];
  const count = values.filter((v) => v >= cur.a && v <= cur.b).length;
  return (
    <div className={styles.gauge}>
      <div className={styles.bars} aria-hidden="true">
        {bins.map((n, i) => {
          const x0 = lo + (i / BINS) * (hi - lo);
          const x1 = lo + ((i + 1) / BINS) * (hi - lo);
          const inRange = x1 > cur.a && x0 < cur.b + 1e-9;
          return <i key={i} style={{ height: `${Math.max(6, (n / peak) * 100)}%` }} className={inRange ? styles.on : undefined} />;
        })}
      </div>
      <div className={styles.slider}>
        <div className={styles.track}>
          <div className={styles.fill} style={{ left: `${pct(cur.a)}%`, width: `${pct(cur.b) - pct(cur.a)}%` }} />
        </div>
        <input type="range" min={lo} max={hi} step={STEP} value={cur.a} aria-label={t("Rendement minimum")} onChange={(e) => setDrag({ a: Math.min(Number(e.target.value), cur.b), b: cur.b })} onPointerUp={() => commit(cur.a, cur.b)} onKeyUp={() => commit(cur.a, cur.b)} onBlur={() => drag && commit(cur.a, cur.b)} />
        <input type="range" min={lo} max={hi} step={STEP} value={cur.b} aria-label={t("Rendement maximum")} onChange={(e) => setDrag({ a: cur.a, b: Math.max(Number(e.target.value), cur.a) })} onPointerUp={() => commit(cur.a, cur.b)} onKeyUp={() => commit(cur.a, cur.b)} onBlur={() => drag && commit(cur.a, cur.b)} />
      </div>
      <div className={styles.read}>
        <b>
          {fmtPct(cur.a, 1)} – {fmtPct(cur.b, 1)}
        </b>
        <small>
          {count} {t(count > 1 ? "lignes" : "ligne")}
        </small>
      </div>
      <div className={styles.presets}>
        {presets.map(([l, pa, pb]) => {
          const on = (pa ?? lo) === a && (pb ?? hi) === b;
          return (
            <button key={l} type="button" className={on ? styles.presetOn : undefined} aria-pressed={on} onClick={() => commit(pa ?? lo, pb ?? hi)}>
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The toolbar button that opens the gauge (desktop). */
export function YieldDropdown({ values, min, max, onChange }: { values: number[]; min?: number; max?: number; onChange: (min?: number, max?: number) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const active = min != null || max != null;
  return (
    <div className={styles.dd} ref={ref}>
      <button type="button" className={`${styles.btn} ${active ? styles.btnOn : ""}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        {t("Rendement")}
        {active && <b>{yieldRangeLabel({ min, max })}</b>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className={styles.menu}>
          <YieldGauge values={values} min={min} max={max} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
