import { View } from "@react-pdf/renderer";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtDateTime, fmtMillions } from "@/lib/format";
import type { Position } from "@/lib/positions";
import type { Activity, ClientRow, OrderRow, Period } from "@/lib/reporting";
import { KV, Letter, Sig, Table, Text, s } from "./primitives";

/**
 * Rapport d'activité périodique — the figures the regulator asks a société de
 * bourse for, computed from the same rows as the desk's reporting page.
 * Nothing typed, everything reproducible from the register at the period's dates.
 */
export interface ActivityReportCtx {
  number: string;
  period: Period;
  now: Date;
  activity: Activity;
  journal: OrderRow[];
  clients: ClientRow[];
  positions: Position[];
  bulletins: { number: number; sessionDate: string; status: string }[];
}

const short = (iso?: string) => (iso ? fmtDateTime(iso).replace(/\s\d{1,2} h \d{2}$/, "") : "—");

export function RapportActivite({ number, period, now, activity: a, journal, clients, positions, bulletins }: ActivityReportCtx) {
  const intentsTotal = Object.values(a.intents).reduce((x, n) => x + n, 0);
  const byKind = new Map<string, { n: number; amount: number }>();
  for (const o of journal) {
    const k = byKind.get(o.instrument) ?? { n: 0, amount: 0 };
    k.n += 1;
    k.amount += o.amount;
    byKind.set(o.instrument, k);
  }
  const holders = new Map<string, { n: number; value: number }>();
  for (const p of positions) {
    const k = p.intent.clientSegment.split("·")[0].trim() || "—";
    const h = holders.get(k) ?? { n: 0, value: 0 };
    h.n += 1;
    h.value += p.marketValue ?? p.nominalAmount;
    holders.set(k, h);
  }
  const approved = clients.filter((c) => c.status === "approuve").length;
  const pending = clients.filter((c) => c.status === "soumis" || c.status === "en_revue").length;
  const noScreen = clients.filter((c) => c.status === "approuve" && c.screening === "non attesté").length;
  return (
    <Letter heading={`Rapport d'activité · ${number}`}>
      <Text style={s.h1}>Rapport d&apos;activité — du {fmtDate(period.from)} au {fmtDate(period.to)}</Text>
      <Text style={s.ref}>
        {number} · établi le {fmtDateTime(now.toISOString())} · {COMPANY.legalName}, {COMPANY.licence}
      </Text>

      <Text style={[s.p, s.b]}>1. Synthèse de la période</Text>
      <KV
        rows={[
          ["Intentions reçues (tous canaux)", `${intentsTotal}${intentsTotal ? ` — ${Object.entries(a.intents).map(([k, n]) => `${n} ${k.toLowerCase()}`).join(", ")}` : ""}`],
          ["Ordres fermes reçus (montant estimé à réception)", `${journal.length} · ${fmtMillions(a.firmAmount)}`],
          ["Ordres exécutés · réglés", `${a.executedCount} · ${a.settledCount}`],
          ["Montants réglés par instrument", Object.entries(a.settledByInstrument).map(([k, v]) => `${k} ${fmtMillions(v)}`).join(" · ") || "aucun règlement"],
          ["Montants réglés par segment de clientèle", Object.entries(a.settledBySegment).map(([k, v]) => `${k} ${fmtMillions(v)}`).join(" · ") || "—"],
          ["Comptes ouverts sur la période", String(a.newAccounts)],
          ["Documents émis · messages envoyés", `${Object.values(a.documents).reduce((x, n) => x + n, 0)} · ${Object.values(a.notifications).reduce((x, n) => x + n, 0)}`],
        ]}
        total={["Encours conservé en fin de période (valeur indicative)", `${fmt(positions.reduce((x, p) => x + (p.marketValue ?? p.nominalAmount), 0))} FCFA · ${a.holders} porteur${a.holders > 1 ? "s" : ""}`]}
      />

      <Text style={[s.p, s.b]}>2. Journal des ordres de la période</Text>
      {journal.length ? (
        <Table
          cols={[{ label: "Réf. · reçu le", flex: 1.6, mono: true }, { label: "Client", flex: 1.6 }, { label: "Instrument · ligne", flex: 2.6 }, { label: "Sens", flex: 1.1 }, { label: "Qté", flex: 0.9, right: true }, { label: "Montant (FCFA)", flex: 1.5, right: true }, { label: "État", flex: 1.2 }, { label: "Exécuté · réglé", flex: 1.6 }]}
          rows={journal.map((o) => [`${o.ref}\n${short(o.receivedAt)}`, o.client, `${o.instrument} · ${o.line}`, o.sens, o.quantity.toLocaleString("fr-FR", { maximumFractionDigits: 3 }), fmt(o.amount), o.state, `${short(o.executedAt)} · ${short(o.settledAt)}`])}
          total={["Total", "", "", "", "", fmt(journal.reduce((x, o) => x + o.amount, 0)), "", ""]}
        />
      ) : (
        <Text style={s.p}>Aucun ordre ferme sur la période.</Text>
      )}
      {byKind.size > 0 && (
        <Table cols={[{ label: "Par instrument", flex: 2 }, { label: "Ordres", right: true }, { label: "Montant (FCFA)", flex: 1.4, right: true }]} rows={[...byKind.entries()].map(([k, v]) => [k, v.n, fmt(v.amount)])} />
      )}

      <Text style={[s.p, s.b]}>3. Clientèle et conformité</Text>
      <KV
        rows={[
          ["Dossiers clients au registre", `${clients.length} — ${approved} approuvé${approved > 1 ? "s" : ""}, ${pending} en instruction`],
          ["Répartition par type", Object.entries(clients.reduce<Record<string, number>>((acc, c) => ((acc[c.kind] = (acc[c.kind] ?? 0) + 1), acc), {})).map(([k, n]) => `${k} ${n}`).join(" · ") || "—"],
          ["Répartition par niveau de risque", Object.entries(clients.reduce<Record<string, number>>((acc, c) => ((acc[c.risk || "non noté"] = (acc[c.risk || "non noté"] ?? 0) + 1), acc), {})).map(([k, n]) => `${k} ${n}`).join(" · ") || "—"],
          ["Contrôle sanctions / PPE attesté", `${clients.filter((c) => c.screening !== "non attesté").length} dossier(s) attesté(s)${noScreen ? ` — ${noScreen} approuvé(s) sans attestation : à régulariser` : ""}`],
          ["Revues périodiques échues", String(clients.filter((c) => c.nextReviewOn && c.nextReviewOn <= period.to).length)],
        ]}
      />

      <Text style={[s.p, s.b]}>4. Conservation — positions en fin de période</Text>
      {positions.length ? (
        <>
          <Table cols={[{ label: "Segment", flex: 2 }, { label: "Positions", right: true }, { label: "Valeur indicative (FCFA)", flex: 1.6, right: true }]} rows={[...holders.entries()].map(([k, v]) => [k, v.n, fmt(v.value)])} />
          <Table
            cols={[{ label: "Client", flex: 1.8 }, { label: "Ligne", flex: 2.4 }, { label: "Code", flex: 1.2, mono: true }, { label: "Quantité", flex: 1, right: true }, { label: "Nominal", flex: 1.2, right: true }, { label: "Valeur", flex: 1.2, right: true }, { label: "Échéance", flex: 1 }]}
            rows={positions.map((p) => [p.intent.clientName, p.offer.title, p.offer.isin, `${p.unitWord === "parts" ? p.units.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : fmt(p.units)} ${p.unitWord}`, fmt(p.nominalAmount), p.marketValue != null ? fmt(p.marketValue) : "au nominal", p.maturityOn ? fmtDate(p.maturityOn) : "—"])}
          />
        </>
      ) : (
        <Text style={s.p}>Aucune position en conservation.</Text>
      )}

      <Text style={[s.p, s.b]}>5. Données de marché utilisées</Text>
      <Text style={s.p}>
        {bulletins.length
          ? `Cours et valeurs liquidatives repris du Bulletin Officiel de la Cote de la BVMAC : ${bulletins.length} bulletin${bulletins.length > 1 ? "s" : ""} ingéré${bulletins.length > 1 ? "s" : ""} sur la période (n° ${bulletins[bulletins.length - 1].number} à ${bulletins[0].number})${bulletins.some((b) => b.status !== "ok") ? `, dont ${bulletins.filter((b) => b.status !== "ok").length} lu(s) partiellement` : ""}. Les PDF sont archivés.`
          : "Aucun bulletin de la BVMAC ingéré sur la période ; les valorisations reposent sur les derniers cours connus."}
      </Text>

      <View style={s.box}>
        <Text>
          Méthode : toutes les valeurs proviennent du registre des offres, du journal des ordres, des dossiers clients et des documents émis par {COMPANY.legalName} ; elles sont recalculées à la demande et reproductibles. Valeurs indicatives au dernier cours de clôture ou à la dernière VL publiée ; lignes du marché primaire au nominal.
        </Text>
      </View>
      <Sig left={`Pour ${COMPANY.legalName} — le Directeur Général`} right="Responsable de la conformité — visa" />
    </Letter>
  );
}
