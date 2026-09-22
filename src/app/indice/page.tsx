import Link from "next/link";
import { IndexChart, type ChartPoint, type OverlaySeries } from "@/components/IndexChart";
import { repo } from "@/lib/data";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { indexSeries, indexStats, indexWeights } from "@/lib/market/index";
import { loadCompanies } from "@/lib/reference";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "L'indice BVMAC All Share" };

const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
const lvl = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * The index page: the level and its deltas, every session read with a
 * crosshair, pins and a share overlaid, the sessions where it actually
 * moved and which share moved it, the composition on both weightings, and
 * how to read it. Market information, open to everyone.
 */
export default async function IndicePage() {
  const t = await getT();
  const r = repo();
  const [bulletins, latest, companies] = await Promise.all([r.listBulletins(2000).catch(() => []), r.latestQuotes().catch(() => []), loadCompanies().catch(() => [])]);
  const stats = indexStats(indexSeries(bulletins));
  const weights = indexWeights(latest);
  const nameOf = (mnemo: string) => companies.find((c) => c.mnemo === mnemo)?.shortName ?? mnemo;
  // every equity's history : the overlay series and the movers of each session
  const histories = await Promise.all(weights.map(async (w) => ({ w, quotes: (await r.listQuotes(w.isin, 2000).catch(() => [])).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate)) })));
  const movers = new Map<string, { mnemo: string; variationPct: number }[]>();
  for (const { w, quotes } of histories) for (const q of quotes) if (q.variationPct !== 0 || q.trades > 0) movers.set(q.sessionDate, [...(movers.get(q.sessionDate) ?? []), { mnemo: w.mnemo, variationPct: q.variationPct }]);
  const points: ChartPoint[] = stats.points.map((p) => ({ ...p, movers: (p.variationPct ?? 0) !== 0 ? movers.get(p.date) : undefined }));
  const overlays: OverlaySeries[] = histories.map(({ w, quotes }) => ({ mnemo: w.mnemo, name: nameOf(w.mnemo), points: quotes.map((q) => ({ date: q.sessionDate, value: q.close })) }));
  const last = stats.last;
  const year = last ? stats.points.filter((p) => p.date >= new Date(new Date(`${last.date}T12:00:00Z`).getTime() - 365 * 86400e3).toISOString().slice(0, 10)) : [];
  const high = year.reduce<typeof last>((a, p) => (!a || p.value > a.value ? p : a), undefined);
  const low = year.reduce<typeof last>((a, p) => (!a || p.value < a.value ? p : a), undefined);
  const movedSessions = [...stats.points].filter((p) => (p.variationPct ?? 0) !== 0).reverse();
  const flat = stats.points.length - movedSessions.length;
  const tone = (v?: number) => (v == null || Math.abs(v) < 0.005 ? "" : v > 0 ? styles.up : styles.down);
  const capT = weights.reduce((a, w) => a + w.capTotal, 0);
  const capF = weights.reduce((a, w) => a + w.capFloat, 0);

  return (
    <>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">BVMAC · {t("indice de prix")} · {t("lu à chaque bulletin")}</div>
          <h1 className="display">{t("L'indice BVMAC All Share")}</h1>
          <p className={styles.lead}>{t("Un seul nombre pour toutes les actions cotées à la BVMAC : la somme des capitalisations, ramenée à une base. Le Guichet le lit dans chaque bulletin officiel de la cote et le montre tel quel.")}</p>
        </div>
        <div className={styles.links}>
          <Link className="btn sm" href="/info/indice-bvmac">
            {t("La leçon : comment le lire")}
          </Link>
          <Link className="btn sm ghost" href="/comparer">
            {t("Comparer deux lignes")}
          </Link>
        </div>
      </div>

      {!last ? (
        <div className="empty">{t("L'indice se lit dans le bulletin de la BVMAC : dès le premier bulletin lu, il s'affiche ici.")}</div>
      ) : (
        <>
          <section className={styles.level}>
            <div className={styles.big}>
              <small>{fmtDate(last.date)}</small>
              <b>{lvl(last.value)}</b>
              <span className={tone(stats.day)}>{signed(stats.day)} {t("sur la séance")}</span>
            </div>
            <dl className={styles.deltas}>
              <div>
                <dt>{t("un mois")}</dt>
                <dd className={tone(stats.month)}>{signed(stats.month, 1)}</dd>
              </div>
              <div>
                <dt>{t("depuis le 1er janvier")}</dt>
                <dd className={tone(stats.ytd)}>{signed(stats.ytd, 1)}</dd>
              </div>
              <div>
                <dt>{t("douze mois")}</dt>
                <dd className={tone(stats.year)}>{signed(stats.year, 1)}</dd>
              </div>
              {high && low && (
                <>
                  <div>
                    <dt>{t("plus haut 12 mois")}</dt>
                    <dd>
                      {lvl(high.value)} <small>{fmtDate(high.date)}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>{t("plus bas 12 mois")}</dt>
                    <dd>
                      {lvl(low.value)} <small>{fmtDate(low.date)}</small>
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt>{t("séances lues")}</dt>
                <dd>
                  {stats.points.length} <small>{t("dont {n} sans mouvement", { n: String(flat) })}</small>
                </dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <div className="panel-h">
              <h2>{t("Séance après séance")}</h2>
              <span className="muted">{t("lu depuis le bulletin du {d}", { d: fmtDate(stats.points[0].date) })}</span>
            </div>
            <div className={styles.chart}>
              <IndexChart points={points} overlays={overlays} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-h">
              <h2>{t("Les séances où l'indice a bougé")}</h2>
              <span className="muted">{t("{n} sur {m} lues : les autres sont à 0,00 %, sans transaction sur les actions", { n: String(movedSessions.length), m: String(stats.points.length) })}</span>
            </div>
            {movedSessions.length === 0 ? (
              <p className={styles.p}>{t("Aucune séance avec mouvement sur la période lue.")}</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={`tbl ${styles.moved}`}>
                  <thead>
                    <tr>
                      <th>{t("Séance")}</th>
                      <th className={styles.num}>{t("Variation")}</th>
                      <th className={styles.num}>{t("Niveau")}</th>
                      <th>{t("Ce qui a bougé")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movedSessions.slice(0, 60).map((p) => (
                      <tr key={p.date}>
                        <td>{fmtDate(p.date)}</td>
                        <td className={`${styles.num} ${tone(p.variationPct)}`}>{signed(p.variationPct)}</td>
                        <td className={styles.num}>{lvl(p.value)}</td>
                        <td>
                          {(movers.get(p.date) ?? []).length ? (
                            movers.get(p.date)!.map((m, i) => (
                              <span key={m.mnemo}>
                                {i > 0 ? " · " : ""}
                                <Link href={`/societes/${m.mnemo.toLowerCase()}`}>{m.mnemo}</Link> <b className={tone(m.variationPct)}>{signed(m.variationPct)}</b>
                              </span>
                            ))
                          ) : (
                            <span className="muted">{t("cours d'action non lus sur cette séance")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-h">
              <h2>{t("Composition")}</h2>
              <span className="muted">{t("les actions cotées et leur poids, sur le capital global et sur le flottant coté")}</span>
            </div>
            <div className={styles.tableWrap}>
              <table className={`tbl ${styles.comp}`}>
                <thead>
                  <tr>
                    <th>{t("Société")}</th>
                    <th className={styles.num}>{t("Cours")}</th>
                    <th className={styles.num}>{t("Capital global")}</th>
                    <th className={styles.num}>{t("Poids")}</th>
                    <th className={styles.num}>{t("Flottant coté")}</th>
                    <th className={styles.num}>{t("Poids")}</th>
                    <th className={styles.num}>{t("Liquidité 3 mois")}</th>
                    <th className={styles.num}>{t("Dernier dividende")}</th>
                  </tr>
                </thead>
                <tbody>
                  {weights.map((w) => (
                    <tr key={w.isin}>
                      <td>
                        <Link href={`/societes/${w.mnemo.toLowerCase()}`}>
                          <b>{w.mnemo}</b> · {nameOf(w.mnemo)}
                        </Link>
                      </td>
                      <td className={styles.num}>{fmt(w.close)}</td>
                      <td className={styles.num}>{fmt(w.capTotal / 1e6)} M</td>
                      <td className={styles.num}>
                        <span className={styles.wcell}>
                          <i style={{ width: `${w.weightTotal}%` }} />
                          {fmtPct(w.weightTotal, 1)}
                        </span>
                      </td>
                      <td className={styles.num}>{fmt(w.capFloat / 1e6)} M</td>
                      <td className={styles.num}>
                        <span className={styles.wcell}>
                          <i className={styles.wf} style={{ width: `${w.weightFloat}%` }} />
                          {fmtPct(w.weightFloat, 1)}
                        </span>
                      </td>
                      <td className={styles.num}>{w.liquidity3mPct != null ? fmtPct(w.liquidity3mPct, 2) : "—"}</td>
                      <td className={styles.num}>{w.lastDividend != null ? `${fmt(w.lastDividend)} FCFA` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>{t("Ensemble")}</td>
                    <td />
                    <td className={styles.num}>{fmt(capT / 1e6)} M</td>
                    <td className={styles.num}>100 %</td>
                    <td className={styles.num}>{fmt(capF / 1e6)} M</td>
                    <td className={styles.num}>100 %</td>
                    <td colSpan={2} className={styles.numSmall}>
                      {t("flottant : {p} du capital global", { p: capT ? fmtPct((capF / capT) * 100, 0) : "—" })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className={styles.two}>
              <p>
                <b>{t("Capital global")}</b> : {t("toutes les actions de la société × le cours, y compris les blocs de l'État ou des fondateurs. C'est la taille de la société ; une grosse société peu négociée pèse lourd.")}
              </p>
              <p>
                <b>{t("Flottant coté")}</b> : {t("seulement les titres en mains du public × le cours, ce qui peut vraiment s'acheter et se vendre. C'est le poids que le marché peut porter ; une grosse société à petit flottant pèse moins.")}
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-h">
              <h2>{t("Comment le lire")}</h2>
            </div>
            <div className={styles.three}>
              <p>
                <b>{t("Un indice de prix")}</b> : {t("il ne compte pas les dividendes. La performance d'un porteur, c'est le cours plus le dividende ; l'indice ne dit que le cours.")}
              </p>
              <p>
                <b>{t("Une ou deux valeurs")}</b> : {t("les poids sont très inégaux, une variation de l'indice est presque toujours le mouvement d'une ou deux sociétés. Le tableau des séances dit laquelle.")}
              </p>
              <p>
                <b>{t("0,00 % est la norme")}</b> : {t("sans transaction, le cours de référence ne bouge pas et l'indice non plus. Une séance plate est une séance sans échange, pas un marché calme.")}
              </p>
            </div>
            <p className={styles.method}>
              {t("Méthode")} : {t("indice pondéré par la capitalisation ; la base, la date de base et la règle de pondération (capital global ou flottant) sont à confirmer auprès de la BVMAC. L'historique commence au premier bulletin lu par le Guichet, le {d}.", { d: fmtDate(stats.points[0].date) })}{" "}
              {t("Le Guichet montre l'indice et l'explique ; il ne le prend jamais pour un objectif à battre.")}
            </p>
          </section>
        </>
      )}
    </>
  );
}
