import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import type { IntakeItem } from "@/lib/domain/types";
import { extractionAvailable } from "@/lib/intake/extract";
import { fmtDateTime } from "@/lib/format";
import { NewSourceForm } from "./NewSourceForm";
import { ValidateForm } from "./ValidateForm";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "À valider" };

const SOURCE_LABEL: Record<IntakeItem["source"], string> = { mail: "E-mail", pdf: "PDF", photo: "Photo", texte: "Texte" };
const STATE_LABEL: Record<IntakeItem["state"], [string, string]> = {
  a_valider: ["new", "À valider"],
  en_revue: ["review", "En revue"],
  publie: ["ok", "Publié"],
  bloque: ["blocked", "À compléter"],
  rejete: ["off", "Rejeté"],
};

export default async function IntakePage({ searchParams }: { searchParams: Promise<{ item?: string; nouveau?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const queue = await r.listIntake();
  const todo = queue.filter((q) => q.state === "a_valider" || q.state === "en_revue" || q.state === "bloque");
  const selectedId = sp.item ?? todo[0]?.id;
  const selected = selectedId ? queue.find((q) => q.id === selectedId) : undefined;
  const offer = selected?.offerId ? await r.getOffer(selected.offerId) : undefined;
  const showNew = sp.nouveau === "1" || (!selected && queue.length === 0);

  return (
    <>
      <DeskNav current="/desk/a-valider" badges={{ "/desk/a-valider": todo.length }} />

      <div className={styles.intake}>
        <aside className={styles.queue} aria-label={t("File d'entrée")}>
          <Link href="/desk/a-valider?nouveau=1" className={`btn ${styles.newBtn}`}>
            {t("+ Nouvelle source")}
          </Link>
          {!extractionAvailable() && <div className={styles.noApi}>{t("Extraction automatique désactivée : ajoutez ANTHROPIC_API_KEY dans .env.local. Les champs se remplissent à la main.")}</div>}
          {queue.map((q) => {
            const [cls, label0] = STATE_LABEL[q.state];
            const label = t(label0);
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
          {showNew ? <NewSourceForm extraction={extractionAvailable()} /> : selected ? <ValidateForm item={selected} offer={offer} /> : <div className="empty">{t("Sélectionnez une source ou déposez-en une nouvelle.")}</div>}
        </div>
      </div>
    </>
  );
}
