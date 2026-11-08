import { Line, Polygon, Polyline, Rect, Svg, Text as SvgText, View } from "@react-pdf/renderer";
import { fmtDate, fmtScaled, pickScale } from "@/lib/format";
import type { ComparaisonBase100 } from "@/lib/market/index-series";
import { Text, s } from "./primitives";

/**
 * LES GRAPHES ET LES COULEURS DES NOTES EN PDF (7 novembre 2026, planche « Notes de marché », 6A).
 * Les mêmes dessins que la page, aux couleurs du papier : vert pour la hausse, rouge pour la baisse, gris pour le calme, et le signe toujours écrit à côté du chiffre
 * (une impression en noir et blanc se lit encore).
 */
export const TON = { up: "#17803D", down: "#C2342A", flat: "#6B7688" };
export const NAVY = "#0B2545";
export const OR = "#B07F15";
const LIGNE = "#D7DDE7";
const GRIS = "#6B7688";

export const tonDe = (v: number): string => (v > 0 ? TON.up : v < 0 ? TON.down : TON.flat);
/** Une variation écrite, avec sa couleur : un texte que `Table` sait peindre. */
export type Teinte = { t: string; ton: string };
export const teinte = (t: string, v: number): Teinte => ({ t, ton: tonDe(Number(v.toFixed(2))) });

const MINMAX = (xs: number[]) => [Math.min(...xs), Math.max(...xs)] as const;

