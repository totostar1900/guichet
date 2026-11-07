import { Line, Polygon, Polyline, Svg, Text as SvgText, View } from "@react-pdf/renderer";
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

/** Le niveau de l'indice sur la période, pleine largeur, teinté par le sens de la période. */
export function CourbeNiveau({ points, sens, from, to, width = 515, height = 96 }: { points: { date: string; value: number }[]; sens: number; from: string; to: string; width?: number; height?: number }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.value);
  const [lo0, hi0] = MINMAX(vals);
  const pad = Math.max(0.5, (hi0 - lo0) * 0.15);
  const lo = lo0 - pad;
  const hi = hi0 + pad;
  const L = 34;
  const R = 6;
  const T = 6;
  const B = 16;
  const x = (i: number) => L + (i / (points.length - 1)) * (width - L - R);
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (height - T - B);
  const ligne = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const c = tonDe(sens);
  const milieu = [lo0, (lo0 + hi0) / 2, hi0];
  return (
    <Svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }}>
      {milieu.map((v) => (
        <View key={v}>
          <Line x1={L} x2={width - R} y1={y(v)} y2={y(v)} stroke={LIGNE} strokeWidth={0.6} />
          <SvgText x={L - 4} y={y(v) + 2.5} style={{ fontSize: 6, fill: GRIS }} textAnchor="end">
            {Math.round(v).toLocaleString("fr-FR")}
          </SvgText>
        </View>
      ))}
      <Polygon points={`${L},${height - B} ${ligne} ${width - R},${height - B}`} fill={c} fillOpacity={0.08} />
      <Polyline points={ligne} fill="none" stroke={c} strokeWidth={1.6} />
      <SvgText x={L} y={height - 4} style={{ fontSize: 6.5, fill: GRIS }}>
        {from}
      </SvgText>
      <SvgText x={width - R} y={height - 4} style={{ fontSize: 6.5, fill: GRIS }} textAnchor="end">
        {to}
      </SvgText>
    </Svg>
  );
}

/** L'indice, la société la plus lourde et le reste de la cote, à 100 au début de la période. */
export function CompareBase100({ compare, labels, width = 515, height = 120 }: { compare: ComparaisonBase100; labels: { indice: string; reste: string }; width?: number; height?: number }) {
  const { dates, indice, principale, reste } = compare;
  if (dates.length < 2) return null;
  const tous = [...indice, ...principale.serie, ...reste, 100];
  const [lo0, hi0] = MINMAX(tous);
  const lo = lo0 - 0.5;
  const hi = hi0 + 0.5;
  const L = 34;
  const R = 6;
  const T = 6;
  const B = 28;
  const x = (i: number) => L + (i / (dates.length - 1)) * (width - L - R);
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (height - T - B);
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
      <Line x1={L} x2={width - R} y1={y(100)} y2={y(100)} stroke={GRIS} strokeWidth={0.6} strokeDasharray="3 3" />
      <SvgText x={L - 4} y={y(100) + 2.5} style={{ fontSize: 6, fill: GRIS }} textAnchor="end">
        100
      </SvgText>
      {SERIES.map((l) => (
        <Polyline key={l.nom} points={ligne(l.s)} fill="none" stroke={l.c} strokeWidth={l.w} />
      ))}
      {SERIES.map((l, k) => (
        <View key={`l${l.nom}`}>
          <Line x1={L + k * 165} x2={L + k * 165 + 14} y1={height - 6} y2={height - 6} stroke={l.c} strokeWidth={l.w} />
          <SvgText x={L + k * 165 + 19} y={height - 3.5} style={{ fontSize: 7, fill: NAVY }}>
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
