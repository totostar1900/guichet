import Link from "next/link";
import { repo } from "@/lib/data";
import type { IntakeItem } from "@/lib/domain/types";
import { extractionAvailable } from "@/lib/intake/extract";
import { fmtDateTime } from "@/lib/format";
import { NewSourceForm } from "./NewSourceForm";
import { ValidateForm } from "./ValidateForm";
import deskStyles from "../page.module.css";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "À valider" };

const SOURCE_LABEL: Record<IntakeItem["source"], string> = { mail: "E-mail", pdf: "PDF", photo: "Photo", texte: "Texte" };
const STATE_LABEL: Record<IntakeItem["state"], [string, string]> = {
  a_valider: ["new", "À valider"],
  publie: ["ok", "Publié"],
  bloque: ["blocked", "À compléter"],
  rejete: ["off", "Rejeté"],
};

export default async function IntakePage({ searchParams }: { searchParams: Promise<{ item?: string; nouveau?: string }> }) {
  const sp = await searchParams;
  const r = repo();
  const queue = await r.listIntake();
  const todo = queue.filter((q) => q.state === "a_valider" || q.state === "bloque");
  const selectedId = sp.item ?? todo[0]?.id;
  const selected = selectedId ? queue.find((q) => q.id === selectedId) : undefined;
  const offer = selected?.offerId ? await r.getOffer(selected.offerId) : undefined;
  const showNew = sp.nouveau === "1" || (!selected && queue.length === 0);

  return (
    <>
      <nav className={deskStyles.sub} aria-label="Desk">
        <Link href="/desk">Carnet du jour</Link>
        <Link href="/desk/a-valider" aria-current="page">
          À valider {todo.length > 0 && <span className={styles.badge}>{todo.length}</span>}
        </Link>
        <Link href="/desk/documents">Documents</Link>
      </nav>

      <div className={styles.intake}>
        <aside className={styles.queue} aria-label="File d'entrée">
          <Link href="/desk/a-valider?nouveau=1" className={`btn primary ${styles.newBtn}`}>
            + Nouvelle source
          </Link>
          {!extractionAvailable() && <div className={styles.noApi}>Extraction automatique désactivée — ajoutez ANTHROPIC_API_KEY dans .env.local. Les champs se remplissent à la main.</div>}
          {queue.map((q) => {
            const [cls, label] = STATE_LABEL[q.state];
            return (
              <Link key={q.id} href={`/desk/a-valider?item=${q.id}`} className={styles.qitem} aria-current={q.id === selected?.id && !showNew ? "true" : undefined}>
                <div className={styles.meta}>
                  <span className={`${styles.src} ${styles[`src_${q.source}`]}`}>{SOURCE_LABEL[q.source]}</span>
                  <span className={`${styles.st} ${styles[`st_${cls}`]}`}>
                    {label}
                    {q.state === "publie" && q.publishedAt ? ` · ${fmtDateTime(q.publishedAt)}` : ""}
                  </span>
                </div>
                <b>{q.title}</b>
                <span className={styles.meta}>{q.fromLabel}</span>
              </Link>
            );
          })}
        </aside>

        <div className={styles.main}>
          {showNew ? <NewSourceForm extraction={extractionAvailable()} /> : selected ? <ValidateForm item={selected} offer={offer} /> : <div className="empty">Sélectionnez une source ou déposez-en une nouvelle.</div>}
        </div>
      </div>
    </>
  );
}
