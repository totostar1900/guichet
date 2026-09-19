import Link from "next/link";
import { Suspense } from "react";
import { ChapterLinks } from "@/app/desk/docs/Outline";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { BackToTop } from "@/components/BackToTop";
import { Actor, type ActorKind } from "@/components/Illustrations";
import { SECTIONS } from "@/data/parcours";
import { loadLessons } from "@/lib/reference";
import { getT } from "@/i18n/server";
import docs from "@/app/desk/docs/docs.module.css";
import styles from "./page.module.css";
import { Parcours } from "./Parcours";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comprendre le marché CEMAC" };

const STRIP: ActorKind[] = ["tresor", "entreprise", "gestion", "guichet", "svt", "bvmac", "beac", "cosumaf", "depositaire", "client"];

/** The second course of the Guide: five folding sections, twenty lessons, a progress bar; the lessons are the desk's, the sections are code. */
export default async function ParcoursPage() {
  const t = await getT();
  const lessons = (await loadLessons()).filter((l) => l.section).sort((a, b) => a.order - b.order);
  const chapters = SECTIONS.map((s) => ({ id: `section-${s.key}`, title: `${String.fromCharCode(64 + s.order)} · ${t(s.title)}` }));
  return (
    <div className={`${docs.reader} ${docs.readerTwo}`}>
      <nav className={docs.nav} aria-label={t("Guide")} data-coach="parcours-nav">
        <Link href="/info">← {t("Guide")}</Link>
        <span className={docs.group}>{t("Parcours")}</span>
        <div>
          <Link href="/info/parcours" aria-current="page">
            {t("Comprendre le marché CEMAC")}
          </Link>
          <ChapterLinks chapters={chapters} />
        </div>
        <span className={docs.group}>{t("Pour aller plus loin")}</span>
        <Link href="/info#lecons">{t("Lire une ligne en trente secondes")}</Link>
        <Link href="/info/aide">{t("Aide : vos questions, nos réponses")}</Link>
        <Link href="/info#glossaire">{t("Les mots du Guichet")}</Link>
      </nav>
      <div className={styles.wrap}>
        <div className={styles.head} data-coach="parcours-head">
          <span className="eyebrow">{t("Guide · parcours")}</span>
          <h1 className="display">{t("Comprendre le marché CEMAC")}</h1>
          <p className="muted">{t("Cinq sections, vingt leçons de deux minutes. Ouvrez une section, lisez une leçon, répondez à sa question ; le parcours retient où vous en êtes. Les huit leçons « Lire une ligne » restent le premier pas ; ici, on prend du recul.")}</p>
          <div className={styles.strip} aria-hidden="true">
            {STRIP.map((k) => (
              <span key={k} className={styles.actor}>
                <Actor kind={k} size={64} />
              </span>
            ))}
            <span>{t("Les dix acteurs du parcours, dans l'ordre où votre argent les rencontre.")}</span>
          </div>
        </div>
        <Suspense>
          <Parcours sections={SECTIONS} lessons={lessons} />
        </Suspense>
        <BackToTop />
        <CoachMarks
          id="parcours"
          replayLabel={t("Comment suivre ce parcours ?")}
          stops={[
            { target: "parcours-head", title: t("Vingt leçons, cinq sections"), text: t("Chaque section se replie : vous voyez cinq idées et le temps qu'il reste. La section en cours s'ouvre seule quand vous revenez.") },
            { target: "parcours-progress", title: t("Où vous en êtes"), text: t("Une leçon est lue quand vous avez répondu à sa question. La barre se remplit section par section, dans la couleur de chacune.") },
            { target: "parcours-section", title: t("Une section"), text: t("Ouvrez-la : ses leçons, celle qu'il faut continuer, et ce qu'elle vous apprend. Chaque leçon porte un schéma ou un bloc à manipuler, une question, et les mots du glossaire.") },
            { target: "parcours-nav", title: t("Le sommaire"), text: t("À gauche, les cinq sections ; en dessous, les huit premières leçons, l'aide et le glossaire.") },
          ]}
        />
      </div>
    </div>
  );
}
