import { fmt, fmtPct, fmtScaled, pickScale } from "@/lib/format";
import { GRAPHE_CAR, GRAPHE_H, GRAPHE_L } from "@/lib/ui/graphe";
import type { ComparaisonBase100 } from "@/lib/market/index-series";
import type { QuarterLine, QuarterNote } from "@/lib/market/index-quarter";

/**
 * The drawings of the quarterly note, all drawn in the 320-unit box of the house (GRAPHE_L): one unit is about one pixel at 390 px, and the text reads the
 * `--graphe-texte` token, never a size of its own. Every drawing has its axes written: a unit title on the vertical axis, ticks with their values, dates with their year.
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


/** The text of a drawing: one token, so it reads at the size of the rest of the house. */
const TXT = { fontSize: "var(--graphe-texte)" } as const;
const TXT_V = { fontSize: "var(--graphe-valeur)" } as const;
const SVG_STYLE = { width: "100%", maxWidth: "var(--graphe-max)", height: "auto", display: "block" } as const;
/** Three date marks at most (first, middle, last): « 12 juil. 2026 » is about 75 units wide, so three never touch on 320. */
const reperes = (n: number): number[] => (n <= 1 ? [0] : n === 2 ? [0, 1] : [0, Math.floor((n - 1) / 2), n - 1]);
const ancre = (i: number, n: number): "start" | "middle" | "end" => (i === 0 ? "start" : i === n - 1 ? "end" : "middle");

/** The vertical axis of a panel: grid lines, ticks with their values and, above, the unit it is read in. */
function AxeY({ vals, y, top, L, W, R, unit, format }: { vals: number[]; y: (v: number) => number; top: number; L: number; W: number; R: number; unit: string; format: (v: number) => string }) {
  return (
    <g>
      {vals.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1e-9 ? "var(--line-2)" : "var(--line)"} strokeWidth={1} />
          <text x={L - 5} y={y(v) + 3.5} textAnchor="end" fill="var(--ink-3)" style={{ ...TXT, ...MONO }}>
            {format(v)}
          </text>
        </g>
      ))}
      <text x={2} y={top - 8} fill="var(--ink-2)" style={TXT}>
        {unit}
      </text>
    </g>
  );
}

/** The horizontal date axis: three marks with their year, and a rule under the plot. */
function AxeDates({ dates, x, y, dateOf }: { dates: string[]; x: (i: number) => number; y: number; dateOf: (d: string) => string }) {
  return (
    <g>
      {reperes(dates.length).map((i) => (
        <g key={dates[i]}>
          <line x1={x(i)} x2={x(i)} y1={y} y2={y + 3} stroke="var(--ink-3)" strokeWidth={1} />
          <text x={x(i)} y={y + 14} textAnchor={ancre(i, dates.length)} fill="var(--ink-3)" style={{ ...TXT, ...MONO }}>
            {dateOf(dates[i])}
          </text>
        </g>
      ))}
    </g>
  );
}

export interface CurveLabels {
  niveau: string;
  montant: string;
  transactions: string;
  /** « M FCFA », « Md FCFA » : filled by the caller from pickScale. */
  montantUnite: (u: string) => string;
}

/** Round ticks from 0 up to a top that covers `max`: a bar never goes past the top of its panel. */
function ticksTo(max: number, want = 2): { vals: number[]; top: number } {
  const raw = Math.max(max, 1e-9) / want;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const top = Math.ceil(max / step - 1e-9) * step;
  const vals: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) vals.push(Number(v.toFixed(6)));
  return { vals, top };
}

