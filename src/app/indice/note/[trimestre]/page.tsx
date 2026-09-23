import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { indexPageData } from "@/lib/market/index-data";
import { quarterNote, quarters } from "@/lib/market/index-quarter";
import { quarterNeighbours } from "@/lib/market/quarter-glance";
import { getT } from "@/i18n/server";
import { BackToTop } from "@/components/BackToTop";
import { MarketStrip } from "@/components/MarketStrip";
import { PageOutline } from "@/components/PageOutline";
import { QuarterStepper } from "@/components/QuarterStepper";
import { ContribBars, IndexCurve, MonthBars, WeightBars } from "./Figures";
import styles from "./note.module.css";

export const dynamic = "force-dynamic";

const signed = (v?: number, d = 2) => {
  if (v == null) return "—";
  // a value that rounds to zero keeps no sign: "-0,0 %" reads as a fall that did not happen
  const r = Number(v.toFixed(d));
  return `${r > 0 ? "+" : ""}${fmtPct(r === 0 ? 0 : v, d)}`;
};

export async function generateMetadata({ params }: { params: Promise<{ trimestre: string }> }) {
  const [{ trimestre }, t] = await Promise.all([params, getT()]);
  const note = await quarterNote(trimestre.toUpperCase());
  if (!note) return { title: t("Note trimestrielle") };
  const q = t(note.quarter.q === 1 ? "1er trimestre {y}" : "{n}e trimestre {y}", { n: note.quarter.q, y: note.quarter.year });
  return { title: t("L'indice BVMAC au {q}", { q }) };
}

/**
 * The quarterly note on the index, public and written for a client: what the
 * quarter did, the companies behind the number, what can be traded, what the
 * index measures and what it does not, and what would make it a real barometer.
 * Computed from that quarter's sessions only, so a published quarter reads the
 * same a year later. The reconciliation of published variations stays at the
 * desk: the note says in one line that the methodology is being confirmed.
 */
