"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DisplayStatus, Offer } from "@/lib/domain/types";
import { displayStatus, FAMILIES, familyLabel, familySegment, familyShort, headlineYield, isActionable, KIND_LABEL, type MarketSegment, offerFamily, SEGMENT_LABEL, tenorYears } from "@/lib/domain/status";
import { COUNTRY_CODE, summarize, type OfferSummary } from "@/lib/domain/summary";
import { parseDate } from "@/lib/finance";
import { OfferCard } from "./OfferCard";
import { MarketToggles, TitresHead } from "./MarketToggles";
import { CoachMarks } from "./mobile/CoachMarks";
import { LineIdentity } from "./LineIdentity";
import { famVars } from "@/lib/registry";
import { Info } from "./Info";
import { Select } from "./ui/Select";
import { parseYieldRange, YieldDropdown, YieldGauge, yieldRangeLabel, yieldRangeParam } from "./YieldRange";
import { LAST_LIST_KEY } from "./mobile/MobileShell";
import { rememberList, useListScroll } from "./ListNav";
import type { TermKey } from "@/lib/glossary";
import styles from "./OfferBrowser.module.css";
import { useT } from "@/i18n/client";
import type { T } from "@/i18n/core";

/**
 * The Guichet listing: one toolbar of filters, three ways to read the same rows
 * (table, list, cards). Filters, sort and view live in the URL so a filtered
 * view can be shared on WhatsApp and comes back the same.
 */

const SEGMENTS: MarketSegment[] = ["primaire", "secondaire"];
const COUNTRIES = ["RCA", "Congo", "Cameroun", "Gabon", "Tchad", "Guinée éq."];
const STATUSES: [string, string][] = [
  ["selection", "Sélection du desk"],
  ["open", "Ouvertes"],
  ["quoted", "Cotées · souscription"],
  ["upcoming", "À venir"],
  ["results", "Résultats"],
  ["live", "En vie"],
  ["matured", "Échues"],
];
const TENORS: [string, string][] = [
  ["lt1", "Moins d'un an"],
  ["1-3", "1 à 3 ans"],
  ["gt3", "Plus de 3 ans"],
  ["eq", "Actions et fonds"],
];
export type SortKey = "deadline" | "yield" | "coupon" | "tenor" | "minimum" | "title" | "recent";
type Dir = "asc" | "desc";
type View = "table" | "list" | "cards";
const SORT_LABEL: Record<SortKey, string> = { deadline: "clôture la plus proche", yield: "rendement", coupon: "coupon", tenor: "échéance", minimum: "ticket minimum", title: "nom", recent: "plus récent" };
const ORDER: Record<DisplayStatus, number> = { closing: 0, open: 1, upcoming: 2, quoted: 2, on_request: 3, results: 4, closed: 4, live: 5, matured: 6 };

