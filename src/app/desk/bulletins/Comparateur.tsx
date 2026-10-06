import Link from "next/link";
import { repo } from "@/lib/data";
import { comparer, juger, verdict } from "@/lib/market/comparer";
import { applicables, controler, incoherences, passes } from "@/lib/market/coherence";
import { Controles } from "./Controles";
import type { MarketBulletin } from "@/lib/domain/market";
import { fmt } from "@/lib/format";
import { getT } from "@/i18n/server";
import { ChoixSeance } from "./ChoixSeance";
import styles from "./comparateur.module.css";

/**
 * COMPARER DEUX COTES AU CHOIX, et pas seulement une séance à sa veille.
 *
 * Le rapport d'une séance la compare à la précédente, ce qui répond à « que
 * s'est-il passé ce jour-là ». La question du desk est souvent l'autre : « la
 * cote de mars 2023 et celle d'aujourd'hui portent-elles les mêmes lignes ? »
 * Un écart de trois ans ne se lit pas en ouvrant sept cents rapports.
 *
 * LE SENS EST TOUJOURS CHRONOLOGIQUE. Les deux listes se nomment A et B, mais
 * la comparaison va de la plus ancienne vers la plus récente : « partie »
 * n'aurait aucun sens à l'envers, et un bouton d'échange n'aurait rien changé.
 *
 * TROIS ÉTAGES, DU GRATUIT AU COÛTEUX :
 *  1. les couples où le compte baisse, tirés des bulletins déjà en main ;
 *  2. l'écart du couple ouvert, deux lectures de cotations ;
 *  3. le verdict de chaque ligne, une lecture de série par ligne, plafonnée.
 *
 * LES OPCVM NE SONT PAS COMPARÉS LIGNE À LIGNE : leurs valeurs liquidatives
 * vivent dans une autre table, qui ne se lit pas par séance. Leur compte est
 * montré, et l'écart le dit plutôt que de laisser croire à une égalité.
 */

/** Au-delà, le jugement ligne à ligne coûterait trop de lectures pour une page. */
const PLAFOND_JUGEMENT = 60;

interface Props {
  tous: MarketBulletin[];
  a: string;
  b: string;
  /** Le lien vers un couple, filtres du tableau conservés. */
  versCouple: (a: string, b: string) => string;
  /** Les deux gabarits de la liste déroulante, avec __D__ à la place de la date. */
  gabaritA: string;
  gabaritB: string;
}

