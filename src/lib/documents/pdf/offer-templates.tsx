import { View } from "@react-pdf/renderer";
import type { Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";
import type { BondResult } from "@/lib/finance";
import { FAMILY_LABEL, type OfferFamily } from "@/lib/domain/status";
import { fmt, fmtDate, fmtDateTime, localIso } from "@/lib/format";
import { KV, Letter, Table, Text } from "./primitives";

/**
 * Fiche d'une ligne du Guichet, à envoyer sur WhatsApp ou par e-mail : la même
 * information que la page, sur deux pages A4 — identité, chiffres clés, calcul
 * de référence, échéancier, points d'attention, documents.
 */
export interface OfferSheetCtx {
  number: string;
  offer: Offer;
  summary: OfferSummary;
  family: OfferFamily;
  status: string;
  reference?: { title: string; rows: [string, string][] };
  flows?: BondResult;
  settleOn?: string;
  risks: [string, string][];
  now: Date;
}

const NAVY = "#0b2545";
const GOLD = "#b8860b";
const H2 = { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4 } as const;

export function FicheOffre({ number, offer: o, summary: sm, family, status, reference, flows, settleOn, risks, now }: OfferSheetCtx) {
  return (
    <Letter heading={`Fiche · ${number}`}>
      <Text style={{ fontSize: 8, color: "#6b7280", letterSpacing: 0.6 }}>{`${FAMILY_LABEL[family].toUpperCase()} · ${o.countryName.toUpperCase()} · ${status.toUpperCase()}`}</Text>
      <Text style={{ fontSize: 17, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 3 }}>{o.title}</Text>
      <Text style={{ fontSize: 9, color: "#4b5563", marginTop: 2 }}>{`${sm.subtitle} · ISIN ${o.isin}`}</Text>
      <Text style={{ fontSize: 9, marginTop: 8, lineHeight: 1.4 }}>{o.blurb}</Text>

      <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
        {sm.ledger.map(([k, v, note], i) => (
          <View key={k} style={{ flex: 1, backgroundColor: "#f6f7f9", padding: 8, borderRadius: 3 }}>
            <Text style={{ fontSize: 7, color: "#6b7280", letterSpacing: 0.5 }}>{k.toUpperCase()}</Text>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: i === 0 && sm.gold ? GOLD : NAVY, marginTop: 2 }}>{v}</Text>
            {note ? <Text style={{ fontSize: 7, color: "#6b7280", marginTop: 1 }}>{note}</Text> : null}
          </View>
        ))}
      </View>

      {reference && (
        <View style={{ marginTop: 14 }}>
          <Text style={H2}>{reference.title}</Text>
          <KV rows={reference.rows} />
        </View>
      )}

      {flows && flows.flows.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={H2}>Échéancier pour cette position</Text>
          <Table
            cols={[
              { label: "Date", flex: 1.2 },
              { label: "Nature", flex: 1.4 },
              { label: "Montant (FCFA)", flex: 1.2, right: true },
            ]}
            rows={[[fmtDate(settleOn ?? now.toISOString().slice(0, 10)), "Décaissement", `− ${fmt(flows.outlay)}`], ...flows.flows.map((f) => [fmtDate(localIso(f.date)), f.label, `+ ${fmt(f.amount)}`])]}
            total={["Gain brut jusqu'au terme", "", `+ ${fmt(flows.gain)}`]}
          />
        </View>
      )}

      <View style={{ marginTop: 12 }} break={Boolean(flows && flows.flows.length > 6)}>
        <Text style={H2}>À garder en tête</Text>
        {risks.map(([t, d]) => (
          <Text key={t} style={{ fontSize: 8.5, marginTop: 4, lineHeight: 1.4 }}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{t} </Text>
            {d}
          </Text>
        ))}
      </View>

      {o.documents.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={H2}>Documents</Text>
          {o.documents.map((d) => (
            <Text key={d.name} style={{ fontSize: 8.5, marginTop: 2 }}>
              {d.name} — {d.meta}
              {d.url ? ` — ${d.url}` : ""}
            </Text>
          ))}
        </View>
      )}

      <Text style={{ fontSize: 7.5, color: "#6b7280", marginTop: 14 }}>
        {`Fiche établie le ${fmtDateTime(now.toISOString())} depuis le Guichet Purpose Capital. Prix et cours : ${sm.heroSub.replace(/.$/, "")}. Ni offre ni conseil personnalisé ; rendements bruts, avant frais et fiscalité.`}
      </Text>
    </Letter>
  );
}
