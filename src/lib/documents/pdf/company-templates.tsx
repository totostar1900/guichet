import { Line, Path, Rect, Svg, Text as SvgText, View } from "@react-pdf/renderer";
import type { Company } from "@/data/companies";
import { COMPANY } from "@/lib/config";
import type { Analysis, PricePeriod } from "@/lib/companies/analysis";
import type { Quote } from "@/lib/domain/market";
import { fmt, fmtDate, fmtDateTime, fmtPct } from "@/lib/format";
import { KV, Letter, Table, Text, s } from "./primitives";

/**
 * Rapport sur une société cotée : le cours sur la période, les comptes certifiés,
 * les ratios et leur lecture — le même contenu que la page, mis en page pour être envoyé.
 */
export interface CompanyReportCtx {
  number: string;
  company: Company;
  analysis: Analysis;
  quotes: Quote[]; // period slice, oldest → newest
  period?: PricePeriod;
  periodLabel: string;
  periodText?: string;
  now: Date;
}

const NAVY = "#0b2545";
const GOLD = "#b8860b";
const GREY = "#9aa3b2";
const LINE = "#e5e7eb";
const short = (v: number): string => {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md`;
  if (a >= 1e6) return `${(v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} M`;
  if (a >= 1e3) return `${(v / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k`;
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
};

function PriceSvg({ quotes }: { quotes: Quote[] }) {
  const W = 500;
  const H = 150;
  const padL = 44;
  const padR = 8;
  const padT = 10;
  const padB = 22;
  if (quotes.length === 0) return null;
  const vals = quotes.map((q) => q.close);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max === min) {
    min *= 0.97;
    max *= 1.03;
  }
  const pad = (max - min) * 0.08;
  min -= pad;
  max += pad;
  const x = (i: number) => (quotes.length === 1 ? W / 2 : padL + (i * (W - padL - padR)) / (quotes.length - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / (max - min));
  const d = quotes.map((q, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(q.close).toFixed(1)}`).join(" ");
  const ticks = [min + pad, (min + max) / 2, max - pad];
  const up = quotes[quotes.length - 1].close >= quotes[0].close;
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {ticks.map((t, i) => (
        <Line key={i} x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={LINE} strokeWidth={0.6} />
      ))}
      {ticks.map((t, i) => (
        <SvgText key={`t${i}`} x={padL - 4} y={y(t) + 3} style={{ fontSize: 7, fill: GREY }} textAnchor="end">
          {short(t)}
        </SvgText>
      ))}
      <Path d={d} stroke={up ? "#1e7f4f" : "#b3261e"} strokeWidth={1.5} fill="none" />
      <SvgText x={padL} y={H - 8} style={{ fontSize: 7, fill: GREY }}>
        {fmtDate(quotes[0].sessionDate)}
      </SvgText>
      <SvgText x={W - padR} y={H - 8} style={{ fontSize: 7, fill: GREY }} textAnchor="end">
        {fmtDate(quotes[quotes.length - 1].sessionDate)}
      </SvgText>
    </Svg>
  );
}

function BarsSvg({ years, a, b, labelA, labelB }: { years: string[]; a: number[]; b: number[]; labelA: string; labelB: string }) {
  const W = 500;
  const H = 150;
  const padL = 44;
  const padR = 8;
  const padT = 12;
  const padB = 30;
  const max = Math.max(1, ...a, ...b);
  const y = (v: number) => padT + (H - padT - padB) * (1 - Math.max(v, 0) / max);
  const gw = (W - padL - padR) / years.length;
  const bw = Math.min(26, gw * 0.32);
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke={LINE} strokeWidth={0.8} />
      {years.map((yr, i) => {
        const x0 = padL + i * gw + (gw - bw * 2) / 2;
        return (
          <View key={yr}>
            <Rect x={x0} y={y(a[i])} width={bw} height={H - padB - y(a[i])} fill={NAVY} />
            <Rect x={x0 + bw + 2} y={y(b[i])} width={bw} height={H - padB - y(b[i])} fill={GOLD} />
            <SvgText x={x0 + bw / 2} y={y(a[i]) - 3} style={{ fontSize: 6.5, fill: NAVY }} textAnchor="middle">
              {short(a[i])}
            </SvgText>
            <SvgText x={x0 + bw + 2 + bw / 2} y={y(b[i]) - 3} style={{ fontSize: 6.5, fill: GOLD }} textAnchor="middle">
              {short(b[i])}
            </SvgText>
            <SvgText x={padL + i * gw + gw / 2} y={H - padB + 11} style={{ fontSize: 8, fill: "#4b5563" }} textAnchor="middle">
              {yr}
            </SvgText>
          </View>
        );
      })}
      <Rect x={padL} y={H - 9} width={7} height={7} fill={NAVY} />
      <SvgText x={padL + 10} y={H - 3} style={{ fontSize: 7, fill: GREY }}>
        {labelA}
      </SvgText>
      <Rect x={padL + 150} y={H - 9} width={7} height={7} fill={GOLD} />
      <SvgText x={padL + 160} y={H - 3} style={{ fontSize: 7, fill: GREY }}>
        {labelB}
      </SvgText>
    </Svg>
  );
}

