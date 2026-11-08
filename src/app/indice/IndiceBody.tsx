import Link from "next/link";
import { type ChartPoint, type OverlaySeries } from "@/components/IndexChart";
import { IndiceGraphe } from "./IndiceGraphe";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { indexPageData } from "@/lib/market/index-data";
import { quarters } from "@/lib/market/index-quarter";
import { vueDePeriode } from "@/lib/market/index-period";
import { loadCompanies } from "@/lib/reference";
import { Periode, debutDePeriode, periodeOuDefaut } from "./Periode";
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

export async function IndiceBody({ searchParams, mode = "client" }: { searchParams: Promise<{ toutes?: string; societe?: string; page?: string; periode?: string; du?: string; au?: string }>; mode?: IndiceMode }) {
  const desk = mode === "desk";
  const base = desk ? "/desk" : "";
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const data = await indexPageData();
  const { stats, weights, nameOf, histories, trading, movers } = data;
  const notes = quarters(data).slice(0, 6);
  const points: ChartPoint[] = stats.points.map((p) => {
    const s = trading.get(p.date);
    return { ...p, movers: (p.variationPct ?? 0) !== 0 ? movers.get(p.date) : undefined, titles: s?.titles ?? 0, amount: s?.amount ?? 0, trades: s?.trades ?? 0 };
  });
  const lastCount = (quotes: { sharesTotal?: number; sharesFloat?: number }[], k: "sharesTotal" | "sharesFloat") => [...quotes].reverse().find((q) => (q[k] ?? 0) > 0)?.[k];
  const companies = await loadCompanies().catch(() => []);
  const overlays: OverlaySeries[] = histories.map(({ w, quotes }) => ({ mnemo: w.mnemo, name: nameOf(w.mnemo), country: companies.find((c) => c.mnemo === w.mnemo)?.country, points: quotes.map((q) => ({ date: q.sessionDate, value: q.close, titles: q.volumeTraded || 0, amount: q.valueTraded || 0, trades: q.trades || 0, variationPct: q.variationPct })), sharesTotal: lastCount(quotes, "sharesTotal"), sharesFloat: lastCount(quotes, "sharesFloat") }));
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
  const periode = periodeOuDefaut(sp.periode);
  /* Une plage personnalisée (du, au) remplace la période : deux dates écrites en toutes lettres, sinon on l'ignore. */
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const du = date(sp.du);
  const au = date(sp.au);
  const plage = du && au && du < au ? { du, au } : undefined;
  const q = (o: { toutes?: string; societe?: string; page?: string }) => {
    const u = new URLSearchParams();
    const v = { toutes: all ? "1" : "", societe, page: "", ...o };
    if (v.toutes) u.set("toutes", "1");
    if (v.societe) u.set("societe", v.societe);
    if (v.page && v.page !== "1") u.set("page", v.page);
    if (periode !== "12m") u.set("periode", periode);
    return `/indice${u.toString() ? `?${u.toString()}` : ""}#seances`;
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
  const vue = last ? await vueDePeriode(data, plage?.du ?? debutDePeriode(periode, last.date), plage?.au ?? last.date) : undefined;
  const year = last ? stats.points.filter((p) => p.date >= new Date(new Date(`${last.date}T12:00:00Z`).getTime() - 365 * 86400e3).toISOString().slice(0, 10)) : [];
  const high = year.reduce<typeof last>((a, p) => (!a || p.value > a.value ? p : a), undefined);
  const low = year.reduce<typeof last>((a, p) => (!a || p.value < a.value ? p : a), undefined);
  const movedSessions = [...stats.points].filter((p) => (p.variationPct ?? 0) !== 0).reverse();
  const tone = (v?: number) => (v == null || Math.abs(v) < 0.005 ? "" : v > 0 ? styles.up : styles.down);
  const capT = weights.reduce((a, w) => a + w.capTotal, 0);

  return (
    /* UNE PILE : l'espace entre l'en-tête, les liens et le sommaire vient du jeton des sections (ETALON.md § 8). Le desk, qui rend le même corps, en profite. */
    <div className="pile">
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
            phrase={t("Le niveau d'ensemble des actions cotées à la BVMAC : la somme de leurs capitalisations, ramenée à une base. Il suit les cours, pas les dividendes. Publié par la BVMAC à chaque séance.")}
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
        /* PAS DE SOMMAIRE « SUR CETTE PAGE » (8 novembre 2026, à la demande du client) : la page se lit de haut en bas, sans menu qui la suive. */
        <>
          {/* LES SECTIONS FORMENT UNE PILE : plus de marge de 38 px sous chacune, l'écart vient du jeton. */}
          <div className={`pile ${styles.sections}`}>
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

          <section className={`panel ${styles.courbe}`} id="courbe">
            <div className="panel-h">
              <h2>{t("Séance après séance")}</h2>
              <span className="muted">{t("lu depuis le bulletin du {d}", { d: fmtDate(stats.points[0].date) })}</span>
            </div>
            {/* LA PÉRIODE EST DANS UNE BARRE COLLANTE, et le graphe comme les blocs du dessous se lisent sur la même : elle est dans l'adresse (periode, ou du et au pour une plage). */}
            <IndiceGraphe points={points} overlays={overlays} periode={periode} du={plage?.du} au={plage?.au} vueInitiale="volumes" societeInitiale={societe} lieSocieteALAdresse={desk}>
              {vue && <Periode vue={vue} quarterNoteHref={!desk && notes[0] ? `/indice/note/${notes[0].key.toLowerCase()}` : undefined} />}
            </IndiceGraphe>
          </section>

          {notes.length > 0 && (
            <section className="panel" id="notes">
              <div className="panel-h">
                <h2>{t("Les notes de marché")}</h2>
                <span className="muted">{t("un trimestre par note : ce qu'il a fait, les sociétés derrière le chiffre, ce qui s'est échangé")}</span>
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

          {desk && (
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
          )}




            <MarketStrip current="indice" mode={mode} />
            <BackToTop />
          </div>
        </>
      )}
    </div>
  );
}
