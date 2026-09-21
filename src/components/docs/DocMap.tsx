"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { ACTOR_LABEL, FLOWS, type FlowDoc } from "@/data/flows";
import type { DocumentType } from "@/lib/domain/types";
import { DOC_KIND, DOC_KIND_LABEL, DOC_KIND_RULE, DOC_LABEL, DOC_ORDER, DOC_ROLES, DOC_WHEN, MOMENTS, MOMENT_LABEL, type DocumentKind } from "@/lib/documents/registry";
import { PASSAGES } from "@/lib/documents/passages-catalog";
import { Sheet } from "@/components/mobile/Sheet";
import styles from "./DocMap.module.css";

/** Live figures the page may hand the map: documents issued per type, template versions waiting. */
export interface DocStats {
  issued?: Partial<Record<DocumentType, number>>;
  pending?: Partial<Record<DocumentType, number>>;
}

const KINDS: DocumentKind[] = ["signe", "envoye", "interne"];

/** The sheet that opens on a document: who prepares, signs, receives, when, the rule, and where to go. */
function DocSheet({ type, stats, onClose }: { type: DocumentType | null; stats?: DocStats; onClose: () => void }) {
  const t = useT();
  const r = type ? DOC_ROLES[type] : undefined;
  const kind = type ? DOC_KIND[type] : "signe";
  const passages = type ? (PASSAGES[type] ?? []).length : 0;
  const pending = type ? (stats?.pending?.[type] ?? 0) : 0;
  const issued = type ? stats?.issued?.[type] : undefined;
  return (
    <Sheet open={Boolean(type)} onClose={onClose} title={type ? t(DOC_LABEL[type]) : ""} sub={type ? `${t(DOC_KIND_LABEL[kind])} · ${t(MOMENT_LABEL[r!.moment])}` : undefined} wide>
      {type && r && (
        <div className={styles.sheet}>
          <dl className={styles.roles}>
            <dt>{t("Qui prépare")}</dt>
            <dd>{t(r.prepares)}</dd>
            <dt>{t("Qui signe")}</dt>
            <dd>{t(r.signs)}</dd>
            <dt>{t("Qui reçoit")}</dt>
            <dd>{t(r.receives)}</dd>
            <dt>{t("Quand")}</dt>
            <dd>{t(DOC_WHEN[type])}</dd>
            {r.clock && (
              <>
                <dt>{t("L'horloge")}</dt>
                <dd>{t(r.clock)}</dd>
              </>
            )}
            <dt>{t("Règle du texte")}</dt>
            <dd>
              {t(DOC_KIND_RULE[kind])}
              {passages ? ` · ${passages} ${t("passage(s) modifiable(s)")}` : ` · ${t("mise en page seulement")}`}
              {pending ? ` · ${pending} ${t("version(s) en attente")}` : ""}
            </dd>
            {issued != null && (
              <>
                <dt>{t("Émis")}</dt>
                <dd>{issued} {t("document(s) dans Documents")}</dd>
              </>
            )}
          </dl>
          <div className={styles.links}>
            <Link className="btn sm primary" href={r.born.href} onClick={onClose}>
              {t("Où il naît")} · {t(r.born.label)}
            </Link>
            <Link className="btn sm" href={r.find.href} onClick={onClose}>
              {t("Où le trouver")} · {t(r.find.label)}
            </Link>
            <Link className="btn sm" href={`/desk/referentiel/modeles?type=${type}`} onClick={onClose}>
              {t("Le modèle")} · {t("registre, texte et versions")}
            </Link>
            {kind === "interne" && (
              <Link className="btn sm ghost" href="/desk/depot" onClick={onClose}>
                {t("Le Dépôt")}
              </Link>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

/**
 * The map of the documents: three kinds as rows, the six moments as
 * columns, every tile opening the sheet. With `stats`, the tiles carry the
 * issued count (the Dépôt's hub); without, the map explains (the
 * documentation).
 */
export function DocMap({ stats }: { stats?: DocStats }) {
  const t = useT();
  const [open, setOpen] = useState<DocumentType | null>(null);
  return (
    <div className={styles.map}>
      <div className={styles.grid} role="table" aria-label={t("La carte des documents")}>
        <div className={styles.corner} role="columnheader" />
        {MOMENTS.map((m) => (
          <div key={m} className={styles.colHead} role="columnheader">
            {t(MOMENT_LABEL[m])}
          </div>
        ))}
        {KINDS.map((kind) => (
          <div key={kind} className={styles.row} role="row">
            <div className={`${styles.lane} ${styles[kind]}`} role="rowheader">
              <b>{t(DOC_KIND_LABEL[kind])}</b>
              <small>{t(DOC_KIND_RULE[kind]).split(" : ")[0]}</small>
            </div>
            {MOMENTS.map((m) => (
              <div key={m} className={styles.cell} role="cell">
                {DOC_ORDER.filter((d) => DOC_KIND[d] === kind && DOC_ROLES[d].moment === m).map((d) => (
                  <button key={d} type="button" className={`${styles.tile} ${styles[kind]}`} onClick={() => setOpen(d)} aria-haspopup="dialog">
                    <span>{t(DOC_LABEL[d])}</span>
                    {DOC_ROLES[d].isNew && <em className={styles.new}>{t("nouveau")}</em>}
                    {stats?.issued && <small>{stats.issued[d] ?? 0}</small>}
                    {stats?.pending?.[d] ? <i className={styles.pend} title={t("versions en attente")} /> : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className={styles.legend}>
        <i className={`${styles.dot} ${styles.signe}`} /> {t("signé par le client")} <i className={`${styles.dot} ${styles.envoye}`} /> {t("envoyé au client")} <i className={`${styles.dot} ${styles.interne}`} /> {t("transmis aux contreparties")} · {t("toucher un document : qui le prépare, qui le signe, où il naît")}
      </p>
      <DocSheet type={open} stats={stats} onClose={() => setOpen(null)} />
    </div>
  );
}

/** The six operations as tabs; each a row of steps coloured by who acts, the documents born at each step opening the same sheet. */
export function DocFlows() {
  const t = useT();
  const [tab, setTab] = useState(FLOWS[0].key);
  const [open, setOpen] = useState<DocumentType | null>(null);
  const flow = FLOWS.find((f) => f.key === tab) ?? FLOWS[0];
  const docLabel = (d: FlowDoc) => (d.variant ? t(d.variant) : t(DOC_LABEL[d.type]));
  return (
    <div className={styles.flows}>
      <div className={styles.tabs} role="tablist">
        {FLOWS.map((f) => (
          <button key={f.key} type="button" role="tab" aria-selected={f.key === tab} onClick={() => setTab(f.key)}>
            {t(f.title)}
          </button>
        ))}
      </div>
      <p className={styles.intro}>{t(flow.intro)}</p>
      <ol className={styles.steps}>
        {flow.steps.map((s, i) => (
          <li key={i} className={`${styles.step} ${styles[`a_${s.actor}`]}`}>
            <span className={styles.who}>{t(s.who)}</span>
            <b>{t(s.title)}</b>
            {s.state && <code className={styles.state}>{t(s.state)}</code>}
            {s.clock && <small className={styles.clock}>⏱ {t(s.clock)}</small>}
            {s.docs.map((d) => (
              <button key={d.type + (d.variant ?? "")} type="button" className={`${styles.docline} ${styles[DOC_KIND[d.type]]}`} onClick={() => setOpen(d.type)} aria-haspopup="dialog">
                <b>{docLabel(d)}</b>
                <span>
                  {t(DOC_ROLES[d.type].prepares)} · {t("signe")} : {t(DOC_ROLES[d.type].signs)}
                </span>
              </button>
            ))}
            {s.received && <span className={`${styles.docline} ${styles.interne} ${styles.received}`}>{t(s.received)}</span>}
          </li>
        ))}
      </ol>
      <p className={styles.legend}>
        <i className={`${styles.bar} ${styles.a_client}`} /> {t(ACTOR_LABEL.client)} {t("agit ou signe")} <i className={`${styles.bar} ${styles.a_desk}`} /> {t(ACTOR_LABEL.desk)} {t("agit")} <i className={`${styles.bar} ${styles.a_tiers}`} /> {t("contrepartie : SVT, société de bourse, société de gestion, dépositaire, émetteur")}
      </p>
      <DocSheet type={open} onClose={() => setOpen(null)} />
    </div>
  );
}
