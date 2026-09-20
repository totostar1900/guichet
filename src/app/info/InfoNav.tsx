"use client";

import Link from "next/link";
import { ChapterLinks } from "@/app/desk/docs/Outline";
import { useT } from "@/i18n/client";
import styles from "@/app/desk/docs/docs.module.css";

/** The left pane of the Guide tab (/info): the sections of this page (the one in view marked), then the help and the tools. */
export function InfoNav({ sections }: { sections: { id: string; title: string }[] }) {
  const t = useT();
  return (
    <nav className={styles.nav} aria-label={t("Guide")} data-coach="info-nav">
      <span className={styles.group}>{t("Guide")}</span>
      <div>
        <Link href="/info" aria-current="page">
          {t("Lire une ligne en trente secondes")}
        </Link>
        <ChapterLinks chapters={sections} pageTitle={t("Guide · Lire une ligne en trente secondes")} />
      </div>
      <span className={styles.group}>{t("Pour aller plus loin")}</span>
      <Link href="/info/parcours">{t("Comprendre le marché CEMAC")}</Link>
      <Link href="/info/aide">{t("Aide : vos questions, nos réponses")}</Link>
      <Link href="/comparer">{t("Comparer deux lignes")}</Link>
      <Link href="/societes">{t("Sociétés cotées et émetteurs")}</Link>
      <Link href="/actualites">{t("Actualités")}</Link>
    </nav>
  );
}
