import Link from "next/link";
import { Suspense } from "react";
import { DeskNav } from "@/components/DeskNav";
import { Toolbar } from "@/components/ui/Toolbar";
import { AUDIENCE_LABEL, DOCS, searchEntries, type Audience } from "@/data/docs";
import { getLang, getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import styles from "./docs.module.css";

export const metadata = { title: "Documentation" };

const fold = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const AUDIENCES = Object.keys(AUDIENCE_LABEL) as Audience[];

/** The documentation's front door: every page as a card, a search across chapters, an audience filter. */
export default async function DocsIndex({ searchParams }: { searchParams: Promise<{ q?: string; pour?: string }> }) {
  const [t, lang, sp] = await Promise.all([getT(), getLang(), searchParams]);
  const q = fold(sp.q ?? "").trim();
  const pour = (AUDIENCES as string[]).includes(sp.pour ?? "") ? (sp.pour as Audience) : undefined;
  const pages = DOCS.filter((d) => !pour || d.audience.includes(pour));
  const words = q.split(/\s+/).filter(Boolean);
  const hits = q
    ? searchEntries(lang)
        .filter((e) => !pour || e.audience.includes(pour))
        .map((e) => {
          const hay = fold(`${e.title} ${e.text}`);
          const score = words.reduce((s, w) => s + (fold(e.title).includes(w) ? 5 : 0) + (hay.includes(w) ? 1 : 0), 0);
          return { e, score, hay };
        })
        .filter((x) => words.every((w) => x.hay.includes(w)))
        .sort((a, b) => b.score - a.score)
    : [];

  const snippet = (text: string): string => {
    const f = fold(text);
    const at = words.map((w) => f.indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
    const start = Math.max(0, at - 70);
    const s = text.slice(start, start + 200);
    return (start > 0 ? "…" : "") + s + (start + 200 < text.length ? "…" : "");
  };

  return (
    <>
      <DeskNav current="/desk/docs" />
      <div className={styles.head}>
        <div>
          <h1>{t("Documentation")}</h1>
          <p className="muted">{t("Comment l'application fonctionne, ce qu'elle coûte, comment on aide un client, comment on l'administre et comment on la maintient. En français et en anglais, en mots simples ; chaque page dit quand elle a été relue face à l'application.")}</p>
        </div>
        <Link className="btn sm" href="/desk/guide">
          {t("Guide des pages du desk")} →
        </Link>
      </div>

      <Suspense>
        <Toolbar placeholder={t("Un mot, une question, une page")} chipKey="pour" chips={[{ value: "", label: t("Tout") }, ...AUDIENCES.map((a) => ({ value: a, label: AUDIENCE_LABEL[a][lang], count: DOCS.filter((d) => d.audience.includes(a)).length }))]} />
      </Suspense>

      {q ? (
        <div className={styles.results}>
          {hits.length === 0 && <div className={styles.empty}>{t("Aucun chapitre ne contient ces mots.")}</div>}
          {hits.map(({ e }) => (
            <Link key={e.href} href={e.href} className={styles.result}>
              <small>{e.page}</small>
              <b>{e.title}</b>
              <span className={styles.snip}>{snippet(e.text)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.cards}>
          {pages.map((d) => (
            <Link key={d.slug} href={`/desk/docs/${d.slug}`} className={styles.card}>
              <h2>{d.title[lang]}</h2>
              <p>{d.summary[lang]}</p>
              <span className={styles.chapters}>{d.chapters.map((c) => c.title[lang]).join(" · ")}</span>
              <span className={styles.foot}>
                <span>
                  {d.audience.map((a) => (
                    <span key={a} className={`${styles.chip} ${styles[a] ?? ""}`} style={{ marginRight: 4 }}>
                      {AUDIENCE_LABEL[a][lang]}
                    </span>
                  ))}
                </span>
                <span>
                  {t("vérifié le")} {fmtDate(d.checkedOn)}
                </span>
              </span>
            </Link>
          ))}
          <Link href="/desk/guide" className={styles.card}>
            <h2>{t("Guide des pages du desk")}</h2>
            <p>{t("Chaque page du desk, champ par champ, avec une capture d'écran et la visite guidée en treize étapes.")}</p>
            <span className={styles.foot}>
              <span className={`${styles.chip}`}>{AUDIENCE_LABEL.desk[lang]}</span>
            </span>
          </Link>
        </div>
      )}
    </>
  );
}
