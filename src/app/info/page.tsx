import { Suspense } from "react";
import Link from "next/link";
import { loadLessons } from "@/lib/reference";
import { getRegistry } from "@/lib/registry";
import { DoneMark } from "./[key]/Quiz";
import { ReplayOnboarding } from "@/components/mobile/Onboarding";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { BackToTop } from "@/components/BackToTop";
import { Simulator } from "@/components/Simulator";
import { InfoSearch, type SearchEntry } from "./InfoSearch";
import { InfoNav } from "./InfoNav";
import { Actor } from "@/components/Illustrations";
import { Glossary } from "./Glossary";
import styles from "./page.module.css";
import docs from "@/app/desk/docs/docs.module.css";
import { getT } from "@/i18n/server";

export const metadata = { title: "Guide" };

/**
 * The Guide tab (/info): where a first-time investor starts : eight short lessons
 * (référentiel), the bond simulator, the comparison tool, the glossary;
 * « Premiers pas » replayable here. The former « Simulateur & repères » lives here.
 */
export default async function InfoPage() {
  const G = getRegistry().glossary;
  const lessons = (await loadLessons()).filter((l) => !l.section).sort((a, b) => a.order - b.order);
  const parcoursCount = (await loadLessons()).filter((l) => l.section).length;
  const t = await getT();
  const keys = Object.keys(G).sort((a, b) => G[a].short.localeCompare(G[b].short, "fr"));
  // The search index: glossary, lessons, tools and pages : in the viewer's language.
  const entries: SearchEntry[] = [
    ...keys.map((k) => ({ kind: "terme" as const, title: G[k].long ? `${t(G[k].short)} : ${t(G[k].long)}` : t(G[k].short), text: t(G[k].text), href: `/info#terme-${k}`, extra: k.replace(/_/g, " ") })),
    { kind: "lecon" as const, title: t("Comprendre le marché CEMAC"), text: t("Cinq sections, vingt leçons : le marché et ses acteurs, les instruments, les risques, passer un ordre, fiscalité et frais."), href: "/info/parcours", extra: "parcours cours marché BEAC COSUMAF BVMAC acteurs instruments risques" },
    ...(await loadLessons()).filter((l) => l.section).map((l) => ({ kind: "lecon" as const, title: t(l.title), text: [t(l.intro), ...l.body.map((p) => t(p)), t(l.quiz.q)].join(" "), href: `/info/${l.key}` })),
    ...lessons.map((l) => ({ kind: "lecon" as const, title: t(l.title), text: [t(l.intro), ...l.body.map((p) => t(p)), t(l.quiz.q)].join(" "), href: `/info/${l.key}` })),
    { kind: "outil" as const, title: t("Simulateur d'obligation"), text: t("Comment le prix, le coupon et la durée fabriquent le rendement : faites varier, regardez. L'outil ne porte sur aucune offre en cours : les prix des offres sont fixés par le desk et se lisent dans le Guichet."), href: "/info#simulateur", extra: "simulation rendement prix coupon" },
    { kind: "outil" as const, title: t("Comparer deux lignes"), text: t("Deux offres côte à côte : rendement, durée, ticket, calendrier."), href: "/comparer", extra: "comparaison comparateur" },
    { kind: "outil" as const, title: t("Revoir les premiers pas"), text: t("Toutes les opportunités de la zone CEMAC, à un endroit"), href: "/info?premiers-pas=1", extra: "onboarding tutoriel guide" },
    { kind: "page" as const, title: t("Guichet"), text: t("Titres neufs : vous souscrivez auprès de l'émetteur (Trésor, entreprise) pendant une fenêtre, à un prix fixé par adjudication ou par le desk.") + " " + t("Titres déjà cotés à la BVMAC : vous achetez ou vendez à un autre investisseur, au cours du jour, en séance."), href: "/", extra: "offres lignes marché primaire secondaire OTA BTA APE IPO" },
    { kind: "page" as const, title: t("Fonds"), text: t("Parts de fonds communs de placement : vous souscrivez ou rachetez à la prochaine valeur liquidative."), href: "/fonds", extra: "OPCVM FCP VL gestion collective" },
    { kind: "page" as const, title: t("Sociétés cotées et émetteurs"), text: t("Comptes, dividendes, actionnariat, documents publiés à la BVMAC."), href: "/societes", extra: "actions entreprises BVMAC PER dividende" },
    { kind: "page" as const, title: t("Ouvrir un compte"), text: t("Dix minutes sur votre téléphone : votre identité, quelques pièces en photo, l'origine des fonds et votre profil, puis l'acceptation de la convention par code. Un conseiller valide sous 24 h pour un résident, 48 h avec un appel vidéo depuis l'étranger."), href: "/ouvrir-un-compte", extra: "KYC compte-titres dossier pièces convention" },
    { kind: "page" as const, title: t("Mon espace"), text: t("Intentions en cours") + " · " + t("Mes positions") + " · " + t("Mes documents") + " · " + t("Lignes suivies") + " · " + t("Alertes sur cet appareil"), href: "/moi", extra: "positions relevé documents intentions alertes suivi" },
    { kind: "page" as const, title: t("Aide : vos questions, nos réponses"), text: t("Se connecter, ouvrir un compte, lire une ligne, déclarer une intention, régler, recevoir ses documents, nous joindre."), href: "/info/aide", extra: "aide FAQ questions support code connexion réclamation données" },
    { kind: "page" as const, title: t("Se connecter"), text: t("Recevez un code à usage unique par e-mail. Aucun mot de passe à retenir."), href: "/connexion", extra: "connexion code mot de passe identifiant" },
  ];
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

        <div className={`${styles.lessons} ${styles.anchor}`} data-coach="info-lessons" id="lecons">
          <div className={styles.lessonsHead}>
            <h2 className={styles.h2}>{t("Huit leçons courtes")}</h2>
            <Suspense>
              <Link className="btn sm" href="/info/aide" data-coach="info-aide">
                {t("Aide : vos questions, nos réponses")} →
              </Link>
              <ReplayOnboarding />
            </Suspense>
          </div>
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

        <Link href="/info/parcours" className={`${styles.parcours} ${styles.anchor}`} id="parcours" data-coach="info-parcours">
          <span className={styles.parcoursStrip} aria-hidden="true">
            {(["beac", "tresor", "guichet", "client"] as const).map((k) => (
              <Actor key={k} kind={k} size={56} />
            ))}
          </span>
          <span className={styles.parcoursText}>
            <span className="eyebrow">{t("Parcours")}</span>
            <b>{t("Comprendre le marché CEMAC")}</b>
            <small>{t("{n} leçons en cinq sections : le marché et ses acteurs, les instruments, les risques, passer un ordre, fiscalité et frais.", { n: parcoursCount })}</small>
          </span>
          <span className={styles.parcoursGo}>{t("Commencer")} →</span>
        </Link>

        <h2 className={`${styles.h2} ${styles.anchor}`} id="simulateur">
          {t("Simulateur d'obligation")}
        </h2>
        <div className={styles.sim} data-coach="info-sim">
          <p className="muted">{t("Comment le prix, le coupon et la durée fabriquent le rendement : faites varier, regardez. L'outil ne porte sur aucune offre en cours : les prix des offres sont fixés par le desk et se lisent dans le Guichet.")}</p>
          <div className={styles.warn}>{t("Outil pédagogique : résultats bruts, avant fiscalité, convention Exact/Exact. Ne constitue ni une offre ni un conseil.")}</div>
          <Simulator />
        </div>

        <h2 className={`${styles.h2} ${styles.anchor}`} id="outils">
          {t("Outils et repères")}
        </h2>
        <div className={styles.grid}>
          <Link href="/comparer" className={styles.tile}>
            <span className={styles.k}>{t("Outil")}</span>
            <b>{t("Comparer deux lignes")}</b>
            <span>{t("Deux offres côte à côte : rendement, durée, ticket, calendrier.")}</span>
          </Link>
          <Link href="/societes" className={styles.tile}>
            <span className={styles.k}>{t("Repères")}</span>
            <b>{t("Sociétés cotées et émetteurs")}</b>
            <span>{t("Comptes, dividendes, actionnariat, documents publiés à la BVMAC.")}</span>
          </Link>
        </div>

        <BackToTop />
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
        <h2 className={`${styles.h2} ${styles.anchor}`} id="glossaire">
          {t("Les mots du Guichet")}
        </h2>
        <Glossary entries={keys.map((k) => ({ k, short: t(G[k].short), long: G[k].long ? t(G[k].long) : undefined, text: t(G[k].text) }))} />
      </div>
    </div>
  );
}
