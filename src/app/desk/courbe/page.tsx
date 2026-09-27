import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { CurveChart, COUNTRY_COLOR } from "@/components/market/CurveChart";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import type { Country } from "@/lib/domain/types";
import { buildCurve, MIN_POINTS, spreads, SPREAD_COMPARABLE_DAYS } from "@/lib/market/curve";
import { YIELD_ORIGIN_LABEL } from "@/lib/market/yield";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courbe des taux" };

const pct = (v: number | null | undefined, d = 2) => (v == null ? "—" : `${v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })} %`);
const FENETRES = [90, 180, 365, 730];

/**
 * La courbe des taux de la CEMAC.
 *
 * Six États empruntent au même guichet et aucun ne publie sa courbe. Celle-ci
 * se construit sur les séances relues, une durée par point, et elle dit ce
 * qu'elle vaut : l'âge du point le plus vieux, l'origine de chaque rendement,
 * et le compte de ce qui manque.
 *
 * L'écran est fait pour qu'on puisse la mettre en doute. Un rendement imprimé
 * par le Trésor et un rendement calculé d'après un prix ont la même allure une
 * fois tracés ; la seule chose qui les sépare est la colonne « origine », et
 * c'est pour cela qu'elle est dans le tableau et non dans une note de bas de
 * page.
 */
