import { fmt, fmtPct } from "@/lib/format";
import type { QuarterLine, QuarterNote } from "@/lib/market/index-quarter";

/**
 * The four drawings of the quarterly note. Plain SVG, rendered on the server,
 * coloured from the theme tokens so each one reads in both themes. Every label
 * is passed in already translated: these components hold no wording of their
 * own beyond the numbers.
 */

const signed = (v: number, d = 2) => `${v > 0 ? "+" : ""}${fmtPct(v, d)}`;
const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" } as const;
/** Decimals keep the comma, like every other number in the app. */
const dec = (v: number, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Nice round steps covering [lo, hi], four of them at most. */
function ticks(lo: number, hi: number, want = 4): number[] {
  const span = hi - lo;
  if (span <= 0) return [lo];
  const raw = span / want;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

/** The index across the quarter's sessions, with the session that carried it named. */
export function IndexCurve({ note, peakLabel, dateOf }: { note: QuarterNote; peakLabel?: string; dateOf: (d: string) => string }) {
  const pts = note.points;
  if (pts.length < 2) return null;
  const W = 680;
  const H = 250;
  const L = 56;
  const R = 16;
  const T = 26;
  const B = 34;
  const vals = pts.map((p) => p.value);
  const lo = Math.min(...vals, note.levelBefore) * 0.995;
  const hi = Math.max(...vals, note.levelBefore) * 1.005;
  const x = (i: number) => L + (i / (pts.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - T - B);
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const peakIdx = note.peak ? pts.findIndex((p) => p.date === note.peak?.date) : -1;
  // a label every quarter of the width, so nothing overlaps at phone size
  const every = Math.max(1, Math.ceil(pts.length / 4));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${fmt(pts[0].value)} → ${fmt(pts[pts.length - 1].value)}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {ticks(lo, hi).map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fill="var(--ink-3)" fontSize={11} style={MONO}>
            {fmt(v)}
          </text>
        </g>
      ))}
      <polygon points={`${x(0)},${y(lo)} ${line} ${x(pts.length - 1)},${y(lo)}`} fill="var(--chart-out)" fillOpacity={0.07} />
      <polyline points={line} fill="none" stroke="var(--chart-out)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (p.variationPct !== 0 ? <circle key={p.date} cx={x(i)} cy={y(p.value)} r={2.8} fill={p.variationPct > 0 ? "var(--good)" : "var(--warn)"} /> : null))}
      {peakIdx >= 0 && peakLabel && (
        <g>
          <line x1={x(peakIdx)} x2={x(peakIdx)} y1={y(pts[peakIdx].value) - 8} y2={T - 8} stroke="var(--chart-in)" strokeWidth={1} strokeDasharray="3 3" />
          <text x={Math.min(W - R, Math.max(L, x(peakIdx)))} y={T - 12} textAnchor={peakIdx > pts.length / 2 ? "end" : "start"} fill="var(--chart-in)" fontSize={11} fontWeight={700}>
            {peakLabel}
          </text>
        </g>
      )}
      {pts.map((p, i) =>
        i % every === 0 || i === pts.length - 1 ? (
          <text key={`x${p.date}`} x={x(i)} y={H - 10} textAnchor={i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"} fill="var(--ink-3)" fontSize={10.5} style={MONO}>
            {dateOf(p.date)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** What each month of the quarter gave, in per cent. */
export function MonthBars({ monthly, label }: { monthly: QuarterNote["monthly"]; label: (k: string) => string }) {
  if (monthly.length === 0) return null;
  const W = 680;
  const H = 200;
  const L = 48;
  const R = 16;
  const T = 22;
  const B = 34;
  const rets = monthly.map((m) => m.ret);
  const lo = Math.min(-0.5, ...rets) * 1.25;
  const hi = Math.max(0.5, ...rets) * 1.25;
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - T - B);
  const slot = (W - L - R) / monthly.length;
  const bw = Math.min(64, slot * 0.5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={monthly.map((m) => `${label(m.label)} ${signed(m.ret, 1)}`).join(", ")} style={{ width: "100%", height: "auto", display: "block" }}>
      {ticks(lo, hi, 5).map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1e-9 ? "var(--line-2)" : "var(--line)"} strokeWidth={1} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fill="var(--ink-3)" fontSize={11} style={MONO}>
            {fmtPct(v, 0)}
          </text>
        </g>
      ))}
      {monthly.map((m, i) => {
        const cx = L + slot * i + slot / 2;
        const top = m.ret >= 0 ? y(m.ret) : y(0);
        const h = Math.max(2, Math.abs(y(m.ret) - y(0)));
        return (
          <g key={m.label}>
            <rect x={cx - bw / 2} y={top} width={bw} height={h} rx={4} fill={m.ret > 0 ? "var(--good)" : m.ret < 0 ? "var(--warn)" : "var(--line-2)"} />
            <text x={cx} y={m.ret >= 0 ? top - 6 : top + h + 13} textAnchor="middle" fill="var(--ink-2)" fontSize={11} fontWeight={700} style={MONO}>
              {signed(m.ret, 1)}
            </text>
            <text x={cx} y={H - 10} textAnchor="middle" fill="var(--ink-3)" fontSize={11} style={MONO}>
              {label(m.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Each company twice: its weight on the whole capital, then on the quoted float. */
export function WeightBars({ lines, totalLabel, floatLabel }: { lines: QuarterLine[]; totalLabel: string; floatLabel: string }) {
  if (lines.length === 0) return null;
  const W = 680;
  const L = 78;
  const R = 74;
  const T = 26;
  const rowH = 30;
  const H = T + rowH * lines.length + 26;
  const max = Math.max(10, ...lines.map((l) => Math.max(l.weight, l.weightFloat)));
  const top = Math.ceil(max / 20) * 20;
  const x = (v: number) => L + (v / top) * (W - L - R);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={lines.map((l) => `${l.mnemo} ${fmtPct(l.weight, 1)} / ${fmtPct(l.weightFloat, 1)}`).join(", ")} style={{ width: "100%", height: "auto", display: "block" }}>
      <g>
        <rect x={L} y={6} width={10} height={10} rx={2} fill="var(--chart-out)" />
        <text x={L + 16} y={15} fill="var(--ink-2)" fontSize={11}>
          {totalLabel}
        </text>
        <rect x={L + 22 + totalLabel.length * 6} y={6} width={10} height={10} rx={2} fill="var(--chart-in)" />
        <text x={L + 38 + totalLabel.length * 6} y={15} fill="var(--ink-2)" fontSize={11}>
          {floatLabel}
        </text>
      </g>
      {ticks(0, top, 4).map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={T} y2={H - 24} stroke="var(--line)" strokeWidth={1} />
          <text x={x(v)} y={H - 8} textAnchor="middle" fill="var(--ink-3)" fontSize={10.5} style={MONO}>
            {fmtPct(v, 0)}
          </text>
        </g>
      ))}
      {lines.map((l, i) => {
        const yTop = T + rowH * i + 3;
        const barH = rowH / 2 - 3;
        return (
          <g key={l.mnemo}>
            <text x={L - 10} y={yTop + rowH / 2 - 1} textAnchor="end" fill="var(--ink)" fontSize={11.5} fontWeight={700} style={MONO}>
              {l.mnemo}
            </text>
            <rect x={L} y={yTop} width={Math.max(2, x(l.weight) - L)} height={barH} rx={2} fill="var(--chart-out)" />
            <rect x={L} y={yTop + barH + 2} width={Math.max(2, x(l.weightFloat) - L)} height={barH} rx={2} fill="var(--chart-in)" />
            <text x={Math.max(x(l.weight), x(l.weightFloat)) + 7} y={yTop + rowH / 2 + 2} fill="var(--ink-2)" fontSize={10.5} style={MONO}>
              {fmtPct(l.weight, 1)} / {fmtPct(l.weightFloat, 1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** What each company brought to the quarter, in index points. */
export function ContribBars({ lines, unit }: { lines: QuarterLine[]; unit: string }) {
  const data = [...lines].sort((a, b) => b.points - a.points).filter((l) => Math.abs(l.points) > 0.001);
  if (data.length === 0) return null;
  const W = 680;
  const H = 210;
  const L = 48;
  const R = 16;
  const T = 20;
  const B = 32;
  const vals = data.map((l) => l.points);
  const lo = Math.min(-0.2, ...vals) * 1.3;
  const hi = Math.max(0.2, ...vals) * 1.3;
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - T - B);
  const slot = (W - L - R) / data.length;
  const bw = Math.min(56, slot * 0.56);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={data.map((l) => `${l.mnemo} ${dec(l.points, 2)}`).join(", ")} style={{ width: "100%", height: "auto", display: "block" }}>
      {ticks(lo, hi, 5).map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1e-9 ? "var(--line-2)" : "var(--line)"} strokeWidth={1} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fill="var(--ink-3)" fontSize={11} style={MONO}>
            {dec(v, 1)}
          </text>
        </g>
      ))}
      <text x={L - 8} y={T - 6} textAnchor="end" fill="var(--ink-3)" fontSize={10}>
        {unit}
      </text>
      {data.map((l, i) => {
        const cx = L + slot * i + slot / 2;
        const top = l.points >= 0 ? y(l.points) : y(0);
        const h = Math.max(2, Math.abs(y(l.points) - y(0)));
        return (
          <g key={l.mnemo}>
            <rect x={cx - bw / 2} y={top} width={bw} height={h} rx={4} fill={l.points > 0 ? "var(--chart-out)" : "var(--warn)"} />
            <text x={cx} y={l.points >= 0 ? top - 6 : top + h + 13} textAnchor="middle" fill="var(--ink-2)" fontSize={10.5} fontWeight={700} style={MONO}>
              {l.points > 0 ? "+" : ""}
              {dec(l.points, 2)}
            </text>
            <text x={cx} y={H - 10} textAnchor="middle" fill="var(--ink-3)" fontSize={10.5} style={MONO}>
              {l.mnemo}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
