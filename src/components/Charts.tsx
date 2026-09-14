import styles from "./Charts.module.css";

/**
 * Small server-rendered SVG charts: no library, theme tokens for colour,
 * labels only where they carry information. Each chart states its scale.
 */

const fmtShort = (v: number): string => {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md`;
  if (a >= 1e6) return `${(v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} M`;
  if (a >= 1e3) return `${(v / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k`;
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
};

function niceTicks(min: number, max: number, n = 4): number[] {
  if (max === min) return [min];
  const raw = (max - min) / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** Closing prices over time; flat segments stay flat (the BVMAC prints the last price every session). */
export function LineChart({ points, unit = "FCFA", height = 220, ariaLabel }: { points: { date: string; value: number }[]; unit?: string; height?: number; ariaLabel: string }) {
  const W = 720;
  const H = height;
  const padL = 56;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  if (points.length === 0) return <div className={styles.empty}>Pas encore de cours sur cette période.</div>;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max === min) {
    min = min * 0.97;
    max = max * 1.03;
  }
  const pad = (max - min) * 0.08;
  min -= pad;
  max += pad;
  const ticks = niceTicks(min, max, 4);
  const x = (i: number) => (points.length === 1 ? W / 2 : padL + (i * (W - padL - padR)) / (points.length - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / (max - min));
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${d} L${x(points.length - 1).toFixed(1)} ${(H - padB).toFixed(1)} L${x(0).toFixed(1)} ${(H - padB).toFixed(1)} Z`;
  const last = points[points.length - 1];
  const up = last.value >= points[0].value;
  // x labels: first, ~middle, last
  const labelIdx = points.length > 2 ? [0, Math.floor(points.length / 2), points.length - 1] : points.map((_, i) => i);
  const short = (iso: string) => {
    const [yy, mm, dd] = iso.split("-");
    return `${dd}/${mm}/${yy.slice(2)}`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={ariaLabel}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className={styles.grid} />
          <text x={padL - 8} y={y(t) + 4} className={styles.tick} textAnchor="end">
            {fmtShort(t)}
          </text>
        </g>
      ))}
      <path d={area} className={up ? styles.areaUp : styles.areaDown} />
      <path d={d} className={up ? styles.lineUp : styles.lineDown} />
      <circle cx={x(points.length - 1)} cy={y(last.value)} r={4} className={up ? styles.dotUp : styles.dotDown} />
      <text x={Math.min(x(points.length - 1), W - padR - 70)} y={y(last.value) - 10} className={styles.lastLabel} textAnchor="end">
        {fmtShort(last.value)} {unit}
      </text>
      {labelIdx.map((i) => (
        <text key={i} x={x(i)} y={H - 8} className={styles.tick} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>
          {short(points[i].date)}
        </text>
      ))}
    </svg>
  );
}

/** Grouped bars per year (e.g. revenue and net income). Values in FCFA. */
export function BarChart({ groups, series, height = 220, ariaLabel }: { groups: string[]; series: { name: string; values: number[]; accent?: boolean }[]; height?: number; ariaLabel: string }) {
  const W = 720;
  const H = height;
  const padL = 56;
  const padR = 12;
  const padT = 14;
  const padB = 44;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(0, ...all);
  const min = Math.min(0, ...all);
  const ticks = niceTicks(min, max, 4);
  const top = Math.max(max, ticks[ticks.length - 1]);
  const bottom = Math.min(min, ticks[0]);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - bottom) / (top - bottom || 1));
  const gw = (W - padL - padR) / groups.length;
  const bw = Math.min(40, (gw * 0.7) / series.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={ariaLabel}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className={t === 0 ? styles.axis : styles.grid} />
          <text x={padL - 8} y={y(t) + 4} className={styles.tick} textAnchor="end">
            {fmtShort(t)}
          </text>
        </g>
      ))}
      {groups.map((g, gi) => (
        <g key={g}>
          {series.map((s, si) => {
            const v = s.values[gi] ?? 0;
            const x0 = padL + gi * gw + (gw - bw * series.length) / 2 + si * bw;
            const yTop = y(Math.max(v, 0));
            const h = Math.abs(y(v) - y(0));
            return (
              <g key={s.name}>
                <rect x={x0 + 1} y={yTop} width={bw - 2} height={Math.max(h, 1)} rx={3} className={s.accent ? styles.barAccent : styles.bar} />
                {series.length <= 2 && <text x={x0 + bw / 2} y={yTop - 5} className={styles.value} textAnchor="middle">{fmtShort(v)}</text>}
              </g>
            );
          })}
          <text x={padL + gi * gw + gw / 2} y={H - 26} className={styles.tickStrong} textAnchor="middle">
            {g}
          </text>
        </g>
      ))}
      {series.map((s, si) => (
        <g key={s.name} transform={`translate(${padL + si * 170}, ${H - 8})`}>
          <rect width={10} height={10} y={-9} rx={2} className={s.accent ? styles.barAccent : styles.bar} />
          <text x={14} className={styles.tick}>
            {s.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Horizontal share of capital. */
export function ShareBar({ parts }: { parts: { name: string; pct: number }[] }) {
  const total = parts.reduce((s, p) => s + p.pct, 0);
  const rest = Math.max(0, 100 - total);
  const all = rest > 0.05 ? [...parts, { name: "Flottant et autres", pct: rest }] : parts;
  return (
    <div className={styles.shareWrap}>
      <div className={styles.shareBar} role="img" aria-label={all.map((p) => `${p.name} ${p.pct} %`).join(", ")}>
        {all.map((p, i) => (
          <span key={p.name} className={styles[`seg${i % 5}`]} style={{ width: `${p.pct}%` }} title={`${p.name} · ${p.pct} %`} />
        ))}
      </div>
      <ul className={styles.shareLegend}>
        {all.map((p, i) => (
          <li key={p.name}>
            <i className={styles[`seg${i % 5}`]} /> {p.name} <b>{p.pct.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
