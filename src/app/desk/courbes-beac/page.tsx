import { DeskNav } from "@/components/DeskNav";
import { Legende, Trace } from "@/components/desk/Trace";
import { ReglageAuto } from "@/components/desk/ReglageAuto";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { lireConvention } from "@/lib/market/convention";
import { buildCurve, MIN_POINTS } from "@/lib/market/curve";
import {
  COULEURS,
  donneesDe,
  lien,
  lireReglages,
  MAX_MOIS,
  memeReglages,
  modeleDeLaFigure,
  PAYS_NON_PUBLIES,
  PAYS_PUBLIES,
  PLAFOND,
  prereglages,
  type CleDePrereglage,
  type PointNous,
} from "@/lib/market/courbes-beac-vue";
import { anneesDe } from "@/lib/market/trace";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courbes BEAC" };

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const moisLong = (m: string) => (m ? `${MOIS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}` : "");
const nb = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const duree = (a: number) => (a < 1 ? `${Math.round(a * 12)} mois` : a === 1 ? "1 an" : `${a.toLocaleString("fr-FR")} ans`);

/**
 * LES COURBES DE LA BEAC, DANS UN SEUL GRAPHIQUE (2 novembre 2026).
 *
 * Deux axes, un seul tracé. En axe « durée », on compare des Trésors à un mois, ou on
 * regarde la courbe d'un Trésor bouger de mois en mois. En axe « temps », on suit UN
 * point de la courbe (le 10 ans, le 3 mois, n'importe quelle durée) mois après mois.
 * Quatre préréglages posent les réglages d'un coup ; les réglages se lisent sous le
 * graphique et vivent dans l'adresse, comme ceux de la page BEAC : un écran du desk se
 * partage par un lien.
 *
 * AUCUN CHIFFRE N'EST CALCULÉ ICI : `courbes-beac-vue.ts` lit l'adresse et fait le
 * modèle, et il est éprouvé. Cette page pose ce qu'il rend.
 *
 * ELLE NE MENT PAS PAR LISSAGE. Un mois sans feuille lisible est un trou, un saut de
 * plus de trois points est écrit avec ses deux valeurs, et la durée est celle de
 * l'ÉMISSION (la BEAC range ainsi), pas notre vie restante.
 */
type Params = Record<string, string | string[] | undefined>;

