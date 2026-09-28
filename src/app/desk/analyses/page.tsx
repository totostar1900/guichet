import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { TallTable } from "@/components/desk/TallTable";
import { Bloc } from "@/components/desk/Bloc";
import { Commentaire } from "@/components/desk/Commentaire";
import { RailAnalyse, type SectionRail } from "@/components/desk/RailAnalyse";
import { CourbeInteractive, type CourbePays } from "@/components/market/CourbeInteractive";
import { PointsCourbe } from "@/components/market/PointsCourbe";
import { COUNTRY_COLOR } from "@/lib/market/couleurs";
import { Barres, SerieTemps } from "@/components/market/Traces";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { pressureByYear, programByYear } from "@/lib/market/auction-stats";
import { cribler } from "@/lib/market/anomalies";
import { anomalieVueAction } from "./actions";
import { bridge } from "@/lib/market/bridge";
import { abonde, buildCurve, horizon, MIN_POINTS, serie, spreads, SPREAD_COMPARABLE_DAYS } from "@/lib/market/curve";
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
  /**
   * Les durées les mieux suivies, jusqu'à trois.
   *
   * On ne choisit pas « 26 semaines » d'avance : la durée qui porte l'histoire
   * n'est pas la même selon le Trésor, et elle changera avec les reprises. On
   * prend celles qui ont le plus de séances relues, ce qui revient à prendre
   * celles qui ont quelque chose à raconter.
   */
  const suivies = [...new Map(relues.map((r) => [`${r.country}|${r.tenor}`, r])).values()]
    .map((r) => ({ pays: r.country, tenor: r.tenor, pts: serie(seances, r.country, r.tenor) }))
    .filter((x) => x.pts.length >= 4)
    .sort((a, b) => b.pts.length - a.pts.length)
    .slice(0, 3);

  // La couverture, séance par séance, dans l'ordre : c'est la mesure la plus
  // dure du jeu et elle ne se lit que sur la durée.
  const couvertures = relues
    .filter((r) => r.announced && r.bid != null)
    .map((r) => ({ on: r.sessionOn, v: r.bid! / r.announced!, couleur: COUNTRY_COLOR[r.country] }))
    .sort((a, b) => a.on.localeCompare(b.on));

  const crible = cribler(seances);
  const trouvailles = crible.restent;

  /**
   * La courbe mise en forme pour le client.
   *
   * On ne traverse pas le réseau avec des séances entières : un point de courbe
   * en porte une complète, et vingt points feraient passer vingt communiqués
   * pour tracer vingt cercles. Ce qui part est ce qui s'affiche.
   */
  const pourLaCourbe: CourbePays[] = tracables.map((c) => ({
    pays: c.country,
    plusVieux: c.oldestDays,
    derniere: c.latest,
    points: c.points.map((p) => {
      const h = horizon(p.years);
      return {
        id: p.from.id,
        annees: p.years,
        mot: `${h.n.toLocaleString("fr-FR")} ${t(h.unit)}`,
        pct: p.yield.pct,
        origine: p.yield.origin,
        hypotheses: p.yield.assumptions.map((a) => t(a.key, a.params)),
        etiquette: p.tenor,
        abondement: abonde(p),
        mince: p.thin,
        on: fmtDate(p.from.sessionOn),
        code: p.from.codeEmission,
      };
    }),
  }));
  /** Un Trésor qui ne porte qu'un point : au tableau, pas sur le tracé. */
  const isoles = courbe.countries.filter((c) => c.points.length < MIN_POINTS);
  /** La référence des écarts : le Trésor le mieux garni, faute d'un souverain de place. */
  const reference = tracables[0]?.country;
  const ecarts = reference
    ? tracables.slice(1).flatMap((c) =>
        spreads(courbe, c.country, reference).map((e) => {
          const h = horizon(e.years);
          return { contre: c.country, tenor: e.tenor, horizon: `${h.n.toLocaleString("fr-FR")} ${t(h.unit)}`, bp: e.bp, apart: e.apart };
        }),
      )
    : [];

  /**
   * Le rail, et ce qu'il compte.
   *
   * Une pastille ne se pose que sur ce qui attend quelqu'un : les
   * contradictions non rangées et les séances relues qui ne donnent pas de
   * point. Le reste est de la lecture, pas une file d'attente.
   */
  const railSections: SectionRail[] = [
    { id: "courbe", titre: "La courbe des taux", groupe: "Le prix" },
    { id: "points", titre: "Chaque point, et d'où il vient", groupe: "Le prix" },
    { id: "ecarts", titre: "L'écart entre Trésors", groupe: "Le prix" },
    { id: "trous", titre: "Ce qui manque à la courbe", groupe: "Le prix", alerte: courbe.gaps.length },
    { id: "reprix", titre: "Le reprix du marché", groupe: "Les volumes" },
    { id: "pression", titre: "La pression de la demande", groupe: "Les volumes" },
    { id: "programme", titre: "L'exécution du programme", groupe: "Les volumes" },
    { id: "liquidite", titre: "La liquidité du secondaire", groupe: "Le secondaire" },
    { id: "fraicheur", titre: "La fraîcheur de l'indice", groupe: "Le secondaire" },
    { id: "pont", titre: "Le pont primaire / secondaire", groupe: "Le secondaire" },
    { id: "anomalies", titre: "Ce que la table a attrapé", groupe: "Avant de publier", alerte: trouvailles.length },
    { id: "publier", titre: "Avant de publier", groupe: "Avant de publier" },
  ];

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
          <div className={styles.emporter}>
            {/* Entre la page et la note, il restait une recopie à la main : c est
                l endroit exact où un chiffre se déforme et où une date d observation
                se perd. */}
            <a className="btn sm" href="/desk/analyses/export">
              {t("Brouillon de note")}
            </a>
            <a className="btn sm ghost" href="/desk/analyses/export?format=csv">
              {t("Courbe en CSV")}
            </a>
            <Link className="btn sm ghost" href="/desk/docs/analyses">
              {t("Méthodologie")}
            </Link>
          </div>
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

        {/* Douze sections : le rail en donne la carte, et porte le compte de ce
            qui reste ouvert pour qu'on l'apprenne du haut de la page. */}
        <div className={styles.avecRail}>
        <RailAnalyse sections={railSections} />
        <div>
        {/* 1. La courbe elle-même. Elle avait sa page ; cette page était la porte
            qu'on ne franchissait pas, et les chiffres qui l'expliquent vivaient
            derrière. */}
        <Bloc
          id="courbe"
          note={
            <>
              <Commentaire registre="lecture" titre="Ce que dit la courbe aujourd'hui">
                <p>
                  {t(
                    "Une courbe plate demande peu pour la durée : le marché ne fait presque pas payer le temps à cette signature. Une courbe inversée demande davantage pour le court que pour le long, et cela se lit d'une seule façon : un besoin de trésorerie immédiat.",
                  )}
                </p>
                <p>{t("Le texte de cette note se rédige avant publication : ce qui est écrit ici part au client avec le graphique.")}</p>
              </Commentaire>
              <Commentaire registre="methode" titre="Ce que la mesure ne dit pas">
                <p>
                  {t(
                    "Le rendement s'actualise sur la vie restante et non sur la durée annoncée : un abondement de six ans à dix-huit mois de son terme appartient au court. Les avis d'annonce confirment un remboursement in fine sur les six Trésors.",
                  )}
                </p>
                <p>{t("La vue CEMAC est une moyenne des Trésors présents à chaque horizon : un niveau de zone, jamais un taux auquel quiconque emprunte.")}</p>
              </Commentaire>
            </>
          }
        >
          <div className="panel-h">
            <h2>{t("La courbe des taux de la zone")}</h2>
            <span className="muted">{sortie(tracables.length >= 2, "Une courbe se publie quand deux Trésors au moins portent chacun deux durées relues.")}</span>
          </div>
          <div className={styles.pb}>
            {tracables.length ? (
              <CourbeInteractive pays={pourLaCourbe} ariaLabel={t("Courbe des rendements souverains de la CEMAC par durée")} />
            ) : (
              <div className="empty">{t("Pas encore deux durées relues pour un même Trésor sur l'année écoulée.")}</div>
            )}
            {isoles.length > 0 && (
              <p className={styles.note}>
                {t("Un seul point pour {p} : c'est une observation, pas une courbe, et elle n'est pas tracée. Le tableau ci-dessous la porte quand même.", {
                  p: isoles.map((c) => `${c.country} (${c.points[0].tenor})`).join(", "),
                })}
              </p>
            )}
          </div>
        </Bloc>

        {/* 2. Chaque point et son origine. Pas de commentaire : c'est une table de
            référence, qu'on interroge et qu'on ne lit pas de haut en bas. */}
        <Bloc id="points">
          <div className="panel-h">
            <h2>{t("Chaque point, et d'où il vient")}</h2>
            <span className="muted">{t("{n} points", { n: pourLaCourbe.reduce((n, c) => n + c.points.length, 0) })}</span>
          </div>
          <PointsCourbe pays={pourLaCourbe} />
        </Bloc>

        {/* 3. Les écarts entre Trésors. */}
        <Bloc
          id="ecarts"
          note={
            <Commentaire registre="alerte" titre="Un écart daté n'est pas un écart de crédit">
              <p>
                {t(
                  "Deux séances distantes de six semaines donnent un écart qui mesure le calendrier et non la signature. Chaque ligne porte donc le nombre de jours qui sépare les deux séances, et au-delà d'un mois l'écran refuse de le présenter comme une mesure.",
                )}
              </p>
            </Commentaire>
          }
        >
          <div className="panel-h">
            <h2>{t("L'écart entre Trésors, contre {p}", { p: reference ?? "—" })}</h2>
            <span className="muted">{t("{n} comparaisons", { n: ecarts.length })}</span>
          </div>
          {ecarts.length ? (
            <TallTable total={ecarts.length}>
              <thead>
                <tr>
                  <th>{t("Trésor")}</th>
                  <th>{t("Horizon")}</th>
                  <th className="r">{t("Écart")}</th>
                  <th className="r">{t("Jours entre séances")}</th>
                  <th>{t("Lecture")}</th>
                </tr>
              </thead>
              <tbody>
                {ecarts.map((e) => (
                  <tr key={`${e.contre}|${e.tenor}`}>
                    <td>
                      <span className={styles.dot} style={{ background: COUNTRY_COLOR[e.contre] }} aria-hidden="true" /> {e.contre}
                    </td>
                    <td>{e.horizon}</td>
                    <td className="r">
                      <b>{`${e.bp > 0 ? "+" : ""}${e.bp} pb`}</b>
                    </td>
                    <td className="r">{t("{n} jours", { n: e.apart })}</td>
                    <td>{e.apart > SPREAD_COMPARABLE_DAYS ? <span className="st annulee">{t("écart daté, pas mesuré")}</span> : <span className="st reglee">{t("comparable")}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </TallTable>
          ) : (
            <div className="empty">{t("Pas encore deux Trésors portant un même horizon.")}</div>
          )}
        </Bloc>

        {/* 4. Ce qui manque, compté et nommé plutôt que comblé. */}
        <Bloc
          id="trous"
          note={
            <Commentaire registre="lecture" titre="Un trou nommé vaut mieux qu'un chiffre faux">
              <p>
                {t(
                  "Un prix d'obligation sans coupon ne dit rien : le même 90,00 % peut valoir 7 % comme 16 % selon ce que la ligne paie. Le combler par un coupon moyen donnerait une courbe lisse et fausse, dont personne ne verrait qu'elle est fausse.",
                )}
              </p>
              <p>{t("Une ligne dont l'avis d'annonce donne un autre échéancier ne donne pas de point non plus : le calcul ne sait pas faire cet échéancier-là.")}</p>
            </Commentaire>
          }
        >
          <div className="panel-h">
            <h2>{t("Ce qui manque à la courbe")}</h2>
            <span className="muted">{t("{n} séances relues sans rendement", { n: courbe.gaps.length })}</span>
          </div>
          {courbe.gaps.length ? (
            <TallTable total={courbe.gaps.length}>
              <thead>
                <tr>
                  <th>{t("Séance")}</th>
                  <th>{t("Trésor")}</th>
                  <th>{t("Instr.")}</th>
                  <th>{t("Durée")}</th>
                  <th>{t("Pourquoi")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {courbe.gaps.map((g) => (
                  <tr key={g.id}>
                    <td>{fmtDate(g.on)}</td>
                    <td>
                      <span className={styles.dot} style={{ background: COUNTRY_COLOR[g.country] }} aria-hidden="true" /> {g.country}
                    </td>
                    <td>{g.instrument}</td>
                    <td>{g.tenor}</td>
                    <td>
                      {t(g.why)}
                      {/* Les mots du Trésor se citent dans sa langue : les traduire leur ferait dire autre chose. */}
                      {g.cite ? <span className="muted">{` · « ${g.cite} »`}</span> : null}
                      {g.publie ? <span className="muted">{` · ${t("fourchette publiée")} ${g.publie}`}</span> : null}
                    </td>
                    <td>
                      <Link className="btn sm ghost" href={`/desk/adjudications?s=${g.id}`}>
                        {t("Compléter")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TallTable>
          ) : (
            <div className="empty">{t("Aucune séance relue ne reste sans rendement.")}</div>
          )}
        </Bloc>

        {/* 1 bis. Le reprix : la courbe dit le marché d'un jour, la série dit son histoire. */}
        {suivies.length > 0 && (
          <Bloc
            id="reprix"
            note={
            <Commentaire registre="lecture" titre="Ce qu'on cherche ici">
              <p>{t("Le retournement, et sa date. Une courbe se lit à un instant ; c'est la série qui dit si le niveau d'aujourd'hui est un accident de séance ou une tendance installée.")}</p>
              <p>{t("Un décrochage sur une seule durée signale un besoin ponctuel ; un décalage de toutes les durées ensemble signale un changement de perception de la signature.")}</p>
            </Commentaire>
          }
          >
            <div className="panel-h">
              <h2>{t("Le reprix du marché")}</h2>
              <span className="muted">{sortie(suivies[0].pts.length >= 8, "Une série se publie à partir de huit séances relues : en dessous, elle raconte le hasard des lectures faites.")}</span>
            </div>
            <div className={styles.pb}>
              <SerieTemps
                traces={suivies.map((x, i) => ({
                  couleur: [COUNTRY_COLOR[x.pays], "#a16207", "#6d28d9"][i] ?? COUNTRY_COLOR[x.pays],
                  points: x.pts.map((p) => ({ on: p.on, v: p.pct })),
                  creux: (p) => Boolean(x.pts.find((q) => q.on === p.on)?.thin),
                  aire: i === 0,
                }))}
                ariaLabel={t("Rendement de chaque durée suivie, dans le temps")}
              />
              <div className={styles.legende}>
                {suivies.map((x, i) => (
                  <span key={`${x.pays}-${x.tenor}`}>
                    <i style={{ background: [COUNTRY_COLOR[x.pays], "#a16207", "#6d28d9"][i] ?? COUNTRY_COLOR[x.pays] }} />
                    {x.pays} · {x.tenor} <b>({x.pts.length})</b>
                  </span>
                ))}
              </div>
              <p className={styles.note}>
                {t(
                  "Un point creux signale une séance mince. L'abscisse est la date réelle et non le rang : des séances réparties sur sept ans ne sont pas des pas réguliers, et les espacer également ferait croire à une cadence que le marché n'a pas eue.",
                )}
              </p>
            </div>
          </Bloc>
        )}

        {/* 2. La pression : la mesure la plus dure du jeu, et la plus simple. */}
        <Bloc
          id="pression"
          note={
            <Commentaire registre="lecture" titre="Ce qu'il faut croiser">
              <p>{t("La ligne des 100 % sépare une adjudication couverte d'une qui ne l'est pas. Une année passée sous cette ligne se paie sur le taux des séances suivantes.")}</p>
              <p>{t("Une couverture qui tombe pendant que le nombre de soumissionnaires tient signale un problème de prix ; les deux qui tombent ensemble signalent un problème de liquidité bancaire.")}</p>
            </Commentaire>
          }
        >
          <div className="panel-h">
            <h2>{t("La pression de la demande")}</h2>
            <span className="muted">{sortie(pression.some((p) => p.n >= 5), "Une moyenne annuelle demande au moins cinq séances relues dans l'année.")}</span>
          </div>
          {couvertures.length > 2 && (
            <div className={styles.pb}>
              <Barres points={couvertures} seuil={1} decimales={1} ariaLabel={t("Couverture de chaque séance relue")} />
              <p className={styles.note}>
                {t(
                  "Une barre par séance relue, dans l'ordre chronologique : l'axe compte les séances, il ne mesure pas le temps. Le trait doré est la couverture de un, seuil du service intégral.",
                )}
              </p>
            </div>
          )}
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
        </Bloc>

        {/* 3. L'exécution : publiable le jour où la série est complète, pas avant. */}
        <Bloc
          id="programme"
          note={
            <Commentaire registre="lecture" titre="Ce qu'une sous-exécution veut dire">
              <p>{t("Un Trésor qui lève moins que son programme a soit renoncé à payer le prix demandé, soit trouvé ailleurs : avances, bancaire, bailleurs. Les deux se lisent pareil ici, et pas du tout dans une note de crédit.")}</p>
            </Commentaire>
          }
        >
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
        </Bloc>

        {/* 4. La liquidité : aucune donnée nouvelle, et la mesure qui qualifie tout le reste. */}
        {liq && (
          <Bloc
            id="liquidite"
            note={
            <Commentaire registre="alerte" titre="Le chiffre qui relativise tout le reste">
              <p>{t("Une courbe construite sur le primaire décrit ce que le Trésor paie à l'émission, pas ce qu'un investisseur peut obtenir en sortant. Tant que la part traitée reste faible, tout rendement cité ici est un rendement à conserver jusqu'à l'échéance, et cela se dit au client.")}</p>
            </Commentaire>
          }
          >
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
          </Bloc>
        )}

        {/* 5. La fraîcheur : le chiffre à porter à côté du niveau de l'indice. */}
        {frais && dernierIndice && (
          <Bloc
            id="fraicheur"
            note={
            <Commentaire registre="lecture" titre="Le seuil qui compte">
              <p>{t("Au-delà de soixante jours, un point cesse de décrire le marché d'aujourd'hui. Il reste tracé, parce que le retirer donnerait une courbe plus courte sans la rendre plus vraie, mais une note publiée doit porter la date de son point le plus ancien.")}</p>
            </Commentaire>
          }
          >
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
              {liq && liq.bySession.length > 2 && (
                <>
                  <SerieTemps
                    traces={[{ couleur: COUNTRY_COLOR.Cameroun, points: avecIndice.map((b) => ({ on: b.sessionDate, v: b.indexValue! })), aire: true, marques: false }]}
                    unite=""
                    decimales={0}
                    height={170}
                    ariaLabel={t("Niveau de l'indice, séance par séance")}
                  />
                  <Barres
                    points={liq.bySession.map((x) => ({ on: x.date, v: x.traded, couleur: x.traded === 0 ? "var(--crit)" : COUNTRY_COLOR.Congo }))}
                    height={120}
                    unite=""
                    decimales={0}
                    ariaLabel={t("Lignes traitées à chaque séance")}
                  />
                  <p className={styles.note}>
                    {t("En haut le niveau publié, en bas le nombre de lignes qui ont traité ce jour-là. Les barres rouges sont les séances où rien ne s'est échangé sur toute la cote.")}
                  </p>
                </>
              )}
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
          </Bloc>
        )}

        {/* 6. Le pont : la mesure la plus utile au client, et la plus exigeante en prudence. */}
        {ponts.length > 0 && (
          <Bloc
            id="pont"
            note={
            <Commentaire registre="methode" titre="Pourquoi ce pont compte">
              <p>{t("C'est la seule mesure qui dise si le prix d'adjudication tient une fois le titre dans les mains du marché. Un écart durable entre les deux dit que l'adjudication ne se fait pas au prix du marché.")}</p>
            </Commentaire>
          }
          >
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
          </Bloc>
        )}

        {/* 6 bis. Ce qu'une colonne montre et qu'un formulaire cache. */}
        {(trouvailles.length > 0 || crible.vues > 0) && (
          <Bloc
            id="anomalies"
            note={
            <Commentaire registre="alerte" titre="Ce qui reste ouvert">
              <p>{t("Chaque motif dit qu'un chiffre se contredit, jamais qu'il est faux : la décision appartient à qui ouvrira le communiqué. Une contradiction vérifiée sur la pièce se range, et cesse de compter.")}</p>
              <p>{t("Un signal qu'on ne peut pas éteindre cesse d'être lu, et c'est le seul risque qui compte pour ce panneau.")}</p>
            </Commentaire>
          }
          >
            <div className="panel-h">
              <h2>{t("Ce que la table a attrapé")}</h2>
              <span className="muted">
                {t("{n} séances qui se contredisent", { n: String(trouvailles.length) })}
                {crible.vues > 0 ? ` · ${t("{n} vérifiées sur la pièce", { n: String(crible.vues) })}` : ""}
              </span>
            </div>
            {trouvailles.length === 0 ? (
              <div className={styles.pb}>
                <p className={styles.strong}>
                  {t("Rien n'attend : les {n} contradictions trouvées ont toutes été vérifiées sur leur communiqué, et viennent des Trésors eux-mêmes.", { n: String(crible.vues) })}
                </p>
              </div>
            ) : (
            <div className="scroll-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("Séance")}</th>
                    <th>{t("Trésor")}</th>
                    <th>{t("Durée")}</th>
                    <th>{t("Ce qui se contredit")}</th>
                    <th>{t("Ce qu'il faut vérifier sur la pièce")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {trouvailles.slice(0, 20).map((a, i) => (
                    <tr key={`${a.id}-${i}`}>
                      <td>{fmtDate(a.quand)}</td>
                      <td>{a.pays}</td>
                      <td>
                        {a.instrument} {a.tenor}
                      </td>
                      <td className={styles.wrap}>{t(a.quoi.key, a.quoi.params ? Object.fromEntries(Object.entries(a.quoi.params).map(([k, v]) => [k, typeof v === "string" ? t(v) : v])) : undefined)}</td>
                      <td className={styles.wrap}>
                        <span className="muted">{t(a.verifier)}</span>
                      </td>
                      <td>
                        {a.gravite === "confirmee" ? <span className="st annulee">{t("déjà confirmée")}</span> : <span className="st transmise">{t("en attente")}</span>}{" "}
                        <Link className="btn sm ghost" href={`/desk/adjudications?s=${a.id}`}>
                          {t("Ouvrir")}
                        </Link>{" "}
                        {/* Le geste qui manque à un signal : pouvoir dire qu'on a
                            regardé. Sans lui le panneau se répète et cesse d'être lu. */}
                        <form action={anomalieVueAction} className={styles.vu}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="motif" value={a.quoi.key} />
                          <button className="btn sm ghost" type="submit" title={t("La contradiction vient de la pièce : la ranger, et la compter à part.")}>
                            {t("La pièce dit cela")}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
            <p className={styles.note}>
              {t(
                "Aucun de ces motifs ne dit qu'un chiffre est faux : ils disent qu'il se contredit, lui-même ou son voisin. Ce qui est déjà confirmé passe devant, étant entré dans les références du desk. Une séance à la fois, aucune de ces anomalies ne se voit ; rangées en colonne, les motifs sautent aux yeux.",
              )}
            </p>
          </Bloc>
        )}

        {/* 7. Sortir du desk : la règle, écrite une fois. */}
        <Bloc
          id="publier"
        >
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
        </Bloc>
        </div>
        </div>
      </div>
    </>
  );
}
