"use client";

import { useDeskBase } from "@/components/DeskView";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Info } from "@/components/Info";
import { Dropdown } from "@/components/market/Dropdown";
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
  const base = useDeskBase();
  const t = useT();
  const [sort, setSort] = useState<SortKey>("cap");
  const [desc, setDesc] = useState(true);
  const signed = (v?: number | null, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
  const cls = (v?: number | null) => (v == null || v === 0 ? "" : v > 0 ? styles.up : styles.down);

  const list = useMemo(() => {
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
    const dir = desc ? -1 : 1;
    return [...rows].sort((a, b) => dir * cmp(a, b));
  }, [rows, sort, desc]);

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

  return (
    <>
      {/* FILTRER ET TRIER FAISAIENT LA MÊME CHOSE. Une recherche, un pays, un
          secteur et un tri, pour sept sociétés qui tiennent toutes à l'écran :
          un filtre sert à retirer ce qu'on ne veut pas voir quand il y en a
          trop. Reste le tri, posé à plat comme sur les fonds et les titres. */}
      <div className={styles.outils}>
        <Dropdown label="Tri" single effacable={false} items={SORT} selected={new Set([sort])} onChange={(x) => setSort((([...x][0] as SortKey) ?? "cap") as SortKey)} />
        <button type="button" className={styles.dirBtn} onClick={() => setDesc(!desc)} aria-label={t(desc ? "Ordre décroissant" : "Ordre croissant")} title={t("Inverser l'ordre")}>
          {desc ? "↓" : "↑"}
        </button>
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
                    <Link href={`${base}/societes/${c.mnemo.toLowerCase()}`}>
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
                    <Link className="btn sm" href={`${base}/societes/${c.mnemo.toLowerCase()}`}>
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
