import Link from "next/link";
import { IndexChart, type ChartPoint, type OverlaySeries } from "@/components/IndexChart";
import { fmt, fmtDate, fmtDateTime, fmtPct, money } from "@/lib/format";
import { indexPageData } from "@/lib/market/index-data";
import { quarters } from "@/lib/market/index-quarter";
import { Sommaire } from "@/components/Sommaire";
import { MarketStrip } from "@/components/MarketStrip";
import { BackToTop } from "@/components/BackToTop";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";
import { EnTete } from "@/components/EnTete";

/**
 * La page de l'indice, une seule fois.
 *
 * Le Guichet la montre au client, le desk la lit chez lui : c'est le même
 * indice, lu au même bulletin, et il n'y aurait aucun sens à en tenir deux
 * versions. « mode » ne change que les liens qui sortent : le Guide n'est pas
 * servi sur le domaine du desk, et les notes trimestrielles s'y travaillent
 * depuis leur propre page plutôt que sur leur page publique.
 */

const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
const lvl = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * The index page: the level and its deltas, every session read with a
 * crosshair, pins and a share overlaid, the sessions where it actually
 * moved and which share moved it, the composition on both weightings, and
 * how to read it. Market information, open to everyone.
 */
/** Où mènent les liens qui sortent : chez le desk, ou nulle part quand la page n'y est pas servie. */
export type IndiceMode = "client" | "desk";