export default async function CourbesBeacPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireDesk("/desk/courbes-beac");
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const points = await r.courbesBeac().catch(() => []);
  const donnees = donneesDe(points);
  const reglages = lireReglages(sp, donnees);
  const pre = prereglages(donnees);

  /* NOS POINTS, seulement quand on les demande et en axe durée : ils viennent de nos adjudications relues, pas de l'historique de nos courbes. */
  let nous: PointNous[] = [];
  if (reglages.axe === "duree" && reglages.source !== "beac") {
    const [seances, convention] = await Promise.all([r.listAuctionResults({ limit: 1000 }).catch(() => []), lireConvention()]);
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const courbe = buildCurve(seances, { windowDays: 365, on: aujourdHui, convention });
    nous = courbe.countries.filter((c) => c.points.length >= MIN_POINTS).flatMap((c) => c.points.map((p) => ({ pays: c.country, annees: p.years, pct: p.yield.pct })));
  }

  const modele = modeleDeLaFigure(points, reglages, nous);
  const enDuree = reglages.axe === "duree";
  const ys = modele.series.flatMap((s) => s.pts.map((p) => p.y));
  const y0 = ys.length ? Math.max(0, Math.floor(Math.min(...ys) - 1)) : 0;
  const tx = enDuree
    ? [0.25, 1, 3, 5, 7, 10, 15].filter((a) => modele.series.some((s) => s.pts.some((p) => p.x === a))).map((a) => ({ x: a, l: duree(a) }))
    : anneesDe(modele.series);

  const titre = enDuree
    ? `${reglages.source === "nous" ? t("Nos points") : t("Courbes BEAC")} · ${reglages.pays.map((p) => t(p)).join(", ")} · ${reglages.mois.map(moisLong).join(", ")}`
    : t("Le {d} · {p}", { d: duree(reglages.duree), p: reglages.pays.map((p) => t(p)).join(", ") });
  const PRE: { cle: CleDePrereglage; mot: string }[] = [
    { cle: "comparer", mot: t("Comparer les pays") },
    { cle: "point", mot: t("Suivre un point") },
    { cle: "bouge", mot: t("Une courbe qui bouge") },
    { cle: "nous", mot: t("Nous contre la BEAC") },
  ];

  return (
    <>
      <DeskNav current="/desk/courbes-beac" />
      <main className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Courbes BEAC")}</h1>
          <p className={styles.sous}>
            {t("Les courbes de rendement que la BEAC publie chaque mois, Trésor par Trésor : à comparer entre elles, à suivre point par point dans le temps, et à poser à côté des nôtres.")}
          </p>
        </header>

        <nav className={styles.prereglages} aria-label={t("Préréglages")}>
          <span>{t("Préréglages")}</span>
          {PRE.map((p) => (
            <a key={p.cle} href={lien(pre[p.cle])} aria-current={memeReglages(reglages, pre[p.cle]) ? "true" : undefined}>
              {p.mot}
            </a>
          ))}
        </nav>

        <section className={styles.figure} aria-label={titre}>
          <h2>{titre}</h2>
          <p className={styles.axeDit}>
            {enDuree
              ? t("Durée d'émission, en années : la BEAC range ainsi ses courbes, là où nous rangeons par vie restante.")
              : t("Taux en %, un point par feuille lisible ; un mois sans feuille interrompt la ligne.")}
          </p>
          {modele.trop ? (
            <p className={styles.trop}>{t("Trop de courbes : {n} demandées, {max} au plus. Réduisez les Trésors ou les mois.", { n: String(modele.nCourbes), max: String(PLAFOND) })}</p>
          ) : (
            <>
              <Trace
                series={modele.series}
                options={{ hauteur: 340, y0, fy: (v) => `${v.toLocaleString("fr-FR")} %`, tx }}
                vide={t("Aucune feuille lisible pour ces réglages : changez de mois, de Trésor ou de durée.")}
                titre={titre}
              />
              <Legende items={modele.legende.map((l) => ({ ...l, texte: l.texte }))} />
            </>
          )}
        </section>

        <form id="reglages" method="get" className={styles.reglages}>
          <ReglageAuto formId="reglages" />
          <div className={styles.rang}>
            <span className={styles.etiq}>{t("Axe")}</span>
            <select name="axe" defaultValue={reglages.axe} aria-label={t("Axe")}>
              <option value="duree">{t("durée (une courbe par mois)")}</option>
              <option value="temps">{t("temps (un point suivi mois après mois)")}</option>
            </select>
          </div>
          <div className={styles.rang}>
            <span className={styles.etiq}>{t("Trésors")}</span>
            <span className={styles.cases}>
              {PAYS_PUBLIES.map((q) => (
                <label key={q} className={styles.case}>
                  <input type="checkbox" name="pays" value={q} defaultChecked={reglages.pays.includes(q)} />
                  <i style={{ background: COULEURS[q] }} />
                  {q === "Tchad" ? t("Tchad (2016-2017)") : t(q)}
                </label>
              ))}
              {PAYS_NON_PUBLIES.map((q) => (
                <label key={q} className={`${styles.case} ${styles.grise}`} title={t("La BEAC ne publie pas de courbe pour ce Trésor.")}>
                  <input type="checkbox" disabled />
                  {t(q)} · {t("non publié")}
                </label>
              ))}
            </span>
          </div>
          {enDuree ? (
            <>
              <div className={styles.rang}>
                <span className={styles.etiq}>{t("Source")}</span>
                <select name="src" defaultValue={reglages.source} aria-label={t("Source")}>
                  <option value="beac">{t("la BEAC")}</option>
                  <option value="nous">{t("nous")}</option>
                  <option value="deux">{t("les deux")}</option>
                </select>
              </div>
              <div className={styles.rang}>
                <span className={styles.etiq}>{t("Mois")}</span>
                {Array.from({ length: MAX_MOIS }, (_, i) => (
                  <select key={i} name="mois" defaultValue={reglages.mois[i] ?? ""} aria-label={i === 0 ? t("Mois") : t("Comparer à")}>
                    {i > 0 && <option value="">{t("— comparer à —")}</option>}
                    {donnees.mois.map((m) => (
                      <option key={m} value={m}>
                        {moisLong(m)}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.rang}>
              <span className={styles.etiq}>{t("Durée")}</span>
              <select name="d" defaultValue={String(reglages.duree)} aria-label={t("Durée")}>
                {donnees.durees.map((d) => (
                  <option key={d} value={d}>
                    {duree(d)}
                  </option>
                ))}
              </select>
              <span className={styles.provenance}>{t("« Nous » n'est pas offert en axe temps : nous n'avons pas l'historique de nos courbes mois par mois.")}</span>
            </div>
          )}
          <div className={styles.rang}>
            <button type="submit" className={styles.appliquer}>
              {t("Appliquer")}
            </button>
          </div>
        </form>

        <section className={styles.notes} aria-label={t("Ce que la figure ne dit pas")}>
          {modele.sauts.length > 0 && (
            <div>
              <p>{t("Sauts de plus de 3 points d'un point à l'autre : ce sont les chiffres de la BEAC, signalés et non lissés.")}</p>
              <ul>
                {modele.sauts.map((s) => (
                  <li key={`${s.pays}${s.mois}`} className={styles.saut}>
                    {t(s.pays)} {moisLong(s.mois)} : {nb(s.vers)} % ({moisLong(s.depuis)} : {nb(s.de)} %)
                  </li>
                ))}
              </ul>
            </div>
          )}
          {modele.manques.length > 0 && (
            <p>
              {t("Sans feuille lisible : {liste}. Ce sont des trous, jamais des interpolations.", {
                liste: modele.manques.map((m) => (m.mois ? `${t(m.pays)} ${moisLong(m.mois)}` : t(m.pays))).join(", "),
              })}
            </p>
          )}
          <p>{t("La BEAC ne publie aucune courbe pour la Centrafrique ni pour la Guinée équatoriale ; celle du Tchad ne couvre que 2016-2017.")}</p>
          <p className={styles.provenance}>
            {t("{n} points lus dans les feuilles de la BEAC, de {a} à {b}. Les feuilles scannées, sans échelle lisible, sont comptées et laissées : on ne relève pas un point à l'œil.", {
              n: String(points.length),
              a: moisLong(donnees.mois[donnees.mois.length - 1] ?? ""),
              b: moisLong(donnees.recent),
            })}
          </p>
        </section>
      </main>
    </>
  );
}
