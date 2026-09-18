"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Info } from "@/components/Info";
import { rememberList, useListScroll } from "@/components/ListNav";
import { Select } from "@/components/ui/Select";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL, type FundNav } from "@/lib/domain/market";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import styles from "./page.module.css";
import { useT } from "@/i18n/client";

/** One fund as the browser needs it — flat, serialisable, computed on the server. */
export interface FundRow {
  id: string;
  title: string;
  category: FundNav["category"];
  frequency: FundNav["frequency"];
  manager: string;
  depositary: string;
  nav: number;
  navDate: string;
  variationPct?: number;
  perf1yPct?: number;
  perfSinceInceptionPct: number;
  inceptionDate?: string;
  open: boolean; // open to subscription (the desk can close one)
  featured?: string; // the desk's reason when the fund is « À la une »
}

type SortKey = "categorie" | "nom" | "vl" | "var" | "an" | "origine" | "date";
const SORT: [SortKey, string][] = [
  ["categorie", "par catégorie"],
  ["an", "12 mois"],
  ["var", "variation"],
  ["origine", "depuis l'origine"],
  ["vl", "valeur liquidative"],
  ["date", "VL la plus récente"],
  ["nom", "nom"],
];
const CATS: FundNav["category"][] = ["M", "O", "D", "A", "?"];
const BLURB: Record<FundNav["category"], string> = {
  M: "Placement de trésorerie : titres courts, valeur liquidative très régulière, argent disponible sous quelques jours.",
  O: "Investis en obligations d'États et d'entreprises de la zone ; rendement porté par les coupons, sensibilité aux taux.",
  D: "Un panachage d'obligations, d'actions et de trésorerie, arbitré par la société de gestion.",
  A: "Exposés aux actions cotées à la BVMAC et à la région : le potentiel et la volatilité les plus élevés.",
  "?": "Catégorie non précisée au bulletin.",
};

