"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { fold } from "@/lib/text";
import { fmtDate } from "@/lib/format";
import { Origin, type DraftState } from "./Origin";
import styles from "./page.module.css";

export interface TermRow {
  isin: string;
  /** Exact date from a fiche ; for an « estimé » row, the bulletin's year as YYYY-12-31. */
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
  /** exact = an échéancier exists ; estime = quoted at the bulletin, no échéancier yet (the price runs on the bulletin's year). */
  state: "exact" | "estime";
  /** The ISIN is quoted at the bulletin (false : matured or delisted, the échéancier is kept). */
  atBulletin: boolean;
  /** The maturity date is behind us. */
  matured: boolean;
}

type SortKey = "isin" | "issuer" | "maturityOn" | "periodsPerYear" | "origin";
type OriginFilter = "" | "sans" | "defaut" | "desk" | "brouillon" | "hors";

const originRank = (r: TermRow) => (r.state === "estime" ? 0 : r.draft ? 1 : r.inDb ? 2 : r.atBulletin ? 3 : 4);

/**
 * The bond schedules as a table the desk can search and sort: by ISIN or
 * issuer typed in the box, by any column header, by origin (code default,
 * desk, draft). Above it, the listed bonds that still have no exact
 * schedule, each with « Créer » pre-filled: the answer to the Santé point.
 */
export function TermsTable({ rows, highlight, initialFilter }: { rows: TermRow[]; highlight?: string; initialFilter?: string }) {
  const tr = useT();
  const missing = rows.filter((r) => r.state === "estime");
  const [q, setQ] = useState("");
  const [typing, setTyping] = useState(false);
  const [origin, setOrigin] = useState<OriginFilter>(initialFilter === "sans-echeancier" ? "sans" : "");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "isin", dir: 1 });
  const list = useMemo(() => {
    const needle = fold(q.trim());
    const out = rows.filter((r) => {
      if (needle && !fold(`${r.isin} ${r.issuer ?? ""} ${r.title ?? ""} ${r.source}`).includes(needle)) return false;
      if (origin === "sans" && r.state !== "estime") return false;
      if (origin === "defaut" && (r.inDb || r.draft || r.state === "estime")) return false;
      if (origin === "desk" && !r.inDb) return false;
      if (origin === "brouillon" && !r.draft) return false;
      if (origin === "hors" && r.atBulletin) return false;
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
            {missing.length} {tr("obligation(s) cotée(s) sans échéancier exact")} : {tr("les lignes en orange ci-dessous")}.
          </b>
          <span>
            {tr("Leur prix se calcule sur la seule année du bulletin. À faire : ouvrir la fiche signalétique BVMAC (ou la note d'information) de la ligne, « Créer l'échéancier » sur la ligne, enregistrer, puis « Publier ».")}{" "}
            <button type="button" className={styles.linkBtn} onClick={() => setOrigin(origin === "sans" ? "" : "sans")}>
              {origin === "sans" ? tr("Tout le tableau") : tr("Ne voir que ces lignes")}
            </button>
          </span>
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
        <Select
          compact
          label={tr("Origine")}
          value={origin}
          onChange={(v) => setOrigin(v as OriginFilter)}
          options={[
            { value: "", label: tr("Toutes les origines") },
            { value: "sans", label: tr("Sans échéancier (à créer)") },
            { value: "defaut", label: tr("Valeur par défaut") },
            { value: "desk", label: tr("Modifiées ou créées par le desk") },
            { value: "brouillon", label: tr("Avec un brouillon") },
            { value: "hors", label: tr("Hors bulletin (échue ou retirée)") },
          ]}
        />
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
            <tr key={t.isin} className={`${t.isin === highlight ? styles.hl : ""} ${t.state === "estime" ? styles.estime : ""} ${!t.atBulletin || t.matured ? styles.quiet : ""}`} id={`ref-${t.isin}`}>
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
              <td>
                {t.state === "estime" ? (
                  <>
                    {t.maturityOn.slice(0, 4)}
                    <br />
                    <small className={styles.warnTag}>{tr("année du bulletin, estimée")}</small>
                  </>
                ) : (
                  <>
                    {fmtDate(t.maturityOn)}
                    {t.matured && (
                      <>
                        <br />
                        <small className="muted">{tr("échue")}</small>
                      </>
                    )}
                  </>
                )}
              </td>
              <td className="r num">{t.state === "estime" ? "—" : t.periodsPerYear}</td>
              <td>{t.state === "estime" ? "—" : t.graceUntil ? fmtDate(t.graceUntil) : "—"}</td>
              <td className={styles.wrap}>
                <small>{t.state === "estime" ? "—" : t.source}</small>
              </td>
              <td>
                {t.state === "estime" ? (
                  <span className={`${styles.tag} ${styles.tagWarn}`}>{tr("sans échéancier")}</span>
                ) : (
                  <span className={styles.origin}>
                    <Origin inDb={t.inDb} builtin={t.builtin} draft={t.draft} />
                    {!t.atBulletin && <span className={styles.tag}>{tr("hors bulletin")}</span>}
                  </span>
                )}
              </td>
              <td className="r">
                {t.state === "estime" ? (
                  <Link className={`btn sm ${styles.warnBtn}`} href={`/desk/referentiel?onglet=echeanciers&nouveau=${t.isin}#edit`}>
                    {tr("Créer l'échéancier")}
                  </Link>
                ) : (
                  <Link className="btn sm" href={`/desk/referentiel?onglet=echeanciers&cle=${t.isin}#edit`}>
                    {tr("Modifier")}
                  </Link>
                )}
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">
                {origin === "sans" ? tr("Toutes les obligations cotées ont leur échéancier exact.") : tr("Aucun échéancier ne correspond.")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