const normStatus = (s: DisplayStatus): string => (s === "closing" ? "open" : s === "closed" ? "results" : s === "on_request" ? "quoted" : s);
const parseNum = (s: string) => Number(s.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;

/* ---------- dropdown of checkboxes ---------- */
function Dropdown({ label, items, selected, onChange, single }: { label: string; items: [string, string][]; selected: Set<string>; onChange: (s: Set<string>) => void; single?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const toggle = (v: string) => {
    const n = new Set(single ? [] : selected);
    if (selected.has(v)) n.delete(v);
    else n.add(v);
    onChange(n);
  };
  const active = selected.size > 0;
  return (
    <div className={styles.dd} ref={ref}>
      <button type="button" className={`${styles.ddBtn} ${active ? styles.ddOn : ""}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        {t(label)}
        {active && <b>{single ? t(items.find(([v]) => selected.has(v))?.[1] ?? "") : selected.size}</b>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className={styles.ddMenu} role="group" aria-label={label}>
          {items.map(([v, l]) =>
            v.startsWith("#") ? (
              <div key={v} className={styles.ddGroup}>
                {t(l)}
              </div>
            ) : (
              <label key={v} className={styles.ddItem}>
                <input type={single ? "radio" : "checkbox"} checked={selected.has(v)} onChange={() => toggle(v)} />
                {t(l)}
              </label>
            ),
          )}
          {active && (
            <button type="button" className={styles.ddClear} onClick={() => onChange(new Set())}>
              {t("Effacer")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- grouping ---------- */
type Row = { o: Offer; s: OfferSummary };
/** Rows in their current order, bucketed by issuer (first appearance keeps the sort). */
function groupByIssuer(rows: Row[]): { issuer: string; country: Offer["country"]; countryName: string; rows: Row[] }[] {
  const out: { issuer: string; country: Offer["country"]; countryName: string; rows: Row[] }[] = [];
  const idx = new Map<string, number>();
  for (const r of rows) {
    const k = r.o.issuer;
    if (!idx.has(k)) {
      idx.set(k, out.length);
      out.push({ issuer: k, country: r.o.country, countryName: r.o.countryName, rows: [] });
    }
    out[idx.get(k)!].rows.push(r);
  }
  return out;
}
function GroupHead({ g, colSpan }: { g: ReturnType<typeof groupByIssuer>[number]; colSpan?: number }) {
  const t = useT();
  const fams = [...new Set(g.rows.map((r) => r.s.kind))];
  const inner = (
    <>
      <span className="cc" title={g.countryName}>
        {COUNTRY_CODE[g.country]}
      </span>
      <b>{g.issuer}</b>
      <span className={styles.groupMeta}>
        {g.rows.length} {t(g.rows.length > 1 ? "lignes" : "ligne")} · {fams.join(" · ")}
      </span>
    </>
  );
  return colSpan ? (
    <tr className={styles.groupRow}>
      <td colSpan={colSpan}>{inner}</td>
    </tr>
  ) : (
    <div className={styles.groupHead}>{inner}</div>
  );
}

/* ---------- table ---------- */
function Th({ k, label, sort, dir, onSort, right, term, className = "" }: { k: SortKey; label: string; sort: SortKey; dir: Dir; onSort: (k: SortKey) => void; right?: boolean; term?: TermKey; className?: string }) {
  const on = sort === k;
  const t = useT();
  return (
    <th className={`${right ? styles.r : ""} ${on ? styles.sorted : ""} ${className}`} aria-sort={on ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(k)}>
        {t(label)}
        <span aria-hidden="true">{on ? (dir === "asc" ? "↑" : "↓") : ""}</span>
      </button>
      {term && <Info term={term} />}
    </th>
  );
}

const StatusPill = ({ s }: { s: OfferSummary }) => {
  const t = useT();
  return <span className={`pill ${s.statusClass}`}>{s.countdown ? `${t("Clôture")} ${s.countdown}` : t(s.status)}</span>;
};

function Table({ rows, sort, dir, onSort, grouped, featured }: { rows: Row[]; sort: SortKey; dir: Dir; onSort: (k: SortKey) => void; grouped: boolean; featured?: boolean }) {
  const groups = grouped ? groupByIssuer(rows) : [{ issuer: "", country: "Cameroun" as const, countryName: "", rows }];
  const t = useT();
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <Th k="title" label={t("Ligne")} sort={sort} dir={dir} onSort={onSort} />
            <th>{t("Statut")}</th>
            <Th k="deadline" label={t("Clôture")} sort={sort} dir={dir} onSort={onSort} right />
            <Th k="yield" label={t("Rendement")} sort={sort} dir={dir} onSort={onSort} right term="rendement_cours" />
            <Th k="tenor" label={t("Échéance")} sort={sort} dir={dir} onSort={onSort} right className={styles.hideMd} />
            <th className={`${styles.r} ${styles.hideMd}`}>{t("Durée")}</th>
            <Th k="minimum" label={t("Ticket minimum")} sort={sort} dir={dir} onSort={onSort} right term="ticket" />
            <th></th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((g) => [
            ...(grouped ? [<GroupHead key={`g-${g.issuer}`} g={g} colSpan={8} />] : []),
            ...g.rows.map(({ o, s }) => (
            <tr key={o.id} className={`${s.past ? styles.past : ""} ${featured ? styles.pick : ""}`}>
              <td className={styles.line}>
                <LineIdentity o={o} s={s} href={`/offres/${o.id}`} />
                {featured && o.featured?.reason && <small className={styles.reason}>{o.featured.reason}</small>}
              </td>
              <td>
                <StatusPill s={s} />
              </td>
              <td className={`${styles.r} num`}>
                {s.deadlineParts ? s.deadlineParts[0] : t(s.deadline)}
                {s.deadlineParts && <small>{s.deadlineParts[1]}</small>}
              </td>
              <td className={`${styles.r} ${styles.wrapCell}`} title={s.heroSub}>
                <span className={`${styles.hero} ${s.gold ? styles.gold : ""}`}>{s.hero}</span>
                <small>{t(s.heroUnit ?? s.heroSub)}</small>
              </td>
              <td className={`${styles.r} ${styles.hideMd} num`} title={s.maturityNote}>
                {s.maturity}
                {s.maturityNote && <span className={styles.approx} aria-label={s.maturityNote}>≈</span>}
              </td>
              <td className={`${styles.r} ${styles.hideMd} num`}>{s.tenor}</td>
              <td className={`${styles.r} num`}>
                {s.minimum}
                {s.minimum !== "—" && <Info text={s.minimumSub} label={t("Ce ticket représente")} subtle />}
              </td>
              <td className={styles.r}>
                <Link className="btn sm ghost" href={`/offres/${o.id}`}>
                  {t("Voir la fiche")}
                </Link>
              </td>
            </tr>
            )),
          ])}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- list ---------- */
function List({ rows, grouped, featured }: { rows: Row[]; grouped: boolean; featured?: boolean }) {
  const t = useT();
  const groups = grouped ? groupByIssuer(rows) : [{ issuer: "", country: "Cameroun" as const, countryName: "", rows }];
  return (
    <div className={styles.list}>
      {groups.flatMap((g) => [
        ...(grouped ? [<GroupHead key={`g-${g.issuer}`} g={g} />] : []),
        ...g.rows.map(({ o, s }) => (
        <Link key={o.id} href={`/offres/${o.id}`} className={`${styles.row} ${s.past ? styles.past : ""} ${featured ? styles.pick : ""}`} style={{ borderLeftColor: `var(--fam-${s.family}, ${famVars(s.family)["--fam-c"] ?? "var(--line-2)"})` }}>
          <div className={styles.rowMain}>
            <LineIdentity o={o} s={s} size="lg" />
            {featured && o.featured?.reason && <small className={styles.reason}>{o.featured.reason}</small>}
            <div className={styles.rowStatus}>
              <StatusPill s={s} />
            </div>
          </div>
          <dl className={styles.ledger}>
            {s.ledger.map(([k, v, note], i) => (
              <div key={k}>
                <dt>{t(k)}</dt>
                <dd className={i === 0 && s.gold ? styles.gold : undefined}>
                  {v}
                  {note && <small>{t(note)}</small>}
                </dd>
              </div>
            ))}
          </dl>
          <div className={styles.rowAct}>{t("Voir la fiche")} →</div>
        </Link>
        )),
      ])}
    </div>
  );
}

/* ---------- phone: filters in a bottom sheet ---------- */
type Group = { key: string; label: string; items: [string, string][]; selected: Set<string>; single?: boolean };
function FilterSheet({ open, onClose, groups, onToggle, onClear, count, gauge }: { open: boolean; onClose: () => void; groups: Group[]; onToggle: (key: string, value: string, single?: boolean) => void; onClear: () => void; count: number; gauge: React.ReactNode }) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  return (
    <>
      <div className={`${styles.scrim} ${open ? styles.scrimOpen : ""}`} onClick={onClose} aria-hidden="true" />
      <div className={`${styles.sheet} ${open ? styles.sheetOpen : ""}`} role="dialog" aria-modal="true" aria-label={t("Filtrer")} aria-hidden={!open}>
        <div className={styles.grab} />
        <div className={styles.sheetHead}>
          <b>{t("Filtrer")}</b>
          <button type="button" onClick={onClear}>
            {t("Effacer")}
          </button>
        </div>
        <div className={styles.sheetBody}>
          {groups.map((g) => (
            <div key={g.key} className={styles.fg}>
              <span>{t(g.label)}</span>
              <div className={styles.chipRow}>
                {g.items.map(([v, l]) => (
                  <button key={v} type="button" className={`${styles.chipBtn} ${g.selected.has(v) ? styles.chipOn : ""}`} aria-pressed={g.selected.has(v)} onClick={() => onToggle(g.key, v, g.single)}>
                    {t(l)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className={styles.fg}>
            <span>{t("Rendement")}</span>
            {gauge}
          </div>
        </div>
        <button type="button" className={`btn primary ${styles.sheetApply}`} onClick={onClose}>
          {t("Voir")} {count} {count > 1 ? "lignes" : "ligne"}
        </button>
      </div>
    </>
  );
}

/* ---------- browser ---------- */
export function OfferBrowser({ offers, nowIso, fundsCount }: { offers: Offer[]; nowIso: string; fundsCount: number }) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const t: T = useT();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const setOf = (k: string) => new Set((sp.get(k) ?? "").split(",").filter(Boolean));

  const kind = setOf("instrument");
  const segment = (sp.get("marche") as MarketSegment | null) ?? undefined;
  const grouped = sp.get("groupe") === "emetteur";
  const country = setOf("pays");
  const status = setOf("statut");
  const tenor = setOf("duree");
  const yr = parseYieldRange(sp.get("rendement"));
  const q = sp.get("q") ?? "";
  const sort = (sp.get("tri") as SortKey) || "deadline";
  const dir = (sp.get("sens") as Dir) || (sort === "yield" || sort === "coupon" || sort === "recent" ? "desc" : "asc");
  const [autoView, setAutoView] = useState<View>("table");
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const apply = () => setAutoView(mq.matches ? "cards" : "table");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const view = (sp.get("vue") as View) || autoView;
  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    try {
      sessionStorage.setItem(LAST_LIST_KEY, `${pathname}${sp.toString() ? `?${sp}` : ""}`);
    } catch {
      // storage unavailable
    }
  }, [pathname, sp]);
  // The market tabs and the toolbar stay frozen under the site header; the table
  // header then sticks right under them, whatever height the toolbar wraps to.
  const top = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!top.current || !wrapRef.current) return;
    const el = top.current;
    const apply = () => wrapRef.current?.style.setProperty("--sticky-h", `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };
  const setFilter = (k: string) => (s: Set<string>) => update({ [k]: [...s].join(",") || undefined });
  const onSort = (k: SortKey) => {
    if (sort === k) update({ sens: dir === "asc" ? "desc" : "asc" });
    else update({ tri: k, sens: undefined });
  };
  const reset = () => update({ marche: undefined, instrument: undefined, pays: undefined, statut: undefined, duree: undefined, rendement: undefined, q: undefined });
  const filterCount = kind.size + country.size + status.size + tenor.size + (yr.min != null || yr.max != null ? 1 : 0) + (segment ? 1 : 0);
  const famItems = SEGMENTS.filter((sg) => !segment || sg === segment).flatMap((sg) => FAMILIES().filter((f) => familySegment(f) === sg).map((f) => [f, familyShort(f)] as [string, string]));
  const groups: Group[] = [
    { key: "instrument", label: t("Instrument"), items: famItems, selected: kind },
    { key: "pays", label: t("Pays"), items: COUNTRIES.map((c) => [c, c] as [string, string]), selected: country },
    { key: "statut", label: t("Statut"), items: STATUSES, selected: status },
    { key: "duree", label: t("Durée"), items: TENORS, selected: tenor },
  ];
  const toggle = (key: string, value: string, single?: boolean) => {
    if (key === "rendement") return update({ rendement: undefined });
    const cur = setOf(key);
    if (single) {
      if (cur.has(value)) cur.clear();
      else {
        cur.clear();
        cur.add(value);
      }
    } else if (cur.has(value)) cur.delete(value);
    else cur.add(value);
    update({ [key]: [...cur].join(",") || undefined });
  };
  const activeChips = [
    ...groups.flatMap((g) => g.items.filter(([v]) => g.selected.has(v)).map(([v, l]) => ({ key: g.key, value: v, label: t(l), single: g.single }))),
    ...(yr.min != null || yr.max != null ? [{ key: "rendement", value: "*", label: `${t("Rendement")} ${yieldRangeLabel(yr)}`, single: true }] : []),
  ];
  const setYield = (min?: number, max?: number) => update({ rendement: yieldRangeParam(min, max) });
  const yields = useMemo(() => offers.map((o) => headlineYield(o)).filter((y): y is number => y != null), [offers]);
  const segCount = useMemo(() => {
    const c: Record<MarketSegment, number> = { primaire: 0, secondaire: 0, fonds: 0 };
    for (const o of offers) c[familySegment(offerFamily(o))]++;
    return c;
  }, [offers]);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const out = offers
      .filter((o) => {
        const st = displayStatus(o, now);
        const fam = offerFamily(o);
        if (segment && familySegment(fam) !== segment) return false;
        if (kind.size && !kind.has(fam)) return false;
        if (country.size && !country.has(o.country)) return false;
        if (status.size) {
          const sel = status.has("selection") && summarize(o, now).badges.some((b) => b.key === "selection");
          const rest = new Set([...status].filter((x) => x !== "selection"));
          if (!sel && (rest.size === 0 || !rest.has(normStatus(st)))) return false;
        }
        if (tenor.size) {
          const t = tenorYears(o);
          const k = o.kind === "ACTIONS" || o.kind === "FONDS" || (o.kind === "MARCHE" && o.instrument === "action") ? "eq" : t < 1 ? "lt1" : t <= 3 ? "1-3" : "gt3";
          if (!tenor.has(k)) return false;
        }
        if (yr.min != null || yr.max != null) {
          const y = headlineYield(o);
          if (y == null || (yr.min != null && y < yr.min) || (yr.max != null && y > yr.max)) return false;
        }
        if (ql) {
          const hay = [o.title, o.isin, o.issuer, o.countryName, KIND_LABEL[o.kind], familyLabel(fam), o.fund?.manager ?? ""].join(" ").toLowerCase();
          if (!hay.includes(ql)) return false;
        }
        return true;
      })
      .map((o) => ({ o, s: summarize(o, now) }));
    const cmp = (a: { o: Offer; s: OfferSummary }, b: { o: Offer; s: OfferSummary }): number => {
      switch (sort) {
        case "deadline": {
          const fa = a.s.badges.some((x) => x.key === "selection") ? 0 : 1;
          const fb = b.s.badges.some((x) => x.key === "selection") ? 0 : 1;
          if (fa !== fb) return fa - fb;
          const d = ORDER[a.s.st] - ORDER[b.s.st];
          if (d) return d;
          return (a.s.deadlineAt ? parseDate(a.s.deadlineAt).getTime() : Infinity) - (b.s.deadlineAt ? parseDate(b.s.deadlineAt).getTime() : Infinity);
        }
        case "yield":
          return (a.s.yieldPct ?? -1) - (b.s.yieldPct ?? -1);
        case "coupon":
          return parseNum(a.s.coupon) - parseNum(b.s.coupon);
        case "tenor":
          return (a.o.maturityOn ?? "9999").localeCompare(b.o.maturityOn ?? "9999");
        case "minimum":
          return parseNum(a.s.minimum) - parseNum(b.s.minimum);
        case "title":
          return a.s.title.localeCompare(b.s.title, "fr");
        default:
          return parseDate(a.o.opensAt).getTime() - parseDate(b.o.opensAt).getTime();
      }
    };
    out.sort((a, b) => (dir === "asc" ? cmp(a, b) : cmp(b, a)));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers, now, sp, sort, dir]);

  const live = offers.filter((o) => isActionable(displayStatus(o, now))).length;
  // « À la une » : the desk's picks, in their own frame under the toolbar, in the same view as the list.
  const today = nowIso.slice(0, 10);
  const picks = rows.filter(({ o }) => o.featured && o.featured.until >= today).slice(0, 3);
  const pickIds = new Set(picks.map(({ o }) => o.id));
  const rest = pickIds.size ? rows.filter(({ o }) => !pickIds.has(o.id)) : rows;
  // The line pages step through this exact order and come back to this exact list.
  const listUrl = `${pathname}${sp.toString() ? `?${sp}` : ""}`;
  const orderKey = [...picks, ...rest].map(({ o }) => o.id).join(",");
  useEffect(() => {
    rememberList({ url: listUrl, ids: orderKey.split(",").filter(Boolean), label: "Toutes les offres" });
  }, [listUrl, orderKey]);
  useListScroll(listUrl);
  const render = (list: Row[], featured: boolean) =>
    view === "table" ? (
      <Table rows={list} sort={sort} dir={dir} onSort={onSort} grouped={grouped && !featured} featured={featured} />
    ) : view === "list" ? (
      <List rows={list} grouped={grouped && !featured} featured={featured} />
    ) : (
      <div className={`${styles.cards} ${featured ? styles.pickCards : ""}`}>
        {list.map(({ o, s }) => (
          <div key={o.id} className={featured ? styles.pickCard : undefined}>
            <OfferCard o={o} s={s} />
            {featured && o.featured?.reason && <small className={styles.reason}>{o.featured.reason}</small>}
          </div>
        ))}
      </div>
    );

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <TitresHead fundsCount={fundsCount} />
      <div className={styles.top} ref={top}>
        <MarketToggles selected={segment === "primaire" || segment === "secondaire" ? segment : undefined} counts={{ primaire: segCount.primaire, secondaire: segCount.secondaire }} onChange={(k) => update({ marche: k, instrument: undefined })} />
        <div className={styles.toolbar} data-coach="titres-filtres">
          <label className={styles.search}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input type="search" placeholder={t("Rechercher une ligne, un émetteur, un ISIN")} aria-label={t("Rechercher")} defaultValue={q} onChange={(e) => update({ q: e.target.value || undefined })} />
          </label>
          <button type="button" className={styles.sheetBtn} onClick={() => setSheet(true)} aria-haspopup="dialog">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {t("Filtrer")}{filterCount > 0 ? ` · ${filterCount}` : ""}
          </button>
          <div className={styles.filters}>
          <Dropdown
            label={t("Instrument")}
            items={SEGMENTS.filter((sg) => !segment || sg === segment).flatMap((sg) => [[`#${sg}`, SEGMENT_LABEL[sg]] as [string, string], ...FAMILIES().filter((f) => familySegment(f) === sg).map((f) => [f, familyLabel(f)] as [string, string])])}
            selected={kind}
            onChange={setFilter("instrument")}
          />
          <Dropdown label={t("Pays")} items={COUNTRIES.map((c) => [c, c])} selected={country} onChange={setFilter("pays")} />
          <Dropdown label={t("Statut")} items={STATUSES} selected={status} onChange={setFilter("statut")} />
          <Dropdown label={t("Durée")} items={TENORS} selected={tenor} onChange={setFilter("duree")} />
          <YieldDropdown values={yields} min={yr.min} max={yr.max} onChange={setYield} />
          {(filterCount > 0 || q) && (
            <button type="button" className={styles.clear} onClick={reset}>
              {t("Effacer")}
            </button>
          )}
          <div className={styles.seg} role="group" aria-label={t("Affichage")} data-coach="titres-vues">
            {(["table", "list", "cards"] as View[]).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => update({ vue: v })}>
                {t(v === "table" ? "Tableau" : v === "list" ? "Liste" : "Cartes")}
              </button>
            ))}
          </div>
          </div>
        </div>
        {activeChips.length > 0 && (
          <div className={styles.activeRow}>
            {activeChips.map((c) => (
              <button key={c.key + c.value} type="button" className={`${styles.chipBtn} ${styles.chipOn}`} onClick={() => toggle(c.key, c.value, c.single)} aria-label={`${t("Retirer le filtre")} ${c.label}`}>
                {c.label} <span aria-hidden="true">×</span>
              </button>
            ))}
            <button type="button" className={styles.chipBtn} onClick={reset}>
              {t("Tout effacer")}
            </button>
          </div>
        )}
      </div>
      <FilterSheet open={sheet} onClose={() => setSheet(false)} groups={groups} onToggle={toggle} onClear={reset} count={rows.length} gauge={<YieldGauge values={yields} min={yr.min} max={yr.max} onChange={setYield} />} />

      <div className={styles.meta}>
        <span>
          <b>{rows.length}</b> {t(rows.length > 1 ? "lignes" : "ligne")}
          {filterCount > 0 || q ? ` ${t("correspondant aux filtres")}` : ""} · {live} {t(live > 1 ? "ouvertes ou cotées" : "ouverte ou cotée")}
        </span>
        <Link className={styles.compareLink} href="/comparer">
          {t("Comparer deux lignes")}
        </Link>
        <label className={styles.groupToggle}>
          <input type="checkbox" checked={grouped} onChange={(e) => update({ groupe: e.target.checked ? "emetteur" : undefined })} />
          {t("Grouper par émetteur")}
        </label>
        <label className={styles.sortSel}>
          {t("Tri")}
          <Select compact value={sort} onChange={(v) => update({ tri: v, sens: undefined })} options={(Object.keys(SORT_LABEL) as SortKey[]).map((k) => ({ value: k, label: t(SORT_LABEL[k]) }))} />
          <button type="button" className={styles.dirBtn} onClick={() => update({ sens: dir === "asc" ? "desc" : "asc" })} aria-label={t(dir === "asc" ? "Ordre croissant" : "Ordre décroissant")} title={t("Inverser l'ordre")}>
            {dir === "asc" ? "↑" : "↓"}
          </button>
        </label>
      </div>

      {picks.length > 0 && (
        <section className={styles.featured} aria-label={t("À la une")}>
          <div className={styles.featuredHead}>
            <span className="eyebrow">{t("À la une · sélection du desk")}</span>
            <small>{t("Une sélection, pas un conseil : chaque ligne se lit dans sa fiche.")}</small>
          </div>
          {render(picks, true)}
        </section>
      )}

      {rows.length === 0 && <div className="empty">{t("Aucune ligne ne correspond à ces filtres.")}</div>}
      {rest.length > 0 && render(rest, false)}
      <CoachMarks
        id="titres"
        replayLabel={t("Comment lire cette page ?")}
        stops={[
          { target: "titres-marches", title: t("Deux marchés, deux interrupteurs"), text: t("Marché primaire : vous souscrivez auprès de l'émetteur pendant une fenêtre. Marché secondaire : vous achetez à un autre investisseur au cours du jour. Les deux sont affichés ; éteignez-en un pour ne voir que l'autre.") },
          { target: "titres-fonds", title: t("Les fonds ont leur page"), text: t("Les parts de fonds (OPCVM) se souscrivent à la prochaine valeur liquidative : elles ont leur propre tableau, avec leurs catégories et leur société de gestion.") },
          { target: "titres-filtres", title: t("Filtrer, puis trier"), text: t("Instrument, pays, statut, durée, rendement : chaque filtre s'ajoute aux autres. Le tri et les filtres restent dans l'adresse de la page — revenez d'une fiche, la liste est telle que vous l'aviez laissée.") },
          { target: "titres-vues", title: t("Tableau, liste ou cartes"), text: t("Le tableau compare les chiffres, la liste se lit d'un trait, les cartes conviennent au téléphone. Le rendement est toujours le premier chiffre.") },
        ]}
      />
    </div>
  );
}
