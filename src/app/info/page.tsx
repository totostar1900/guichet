import Link from "next/link";
import { loadLessons } from "@/lib/reference";
import { getRegistry } from "@/lib/registry";
import { DoneMark } from "./[key]/Quiz";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { BackToTop } from "@/components/BackToTop";
import { GuideBar } from "./GuideBar";
import { Simulator } from "@/components/Simulator";
import { InfoSearch, type SearchEntry } from "./InfoSearch";
import { buildGuideIndex } from "@/lib/guide-index";
import { InfoNav } from "./InfoNav";
import { Actor } from "@/components/Illustrations";
import { Glossary } from "./Glossary";
import { FoldAll, FoldSection } from "@/components/Fold";
import styles from "./page.module.css";
import docs from "@/app/desk/docs/docs.module.css";
import { getLang, getT } from "@/i18n/server";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Guide") };
}

/**
 * The Guide tab (/info): where a first-time investor starts : eight short lessons
 * (référentiel), the bond simulator, the comparison tool, the glossary;
 * « Premiers pas » replayable here. The former « Simulateur & repères » lives here.
 */
export default async function InfoPage() {
  const G = getRegistry().glossary;
  const lessons = (await loadLessons()).filter((l) => !l.section).sort((a, b) => a.order - b.order);
  const parcoursCount = (await loadLessons()).filter((l) => l.section).length;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const keys = Object.keys(G).sort((a, b) => G[a].short.localeCompare(G[b].short, "fr"));
  const entries: SearchEntry[] = (await buildGuideIndex(t, lang)).entries;
  const sections = [
    { id: "recherche", title: t("Recherche") },
    { id: "lecons", title: t("Huit leçons courtes") },
    { id: "parcours", title: t("Comprendre le marché CEMAC") },
    { id: "simulateur", title: t("Simulateur d'obligation") },
    { id: "outils", title: t("Outils et repères") },
    { id: "glossaire", title: t("Les mots du Guichet") },
  ];
  return (
    <div className={`${docs.reader} ${docs.readerTwo}`}>
      <InfoNav sections={sections} />
      <div className={styles.wrap}>
        <div className={styles.head}>
          <div className="eyebrow">Guide</div>
          <h1 className="display">{t("Lire une ligne en trente secondes")}</h1>
          <p className="muted">{t("Ce qu'il faut savoir pour comprendre une offre du Guichet : les mots, les chiffres, les risques : expliqués une fois pour toutes, sans jargon inutile.")}</p>
        </div>
        <div data-coach="info-search" id="recherche" className={styles.anchor}>
          <InfoSearch entries={entries} />
        </div>
        <div className={styles.foldBar}>
          <FoldAll group="info" ids={["lecons", "parcours", "simulateur", "outils", "glossaire"]} />
        </div>

        <FoldSection
          group="info"
          id="lecons"
          title={t("Huit leçons courtes")}
          aside={
            <Link className="btn sm" href="/info/aide" data-coach="info-aide">
              {t("Aide : vos questions, nos réponses")} →
            </Link>
          }
        >
        <div className={styles.lessons} data-coach="info-lessons">
          {lessons.map((l) => (
            <Link key={l.key} href={`/info/${l.key}`} className={styles.lesson}>
              <i>{l.order}</i>
              <span>
                <b>{t(l.title)}</b>
                <small>{t(l.intro)}</small>
              </span>
              <em>
                <DoneMark lessonKey={l.key} /> {l.minutes} min
              </em>
            </Link>
          ))}
        </div>
        </FoldSection>

        <FoldSection group="info" id="parcours" title={t("Comprendre le marché CEMAC")}>
        <Link href="/info/parcours" className={styles.parcours} data-coach="info-parcours">
          <span className={styles.parcoursStrip} aria-hidden="true">
            {(["beac", "tresor", "guichet", "client"] as const).map((k) => (
              <span key={k} className={styles.actorPlate}>
                <Actor kind={k} size={52} />
              </span>
            ))}
          </span>
          <span className={styles.parcoursText}>
            <span className="eyebrow">{t("Parcours")}</span>
            <b>{t("Six sections, du marché à la monnaie")}</b>
            <small>{t("{n} leçons en six sections : le marché et ses acteurs, les instruments, les risques, passer un ordre, fiscalité et frais, taux et monnaie.", { n: parcoursCount })}</small>
          </span>
          <span className={styles.parcoursGo}>{t("Commencer")} →</span>
        </Link>
        </FoldSection>

        <FoldSection group="info" id="simulateur" title={t("Simulateur d'obligation")}>
        <div className={styles.sim} data-coach="info-sim">
          <p className="muted">{t("Comment le prix, le coupon et la durée fabriquent le rendement : faites varier, regardez. L'outil ne porte sur aucune offre en cours : les prix des offres sont fixés par le desk et se lisent dans le Guichet.")}</p>
          <div className={styles.warn}>{t("Outil pédagogique : résultats bruts, avant fiscalité, convention Exact/Exact. Ne constitue ni une offre ni un conseil.")}</div>
          <Simulator />
        </div>
        </FoldSection>

        <FoldSection group="info" id="outils" title={t("Outils et repères")}>
        <div className={styles.grid}>
          <Link href="/comparer" className={styles.tile}>
            <span className={styles.k}>{t("Outil")}</span>
            <b>{t("Comparer deux lignes")}</b>
            <span>{t("Deux offres côte à côte : rendement, durée, ticket, calendrier.")}</span>
          </Link>
          <Link href="/moi/profil" className={styles.tile}>
            <span className={styles.k}>{t("Outil")}</span>
            <b>{t("Votre profil financier en deux minutes")}</b>
            <span>{t("Sept questions : horizon, tolérance, connaissance, capacité. Un profil à titre d'information, à garder dans votre dossier avec un compte.")}</span>
          </Link>
          <Link href="/societes" className={styles.tile}>
            <span className={styles.k}>{t("Sociétés")}</span>
            <b>{t("Sociétés cotées et émetteurs")}</b>
            <span>{t("Comptes, dividendes, actionnariat, documents publiés à la BVMAC.")}</span>
          </Link>
        </div>
        </FoldSection>

        <BackToTop lift />
        <GuideBar pos={{ label: t("Le Guide") }} />
        <FoldSection group="info" id="glossaire" title={t("Les mots du Guichet")}>
        <Glossary entries={keys.map((k) => ({ k, short: t(G[k].short), long: G[k].long ? t(G[k].long) : undefined, text: t(G[k].text) }))} />
        </FoldSection>
        <CoachMarks
          id="info"
          replayLabel={t("Comment utiliser le Guide ?")}
          stops={[
            { target: "info-search", title: t("Cherchez un mot, une notion"), text: t("Un terme du glossaire, une leçon, un outil, une page, une question de l'aide : tapez le mot, ouvrez le résultat. C'est le support en libre-service du Guichet.") },
            { target: "info-nav", title: t("Le sommaire"), text: t("À gauche, les sections de cette page, la recherche, les leçons, le simulateur, les outils, le glossaire, et, en dessous, l'aide, le comparateur, les sociétés et les actualités. Il reste sous la main pendant que vous lisez.") },
            { target: "info-aide", title: t("Vos questions, nos réponses"), text: t("La page Aide répond à ce qu'on nous demande le plus : se connecter, ouvrir un compte, lire une ligne, déclarer une intention, régler, recevoir ses documents, nous joindre.") },
            { target: "info-lessons", title: t("Huit leçons de deux minutes"), text: t("Rendement et coupon, adjudication, coupon couru, actions, fonds, risques : chaque leçon se lit en deux minutes et se coche une fois lue.") },
            { target: "info-glossaire", title: t("Les mots du Guichet"), text: t("Le glossaire a sa propre recherche, un tri A → Z ou par catégorie, et un regroupement par catégorie : titres de dette, actions et sociétés, fonds, vos ordres, les états d'une ligne.") },
            { target: "info-sim", title: t("Le simulateur"), text: t("Faites varier le prix, le coupon et la durée : vous voyez le rendement bouger. Un outil pour comprendre, qui ne porte sur aucune ligne réelle.") },
          ]}
        />
      </div>
    </div>
  );
}
