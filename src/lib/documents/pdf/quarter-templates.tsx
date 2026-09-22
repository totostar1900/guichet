import { Circle, G, Line, Polyline, Rect, Svg, View } from "@react-pdf/renderer";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { fillAll, type QuarterLine, type QuarterNote } from "@/lib/market/index-quarter";
import { KV, Letter, Table, Text, s } from "./primitives";

/**
 * Note trimestrielle sur l'indice, la version imprimable de la page publique :
 * mêmes sections, mêmes chiffres, mêmes dessins, dans la mise en page maison.
 * Document français : les phrases écrites des chiffres sont remplies par
 * `fillAll`, jamais traduites. Le détail interne (les séances qui ne se
 * reconstituent pas) reste au desk ; la note n'en dit qu'une ligne.
 */
const signed = (v?: number, d = 2) => {
  if (v == null) return "—";
  // une valeur qui s'arrondit à zéro ne garde pas de signe
  const r = Number(v.toFixed(d));
  return `${r > 0 ? "+" : ""}${fmtPct(r === 0 ? 0 : v, d)}`;
};
const dec = (v: number, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

const NAVY = "#0B2545";
const GOLD = "#B07F15";
const GOOD = "#1E7F4F";
const WARN = "#B4600A";
const LINE = "#D7DDE7";
const INK3 = "#6B7688";

/** Un titre de figure, dans le gris des étiquettes. */
function FigTitle({ children }: { children: string }) {
  return <Text style={[s.eyebrow, { marginTop: 10, marginBottom: 4 }]}>{children}</Text>;
}
function Caption({ children }: { children: string }) {
  return <Text style={[s.small, { color: INK3, marginTop: 3, marginBottom: 8 }]}>{children}</Text>;
}

/** La courbe de l'indice sur les séances du trimestre. */
function Curve({ note }: { note: QuarterNote }) {
  const pts = note.points;
  if (pts.length < 2) return null;
  const W = 480;
  const H = 120;
  const L = 34;
  const R = 6;
  const T = 8;
  const B = 16;
  const vals = pts.map((p) => p.value);
  const lo = Math.min(...vals) * 0.997;
  const hi = Math.max(...vals) * 1.003;
  const x = (i: number) => L + (i / (pts.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - T - B);
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      <G>
        {[lo, (lo + hi) / 2, hi].map((v, k) => (
          <Line key={k} x1={L} x2={W - R} y1={y(v)} y2={y(v)} strokeWidth={0.6} stroke={LINE} />
        ))}
        <Polyline points={line} fill="none" stroke={NAVY} strokeWidth={1.4} />
        {pts.map((p, i) => (p.variationPct !== 0 ? <Circle key={p.date} cx={x(i)} cy={y(p.value)} r={1.6} fill={p.variationPct > 0 ? GOOD : WARN} /> : null))}
      </G>
    </Svg>
  );
}

/** Le poids de chaque société, sur le capital global puis sur le flottant. */
function Weights({ lines }: { lines: QuarterLine[] }) {
  if (lines.length === 0) return null;
  const W = 480;
  const L = 6;
  const R = 56;
  const rowH = 17;
  const H = rowH * lines.length + 6;
  const max = Math.max(10, ...lines.map((l) => Math.max(l.weight, l.weightFloat)));
  const top = Math.ceil(max / 20) * 20;
  const x = (v: number) => L + (v / top) * (W - L - R);
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      <G>
        {lines.map((l, i) => {
          const yTop = rowH * i + 3;
          return (
            <G key={l.mnemo}>
              <Rect x={L} y={yTop} width={Math.max(1, x(l.weight) - L)} height={5.5} fill={NAVY} />
              <Rect x={L} y={yTop + 7} width={Math.max(1, x(l.weightFloat) - L)} height={5.5} fill={GOLD} />
            </G>
          );
        })}
      </G>
    </Svg>
  );
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
      <Text style={s.h1}>L&apos;indice BVMAC All Share au {n.quarter.label}</Text>
      <Text style={s.ref}>
        {n.number} · {COMPANY.legalName}, {COMPANY.licence} · séances du {fmtDate(n.quarter.from)} au {fmtDate(n.quarter.to)}
      </Text>

      <Text style={s.p}>{fillAll(n.headline)}</Text>

      <KV
        rows={[
          ["Niveau à la fin du trimestre", `${fmt(n.level)} points (fin du trimestre précédent : ${fmt(n.levelBefore)})`],
          ["Performance du trimestre · douze mois", `${signed(n.ret)} · ${signed(n.year, 1)}`],
          ["Séances lues · avec mouvement", `${n.sessions} · ${n.moved} (${n.up} hausse${n.up > 1 ? "s" : ""}, ${n.down} baisse${n.down > 1 ? "s" : ""})`],
          ["Plus haut · plus bas", `${fmt(n.high.value)} le ${fmtDate(n.high.date)} · ${fmt(n.low.value)} le ${fmtDate(n.low.date)}`],
          ["Échangé sur les actions", `${money(n.amount)} FCFA · ${n.trades} transaction${n.trades > 1 ? "s" : ""} · ${fmt(n.titles)} titre${n.titles > 1 ? "s" : ""}`],
        ]}
        total={["Capitalisation de la cote · flottant coté", `${money(n.capTotal)} FCFA · ${money(n.capFloat)} (${n.capTotal ? fmtPct((n.capFloat / n.capTotal) * 100, 0) : "—"})${n.rotation != null ? ` · rotation du flottant ${fmtPct(n.rotation, 1)} sur douze mois` : ""}`]}
      />

      {/* ---------------- 1 ---------------- */}
      <Text style={[s.p, s.b]}>1. Ce que le trimestre a fait</Text>
      <Text style={s.p}>{fillAll(n.reading)}</Text>

      <FigTitle>Figure 1 · Niveau de l&apos;indice, séance par séance</FigTitle>
      <Curve note={n} />
      <Caption>{`Un point marque une séance où l'indice a bougé : vert à la hausse, orange à la baisse. Plus haut ${fmt(n.high.value)} le ${fmtDate(n.high.date)}, plus bas ${fmt(n.low.value)} le ${fmtDate(n.low.date)}. ${n.sessions} séances lues, ${n.missing} jours ouvrés sans bulletin.`}</Caption>

      <FigTitle>Fin de mois</FigTitle>
      <Table cols={[{ label: "Mois", flex: 1.2 }, { label: "Niveau", flex: 1, right: true }, { label: "Le mois", flex: 1, right: true }]} rows={n.monthly.map((m) => [m.label, fmt(m.value), signed(m.ret, 1)])} />
      <Caption>{flat > 0 ? `${flat} séances du trimestre sur ${n.sessions} n'ont enregistré aucun mouvement : sur cette cote, l'absence de transaction est le régime ordinaire.` : "Chaque séance lue du trimestre a enregistré un mouvement."}</Caption>

      {n.movedSessions.length > 0 && (
        <>
          <FigTitle>Tableau 1 · Les séances où l&apos;indice a bougé</FigTitle>
          <Table
            cols={[{ label: "Séance", flex: 1.2 }, { label: "Variation", flex: 0.9, right: true }, { label: "Ce qui a traité", flex: 3 }]}
            rows={n.movedSessions.slice(0, 12).map((x) => [fmtDate(x.date), signed(x.variationPct), x.movers || "aucun cours d'action modifié dans nos lectures"])}
          />
        </>
      )}

      {/* ---------------- 2 ---------------- */}
      <Text style={[s.p, s.b]} break>
        2. Ce que cet indice fait bien
      </Text>
      <Text style={s.p}>
        Trois choses jouent en sa faveur. Il existe et se publie à chaque séance, ce qui n&apos;est pas acquis sur une place jeune : {n.sessions} séances lues sur le trimestre, {n.missing} jours ouvrés seulement sans bulletin exploitable. Il repose sur une capitalisation substantielle, {money(n.capTotal)} FCFA. Et sa trajectoire paraît peu heurtée : le repli le plus marqué du trimestre est de {signed(n.stats.drawdown, 1)}.
      </Text>
      <Text style={s.p}>Cette dernière qualité demande une nuance, et elle est au cœur de la lecture : une valeur qui ne s&apos;échange pas ne baisse pas. Le calme apparent de la courbe tient autant à la rareté des transactions qu&apos;à la stabilité des sociétés.</Text>
      {n.stats.volAll != null && n.stats.volMoved != null && (
        <Text style={s.p}>
          {volGap
            ? `La mesure honnête tient dans deux chiffres plutôt qu'un : la variabilité annualisée ressort à ${fmtPct(n.stats.volAll, 0)} en comptant toutes les séances, et à ${fmtPct(n.stats.volMoved, 0)} en ne comptant que celles où le marché a réellement traité. L'écart entre les deux mesure l'étroitesse de cette cote.`
            : `La variabilité annualisée ressort à ${fmtPct(n.stats.volAll, 0)} en comptant toutes les séances, et à ${fmtPct(n.stats.volMoved, 0)} en ne comptant que celles où le marché a réellement traité. Les deux mesures se rejoignent ce trimestre : les séances sans transaction n'ont pas masqué de mouvement.`}
        </Text>
      )}

      {/* ---------------- 3 ---------------- */}
      <Text style={[s.p, s.b]}>3. Le point à connaître : la concentration</Text>
      {first && (
        <Text style={s.p}>
          {first.name} représente {fmtPct(first.weight, 1)} de la capitalisation de la cote. Les autres sociétés se partagent le reste. Dire « le marché monte » revient, le plus souvent, à dire « {first.name} monte ».
        </Text>
      )}
      <FigTitle>Figure 2 · Le poids de chaque société : capital global (bleu), flottant coté (or)</FigTitle>
      <Weights lines={n.lines} />
      <Table
        cols={[{ label: "Société", flex: 1.6 }, { label: "Capital global", flex: 1, right: true }, { label: "Flottant coté", flex: 1, right: true }, { label: "Apport au trimestre", flex: 1.2, right: true }]}
        rows={n.lines.map((l) => [l.mnemo, fmtPct(l.weight, 1), fmtPct(l.weightFloat, 1), `${l.points > 0 ? "+" : ""}${dec(l.points, 2)} pt`])}
      />
      <Caption>
        {top && best && best.mnemo !== top.mnemo
          ? `Le flottant rééquilibre : ce que l'on peut réellement acheter n'a pas la forme de ce que l'indice mesure. Et la meilleure variation n'est pas la meilleure contribution : ${best.name} gagne ${signed(best.move, 1)} mais pèse ${fmtPct(best.weight, 1)}, quand ${top.name} pèse ${fmtPct(top.weight, 1)}. C'est le poids, pas la performance, qui fait l'indice.`
          : "Le flottant rééquilibre : ce que l'on peut réellement acheter n'a pas la forme de ce que l'indice mesure. L'apport d'une société est son poids en début de période multiplié par la variation de son cours, à poids constants."}
      </Caption>

      {/* ---------------- 4 ---------------- */}
      <Text style={[s.p, s.b]} break>
        4. Les sept sociétés derrière le chiffre
      </Text>
      <Text style={s.p}>Un indice de sept lignes se lit d&apos;abord comme une liste d&apos;entreprises : des sociétés d&apos;exploitation qui emploient, produisent et distribuent des dividendes dans la région.</Text>
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
      <Text style={s.p}>
        Deux traits ressortent. Par secteur, la finance représente {fmtPct(n.financePct, 1)} de la capitalisation : l&apos;indice est, pour l&apos;essentiel, un baromètre bancaire. Par pays, {n.byCountry[0]?.label ?? "—"} en représente {fmtPct(n.byCountry[0]?.pct ?? 0, 1)} ; acheter « le marché régional » revient surtout à acheter cette économie-là.
      </Text>
      {held.length > 0 && (
        <Text style={s.p}>
          Le flottant réduit vient d&apos;une structure d&apos;actionnariat que la cote ne corrige pas seule : {held.map((l) => `${l.holder} de ${l.name}`).join(" · ")}. Le marché est étroit parce que les maisons mères et les États gardent leurs titres, non parce que l&apos;épargne régionale se détourne des actions.
        </Text>
      )}

      {/* ---------------- 5 ---------------- */}
      <Text style={[s.p, s.b]}>5. Ce qui s&apos;est échangé, et ce que cela change pour vous</Text>
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
        La rotation du flottant mesure la part des titres disponibles qui a changé de mains en un an. Sur l&apos;ensemble de la cote elle ressort à {n.rotation != null ? fmtPct(n.rotation, 1) : "—"} : c&apos;est le trait d&apos;un marché jeune, où les actionnaires sont des porteurs de long terme, et c&apos;est la contrainte à connaître avant d&apos;acheter.
        {n.trades > 0 ? ` La transaction moyenne du trimestre porte sur ${money(n.amount / n.trades)} FCFA, ce qui montre un marché qui fonctionne par blocs négociés plutôt que par flux continu.` : ""}
      </Text>

      {/* ---------------- 6 ---------------- */}
      <Text style={[s.p, s.b]} break>
        6. Ce que l&apos;indice mesure, et ce qu&apos;il ne mesure pas
      </Text>
      <Text style={s.p}>
        <Text style={s.b}>C&apos;est un indice de prix</Text> : les dividendes n&apos;y sont pas. Sur cette cote ils font une part importante du rendement d&apos;un porteur ; comparer sa performance à l&apos;indice, c&apos;est se sous-estimer.
      </Text>
      <Text style={s.p}>
        <Text style={s.b}>Ce n&apos;est pas une mesure d&apos;activité</Text> : {flat} séances du trimestre n&apos;ont enregistré aucun mouvement. Sans transaction, le cours de référence ne bouge pas et l&apos;indice non plus.
      </Text>
      <Text style={s.p}>
        <Text style={s.b}>Ce n&apos;est pas un portefeuille</Text> : reproduire sa composition supposerait d&apos;acheter une proportion de la première valeur que le flottant disponible ne permet pas.
      </Text>
      <Text style={s.p}>
        <Text style={s.b}>Ce n&apos;est pas un repère de risque</Text> : la variabilité mesurée dépend de ce que l&apos;on compte, toutes les séances lues ou seulement celles où le marché a traité. Un seul chiffre de risque serait donc trompeur sur cette cote.
      </Text>

      {/* ---------------- 7 ---------------- */}
      <Text style={[s.p, s.b]}>7. Ce que l&apos;indice dit, et ne dit pas, de l&apos;économie de la région</Text>
      <Text style={s.p}>La tentation est forte de lire cet indice comme un baromètre de la CEMAC ou du Cameroun. La raison de s&apos;en garder est arithmétique plutôt que doctrinale.</Text>
      <Text style={s.p}>
        Un baromètre suppose un échantillon et des observations. Ici l&apos;échantillon est de sept sociétés, dont une porte une large part du poids et le secteur financier {fmtPct(n.financePct, 1)} ; les observations utiles du trimestre sont les {n.moved} séances où un prix a bougé. Une série aussi courte et aussi concentrée ne porte pas de conclusion sur la croissance, l&apos;inflation ou le pétrole.
      </Text>
      <Text style={s.p}>
        Ce que l&apos;indice dit réellement tient en trois points, et ils ont leur valeur : le niveau de prix du segment coté, utile pour situer une souscription ; l&apos;état d&apos;avancement du marché lui-même, mesuré par le nombre d&apos;émetteurs, la taille du flottant et la rotation ; et la concentration du risque, qui est une information de gouvernance autant que de marché.
      </Text>
      <Text style={s.p}>
        Pour lire l&apos;économie de la zone, deux séries voisines sont plus solides, et le Guichet les porte déjà : le marché des titres publics, où une seule adjudication du Trésor porte sur des montants sans commune mesure avec les échanges d&apos;actions d&apos;une année entière, avec des taux et une fréquence hebdomadaire ; et les valeurs liquidatives des OPCVM, publiées elles aussi à chaque bulletin. Ce sont elles qui portent le signal du coût de l&apos;argent dans la région.
      </Text>
      <Text style={[s.p, s.b]}>Ce qui ferait de cet indice un vrai baromètre</Text>
      <Text style={s.p}>
        <Text style={s.b}>Des émetteurs</Text> : une dizaine de sociétés d&apos;au moins trois secteurs non financiers changerait la nature de l&apos;indice. <Text style={s.b}>Du flottant</Text> : les cessions partielles d&apos;États et de maisons mères sont le levier immédiat, et elles se décident hors marché. <Text style={s.b}>Un indice de rendement global</Text> : publié à côté de l&apos;indice de prix, dividendes réinvestis, qui est la mesure que regarde un épargnant. <Text style={s.b}>Une méthodologie publique</Text> : base, diviseur, traitement des jours sans cotation et des détachements de dividende.
      </Text>
      <Text style={s.p}>
        Ces conditions ne relèvent pas d&apos;un intermédiaire, mais elles décrivent ce que nous pouvons accompagner : amener l&apos;épargne vers le marché, expliquer honnêtement ce qu&apos;elle y trouve, et ne jamais laisser croire qu&apos;un chiffre porte plus de sens qu&apos;il n&apos;en contient. {texts?.portee ?? ""}
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

      <View style={s.box} wrap={false}>
        <Text style={[s.small, s.b]}>Méthode</Text>
        <Text style={s.small}>
          Le niveau et la variation de chaque séance viennent du bloc « indice » du bulletin officiel de la cote, relevés sans retraitement. Les poids sont calculés à partir de la page des capitalisations du même bulletin : cours de clôture multiplié par le nombre de titres, sur le capital global puis sur le flottant coté. L&apos;apport d&apos;une société est le produit de son poids en début de période par la variation de son cours, à poids constants. La variabilité annualisée est l&apos;écart-type des variations de séance rapporté à l&apos;année, une fois sur toutes les séances, une fois sur les seules séances avec mouvement. Aucune valeur n&apos;est interpolée : une séance sans bulletin lu est un trou, pas une ligne plate.
        </Text>
      </View>

      <Text style={s.small}>
        Source : bulletin officiel de la cote de la BVMAC, séances lues à chaque parution ; calculs {COMPANY.legalName}. Limites : l&apos;historique commence au premier bulletin lu, et non à la date de base de l&apos;indice.{" "}
        {n.methodOpen ? "La méthodologie de l'indice (base, date de base, règle de pondération) est en cours de confirmation auprès de la BVMAC." : "Les variations publiées se reconstituent avec les cours et les poids du même bulletin."} Ce document présente une information de marché ; il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, ni une offre. Les performances passées ne préjugent pas des performances futures.
      </Text>
    </Letter>
  );
}
