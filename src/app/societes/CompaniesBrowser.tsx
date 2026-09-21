"use client";

import { fold } from "@/lib/text";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Info } from "@/components/Info";
import { Select } from "@/components/ui/Select";
import { FilterLine } from "@/components/FilterLine";
import { Sheet } from "@/components/mobile/Sheet";
import { useT } from "@/i18n/client";
import { fmt, fmtPct, fmtUnits } from "@/lib/format";
import styles from "./page.module.css";

/** One listed company as the table needs it : flat, computed on the server. */
export interface CompanyRow {
  mnemo: string;
  shortName: string;
  country: string;
  countryCode: string;
  activity: string;
  sector: string;
  close?: number;
  variationPct?: number | null;
  ytdPct?: number | null;
  marketCap?: number;
  per?: number;
  dividendYieldPct?: number;
  lastDividend?: number | null; // null = no dividend distributed
  dividendYear?: string | number;
}

type SortKey = "cap" | "name" | "price" | "day" | "ytd" | "per" | "yield" | "dividend";
const SORT: [SortKey, string][] = [
  ["cap", "capitalisation"],
  ["yield", "rendement du dividende"],
  ["per", "PER"],
  ["ytd", "depuis le 1er janvier"],
  ["day", "variation du jour"],
  ["price", "cours"],
  ["dividend", "dernier dividende"],
  ["name", "nom"],
];
const num = (v?: number | null) => (v == null ? -Infinity : v);