/** The index across the quarter's sessions, with what traded under it: amount and number of transactions, on the same dates. */
export function IndexCurve({ note, dateOf, labels }: { note: QuarterNote; dateOf: (d: string) => string; labels: CurveLabels }) {
  const pts = note.points;
  const act = note.activity;
  if (pts.length < 2) return null;
  const W = GRAPHE_L;
  const L = 44;
  const R = 8;
  const n = pts.length;
  const x = (i: number) => L + (i / (n - 1)) * (W - L - R);
  // panel 1 : the level
  const T1 = 24;
  const H1 = 112;
  const vals = pts.map((p) => p.value);
  const lo = Math.min(...vals, note.levelBefore) * 0.995;
  const hi = Math.max(...vals, note.levelBefore) * 1.005;
  const tk = ticks(lo, hi, 4);
  const y1 = (v: number) => T1 + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * H1;
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y1(p.value).toFixed(1)}`).join(" ");
  const peakIdx = note.peak ? pts.findIndex((p) => p.date === note.peak?.date) : -1;
  // panel 2 : the amount traded
  const T2 = T1 + H1 + 32;
  const H2 = 46;
  const sc = pickScale(act.map((a) => a.amount));
  const maxA = Math.max(1, ...act.map((a) => a.amount));
  const { vals: tkA, top: topA } = ticksTo(maxA, 2);
  const y2 = (v: number) => T2 + (1 - v / topA) * H2;
  // panel 3 : the number of transactions
  const T3 = T2 + H2 + 32;
  const H3 = 46;
  const maxT = Math.max(1, ...act.map((a) => a.trades));
  const { vals: tkT, top: topT } = ticksTo(Math.max(2, maxT), 2);
  const y3 = (v: number) => T3 + (1 - v / topT) * H3;
  const bw = Math.max(1.2, Math.min(5, ((W - L - R) / n) * 0.7));
  const Hsvg = T3 + H3 + 26;
  const dates = pts.map((p) => p.date);

  return (
    <svg viewBox={`0 0 ${W} ${Hsvg}`} role="img" aria-label={`${fmt(pts[0].value)} → ${fmt(pts[n - 1].value)}`} style={SVG_STYLE}>
      <AxeY vals={tk} y={y1} top={T1} L={L} W={W} R={R} unit={labels.niveau} format={fmt} />
      <polygon points={`${x(0)},${y1(lo)} ${line} ${x(n - 1)},${y1(lo)}`} fill="var(--chart-out)" fillOpacity={0.07} />
      <polyline points={line} fill="none" stroke="var(--chart-out)" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (p.variationPct !== 0 ? <circle key={p.date} cx={x(i)} cy={y1(p.value)} r={2.2} fill={p.variationPct > 0 ? "var(--good)" : "var(--warn)"} /> : null))}
      {peakIdx >= 0 && (
        <line x1={x(peakIdx)} x2={x(peakIdx)} y1={y1(pts[peakIdx].value) - 4} y2={T1} stroke="var(--chart-in)" strokeWidth={1} strokeDasharray="3 3" />
      )}
      <AxeY vals={tkA} y={y2} top={T2} L={L} W={W} R={R} unit={labels.montantUnite(sc.short)} format={(v) => fmtScaled(v, sc.div, sc.div === 1 || Number.isInteger(v / sc.div) ? 0 : 1)} />
      {act.map((a, i) => (a.amount > 0 ? <rect key={a.date} x={x(i) - bw / 2} y={y2(a.amount)} width={bw} height={Math.max(1, y2(0) - y2(a.amount))} fill="var(--chart-in)" /> : null))}
      <AxeY vals={tkT} y={y3} top={T3} L={L} W={W} R={R} unit={labels.transactions} format={(v) => fmt(v)} />
      {act.map((a, i) => (a.trades > 0 ? <rect key={a.date} x={x(i) - bw / 2} y={y3(a.trades)} width={bw} height={Math.max(1, y3(0) - y3(a.trades))} fill="var(--chart-out)" fillOpacity={0.75} /> : null))}
      <AxeDates dates={dates} x={x} y={T3 + H3} dateOf={dateOf} />
    </svg>
  );
}

/** The listed capitalisation (the seven companies together) session by session, in the unit that reads it. */
export function CapChart({ activity, dateOf, unit }: { activity: QuarterNote["activity"]; dateOf: (d: string) => string; unit: (u: string) => string }) {
  const act = activity.filter((a) => a.cap > 0);
  if (act.length < 2) return null;
  const W = GRAPHE_L;
  const H = GRAPHE_H;
  const L = 44;
  const R = 8;
  const T = 24;
  const B = 32;
  const n = act.length;
  const sc = pickScale(act.map((a) => a.cap));
  const lo0 = Math.min(...act.map((a) => a.cap));
  const hi0 = Math.max(...act.map((a) => a.cap));
  const pad = Math.max((hi0 - lo0) * 0.2, hi0 * 0.002);
  const lo = lo0 - pad;
  const hi = hi0 + pad;
  const tk = ticks(lo, hi, 4);
  const x = (i: number) => L + (i / (n - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - T - B);
  const line = act.map((a, i) => `${x(i).toFixed(1)},${y(a.cap).toFixed(1)}`).join(" ");
  const dec1 = sc.div === 1 ? 0 : tk.length > 1 && (tk[1] - tk[0]) / sc.div < 1 ? 2 : 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${fmtScaled(act[0].cap, sc.div, 1)} → ${fmtScaled(act[n - 1].cap, sc.div, 1)} ${sc.short}`} style={SVG_STYLE}>
      <AxeY vals={tk} y={y} top={T} L={L} W={W} R={R} unit={unit(sc.short)} format={(v) => fmtScaled(v, sc.div, dec1)} />
      <polygon points={`${x(0)},${H - B} ${line} ${x(n - 1)},${H - B}`} fill="var(--chart-out)" fillOpacity={0.07} />
      <polyline points={line} fill="none" stroke="var(--chart-out)" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <AxeDates dates={act.map((a) => a.date)} x={x} y={H - B} dateOf={dateOf} />
    </svg>
  );
}

