import { Sommaire } from "@/components/Sommaire";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { BackToTop } from "@/components/BackToTop";
import { GuideBar } from "../GuideBar";
import { Actor, type ActorKind } from "@/components/Illustrations";
import { SECTIONS } from "@/data/parcours";
import { loadLessons } from "@/lib/reference";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";
import { Parcours } from "./Parcours";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Comprendre le marché CEMAC") };
}

const STRIP: ActorKind[] = ["tresor", "entreprise", "gestion", "guichet", "svt", "bvmac", "beac", "cosumaf", "depositaire", "client"];

/** The second course of the Guide: five folding sections, twenty lessons, a progress bar; the lessons are the desk's, the sections are code. */
export default async function ParcoursPage() {
  const t = await getT();
  const lessons = (await loadLessons()).filter((l) => l.section).sort((a, b) => a.order - b.order);
  const chapters = SECTIONS.map((s) => ({ id: `section-${s.key}`, title: `${String.fromCharCode(64 + s.order)} · ${t(s.title)}`, letter: String.fromCharCode(64 + s.order), color: s.color, section: s.key }));
  return (
    <Glissement>
      <Sommaire label={t("Sur cette page")} sections={chapters}>
        <div className={styles.wrap}>
          {/* LE BLOC GARDE SON ANCRE, et l'en-tête passe à l'étalon. Le
              « data-coach » vise ce conteneur pour y poser une bulle
              d'apprentissage : c'est pourquoi le div reste, alors que le
              titre, le sur-titre et la phrase le quittent.
              LA BANDE DES ACTEURS A PERDU SA MARGE HAUTE : l'écart sous un
              en-tête est celui de l'étalon, et le composer en deux endroits
              est l'accident que « EnTete » existe pour éviter. */}
          <div className={styles.head} data-coach="parcours-head">
            <EnTete
              surTitre={t("Guide · parcours")}
              titre={t("Comprendre le marché CEMAC")}
              phrase={t("{s} sections, {n} éclairages de deux à trois minutes. Ouvrez une section, lisez un éclairage, répondez à sa question ; le parcours retient où vous en êtes. Les huit éclairages « Lire une ligne » restent le premier pas ; ici, on prend du recul.", { s: SECTIONS.length, n: lessons.length })}
            />
            <div className={styles.strip} aria-hidden="true">
              {STRIP.map((k) => (
                <span key={k} className={styles.actor}>
                  <Actor kind={k} size={64} />
                </span>
              ))}
              <span>{t("Les dix acteurs du parcours, dans l'ordre où votre argent les rencontre.")}</span>
            </div>
          </div>
          <Parcours sections={SECTIONS} lessons={lessons} />
          <BackToTop lift />
          <GuideBar pos={{ label: t("Le Guide · parcours") }} />
          <CoachMarks
            id="parcours"
            replayLabel={t("Comment suivre ce parcours ?")}
            stops={[
              { target: "parcours-head", title: t("{n} éclairages, {s} sections", { n: lessons.length, s: SECTIONS.length }), text: t("Chaque section se replie : vous voyez six idées et le temps qu'il reste. La section en cours s'ouvre seule quand vous revenez.") },
              { target: "parcours-progress", title: t("Où vous en êtes"), text: t("Un éclairage est lue quand vous avez répondu à sa question. La barre se remplit section par section, dans la couleur de chacune.") },
              { target: "parcours-section", title: t("Une section"), text: t("Ouvrez-la : ses éclairages, celle qu'il faut continuer, et ce qu'elle vous apprend. Chaque éclairage porte un schéma ou un bloc à manipuler, une question, et les mots du glossaire.") },
            ]}
          />
        </div>
      </Sommaire>
    </Glissement>
  );
}
