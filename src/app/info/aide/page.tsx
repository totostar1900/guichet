import Link from "next/link";
import { DocBlocks } from "@/components/docs/DocBlocks";
import { ChapterLinks } from "@/app/desk/docs/Outline";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { PUBLIC_DOCS } from "@/data/docs";
import { getLang, getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import styles from "@/app/desk/docs/docs.module.css";

export const metadata = { title: "Aide" };

/**
 * The client help page. Only pages marked `visibility: "public"` are rendered
 * here : written for clients alone, checked by a test for internal details.
 */
export default async function AidePage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const doc = PUBLIC_DOCS[0];
  if (!doc) return null;
  const chapters = doc.chapters.map((c) => ({ id: c.id, title: c.title[lang] }));
  return (
    <div className={`${styles.reader} ${styles.readerTwo}`}>
      <nav className={styles.nav} aria-label={t("Aide")} data-coach="aide-nav">
        <Link href="/info">← {t("Guide")}</Link>
        <span className={styles.group}>{t("Aide")}</span>
        <div>
          <Link href="/info/aide" aria-current="page">
            {doc.title[lang]}
          </Link>
          <ChapterLinks chapters={chapters} />
        </div>
        <span className={styles.group}>{t("Pour aller plus loin")}</span>
        <Link href="/info">{t("Glossaire et leçons")}</Link>
        <Link href="/info#simulateur">{t("Simulateur")}</Link>
        <Link href="/comparer">{t("Comparer deux lignes")}</Link>
        <span className={styles.navMeta}>
          {t("Mis à jour le")} {fmtDate(doc.checkedOn)}
        </span>
      </nav>
      <article className={styles.doc} data-coach="aide-page">
        <h1>{doc.title[lang]}</h1>
        <p className={styles.summary}>{doc.summary[lang]}</p>
        <DocBlocks chapters={doc.chapters} lang={lang} />
        <CoachMarks
          id="aide"
          replayLabel={t("Comment utiliser cette aide ?")}
          stops={[
            { target: "aide-page", title: t("Des réponses, pas des procédures"), text: t("Chaque chapitre répond aux questions que vous nous posez le plus : se connecter, ouvrir un compte, lire une ligne, déclarer une intention, régler, recevoir vos documents, nous joindre. Tout est écrit pour vous, en clair.") },
            { target: "aide-nav", title: t("Trouver vite"), text: t("À gauche, les chapitres de cette page ; en dessous, le glossaire, les leçons, le simulateur et le comparateur. La recherche du Guide trouve aussi chaque question de cette aide.") },
            { target: "aide-contact", title: t("Quand ça ne suffit pas"), text: t("Le bouton « Information » de chaque fiche ouvre WhatsApp ; un robot répond aux questions simples, un conseiller prend le relais. Pour une réclamation, écrivez-nous avec la référence concernée.") },
            { target: "aide-entretien", title: t("Comment Guichet est entretenu"), text: t("Qui écrit ce que vous lisez, d'où viennent les cours, ce qui se passe en cas de panne, où sont vos données : en clair, sans jargon. Un doute sur un chiffre ? Dites-le-nous, il est corrigé pour tout le monde.") },
          ]}
        />
      </article>
    </div>
  );
}
