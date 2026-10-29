import { getRegistry } from "@/lib/registry";
import { BackToTop } from "@/components/BackToTop";
import { GuideBar } from "../GuideBar";
import { Glossary } from "../Glossary";
import { EnTete } from "@/components/EnTete";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { Glissement } from "@/components/mobile/Glissement";
import { getT } from "@/i18n/server";
import styles from "../page.module.css";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Glossaire") };
}

/**
 * LES SOIXANTE-SIX MOTS, SUR LEUR PAGE.
 *
 * Le glossaire était la dernière section d'une page qui en portait six, et il
 * fallait la déplier pour l'atteindre. Or c'est la destination de SOIXANTE-SIX
 * entrées de la recherche — la moitié de l'index — qui visaient toutes une
 * ancre « /info#terme-… » dans une section repliée. Elles visent maintenant
 * « /info/glossaire#terme-… », une page qui s'ouvre sur ce qu'on lui demande.
 */
export default async function GlossairePage() {
  const t = await getT();
  const G = getRegistry().glossary;
  const keys = Object.keys(G).sort((a, b) => G[a].short.localeCompare(G[b].short, "fr"));
  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          surTitre={t("Aide")}
          titre={t("Les mots de Guichet")}
          phrase={t("Le vocabulaire du marché, défini une fois : chaque terme tel qu'il est employé dans les fiches, les ordres et les documents de la maison.")}
        />
        {/* « Glossary » porte déjà le repère « info-glossaire » : l'envelopper
            d'un second donnerait deux cibles au même nom, et la visite
            pointerait celle qui vient en premier dans la page. */}
        <Glossary entries={keys.map((k) => ({ k, short: t(G[k].short), long: G[k].long ? t(G[k].long) : undefined, text: t(G[k].text) }))} />
        <BackToTop lift />
        <GuideBar pos={{ label: t("Glossaire") }} />
        {/* L'arrêt du Guide qui expliquait le glossaire vient avec lui. */}
        <CoachMarks
          id="glossaire"
          replayLabel={t("Comment lire le glossaire ?")}
          stops={[{ target: "info-glossaire", title: t("Les mots de Guichet"), text: t("Le glossaire a sa propre recherche, un tri A → Z ou par catégorie, et un regroupement par catégorie : titres de dette, actions et sociétés, fonds, vos ordres, les états d'une ligne.") }]}
        />
      </div>
    </Glissement>
  );
}