export async function IndiceBody({ searchParams, mode = "client" }: { searchParams: Promise<{ toutes?: string; societe?: string; page?: string }>; mode?: IndiceMode }) {
  const desk = mode === "desk";
  const base = desk ? "/desk" : "";
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const data = await indexPageData();
  const { stats, weights, nameOf, histories, trading, movers, lastBulletin, missing } = data;
  const notes = quarters(data).slice(0, 6);
  const points: ChartPoint[] = stats.points.map((p) => {
    const s = trading.get(p.date);
    return { ...p, movers: (p.variationPct ?? 0) !== 0 ? movers.get(p.date) : undefined, titles: s?.titles ?? 0, amount: s?.amount ?? 0, trades: s?.trades ?? 0 };
  });
  /**
   * Depuis quand chaque valeur du panier n'a plus traité.
   *
   * Tiré des historiques déjà chargés : la dernière séance où la ligne a changé
   * de mains, contre la dernière séance lue. Une valeur qui n'a jamais traité
   * sur la période n'a pas une dormance de zéro, elle n'en a pas, et elle
   * compte comme dormante.
   */
  const SEUIL_DORMANCE = 7;
  const dernierJour = stats.points.at(-1)?.date;
  const dormances = histories
    .map(({ w, quotes }) => {
      const derniere = [...quotes].reverse().find((q) => (q.trades ?? 0) > 0 || (q.volumeTraded ?? 0) > 0)?.sessionDate;
      const jours = derniere && dernierJour ? Math.round((Date.parse(dernierJour) - Date.parse(derniere)) / 86_400_000) : undefined;
      return { mnemo: w.mnemo, jours };
    })
    .sort((a, b) => (b.jours ?? 9999) - (a.jours ?? 9999));
  const dormantes = dormances.filter((d) => (d.jours ?? 9999) > SEUIL_DORMANCE);

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
  /* DOUZE MOIS DE NÉGOCE, pour le chiffre que le niveau porte en tête.
     QUATRE CALCULS SONT PARTIS AVEC LE PANNEAU « DONNÉES », le 1er novembre
     2026 : le nombre de transactions, la société qui en concentre le plus, la
     dernière séance qui a bougé, et la rotation du flottant. Ils ne se
     lisaient que là. Les garder calculés pour personne serait une page qui
     travaille sans rien montrer — et le relevé des variables mortes l'aurait
     dit au premier passage. */
  const since12 = stats.last ? new Date(new Date(`${stats.last.date}T12:00:00Z`).getTime() - 365 * 86400e3).toISOString().slice(0, 10) : "";
  const amount12 = [...trading.entries()].filter(([d]) => d >= since12).reduce((a, [, s]) => a + s.amount, 0);
  const last = stats.last;
  const year = last ? stats.points.filter((p) => p.date >= new Date(new Date(`${last.date}T12:00:00Z`).getTime() - 365 * 86400e3).toISOString().slice(0, 10)) : [];
  const high = year.reduce<typeof last>((a, p) => (!a || p.value > a.value ? p : a), undefined);
  const low = year.reduce<typeof last>((a, p) => (!a || p.value < a.value ? p : a), undefined);
  const movedSessions = [...stats.points].filter((p) => (p.variationPct ?? 0) !== 0).reverse();
  const tone = (v?: number) => (v == null || Math.abs(v) < 0.005 ? "" : v > 0 ? styles.up : styles.down);
  const capT = weights.reduce((a, w) => a + w.capTotal, 0);
  const capF = weights.reduce((a, w) => a + w.capFloat, 0);

  return (
    <>
      {/* LE LIEN DU SUR-TITRE DEVIENT LE RETOUR, et c'est la règle appliquée
          plutôt que contournée. « BVMAC » menait à « /marche » depuis le
          créneau d'avant-titre : un chemin vers le parent, déguisé en mot
          d'une description — exactement ce que l'étalon interdit là, et
          exactement ce que le premier créneau sert à dire. Le desk, qui n'a
          pas cette page au-dessus de lui, n'a pas de retour. */}
      <div className={styles.head}>
        <div>
          <EnTete
            retour={desk ? undefined : { href: "/marche", mot: t("Le marché") }}
            surTitre={`BVMAC · ${t("indice de prix")} · ${t("à chaque séance")}`}
            titre={t("L'indice BVMAC All Share")}
            phrase={t("Un seul nombre pour toutes les actions cotées à la BVMAC : la somme des capitalisations, ramenée à une base. Guichet le montre tel qu'il est publié.")}
          />
        </div>
        <div className={styles.links}>
          <Link className="btn sm" href="/info/indice-bvmac">
            {t("L'éclairage : comment le lire")}
          </Link>
          <Link className="btn sm ghost" href={`${base}/comparer`}>
            {t("Comparer deux lignes")}
          </Link>
        </div>
      </div>

      {!last ? (
        <div className="empty">{t("L'indice s'affichera ici dès la première séance lue.")}</div>
      ) : (
        <Sommaire
          label={t("Sur cette page")}
          sections={[
            { id: "niveau", title: t("Le niveau") },
            { id: "courbe", title: t("Séance après séance") },
            ...(notes.length > 0 ? [{ id: "notes", title: t("Les notes de marché") }] : []),
            /* « Données » a quitté cette liste avec son panneau, le 1er
               novembre 2026. Il redisait ce que le niveau porte déjà — la
               capitalisation, les douze mois échangés — et sa méthode est
               celle de « Données et méthode », trois sections plus bas. Ce
               qu'il avait en propre y est descendu : la série en CSV, les
               jours sans bulletin, et qui a lu le dernier. */
            { id: "seances", title: t("Les séances") },
            { id: "composition", title: t("Composition") },
            /* L'ancre « sante » est posée par la page du desk, qui rend le
               panneau après ce corps : un composant du desk ne s'importe pas
               depuis une page du Guichet. */
            ...(desk ? [{ id: "sante", title: t("Santé de l'indice") }] : []),
            { id: "lecture", title: t("Comment le lire") },
          ]}
          meta={t("À chaque séance.")}
        >
          <div className={styles.sections}>
            <section className={styles.level} id="niveau">
            {/* La carte porte un nom : sans lui, le grand chiffre flottait en
                tête de page sans dire ce qu'il mesurait. */}
            <h2 className={styles.levelH}>{t("Le niveau du jour")}</h2>
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
              {/* LA TAILLE DU MARCHÉ ET CE QU'IL ÉCHANGE, à côté de son
                  niveau : les deux vivaient plus bas, dans « Données », où
                  l'on ne descend pas pour savoir de quoi on parle. Leur
                  provenance et leur détail y restent. */}
              <div>
                <dt>{t("Capitalisation")}</dt>
                <dd>{money(capT)} <small>FCFA</small></dd>
              </div>
              <div>
                <dt>{t("Échangé sur 12 mois")}</dt>
                <dd>{money(amount12)} <small>FCFA</small></dd>
              </div>
            </dl>

          </section>

          <section className="panel" id="courbe">
            <div className="panel-h">
              <h2>{t("Séance après séance")}</h2>
              <span className="muted">{t("lu depuis le bulletin du {d}", { d: fmtDate(stats.points[0].date) })}</span>
            </div>
            <div className={styles.chart}>
              <IndexChart points={points} overlays={overlays} societeInitiale={societe} lieSocieteALAdresse />
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
                  <Link key={q.key} className="btn sm" href={desk ? "/desk/indice" : `/indice/note/${q.key.toLowerCase()}`}>
                    {t(q.q === 1 ? "1er trimestre {y}" : "{n}e trimestre {y}", { n: q.q, y: q.year })} →
                  </Link>
                ))}
              </div>
            </section>
          )}

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
              <div className={`scroll-x ${styles.tableWrap}`}>
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
                                  <Link href={`${base}/societes/${m.mnemo.toLowerCase()}?depuis=indice`}>{m.mnemo}</Link>{" "}
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
            <div className={`scroll-x ${styles.tableWrap}`}>
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
                        <Link href={`${base}/societes/${w.mnemo.toLowerCase()}?depuis=indice`}>
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
                    <td className={styles.when}>{t("Ensemble")}</td>
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

          {/* TROIS PARAGRAPHES SONT DEVENUS QUATRE LIGNES. Ils expliquaient
              l'indice par ses manques, « les poids sont très inégaux », « 0,00 %
              est la norme », là où l'éclairage l'explique déjà et mieux. Reste ce
              qu'une page de données doit porter : d'où viennent les chiffres,
              ce que l'indice mesure, et ce qu'il ne mesure pas. */}
          <details className={`panel ${styles.teach}`} id="lecture">
            <summary>
              <h2>{t("Données et méthode")}</h2>
            </summary>
            <p className={styles.method}>
              {t("Indice de prix pondéré par la capitalisation, montré tel qu'il est publié. Les dividendes n'y entrent pas : la performance d'un porteur, c'est le cours et le dividende.")}{" "}
              {t("L'historique commence au premier bulletin lu par Guichet, le {d}.", { d: fmtDate(stats.points[0].date) })}{" "}
              {t("Guichet le publie et l'explique : c'est un repère de marché, que chaque investisseur rapporte ensuite à ses propres objectifs.")}
            </p>
            {/* La fraîcheur du panier : elle qualifie le niveau, et c'est une
                précision de méthode plutôt qu'une phrase de carte. */}
            {dormances.length > 0 && (
              <p className={styles.method}>
                {t("Sur les {m} valeurs du panier, {n} ont traité dans la semaine.", { m: String(dormances.length), n: String(dormances.length - dormantes.length) })}{" "}
                {dormantes.length > 0
                  ? t("{liste} : leur cours est celui de leur dernière transaction, et l'indice le reprend tel quel.", {
                      liste: dormantes.map((d) => (d.jours == null ? t("{m}, aucune transaction sur la période", { m: d.mnemo }) : t("{m}, il y a {j} jours", { m: d.mnemo, j: String(d.jours) }))).join(" · "),
                    })
                  : t("Le niveau publié repose donc sur des cours du jour.")}
              </p>
            )}
            {/* ─── CE QUI DESCEND DU PANNEAU « DONNÉES », le 1er novembre 2026 ──
                Il a été retiré sur décision du dirigeant : il redisait la
                capitalisation et les douze mois échangés, que le niveau porte
                déjà en tête de page, et sa ligne « Méthode » répétait le
                premier paragraphe d'ici.
                CE QU'IL AVAIT EN PROPRE N'A PAS DE SECOND ENDROIT, et c'est
                ce qui suit. La provenance du dernier chiffre — qui l'a lu, et
                quand — est la seule chose qui distingue un indice publié d'un
                indice affirmé. Les jours ouvrés sans bulletin sont le TROU de
                la série : une page qui montre une courbe sans dire ce qui lui
                manque laisse croire qu'il ne lui manque rien. Et la série en
                CSV est la seule sortie de données de tout Guichet. */}
            <p className={styles.method}>
              {lastBulletin
                ? t("Le dernier bulletin lu porte la séance du {d} ; il a été lu le {q}, {by}.", {
                    d: fmtDate(last.date),
                    q: fmtDateTime(lastBulletin.ingestedAt),
                    by: lastBulletin.ingestedBy === "cron" ? t("par le robot") : t("par le desk"),
                  })
                : t("La séance du {d} est la dernière lue.", { d: fmtDate(last.date) })}{" "}
              {missing.length
                ? t("{n} jours ouvrés n'ont pas de bulletin lu, jours fériés compris, dont les derniers : {l}.", {
                    n: String(missing.length),
                    l: missing.slice(-6).map((d) => fmtDate(d)).join(", "),
                  })
                : t("Aucun jour ouvré ne manque à la série.")}
            </p>
            <div className={styles.btns}>
              {/* Un fichier : au desk il vient du Guichet, donc dans un onglet à
                  côté plutôt qu'en quittant la page. */}
              <a className="btn sm primary" href="/indice/serie.csv" target={desk ? "_blank" : undefined} rel={desk ? "noreferrer" : undefined}>
                {t("Télécharger la série (CSV)")}
              </a>
            </div>
            </details>
            <MarketStrip current="indice" mode={mode} />
            <BackToTop />
          </div>
        </Sommaire>
      )}
    </>
  );
}
