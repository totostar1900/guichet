import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { indexPageData } from "@/lib/market/index-data";
import { quarterNote, quarters } from "@/lib/market/index-quarter";
import { quarterNeighbours } from "@/lib/market/quarter-glance";
import { getT } from "@/i18n/server";
import { BackToTop } from "@/components/BackToTop";
import { PageOutline } from "@/components/PageOutline";
import { QuarterStepper } from "@/components/QuarterStepper";
import { CapChart, Comparaison, ContribBars, IndexCurve, MonthBars, WeightBars } from "./Figures";
import { BandeauMoment, NiveauDuMarche, LignesSocietes } from "./Marche";
import { momentDeLaPlace } from "@/lib/market/moment";
import { repo } from "@/lib/data";
import { PastilleVariation } from "@/components/PastilleVariation";
import styles from "./note.module.css";
import ecran from "./marche.module.css";
import { Glissement } from "@/components/mobile/Glissement";

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
 * The quarterly note on the index, public and written for a client in plain
 * words: what the quarter did, what traded, the companies behind the number and
 * how to read it. Computed from that quarter's sessions only, so a published
 * quarter reads the same a year later. Work in progress (reconciliations, open
 * questions with the exchange) stays at the desk and is never written here.
 */
export default async function QuarterNotePage({ params }: { params: Promise<{ trimestre: string }> }) {
  const [{ trimestre }, t] = await Promise.all([params, getT()]);
  const data = await indexPageData();
  const note = await quarterNote(trimestre.toUpperCase(), data);
  if (!note) notFound();
  const moment = momentDeLaPlace(data, await repo().listOffers().catch(() => []));
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
  /** A date on an axis always carries its year. */
  const axisDate = (d: string) => fmtDate(d);
  const closed = quarters(data);
  const { older, newer } = quarterNeighbours(closed, n.quarter.key);
  // Deux formes du même service. Le rail a la place de nommer les quatre derniers
  // trimestres et de les atteindre d'un clic ; le pied de la feuille du téléphone
  // ne l'a pas, et s'en tient aux deux voisins. L'archive est au bout des deux.
  const others = closed.filter((q) => q.key !== n.quarter.key).slice(0, 4);
  const stepper = <QuarterStepper older={older} newer={newer} current={n.quarter} total={closed.length} />;
  const flat = n.sessions - n.moved;
  // the two volatilities only tell a story when they actually part ways
  const volGap =
    n.stats.volAll != null && n.stats.volMoved != null && Math.max(n.stats.volAll, n.stats.volMoved) / Math.max(1e-9, Math.min(n.stats.volAll, n.stats.volMoved)) >= 1.4;

  return (
    <Glissement>
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

        <div className={ecran.ecran}>
          <NiveauDuMarche niveau={n.level} variation={n.ret} periode={t("sur le trimestre")} aLaDate={t("au {d}", { d: fmtDate(n.quarter.to) })} />
          <BandeauMoment
            moment={moment}
            l={{ titre: t("Aujourd'hui sur la place"), derniere: t("Dernière séance de l'indice"), semaine: t("Échangé, cinq dernières séances"), adjudication: t("Prochaine adjudication"), ouverte: t("Adjudication ouverte"), aucune: t("Aucune annoncée"), cloture: t("clôture le"), transactions: t("transactions") }}
          />
          <figure className={styles.figure}>
            <div className={styles.figtitle}>{t("Figure 1 · Niveau de l'indice, montants échangés et transactions, séance par séance")}</div>
            <IndexCurve
              note={n}
              dateOf={axisDate}
              labels={{ niveau: t("Niveau de l'indice (points)"), montant: t("Montant échangé"), transactions: t("Transactions par séance"), montantUnite: (u) => t("Montant échangé ({u})", { u }) }}
            />
            <figcaption>
              {t("Un point coloré marque une séance où l'indice a bougé : vert à la hausse, orange à la baisse. Les barres du dessous montrent ce qui s'est échangé le même jour.")}{" "}
              {n.peak ? t("Plus forte séance : {d}, {v} (tirets sur la courbe).", { d: shortDate(n.peak.date), v: signed(n.peak.variationPct, 1) }) + " " : ""}
              {t("Plus haut {h} le {hd} · plus bas {l} le {ld} · {m} séances lues, {x} sans bulletin", { h: fmt(n.high.value), hd: fmtDate(n.high.date), l: fmt(n.low.value), ld: fmtDate(n.low.date), m: String(n.sessions), x: String(n.missing) })}
            </figcaption>
          </figure>
        </div>

        <dl className={styles.fiche}>
          <div>
            <dt>{t("Douze mois")}</dt>
            <dd>{n.year != null ? <PastilleVariation v={Number(n.year.toFixed(2))} /> : "—"}</dd>
            <small>{t("de l'indice, jusqu'au {d}", { d: fmtDate(n.quarter.to) })}</small>
          </div>
          <div>
            <dt>{t("Plus haut · plus bas")}</dt>
            <dd>
              {fmt(n.high.value)} · {fmt(n.low.value)}
            </dd>
            <small>
              {shortDate(n.high.date)} · {shortDate(n.low.date)}
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

        <LignesSocietes lines={n.lines} l={{ titre: t("Les sept sociétés de la cote"), poids: t("poids"), periode: t("trimestre") }} />

        <div className={styles.cols}>
          {/* la colonne de gauche porte la navigation du document : ou on en est, et ou aller ensuite */}
          <div className={styles.lnav}>
            <PageOutline
              label={t("Sommaire")}
              sections={[
                { id: "trimestre", title: t("Le trimestre") },
                { id: "atouts", title: t("Une courbe régulière") },
                { id: "concentration", title: t("Le poids de chaque société") },
                { id: "societes", title: t("Les sociétés") },
                { id: "negoce", title: t("Le négoce") },
                { id: "mesure", title: t("Comment le lire") },
                { id: "economie", title: t("Pour aller plus loin") },
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
                <QuarterStepper current={n.quarter} total={closed.length} list={others} />
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
                <div className={styles.figtitle}>{t("Figure 2 · Ce que chaque mois a donné")}</div>
                <MonthBars monthly={n.monthly} label={(k) => t(k)} unit={t("Variation du mois (%)")} />
                <figcaption>
                  {flat > 0
                    ? t("{f} séances sur {m} sont restées sans mouvement : aucun cours n'a changé ce jour-là.", { f: String(flat), m: String(n.sessions) })
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

              {n.activity.some((a) => a.cap > 0) && (
                <figure className={styles.figure}>
                  <div className={styles.figtitle}>{t("Figure 3 · Capitalisation de la cote, séance par séance")}</div>
                  <CapChart activity={n.activity} dateOf={axisDate} unit={(u) => t("Capitalisation ({u})", { u })} />
                  <figcaption>{t("La capitalisation additionne la valeur en bourse des sept sociétés (cours × nombre de titres). Elle varie avec les cours : une société qui émet de nouveaux titres la fait aussi bouger.")}</figcaption>
                </figure>
              )}
            </section>

            <section id="atouts">
              <h2>
                <span className={styles.n}>02</span> {t("Une courbe régulière")}
              </h2>
              <p>
                {t("Le trimestre compte {m} séances lues, avec {x} jours ouvrés seulement sans bulletin exploitable. La capitalisation de la cote atteint {c} FCFA et le repli le plus marqué du trimestre est de {d}.", {
                  m: String(n.sessions),
                  x: String(n.missing),
                  c: money(n.capTotal),
                  d: signed(n.stats.drawdown, 1),
                })}
              </p>
              {n.stats.volAll != null && n.stats.volMoved != null && (
                <p>
                  {volGap
                    ? t("Sur une année, les mouvements de l'indice représenteraient environ {a} en comptant toutes les séances, et {b} en ne comptant que celles où des titres ont changé de mains. Les deux chiffres sont donnés ensemble parce que les séances sans échange tirent la première mesure vers le bas.", { a: fmtPct(n.stats.volAll, 0), b: fmtPct(n.stats.volMoved, 0) })
                    : t("Sur une année, les mouvements de l'indice représenteraient environ {a} en comptant toutes les séances, et {b} en ne comptant que celles où des titres ont changé de mains : les deux mesures se rejoignent ce trimestre.", { a: fmtPct(n.stats.volAll, 0), b: fmtPct(n.stats.volMoved, 0) })}
                </p>
              )}
            </section>

            <section id="concentration">
              <h2>
                <span className={styles.n}>03</span> {t("Le poids de chaque société")}
              </h2>
              {first && (
                <p className={styles.lede}>
                  {t("{m} représente {w} de la capitalisation de la cote, les autres sociétés se partagent le reste : quand {m} bouge, l'indice bouge avec elle.", { m: first.name, w: fmtPct(first.weight, 1) })}
                </p>
              )}

              {n.compare && (
                <figure className={styles.figure}>
                  <div className={styles.figtitle}>{t("Figure 4 · L'indice, la société qui le porte et le reste de la cote, à 100 au début du trimestre")}</div>
                  <Comparaison compare={n.compare} dateOf={shortDate} labels={{ indice: t("Indice"), reste: t("Reste de la cote"), base: t("Base 100 au début du trimestre") }} />
                  <figcaption>
                    {t("{m} pèse {w} de la cote. À 100 au début du trimestre, l'indice finit à {i}, {m} à {p} et le reste de la cote à {r}.", {
                      m: n.compare.principale.name,
                      w: fmtPct(n.compare.principale.weight, 1),
                      i: fmtPct(n.compare.indice[n.compare.indice.length - 1], 1).replace(" %", ""),
                      p: fmtPct(n.compare.principale.serie[n.compare.principale.serie.length - 1], 1).replace(" %", ""),
                      r: fmtPct(n.compare.reste[n.compare.reste.length - 1], 1).replace(" %", ""),
                    })}
                  </figcaption>
                </figure>
              )}

              <figure className={styles.figure}>
                <div className={styles.figtitle}>{t("Figure 5 · Le poids de chaque société, sur le capital global et sur le flottant coté")}</div>
                <WeightBars lines={n.lines} totalLabel={t("capital global")} floatLabel={t("flottant coté")} unit={t("Part de la cote (%)")} />
                <figcaption>{t("Le flottant est la part du capital d'une société qui circule en bourse : c'est celle que l'on peut acheter.")}</figcaption>
              </figure>

              <figure className={styles.figure}>
                <div className={styles.figtitle}>{t("Figure 6 · Ce que chaque société a apporté au trimestre")}</div>
                <ContribBars lines={n.lines} unit={t("points d'indice")} />
                <figcaption>
                  {top && best && best.mnemo !== top.mnemo
                    ? t("La plus forte hausse n'est pas la plus forte contribution : {b} gagne {bm} mais pèse {bw}, quand {c} pèse {cw}.", { b: best.name, bm: signed(best.move, 1), bw: fmtPct(best.weight, 1), c: top.name, cw: fmtPct(top.weight, 1) })
                    : t("La contribution d'une société est son poids en début de période multiplié par la variation de son cours.")}
                </figcaption>
              </figure>
            </section>

            <section id="societes">
              <h2>
                <span className={styles.n}>04</span> {t("Les sept sociétés derrière le chiffre")}
              </h2>
              <p>{t("Sept sociétés d'exploitation composent la cote : elles emploient, produisent et distribuent des dividendes dans la région.")}</p>
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
                {t("Par secteur, la finance représente {f} de la capitalisation. Par pays, {c} en représente {cp}.", {
                  f: fmtPct(n.financePct, 1),
                  c: t(n.byCountry[0]?.label ?? "—"),
                  cp: fmtPct(n.byCountry[0]?.pct ?? 0, 1),
                })}
              </p>

              {held.length > 0 && (
                <p>
                  {t("Le flottant est réduit parce que des actionnaires stables gardent leurs titres : {h}.", {
                    h: held.map((l) => `${l.holder} ${t("de")} ${l.name}`).join(" · "),
                  })}
                </p>
              )}
            </section>

            <section id="negoce">
              <h2>
                <span className={styles.n}>05</span> {t("Ce qui s'est échangé")}
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
                {t("La rotation du flottant est la part des titres disponibles qui a changé de mains en un an : elle ressort à {r} sur l'ensemble de la cote.", { r: n.rotation != null ? fmtPct(n.rotation, 1) : "—" })}
              </p>
              <p>
                {n.trades > 0
                  ? t("En pratique, une position se construit et se défait sur plusieurs semaines, avec un ordre à cours limité ; le cours affiché n'est pas un prix de sortie garanti. La transaction moyenne du trimestre porte sur {a} FCFA.", { a: money(n.amount / n.trades) })
                  : t("En pratique, une position se construit et se défait sur plusieurs semaines, avec un ordre à cours limité ; le cours affiché n'est pas un prix de sortie garanti.")}
              </p>
            </section>

            <section id="mesure">
              <h2>
                <span className={styles.n}>06</span> {t("Comment lire l'indice")}
              </h2>
              <ul className={styles.list}>
                <li>
                  <b>{t("Un indice de prix")}</b> : {t("il suit les cours ; les dividendes versés s'ajoutent au rendement d'un porteur.")}
                </li>
                <li>
                  <b>{t("Un niveau qui tient entre deux échanges")}</b> : {t("{f} séances du trimestre sont restées sans mouvement ; l'indice garde alors son dernier niveau.", { f: String(flat) })}
                </li>
                <li>
                  <b>{t("Un repère, pas un portefeuille")}</b> : {t("pour suivre la cote, on regarde l'indice ; pour investir, on choisit des lignes.")}
                </li>
              </ul>
            </section>

            <section id="economie">
              <h2>
                <span className={styles.n}>07</span> {t("Pour aller plus loin")}
              </h2>
              <p>{t("Pour suivre le coût de l'argent dans la région, deux séries complètent l'indice et sont déjà dans Guichet : les adjudications du Trésor, chaque semaine, avec leurs taux, et les valeurs liquidatives des OPCVM, publiées à chaque bulletin.")}</p>
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

        <footer className={styles.footer}>
          <p>
            {t("Comment sont faits les chiffres. Chaque séance, on relève dans le bulletin officiel de la cote le niveau de l'indice et le cours de chaque société. Le poids d'une société est sa part de la capitalisation de la cote : on le calcule avec la page des capitalisations du même bulletin (cours × nombre de titres). Sa contribution est ce poids multiplié par la variation de son cours : une petite société qui monte beaucoup pèse peu sur l'indice. Une séance sans bulletin lu reste un trou dans la courbe ; rien n'est inventé pour le combler.")}
          </p>
          <p>
            <b>{t("Source")}</b> · {t("Bulletin officiel de la cote de la BVMAC, séances lues à chaque parution ; calculs {c}.", { c: COMPANY.legalName })} <b>{t("Limites")}</b> · {t("l'historique commence au premier bulletin lu, et non à la date de base de l'indice.")}{" "}
            <b>{t("Avertissement")}</b> · {t("ce document présente une information de marché ; il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, ni une offre. Les performances passées ne préjugent pas des performances futures.")}
          </p>
        </footer>
        <BackToTop />
      </article>
    </Glissement>
  );
}