export async function Comparateur({ tous, a, b, versCouple, gabaritA, gabaritB }: Props) {
  const t = await getT();
  const r = repo();

  const seances = tous.map((x) => x.sessionDate).sort().reverse();
  const [debut, fin] = a <= b ? [a, b] : [b, a];
  const bulDebut = tous.find((x) => x.sessionDate === debut);
  const bulFin = tous.find((x) => x.sessionDate === fin);

  /* Le pas de un, dans la série réelle : les séances ne sont pas tous les
     jours, et « la veille » d'un lundi est un vendredi. */
  const croissant = [...seances].reverse();
  const voisine = (d: string, pas: -1 | 1) => croissant[croissant.indexOf(d) + pas];

  const memeSeance = debut === fin;
  const [qa, qb] = memeSeance ? [[], []] : await Promise.all([r.quotesOn(debut).catch(() => []), r.quotesOn(fin).catch(() => [])]);
  const ecart = comparer(qa, qb);
  const juge = !memeSeance && ecart.partis.length + ecart.arrivees.length <= PLAFOND_JUGEMENT;
  if (juge) await juger(ecart, fin, (isin) => r.listQuotes(isin, 2000).catch(() => []));

  const dit = verdict(ecart);
  const passageres = ecart.partis.filter((x) => x.retour);
  const durables = ecart.partis.filter((x) => !x.retour);

  const compte = (qs: typeof qa, genre: "action" | "obligation") => qs.filter((q) => q.instrument === genre).length;
  /* Les actions et les obligations se comptent sur les cotations lues à
     l'instant ; les OPCVM n'ont que le compte du bulletin, faute d'une
     lecture par séance. La ligne le dit plutôt que de mélanger les deux. */
  const lignes: [string, number, number, boolean][] = [
    [t("Actions"), compte(qa, "action"), compte(qb, "action"), true],
    [t("Obligations"), compte(qa, "obligation"), compte(qb, "obligation"), true],
    [t("Total des lignes"), qa.length, qb.length, true],
    [t("OPCVM"), bulDebut?.counts?.funds ?? 0, bulFin?.counts?.funds ?? 0, false],
  ];

  /* LES CONTRÔLES DE COHÉRENCE, et le fait qui les autorise : trois d'entre
     eux ne valent qu'entre deux séances voisines, et le disent plutôt que de
     se calculer de travers sur un écart de trois ans. */
  const voisinesDansLaSerie = voisine(debut, 1) === fin;
  const ctrls = memeSeance ? [] : controler(qa, qb, voisinesDansLaSerie);
  const fautes = incoherences(ctrls);

  const pas = (d: string, sens: -1 | 1, autre: string, cote: "a" | "b") => {
    const v = voisine(d, sens);
    const href = v ? (cote === "a" ? versCouple(v, autre) : versCouple(autre, v)) : "";
    return v ? (
      <Link href={href} className={styles.pas} aria-label={sens < 0 ? t("séance précédente") : t("séance suivante")}>
        {sens < 0 ? "‹" : "›"}
      </Link>
    ) : (
      <span className={styles.pasMort} aria-hidden="true">
        {sens < 0 ? "‹" : "›"}
      </span>
    );
  };

  return (
    <>
      {/* DEUX PANNEAUX, ET L'ESPACE ENTRE EUX. Le choix se fait, le rapport
          se lit : ce ne sont pas les mêmes gestes, et les coller donnait
          l'impression d'un seul objet dont on ne savait où commencer. */}
      <section className="panel" id="comparer">
        <div className="panel-h">
          <h2>{t("Comparer deux cotes")}</h2>
          <span className="muted">{t("Ce qui est parti, ce qui est arrivé, et ce qui n'a fait que manquer.")}</span>
        </div>

      {/* LES DEUX CHOIX, AU MÊME NIVEAU. Le pas de un est à portée de pouce
          parce que c'est le geste courant ; la liste sert aux grands écarts. */}
      <div className={styles.barre}>
        <div className={styles.cote}>
          <span className={styles.etiquette}>{t("Séance A")}</span>
          {pas(a, -1, b, "a")}
          <ChoixSeance valeur={a} seances={seances} gabarit={gabaritA} etiquette={t("Séance A")} />
          {pas(a, 1, b, "a")}
        </div>
        <span className={styles.fleche} aria-hidden="true">
          →
        </span>
        <div className={styles.cote}>
          <span className={styles.etiquette}>{t("Séance B")}</span>
          {pas(b, -1, a, "b")}
          <ChoixSeance valeur={b} seances={seances} gabarit={gabaritB} etiquette={t("Séance B")} />
          {pas(b, 1, a, "b")}
        </div>
        <span className={styles.sens}>
          {memeSeance ? t("Une seule et même séance.") : t("Lu du {d} au {f}.", { d: debut, f: fin })}
        </span>
      </div>
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>{t("Le rapport")}</h2>
          <span className="muted mono">{memeSeance ? "" : `${debut} → ${fin}`}</span>
        </div>

      {memeSeance ? (
        <p className={styles.verdictNon}>{t("Choisissez deux séances différentes : une cote comparée à elle-même ne dit rien.")}</p>
      ) : (
        <>
          {/* LE VERDICT PORTE D'ABORD SUR LA QUALITÉ, et non sur le mouvement :
              une cote qui bouge est normale, une cote incohérente ne l'est
              jamais. Une ligne qui entre ou sort peut être un événement de
              marché ; une valeur impossible est toujours notre lecture. */}
          {fautes > 0 ? (
            <p className={styles.verdictMal}>
              {t("{n} incohérence(s) dans la cote du {d} : des valeurs que la bourse n'a pas pu publier. À relire avant de s'en servir.", { n: fautes, d: fin })}
            </p>
          ) : null}
          <p className={dit === "rien" ? styles.verdictNon : passageres.length ? styles.verdictOui : styles.verdictNon}>
            {dit === "rien"
              ? t("Aucune rupture : les deux séances cotent exactement les mêmes lignes.")
              : [
                  durables.length ? (juge ? t("{n} ligne(s) quittent la cote pour de bon.", { n: durables.length }) : t("{n} ligne(s) manquent du côté le plus récent.", { n: ecart.partis.length })) : "",
                  passageres.length ? t("{n} ligne(s) manquent ici et reviennent plus tard : ce n'est pas une sortie de cote, c'est une lecture incomplète.", { n: passageres.length }) : "",
                  ecart.arrivees.length ? t("{n} ligne(s) apparaissent.", { n: ecart.arrivees.length }) : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
          </p>

          {!juge && (ecart.partis.length || ecart.arrivees.length) ? (
            <p className={styles.notule}>
              {t("Plus de {n} lignes bougent entre ces deux séances : chacune demanderait de relire sa série entière pour dire si elle revient. Le verdict est donc laissé de côté ici, et le rapport d'une séance le rend couple par couple.", { n: String(PLAFOND_JUGEMENT) })}
            </p>
          ) : null}

          {/* LE COMPTE AVANT LE DÉTAIL : trois nombres disent déjà si la cote
              a changé de taille, et le détail dit lesquelles. */}
          <table className={`tbl ${styles.comptes}`}>
            <thead>
              <tr>
                <th>{t("Ce que portent les deux cotes")}</th>
                <th className="r">{debut}</th>
                <th className="r">{fin}</th>
                <th className="r">{t("Écart")}</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(([nom, x, y, compare]) => (
                <tr key={nom}>
                  <td>
                    {nom}
                    {compare ? null : <span className={styles.aPart}>{t("compté, pas comparé")}</span>}
                  </td>
                  <td className="r num">{fmt(x)}</td>
                  <td className="r num">{fmt(y)}</td>
                  <td className={`r num ${y < x ? styles.baisse : y > x ? styles.hausse : ""}`}>{y === x ? "—" : `${y > x ? "+" : ""}${y - x}`}</td>
                </tr>
              ))}
              <tr>
                <td>{t("Cohérence")}</td>
                <td className="r num muted">—</td>
                <td className="r num">{t("{n} contrôles passés sur {m} applicables", { n: passes(ctrls), m: applicables(ctrls) })}</td>
                <td />
              </tr>
              <tr>
                <td>{t("Indice BVMAC")}</td>
                <td className="r num">{bulDebut?.indexValue != null ? fmt(bulDebut.indexValue) : "—"}</td>
                <td className="r num">{bulFin?.indexValue != null ? fmt(bulFin.indexValue) : "—"}</td>
                <td />
              </tr>
              <tr>
                <td>{t("État du bulletin")}</td>
                <td className="r">{bulDebut ? t(bulDebut.status) : "—"}</td>
                <td className="r">{bulFin ? t(bulFin.status) : "—"}</td>
                <td />
              </tr>
            </tbody>
          </table>

          <div className={styles.tsec}>
            <h3 className={styles.sousTitre}>{t("Cohérence de la cote du {d}", { d: fin })}</h3>
            <Controles controles={ctrls} />
            <p className={styles.notule}>
              {t("Ces règles tiennent par construction dans le bulletin : la bourse les applique en le fabriquant. Une ligne qui les dément n'est donc pas un événement de marché, c'est un chiffre mal lu. Trois d'entre elles ne valent qu'entre deux séances voisines, d'où le « sans objet » sinon.")}
            </p>
          </div>

          <div className={styles.colonnes}>
            <div>
              <h3>{t("Parties ({n})", { n: ecart.partis.length })}</h3>
              {ecart.partis.length === 0 ? (
                <p className="muted">{t("Aucune.")}</p>
              ) : (
                ecart.partis.map((x) => (
                  <div key={x.isin} className={styles.diff}>
                    <b className="mono">{x.mnemo}</b>
                    {juge ? <span className={x.retour ? styles.passagere : styles.durable}>{x.retour ? t("passagère") : t("définitive")}</span> : null}
                    <small>{juge ? (x.retour ? t("revient le {d}", { d: x.retour }) : t("ne revient jamais : sortie de cote")) : x.isin}</small>
                  </div>
                ))
              )}
            </div>
            <div>
              <h3>{t("Apparues ({n})", { n: ecart.arrivees.length })}</h3>
              {ecart.arrivees.length === 0 ? (
                <p className="muted">{t("Aucune.")}</p>
              ) : (
                ecart.arrivees.map((x) => (
                  <div key={x.isin} className={styles.diff}>
                    <b className="mono">{x.mnemo}</b>
                    {juge ? <span className={x.premiere ? styles.neuve : styles.passagere}>{x.premiere ? t("première cotation") : t("retour")}</span> : null}
                    <small>{juge ? (x.premiere ? t("jamais cotée avant") : t("déjà vue auparavant")) : x.isin}</small>
                  </div>
                ))
              )}
            </div>
            <div>
              <h3>{t("Cours qui bougent ({n})", { n: ecart.bouges.length })}</h3>
              {ecart.bouges.length === 0 ? (
                <p className="muted">{t("Aucun.")}</p>
              ) : (
                ecart.bouges.slice(0, 20).map((x) => (
                  <div key={x.isin} className={styles.diff}>
                    <b className="mono">{x.mnemo}</b>
                    <small>
                      {fmt(x.avant)} → {fmt(x.apres)}
                    </small>
                    {x.variation === undefined ? null : (
                      <span className={x.variation < 0 ? styles.baisse : styles.hausse}>
                        {x.variation > 0 ? "+" : ""}
                        {x.variation.toFixed(1).replace(".", ",")} %
                      </span>
                    )}
                  </div>
                ))
              )}
              {ecart.bouges.length > 20 ? <p className={styles.notule}>{t("et {n} autres", { n: ecart.bouges.length - 20 })}</p> : null}
            </div>
          </div>
        </>
      )}

      {/* OÙ REGARDER : LA LISTE PAR LES COMPTES EST PARTIE, et elle est
          partie sur une mesure.

          Elle désignait les couples dont le compte de lignes baisse, faute de
          pouvoir comparer les ensembles — ce que je croyais trop coûteux.
          Mesuré le 6 octobre 2026 sur les 807 couples consécutifs : 74
          portent un vrai mouvement, cette liste en signalait 40 dont 6 sans
          aucun mouvement. Elle en attrapait donc 34, soit 46 %, et en ratait
          40. Un outil de navigation qui rate plus de la moitié de ce qu'il
          doit désigner ne manque pas de précision : il donne une fausse
          confiance, ce qui est pire que de ne rien montrer.

          Et le calcul exact tient en une requête : la base fait la différence
          d'ensembles elle-même, là où je supposais devoir charger vingt-deux
          mille cotations. La frise des mouvements prendra cette place. */}
      </section>
    </>
  );
}
