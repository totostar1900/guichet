"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import { fmtDateTime } from "@/lib/format";
import styles from "./page.module.css";

/**
 * The client's documents, two ways: by operation (one group per intention,
 * headed by what it was about, its documents in the order they came) or by
 * date (newest first, each row reminding the operation it belongs to).
 * Documents of no operation (the file's pieces, the statements) form the
 * « Mon dossier » group. The choice stays on the device.
 */
export interface DocRow {
  id: string;
  number: string;
  label: string;
  createdAt: string;
  status: string;
  href: string;
  intentId?: string;
}
export interface DocOp {
  id: string;
  title: string; // the line
  about: string; // « prise ferme · 5 000 000 FCFA · réf. … »
  state: string;
  stateKey: string;
  href?: string;
}

const KEY = "guichet:docs:view";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(KEY, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(KEY, cb);
  };
};
const read = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

export function MyDocuments({ docs, ops }: { docs: DocRow[]; ops: DocOp[] }) {
  const t = useT();
  const stored = useSyncExternalStore(subscribe, read, () => "");
  const byOp = stored ? stored === "operation" : ops.length > 1;
  const pick = (v: "operation" | "date") => {
    try {
      localStorage.setItem(KEY, v);
      window.dispatchEvent(new Event(KEY));
    } catch {
      // storage unavailable: the choice lasts for this page
    }
  };
  const opOf = new Map(ops.map((o) => [o.id, o]));
  const sorted = [...docs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups = [...ops.map((o) => ({ op: o, rows: docs.filter((d) => d.intentId === o.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) })).filter((g) => g.rows.length > 0), { op: undefined, rows: docs.filter((d) => !d.intentId || !opOf.has(d.intentId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }].filter((g) => g.rows.length > 0);

  const row = (d: DocRow, remind: boolean) => {
    const op = d.intentId ? opOf.get(d.intentId) : undefined;
    return (
      <tr key={d.id}>
        <td className="mono">{d.number}</td>
        <td>
          {d.label}
          {remind && (
            <small className={styles.docFor}>
              {op ? (
                <>
                  {op.href ? <a href={op.href}>{op.title}</a> : op.title} · {op.about}
                </>
              ) : (
                t("Mon dossier")
              )}
            </small>
          )}
        </td>
        <td className="num">{fmtDateTime(d.createdAt)}</td>
        <td>{t(d.status === "signe" ? "Signé" : d.status === "envoye" ? "Envoyé" : "Disponible")}</td>
        <td>
          <a className="btn sm" href={d.href} target="_blank" rel="noreferrer">
            {t("Ouvrir le PDF")}
          </a>
        </td>
      </tr>
    );
  };
  // On the phone, a card per document: the label first, the number and the date under it, the state and the PDF at the right.
  const card = (d: DocRow, remind: boolean) => {
    const op = d.intentId ? opOf.get(d.intentId) : undefined;
    return (
      <div key={d.id} className={styles.docCard}>
        <div className={styles.docCardMain}>
          <b>{d.label}</b>
          <small>
            {d.number} · {fmtDateTime(d.createdAt)}
          </small>
          {remind && <small className={styles.docFor}>{op ? (op.href ? <a href={op.href}>{op.title}</a> : op.title) : t("Mon dossier")}{op ? ` · ${op.about}` : ""}</small>}
        </div>
        <div className={styles.docCardSide}>
          <span className={`st ${d.status === "signe" ? "reglee" : d.status === "envoye" ? "transmise" : "recue"}`}>{t(d.status === "signe" ? "Signé" : d.status === "envoye" ? "Envoyé" : "Disponible")}</span>
          <a className="btn sm" href={d.href} target="_blank" rel="noreferrer">
            PDF
          </a>
        </div>
      </div>
    );
  };
  const head = (
    <thead>
      <tr>
        <th>{t("N°")}</th>
        <th>{t("Document")}</th>
        <th>{t("Émis le")}</th>
        <th>{t("État")}</th>
        <th></th>
      </tr>
    </thead>
  );

  return (
    <div className="panel">
      <div className="panel-h">
        <h2>{t("Mes documents")}</h2>
        {docs.length > 0 && (
          <div className={styles.docToggle} role="group" aria-label={t("Présentation")}>
            <button type="button" className={byOp ? styles.docOn : ""} aria-pressed={byOp} onClick={() => pick("operation")}>
              {t("Par opération")}
            </button>
            <button type="button" className={!byOp ? styles.docOn : ""} aria-pressed={!byOp} onClick={() => pick("date")}>
              {t("Par date")}
            </button>
          </div>
        )}
      </div>
      {docs.length === 0 && <p className="muted">{t("Vos bulletins, appels de fonds et avis apparaîtront ici.")}</p>}
      {docs.length > 0 && !byOp && (
        <>
          <div className={styles.docCards}>{sorted.map((d) => card(d, true))}</div>
          <div className={`scroll-x ${styles.deskTable}`}>
            <table className="tbl">
              {head}
              <tbody>{sorted.map((d) => row(d, true))}</tbody>
            </table>
          </div>
        </>
      )}
      {docs.length > 0 &&
        byOp &&
        groups.map((g) => (
          <section key={g.op?.id ?? "file"} className={styles.docGroup}>
            <div className={styles.docGroupHead}>
              <span>
                <b>{g.op ? g.op.href ? <a href={g.op.href}>{g.op.title}</a> : g.op.title : t("Mon dossier")}</b>
                <small>{g.op ? g.op.about : t("pièces du dossier, relevés, attestations")}</small>
              </span>
              {g.op && <span className={`st ${g.op.stateKey}`}>{g.op.state}</span>}
            </div>
            <div className={styles.docCards}>{g.rows.map((d) => card(d, false))}</div>
            <div className={`scroll-x ${styles.deskTable}`}>
              <table className="tbl">
                {head}
                <tbody>{g.rows.map((d) => row(d, false))}</tbody>
              </table>
            </div>
          </section>
        ))}
    </div>
  );
}
