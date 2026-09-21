import { COMPANY } from "@/lib/config";
import { passage } from "../passages-catalog";
import type { Contact } from "@/lib/domain/types";
import { fmt, fmtDate, fmtDateTime, localIso } from "@/lib/format";
import type { Position } from "@/lib/positions";
import { Addr, Letter, Sig, Table, Text, s } from "./primitives";

/** Relevé de position : what the client holds and the flows ahead, at a date. */
export function RelevePosition({ number, contact, positions, now, texts }: { number: string; contact: Contact; positions: Position[]; now: Date; texts?: Record<string, string> }) {
  const nominal = positions.reduce((a, p) => a + p.nominalAmount, 0);
  const cost = positions.reduce((a, p) => a + p.costBasis, 0);
  const value = positions.reduce((a, p) => a + (p.marketValue ?? p.nominalAmount), 0);
  const units = (p: Position) => `${p.unitWord === "parts" ? p.units.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : fmt(p.units)} ${p.unitWord}`;
  const valued = (p: Position) => (p.marketValue != null ? `${fmt(p.marketValue)}${p.valuedOn ? ` (${fmtDate(p.valuedOn, false)})` : ""}` : "au nominal");
  const flows = positions.flatMap((p) => p.flows.map((f) => ({ ...f, line: p.offer.title }))).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
  return (
    <Letter heading={`Relevé de position · ${number}`}>
      <Text style={s.h1}>Relevé de position au {fmtDate(localIso(now))}</Text>
      <Text style={s.ref}>
        {number} · édité le {fmtDateTime(now.toISOString())}
      </Text>
      <Addr blocks={[["Titulaire", [contact.name, contact.segment, contact.phone ?? "", contact.email ?? ""]], ["Teneur de compte", [COMPANY.legalName, COMPANY.licence, "Titres inscrits au nom du titulaire chez le dépositaire désigné"]]]} />
      <Table
        cols={[{ label: "Ligne", flex: 2.2 }, { label: "Code", flex: 1.2, mono: true }, { label: "Quantité", right: true }, { label: "Nominal (FCFA)", flex: 1.2, right: true }, { label: "Valeur au dernier cours / VL", flex: 1.6, right: true }, { label: "Coût d'acquisition", flex: 1.2, right: true }, { label: "Prochain flux", flex: 1.4 }, { label: "Échéance", flex: 1 }]}
        rows={positions.map((p) => [p.offer.title, p.offer.isin, units(p), fmt(p.nominalAmount), valued(p), fmt(p.costBasis), p.nextFlow ? `${fmtDate(p.nextFlow.date, false)} · ${fmt(p.nextFlow.amount)}` : "—", p.maturityOn ? fmtDate(p.maturityOn) : "—"])}
        total={["Total", "", "", fmt(nominal), fmt(value), fmt(cost), "", ""]}
      />
      {flows.length > 0 && (
        <>
          <Text style={[s.p, s.b]}>Échéancier des flux à venir (montants bruts, sous réserve du paiement par l&apos;émetteur)</Text>
          <Table cols={[{ label: "Date", flex: 1.1 }, { label: "Ligne", flex: 2.4 }, { label: "Nature", flex: 1.6 }, { label: "Montant (FCFA)", flex: 1.3, right: true }]} rows={flows.map((f) => [fmtDate(f.date), f.line, f.label, fmt(f.amount)])} />
        </>
      )}
      {positions.length === 0 && <Text style={s.p}>{passage("releve", "vide", texts)}</Text>}
      <Text style={s.small}>{passage("releve", "valeurs", texts, { societe: COMPANY.legalName })}</Text>
    </Letter>
  );
}

/** Attestation de détention : one signed statement of holdings at a date. */
export function AttestationDetention({ number, contact, positions, now, texts }: { number: string; contact: Contact; positions: Position[]; now: Date; texts?: Record<string, string> }) {
  return (
    <Letter heading={`Attestation · ${number}`}>
      <Text style={s.h1}>Attestation de détention de titres</Text>
      <Text style={s.ref}>
        {number} · délivrée le {fmtDate(localIso(now))}
      </Text>
      <Text style={s.p}>
        {COMPANY.legalName}, {COMPANY.licence}, atteste que <Text style={s.b}>{contact.name}</Text> détient, à la date du {fmtDate(localIso(now))}, les instruments financiers suivants, inscrits à son nom dans les livres du dépositaire désigné :
      </Text>
      <Table
        cols={[{ label: "Ligne", flex: 2.4 }, { label: "Code", flex: 1.4, mono: true }, { label: "Quantité", right: true }, { label: "Nominal (FCFA)", flex: 1.3, right: true }, { label: "Valeur indicative", flex: 1.4, right: true }, { label: "Échéance", flex: 1.1 }]}
        rows={positions.map((p) => [p.offer.title, p.offer.isin, `${p.unitWord === "parts" ? p.units.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : fmt(p.units)} ${p.unitWord}`, fmt(p.nominalAmount), p.marketValue != null ? fmt(p.marketValue) : "au nominal", p.maturityOn ? fmtDate(p.maturityOn) : "—"])}
        total={["Total", "", "", fmt(positions.reduce((a, p) => a + p.nominalAmount, 0)), fmt(positions.reduce((a, p) => a + (p.marketValue ?? p.nominalAmount), 0)), ""]}
      />
      <Text style={s.p}>{passage("attestation", "valoir", texts)}</Text>
      <Sig left={`Pour ${COMPANY.legalName} : signature et cachet`} right="" />
    </Letter>
  );
}