export function CompaniesBrowser({ rows }: { rows: CompanyRow[] }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [sort, setSort] = useState<SortKey>("cap");
  const [desc, setDesc] = useState(true);
  const countries = useMemo(() => [...new Set(rows.map((r) => r.country))].sort((a, b) => a.localeCompare(b, "fr")), [rows]);
  const sectors = useMemo(() => [...new Set(rows.map((r) => r.sector))].sort((a, b) => a.localeCompare(b, "fr")), [rows]);
  const signed = (v?: number | null, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
  const cls = (v?: number | null) => (v == null || v === 0 ? "" : v > 0 ? styles.up : styles.down);

  const list = useMemo(() => {
    const ql = fold(q.trim());
    const out = rows.filter((r) => (!country || r.country === country) && (!sector || r.sector === sector) && (!ql || fold(`${r.shortName} ${r.mnemo} ${r.activity} ${r.sector}`).includes(ql)));
    const cmp = (a: CompanyRow, b: CompanyRow) => {
      switch (sort) {
        case "name":
          return a.shortName.localeCompare(b.shortName, "fr");
        case "price":
          return num(a.close) - num(b.close);
        case "day":
          return num(a.variationPct) - num(b.variationPct);
        case "ytd":
          return num(a.ytdPct) - num(b.ytdPct);
        case "per":
          return num(a.per) - num(b.per);
        case "yield":
          return num(a.dividendYieldPct) - num(b.dividendYieldPct);
        case "dividend":
          return num(a.lastDividend) - num(b.lastDividend);
        default:
          return num(a.marketCap) - num(b.marketCap);
      }
    };
    const dir = sort === "name" ? (desc ? -1 : 1) : desc ? -1 : 1;
    return [...out].sort((a, b) => dir * cmp(a, b));
  }, [rows, q, country, sector, sort, desc]);
  const active = Number(Boolean(country)) + Number(Boolean(sector));

  const th = (k: SortKey, label: string, term?: Parameters<typeof Info>[0]["term"], hide?: boolean) => {
    const on = sort === k;
    return (
      <th key={k} className={`${k === "name" ? "" : styles.r} ${hide ? styles.hideSm : ""} ${on ? styles.sorted : ""}`} aria-sort={on ? (desc ? "descending" : "ascending") : "none"}>
        <button type="button" className={styles.thBtn} onClick={() => (on ? setDesc(!desc) : (setSort(k), setDesc(k !== "name")))}>
          {label}
          <span aria-hidden="true">{on ? (desc ? " ↓" : " ↑") : ""}</span>
        </button>
        {term && <Info term={term} />}
      </th>
    );
  };

  const [sheet, setSheet] = useState(false);
  // The controls, once: in the page on a desk, in a sheet on the phone.
  const toolbar = (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <input type="search" placeholder={t("Une société, un mnémo, un secteur")} aria-label={t("Rechercher")} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className={styles.chips} role="group" aria-label={t("Pays")}>
        <button type="button" className={`${styles.chip} ${country === "" ? styles.chipOn : ""}`} onClick={() => setCountry("")}>
          {t("Tous")}
        </button>
        {countries.map((c) => (
          <button key={c} type="button" className={`${styles.chip} ${country === c ? styles.chipOn : ""}`} aria-pressed={country === c} onClick={() => setCountry(country === c ? "" : c)}>
            {t(c)}
          </button>
        ))}
      </div>
      <Select value={sector} onChange={setSector} label={t("Secteur")} options={[{ value: "", label: t("tous") }, ...sectors.map((s) => ({ value: s, label: t(s) }))]} />
      <label className={styles.sort}>
        {t("Tri")}
        <Select compact value={sort} onChange={(v) => setSort(v as SortKey)} options={SORT.map(([k, l]) => ({ value: k, label: t(l) }))} />
        <button type="button" className={styles.dir} onClick={() => setDesc(!desc)} aria-label={t(desc ? "Ordre décroissant" : "Ordre croissant")} title={t("Inverser l'ordre")}>
          {desc ? "↓" : "↑"}
        </button>
      </label>
      {(active > 0 || q) && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => {
            setQ("");
            setCountry("");
            setSector("");
          }}
        >
          {t("Effacer")}
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className={styles.deskTools}>{toolbar}</div>
      <FilterLine count={active + Number(Boolean(q))} summary={[q && `« ${q} »`, country && t(country), sector && t(sector)].filter(Boolean).join(" · ")} sortLabel={t(SORT.find(([k]) => k === sort)?.[1] ?? "")} onOpen={() => setSheet(true)} />
      <Sheet open={sheet} onClose={() => setSheet(false)} title={t("Filtrer et trier")}>
        <div className={styles.sheetTools}>{toolbar}</div>
        <div className={styles.sheetFoot}>
          <span>
            <b>{list.length}</b> {t(list.length > 1 ? "sociétés" : "société")}
          </span>
          <button type="button" className="btn sm primary" onClick={() => setSheet(false)}>
            {t("Voir")}
          </button>
        </div>
      </Sheet>
      <div className={styles.count}>
        <b>{list.length}</b> {t(list.length > 1 ? "sociétés" : "société")}
        {active > 0 || q ? ` ${t("correspondant aux filtres")}` : ""}
      </div>

      <div className={styles.panel}>
        <div className="scroll-x">
          <table className={styles.tbl}>
            <thead>
              <tr>
                {th("name", t("Société"))}
                {th("price", t("Cours"), "cours")}
                {th("day", t("Var. jour"), undefined, true)}
                {th("ytd", t("Depuis le 1er janv."), "ytd")}
                {th("cap", t("Capitalisation"), "capitalisation")}
                {th("per", "PER", "per")}
                {th("yield", t("Rendement"), "rendement_dividende")}
                {th("dividend", t("Dernier dividende"), "dividende", true)}
                <th className={styles.hideSm}>{t("Secteur")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.mnemo}>
                  <td className={styles.name}>
                    <Link href={`/societes/${c.mnemo.toLowerCase()}`}>
                      <span className="cc" title={t(c.country)}>
                        {c.countryCode}
                      </span>{" "}
                      {c.shortName} <span className="muted">· {c.mnemo}</span>
                    </Link>
                    <small>{t(c.activity).split(".")[0]}.</small>
                  </td>
                  <td className={styles.r}>
                    <b>{c.close != null ? fmt(c.close) : "—"}</b>
                  </td>
                  <td className={`${styles.r} ${styles.hideSm} ${cls(c.variationPct)}`}>{signed(c.variationPct)}</td>
                  <td className={`${styles.r} ${cls(c.ytdPct)}`}>{c.ytdPct != null ? signed(c.ytdPct) : "—"}</td>
                  <td className={styles.r}>{c.marketCap != null ? fmtUnits(c.marketCap) : "—"}</td>
                  <td className={styles.r}>{c.per != null ? `${c.per.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ×` : "—"}</td>
                  <td className={styles.r}>{c.dividendYieldPct != null ? fmtPct(c.dividendYieldPct, 1) : "—"}</td>
                  <td className={`${styles.r} ${styles.hideSm}`}>
                    {c.lastDividend != null ? `${fmt(c.lastDividend)} FCFA` : c.lastDividend === null ? t("non distribué") : "—"}
                    {c.lastDividend != null && c.dividendYear ? <small className="muted"> ({c.dividendYear})</small> : null}
                  </td>
                  <td className={styles.hideSm}>{t(c.sector)}</td>
                  <td className={styles.r}>
                    <Link className="btn sm" href={`/societes/${c.mnemo.toLowerCase()}`}>
                      {t("Analyse")}
                    </Link>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={10} className="muted">
                    {t("Aucune société ne correspond à ces filtres.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
