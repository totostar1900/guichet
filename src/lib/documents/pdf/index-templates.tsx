import { View } from "@react-pdf/renderer";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtDateTime, fmtPct, money } from "@/lib/format";
import type { IndexNote } from "@/lib/market/index-note";
import { KV, Letter, Table, Text, s } from "./primitives";

/**
 * Note mensuelle sur l'indice BVMAC All Share : what the month did, who
 * moved it, what was traded, and what the figures do not say. Every number
 * comes from the bulletins already read; the desk reads and signs before
 * anything leaves.
 */
const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
const pts = (v: number) => `${v > 0 ? "+" : ""}${fmtPct(v, 2).replace(" %", " pt")}`;

export function NoteIndice({ note, texts }: { note: IndexNote; texts?: Record<string, string> }) {
  const n = note;
  const traded = n.lines.filter((l) => l.trades > 0);
  return (
    <Letter heading={`Note mensuelle · indice BVMAC All Share · ${n.month.label}`}>
      <Text style={s.h1}>L&apos;indice BVMAC All Share en {n.month.label}</Text>
      <Text style={s.ref}>
        {n.number} · {COMPANY.legalName}, {COMPANY.licence} · séances du {fmtDate(n.month.from)} au {fmtDate(n.month.to)}
        {n.lastBulletin ? ` · dernier bulletin lu : n° ${n.lastBulletin.number} du ${fmtDate(n.lastBulletin.date)}, ${fmtDateTime(n.lastBulletin.ingestedAt)} par ${n.lastBulletin.by}` : ""}
      </Text>

      <Text style={s.p}>{n.headline}</Text>
      <Text style={s.p}>{n.reading}</Text>
      <Text style={s.p}>{n.caution}</Text>

      <Text style={[s.p, s.b]}>1. Le mois en chiffres</Text>
      <KV
        rows={[
          ["Niveau à la fin du mois", `${fmt(n.level)} points (fin du mois précédent : ${fmt(n.levelBefore)})`],
          ["Performance du mois", signed(n.ret)],
          ["Depuis le 1er janvier · douze mois", `${signed(n.ytd, 1)} · ${signed(n.year, 1)}`],
          ["Séances lues · avec mouvement", `${n.sessions} · ${n.moved} (${n.up} hausse${n.up > 1 ? "s" : ""}, ${n.down} baisse${n.down > 1 ? "s" : ""})`],
          ["Plus haut · plus bas du mois", n.high && n.low ? `${fmt(n.high.value)} le ${fmtDate(n.high.date)} · ${fmt(n.low.value)} le ${fmtDate(n.low.date)}` : "—"],
          ["Jours ouvrés sans bulletin lu", String(n.missing)],
          ["Échangé sur les actions", `${money(n.amount)} FCFA · ${n.trades} transaction${n.trades > 1 ? "s" : ""} · ${fmt(n.titles)} titre${n.titles > 1 ? "s" : ""}`],
        ]}
        total={["Capitalisation de la cote · flottant coté", `${money(n.capTotal)} FCFA · ${money(n.capFloat)} (${n.capTotal ? fmtPct((n.capFloat / n.capTotal) * 100, 0) : "—"})${n.rotation != null ? ` · rotation ${fmtPct(n.rotation, 1)} sur douze mois` : ""}`]}
      />

      <Text style={[s.p, s.b]}>2. Ce qui a fait le mouvement</Text>
      <Table
        cols={[
          { label: "Société", flex: 2 },
          { label: "Poids", flex: 1, right: true },
          { label: "Cours du mois", flex: 1.2, right: true },
          { label: "Contribution", flex: 1.2, right: true },
          { label: "Échangé (FCFA)", flex: 1.4, right: true },
          { label: "Transactions", flex: 1, right: true },
        ]}
        rows={n.lines.map((l) => [`${l.mnemo} · ${l.name}`, fmtPct(l.weight, 1), signed(l.move, 1), pts(l.points), l.amount ? money(l.amount) : "—", l.trades || "—"])}
        total={["Ensemble", "100 %", signed(n.ret), pts(n.lines.reduce((x, l) => x + l.points, 0)), money(n.amount), n.trades || "—"]}
      />
      <Text style={s.small}>
        La contribution est le poids de la société multiplié par la variation de son cours sur le mois, en points d&apos;indice : une forte hausse sur une petite valeur pèse peu. L&apos;écart entre la somme des contributions et la performance publiée est traité au paragraphe 4.
      </Text>

      <Text style={[s.p, s.b]}>3. Ce qui s&apos;est échangé</Text>
      {traded.length > 0 ? (
        <Text style={s.p}>
          {traded.length} valeur{traded.length > 1 ? "s ont" : " a"} traité sur le mois : {traded.map((l) => `${l.mnemo} (${money(l.amount)} FCFA en ${l.trades} transaction${l.trades > 1 ? "s" : ""})`).join(", ")}. Les autres lignes de la cote sont restées sans contrepartie.
        </Text>
      ) : (
        <Text style={s.p}>Aucune valeur n&apos;a traité ce mois-ci : le niveau de l&apos;indice reflète les derniers cours connus.</Text>
      )}

      <Text style={[s.p, s.b]}>4. Points de lecture</Text>
      {n.unexplained.length > 0 ? (
        <>
          <Text style={s.p}>
            {n.unexplained.length} séance{n.unexplained.length > 1 ? "s" : ""} du mois {n.unexplained.length > 1 ? "présentent" : "présente"} une variation publiée que les cours lus dans le même bulletin ne reconstituent pas. Ce point est ouvert avec la BVMAC ; il peut venir d&apos;une lecture partielle de notre côté, d&apos;une méthode de pondération différente de celle que nous supposons, ou d&apos;un décalage de séance entre les pages du bulletin. Aucune de nos lectures dérivées n&apos;est publiée comme un indice.
          </Text>
          <Table
            cols={[
              { label: "Séance", flex: 1.2 },
              { label: "Indice", flex: 1, right: true },
              { label: "Cours modifiés dans nos lectures", flex: 3 },
            ]}
            rows={n.unexplained.slice(0, 8).map((u) => [fmtDate(u.date), signed(u.variationPct), u.movers])}
          />
        </>
      ) : (
        <Text style={s.p}>Toutes les séances avec mouvement du mois se reconstituent avec les cours et les poids du même bulletin.</Text>
      )}
      <Text style={s.p}>
        Rappel de portée : l&apos;indice est un indice de prix, dividendes non compris ; il porte sept sociétés dont une représente près des trois quarts de la capitalisation ; il ne mesure ni l&apos;activité économique de la zone, ni la performance d&apos;un portefeuille, et il n&apos;est pas reproductible à l&apos;achat. {texts?.portee ?? ""}
      </Text>

      <View style={s.box}>
        <Text style={s.small}>
          Source : bulletin officiel de la cote de la BVMAC, séances lues par le Guichet ; calculs {COMPANY.legalName}. Base, date de base et règle de pondération de l&apos;indice à confirmer auprès de la BVMAC. Ce document présente une information de marché ; il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, ni une offre. Les performances passées ne préjugent pas des performances futures.
        </Text>
      </View>
    </Letter>
  );
}