export default async function CourbePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireDesk("/desk/courbe");
  const t = await getT();
  const sp = await searchParams;
  const all = await repo().listAuctionResults({ limit: 1000 });

  const on = /^\d{4}-\d{2}-\d{2}$/.test(sp.on ?? "") ? sp.on! : new Date().toISOString().slice(0, 10);
  const fenetre = FENETRES.includes(Number(sp.fenetre)) ? Number(sp.fenetre) : 365;
  const courbe = buildCurve(all, { on, windowDays: fenetre });

  const tracables = courbe.countries.filter((c) => c.points.length >= MIN_POINTS);
  const isoles = courbe.countries.filter((c) => c.points.length < MIN_POINTS);
  const origines = new Map<string, number>();
  for (const c of courbe.countries) for (const p of c.points) origines.set(p.yield.origin, (origines.get(p.yield.origin) ?? 0) + 1);
  const hypotheses = [...new Set(courbe.countries.flatMap((c) => c.points.flatMap((p) => p.yield.assumptions)))];
  // Un coupon relevé par le robot après la confirmation d'une séance : le point
  // compte, et la personne qui a signé la séance ne l'a pas vu passer.
  const aVerifier = courbe.countries.flatMap((c) => c.points.filter((p) => p.toVerify));

  // L'écart ne se calcule qu'entre deux Trésors réellement présents : le
  // premier porte le plus de points, et c'est lui qui sert de référence.
  const ref = tracables[0]?.country;
  const ecarts = ref ? tracables.slice(1).map((c) => ({ country: c.country, lignes: spreads(courbe, c.country, ref) })).filter((x) => x.lignes.length) : [];

  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) q.set(k, v);
    return `/desk/courbe?${q}`;
  };

  return (
    <>
      <DeskNav current="/desk/courbe" />

      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1>{t("Courbe des taux de la CEMAC")}</h1>
            <p className="muted">
              {t("Le coût de l'argent souverain à chaque horizon, construit sur les séances relues. Aucune moyenne entre deux Trésors : l'écart entre deux signatures est ce que la courbe sert à lire.")}{" "}
              <Link href="/desk/adjudications/tableau">{t("Toutes les séances")} →</Link>
            </p>
          </div>
          <Link className="btn sm ghost" href="/desk/analyses">
            {t("Le dossier d'analyses")}
          </Link>
        </header>

        <form className={styles.filters} method="get">
          <label className={styles.filter}>
            <span>{t("Au")}</span>
            <input type="date" name="on" defaultValue={on} />
          </label>
          <label className={styles.filter}>
            <span>{t("Fenêtre")}</span>
            <select name="fenetre" defaultValue={String(fenetre)}>
              {FENETRES.map((f) => (
                <option key={f} value={f}>
                  {f < 365 ? t("{n} jours", { n: f }) : t("{n} mois", { n: Math.round(f / 30) })}
                </option>
              ))}
            </select>
          </label>
          <button className="btn sm" type="submit">
            {t("Tracer")}
          </button>
        </form>

        <div className={styles.band}>
          <div>
            <span>{t("Trésors tracés")}</span>
            <b className={tracables.length ? undefined : styles.none}>{tracables.length}</b>
          </div>
          <div>
            <span>{t("Points")}</span>
            <b>{courbe.countries.reduce((s, c) => s + c.points.length, 0)}</b>
          </div>
          <div>
            <span>{t("Séances relues dans la fenêtre")}</span>
            <b>{courbe.considered}</b>
          </div>
          <div>
            <span>{t("Sans rendement")}</span>
            <b className={courbe.gaps.length ? styles.warnb : undefined}>{courbe.gaps.length}</b>
          </div>
          <div>
            <span>{t("À vérifier")}</span>
            <b className={aVerifier.length ? styles.warnb : undefined}>{aVerifier.length}</b>
          </div>
          <div>
            <span>{t("Point le plus ancien")}</span>
            <b>{courbe.countries.length ? t("{n} jours", { n: Math.max(...courbe.countries.map((c) => c.oldestDays)) }) : "—"}</b>
          </div>
        </div>

        {tracables.length === 0 ? (
          <div className="empty">
            {t("Pas assez de séances relues dans cette fenêtre pour tracer une courbe : il en faut au moins deux durées pour un même Trésor. Élargissez la fenêtre, ou relisez des séances.")}
          </div>
        ) : (
          <section className="panel">
            <div className="panel-h">
              <h2>{t("Le marché au {d}", { d: fmtDate(on) })}</h2>
              <span className="muted">{t("{n} Trésors · fenêtre de {f} jours", { n: String(tracables.length), f: String(fenetre) })}</span>
            </div>
            <div className={styles.chart}>
              <CurveChart countries={tracables} ariaLabel={t("Courbe des rendements souverains de la CEMAC par durée")} />
            </div>
          </section>
        )}

        {isoles.length > 0 && (
          <p className={styles.warn}>
            {t("Un seul point pour {p} : c'est une observation, pas une courbe, et elle n'est pas tracée. Le tableau ci-dessous la porte quand même.", { p: isoles.map((c) => `${c.country} (${c.points[0].tenor})`).join(", ") })}
          </p>
        )}

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Chaque point, et d'où il vient")}</h2>
            <span className="muted">{t("Un rendement imprimé et un rendement calculé ont la même allure une fois tracés.")}</span>
          </div>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Trésor")}</th>
                  <th>{t("Durée")}</th>
                  <th className="r">{t("Rendement")}</th>
                  <th>{t("Origine")}</th>
                  <th>{t("Séance")}</th>
                  <th className="r">{t("Âge")}</th>
                  <th>{t("Représentativité")}</th>
                </tr>
              </thead>
              <tbody>
                {courbe.countries.flatMap((c) =>
                  c.points.map((p) => (
                    <tr key={`${c.country}-${p.tenor}`}>
                      <td>
                        <span className={styles.dot} style={{ background: COUNTRY_COLOR[c.country] }} aria-hidden="true" />
                        {c.country}
                      </td>
                      <td>{p.tenor}</td>
                      <td className="r">
                        <b>{pct(p.yield.pct)}</b>
                      </td>
                      <td>
                        <span className={p.yield.origin === "imprimé" ? styles.printed : styles.computed}>{t(YIELD_ORIGIN_LABEL[p.yield.origin])}</span>
                      </td>
                      <td>
                        <Link href={`/desk/adjudications?s=${p.from.id}`}>{fmtDate(p.from.sessionOn)}</Link>
                      </td>
                      <td className="r">{t("{n} jours", { n: p.ageDays })}</td>
                      <td>
                        {p.thin ? <span className="st annulee">{t("séance mince")}</span> : <span className="muted">{t("{n} soumissionnaires", { n: p.from.bidders ?? "—" })}</span>}
                        {p.toVerify && (
                          <>
                            {" "}
                            <span className="st transmise" title={t("Un champ est entré après la confirmation : le plus souvent le coupon, relevé par le robot. Rouvrez la séance et vérifiez-le sur la pièce.")}>
                              {t("à vérifier")}
                            </span>
                          </>
                        )}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
          {aVerifier.length > 0 && (
            <p className={styles.verif}>
              {t(
                "{n} points portent un champ entré après la confirmation de leur séance, le plus souvent le coupon relevé par le robot une fois la colonne créée. Le rendement compte, et la personne qui a signé la séance ne l'a pas vu : rouvrez-la et vérifiez ce chiffre sur la pièce.",
                { n: String(aVerifier.length) },
              )}
            </p>
          )}
          {hypotheses.length > 0 && (
            <p className={styles.hyp}>
              <b>{t("Ce qui a été supposé")} : </b>
              {hypotheses.join(" · ")}.
            </p>
          )}
        </section>

        {ecarts.length > 0 && (
          <section className="panel">
            <div className="panel-h">
              <h2>{t("L'écart entre Trésors, contre {p}", { p: ref! })}</h2>
              <span className="muted">{t("Le classement que le marché fait lui-même, à durée égale.")}</span>
            </div>
            <div className="scroll-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("Trésor")}</th>
                    <th>{t("Durée")}</th>
                    <th className="r">{t("Rendement")}</th>
                    <th className="r">{t("Contre {p}", { p: ref! })}</th>
                    <th className="r">{t("Écart")}</th>
                    <th>{t("Séances distantes de")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ecarts.flatMap((e) =>
                    e.lignes.map((l) => (
                      <tr key={`${e.country}-${l.tenor}`}>
                        <td>{e.country}</td>
                        <td>{l.tenor}</td>
                        <td className="r">{pct(l.a.yield.pct)}</td>
                        <td className="r">{pct(l.b.yield.pct)}</td>
                        <td className="r">
                          <b>{`${l.bp > 0 ? "+" : ""}${l.bp} pb`}</b>
                        </td>
                        <td>
                          {l.apart <= SPREAD_COMPARABLE_DAYS ? (
                            <span className="st reglee">{t("{n} jours", { n: l.apart })}</span>
                          ) : (
                            <span className="st transmise" title={t("Au-delà d'un mois, l'écart est daté et non mesuré.")}>
                              {t("{n} jours, écart daté", { n: l.apart })}
                            </span>
                          )}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {courbe.gaps.length > 0 && (
          <section className="panel">
            <div className="panel-h">
              <h2>{t("Ce qui manque à la courbe")}</h2>
              <span className="muted">{t("{n} séances relues qui ne donnent pas de point", { n: String(courbe.gaps.length) })}</span>
            </div>
            <div className="scroll-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("Séance")}</th>
                    <th>{t("Trésor")}</th>
                    <th>{t("Instr.")}</th>
                    <th>{t("Durée")}</th>
                    <th>{t("Ce qui manque")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {courbe.gaps.map((g) => (
                    <tr key={g.id}>
                      <td>{fmtDate(g.on)}</td>
                      <td>{g.country}</td>
                      <td>{g.instrument}</td>
                      <td>{g.tenor}</td>
                      <td>{t(g.why)}</td>
                      <td>
                        <Link className="btn sm ghost" href={`/desk/adjudications?s=${g.id}`}>
                          {t("Compléter")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.hyp}>
              {t("Un prix d'obligation sans coupon ne donne aucun rendement : le même 95,00 % peut valoir 7 % ou 12 % selon ce que la ligne paie. Le coupon se relève sur le communiqué, et le point apparaît.")}
            </p>
          </section>
        )}

        <p className={styles.method}>
          <Link href="/desk/docs/analyses">{t("Méthodologie et procédure")} →</Link>
          {origines.size > 0 && (
            <span className="muted">
              {" · "}
              {[...origines.entries()].map(([o, n]) => `${n} ${t(YIELD_ORIGIN_LABEL[o as keyof typeof YIELD_ORIGIN_LABEL])}`).join(" · ")}
            </span>
          )}
        </p>
      </div>
    </>
  );
}
