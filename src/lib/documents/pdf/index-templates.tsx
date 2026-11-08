import { View } from "@react-pdf/renderer";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import type { IndexNote } from "@/lib/market/index-note";
import { CompareBase100, CourbeActivite, CourbeCapitalisation, LignesDuMois, teinte, tonDe } from "./charts";
import { KV, Letter, Text, s } from "./primitives";

/**
 * Note mensuelle sur l'indice BVMAC All Share : what the month did, who
 * moved it and what was traded, in plain words. Every number comes from the
 * bulletins already read; the desk reads and signs before anything leaves.
 * Work in progress (gaps being looked at, questions with the exchange) is not
 * written here: it stays at the desk.
 */
const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
const pts = (v: number) => `${v > 0 ? "+" : ""}${fmtPct(v, 2).replace(" %", " pt")}`;

export function NoteIndice({ note, texts }: { note: IndexNote; texts?: Record<string, string> }) {
  const n = note;
  const traded = n.lines.filter((l) => l.trades > 0);
  return (
    <Letter heading={`Note mensuelle · indice BVMAC All Share · ${n.month.label}`}>
      <Text style={[s.h1, { marginBottom: 8 }]}>L&apos;indice BVMAC All Share en {n.month.label}</Text>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 }}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 26, lineHeight: 1, color: "#0B2545" }}>{fmt(n.level)}</Text>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: tonDe(Number(n.ret.toFixed(2))), marginBottom: 2 }}>{signed(n.ret)} sur le mois</Text>
      </View>
      <CourbeActivite seances={n.activity} sens={n.ret} />

      <Text style={s.p}>{n.headline}</Text>
      <Text style={s.p}>{n.reading}</Text>
      <Text style={s.p}>{n.caution}</Text>
      {n.activity.some((a) => a.cap > 0) && (
        <>
          <Text style={[s.eyebrow, { marginTop: 6, marginBottom: 4 }]}>Capitalisation de la cote, séance par séance</Text>
          <CourbeCapitalisation seances={n.activity} />
        </>
      )}

      <Text style={[s.p, s.b]}>1. Le mois en chiffres</Text>
      <KV
        large
        rows={[
          ["Niveau à la fin du mois", `${fmt(n.level)} points (fin du mois précédent : ${fmt(n.levelBefore)})`],
          ["Performance du mois", teinte(signed(n.ret), n.ret)],
          ["Depuis le 1er janvier · douze mois", teinte(`${signed(n.ytd, 1)} · ${signed(n.year, 1)}`, n.ytd ?? 0)],
          ["Séances lues · avec mouvement", `${n.sessions} · ${n.moved} (${n.up} hausse${n.up > 1 ? "s" : ""}, ${n.down} baisse${n.down > 1 ? "s" : ""})`],
          ["Plus haut · plus bas du mois", n.high && n.low ? `${fmt(n.high.value)} le ${fmtDate(n.high.date)} · ${fmt(n.low.value)} le ${fmtDate(n.low.date)}` : "—"],
          ["Jours ouvrés sans bulletin lu", String(n.missing)],
          ["Échangé sur les actions", `${money(n.amount)} FCFA · ${n.trades} transaction${n.trades > 1 ? "s" : ""} · ${fmt(n.titles)} titre${n.titles > 1 ? "s" : ""}`],
        ]}
        total={["Capitalisation de la cote · flottant coté", `${money(n.capTotal)} FCFA · ${money(n.capFloat)} (${n.capTotal ? fmtPct((n.capFloat / n.capTotal) * 100, 0) : "—"})${n.rotation != null ? ` · rotation ${fmtPct(n.rotation, 1)} sur douze mois` : ""}`]}
      />

      <Text style={[s.p, s.b]}>2. Ce qui a fait le mouvement</Text>
      <LignesDuMois
        cols={["Société", "Poids", "Cours du mois", "Contribution", "Évolution", "Échangé (FCFA)", "Transact."]}
        lignes={n.lines.map((l) => ({ nom: `${l.mnemo} · ${l.name}`, poids: fmtPct(l.weight, 1), move: teinte(signed(l.move, 1), l.move), points: teinte(pts(l.points), l.points), serie: l.serie, sens: l.move, echange: l.amount ? money(l.amount) : "—", trans: String(l.trades || "—") }))}
        total={["Ensemble", "100 %", teinte(signed(n.ret), n.ret), teinte(pts(n.lines.reduce((x, l) => x + l.points, 0)), n.lines.reduce((x, l) => x + l.points, 0)), "", money(n.amount), String(n.trades || "—")]}
      />
      {n.compare && (
        <>
          <Text style={[s.small, { marginTop: 2, marginBottom: 2 }]}>À 100 au début du mois : l&apos;indice, la société qui le porte ({n.compare.principale.name}, {fmtPct(n.compare.principale.weight, 1)} de la cote) et le reste de la cote.</Text>
          <CompareBase100 compare={n.compare} labels={{ indice: "Indice", reste: "Reste de la cote" }} />
        </>
      )}
      <Text style={s.small}>
        La contribution est le poids de la société multiplié par la variation de son cours sur le mois, en points d&apos;indice : une forte hausse sur une petite valeur pèse peu.
      </Text>

      <Text style={[s.p, s.b]}>3. Ce qui s&apos;est échangé</Text>
      {traded.length > 0 ? (
        <Text style={s.p}>
          {traded.length} valeur{traded.length > 1 ? "s ont" : " a"} traité sur le mois : {traded.map((l) => `${l.mnemo} (${money(l.amount)} FCFA en ${l.trades} transaction${l.trades > 1 ? "s" : ""})`).join(", ")}. Les autres lignes de la cote sont restées sans contrepartie.
        </Text>
      ) : (
        <Text style={s.p}>Aucune valeur n&apos;a traité ce mois-ci : le niveau de l&apos;indice reflète les derniers cours connus.</Text>
      )}

      <Text style={[s.p, s.b]}>4. Pour lire la note</Text>
      <Text style={s.p}>
        L&apos;indice est un indice de prix : il suit les cours, et les dividendes versés s&apos;ajoutent au rendement d&apos;un porteur. Il porte sept sociétés, dont une représente près des trois quarts de la capitalisation : quand elle bouge, l&apos;indice bouge avec elle. Entre deux échanges, il garde son dernier niveau. {texts?.portee ?? ""}
      </Text>
      <Text style={s.small}>
        Comment sont faits les chiffres. Chaque séance, on relève dans le bulletin officiel de la cote le niveau de l&apos;indice et le cours de chaque société. Le poids d&apos;une société est sa part de la capitalisation de la cote, calculée avec la page des capitalisations du même bulletin ; sa contribution est ce poids multiplié par la variation de son cours, en points d&apos;indice. Une séance sans bulletin lu reste un trou dans la courbe ; rien n&apos;est inventé pour le combler.
      </Text>
      <Text style={s.small}>
        Source : bulletin officiel de la cote de la BVMAC, séances lues par le Guichet ; calculs {COMPANY.legalName}{COMPANY.legalName.endsWith(".") ? "" : "."} Ce document présente une information de marché ; il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, ni une offre. Les performances passées ne préjugent pas des performances futures.
      </Text>
    </Letter>
  );
}
