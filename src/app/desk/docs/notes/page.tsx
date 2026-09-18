import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { Markdown } from "@/components/docs/Markdown";
import { DOCS } from "@/data/docs";
import { getLang, getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { readNotes } from "@/lib/notes";
import { Outline } from "../Outline";
import styles from "../docs.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notes de travail · Documentation" };

/** The assistant's working notes (docs/notes/*.md), read from the repo at each visit. */
export default async function NotesPage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const notes = readNotes();
  const chapters = notes.map((n) => ({ id: n.slug, title: n.slug === "README" ? t("À propos de ces notes") : n.title }));
  const latest = notes.map((n) => n.modified).filter(Boolean).sort().reverse()[0];
  return (
    <>
      <DeskNav current="/desk/docs" />
      <div className={styles.reader}>
        <nav className={styles.nav} aria-label={t("Documentation")}>
          <Link href="/desk/docs">← {t("Toutes les pages")}</Link>
          <span className={styles.group}>{t("Documentation")}</span>
          {DOCS.map((d) => (
            <div key={d.slug}>
              <Link href={`/desk/docs/${d.slug}`}>{d.title[lang]}</Link>
            </div>
          ))}
          <span className={styles.group}>{t("Notes")}</span>
          <div>
            <Link href="/desk/docs/notes" aria-current="page">
              {t("Notes de travail de l'assistant")}
            </Link>
            <div className={styles.chapters}>
              {chapters.map((c) => (
                <a key={c.id} href={`#${c.id}`}>
                  {c.title}
                </a>
              ))}
            </div>
          </div>
          <span className={styles.group}>{t("Pages du desk")}</span>
          <Link href="/desk/guide">{t("Guide, champ par champ")}</Link>
        </nav>

        <article className={styles.doc}>
          <h1>{t("Notes de travail de l'assistant")}</h1>
          <p className={styles.summary}>{t("Ce que l'assistant garde entre ses sessions : état du projet, décisions, conventions, migrations appliquées, ce qui reste à faire. En anglais, écrites pour lui ; copiées dans le dépôt (docs/notes) pour que l'équipe les lise. Elles disent pourquoi les choses sont faites ainsi ; pour l'exploitation au quotidien, lisez les autres pages.")}</p>
          <div className={styles.audiences}>
            <span className={`${styles.chip} ${styles.tech}`}>{t("Technique")}</span>
            <span className={`${styles.chip} ${styles.admin}`}>{t("Administration")}</span>
          </div>
          {notes.length === 0 && <p className={styles.note}>{t("Aucune note dans docs/notes.")}</p>}
          {notes.map((n) => (
            <section key={n.slug}>
              <h2 id={n.slug}>{n.slug === "README" ? t("À propos de ces notes") : n.title}</h2>
              {n.description && <p className={styles.lead}>{n.description}</p>}
              <Markdown text={n.body} />
              <p className={styles.hint} style={{ fontSize: ".74rem", color: "var(--ink-3)" }}>
                docs/notes/{n.slug}.md{n.modified ? ` · ${t("modifié le")} ${fmtDate(n.modified)}` : ""}
              </p>
            </section>
          ))}
        </article>

        <Outline
          chapters={chapters}
          label={t("Sur cette page")}
          meta={
            <>
              {latest ? `${t("Dernière note modifiée le")} ${fmtDate(latest)}` : ""}
              <br />
              <Link href="/desk/docs">{t("Rechercher dans la documentation")}</Link>
            </>
          }
        />
      </div>
    </>
  );
}
