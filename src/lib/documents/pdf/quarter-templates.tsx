import { View } from "@react-pdf/renderer";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { fillAll, type QuarterNote } from "@/lib/market/index-quarter";
import { CompareBase100, CourbeActivite, CourbeCapitalisation, PoidsBarres, teinte, tonDe } from "./charts";
import { KV, Letter, Table, Text, s } from "./primitives";

/**
 * Note trimestrielle sur l'indice, la version imprimable de la page publique :
 * mêmes sections, mêmes chiffres, mêmes dessins, dans la mise en page maison.
 * Document français : les phrases écrites des chiffres sont remplies par
 * `fillAll`, jamais traduites. Le travail en cours (rapprochements, questions
 * ouvertes avec la Bourse) reste au desk : la note ne le dit pas.
 */
const signed = (v?: number, d = 2) => {
  if (v == null) return "—";
  // une valeur qui s'arrondit à zéro ne garde pas de signe
  const r = Number(v.toFixed(d));
  return `${r > 0 ? "+" : ""}${fmtPct(r === 0 ? 0 : v, d)}`;
};
const dec = (v: number, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

const NAVY = "#0B2545";
const INK3 = "#6B7688";

/** Un titre de figure, dans le gris des étiquettes. */
function FigTitle({ children }: { children: string }) {
  return <Text style={[s.eyebrow, { marginTop: 10, marginBottom: 4 }]}>{children}</Text>;
}
function Caption({ children }: { children: string }) {
  return <Text style={[s.small, { color: INK3, marginTop: 3, marginBottom: 8 }]}>{children}</Text>;
}

export function NoteTrimestrielle({ note, texts }: { note: QuarterNote; texts?: Record<string, string> }) {
  const n = note;
  const traded = n.lines.filter((l) => l.trades > 0);
  const first = n.lines[0];
  const top = n.lines.reduce((a, l) => (Math.abs(l.points) > Math.abs(a.points) ? l : a), n.lines[0]);
  const best = [...n.lines].sort((a, b) => b.move - a.move)[0];
  const held = n.lines.filter((l) => l.holder && (l.holderPct ?? 0) >= 40).slice(0, 4);
  const flat = n.sessions - n.moved;
  const volGap = n.stats.volAll != null && n.stats.volMoved != null && Math.max(n.stats.volAll, n.stats.volMoved) / Math.max(1e-9, Math.min(n.stats.volAll, n.stats.volMoved)) >= 1.4;

  return (
    <Letter heading={`Note de marché · indice BVMAC All Share · ${n.quarter.label}`}>
      <Text style={[s.h1, { marginBottom: 8 }]}>L&apos;indice BVMAC All Share au {n.quarter.label}</Text>

      <Text style={s.p}>{fillAll(n.headline)}</Text>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 }}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 26, lineHeight: 1, color: NAVY }}>{fmt(n.level)}</Text>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: tonDe(Number(n.ret.toFixed(2))), marginBottom: 2 }}>{signed(n.ret)} sur le trimestre</Text>
      </View>

      <KV
        large
        rows={[
          ["Niveau à la fin du trimestre", `${fmt(n.level)} points (fin du trimestre précédent : ${fmt(n.levelBefore)})`],
          ["Performance du trimestre · douze mois", teinte(`${signed(n.ret)} · ${signed(n.year, 1)}`, n.ret)],
          ["Séances lues · avec mouvement", `${n.sessions} · ${n.moved} (${n.up} hausse${n.up > 1 ? "s" : ""}, ${n.down} baisse${n.down > 1 ? "s" : ""})`],
          ["Plus haut · plus bas", `${fmt(n.high.value)} le ${fmtDate(n.high.date)} · ${fmt(n.low.value)} le ${fmtDate(n.low.date)}`],
          ["Échangé sur les actions", `${money(n.amount)} FCFA · ${n.trades} transaction${n.trades > 1 ? "s" : ""} · ${fmt(n.titles)} titre${n.titles > 1 ? "s" : ""}`],
        ]}
        total={["Capitalisation de la cote · flottant coté", `${money(n.capTotal)} FCFA · ${money(n.capFloat)} (${n.capTotal ? fmtPct((n.capFloat / n.capTotal) * 100, 0) : "—"})${n.rotation != null ? ` · rotation du flottant ${fmtPct(n.rotation, 1)} sur douze mois` : ""}`]}
      />

      {/* ---------------- 1 ---------------- */}
      <Text style={[s.p, s.b]}>1. Ce que le trimestre a fait</Text>
      <Text style={s.p}>{fillAll(n.reading)}</Text>

      <View wrap={false}>
      <FigTitle>Figure 1 · Niveau de l&apos;indice, montants échangés et transactions, séance par séance</FigTitle>
      <CourbeActivite seances={n.activity} sens={n.ret} />
      <Caption>{`Plus haut ${fmt(n.high.value)} le ${fmtDate(n.high.date)}, plus bas ${fmt(n.low.value)} le ${fmtDate(n.low.date)}. ${n.sessions} séances lues, ${n.missing} jours ouvrés sans bulletin. Les barres du dessous montrent ce qui s'est échangé le même jour.`}</Caption>
      </View>

      <View wrap={false}>
        <FigTitle>Fin de mois</FigTitle>
        <Table cols={[{ label: "Mois", flex: 1.2 }, { label: "Niveau", flex: 1, right: true }, { label: "Le mois", flex: 1, right: true }]} rows={n.monthly.map((m) => [m.label, fmt(m.value), teinte(signed(m.ret, 1), m.ret)])} />
      </View>
      <Caption>{flat > 0 ? `${flat} séances sur ${n.sessions} sont restées sans mouvement : aucun cours n'a changé ce jour-là.` : "Chaque séance lue du trimestre a enregistré un mouvement."}</Caption>

      {n.movedSessions.length > 0 && (
        <>
          <FigTitle>Tableau 1 · Les séances où l&apos;indice a bougé</FigTitle>
          <Table
            cols={[{ label: "Séance", flex: 1.2 }, { label: "Variation", flex: 0.9, right: true }, { label: "Ce qui a traité", flex: 3 }]}
            rows={n.movedSessions.slice(0, 12).map((x) => [fmtDate(x.date), teinte(signed(x.variationPct), x.variationPct), x.movers || "aucun cours d'action modifié dans nos lectures"])}
          />
        </>
      )}

      {n.activity.some((a) => a.cap > 0) && (
        <View wrap={false}>
          <FigTitle>Figure 2 · Capitalisation de la cote, séance par séance</FigTitle>
          <CourbeCapitalisation seances={n.activity} />
          <Caption>La capitalisation additionne la valeur en bourse des sept sociétés (cours × nombre de titres). Elle varie avec les cours : une société qui émet de nouveaux titres la fait aussi bouger.</Caption>
        </View>
      )}

      {/* ---------------- 2 ---------------- */}
      <Text style={[s.p, s.b]} minPresenceAhead={90}>
        2. Une courbe régulière
      </Text>
      <Text style={s.p}>
        Le trimestre compte {n.sessions} séances lues, avec {n.missing} jours ouvrés seulement sans bulletin exploitable. La capitalisation de la cote atteint {money(n.capTotal)} FCFA et le repli le plus marqué du trimestre est de {signed(n.stats.drawdown, 1)}.
      </Text>
      {n.stats.volAll != null && n.stats.volMoved != null && (
        <Text style={s.p}>
          {volGap
            ? `Sur une année, les mouvements de l'indice représenteraient environ ${fmtPct(n.stats.volAll, 0)} en comptant toutes les séances, et ${fmtPct(n.stats.volMoved, 0)} en ne comptant que celles où des titres ont changé de mains. Les deux chiffres sont donnés ensemble parce que les séances sans échange tirent la première mesure vers le bas.`
            : `Sur une année, les mouvements de l'indice représenteraient environ ${fmtPct(n.stats.volAll, 0)} en comptant toutes les séances, et ${fmtPct(n.stats.volMoved, 0)} en ne comptant que celles où des titres ont changé de mains : les deux mesures se rejoignent ce trimestre.`}
        </Text>
      )}

      {/* ---------------- 3 ---------------- */}
      <Text style={[s.p, s.b]}>3. Le poids de chaque société</Text>
      {first && (
        <Text style={s.p}>
          {first.name} représente {fmtPct(first.weight, 1)} de la capitalisation de la cote, les autres sociétés se partagent le reste : quand {first.name} bouge, l&apos;indice bouge avec elle.
        </Text>
      )}
      {n.compare && (
        <View wrap={false}>
          <FigTitle>Figure 3 · L&apos;indice, la société qui le porte et le reste de la cote, à 100 au début du trimestre</FigTitle>
          <CompareBase100 compare={n.compare} labels={{ indice: "Indice", reste: "Reste de la cote" }} />
          <Caption>{`${n.compare.principale.name} pèse ${fmtPct(n.compare.principale.weight, 1)} de la cote. À 100 au début du trimestre, l'indice finit à ${dec(n.compare.indice[n.compare.indice.length - 1], 1)}, ${n.compare.principale.name} à ${dec(n.compare.principale.serie[n.compare.principale.serie.length - 1], 1)} et le reste de la cote à ${dec(n.compare.reste[n.compare.reste.length - 1], 1)}.`}</Caption>
        </View>
      )}
      <View wrap={false}>
        <FigTitle>Figure 4 · Le poids de chaque société, sur le capital global et sur le flottant coté</FigTitle>
        <PoidsBarres lignes={n.lines} />
      </View>
      <Table
        cols={[{ label: "Société", flex: 1.6 }, { label: "Capital global", flex: 1, right: true }, { label: "Flottant coté", flex: 1, right: true }, { label: "Apport au trimestre", flex: 1.2, right: true }]}
        rows={n.lines.map((l) => [l.mnemo, fmtPct(l.weight, 1), fmtPct(l.weightFloat, 1), teinte(`${l.points > 0 ? "+" : ""}${dec(l.points, 2)} pt`, l.points)])}
      />
      <Caption>
        {top && best && best.mnemo !== top.mnemo
          ? `Le flottant est la part du capital d'une société qui circule en bourse : c'est celle que l'on peut acheter. La plus forte hausse n'est pas la plus forte contribution : ${best.name} gagne ${signed(best.move, 1)} mais pèse ${fmtPct(best.weight, 1)}, quand ${top.name} pèse ${fmtPct(top.weight, 1)}.`
          : "Le flottant est la part du capital d'une société qui circule en bourse : c'est celle que l'on peut acheter. L'apport d'une société est son poids en début de période multiplié par la variation de son cours."}
      </Caption>

      {/* ---------------- 4 ---------------- */}
      <Text style={[s.p, s.b]} minPresenceAhead={90}>
        4. Les sept sociétés de la cote
      </Text>
      <Text style={s.p}>Sept sociétés d&apos;exploitation composent la cote : elles emploient, produisent et distribuent des dividendes dans la région.</Text>
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
        rows={n.lines.map((l) => [`${l.mnemo} · ${l.name}`, l.sector, l.country, fmt(l.price), l.yield != null ? fmtPct(l.yield, 1) : "—", fmtPct(l.weight, 1), fmtPct(l.floatShare, 0), teinte(signed(l.move, 1), l.move)])}
        total={["Ensemble de la cote", "", "", "", "", "100 %", n.capTotal ? fmtPct((n.capFloat / n.capTotal) * 100, 0) : "—", teinte(signed(n.ret, 1), n.ret)]}
      />
      <Text style={s.small}>
        Par secteur : {n.bySector.map((g) => `${g.label} ${fmtPct(g.pct, 1)}`).join(" · ")}. Par pays : {n.byCountry.map((g) => `${g.label} ${fmtPct(g.pct, 1)}`).join(" · ")}.
      </Text>
      <Text style={s.p}>
        Par secteur, la finance représente {fmtPct(n.financePct, 1)} de la capitalisation. Par pays, {n.byCountry[0]?.label ?? "—"} en représente {fmtPct(n.byCountry[0]?.pct ?? 0, 1)}.
      </Text>
      {held.length > 0 && (
        <Text style={s.p}>
          Le flottant est réduit parce que des actionnaires stables gardent leurs titres : {held.map((l) => `${l.holder} de ${l.name}`).join(" · ")}.
        </Text>
      )}

      {/* ---------------- 5 ---------------- */}
      <Text style={[s.p, s.b]}>5. Ce qui s&apos;est échangé</Text>
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
      <Text style={s.p}>
        La rotation du flottant est la part des titres disponibles qui a changé de mains en un an : elle ressort à {n.rotation != null ? fmtPct(n.rotation, 1) : "—"} sur l&apos;ensemble de la cote. En pratique, une position se construit et se défait sur plusieurs semaines, avec un ordre à cours limité ; le cours affiché n&apos;est pas un prix de sortie garanti.
        {n.trades > 0 ? ` La transaction moyenne du trimestre porte sur ${money(n.amount / n.trades)} FCFA.` : ""}
      </Text>

      {/* ---------------- 6 ---------------- */}
      <Text style={[s.p, s.b]} minPresenceAhead={90}>
        6. Comment lire l&apos;indice
      </Text>
      <Text style={s.p}>
        <Text style={s.b}>Un indice de prix</Text> : il suit les cours ; les dividendes versés s&apos;ajoutent au rendement d&apos;un porteur.
      </Text>
      <Text style={s.p}>
        <Text style={s.b}>Un niveau qui tient entre deux échanges</Text> : {flat} séances du trimestre sont restées sans mouvement ; l&apos;indice garde alors son dernier niveau.
      </Text>
      <Text style={s.p}>
        <Text style={s.b}>Un repère, pas un portefeuille</Text> : pour suivre la cote, on regarde l&apos;indice ; pour investir, on choisit des lignes.
      </Text>

      {/* ---------------- 7 ---------------- */}
      <Text style={[s.p, s.b]}>7. Pour aller plus loin</Text>
      <Text style={s.p}>
        Pour suivre le coût de l&apos;argent dans la région, deux séries complètent l&apos;indice et sont déjà dans le Guichet : les adjudications du Trésor, chaque semaine, avec leurs taux, et les valeurs liquidatives des OPCVM, publiées à chaque bulletin. {texts?.portee ?? ""}
      </Text>

      {/* ---------------- fiche technique et méthode ---------------- */}
      <View wrap={false}>
        <Text style={[s.p, s.b]}>Fiche technique</Text>
        <KV
          rows={[
            ["Séances lues · dont sans mouvement", `${n.sessions} · ${flat}`],
            ["Première séance · dernière séance", `${fmtDate(n.quarter.from)} · ${fmtDate(n.quarter.to)}`],
            ["Plus haut · plus bas", `${fmt(n.high.value)} · ${fmt(n.low.value)}`],
            ["Repli maximal", `${signed(n.stats.drawdown, 2)}${n.stats.drawdownFrom && n.stats.drawdownTo ? ` (du ${fmtDate(n.stats.drawdownFrom)} au ${fmtDate(n.stats.drawdownTo)})` : ""}`],
            ["Variation moyenne · écart-type", `${signed(n.stats.avg, 2)} · ${fmtPct(n.stats.sd, 2)}`],
            ["Variabilité annualisée", n.stats.volAll != null && n.stats.volMoved != null ? `${fmtPct(n.stats.volAll, 0)} (toutes séances) · ${fmtPct(n.stats.volMoved, 0)} (séances avec mouvement)` : "—"],
            ["Capital global · flottant coté · part flottante", `${money(n.capTotal)} · ${money(n.capFloat)} · ${n.capTotal ? fmtPct((n.capFloat / n.capTotal) * 100, 1) : "—"}`],
          ]}
        />
      </View>

      <View wrap={false}>
      <Text style={s.small}>
        Comment sont faits les chiffres. Chaque séance, on relève dans le bulletin officiel de la cote le niveau de l&apos;indice et le cours de chaque société. Le poids d&apos;une société est sa part de la capitalisation de la cote : on le calcule avec la page des capitalisations du même bulletin (cours × nombre de titres). Sa contribution est ce poids multiplié par la variation de son cours : une petite société qui monte beaucoup pèse peu sur l&apos;indice. Une séance sans bulletin lu reste un trou dans la courbe ; rien n&apos;est inventé pour le combler.
      </Text>

      <Text style={s.small}>
        Source : bulletin officiel de la cote de la BVMAC, séances lues à chaque parution ; calculs {COMPANY.legalName}{COMPANY.legalName.endsWith(".") ? "" : "."} Limites : l&apos;historique commence au premier bulletin lu, et non à la date de base de l&apos;indice.{" "}
        {" "}Ce document présente une information de marché ; il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, ni une offre. Les performances passées ne préjugent pas des performances futures.
      </Text>
      </View>
    </Letter>
  );
}
