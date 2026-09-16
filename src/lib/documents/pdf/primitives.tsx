import { Document, Page, StyleSheet, Text as PdfText, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";
import { Children, type ComponentProps, type ReactNode } from "react";
import { COMPANY } from "@/lib/config";

/**
 * Letterhead and table primitives shared by every generated document.
 * Built-in fonts only (Helvetica / Times-Roman) so PDFs render anywhere
 * without font downloads.
 */

/**
 * Built-in PDF fonts are WinAnsi: the narrow no-break spaces produced by
 * fr-FR number formatting have no glyph. Every string passing through Text is
 * normalised here, so templates can use the app's formatters unchanged.
 */
const clean = (v: ReactNode): ReactNode => (typeof v === "string" ? v.replace(/[  ]/g, " ").replace(/ /g, " ") : v);
type TextProps = ComponentProps<typeof PdfText> & { children?: ReactNode };
export function Text({ children, ...rest }: TextProps) {
  return <PdfText {...rest}>{Children.map(children, clean)}</PdfText>;
}

const NAVY = "#0B2545";
const GOLD = "#B8860B";
const GOLD_INK = "#8A6408";
const INK = "#14213A";
const INK2 = "#4A5568";
const INK3 = "#7C8797";
const LINE = "#DCE1EA";

export const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9.5, color: INK, paddingTop: 0, paddingBottom: 70, paddingHorizontal: 0, lineHeight: 1.45 },
  lh: { backgroundColor: NAVY, color: "#fff", paddingVertical: 16, paddingHorizontal: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  lhBrand: { fontFamily: "Times-Bold", fontSize: 14, letterSpacing: 2.2 },
  lhTag: { color: "#E0B65A", fontSize: 7.5, marginTop: 2 },
  lhRight: { textAlign: "right", fontSize: 7, lineHeight: 1.4, color: "#D9E1EE" },
  body: { paddingHorizontal: 40, paddingTop: 22 },
  h1: { fontFamily: "Times-Bold", fontSize: 16, color: NAVY, marginBottom: 3 },
  ref: { fontFamily: "Courier", fontSize: 8, color: INK3, marginBottom: 14 },
  addr: { flexDirection: "row", gap: 20, marginBottom: 14 },
  addrCol: { flex: 1 },
  eyebrow: { fontSize: 6.5, letterSpacing: 1, color: GOLD_INK, textTransform: "uppercase", marginBottom: 2 },
  p: { marginBottom: 7, maxWidth: 480, color: INK },
  table: { marginVertical: 8, borderTopWidth: 1, borderTopColor: LINE },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 4.5, paddingHorizontal: 6 },
  th: { backgroundColor: "#EEF1F6", fontSize: 6.5, letterSpacing: 0.6, textTransform: "uppercase", color: INK2 },
  tot: { backgroundColor: "#FBF1DA", fontFamily: "Helvetica-Bold" },
  cell: { flex: 1 },
  r: { textAlign: "right" },
  mono: { fontFamily: "Courier", fontSize: 8.5 },
  box: { borderWidth: 1, borderColor: LINE, borderLeftWidth: 3, borderLeftColor: GOLD, backgroundColor: "#FBF9F3", padding: 8, marginVertical: 8 },
  sig: { flexDirection: "row", gap: 20, marginTop: 18 },
  sigBox: { flex: 1, borderTopWidth: 1, borderTopColor: "#C3CBD9", paddingTop: 5, fontSize: 7.5, color: INK2, minHeight: 60 },
  footer: { position: "absolute", left: 40, right: 40, bottom: 22, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6, fontSize: 6.3, color: INK3, lineHeight: 1.4 },
  pageNo: { position: "absolute", right: 40, bottom: 10, fontSize: 6.5, color: INK3 },
  small: { fontSize: 7.5, color: INK2 },
  b: { fontFamily: "Helvetica-Bold" },
});

export const LEGAL =
  "Purpose Capital S.A. intervient en qualité d'intermédiaire ; les titres sont inscrits au nom de l'investisseur. Les prix et volumes servis sont arrêtés par l'émetteur à l'issue de l'adjudication : une soumission n'emporte aucune garantie d'être servie. Rendements bruts, avant frais et fiscalité. Risque de perte en capital. Document généré depuis le registre des offres et le journal des ordres de Purpose Capital ; toute modification manuelle l'invalide.";

export function Letter({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Document author={COMPANY.legalName} title={heading}>
      <Page size="A4" style={s.page}>
        <View style={s.lh} fixed>
          <View>
            <Text style={s.lhBrand}>{COMPANY.name.toUpperCase()}</Text>
            <Text style={s.lhTag}>{COMPANY.tagline}</Text>
          </View>
          <View style={s.lhRight}>
            <Text>{COMPANY.licence}</Text>
            <Text>
              {COMPANY.address} · {COMPANY.phone}
            </Text>
            <Text>{heading}</Text>
          </View>
        </View>
        <View style={s.body}>{children}</View>
        <Text style={s.footer} fixed>
          {LEGAL}
        </Text>
        <Text style={s.pageNo} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export type Col = { label: string; flex?: number; right?: boolean; mono?: boolean };

export function Table({ cols, rows, total }: { cols: Col[]; rows: (string | number)[][]; total?: (string | number)[] }) {
  const showHead = cols.some((c) => c.label);
  const cell = (c: Col, v: string | number, extra?: Style) => (
    <Text key={cols.indexOf(c)} style={[s.cell, { flex: c.flex ?? 1 }, c.right ? s.r : {}, c.mono ? s.mono : {}, extra ?? {}]}>
      {String(v)}
    </Text>
  );
  return (
    <View style={s.table}>
      {showHead && (
      <View style={[s.tr, s.th]}>
        {cols.map((c, j) => (
          <Text key={j} style={[s.cell, { flex: c.flex ?? 1 }, c.right ? s.r : {}]}>
            {c.label}
          </Text>
        ))}
      </View>
      )}
      {rows.map((row, i) => (
        <View key={i} style={s.tr}>
          {row.map((v, j) => cell(cols[j], v))}
        </View>
      ))}
      {total && (
        <View style={[s.tr, s.tot]}>
          {total.map((v, j) => cell(cols[j], v, { fontFamily: "Helvetica-Bold" }))}
        </View>
      )}
    </View>
  );
}

export function KV({ rows, total, left }: { rows: [string, string][]; total?: [string, string]; left?: boolean }) {
  return <Table cols={[{ label: "", flex: left ? 1.2 : 3 }, { label: "", flex: left ? 3 : 1.4, right: !left }]} rows={rows} total={total} />;
}

export function Addr({ blocks }: { blocks: [string, string[]][] }) {
  return (
    <View style={s.addr}>
      {blocks.map(([label, lines]) => (
        <View key={label} style={s.addrCol}>
          <Text style={s.eyebrow}>{label}</Text>
          {lines.map((l, i) => (
            <Text key={i}>{l}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function Sig({ left, right }: { left: string; right: string }) {
  return (
    <View style={s.sig}>
      <Text style={s.sigBox}>{left}</Text>
      <Text style={s.sigBox}>{right}</Text>
    </View>
  );
}