export default async function QuarterNotePage({ params }: { params: Promise<{ trimestre: string }> }) {
  const [{ trimestre }, t] = await Promise.all([params, getT()]);
  const data = await indexPageData();
  const list = quarters(data, true);
  const note = await quarterNote(trimestre.toUpperCase(), data);
  if (!note) notFound();
  const n = note;
  const traded = n.lines.filter((l) => l.trades > 0);
  const first = n.lines[0];
  const top = n.lines.reduce((a, l) => (Math.abs(l.points) > Math.abs(a.points) ? l : a), n.lines[0]);
  const best = [...n.lines].sort((a, b) => b.move - a.move)[0];
  const held = n.lines.filter((l) => l.holder && (l.holderPct ?? 0) >= 40).slice(0, 4);
  const share = (pct: number) => `${Math.max(0, Math.min(100, pct))}%`;
  /** The note writes its sentences as keys and values: they read in the visitor's language. */
  const qlabel = (q: { q: number; year: number }) => t(q.q === 1 ? "1er trimestre {y}" : "{n}e trimestre {y}", { n: q.q, y: q.year });
  const say = (ss: { key: string; vars?: Record<string, string | number> }[]) =>
    ss.map((x) => t(x.key, x.vars?.q === n.quarter.label ? { ...x.vars, q: qlabel(n.quarter) } : x.vars)).join(" ");
  const shortDate = (d: string) => fmtDate(d, false);
  const closed = quarters(data);
  const { older, newer } = quarterNeighbours(closed, n.quarter.key);
  const stepper = <QuarterStepper older={older} newer={newer} current={n.quarter} total={closed.length} />;
  const flat = n.sessions - n.moved;
  // the two volatilities only tell a story when they actually part ways
  const volGap =
    n.stats.volAll != null && n.stats.volMoved != null && Math.max(n.stats.volAll, n.stats.volMoved) / Math.max(1e-9, Math.min(n.stats.volAll, n.stats.volMoved)) >= 1.4;

  return (
    <article className={styles.sheet}>
      <header className={styles.masthead}>
        <span className={styles.house}>
          {COMPANY.name} · {t("Note de marché")}
        </span>
        <span className={styles.meta}>
          {n.number} · {t("trimestriel")} · {t("séances du {a} au {b}", { a: fmtDate(n.quarter.from), b: fmtDate(n.quarter.to) })}
        </span>
      </header>

      <h1 className={styles.title}>{t("L'indice BVMAC All Share au {q}", { q: qlabel(n.quarter) })}</h1>
      <p className={styles.stand}>{say(n.headline)}</p>
      <p className={styles.byline}>
        {t("Lecture des bulletins officiels de la cote ; calculs {c}", { c: COMPANY.legalName })} · <Link href="/indice">{t("la page de l'indice, mise à jour à chaque séance")}</Link>
      </p>

      <dl className={styles.fiche}>
        <div>
          <dt>{t("Niveau")}</dt>
          <dd>{fmt(n.level)}</dd>
          <small>{t("au {d}", { d: fmtDate(n.quarter.to) })}</small>
        </div>
        <div>
          <dt>{t("Le trimestre")}</dt>
          <dd className={n.ret > 0 ? styles.up : n.ret < 0 ? styles.down : ""}>{signed(n.ret)}</dd>
          <small>
            {t("douze mois")} {signed(n.year, 1)}
          </small>
        </div>
        <div>
          <dt>{t("Séances avec mouvement")}</dt>
          <dd>
            {n.moved} / {n.sessions}
          </dd>
          <small>
            {n.up} {t("hausses")} · {n.down} {t("baisses")}
          </small>
        </div>
        <div>
          <dt>{t("Échangé")}</dt>
          <dd>{money(n.amount)}</dd>
          <small>
            FCFA · {n.trades} {t("transactions")}
          </small>
        </div>
        <div>
          <dt>{t("Capitalisation")}</dt>
          <dd>{money(n.capTotal)}</dd>
          <small>
            {t("flottant coté")} {money(n.capFloat)}
          </small>
        </div>
        <div>
          <dt>{t("Rotation du flottant")}</dt>
          <dd>{n.rotation != null ? fmtPct(n.rotation, 1) : "—"}</dd>
          <small>{t("sur douze mois")}</small>
        </div>
      </dl>

      <div className={styles.cols}>
        {/* la colonne de gauche porte la navigation du document : ou on en est, et ou aller ensuite */}
        <div className={styles.lnav}>
          <PageOutline
            label={t("Sommaire")}
            sections={[
              { id: "trimestre", title: t("Le trimestre") },
              { id: "atouts", title: t("Ce que l'indice fait bien") },
              { id: "concentration", title: t("La concentration") },
              { id: "societes", title: t("Les sociétés") },
              { id: "negoce", title: t("Le négoce") },
              { id: "mesure", title: t("Ce qu'il mesure") },
              { id: "economie", title: t("L'indice et l'économie") },
            ]}
            foot={stepper}
          />
          <div className={styles.docs}>
            <div className={styles.acts}>
              <a className="btn primary" href={`/indice/note/${n.quarter.key.toLowerCase()}/pdf`} target="_blank" rel="noreferrer">
                {t("Télécharger en PDF")}
              </a>
              <Link className="btn ghost" href="/indice">
                {t("La page de l'indice")}
              </Link>
              <Link className="btn ghost" href="/info/indice-bvmac">
                {t("Comment lire l'indice")}
              </Link>
            </div>
            <div className={styles.others}>
              <span>{t("Les autres trimestres")}</span>
              {stepper}
            </div>
          </div>
        </div>
        <main>
          <section id="trimestre">
            <h2>
              <span className={styles.n}>01</span> {t("Ce que le trimestre a fait")}
            </h2>
            <p className={styles.lede}>{say(n.reading)}</p>

            <figure className={styles.figure}>
              <div className={styles.figtitle}>{t("Figure 1 · Niveau de l'indice, séance par séance")}</div>
              <IndexCurve note={n} dateOf={shortDate} peakLabel={n.peak ? `${shortDate(n.peak.date)} : ${signed(n.peak.variationPct, 1)}` : undefined} />
              <figcaption>
                {t("Un point coloré marque une séance où l'indice a bougé : vert à la hausse, orange à la baisse. Entre deux points, le niveau tient parce qu'aucune transaction n'a modifié un cours de référence.")}{" "}
                {t("Plus haut {h} le {hd} · plus bas {l} le {ld} · {m} séances lues, {x} sans bulletin", { h: fmt(n.high.value), hd: fmtDate(n.high.date), l: fmt(n.low.value), ld: fmtDate(n.low.date), m: String(n.sessions), x: String(n.missing) })}
              </figcaption>
            </figure>

            <figure className={styles.figure}>
              <div className={styles.figtitle}>{t("Figure 2 · Ce que chaque mois a donné")}</div>
              <MonthBars monthly={n.monthly} label={(k) => t(k)} />
              <figcaption>
                {flat > 0
                  ? t("{f} séances du trimestre sur {m} n'ont enregistré aucun mouvement : sur cette cote, l'absence de transaction est le régime ordinaire, et un mois plat ne veut pas dire un mois sans valeur.", { f: String(flat), m: String(n.sessions) })
                  : t("Chaque séance lue du trimestre a enregistré un mouvement.")}
              </figcaption>
            </figure>

            {n.movedSessions.length > 0 && (
              <div className={styles.tw}>
                <table>
                  <caption className={styles.figtitle}>{t("Tableau 1 · Les séances où l'indice a bougé")}</caption>
                  <thead>
                    <tr>
                      <th>{t("Séance")}</th>
                      <th className={styles.num}>{t("Variation")}</th>
                      <th>{t("Ce qui a traité")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {n.movedSessions.slice(0, 12).map((s) => (
                      <tr key={s.date}>
                        <td>{fmtDate(s.date)}</td>
                        <td className={`${styles.num} ${s.variationPct > 0 ? styles.up : styles.down}`}>{signed(s.variationPct)}</td>
                        <td>{s.movers || t("aucun cours d'action modifié dans nos lectures")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="atouts">
            <h2>
              <span className={styles.n}>02</span> {t("Ce que cet indice fait bien")}
            </h2>
            <p>
              {t("Trois choses jouent en sa faveur. Il existe et se publie à chaque séance, ce qui n'est pas acquis sur une place jeune : {m} séances lues sur le trimestre, {x} jours ouvrés seulement sans bulletin exploitable. Il repose sur une capitalisation substantielle, {c} FCFA. Et sa trajectoire paraît peu heurtée : le repli le plus marqué du trimestre est de {d}.", {
                m: String(n.sessions),
                x: String(n.missing),
                c: money(n.capTotal),
                d: signed(n.stats.drawdown, 1),
              })}
            </p>
            <p>{t("Cette dernière qualité demande une nuance, et elle est au cœur de la lecture : une valeur qui ne s'échange pas ne baisse pas. Le calme apparent de la courbe tient autant à la rareté des transactions qu'à la stabilité des sociétés.")}</p>
            {n.stats.volAll != null && n.stats.volMoved != null && (
              <p>
                {volGap
                  ? t("La mesure honnête tient dans deux chiffres plutôt qu'un : la variabilité annualisée ressort à {a} en comptant toutes les séances, et à {b} en ne comptant que celles où le marché a réellement traité. L'écart entre les deux mesure l'étroitesse de cette cote.", { a: fmtPct(n.stats.volAll, 0), b: fmtPct(n.stats.volMoved, 0) })
                  : t("La variabilité annualisée ressort à {a} en comptant toutes les séances, et à {b} en ne comptant que celles où le marché a réellement traité. Les deux mesures se rejoignent ce trimestre : les séances sans transaction n'ont pas masqué de mouvement.", { a: fmtPct(n.stats.volAll, 0), b: fmtPct(n.stats.volMoved, 0) })}
              </p>
            )}
          </section>

          <section id="concentration">
            <h2>
              <span className={styles.n}>03</span> {t("Le point à connaître : la concentration")}
            </h2>
            {first && (
              <p className={styles.lede}>
                {t("{m} représente {w} de la capitalisation de la cote. Les autres sociétés se partagent le reste. Dire « le marché monte » revient, le plus souvent, à dire « {m} monte ».", { m: first.name, w: fmtPct(first.weight, 1) })}
              </p>
            )}

            <figure className={styles.figure}>
              <div className={styles.figtitle}>{t("Figure 3 · Le poids de chaque société, sur le capital global et sur le flottant coté")}</div>
              <WeightBars lines={n.lines} totalLabel={t("capital global")} floatLabel={t("flottant coté")} />
              <figcaption>{t("Le flottant rééquilibre : ce que l'on peut réellement acheter n'a pas la forme de ce que l'indice mesure. C'est la différence entre le capital d'une société et la part de ce capital qui circule en bourse.")}</figcaption>
            </figure>

            <figure className={styles.figure}>
              <div className={styles.figtitle}>{t("Figure 4 · Ce que chaque société a apporté au trimestre")}</div>
              <ContribBars lines={n.lines} unit={t("points d'indice")} />
              <figcaption>
                {top && best && best.mnemo !== top.mnemo
                  ? t("La meilleure variation de la cote n'est pas la meilleure contribution : {b} gagne {bm} mais pèse {bw}, quand {c} pèse {cw}. C'est le poids, pas la performance, qui fait l'indice.", { b: best.name, bm: signed(best.move, 1), bw: fmtPct(best.weight, 1), c: top.name, cw: fmtPct(top.weight, 1) })
                  : t("Contribution d'une société : son poids en début de période multiplié par la variation de son cours. C'est une lecture à poids constants, calculée par nos soins.")}
              </figcaption>
            </figure>
          </section>

          <section id="societes">
            <h2>
              <span className={styles.n}>04</span> {t("Les sept sociétés derrière le chiffre")}
            </h2>
            <p>{t("Un indice de sept lignes se lit d'abord comme une liste d'entreprises : des sociétés d'exploitation qui emploient, produisent et distribuent des dividendes dans la région.")}</p>
            <div className={styles.tw}>
              <table>
                <caption className={styles.figtitle}>{t("Tableau 2 · La cote actions de la BVMAC")}</caption>
                <thead>
                  <tr>
                    <th>{t("Société")}</th>
                    <th>{t("Activité")}</th>
                    <th>{t("Pays")}</th>
                    <th className={styles.num}>{t("Cours")}</th>
                    <th className={styles.num}>{t("Rendement")}</th>
                    <th className={styles.num}>{t("Poids")}</th>
                    <th className={styles.num}>{t("Flottant")}</th>
                    <th className={styles.num}>{t("Trimestre")}</th>
                  </tr>
                </thead>
                <tbody>
                  {n.lines.map((l) => (
                    <tr key={l.mnemo}>
                      <td>
                        <Link href={`/societes/${l.mnemo.toLowerCase()}`}>
                          <b>{l.mnemo}</b> · {l.name}
                        </Link>
                      </td>
                      <td>{t(l.sector)}</td>
                      <td>{t(l.country)}</td>
                      <td className={styles.num}>{fmt(l.price)}</td>
                      <td className={styles.num}>{l.yield != null ? fmtPct(l.yield, 1) : "—"}</td>
                      <td className={styles.num}>{fmtPct(l.weight, 1)}</td>
                      <td className={styles.num}>{fmtPct(l.floatShare, 0)}</td>
                      <td className={`${styles.num} ${l.move > 0 ? styles.up : l.move < 0 ? styles.down : ""}`}>{signed(l.move, 1)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}>{t("Ensemble de la cote")}</td>
                    <td className={styles.num}>100 %</td>
                    <td className={styles.num}>{n.capTotal ? fmtPct((n.capFloat / n.capTotal) * 100, 0) : "—"}</td>
                    <td className={`${styles.num} ${n.ret > 0 ? styles.up : n.ret < 0 ? styles.down : ""}`}>{signed(n.ret, 1)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className={styles.splits}>
              <div>
                <div className={styles.figtitle}>{t("Par secteur")}</div>
                {n.bySector.map((g) => (
                  <div key={g.label} className={styles.split}>
                    <span>{t(g.label)}</span>
                    <i style={{ width: share(g.pct) }} />
                    <b>{fmtPct(g.pct, 1)}</b>
                  </div>
                ))}
              </div>
              <div>
                <div className={styles.figtitle}>{t("Par pays")}</div>
                {n.byCountry.map((g) => (
                  <div key={g.label} className={styles.split}>
                    <span>{t(g.label)}</span>
                    <i style={{ width: share(g.pct) }} />
                    <b>{fmtPct(g.pct, 1)}</b>
                  </div>
                ))}
              </div>
            </div>

            <p>
              {t("Deux traits ressortent. Par secteur, la finance représente {f} de la capitalisation : l'indice est, pour l'essentiel, un baromètre bancaire. Par pays, {c} en représente {cp} ; acheter « le marché régional » revient surtout à acheter cette économie-là.", {
                f: fmtPct(n.financePct, 1),
                c: t(n.byCountry[0]?.label ?? "—"),
                cp: fmtPct(n.byCountry[0]?.pct ?? 0, 1),
              })}
            </p>

            {held.length > 0 && (
              <p>
                {t("Le flottant réduit vient d'une structure d'actionnariat que la cote ne corrige pas seule : {h}. Le marché est étroit parce que les maisons mères et les États gardent leurs titres, non parce que l'épargne régionale se détourne des actions.", {
                  h: held.map((l) => `${l.holder} ${t("de")} ${l.name}`).join(" · "),
                })}
              </p>
            )}
          </section>

          <section id="negoce">
            <h2>
              <span className={styles.n}>05</span> {t("Ce qui s'est échangé, et ce que cela change pour vous")}
            </h2>
            <p className={styles.lede}>{say(n.caution)}</p>
            {traded.length > 0 && (
              <div className={styles.tw}>
                <table>
                  <caption className={styles.figtitle}>{t("Tableau 3 · Le négoce du trimestre et la rotation du flottant")}</caption>
                  <thead>
                    <tr>
                      <th>{t("Société")}</th>
                      <th className={styles.num}>{t("Échangé")}</th>
                      <th className={styles.num}>{t("Transactions")}</th>
                      <th className={styles.num}>{t("Rotation du flottant, 12 mois")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traded.map((l) => (
                      <tr key={l.mnemo}>
                        <td>
                          <b>{l.mnemo}</b> · {l.name}
                        </td>
                        <td className={styles.num}>{money(l.amount)}</td>
                        <td className={styles.num}>{l.trades}</td>
                        <td className={styles.num}>{l.rotation != null ? fmtPct(l.rotation, l.rotation < 10 ? 1 : 0) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p>
              {t("La rotation du flottant mesure la part des titres disponibles qui a changé de mains en un an. Sur l'ensemble de la cote elle ressort à {r} : c'est le trait d'un marché jeune, où les actionnaires sont des porteurs de long terme, et c'est la contrainte à connaître avant d'acheter.", { r: n.rotation != null ? fmtPct(n.rotation, 1) : "—" })}
            </p>
            <p>
              {n.trades > 0
                ? t("La conséquence est pratique : une position se construit et se défait en semaines, pas en séances, à l'ordre à cours limité, et le cours affiché n'est pas un prix de sortie garanti. La transaction moyenne du trimestre porte sur {a} FCFA, ce qui montre un marché qui fonctionne par blocs négociés plutôt que par flux continu.", { a: money(n.amount / n.trades) })
                : t("La conséquence est pratique : une position se construit et se défait en semaines, pas en séances, à l'ordre à cours limité, et le cours affiché n'est pas un prix de sortie garanti.")}
            </p>
          </section>

          <section id="mesure">
            <h2>
              <span className={styles.n}>06</span> {t("Ce que l'indice mesure, et ce qu'il ne mesure pas")}
            </h2>
            <ul className={styles.list}>
              <li>
                <b>{t("C'est un indice de prix")}</b> : {t("les dividendes n'y sont pas. Sur cette cote ils font une part importante du rendement d'un porteur ; comparer sa performance à l'indice, c'est se sous-estimer.")}
              </li>
              <li>
                <b>{t("Ce n'est pas une mesure d'activité")}</b> : {t("{f} séances du trimestre n'ont enregistré aucun mouvement. Sans transaction, le cours de référence ne bouge pas et l'indice non plus.", { f: String(flat) })}
              </li>
              <li>
                <b>{t("Ce n'est pas un portefeuille")}</b> : {t("reproduire sa composition supposerait d'acheter une proportion de la première valeur que le flottant disponible ne permet pas.")}
              </li>
              <li>
                <b>{t("Ce n'est pas un repère de risque")}</b> : {t("la variabilité mesurée dépend de ce que l'on compte : toutes les séances lues, ou seulement celles où le marché a traité. Un seul chiffre de risque serait donc trompeur sur cette cote.")}
              </li>
            </ul>
          </section>

          <section id="economie">
            <h2>
              <span className={styles.n}>07</span> {t("Ce que l'indice dit, et ne dit pas, de l'économie de la région")}
            </h2>
            <p className={styles.lede}>{t("La tentation est forte de lire cet indice comme un baromètre de la CEMAC ou du Cameroun. La raison de s'en garder est arithmétique plutôt que doctrinale.")}</p>
            <p>
              {t("Un baromètre suppose un échantillon et des observations. Ici l'échantillon est de sept sociétés, dont une porte une large part du poids et le secteur financier {f} ; les observations utiles du trimestre sont les {m} séances où un prix a bougé. Une série aussi courte et aussi concentrée ne porte pas de conclusion sur la croissance, l'inflation ou le pétrole.", {
                f: fmtPct(n.financePct, 1),
                m: String(n.moved),
              })}
            </p>
            <p>{t("Ce que l'indice dit réellement tient en trois points, et ils ont leur valeur : le niveau de prix du segment coté, utile pour situer une souscription ; l'état d'avancement du marché lui-même, mesuré par le nombre d'émetteurs, la taille du flottant et la rotation ; et la concentration du risque, qui est une information de gouvernance autant que de marché.")}</p>
            <p>
              {t("Pour lire l'économie de la zone, deux séries voisines sont plus solides, et le Guichet les porte déjà : le marché des titres publics, où une seule adjudication du Trésor porte sur des montants sans commune mesure avec les échanges d'actions d'une année entière, avec des taux et une fréquence hebdomadaire ; et les valeurs liquidatives des OPCVM, publiées elles aussi à chaque bulletin. Ce sont elles qui portent le signal du coût de l'argent dans la région.")}
            </p>
            <h3>{t("Ce qui ferait de cet indice un vrai baromètre")}</h3>
            <ul className={styles.list}>
              <li>
                <b>{t("Des émetteurs")}</b> : {t("une dizaine de sociétés d'au moins trois secteurs non financiers changerait la nature de l'indice.")}
              </li>
              <li>
                <b>{t("Du flottant")}</b> : {t("les cessions partielles d'États et de maisons mères sont le levier immédiat, et elles se décident hors marché.")}
              </li>
              <li>
                <b>{t("Un indice de rendement global")}</b> : {t("publié à côté de l'indice de prix, dividendes réinvestis, qui est la mesure que regarde un épargnant.")}
              </li>
              <li>
                <b>{t("Une méthodologie publique")}</b> : {t("base, diviseur, traitement des jours sans cotation et des détachements de dividende.")}
              </li>
            </ul>
            <p>{t("Ces conditions ne relèvent pas d'un intermédiaire, mais elles décrivent ce que nous pouvons accompagner : amener l'épargne vers le marché, expliquer honnêtement ce qu'elle y trouve, et ne jamais laisser croire qu'un chiffre porte plus de sens qu'il n'en contient.")}</p>
          </section>
        </main>

        <aside className={styles.aside}>
          <h4>{t("Fiche technique")}</h4>
          <dl>
            <dt>{t("Séances lues")}</dt>
            <dd>{n.sessions}</dd>
            <dt>{t("Dont sans mouvement")}</dt>
            <dd>{flat}</dd>
            <dt>{t("Première séance")}</dt>
            <dd>{shortDate(n.quarter.from)}</dd>
            <dt>{t("Dernière séance")}</dt>
            <dd>{shortDate(n.quarter.to)}</dd>
            <dt>{t("Plus haut")}</dt>
            <dd>{fmt(n.high.value)}</dd>
            <dt>{t("Plus bas")}</dt>
            <dd>{fmt(n.low.value)}</dd>
            <dt>{t("Repli maximal")}</dt>
            <dd>{signed(n.stats.drawdown, 2)}</dd>
            <dt>{t("Variation moyenne")}</dt>
            <dd>{signed(n.stats.avg, 2)}</dd>
            <dt>{t("Écart-type")}</dt>
            <dd>{fmtPct(n.stats.sd, 2)}</dd>
            {n.stats.volAll != null && n.stats.volMoved != null && (
              <>
                <dt>{t("Variabilité annualisée")}</dt>
                <dd>
                  {fmtPct(n.stats.volAll, 0)} / {fmtPct(n.stats.volMoved, 0)}
                </dd>
              </>
            )}
          </dl>

          <h4>{t("Composition")}</h4>
          <dl>
            {n.lines.map((l) => (
              <div key={l.mnemo} className={styles.pair}>
                <dt>{l.mnemo}</dt>
                <dd>{fmtPct(l.weight, 1)}</dd>
              </div>
            ))}
          </dl>

          <h4>{t("Capitalisation")}</h4>
          <dl>
            <dt>{t("Capital global")}</dt>
            <dd>{money(n.capTotal)}</dd>
            <dt>{t("Flottant coté")}</dt>
            <dd>{money(n.capFloat)}</dd>
            <dt>{t("Part flottante")}</dt>
            <dd>{n.capTotal ? fmtPct((n.capFloat / n.capTotal) * 100, 1) : "—"}</dd>
          </dl>
        </aside>
      </div>

      <div className={styles.box}>
        <h3>{t("Méthode")}</h3>
        <p>
          {t("Le niveau et la variation de chaque séance viennent du bloc « indice » du bulletin officiel de la cote, relevés sans retraitement. Les poids sont calculés à partir de la page des capitalisations du même bulletin : cours de clôture multiplié par le nombre de titres, sur le capital global puis sur le flottant coté. La contribution d'une société est le produit de son poids en début de période par la variation de son cours, à poids constants. La variabilité annualisée est l'écart-type des variations de séance rapporté à l'année, une fois sur toutes les séances, une fois sur les seules séances avec mouvement. Aucune valeur n'est interpolée : une séance sans bulletin lu est un trou, pas une ligne plate.")}
        </p>
      </div>


      <footer className={styles.footer}>
        <b>{t("Source")}</b> · {t("Bulletin officiel de la cote de la BVMAC, séances lues à chaque parution ; calculs {c}.", { c: COMPANY.legalName })}{" "}
        <b>{t("Limites")}</b> · {t("l'historique commence au premier bulletin lu, et non à la date de base de l'indice.")}{" "}
        {n.methodOpen ? t("La méthodologie de l'indice (base, date de base, règle de pondération) est en cours de confirmation auprès de la BVMAC.") : t("Les variations publiées se reconstituent avec les cours et les poids du même bulletin.")}{" "}
        <b>{t("Avertissement")}</b> · {t("ce document présente une information de marché ; il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, ni une offre. Les performances passées ne préjugent pas des performances futures.")}
      </footer>
      <div className={styles.whatNext}>
        <span>{t("Les autres trimestres")}</span>
        <QuarterStepper older={older} newer={newer} current={n.quarter} total={closed.length} wide />
      </div>
      <MarketStrip current="notes" />
      <BackToTop />
    </article>
  );
}
