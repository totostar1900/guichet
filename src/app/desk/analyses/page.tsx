import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { TallTable } from "@/components/desk/TallTable";
import { COUNTRY_COLOR } from "@/components/market/CurveChart";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { pressureByYear, programByYear } from "@/lib/market/auction-stats";
import { bridge } from "@/lib/market/bridge";
import { buildCurve, MIN_POINTS } from "@/lib/market/curve";
import { freshness, liquidity } from "@/lib/market/liquidity";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analyses de marché" };

const pct = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })} %`);
const md = (v: number) => `${(v / 1e9).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Md`;
const AN = 365;

/**
 * Le dossier d'analyses du desk.
 *
 * Tout ce que la maison sait mesurer sur les deux marchés qu'elle suit, en une
 * page, avec ce que chaque mesure vaut à côté d'elle. C'est un instrument de
 * travail avant d'être une publication : deux personnes ne tiennent pas un
 * commentaire de marché en tenant aussi un carnet d'ordres, et la seule façon
 * d'y arriver est que la page soit déjà écrite quand on décide de publier.
 *
 * D'où la colonne qui traverse la page : chaque section dit si elle peut
 * sortir du desk, et sinon pourquoi. Une mesure qui repose sur trois séances
 * relues n'est pas fausse, elle est fragile, et la différence entre les deux
 * se perd exactement au moment où on la copie dans une note.
 */
export default async function AnalysesPage() {
  await requireDesk("/desk/analyses");
  const t = await getT();
  const r = repo();
  // Deux ans de cotations : assez pour qu'une ligne dormante se voie, et le
  // calcul part d'une date et non d'un horodatage, que la règle de pureté
  // des composants serveur interdit.
  const ilYADeuxAns = new Date();
  ilYADeuxAns.setFullYear(ilYADeuxAns.getFullYear() - 2);
  const debut = ilYADeuxAns.toISOString().slice(0, 10);
  const [seances, bulletins, activite, cotes] = await Promise.all([
    r.listAuctionResults({ limit: 1000 }),
    r.listBulletins(1000).catch(() => []),
    r.quoteActivity(debut).catch(() => []),
    r.latestQuotes().catch(() => []),
  ]);

  const relues = seances.filter((s) => s.confirmedBy);
  const courbe = buildCurve(seances, { windowDays: AN });
  const tracables = courbe.countries.filter((c) => c.points.length >= MIN_POINTS);
  const pression = pressureByYear(relues);
  const programme = programByYear(relues);
  const liq = liquidity(activite, cotes);
  const frais = liq ? freshness(liq) : undefined;
  const ponts = liq ? bridge(seances, liq.lines) : [];
  // Par comparaison de dates, et non par l'ordre du dépôt : celui-ci rend les
  // bulletins du plus récent au plus ancien, et s'y fier avait interverti les
  // deux bornes, donnant une hausse de quinze pour cent pour une baisse de
  // treize.
  const avecIndice = bulletins.filter((b) => b.indexValue != null);
  const dernierIndice = avecIndice.reduce<(typeof avecIndice)[number] | undefined>((m, b) => (!m || b.sessionDate > m.sessionDate ? b : m), undefined);
  const premierIndice = avecIndice.reduce<(typeof avecIndice)[number] | undefined>((m, b) => (!m || b.sessionDate < m.sessionDate ? b : m), undefined);

  /** Ce qui peut sortir du desk, et ce qui n'est pas encore assez solide pour cela. */
  const sortie = (ok: boolean, raison: string) => (ok ? <span className="st reglee">{t("publiable")}</span> : <span className="st transmise" title={t(raison)}>{t("interne")}</span>);

  return (
    <>
      <DeskNav current="/desk/analyses" />

      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1>{t("Analyses de marché")}</h1>
            <p className="muted">
              {t(
                "Ce que la maison sait mesurer sur les deux marchés qu'elle suit, et ce que chaque mesure vaut. Rien n'est calculé sur une séance non relue ; ce qui manque est compté plutôt que comblé.",
              )}
            </p>
          </div>
          <Link className="btn sm ghost" href="/desk/docs/analyses">
            {t("Méthodologie")}
          </Link>
        </header>

        <div className={styles.band}>
          <div>
            <span>{t("Séances d'adjudication")}</span>
            <b>{fmt(seances.length)}</b>
          </div>
          <div>
            <span>{t("Dont relues")}</span>
            <b className={relues.length < 10 ? styles.warnb : undefined}>{fmt(relues.length)}</b>
          </div>
          <div>
            <span>{t("Bulletins lus")}</span>
            <b>{fmt(bulletins.length)}</b>
          </div>
          <div>
            <span>{t("Lignes-séances")}</span>
            <b>{fmt(liq?.lineSessions ?? 0)}</b>
          </div>
          <div>
            <span>{t("Trésors sur la courbe")}</span>
            <b className={tracables.length ? undefined : styles.warnb}>{tracables.length}</b>
          </div>
        </div>

        {/* 1. La courbe : elle a sa page, et ce panneau n'en est que la porte. */}
        <section className="panel">
          <div className="panel-h">
            <h2>{t("La courbe souveraine")}</h2>
            <span className="muted">{sortie(tracables.length >= 2, "Une courbe se publie quand deux Trésors au moins portent chacun deux durées relues.")}</span>
          </div>
          <div className={styles.pb}>
            {tracables.length ? (
              <>
                <div className={styles.tiles}>
                  {tracables.map((c) => (
                    <div key={c.country} className={styles.tile}>
                      <span className={styles.dot} style={{ background: COUNTRY_COLOR[c.country] }} aria-hidden="true" />
                      <b>{c.country}</b>
                      <em>{t("{n} points · le plus ancien à {j} jours", { n: c.points.length, j: c.oldestDays })}</em>
                      <div className={styles.pts}>
                        {c.points.map((p) => (
                          <span key={p.tenor}>
                            {p.tenor.replace(" semaines", " sem.")} <b>{pct(p.yield.pct, 2)}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className={styles.note}>
                  <Link href="/desk/courbe">{t("Ouvrir la courbe")} →</Link>
                  {courbe.gaps.length > 0 && <span className="muted">{` · ${t("{n} séances relues ne donnent pas de point, faute de coupon ou de durée", { n: String(courbe.gaps.length) })}`}</span>}
                </p>
              </>
            ) : (
              <div className="empty">{t("Pas encore deux durées relues pour un même Trésor sur l'année écoulée.")}</div>
            )}
          </div>
        </section>

        {/* 2. La pression : la mesure la plus dure du jeu, et la plus simple. */}
        <section className="panel">
          <div className="panel-h">
            <h2>{t("La pression de la demande")}</h2>
            <span className="muted">{sortie(pression.some((p) => p.n >= 5), "Une moyenne annuelle demande au moins cinq séances relues dans l'année.")}</span>
          </div>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Année")}</th>
                  <th className="r">{t("Séances")}</th>
                  <th className="r">{t("Couverture moyenne")}</th>
                  <th className="r">{t("Part servie du soumis")}</th>
                  <th className="r">{t("Soumissionnaires")}</th>
                  <th>{t("Lecture")}</th>
                </tr>
              </thead>
              <tbody>
                {pression.map((p) => (
                  <tr key={p.year}>
                    <td>{p.year}</td>
                    <td className="r">{p.n}</td>
                    <td className="r">
                      <b>{`${p.coverage.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ×`}</b>
                    </td>
                    <td className="r">{pct(p.allotment, 0)}</td>
                    <td className="r">{p.bidders == null ? "—" : p.bidders.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</td>
                    <td>
                      {p.coverage >= 1.4 ? <span className="st reglee">{t("le Trésor choisit")}</span> : p.coverage >= 0.9 ? <span className="st transmise">{t("équilibre")}</span> : <span className="st annulee">{t("le Trésor subit")}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>
            {t(
              "Les deux colonnes du milieu se lisent ensemble : une couverture qui tombe pendant que la part servie monte vers cent pour cent dit que le Trésor ne trie plus, il prend ce qui se présente.",
            )}
          </p>
        </section>

        {/* 3. L'exécution : publiable le jour où la série est complète, pas avant. */}
        <section className="panel">
          <div className="panel-h">
            <h2>{t("L'exécution du programme d'émission")}</h2>
            <span className="muted">{sortie(false, "Calculée sur les séances relevées, qui ne sont pas le programme annuel d'un Trésor.")}</span>
          </div>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Trésor")}</th>
                  <th>{t("Année")}</th>
                  <th className="r">{t("Séances")}</th>
                  <th className="r">{t("Annoncé")}</th>
                  <th className="r">{t("Servi")}</th>
                  <th className="r">{t("Exécution")}</th>
                  <th style={{ width: "28%" }}></th>
                </tr>
              </thead>
              <tbody>
                {programme.map((p) => (
                  <tr key={`${p.country}-${p.year}`}>
                    <td>{p.country}</td>
                    <td>{p.year}</td>
                    <td className="r">{p.sessions}</td>
                    <td className="r">{md(p.announced)}</td>
                    <td className="r">{md(p.served)}</td>
                    <td className="r">
                      <b>{pct(p.execution, 0)}</b>
                    </td>
                    <td>
                      <div className={styles.bar}>
                        <i style={{ width: `${Math.min(100, p.execution).toFixed(0)}%`, background: COUNTRY_COLOR[p.country] }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. La liquidité : aucune donnée nouvelle, et la mesure qui qualifie tout le reste. */}
        {liq && (
          <section className="panel">
            <div className="panel-h">
              <h2>{t("La liquidité du marché secondaire")}</h2>
              <span className="muted">{sortie(true, "")}</span>
            </div>
            <div className={styles.pb}>
              <div className={styles.kpis}>
                <div>
                  <span>{t("Lignes-séances")}</span>
                  <b>{fmt(liq.lineSessions)}</b>
                </div>
                <div>
                  <span>{t("Dont une transaction")}</span>
                  <b className={styles.crit}>{fmt(liq.traded)}</b>
                </div>
                <div>
                  <span>{t("Part traitée")}</span>
                  <b className={styles.crit}>{pct(liq.share, 1)}</b>
                </div>
                <div>
                  <span>{t("Valeur échangée")}</span>
                  <b>{md(liq.value)}</b>
                </div>
                <div>
                  <span>{t("Séances muettes")}</span>
                  <b className={styles.crit}>{`${liq.mute} / ${liq.sessions}`}</b>
                </div>
              </div>
              <TallTable total={liq.lines.length} cap={12}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t("Ligne")}</th>
                      <th>{t("Instr.")}</th>
                      <th className="r">{t("Séances cotées")}</th>
                      <th className="r">{t("Traitées")}</th>
                      <th className="r">{t("Fréquence")}</th>
                      <th className="r">{t("Valeur")}</th>
                      <th>{t("Dernière transaction")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liq.lines.map((l) => (
                      <tr key={l.isin}>
                        <td>
                          <b>{l.mnemo}</b>
                        </td>
                        <td>{t(l.instrument)}</td>
                        <td className="r">{fmt(l.sessions)}</td>
                        <td className="r">{fmt(l.traded)}</td>
                        <td className="r">{pct(l.share, 0)}</td>
                        <td className="r">{l.value ? md(l.value) : "—"}</td>
                        <td>
                          {l.lastTrade == null ? (
                            <span className="st annulee">{t("jamais")}</span>
                          ) : (l.staleDays ?? 0) > 7 ? (
                            <span className="st annulee">{t("il y a {n} j", { n: l.staleDays! })}</span>
                          ) : (
                            <span className="st reglee">{t("il y a {n} j", { n: l.staleDays! })}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TallTable>
            </div>
            <p className={styles.note}>
              {t("{n} obligations sur {m} n'ont jamais connu une transaction sur la période : leur cours affiché est un prix de référence reporté, pas un prix de marché.", {
                n: String(liq.lines.filter((l) => l.instrument === "obligation" && l.traded === 0).length),
                m: String(liq.lines.filter((l) => l.instrument === "obligation").length),
              })}
            </p>
          </section>
        )}

        {/* 5. La fraîcheur : le chiffre à porter à côté du niveau de l'indice. */}
        {frais && dernierIndice && (
          <section className="panel">
            <div className="panel-h">
              <h2>{t("La fraîcheur de l'indice")}</h2>
              <span className="muted">{sortie(true, "")}</span>
            </div>
            <div className={styles.pb}>
              <div className={styles.kpis}>
                <div>
                  <span>{t("Niveau au {d}", { d: fmtDate(dernierIndice.sessionDate) })}</span>
                  <b>{dernierIndice.indexValue?.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
                </div>
                {premierIndice?.indexValue != null && dernierIndice.indexValue != null && (
                  <div>
                    <span>{t("Depuis le {d}", { d: fmtDate(premierIndice.sessionDate) })}</span>
                    <b>{pct(((dernierIndice.indexValue - premierIndice.indexValue) / premierIndice.indexValue) * 100, 1)}</b>
                  </div>
                )}
                <div>
                  <span>{t("Composantes traitées ce jour-là")}</span>
                  <b className={frais.tradedLast === 0 ? styles.crit : undefined}>{`${frais.tradedLast} / ${frais.total}`}</b>
                </div>
                <div>
                  <span>{t("Par séance, sur {n}", { n: frais.window })}</span>
                  <b>{frais.tradedPerSession.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</b>
                </div>
                <div>
                  <span>{t("Plus longue dormance")}</span>
                  <b className={frais.worstDays > 30 ? styles.crit : undefined}>{t("{n} jours", { n: frais.worstDays })}</b>
                </div>
              </div>
              <p className={styles.strong}>
                {frais.stale.length > 0
                  ? t("Sur {m} composantes du panier, {liste} n'avaient pas traité depuis plus de {s} jours. L'indice n'est pas faux, il est calculé sur des cours qui datent, et c'est cette phrase qui doit accompagner le niveau publié.", {
                      m: String(frais.total),
                      s: String(frais.seuilDays),
                      liste: frais.stale.map((s) => `${s.mnemo} (${s.staleDays ?? "—"} jours)`).join(", "),
                    })
                  : t("Toutes les composantes ont traité dans la semaine : le niveau publié repose sur des cours frais.")}
              </p>
              <p className={styles.note}>
                {t("Le compte se fait en nombre de composantes et non en capitalisation, faute d'une pondération publiée par la bourse. L'approximation va dans le sens de la prudence : une grosse ligne dormante pèse plus que ce compte ne le montre.")}
              </p>
            </div>
          </section>
        )}

        {/* 6. Le pont : la mesure la plus utile au client, et la plus exigeante en prudence. */}
        {ponts.length > 0 && (
          <section className="panel">
            <div className="panel-h">
              <h2>{t("Le pont primaire / secondaire")}</h2>
              <span className="muted">{sortie(false, "Coupons et maturités diffèrent des deux côtés : l'écart en points de prix se commente, il ne se publie pas seul.")}</span>
            </div>
            <div className="scroll-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("Trésor")}</th>
                    <th>{t("Primaire")}</th>
                    <th className="r">{t("Prix adjugé")}</th>
                    <th>{t("Séance")}</th>
                    <th>{t("Ligne cotée")}</th>
                    <th className="r">{t("Cours affiché")}</th>
                    <th>{t("Dernière transaction")}</th>
                    <th className="r">{t("Écart")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ponts.map((p) => (
                    <tr key={`${p.country}-${p.line.isin}`}>
                      <td>{p.country}</td>
                      <td>{p.primary.tenor}</td>
                      <td className="r">
                        <b>{pct(p.primaryPrice, 2)}</b>
                      </td>
                      <td>{fmtDate(p.primary.sessionOn)}</td>
                      <td>
                        <b>{p.line.mnemo}</b>
                      </td>
                      <td className="r">{pct(p.line.close, 2)}</td>
                      <td>{p.line.lastTrade ? fmtDate(p.line.lastTrade) : <span className="st annulee">{t("jamais")}</span>}</td>
                      <td className="r">
                        <b>{`${p.gapPoints > 0 ? "+" : ""}${p.gapPoints.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts`}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.note}>
              {t(
                "L'écart est en points de prix et jamais en rendement : un écart de rendement demanderait le coupon des deux côtés. Une ligne qui n'a jamais traité n'a pas de prix de marché, et l'écart mesure alors la distance entre un prix payé et un prix reporté.",
              )}
            </p>
          </section>
        )}

        {/* 7. Sortir du desk : la règle, écrite une fois. */}
        <section className="panel">
          <div className="panel-h">
            <h2>{t("Avant de publier")}</h2>
            <span className="muted">{t("la règle, et non un usage")}</span>
          </div>
          <div className={styles.pb}>
            <ol className={styles.steps}>
              <li>{t("Une mesure marquée « interne » ne quitte pas le desk telle quelle : la colonne du panneau dit pourquoi, et la raison se lève par du travail, pas par une décision.")}</li>
              <li>{t("Tout chiffre publié porte sa date d'observation, son nombre de séances et l'origine de ses rendements. Un rendement calculé se présente comme calculé.")}</li>
              <li>{t("Un niveau d'indice ne se publie jamais sans sa fraîcheur : la phrase est déjà écrite au panneau correspondant, elle se copie telle quelle.")}</li>
              <li>{t("Une note qui sort passe par Publications, où elle prend un numéro, une version et une trace au journal.")}</li>
            </ol>
            <p className={styles.note}>
              <Link href="/desk/docs/analyses">{t("Méthodologie et procédure")} →</Link>
              {" · "}
              <Link href="/desk/indice">{t("Notes de marché")} →</Link>
              {" · "}
              <Link href="/desk/adjudications/tableau">{t("Toutes les séances")} →</Link>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
