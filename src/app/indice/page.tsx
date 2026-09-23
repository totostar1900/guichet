import Link from "next/link";
import { IndexChart, type ChartPoint, type OverlaySeries } from "@/components/IndexChart";
import { fmt, fmtDate, fmtDateTime, fmtPct, money } from "@/lib/format";
import { indexPageData } from "@/lib/market/index-data";
import { quarters } from "@/lib/market/index-quarter";
import { PageOutline } from "@/components/PageOutline";
import { MarketStrip } from "@/components/MarketStrip";
import { BackToTop } from "@/components/BackToTop";
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
export default async function IndicePage({ searchParams }: { searchParams: Promise<{ toutes?: string; societe?: string; page?: string }> }) {
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const data = await indexPageData();
  const { stats, weights, nameOf, histories, trading, movers, lastBulletin, missing } = data;
  const notes = quarters(data).slice(0, 6);
  const points: ChartPoint[] = stats.points.map((p) => {
    const s = trading.get(p.date);
    return { ...p, movers: (p.variationPct ?? 0) !== 0 ? movers.get(p.date) : undefined, titles: s?.titles ?? 0, amount: s?.amount ?? 0, trades: s?.trades ?? 0 };
  });
  const lastCount = (quotes: { sharesTotal?: number; sharesFloat?: number }[], k: "sharesTotal" | "sharesFloat") => [...quotes].reverse().find((q) => (q[k] ?? 0) > 0)?.[k];
  const overlays: OverlaySeries[] = histories.map(({ w, quotes }) => ({ mnemo: w.mnemo, name: nameOf(w.mnemo), points: quotes.map((q) => ({ date: q.sessionDate, value: q.close, titles: q.volumeTraded || 0, amount: q.valueTraded || 0, trades: q.trades || 0, variationPct: q.variationPct })), sharesTotal: lastCount(quotes, "sharesTotal"), sharesFloat: lastCount(quotes, "sharesFloat") }));
  // the sessions table : moved sessions by default, every session on demand, one share or all, fifty per page
  const all = sp.toutes === "1";
  const societe = sp.societe && weights.some((w) => w.mnemo === sp.societe) ? sp.societe : "";
  const page = Math.max(1, Number(sp.page) || 1);
  // 25 et non 50 : sur un téléphone chaque ligne prend trois lignes de texte,
  // et la barre de défilement horizontale se trouve au bas de la table.
  const PER = 25;
  const tableRows = [...stats.points]
    .reverse()
    .filter((p) => (all ? true : (p.variationPct ?? 0) !== 0))
    .filter((p) => (societe ? Boolean(trading.get(p.date)?.shares[societe]?.trades || trading.get(p.date)?.shares[societe]?.variationPct) : true));
  const pageRows = tableRows.slice((page - 1) * PER, page * PER);
  const pages = Math.max(1, Math.ceil(tableRows.length / PER));
  const q = (o: { toutes?: string; societe?: string; page?: string }) => {
    const u = new URLSearchParams();
    const v = { toutes: all ? "1" : "", societe, page: "", ...o };
    if (v.toutes) u.set("toutes", "1");
    if (v.societe) u.set("societe", v.societe);
    if (v.page && v.page !== "1") u.set("page", v.page);
    const qs = u.toString();
    return `/indice${qs ? `?${qs}` : ""}#seances`;
  };
  // twelve months of trading, for the data panel
  const since12 = stats.last ? new Date(new Date(`${stats.last.date}T12:00:00Z`).getTime() - 365 * 86400e3).toISOString().slice(0, 10) : "";
  const y12 = [...trading.entries()].filter(([d]) => d >= since12);
  const amount12 = y12.reduce((a, [, s]) => a + s.amount, 0);
  const trades12 = y12.reduce((a, [, s]) => a + s.trades, 0);
  const byShare12 = new Map<string, number>();
  for (const [, s] of y12) for (const [m, v] of Object.entries(s.shares)) byShare12.set(m, (byShare12.get(m) ?? 0) + v.amount);
  const top12 = [...byShare12.entries()].sort((a, b) => b[1] - a[1])[0];
  const lastMoved = [...stats.points].reverse().find((p) => (p.variationPct ?? 0) !== 0);
  const last = stats.last;
  const year = last ? stats.points.filter((p) => p.date >= new Date(new Date(`${last.date}T12:00:00Z`).getTime() - 365 * 86400e3).toISOString().slice(0, 10)) : [];
  const high = year.reduce<typeof last>((a, p) => (!a || p.value > a.value ? p : a), undefined);
  const low = year.reduce<typeof last>((a, p) => (!a || p.value < a.value ? p : a), undefined);
  const movedSessions = [...stats.points].filter((p) => (p.variationPct ?? 0) !== 0).reverse();
  const flat = stats.points.length - movedSessions.length;
  const tone = (v?: number) => (v == null || Math.abs(v) < 0.005 ? "" : v > 0 ? styles.up : styles.down);
  const capT = weights.reduce((a, w) => a + w.capTotal, 0);
  const capF = weights.reduce((a, w) => a + w.capFloat, 0);
  const rotation12 = capF ? (amount12 / capF) * 100 : undefined;

  return (
    <>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">
            <Link href="/marche">BVMAC</Link> · {t("indice de prix")} · {t("lu à chaque bulletin")}
          </div>
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
        <div className={styles.withRail}>
          <div className={styles.sections}>
            <section className={styles.level} id="niveau">
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

          <section className="panel" id="courbe">
            <div className="panel-h">
              <h2>{t("Séance après séance")}</h2>
              <span className="muted">{t("lu depuis le bulletin du {d}", { d: fmtDate(stats.points[0].date) })}</span>
            </div>
            <div className={styles.chart}>
              <IndexChart points={points} overlays={overlays} />
            </div>
          </section>

          {notes.length > 0 && (
            <section className="panel" id="notes">
              <div className="panel-h">
                <h2>{t("Les notes de marché")}</h2>
                <span className="muted">{t("un trimestre par note : ce qu'il a fait, les sociétés derrière le chiffre, ce que l'indice ne dit pas")}</span>
              </div>
              <div className={styles.btns}>
                {notes.map((q) => (
                  <Link key={q.key} className="btn sm" href={`/indice/note/${q.key.toLowerCase()}`}>
                    {t(q.q === 1 ? "1er trimestre {y}" : "{n}e trimestre {y}", { n: q.q, y: q.year })} →
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="panel" id="donnees">
            <div className="panel-h">
              <h2>{t("Données")}</h2>
              <span className="muted">{t("d'où vient chaque chiffre, ce qui manque, ce qu'on peut emporter")}</span>
            </div>
            <dl className={styles.info}>
              <div>
                <dt>{t("Dernier bulletin")}</dt>
                <dd>
                  {lastBulletin ? `BOC n° ${lastBulletin.number}` : "—"} · {t("séance du {d}", { d: fmtDate(last.date) })}
                  {lastBulletin && <small>{t("lu le {d}, {by}", { d: fmtDateTime(lastBulletin.ingestedAt), by: lastBulletin.ingestedBy === "cron" ? t("par le robot") : t("par le desk") })}</small>}
                </dd>
              </div>
              <div>
                <dt>{t("Historique")}</dt>
                <dd>
                  {stats.points.length} {t("séances")}
                  <small>
                    {t("du {a} au {b}", { a: fmtDate(stats.points[0].date), b: fmtDate(last.date) })}
                  </small>
                </dd>
              </div>
              <div>
                <dt>{t("Jours ouvrés sans bulletin lu")}</dt>
                <dd>
                  {missing.length}
                  <small>{missing.length ? `${missing.slice(-6).map((d) => fmtDate(d)).join(", ")}${missing.length > 6 ? " …" : ""} · ${t("jours fériés compris")}` : t("aucun")}</small>
                </dd>
              </div>
              <div>
                <dt>{t("Séances avec mouvement")}</dt>
                <dd>
                  {movedSessions.length}
                  <small>
                    {fmtPct((movedSessions.length / stats.points.length) * 100, 0)} {t("des séances")}
                    {lastMoved ? ` · ${t("dernière")} : ${fmtDate(lastMoved.date)}, ${signed(lastMoved.variationPct)}` : ""}
                  </small>
                </dd>
              </div>
              <div>
                <dt>{t("Montant échangé 12 mois")}</dt>
                <dd>
                  {money(amount12)} FCFA
                  <small>
                    {fmt(trades12)} {t("transactions")}
                    {top12 && amount12 ? ` · ${fmtPct((top12[1] / amount12) * 100, 0)} ${t("sur")} ${top12[0]}` : ""}
                  </small>
                </dd>
              </div>
              <div>
                <dt>{t("Capitalisation")}</dt>
                <dd>
                  {money(capT)} FCFA
                  <small>
                    {t("flottant coté")} {money(capF)} ({capT ? fmtPct((capF / capT) * 100, 0) : "—"})
                    {rotation12 != null ? ` · ${t("rotation du flottant 12 mois")} : ${fmtPct(rotation12, 0)}` : ""}
                  </small>
                </dd>
              </div>
              <div>
                <dt>{t("Méthode")}</dt>
                <dd>
                  {t("indice de prix, pondéré par la capitalisation")}
                  <small>{t("base, date de base et règle de pondération : à confirmer auprès de la BVMAC")}</small>
                </dd>
              </div>
              <div>
                <dt>{t("Source")}</dt>
                <dd>
                  {t("Bulletin officiel de la cote, BVMAC")}
                  <small>{t("chaque bulletin est gardé ; rien n'est recalculé, tout est relu")}</small>
                </dd>
              </div>
            </dl>
            <div className={styles.btns}>
              <a className="btn sm primary" href="/indice/serie.csv">
                {t("Télécharger la série (CSV)")}
              </a>
              <Link className="btn sm" href="/info/indice-bvmac">
                {t("La leçon")}
              </Link>
              <Link className="btn sm ghost" href="/societes">
                {t("Les sociétés cotées")}
              </Link>
            </div>
          </section>

          <section className="panel" id="seances">
            <div className="panel-h">
              <h2>{all ? t("Toutes les séances") : t("Les séances où l'indice a bougé")}</h2>
              <span className="muted">{all ? t("{n} séances lues, avec le négoce de chacune", { n: String(tableRows.length) }) : t("{n} sur {m} lues : les autres sont à 0,00 %, sans transaction sur les actions", { n: String(movedSessions.length), m: String(stats.points.length) })}</span>
            </div>
            <div className={styles.tableBar}>
              <Link className={`btn sm ${all ? "" : "primary"}`} href={q({ toutes: "" })}>
                {t("avec mouvement")}
              </Link>
              <Link className={`btn sm ${all ? "primary" : ""}`} href={q({ toutes: "1" })}>
                {t("toutes les séances")}
              </Link>
              <span className={styles.tableSep} />
              <Link className={`btn sm ${societe ? "ghost" : ""}`} href={q({ societe: "" })}>
                {t("toutes les sociétés")}
              </Link>
              {weights.map((w) => (
                <Link key={w.mnemo} className={`btn sm ${societe === w.mnemo ? "" : "ghost"}`} href={q({ societe: w.mnemo })}>
                  {w.mnemo}
                </Link>
              ))}
            </div>
            {pageRows.length === 0 ? (
              <p className={styles.p}>{t("Aucune séance ne correspond.")}</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={`tbl ${styles.moved}`}>
                  <thead>
                    <tr>
                      <th className={styles.when}>{t("Séance")}</th>
                      <th className={styles.num}>{t("Variation")}</th>
                      <th className={styles.num}>{t("Niveau")}</th>
                      <th className={styles.num}>{t("Titres")}</th>
                      <th className={styles.num}>{t("Montant")}</th>
                      <th className={styles.num}>{t("Trans.")}</th>
                      <th>{t("Ce qui a bougé")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((p) => {
                      const s = trading.get(p.date);
                      const sh = societe && s ? s.shares[societe] : undefined;
                      const mv = movers.get(p.date) ?? [];
                      return (
                        <tr key={p.date}>
                          <td className={styles.when}>{fmtDate(p.date)}</td>
                          <td className={`${styles.num} ${tone(p.variationPct)}`}>{signed(p.variationPct)}</td>
                          <td className={styles.num}>{lvl(p.value)}</td>
                          <td className={styles.num}>{fmt(sh ? sh.titles : (s?.titles ?? 0))}</td>
                          <td className={styles.num}>{(sh ? sh.amount : (s?.amount ?? 0)) ? `${money(sh ? sh.amount : (s?.amount ?? 0))}` : "0"}</td>
                          <td className={styles.num}>{sh ? sh.trades : (s?.trades ?? 0)}</td>
                          <td className={styles.what}>
                            {mv.length ? (
                              mv.map((m, i) => (
                                <span key={m.mnemo}>
                                  {i > 0 ? " · " : ""}
                                  <Link href={`/societes/${m.mnemo.toLowerCase()}?depuis=indice`}>{m.mnemo}</Link>{" "}
                                  {m.variationPct !== 0 ? <b className={tone(m.variationPct)}>{signed(m.variationPct)}</b> : <span className="muted">{t("échange sans changement de cours")}</span>}
                                </span>
                              ))
                            ) : (p.variationPct ?? 0) !== 0 ? (
                              <span className="muted">{t("cours d'action non lus sur cette séance")}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {pages > 1 && (
              <div className={styles.pager}>
                {page > 1 && (
                  <Link className="btn sm ghost" href={q({ page: String(page - 1) })}>
                    ← {t("précédentes")}
                  </Link>
                )}
                <span className="muted">
                  {t("page {p} sur {n}", { p: String(page), n: String(pages) })}
                </span>
                {page < pages && (
                  <Link className="btn sm ghost" href={q({ page: String(page + 1) })}>
                    {t("suivantes")} →
                  </Link>
                )}
              </div>
            )}
          </section>

          <section className="panel" id="composition">
            <div className="panel-h">
              <h2>{t("Composition")}</h2>
              <span className="muted">{t("les actions cotées et leur poids, sur le capital global et sur le flottant coté")}</span>
            </div>
            <div className={styles.tableWrap}>
              <table className={`tbl ${styles.comp}`}>
                <thead>
                  <tr>
                    <th className={styles.when}>{t("Société")}</th>
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
                      <td className={styles.when}>
                        <Link href={`/societes/${w.mnemo.toLowerCase()}?depuis=indice`}>
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

          <section className={`panel ${styles.teach}`} id="lecture">
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
            <MarketStrip current="indice" />
            <BackToTop />
          </div>
          <PageOutline
            label={t("Sur cette page")}
            sections={[
              { id: "niveau", title: t("Le niveau") },
              { id: "courbe", title: t("Séance après séance") },
              ...(notes.length > 0 ? [{ id: "notes", title: t("Les notes de marché") }] : []),
              { id: "donnees", title: t("Données") },
              { id: "seances", title: t("Les séances") },
              { id: "composition", title: t("Composition") },
              { id: "lecture", title: t("Comment le lire") },
            ]}
            meta={t("Lu dans le bulletin officiel de la cote, à chaque séance.")}
          />
        </div>
      )}
    </>
  );
}