export function RapportSociete({ number, company: c, analysis: a, quotes, period, periodLabel, periodText, now }: CompanyReportCtx) {
  const figs = [...c.figures].sort((x, y) => x.year - y.year);
  const years = figs.map((f) => String(f.year));
  const q = a.quote;
  return (
    <Letter heading={`Rapport société · ${number}`}>
      <Text style={s.h1}>
        {c.name} ({c.mnemo})
      </Text>
      <Text style={s.ref}>
        {number} · {c.sector} · {c.country} · BVMAC · établi le {fmtDateTime(now.toISOString())} · période : {periodLabel}
      </Text>
      <Text style={s.p}>{c.activity}</Text>
      <View style={s.box}>
        <Text>{a.headline}</Text>
      </View>

      <Text style={[s.p, s.b]}>1. L&apos;action sur la période</Text>
      <KV
        rows={[
          ["Dernier cours", q ? `${fmt(q.close)} FCFA le ${fmtDate(q.sessionDate)}` : "—"],
          ["Sur la période", period ? `${period.changePct > 0 ? "+" : ""}${fmtPct(period.changePct, 2)} · de ${fmt(period.first)} à ${fmt(period.last)} FCFA` : "—"],
          ["Plus haut / plus bas", period ? `${fmt(period.high)} / ${fmt(period.low)} FCFA` : "—"],
          ["Échanges", period ? `${fmt(period.volume)} titres · ${short(period.value)} FCFA · ${period.tradedSessions} séance(s) active(s) sur ${period.sessions}` : "—"],
          ["Capitalisation", a.marketCap != null ? `${short(a.marketCap)} FCFA (${fmt(c.sharesTotal)} actions, flottant ${fmtPct(c.freeFloatPct, 1)})` : "—"],
          ["Depuis le 1er janvier", q?.ytdVariationPct != null ? `${q.ytdVariationPct > 0 ? "+" : ""}${fmtPct(q.ytdVariationPct, 2)}` : "—"],
        ]}
      />
      {quotes.length > 1 && <PriceSvg quotes={quotes} />}
      {periodText && <Text style={s.small}>Comment lire : {periodText}</Text>}

      <Text style={[s.p, s.b]} break>
        2. Les comptes certifiés ({figs[0].year}–{a.latest.year})
      </Text>
      <BarsSvg years={years} a={figs.map((f) => f.revenue)} b={figs.map((f) => f.netIncome)} labelA={a.latest.revenueLabel} labelB="Bénéfice net" />
      <Text style={s.small}>Comment lire : les barres bleues mesurent l&apos;activité, les dorées ce qu&apos;il en reste une fois tout payé. Un bénéfice qui suit les revenus = des marges qui tiennent.</Text>
      <Table
        cols={[{ label: "FCFA", flex: 2 }, ...figs.map((f) => ({ label: String(f.year), right: true, flex: 1.3 }))]}
        rows={[
          [a.latest.revenueLabel, ...figs.map((f) => fmt(f.revenue))],
          ["Résultat net", ...figs.map((f) => fmt(f.netIncome))],
          ["Fonds propres", ...figs.map((f) => fmt(f.equity))],
          ["Total du bilan", ...figs.map((f) => fmt(f.totalAssets))],
          ["Bénéfice par action", ...figs.map((f) => fmt(f.netIncome / c.sharesTotal))],
          ["Dividende brut / action", ...figs.map((f) => (f.dividendPerShare === null ? "néant" : f.dividendPerShare != null ? fmt(f.dividendPerShare) : "—"))],
        ]}
      />
      <BarsSvg years={years} a={figs.map((f) => f.totalAssets)} b={figs.map((f) => f.equity)} labelA="Total du bilan" labelB="Fonds propres" />
      <Text style={s.small}>Sources : {[...new Set(figs.map((f) => f.source))].join(" · ")}.</Text>

      <Text style={[s.p, s.b]}>3. Ratios et lecture</Text>
      <Table cols={[{ label: "Ratio", flex: 1.6 }, { label: "Valeur", flex: 1.3, right: true }, { label: "Comment le lire", flex: 4 }]} rows={a.ratios.map((r) => [r.label, r.value, r.reading])} />

      <Text style={[s.p, s.b]}>4. Ce que disent les chiffres</Text>
      {a.comments.map((t, i) => (
        <Text key={i} style={s.p}>
          • {t}
        </Text>
      ))}

      <Text style={[s.p, s.b]}>5. Actionnariat et documents</Text>
      <KV rows={[...c.coreShareholders.map((p): [string, string] => [p.name, `${p.pct.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`]), ["Flottant en bourse", `${fmtPct(c.freeFloatPct, 2)} · ${fmt(c.sharesFloat)} actions`], ["Introduction", `${fmtDate(c.listedOn)}${c.ipoPrice ? ` à ${fmt(c.ipoPrice)} FCFA` : ""}`]]} />
      <Text style={s.small}>
        Documents publiés sur bvm-ac.org : {[...c.documents].sort((x, y) => y.year - x.year).slice(0, 8).map((d) => `${d.title}`).join(" · ")}
        {c.documents.length > 8 ? ` · et ${c.documents.length - 8} autres` : ""}.
      </Text>
      <Text style={s.small}>
        Ce rapport est une information établie par {COMPANY.legalName} à partir de documents publics ; il ne constitue ni un conseil en investissement ni une recommandation. Les performances passées ne préjugent pas des performances futures ; le cours d&apos;un titre peu liquide peut ne pas refléter un prix auquel une transaction est possible.
      </Text>
    </Letter>
  );
}