/** La mini-courbe d'une société sur la période. */
export function Mini({ serie, sens, width = 54, height = 16 }: { serie: number[]; sens: number; width?: number; height?: number }) {
  if (serie.length < 2) return <View style={{ width, height }} />;
  const [lo, hi] = MINMAX(serie);
  const y = (v: number) => height - 2 - ((v - lo) / Math.max(1e-9, hi - lo)) * (height - 4);
  const pts = serie.map((v, i) => `${((i / (serie.length - 1)) * width).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const c = tonDe(sens);
  return (
    <Svg viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
      {hi - lo < 1e-9 ? <Line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke={c} strokeWidth={1} /> : <Polyline points={pts} fill="none" stroke={c} strokeWidth={1.1} />}
    </Svg>
  );
}

/* ─── Les axes du papier (8 novembre 2026) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Un dessin du papier est tracé à sa taille réelle (515 unités = 515 pt) : le texte d'un axe s'écrit à 8 pt, jamais en dessous. Chaque dessin a son axe vertical gradué avec son
   unité écrite au-dessus, et son axe des dates avec l'année. */
const TXT = 8;
/** Helvetica n'a ni l'espace fine insécable ni l'espace insécable : un nombre écrit par `toLocaleString` y devient « 1/010 ». */
const esp = (s: string): string => s.replace(/[\u202f\u00a0]/g, " ");
const GRIS_FONCE = "#44505F";

/** Des graduations rondes entre `lo` et `hi`, quatre au plus. */
function graduations(lo: number, hi: number, want = 4): number[] {
  const span = hi - lo;
  if (span <= 0) return [lo];
  const raw = span / want;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

/** Des graduations de 0 à un sommet qui couvre `max` : une barre ne dépasse jamais le haut de son panneau. */
function graduationsJusqua(max: number, want = 2): { vals: number[]; top: number } {
  const raw = Math.max(max, 1e-9) / want;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw) ?? mag * 10;
  const top = Math.ceil(max / step - 1e-9) * step;
  const vals: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) vals.push(Number(v.toFixed(6)));
  return { vals, top };
}

const repereDates = (n: number): number[] => (n <= 1 ? [0] : n === 2 ? [0, 1] : [0, Math.floor((n - 1) / 2), n - 1]);

/** L'axe vertical d'un panneau : traits, valeurs, et l'unité écrite au-dessus. */
function AxeVertical({ vals, y, top, L, W, R, unit, format }: { vals: number[]; y: (v: number) => number; top: number; L: number; W: number; R: number; unit: string; format: (v: number) => string }) {
  return (
    <View>
      {vals.map((v) => (
        <View key={v}>
          <Line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={LIGNE} strokeWidth={0.6} />
          <SvgText x={L - 4} y={y(v) + 2.8} style={{ fontSize: TXT, fill: GRIS_FONCE }} textAnchor="end">
            {format(v)}
          </SvgText>
        </View>
      ))}
      <SvgText x={0} y={top - 6} style={{ fontSize: TXT, fill: NAVY, fontFamily: "Helvetica-Bold" }}>
        {unit}
      </SvgText>
    </View>
  );
}

/** L'axe des dates : trois repères avec leur année, un trait de repère sous le dessin. */
function AxeDatesPdf({ dates, x, y }: { dates: string[]; x: (i: number) => number; y: number }) {
  return (
    <View>
      {repereDates(dates.length).map((i) => (
        <View key={dates[i]}>
          <Line x1={x(i)} x2={x(i)} y1={y} y2={y + 3} stroke={GRIS} strokeWidth={0.6} />
          <SvgText x={x(i)} y={y + 12} style={{ fontSize: TXT, fill: GRIS_FONCE }} textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"}>
            {esp(fmtDate(dates[i]))}
          </SvgText>
        </View>
      ))}
    </View>
  );
}

export type SeancePdf = { date: string; value: number; amount: number; trades: number; cap: number };

/** Le niveau de l'indice, et dessous, sur les mêmes dates : le montant échangé et le nombre de transactions de chaque séance. */
export function CourbeActivite({ seances, sens, width = 515 }: { seances: SeancePdf[]; sens: number; width?: number }) {
  const n = seances.length;
  if (n < 2) return null;
  const W = width;
  const L = 44;
  const R = 6;
  const x = (i: number) => L + (i / (n - 1)) * (W - L - R);
  const vals = seances.map((p) => p.value);
  const lo0 = Math.min(...vals);
  const hi0 = Math.max(...vals);
  const pad = Math.max(0.5, (hi0 - lo0) * 0.15);
  const lo = lo0 - pad;
  const hi = hi0 + pad;
  const T1 = 18;
  const H1 = 92;
  const y1 = (v: number) => T1 + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * H1;
  const tk = graduations(lo, hi, 4);
  const ligne = seances.map((p, i) => `${x(i).toFixed(1)},${y1(p.value).toFixed(1)}`).join(" ");
  const c = tonDe(sens);
  const sc = pickScale(seances.map((a) => a.amount));
  const maxA = Math.max(1, ...seances.map((a) => a.amount));
  const { vals: tkA, top: topA } = graduationsJusqua(maxA, 2);
  const T2 = T1 + H1 + 26;
  const H2 = 38;
  const y2 = (v: number) => T2 + (1 - v / topA) * H2;
  const maxT = Math.max(1, ...seances.map((a) => a.trades));
  const { vals: tkT, top: topT } = graduationsJusqua(Math.max(2, maxT), 2);
  const T3 = T2 + H2 + 26;
  const H3 = 38;
  const y3 = (v: number) => T3 + (1 - v / topT) * H3;
  const bw = Math.max(1, Math.min(4, ((W - L - R) / n) * 0.7));
  const Htot = T3 + H3 + 20;
  const dates = seances.map((p) => p.date);
  return (
    <Svg viewBox={`0 0 ${W} ${Htot}`} style={{ width: "100%", height: Htot }}>
      <AxeVertical vals={tk} y={y1} top={T1} L={L} W={W} R={R} unit="Niveau de l'indice (points)" format={(v) => esp(Math.round(v).toLocaleString("fr-FR"))} />
      <Polygon points={`${L},${y1(lo)} ${ligne} ${W - R},${y1(lo)}`} fill={c} fillOpacity={0.08} />
      <Polyline points={ligne} fill="none" stroke={c} strokeWidth={1.5} />
      <AxeVertical vals={tkA} y={y2} top={T2} L={L} W={W} R={R} unit={`Montant échangé (${sc.short})`} format={(v) => esp(fmtScaled(v, sc.div, sc.div === 1 || Number.isInteger(v / sc.div) ? 0 : 1))} />
      {seances.map((a, i) => (a.amount > 0 ? <Rect key={a.date} x={x(i) - bw / 2} y={y2(a.amount)} width={bw} height={Math.max(0.8, y2(0) - y2(a.amount))} fill={OR} /> : null))}
      <AxeVertical vals={tkT} y={y3} top={T3} L={L} W={W} R={R} unit="Transactions par séance" format={(v) => String(Math.round(v))} />
      {seances.map((a, i) => (a.trades > 0 ? <Rect key={a.date} x={x(i) - bw / 2} y={y3(a.trades)} width={bw} height={Math.max(0.8, y3(0) - y3(a.trades))} fill={NAVY} /> : null))}
      <AxeDatesPdf dates={dates} x={x} y={T3 + H3} />
    </Svg>
  );
}

/** La capitalisation de la cote (les sept sociétés) séance par séance, dans l'unité qui la lit. */
export function CourbeCapitalisation({ seances, width = 515, height = 130 }: { seances: SeancePdf[]; width?: number; height?: number }) {
  const act = seances.filter((a) => a.cap > 0);
  const n = act.length;
  if (n < 2) return null;
  const W = width;
  const L = 44;
  const R = 6;
  const T = 16;
  const B = 22;
  const sc = pickScale(act.map((a) => a.cap));
  const lo0 = Math.min(...act.map((a) => a.cap));
  const hi0 = Math.max(...act.map((a) => a.cap));
  const pad = Math.max((hi0 - lo0) * 0.2, hi0 * 0.002);
  const lo = lo0 - pad;
  const hi = hi0 + pad;
  const tk = graduations(lo, hi, 4);
  const dec = sc.div === 1 ? 0 : tk.length > 1 && (tk[1] - tk[0]) / sc.div < 1 ? 2 : 1;
  const x = (i: number) => L + (i / (n - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (height - T - B);
  const ligne = act.map((a, i) => `${x(i).toFixed(1)},${y(a.cap).toFixed(1)}`).join(" ");
  return (
    <Svg viewBox={`0 0 ${W} ${height}`} style={{ width: "100%", height }}>
      <AxeVertical vals={tk} y={y} top={T} L={L} W={W} R={R} unit={`Capitalisation (${sc.short})`} format={(v) => esp(fmtScaled(v, sc.div, dec))} />
      <Polygon points={`${L},${height - B} ${ligne} ${W - R},${height - B}`} fill={NAVY} fillOpacity={0.07} />
      <Polyline points={ligne} fill="none" stroke={NAVY} strokeWidth={1.5} />
      <AxeDatesPdf dates={act.map((a) => a.date)} x={x} y={height - B} />
    </Svg>
  );
}

/** Le poids de chaque société, sur le capital global puis sur le flottant coté : axe gradué en %, valeurs écrites. */
export function PoidsBarres({ lignes, width = 515 }: { lignes: { mnemo: string; weight: number; weightFloat: number }[]; width?: number }) {
  if (lignes.length === 0) return null;
  const W = width;
  const L = 44;
  const R = 92;
  const T = 30;
  const rowH = 20;
  const H = T + rowH * lignes.length + 22;
  const max = Math.max(10, ...lignes.map((l) => Math.max(l.weight, l.weightFloat)));
  const top = Math.ceil(max / 20) * 20;
  const x = (v: number) => L + (v / top) * (W - L - R);
  const pct = (v: number) => esp(`${v.toLocaleString("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`);
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      <SvgText x={0} y={8} style={{ fontSize: TXT, fill: NAVY, fontFamily: "Helvetica-Bold" }}>
        Part de la cote (%)
      </SvgText>
      <Rect x={L} y={14} width={8} height={8} fill={NAVY} />
      <SvgText x={L + 12} y={21} style={{ fontSize: TXT, fill: GRIS_FONCE }}>
        capital global
      </SvgText>
      <Rect x={L + 90} y={14} width={8} height={8} fill={OR} />
      <SvgText x={L + 102} y={21} style={{ fontSize: TXT, fill: GRIS_FONCE }}>
        flottant coté
      </SvgText>
      {graduations(0, top, 4).map((v) => (
        <View key={v}>
          <Line x1={x(v)} x2={x(v)} y1={T} y2={H - 18} stroke={LIGNE} strokeWidth={0.6} />
          <SvgText x={x(v)} y={H - 6} style={{ fontSize: TXT, fill: GRIS_FONCE }} textAnchor="middle">
            {`${v} %`}
          </SvgText>
        </View>
      ))}
      {lignes.map((l, i) => {
        const yTop = T + rowH * i + 2;
        return (
          <View key={l.mnemo}>
            <SvgText x={L - 5} y={yTop + 9} style={{ fontSize: TXT, fill: NAVY, fontFamily: "Helvetica-Bold" }} textAnchor="end">
              {l.mnemo}
            </SvgText>
            <Rect x={L} y={yTop} width={Math.max(1, x(l.weight) - L)} height={7} fill={NAVY} />
            <Rect x={L} y={yTop + 8.5} width={Math.max(1, x(l.weightFloat) - L)} height={7} fill={OR} />
            <SvgText x={Math.max(x(l.weight), x(l.weightFloat)) + 4} y={yTop + 11} style={{ fontSize: TXT, fill: GRIS_FONCE }}>
              {`${pct(l.weight)} / ${pct(l.weightFloat)}`}
            </SvgText>
          </View>
        );
      })}
    </Svg>
  );
}

/** L'indice, la société la plus lourde et le reste de la cote, à 100 au début de la période. */
export function CompareBase100({ compare, labels, width = 515, height = 160 }: { compare: ComparaisonBase100; labels: { indice: string; reste: string }; width?: number; height?: number }) {
  const { dates, indice, principale, reste } = compare;
  if (dates.length < 2) return null;
  const tous = [...indice, ...principale.serie, ...reste, 100];
  const [lo0, hi0] = MINMAX(tous);
  const lo = lo0 - 0.5;
  const hi = hi0 + 0.5;
  const L = 44;
  const R = 6;
  const T = 22;
  const base = height - 56;
  const x = (i: number) => L + (i / (dates.length - 1)) * (width - L - R);
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (base - T);
  const ligne = (arr: number[]) => arr.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const fin = (arr: number[]) => arr[arr.length - 1] - 100;
  const sg = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1).replace(".", ",")} %`;
  const SERIES = [
    { s: indice, c: NAVY, w: 1.8, nom: labels.indice },
    { s: principale.serie, c: OR, w: 1.2, nom: principale.name },
    { s: reste, c: TON.up, w: 1.2, nom: labels.reste },
  ];
  return (
    <Svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }}>
      <AxeVertical vals={graduations(lo, hi, 4)} y={y} top={T} L={L} W={width} R={R} unit="Base 100 au début de la période" format={(v) => esp(v.toLocaleString("fr-FR", { maximumFractionDigits: v % 1 ? 1 : 0 }))} />
      <Line x1={L} x2={width - R} y1={y(100)} y2={y(100)} stroke={GRIS} strokeWidth={0.7} strokeDasharray="3 3" />
      {SERIES.map((l) => (
        <Polyline key={l.nom} points={ligne(l.s)} fill="none" stroke={l.c} strokeWidth={l.w} />
      ))}
      <AxeDatesPdf dates={dates} x={x} y={base} />
      {SERIES.map((l, k) => (
        <View key={`l${l.nom}`}>
          <Line x1={L + k * 170} x2={L + k * 170 + 14} y1={height - 8} y2={height - 8} stroke={l.c} strokeWidth={l.w} />
          <SvgText x={L + k * 170 + 19} y={height - 5} style={{ fontSize: TXT, fill: NAVY }}>
            {l.nom} {sg(fin(l.s))}
          </SvgText>
        </View>
      ))}
    </Svg>
  );
}

/** Les sociétés de la période : nom, poids, variation et contribution colorées, mini-courbe, échangé. */
export function LignesDuMois({ lignes, total, cols }: { lignes: { nom: string; poids: string; move: Teinte; points: Teinte; serie: number[]; sens: number; echange: string; trans: string }[]; total: (string | Teinte)[]; cols: string[] }) {
  const flex = [2, 0.9, 1.3, 1.3, 1, 1.4, 1.1];
  const cell = (v: string | Teinte, j: number, right = true, gras = false) => (
    <Text key={j} style={[s.cell, { flex: flex[j] }, right ? s.r : {}, typeof v === "string" ? {} : { color: v.ton, fontFamily: "Helvetica-Bold" }, gras ? { fontFamily: "Helvetica-Bold" } : {}]}>
      {typeof v === "string" ? v : v.t}
    </Text>
  );
  return (
    <View style={s.table}>
      <View style={[s.tr, s.th]}>
        {cols.map((c, j) => (
          <Text key={j} style={[s.cell, { flex: flex[j] }, j > 0 ? s.r : {}]}>
            {c}
          </Text>
        ))}
      </View>
      {lignes.map((l) => (
        <View key={l.nom} style={[s.tr, { alignItems: "center" }]} wrap={false}>
          {cell(l.nom, 0, false)}
          {cell(l.poids, 1)}
          {cell(l.move, 2)}
          {cell(l.points, 3)}
          <View style={{ flex: flex[4], alignItems: "flex-end" }}>
            <Mini serie={l.serie} sens={l.sens} />
          </View>
          {cell(l.echange, 5)}
          {cell(l.trans, 6)}
        </View>
      ))}
      <View style={[s.tr, s.tot]}>{total.map((v, j) => (j === 4 ? <View key={j} style={{ flex: flex[4] }} /> : cell(v, j, j > 0, true)))}</View>
    </View>
  );
}
