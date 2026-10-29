import Link from "next/link";
import { loadLessons } from "@/lib/reference";
import { DoneMark } from "../[key]/Quiz";
import { BackToTop } from "@/components/BackToTop";
import { GuideBar } from "../GuideBar";
import { Actor } from "@/components/Illustrations";
import { EnTete } from "@/components/EnTete";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { Glissement } from "@/components/mobile/Glissement";
import { getT } from "@/i18n/server";
import { AncreHeritee } from "./AncreHeritee";
import styles from "../page.module.css";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Éclairages") };
}

/**
 * LES HUIT ÉCLAIRAGES, ENFIN SUR UNE PAGE À EUX.
 *
 * Chacun avait déjà la sienne, « /info/<clé> » ; il manquait la liste, qui
 * vivait pliée dans la quatrième section du Guide. Une liste qu'il faut
 * déplier pour voir n'est pas un sommaire, c'est une porte de plus.
 *
 * « Pour aller plus loin » CITE trois outils, il ne les duplique pas : le
 * comparateur, le profil et les sociétés ont déjà leur entrée ailleurs dans la
 * colonne, et deux listes de la même chose divergent toujours.
 */
export default async function EclairagesPage() {
  const t = await getT();
  const toutes = await loadLessons();
  const lessons = toutes.filter((l) => !l.section).sort((a, b) => a.order - b.order);
  const parcoursCount = toutes.filter((l) => l.section).length;
  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          surTitre={t("Aide")}
          titre={t("Huit éclairages courts")}
          phrase={t("Ce qu'il faut savoir pour comprendre une offre de Guichet : les mots, les chiffres, les risques : expliqués une fois pour toutes, sans jargon inutile.")}
        />
        {/* LE RENVOI VERS L'AIDE RESTE : il était à côté du titre de la section
            des éclairages, et une entrée de menu ne remplace pas un lien posé
            là où la question se pose — on lit un éclairage, on n'a pas sa
            réponse, elle est à un clic. */}
        <p className={styles.versAide}>
          <Link className="btn sm" href="/info/aide" data-coach="info-aide">
            {t("Aide : vos questions, nos réponses")} →
          </Link>
        </p>
        <div className={styles.lessons} data-coach="info-insights">
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

        {/* La carte ne porte plus de cible de visite guidée : AUCUN arrêt ne
            l'a jamais nommée, ni ici ni sur la page unique d'avant — mesuré le
            29 octobre 2026. Le parcours a sa propre visite, sur sa page. */}
        <Link href="/info/parcours" className={styles.parcours}>
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
            <small>{t("{n} éclairages en six sections : le marché et ses acteurs, les instruments, les risques, passer un ordre, fiscalité et frais, taux et monnaie.", { n: parcoursCount })}</small>
          </span>
          <span className={styles.parcoursGo}>{t("Commencer")} →</span>
        </Link>

        <h2 className={styles.plusLoin}>{t("Pour aller plus loin")}</h2>
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

        <BackToTop lift />
        <GuideBar pos={{ label: t("Éclairages") }} />
        <AncreHeritee />
        {/* LES REPÈRES DU GUIDE SUIVENT LEURS CIBLES. Ils vivaient sur la page
            unique ; ses trois arrêts qui pointaient ici — la recherche, l'aide,
            les éclairages — restent ici, et les deux autres sont partis avec
            le simulateur et le glossaire, chacun sur sa page. Un arrêt dont la
            cible manque est sauté par « CoachMarks » : les scinder était la
            seule façon de n'en perdre aucun. */}
        <CoachMarks
          id="eclairages"
          replayLabel={t("Comment utiliser le Guide ?")}
          stops={[
            { target: "colonne-recherche", title: t("Cherchez un mot, une notion"), text: t("Un terme du glossaire, un éclairage, un outil, une page, une question de l'aide : tapez le mot, ouvrez le résultat. C'est le support en libre-service de Guichet.") },
            { target: "info-aide", title: t("Vos questions, nos réponses"), text: t("La page Aide répond à ce qu'on nous demande le plus : se connecter, ouvrir un compte, lire une ligne, déclarer une intention, régler, recevoir ses documents, nous joindre.") },
            { target: "info-insights", title: t("Huit éclairages de deux minutes"), text: t("Rendement et coupon, adjudication, coupon couru, actions, fonds, risques : chaque éclairage se lit en deux minutes et se coche une fois lue.") },
          ]}
        />
      </div>
    </Glissement>
  );
}
