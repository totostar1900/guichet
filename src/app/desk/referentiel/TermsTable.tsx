"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import { fold } from "@/lib/text";
import { fmtDate } from "@/lib/format";
import { Origin, type DraftState } from "./Origin";
import styles from "./page.module.css";

export interface TermRow {
  isin: string;
  maturityOn: string;
  periodsPerYear: number;
  graceUntil?: string;
  source: string;
  /** The listed line behind the ISIN, when the Guichet has one. */
  title?: string;
  issuer?: string;
  inDb: boolean;
  builtin: boolean;
  draft?: DraftState;
}

type SortKey = "isin" | "issuer" | "maturityOn" | "periodsPerYear" | "origin";
type OriginFilter = "" | "defaut" | "desk" | "brouillon";

const originRank = (r: TermRow) => (r.draft ? 0 : r.inDb ? 1 : 2);

/**
 * The bond schedules as a table the desk can search and sort: by ISIN or
 * issuer typed in the box, by any column header, by origin (code default,
 * desk, draft). Above it, the listed bonds that still have no exact
 * schedule, each with « Créer » pre-filled: the answer to the Santé point.
 */
export function TermsTable({ rows, missing, highlight }: { rows: TermRow[]; missing: { isin: string; title: string; issuer: string }[]; highlight?: string }) {
  const tr = useT();
  const [q, setQ] = useState("");
  const [typing, setTyping] = useState(false);
  const [origin, setOrigin] = useState<OriginFilter>("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "isin", dir: 1 });
  const list = useMemo(() => {
    const needle = fold(q.trim());
    const out = rows.filter((r) => {
      if (needle && !fold(`${r.isin} ${r.issuer ?? ""} ${r.title ?? ""} ${r.source}`).includes(needle)) return false;
      if (origin === "defaut" && (r.inDb || r.draft)) return false;
      if (origin === "desk" && !r.inDb) return false;
      if (origin === "brouillon" && !r.draft) return false;
      return true;
    });
    const cmp = (a: TermRow, b: TermRow) => {
      switch (sort.key) {
        case "issuer":
          return (a.issuer ?? "").localeCompare(b.issuer ?? "", "fr") || a.isin.localeCompare(b.isin);
        case "maturityOn":
          return a.maturityOn.localeCompare(b.maturityOn);
        case "periodsPerYear":
          return a.periodsPerYear - b.periodsPerYear || a.isin.localeCompare(b.isin);
        case "origin":
          return originRank(a) - originRank(b) || a.isin.localeCompare(b.isin);
        default:
          return a.isin.localeCompare(b.isin);
      }
    };
    return out.sort((a, b) => cmp(a, b) * sort.dir);
  }, [rows, q, origin, sort]);
  // What the typed letters match: issuers, lines, ISINs; a tap fills the box.
  const suggestions = useMemo(() => {
    const d = fold(q.trim());
    if (!typing || d.length < 2) return [];
    const seen = new Set<string>();
    const out: { kind: string; text: string }[] = [];
    const push = (kind: string, text?: string) => {
      if (!text || seen.has(text) || !fold(text).includes(d) || fold(text) === d) return;
      seen.add(text);
      out.push({ kind, text });
    };
    for (const r of rows) push(tr("Émetteur"), r.issuer);
    for (const r of rows) push(tr("Ligne"), r.title);
    for (const r of rows) push("ISIN", r.isin);
    return out.slice(0, 8);
  }, [rows, q, typing, tr]);
  const th = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
      <button type="button" className={styles.sortBtn} onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : 1 }))}>
        {label}
        <span aria-hidden>{sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</span>
      </button>
    </th>
  );
  return (
    <>
      {missing.length > 0 && (
        <div className={styles.missing} id="sans-echeancier">
          <b>
            {missing.length} {tr("obligation(s) cotée(s) sans échéancier exact")}.
          </b>
          <span>{tr("Ces lignes sont au bulletin mais absentes du tableau ci-dessous : leur prix se calcule sur la seule année d'échéance du bulletin. À faire : ouvrir la fiche signalétique BVMAC (ou la note d'information) de la ligne, « Créer » avec la date exacte d'échéance, les paiements par an et le différé, enregistrer, puis « Publier ».")}</span>
          <ul>
            {missing.map((m) => (
              <li key={m.isin}>
                <span className="mono">{m.isin}</span>
                <span>{fold(m.title).startsWith(fold(m.issuer)) ? m.title : `${m.issuer} · ${m.title}`}</span>
                <Link className="btn sm" href={`/desk/referentiel?onglet=echeanciers&nouveau=${m.isin}#edit`}>
                  {tr("Créer l'échéancier")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={styles.toolbar}>
        <span className={styles.searchWrap}>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setTyping(true);
            }}
            onBlur={() => window.setTimeout(() => setTyping(false), 150)}
            onFocus={() => setTyping(true)}
            placeholder={tr("ISIN, émetteur, ligne, source…")}
            aria-label={tr("Filtrer les échéanciers")}
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className={styles.suggest} role="listbox">
              {suggestions.map((sug) => (
                <li key={sug.text}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQ(sug.text);
                      setTyping(false);
                    }}
                  >
                    <em>{sug.kind}</em>
                    <b>{sug.text}</b>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </span>
        <select value={origin} onChange={(e) => setOrigin(e.target.value as OriginFilter)} aria-label={tr("Origine")}>
          <option value="">{tr("Toutes les origines")}</option>
          <option value="defaut">{tr("Valeur par défaut")}</option>
          <option value="desk">{tr("Modifiées ou créées par le desk")}</option>
          <option value="brouillon">{tr("Avec un brouillon")}</option>
        </select>
        <small className="muted">
          {list.length} / {rows.length}
        </small>
      </div>
      <table className={`tbl ${styles.tbl}`}>
        <thead>
          <tr>
            {th("isin", tr("ISIN"))}
            {th("issuer", tr("Émetteur · ligne"))}
            {th("maturityOn", tr("Échéance"))}
            {th("periodsPerYear", tr("Paiements / an"))}
            <th>{tr("Différé jusqu'au")}</th>
            <th>{tr("Source")}</th>
            {th("origin", tr("Origine"))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => (
            <tr key={t.isin} className={t.isin === highlight ? styles.hl : undefined} id={`ref-${t.isin}`}>
              <td className="mono">{t.isin}</td>
              <td className={styles.wrap}>
                {t.issuer ?? <span className="muted">—</span>}
                {t.title && (
                  <>
                    <br />
                    <small className="muted">{t.title}</small>
                  </>
                )}
              </td>
              <td>{fmtDate(t.maturityOn)}</td>
              <td className="r num">{t.periodsPerYear}</td>
              <td>{t.graceUntil ? fmtDate(t.graceUntil) : "—"}</td>
              <td className={styles.wrap}>
                <small>{t.source}</small>
              </td>
              <td>
                <Origin inDb={t.inDb} builtin={t.builtin} draft={t.draft} />
              </td>
              <td className="r">
                <Link className="btn sm" href={`/desk/referentiel?onglet=echeanciers&cle=${t.isin}#edit`}>
                  {tr("Modifier")}
                </Link>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">
                {tr("Aucun échéancier ne correspond.")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