/** What each month of the quarter gave, in per cent. */
export function MonthBars({ monthly, label, unit }: { monthly: QuarterNote["monthly"]; label: (k: string) => string; unit: string }) {
  if (monthly.length === 0) return null;
  const W = GRAPHE_L;
  const H = 170;
  const L = 44;
  const R = 8;
  const T = 26;
  const B = 24;
  const rets = monthly.map((m) => m.ret);
  const lo = Math.min(-0.5, ...rets) * 1.25;
  const hi = Math.max(0.5, ...rets) * 1.25;
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - T - B);
  const slot = (W - L - R) / monthly.length;
  const bw = Math.min(48, slot * 0.5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={monthly.map((m) => `${label(m.label)} ${signed(m.ret, 1)}`).join(", ")} style={SVG_STYLE}>
      <AxeY vals={ticks(lo, hi, 4)} y={y} top={T} L={L} W={W} R={R} unit={unit} format={(v) => fmtPct(v, 0)} />
      {monthly.map((m, i) => {
        const cx = L + slot * i + slot / 2;
        const top = m.ret >= 0 ? y(m.ret) : y(0);
        const h = Math.max(2, Math.abs(y(m.ret) - y(0)));
        return (
          <g key={m.label}>
            <rect x={cx - bw / 2} y={top} width={bw} height={h} rx={3} fill={m.ret > 0 ? "var(--good)" : m.ret < 0 ? "var(--warn)" : "var(--line-2)"} />
            <text x={cx} y={m.ret >= 0 ? top - 4 : top + h + 11} textAnchor="middle" fill="var(--ink-2)" fontWeight={700} style={{ ...TXT_V, ...MONO }}>
              {signed(m.ret, 1)}
            </text>
            <text x={cx} y={H - 8} textAnchor="middle" fill="var(--ink-3)" style={{ ...TXT, ...MONO }}>
              {label(m.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Each company twice: its weight on the whole capital, then on the quoted float. */
export function WeightBars({ lines, totalLabel, floatLabel, unit }: { lines: QuarterLine[]; totalLabel: string; floatLabel: string; unit: string }) {
  if (lines.length === 0) return null;
  const W = GRAPHE_L;
  const L = 40;
  const R = 84;
  const T = 44;
  const rowH = 24;
  const H = T + rowH * lines.length + 26;
  const max = Math.max(10, ...lines.map((l) => Math.max(l.weight, l.weightFloat)));
  const top = Math.ceil(max / 20) * 20;
  const x = (v: number) => L + (v / top) * (W - L - R);
  const s2 = L + 14 + totalLabel.length * GRAPHE_CAR + 12;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={lines.map((l) => `${l.mnemo} ${fmtPct(l.weight, 1)} / ${fmtPct(l.weightFloat, 1)}`).join(", ")} style={SVG_STYLE}>
      <text x={2} y={10} fill="var(--ink-2)" style={TXT}>
        {unit}
      </text>
      <rect x={L} y={18} width={9} height={9} rx={2} fill="var(--chart-out)" />
      <text x={L + 13} y={26} fill="var(--ink-2)" style={TXT}>
        {totalLabel}
      </text>
      <rect x={s2} y={18} width={9} height={9} rx={2} fill="var(--chart-in)" />
      <text x={s2 + 13} y={26} fill="var(--ink-2)" style={TXT}>
        {floatLabel}
      </text>
      {ticks(0, top, 4).map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={T} y2={H - 22} stroke="var(--line)" strokeWidth={1} />
          <text x={x(v)} y={H - 8} textAnchor="middle" fill="var(--ink-3)" style={{ ...TXT, ...MONO }}>
            {fmtPct(v, 0)}
          </text>
        </g>
      ))}
      {lines.map((l, i) => {
        const yTop = T + rowH * i + 2;
        const barH = rowH / 2 - 3;
        return (
          <g key={l.mnemo}>
            <text x={L - 6} y={yTop + rowH / 2} textAnchor="end" fill="var(--ink)" fontWeight={700} style={{ ...TXT, ...MONO }}>
              {l.mnemo}
            </text>
            <rect x={L} y={yTop} width={Math.max(2, x(l.weight) - L)} height={barH} rx={2} fill="var(--chart-out)" />
            <rect x={L} y={yTop + barH + 2} width={Math.max(2, x(l.weightFloat) - L)} height={barH} rx={2} fill="var(--chart-in)" />
            <text x={Math.max(x(l.weight), x(l.weightFloat)) + 5} y={yTop + rowH / 2 + 1} fill="var(--ink-2)" style={{ ...TXT_V, ...MONO }}>
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
  const W = GRAPHE_L;
  const H = 180;
  const L = 44;
  const R = 8;
  const T = 26;
  const B = 24;
  const vals = data.map((l) => l.points);
  const lo = Math.min(-0.2, ...vals) * 1.3;
  const hi = Math.max(0.2, ...vals) * 1.3;
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - T - B);
  const slot = (W - L - R) / data.length;
  const bw = Math.min(34, slot * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={data.map((l) => `${l.mnemo} ${dec(l.points, 2)}`).join(", ")} style={SVG_STYLE}>
      <AxeY vals={ticks(lo, hi, 4)} y={y} top={T} L={L} W={W} R={R} unit={unit} format={(v) => dec(v, 1)} />
      {data.map((l, i) => {
        const cx = L + slot * i + slot / 2;
        const top = l.points >= 0 ? y(l.points) : y(0);
        const h = Math.max(2, Math.abs(y(l.points) - y(0)));
        return (
          <g key={l.mnemo}>
            <rect x={cx - bw / 2} y={top} width={bw} height={h} rx={3} fill={l.points > 0 ? "var(--chart-out)" : "var(--warn)"} />
            <text x={cx} y={l.points >= 0 ? top - 4 : top + h + 11} textAnchor="middle" fill="var(--ink-2)" fontWeight={700} style={{ ...TXT_V, ...MONO }}>
              {l.points > 0 ? "+" : ""}
              {dec(l.points, 2)}
            </text>
            <text x={cx} y={H - 8} textAnchor="middle" fill="var(--ink-3)" style={{ ...TXT, ...MONO }}>
              {l.mnemo}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Les graphes ajoutés le 7 novembre 2026 (planche « Notes de marché », 1B et 3B) ─────────────────────────────────────────────────────────────────────────────── */

const SENS = (v: number) => (v > 0 ? "var(--good)" : v < 0 ? "var(--crit)" : "var(--ink-3)");

/** La mini-courbe d'une société sur la période : pleine, teintée par le sens de sa variation, sans axe. */
export function MiniCourbe({ serie, sens, width = 78, height = 28 }: { serie: number[]; sens: number; width?: number; height?: number }) {
  if (serie.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const lo = Math.min(...serie);
  const hi = Math.max(...serie);
  const y = (v: number) => height - 3 - ((v - lo) / Math.max(1e-9, hi - lo)) * (height - 6);
  const pts = serie.map((v, i) => `${((i / (serie.length - 1)) * width).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const c = SENS(sens);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ display: "block" }}>
      {hi - lo < 1e-9 ? <line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke={c} strokeWidth={1.6} strokeDasharray="3 3" /> : <polyline points={pts} fill="none" stroke={c} strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round" />}
    </svg>
  );
}

/** L'indice, la société qui le porte et le reste de la cote, tous à 100 au début de la période : le fait central de la note, dessiné. */
export function Comparaison({ compare, labels, dateOf }: { compare: ComparaisonBase100; labels: { indice: string; reste: string; base: string }; dateOf: (d: string) => string }) {
  const { dates, indice, principale, reste } = compare;
  if (dates.length < 2) return null;
  const W = GRAPHE_L;
  const L = 44;
  const R = 8;
  const T = 24;
  const PLOT = 120;
  const tous = [...indice, ...principale.serie, ...reste, 100];
  const lo = Math.min(...tous) - 0.5;
  const hi = Math.max(...tous) + 0.5;
  const x = (i: number) => L + (i / (dates.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * PLOT;
  const ligne = (s: number[]) => s.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const SERIES: { cle: string; s: number[]; couleur: string; epais: number; nom: string }[] = [
    { cle: "idx", s: indice, couleur: "var(--chart-out)", epais: 2, nom: labels.indice },
    { cle: "p", s: principale.serie, couleur: "var(--chart-in)", epais: 1.4, nom: principale.name },
    { cle: "r", s: reste, couleur: "var(--good)", epais: 1.4, nom: labels.reste },
  ];
  const base = T + PLOT;
  const H = base + 20 + SERIES.length * 14 + 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={labels.base} style={SVG_STYLE}>
      <AxeY vals={ticks(lo, hi, 4)} y={y} top={T} L={L} W={W} R={R} unit={labels.base} format={(v) => dec(v, v % 1 ? 1 : 0)} />
      {SERIES.map((l) => (
        <polyline key={l.cle} points={ligne(l.s)} fill="none" stroke={l.couleur} strokeWidth={l.epais} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      <AxeDates dates={dates} x={x} y={base} dateOf={dateOf} />
      {SERIES.map((l, k) => (
        <g key={`l${l.cle}`} transform={`translate(${L}, ${base + 30 + k * 14})`}>
          <line x1={0} x2={16} y1={-3.5} y2={-3.5} stroke={l.couleur} strokeWidth={l.epais} />
          <text x={22} y={0} fill="var(--ink-2)" style={TXT}>
            {l.nom} {signed(l.s[l.s.length - 1] - 100, 1)}
          </text>
        </g>
      ))}
    </svg>
  );
}
