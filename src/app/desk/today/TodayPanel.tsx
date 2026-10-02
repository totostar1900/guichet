import Link from "next/link";
import { getT } from "@/i18n/server";
import { IngestForm, UploadForm } from "../marche/Forms";
import styles from "./TodayPanel.module.css";

/**
 * « Aujourd'hui », at the top of the carnet: the day's few things, each a
 * colour, a figure and a verb. Green all along means nothing to do. The
 * bulletin tile carries the two rescue tools (fetch a session again, drop
 * the PDF received by e-mail), so a failed evening run is repaired here.
 */
export type Tone = "ok" | "warn" | "crit" | "quiet";

export interface Tile {
  key: string;
  label: string;
  value: string;
  detail?: string;
  tone: Tone;
  href?: string;
  action?: string;
}

export async function TodayPanel({ tiles, bulletin, today }: { tiles: Tile[]; bulletin: { expected: boolean; missing: boolean; failed: boolean }; today: string }) {
  const t = await getT();
  const showTools = bulletin.missing || bulletin.failed;
  return (
    <section className={`panel ${styles.panel}`} data-coach="today">
      <div className="panel-h">
        <h2>{t("Aujourd'hui")}</h2>
        <span className="muted">{t("Ce qui attend, et rien d'autre : tout en vert, la journée est à jour.")}</span>
      </div>
      <div className={styles.tiles}>
        {tiles.map((x) => {
          const inner = (
            <>
              <span className={styles.dot} data-tone={x.tone} aria-hidden="true" />
              <span className={styles.label}>{x.label}</span>
              <b className={styles.value}>{x.value}</b>
              {x.detail && <small className={styles.detail}>{x.detail}</small>}
              {x.action && <em className={styles.action}>{x.action} →</em>}
            </>
          );
          return x.href ? (
            <Link key={x.key} href={x.href} className={styles.tile} data-tone={x.tone}>
              {inner}
            </Link>
          ) : (
            <div key={x.key} className={styles.tile} data-tone={x.tone}>
              {inner}
            </div>
          );
        })}
      </div>
      {showTools && (
        <div className={styles.tools}>
          <div>
            <span>{t(bulletin.failed ? "Relancer la lecture de la séance" : "Aller chercher le bulletin de la séance")}</span>
            <IngestForm defaultDate={today} />
          </div>
          <div>
            <span>{t("Ou déposer le PDF reçu par e-mail")}</span>
            <UploadForm />
          </div>
        </div>
      )}
    </section>
  );
}