const signed = (v?: number) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, 2)}`);
const cls = (v?: number) => (v == null || v === 0 ? "" : v > 0 ? styles.up : styles.down);
const num = (v?: number) => (v == null ? -Infinity : v);

export function FundsBrowser({ rows }: { rows: FundRow[] }) {
  const t = useT();
  // The filters and sort live in the URL, so the list comes back exactly as it was left (and the link can be shared).
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const cat = (sp.get("cat") ?? "") as FundNav["category"] | "";
  const manager = sp.get("gestion") ?? "";
  const freq = (sp.get("vl") ?? "") as FundNav["frequency"] | "";
  const sort = (SORT.some(([k]) => k === sp.get("tri")) ? sp.get("tri") : "categorie") as SortKey;
  const desc = sp.get("sens") !== "asc";
  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };
  const setQ = (v: string) => update({ q: v || undefined });
  const setCat = (v: FundNav["category"] | "") => update({ cat: v || undefined });
  const setManager = (v: string) => update({ gestion: v || undefined });
  const setFreq = (v: FundNav["frequency"] | "") => update({ vl: v || undefined });
  const setSort = (v: SortKey) => update({ tri: v === "categorie" ? undefined : v });
  const setDesc = (v: boolean) => update({ sens: v ? undefined : "asc" });

  const managers = useMemo(() => [...new Set(rows.map((r) => r.manager))].sort((a, b) => a.localeCompare(b, "fr")), [rows]);
  const freqs = useMemo(() => [...new Set(rows.map((r) => r.frequency))].filter((f) => f !== "?"), [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = rows.filter((r) => (!cat || r.category === cat) && (!manager || r.manager === manager) && (!freq || r.frequency === freq) && (!ql || `${r.title} ${r.manager} ${r.depositary}`.toLowerCase().includes(ql)));
    const cmp = (a: FundRow, b: FundRow) => {
      switch (sort) {
        case "nom":
          return a.title.localeCompare(b.title, "fr");
        case "vl":
          return a.nav - b.nav;
        case "var":
          return num(a.variationPct) - num(b.variationPct);
        case "an":
          return num(a.perf1yPct) - num(b.perf1yPct);
        case "origine":
          return a.perfSinceInceptionPct - b.perfSinceInceptionPct;
        case "date":
          return a.navDate.localeCompare(b.navDate);
        default:
          return Number(b.open) - Number(a.open) || a.title.localeCompare(b.title, "fr");
      }
    };
    const dir = sort === "categorie" || sort === "nom" ? 1 : desc ? -1 : 1;
    return [...list].sort((a, b) => dir * cmp(a, b));
  }, [rows, q, cat, manager, freq, sort, desc]);

  const groups = sort === "categorie" ? CATS.filter((c) => filtered.some((r) => r.category === c)).map((c) => ({ c, rows: filtered.filter((r) => r.category === c) })) : [{ c: null, rows: filtered }];
  const active = Number(Boolean(cat)) + Number(Boolean(manager)) + Number(Boolean(freq));

  // Remember this list (URL + order shown) so a fund's page can bring the reader back and step to the next fund.
  const listUrl = `${pathname}${sp.toString() ? `?${sp}` : ""}`;
  const orderKey = groups.flatMap((g) => g.rows.map((r) => r.id)).join(",");
  useEffect(() => {
    rememberList({ url: listUrl, ids: orderKey.split(",").filter(Boolean), label: "Tous les fonds" });
  }, [listUrl, orderKey]);
  useListScroll(listUrl);

  return (
    <>
      <div className={styles.sticky}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <input type="search" placeholder={t("Un fonds, une société de gestion, un dépositaire")} aria-label={t("Rechercher")} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className={styles.chips} role="group" aria-label={t("Catégorie")}>
            <button type="button" className={`${styles.chip} ${cat === "" ? styles.chipOn : ""}`} onClick={() => setCat("")}>
              {t("Toutes")}
            </button>
            {CATS.filter((c) => c !== "?" && rows.some((r) => r.category === c)).map((c) => (
              <button key={c} type="button" className={`${styles.chip} ${cat === c ? styles.chipOn : ""}`} onClick={() => setCat(cat === c ? "" : c)} aria-pressed={cat === c}>
                {t(FUND_CATEGORY_LABEL[c])}
              </button>
            ))}
          </div>
          <Select className={styles.fixed} value={manager} onChange={setManager} label={t("Gestion")} options={[{ value: "", label: t("toutes les sociétés") }, ...managers.map((m) => ({ value: m, label: m }))]} />
          <Select className={styles.fixedSm} value={freq} onChange={(v) => setFreq(v as FundNav["frequency"] | "")} label={t("VL")} options={[{ value: "", label: t("toute périodicité") }, ...freqs.map((f) => ({ value: f, label: t(FUND_FREQUENCY_LABEL[f]) }))]} />
          <label className={styles.sort}>
            {t("Tri")}
            <Select compact value={sort} onChange={(v) => setSort(v as SortKey)} options={SORT.map(([k, l]) => ({ value: k, label: t(l) }))} />
            {sort !== "categorie" && sort !== "nom" && (
              <button type="button" className={styles.dir} onClick={() => setDesc(!desc)} aria-label={t(desc ? "Ordre décroissant" : "Ordre croissant")} title={t("Inverser l'ordre")}>
                {desc ? "↓" : "↑"}
              </button>
            )}
          </label>
          {(active > 0 || q) && (
            <button
              type="button"
              className={styles.clear}
              onClick={() => update({ q: undefined, cat: undefined, gestion: undefined, vl: undefined })}
            >
              {t("Effacer")}
            </button>
          )}
        </div>
        <div className={styles.count}>
          <b>{filtered.length}</b> {t("fonds")}{active > 0 || q ? ` ${t("correspondant aux filtres")}` : ""}
        </div>
      </div>

      {groups.map(({ c, rows: g }) => (
        <section key={c ?? "all"} className={styles.group}>
          {c && (
            <div className={styles.groupH}>
              <h2 className="display">
                {t(`${t(FUND_CATEGORY_LABEL[c])}s`)} · {g.length}
              </h2>
              <p>{t(BLURB[c])}</p>
            </div>
          )}
          <div className="scroll-x">
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>{t("Fonds")}</th>
                  <th className={styles.hideSm}>{t("Société de gestion · dépositaire")}</th>
                  <th className={styles.r}>
                    {t("VL (FCFA)")} <Info term="vl" subtle />
                  </th>
                  <th className={styles.r}>
                    {t("Var.")} <Info term="variation_vl" subtle />
                  </th>
                  <th className={styles.r}>{t("12 mois")}</th>
                  <th className={`${styles.r} ${styles.hideSm}`}>{t("Depuis l'origine")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {g.map((r) => (
                  <tr key={r.id}>
                    <td className={styles.name}>
                      <Link href={`/offres/${r.id}`}>{r.title}</Link>
                      <small>
                        {t(FUND_CATEGORY_LABEL[r.category])} · {t(FUND_FREQUENCY_LABEL[r.frequency])}
                        {r.open ? ` · ${t("souscription ouverte")}` : ""}
                      </small>
                    </td>
                    <td className={styles.hideSm}>
                      {r.manager}
                      <br />
                      <small className="muted">{r.depositary}</small>
                    </td>
                    <td className={styles.r}>
                      <b>{fmt(r.nav)}</b>
                      <br />
                      <small className="muted">{fmtDate(r.navDate)}</small>
                    </td>
                    <td className={`${styles.r} ${cls(r.variationPct)}`}>{signed(r.variationPct)}</td>
                    <td className={`${styles.r} ${cls(r.perf1yPct)}`}>{signed(r.perf1yPct)}</td>
                    <td className={`${styles.r} ${styles.hideSm} ${cls(r.perfSinceInceptionPct)}`}>
                      {signed(r.perfSinceInceptionPct)}
                      {r.inceptionDate && (
                        <>
                          <br />
                          <small className="muted">{t("depuis le")} {fmtDate(r.inceptionDate)}</small>
                        </>
                      )}
                    </td>
                    <td className={styles.r}>
                      <Link className="btn sm ghost" href={`/offres/${r.id}`}>
                        {t("Voir la fiche")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {filtered.length === 0 && <div className="empty">{t("Aucun fonds ne correspond à ces filtres.")}</div>}
    </>
  );
}
