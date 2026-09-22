import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { fillAll, type QuarterNote } from "@/lib/market/index-quarter";
import { KV, Letter, Table, Text, s } from "./primitives";

/**
 * Note trimestrielle sur l'indice, la version imprimable de la page publique :
 * mêmes chiffres, même ordre, écrite pour un client. Le détail interne (les
 * séances à éclaircir) reste au desk ; la note n'en dit qu'une ligne.
 */
const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);

export function NoteTrimestrielle({ note, texts }: { note: QuarterNote; texts?: Record<string, string> }) {
  const n = note;
  const traded = n.lines.filter((l) => l.trades > 0);
  const first = n.lines[0];
  return (
    <Letter heading={`Note de marché · indice BVMAC All Share · ${n.quarter.label}`}>
      <Text style={s.h1}>L&apos;indice BVMAC All Share au {n.quarter.label}</Text>
      <Text style={s.ref}>
        {n.number} · {COMPANY.legalName}, {COMPANY.licence} · séances du {fmtDate(n.quarter.from)} au {fmtDate(n.quarter.to)}
      </Text>

      <Text style={s.p}>{fillAll(n.headline)}</Text>
      <Text style={s.p}>{fillAll(n.reading)}</Text>

      <Text style={[s.p, s.b]}>1. Le trimestre en chiffres</Text>
      <KV
        rows={[
          ["Niveau à la fin du trimestre", `${fmt(n.level)} points (fin du trimestre précédent : ${fmt(n.levelBefore)})`],
          ["Performance du trimestre · douze mois", `${signed(n.ret)} · ${signed(n.year, 1)}`],
          ["Séances lues · avec mouvement", `${n.sessions} · ${n.moved} (${n.up} hausse${n.up > 1 ? "s" : ""}, ${n.down} baisse${n.down > 1 ? "s" : ""})`],
          ["Plus haut · plus bas", `${fmt(n.high.value)} le ${fmtDate(n.high.date)} · ${fmt(n.low.value)} le ${fmtDate(n.low.date)}`],
          ["Fin de mois", n.monthly.map((m) => `${m.label} ${fmt(m.value)} (${signed(m.ret, 1)})`).join(" · ")],
          ["Échangé sur les actions", `${money(n.amount)} FCFA · ${n.trades} transaction${n.trades > 1 ? "s" : ""} · ${fmt(n.titles)} titre${n.titles > 1 ? "s" : ""}`],
        ]}
        total={["Capitalisation de la cote · flottant coté", `${money(n.capTotal)} FCFA · ${money(n.capFloat)} (${n.capTotal ? fmtPct((n.capFloat / n.capTotal) * 100, 0) : "—"})${n.rotation != null ? ` · rotation du flottant ${fmtPct(n.rotation, 1)} sur douze mois` : ""}`]}
      />

      <Text style={[s.p, s.b]}>2. Les sept sociétés derrière le chiffre</Text>
      <Table
        cols={[
          { label: "Société", flex: 2.1 },
          { label: "Activité", flex: 1.5 },
          { label: "Pays", flex: 1.1 },
          { label: "Cours", flex: 1, right: true },
          { label: "Rend.", flex: 0.8, right: true },
          { label: "Poids", flex: 0.9, right: true },
          { label: "Flottant", flex: 0.9, right: true },
          { label: "Trimestre", flex: 1, right: true },
        ]}
        rows={n.lines.map((l) => [`${l.mnemo} · ${l.name}`, l.sector, l.country, fmt(l.price), l.yield != null ? fmtPct(l.yield, 1) : "—", fmtPct(l.weight, 1), fmtPct(l.floatShare, 0), signed(l.move, 1)])}
        total={["Ensemble de la cote", "", "", "", "", "100 %", n.capTotal ? fmtPct((n.capFloat / n.capTotal) * 100, 0) : "—", signed(n.ret, 1)]}
      />
      <Text style={s.small}>
        Par secteur : {n.bySector.map((g) => `${g.label} ${fmtPct(g.pct, 1)}`).join(" · ")}. Par pays : {n.byCountry.map((g) => `${g.label} ${fmtPct(g.pct, 1)}`).join(" · ")}.
      </Text>
      {first && (
        <Text style={s.p}>
          La concentration est le trait principal de cette cote : {first.name} représente {fmtPct(first.weight, 1)} de la capitalisation. Dire « le marché monte » revient, le plus souvent, à dire « {first.name} monte ».
        </Text>
      )}

      <Text style={[s.p, s.b]}>3. Ce qui s&apos;est échangé</Text>
      <Text style={s.p}>{fillAll(n.caution)}</Text>
      {traded.length > 0 && (
        <Table
          cols={[
            { label: "Société", flex: 2.2 },
            { label: "Échangé (FCFA)", flex: 1.4, right: true },
            { label: "Transactions", flex: 1, right: true },
            { label: "Rotation du flottant, 12 mois", flex: 1.6, right: true },
          ]}
          rows={traded.map((l) => [`${l.mnemo} · ${l.name}`, money(l.amount), l.trades, l.rotation != null ? fmtPct(l.rotation, l.rotation < 10 ? 1 : 0) : "—"])}
        />
      )}

      <Text style={[s.p, s.b]}>4. Ce que l&apos;indice mesure, et ce qu&apos;il ne mesure pas</Text>
      <Text style={s.p}>
        C&apos;est un indice de prix : les dividendes n&apos;y sont pas, et sur cette cote ils font une part importante du rendement d&apos;un porteur. Ce n&apos;est pas une mesure d&apos;activité : {n.sessions - n.moved} séances du trimestre n&apos;ont enregistré aucun mouvement, faute de transaction. Ce n&apos;est pas un portefeuille : le flottant disponible ne permet pas de reproduire sa composition. Ce n&apos;est pas un baromètre de l&apos;économie régionale : sept sociétés, dont quatre financières, ne décrivent pas la croissance d&apos;une zone ; le marché des titres publics et les valeurs liquidatives des OPCVM portent un signal plus solide. {texts?.portee ?? ""}
      </Text>

      <Text style={s.small}>
        Source : bulletin officiel de la cote de la BVMAC, séances lues à chaque parution ; calculs {COMPANY.legalName}.{" "}
        {n.methodOpen ? "La méthodologie de l'indice (base, date de base, règle de pondération) est en cours de confirmation auprès de la BVMAC." : "Les variations publiées se reconstituent avec les cours et les poids du même bulletin."} Ce document présente une information de marché ; il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, ni une offre. Les performances passées ne préjugent pas des performances futures.
      </Text>
    </Letter>
  );
}
