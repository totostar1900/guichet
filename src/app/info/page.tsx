import { Suspense } from "react";
import Link from "next/link";
import { loadLessons } from "@/lib/reference";
import { getRegistry } from "@/lib/registry";
import { DoneMark } from "./[key]/Quiz";
import { ReplayOnboarding } from "@/components/mobile/Onboarding";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { Simulator } from "@/components/Simulator";
import { InfoSearch, type SearchEntry } from "./InfoSearch";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const metadata = { title: "Info" };

/**
 * The Info tab: where a first-time investor starts — eight short lessons
 * (référentiel), the bond simulator, the comparison tool, the glossary;
 * « Premiers pas » replayable here. The former « Simulateur & repères » lives here.
 */
export default async function InfoPage() {
  const G = getRegistry().glossary;
  const lessons = await loadLessons();
  const t = await getT();
  const keys = Object.keys(G).sort((a, b) => G[a].short.localeCompare(G[b].short, "fr"));
  // The search index: glossary, lessons, tools and pages — in the viewer's language.
  const entries: SearchEntry[] = [
    ...keys.map((k) => ({ kind: "terme" as const, title: G[k].long ? `${t(G[k].short)} — ${t(G[k].long)}` : t(G[k].short), text: t(G[k].text), href: `/info#terme-${k}`, extra: k.replace(/_/g, " ") })),
    ...lessons.map((l) => ({ kind: "lecon" as const, title: t(l.title), text: [t(l.intro), ...l.body.map((p) => t(p)), t(l.quiz.q)].join(" "), href: `/info/${l.key}` })),
    { kind: "outil" as const, title: t("Simulateur d'obligation"), text: t("Comment le prix, le coupon et la durée fabriquent le rendement : faites varier, regardez. L'outil ne porte sur aucune offre en cours — les prix des offres sont fixés par le desk et se lisent dans le Guichet."), href: "/info#simulateur", extra: "simulation rendement prix coupon" },
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
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className="eyebrow">Info</div>
        <h1 className="display">{t("Lire une ligne en trente secondes")}</h1>
        <p className="muted">{t("Ce qu'il faut savoir pour comprendre une offre du Guichet : les mots, les chiffres, les risques — expliqués une fois pour toutes, sans jargon inutile.")}</p>
      </div>
      <div data-coach="info-search">
        <InfoSearch entries={entries} />
      </div>

      <div className={styles.lessons} data-coach="info-lessons">
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

      <h2 className={styles.h2} id="simulateur">
        {t("Simulateur d'obligation")}
      </h2>
      <div className={styles.sim} data-coach="info-sim">
        <p className="muted">{t("Comment le prix, le coupon et la durée fabriquent le rendement : faites varier, regardez. L'outil ne porte sur aucune offre en cours — les prix des offres sont fixés par le desk et se lisent dans le Guichet.")}</p>
        <div className={styles.warn}>{t("Outil pédagogique — résultats bruts, avant fiscalité, convention Exact/Exact. Ne constitue ni une offre ni un conseil.")}</div>
        <Simulator />
      </div>

      <h2 className={styles.h2}>{t("Outils et repères")}</h2>
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

      <CoachMarks
        id="info"
        replayLabel={t("Comment utiliser Info ?")}
        stops={[
          { target: "info-search", title: t("Cherchez un mot, une notion"), text: t("Un terme du glossaire, une leçon, un outil, une page, une question de l'aide : tapez le mot, ouvrez le résultat. C'est le support en libre-service du Guichet.") },
          { target: "info-aide", title: t("Vos questions, nos réponses"), text: t("La page Aide répond à ce qu'on nous demande le plus : se connecter, ouvrir un compte, lire une ligne, déclarer une intention, régler, recevoir ses documents, nous joindre.") },
          { target: "info-lessons", title: t("Huit leçons de deux minutes"), text: t("Rendement et coupon, adjudication, coupon couru, actions, fonds, risques : chaque leçon se lit en deux minutes et se coche une fois lue.") },
          { target: "info-sim", title: t("Le simulateur"), text: t("Faites varier le prix, le coupon et la durée : vous voyez le rendement bouger. Un outil pour comprendre, qui ne porte sur aucune ligne réelle.") },
        ]}
      />
      <h2 className={styles.h2}>{t("Les mots du Guichet")}</h2>
      <div className={styles.gloss}>
        {keys.map((k) => (
          <div key={k} id={`terme-${k}`}>
            <b>{G[k].long ? `${t(G[k].short)} — ${t(G[k].long)}` : t(G[k].short)}</b>
            <p>{t(G[k].text)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
