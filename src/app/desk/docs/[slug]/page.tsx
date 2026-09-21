import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskNav } from "@/components/DeskNav";
import { AUDIENCE_LABEL, DOCS, docBySlug } from "@/data/docs";
import { DocBlocks } from "@/components/docs/DocBlocks";
import { docStats } from "@/lib/documents/stats";
import { getLang, getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { ChapterLinks, Outline } from "../Outline";
import styles from "../docs.module.css";

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lang = await getLang();
  const d = docBySlug(slug);
  return { title: d ? `${d.title[lang]} · Documentation` : "Documentation" };
}

/** One documentation page: its own outline on the left (chapter by chapter), the text in the middle, the list of documents on the right. */
export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, t, lang] = await Promise.all([params, getT(), getLang()]);
  const doc = docBySlug(slug);
  if (!doc) notFound();
  const i = DOCS.indexOf(doc);
  const prev = DOCS[i - 1];
  const next = DOCS[i + 1];
  const chapters = doc.chapters.map((c) => ({ id: c.id, title: c.title[lang] }));
  return (
    <>
      <DeskNav current="/desk/docs" />
      <div className={styles.reader}>
        {/* left: this document, chapter by chapter, and its card */}
        <Outline
          chapters={chapters}
          label={doc.title[lang]}
          meta={
            <>
              {t("Vérifié le")} {fmtDate(doc.checkedOn)}
              <br />
              {t("Responsable")} : {doc.owner}
              <br />
              <Link href="/desk/docs">{t("Rechercher dans la documentation")}</Link>
            </>
          }
          side="left"
        />

        <div className={styles.phoneOnly}>
          <ChapterLinks chapters={chapters} pageTitle={doc.title[lang]} />
        </div>
        <article className={styles.doc} data-coach="docs-page">
          <h1>{doc.title[lang]}</h1>
          <p className={styles.summary}>{doc.summary[lang]}</p>
          <div className={styles.audiences}>
            {doc.visibility === "public" && <span className={`${styles.chip} ${styles.client}`}>{t("visible par les clients")} · /info/aide</span>}
            {doc.audience.map((a) => (
              <span key={a} className={`${styles.chip} ${styles[a] ?? ""}`}>
                {AUDIENCE_LABEL[a][lang]}
              </span>
            ))}
          </div>
          <DocBlocks chapters={doc.chapters} lang={lang} stats={doc.chapters.some((c) => c.blocks.some((b) => b.type === "docmap")) ? await docStats() : undefined} />
          <div className={styles.pager}>
            {prev ? <Link href={`/desk/docs/${prev.slug}`}>← {prev.title[lang]}</Link> : <span />}
            {next ? <Link href={`/desk/docs/${next.slug}`}>{next.title[lang]} →</Link> : <span />}
          </div>
        </article>

        {/* right: the list of documents */}
        <nav className={styles.nav} aria-label={t("Documentation")} data-coach="docs-tree">
          <Link href="/desk/docs">← {t("Toutes les pages")}</Link>
          <span className={styles.group}>{t("Documentation")}</span>
          {DOCS.map((d) => (
            <Link key={d.slug} href={`/desk/docs/${d.slug}`} aria-current={d.slug === doc.slug ? "page" : undefined}>
              {d.title[lang]}
            </Link>
          ))}
          <span className={styles.group}>{t("Notes")}</span>
          <Link href="/desk/docs/notes">{t("Notes de travail de l'assistant")}</Link>
          <span className={styles.group}>{t("Pages du desk")}</span>
          <Link href="/desk/guide">{t("Guide, champ par champ")}</Link>
        </nav>
      </div>
    </>
  );
}
