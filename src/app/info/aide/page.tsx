import Link from "next/link";
import { DocBlocks } from "@/components/docs/DocBlocks";
import { Outline } from "@/app/desk/docs/Outline";
import { PUBLIC_DOCS } from "@/data/docs";
import { getLang, getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import styles from "@/app/desk/docs/docs.module.css";

export const metadata = { title: "Aide" };

/**
 * The client help page. Only pages marked `visibility: "public"` are rendered
 * here — written for clients alone, checked by a test for internal details.
 */
export default async function AidePage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const doc = PUBLIC_DOCS[0];
  if (!doc) return null;
  const chapters = doc.chapters.map((c) => ({ id: c.id, title: c.title[lang] }));
  return (
    <div className={styles.reader}>
      <nav className={styles.nav} aria-label={t("Aide")}>
        <Link href="/info">← {t("Info")}</Link>
        <span className={styles.group}>{t("Aide")}</span>
        <div>
          <Link href="/info/aide" aria-current="page">
            {doc.title[lang]}
          </Link>
          <div className={styles.chapters}>
            {chapters.map((c) => (
              <a key={c.id} href={`#${c.id}`}>
                {c.title}
              </a>
            ))}
          </div>
        </div>
        <span className={styles.group}>{t("Pour aller plus loin")}</span>
        <Link href="/info">{t("Glossaire et leçons")}</Link>
        <Link href="/info#simulateur">{t("Simulateur")}</Link>
        <Link href="/comparer">{t("Comparer deux lignes")}</Link>
      </nav>
      <article className={styles.doc}>
        <h1>{doc.title[lang]}</h1>
        <p className={styles.summary}>{doc.summary[lang]}</p>
        <DocBlocks chapters={doc.chapters} lang={lang} />
      </article>
      <Outline
        chapters={chapters}
        label={t("Sur cette page")}
        meta={
          <>
            {t("Mis à jour le")} {fmtDate(doc.checkedOn)}
            <br />
            <Link href="/info">{t("Glossaire et leçons")}</Link>
          </>
        }
      />
    </div>
  );
}
