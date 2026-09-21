import Link from "next/link";
import type { DocBlock, DocChapter } from "@/data/docs/types";
import styles from "@/app/desk/docs/docs.module.css";
import { DocDiagram } from "./DocDiagrams";

/** Renders a documentation page's chapters in one language : the same on the desk and on the client help page. */
export function DocBlocks({ chapters, lang }: { chapters: DocChapter[]; lang: "fr" | "en" }) {
  const L = (x: { fr: string; en: string }) => x[lang];
  return (
    <>
      {chapters.map((c) => (
        <section key={c.id} data-coach={c.id === "contact" ? "aide-contact" : c.id === "entretien" ? "aide-entretien" : undefined}>
          <h2 id={c.id}>{L(c.title)}</h2>
          <DocBlockList blocks={c.blocks} lang={lang} />
        </section>
      ))}
    </>
  );
}

/** The blocks alone, for a page that draws its own chapter frames (the client help). */
export function DocBlockList({ blocks, lang }: { blocks: DocBlock[]; lang: "fr" | "en" }) {
  const L = (x: { fr: string; en: string }) => x[lang];
  const block = (b: DocBlock, k: number) => {
    switch (b.type) {
      case "lead":
        return (
          <p key={k} className={styles.lead}>
            {L(b.text)}
          </p>
        );
      case "p":
        return <p key={k}>{L(b.text)}</p>;
      case "list":
        return (
          <ul key={k}>
            {b.items.map((x, j) => (
              <li key={j}>{L(x)}</li>
            ))}
          </ul>
        );
      case "steps":
        return (
          <ol key={k}>
            {b.items.map((x, j) => (
              <li key={j}>{L(x)}</li>
            ))}
          </ol>
        );
      case "flow":
        return (
          <ol key={k} className={styles.flow}>
            {b.steps.map((x, j) => (
              <li key={j}>{L(x)}</li>
            ))}
          </ol>
        );
      case "table":
        return (
          <div key={k} className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  {b.head.map((h, j) => (
                    <th key={j}>{L(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, j) => (
                  <tr key={j}>
                    {r.map((c, m) => (
                      <td key={m}>{L(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "note":
        return (
          <div key={k} className={`${styles.note} ${styles[b.kind] ?? ""}`}>
            {L(b.text)}
          </div>
        );
      case "link":
        return (
          <Link key={k} href={b.href} className={styles.link}>
            {L(b.label)} →{b.hint && <small>{L(b.hint)}</small>}
          </Link>
        );
      case "diagram":
        return (
          <figure key={k} className={styles.figure}>
            <DocDiagram kind={b.kind} lang={lang} />
            <figcaption>{L(b.caption)}</figcaption>
          </figure>
        );
    }
  };
  return <>{blocks.map(block)}</>;
}
