"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DisplayStatus, Offer } from "@/lib/domain/types";
import { displayStatus, FAMILIES, FAMILY_LABEL, FAMILY_SEGMENT, headlineYield, isActionable, KIND_LABEL, type MarketSegment, offerFamily, SEGMENT_HINT, SEGMENT_LABEL, tenorYears } from "@/lib/domain/status";
import { COUNTRY_CODE, summarize, type OfferSummary } from "@/lib/domain/summary";
import { parseDate } from "@/lib/finance";
import { OfferCard } from "./OfferCard";
import { Info } from "./Info";
import type { TermKey } from "@/lib/glossary";
import styles from "./OfferBrowser.module.css";

/**
 * The Guichet listing: one toolbar of filters, three ways to read the same rows
 * (table, list, cards). Filters, sort and view live in the URL so a filtered
 * view can be shared on WhatsApp and comes back the same.
 */

const SEGMENTS: MarketSegment[] = ["primaire", "secondaire", "fonds"];
const COUNTRIES = ["RCA", "Congo", "Cameroun", "Gabon", "Tchad", "Guinée éq."];
const STATUSES: [string, string][] = [
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
const YIELDS: [string, string][] = [
  ["5", "≥ 5 %"],
  ["7", "≥ 7 %"],
  ["9", "≥ 9 %"],
];
export type SortKey = "deadline" | "yield" | "coupon" | "tenor" | "minimum" | "commission" | "title" | "recent";
type Dir = "asc" | "desc";
type View = "table" | "list" | "cards";
const SORT_LABEL: Record<SortKey, string> = { deadline: "clôture la plus proche", yield: "rendement", coupon: "coupon", tenor: "durée", minimum: "minimum", commission: "commission", title: "nom", recent: "plus récent" };
const ORDER: Record<DisplayStatus, number> = { closing: 0, open: 1, upcoming: 2, quoted: 2, on_request: 3, results: 4, closed: 4, live: 5, matured: 6 };

const normStatus = (s: DisplayStatus): string => (s === "closing" ? "open" : s === "closed" ? "results" : s === "on_request" ? "quoted" : s);
const parseNum = (s: string) => Number(s.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;

/* ---------- dropdown of checkboxes ---------- */
function Dropdown({ label, items, selected, onChange, single }: { label: string; items: [string, string][]; selected: Set<string>; onChange: (s: Set<string>) => void; single?: boolean }) {
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
        {label}
        {active && <b>{single ? items.find(([v]) => selected.has(v))?.[1] : selected.size}</b>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className={styles.ddMenu} role="group" aria-label={label}>
          {items.map(([v, l]) =>
            v.startsWith("#") ? (
              <div key={v} className={styles.ddGroup}>
                {l}
              </div>
            ) : (
              <label key={v} className={styles.ddItem}>
                <input type={single ? "radio" : "checkbox"} checked={selected.has(v)} onChange={() => toggle(v)} />
                {l}
              </label>
            ),
          )}
          {active && (
            <button type="button" className={styles.ddClear} onClick={() => onChange(new Set())}>
              Effacer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- table ---------- */
function Th({ k, label, sort, dir, onSort, right, term }: { k: SortKey; label: string; sort: SortKey; dir: Dir; onSort: (k: SortKey) => void; right?: boolean; term?: TermKey }) {
  const on = sort === k;
  return (
    <th className={`${right ? styles.r : ""} ${on ? styles.sorted : ""}`} aria-sort={on ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(k)}>
        {label}
        <span aria-hidden="true">{on ? (dir === "asc" ? "↑" : "↓") : ""}</span>
      </button>
      {term && <Info term={term} />}
    </th>
  );
}

const StatusPill = ({ s }: { s: OfferSummary }) => <span className={`pill ${s.statusClass}`}>{s.countdown ? `Clôture ${s.countdown}` : s.status}</span>;

function Table({ rows, sort, dir, onSort }: { rows: { o: Offer; s: OfferSummary }[]; sort: SortKey; dir: Dir; onSort: (k: SortKey) => void }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <Th k="title" label="Ligne" sort={sort} dir={dir} onSort={onSort} />
            <th>Pays</th>
            <th>Statut</th>
            <Th k="deadline" label="Clôture" sort={sort} dir={dir} onSort={onSort} right />
            <Th k="yield" label="Rendement · cours" sort={sort} dir={dir} onSort={onSort} right term="rendement_cours" />
            <Th k="coupon" label="Coupon" sort={sort} dir={dir} onSort={onSort} right term="coupon" />
            <Th k="tenor" label="Échéance" sort={sort} dir={dir} onSort={onSort} right />
            <Th k="minimum" label="Minimum" sort={sort} dir={dir} onSort={onSort} right />
            <Th k="commission" label="Com." sort={sort} dir={dir} onSort={onSort} right term="commission" />
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ o, s }) => (
            <tr key={o.id} className={s.past ? styles.past : ""}>
              <td className={styles.line}>
                <Link href={`/offres/${o.id}`}>
                  <span className={`${styles.kind} ${styles[`seg_${s.segment}`]}`}>{s.kind}</span> · {s.title}
                </Link>
                <small>{s.subtitle}</small>
              </td>
              <td>
                <span className="cc" title={o.countryName}>{COUNTRY_CODE[o.country]}</span>
              </td>
              <td>
                <StatusPill s={s} />
              </td>
              <td className={`${styles.r} num`}>{s.deadline}</td>
              <td className={styles.r}>
                <span className={`${styles.hero} ${s.gold ? styles.gold : ""}`}>{s.hero}</span>
                <small>{s.heroSub}</small>
              </td>
              <td className={`${styles.r} num`}>{s.coupon}</td>
              <td className={`${styles.r} num`}>{s.tenor}</td>
              <td className={`${styles.r} num`}>{s.minimum}</td>
              <td className={`${styles.r} num`}>{s.commission}</td>
              <td className={styles.r}>
                {s.primary ? (
                  <Link className={`btn sm ${s.primary.intent === "info" ? "" : "primary"}`} href={`/offres/${o.id}?intent=${s.primary.intent}`}>
                    {s.primary.label}
                  </Link>
                ) : (
                  <Link className="btn sm ghost" href={`/offres/${o.id}`}>
                    Fiche
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- list ---------- */
function List({ rows }: { rows: { o: Offer; s: OfferSummary }[] }) {
  return (
    <div className={styles.list}>
      {rows.map(({ o, s }) => (
        <Link key={o.id} href={`/offres/${o.id}`} className={`${styles.row} ${styles[`band_${s.segment}`]} ${s.past ? styles.past : ""}`}>
          <div className={styles.rowMain}>
            <div className={styles.rowTitle}>
              <span className={`${styles.kind} ${styles[`seg_${s.segment}`]}`}>{s.kind}</span> · {s.title}
            </div>
            <small>{s.subtitle}</small>
          </div>
          <div className={styles.rowHero}>
            <span className={`${styles.hero} ${s.gold ? styles.gold : ""}`}>{s.hero}</span>
            <small>{s.heroSub}</small>
          </div>
          <div className={styles.rowSub}>
            <StatusPill s={s} />
            <span className="cc" title={o.countryName}>{COUNTRY_CODE[o.country]}</span>
            <span>{s.deadline === "continue" ? "cotation continue" : s.deadline}</span>
            <span>com. {s.commission}</span>
            {s.primary && <span className={styles.rowAct}>{s.primary.label} →</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ---------- browser ---------- */
export function OfferBrowser({ offers, nowIso }: { offers: Offer[]; nowIso: string }) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const setOf = (k: string) => new Set((sp.get(k) ?? "").split(",").filter(Boolean));

  const kind = setOf("instrument");
  const segment = (sp.get("marche") as MarketSegment | null) ?? undefined;
  const country = setOf("pays");
  const status = setOf("statut");
  const tenor = setOf("duree");
  const minYield = setOf("rendement");
  const q = sp.get("q") ?? "";
  const sort = (sp.get("tri") as SortKey) || "deadline";
  const dir = (sp.get("sens") as Dir) || (sort === "yield" || sort === "coupon" || sort === "recent" ? "desc" : "asc");
  const [autoView, setAutoView] = useState<View>("table");
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const apply = () => setAutoView(mq.matches ? "list" : "table");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const view = (sp.get("vue") as View) || autoView;

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
  const filterCount = kind.size + country.size + status.size + tenor.size + minYield.size + (segment ? 1 : 0);
  const segCount = useMemo(() => {
    const c: Record<MarketSegment, number> = { primaire: 0, secondaire: 0, fonds: 0 };
    for (const o of offers) c[FAMILY_SEGMENT[offerFamily(o)]]++;
    return c;
  }, [offers]);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const min = minYield.size ? Number([...minYield][0]) : 0;
    const out = offers
      .filter((o) => {
        const st = displayStatus(o, now);
        const fam = offerFamily(o);
        if (segment && FAMILY_SEGMENT[fam] !== segment) return false;
        if (kind.size && !kind.has(fam)) return false;
        if (country.size && !country.has(o.country)) return false;
        if (status.size && !status.has(normStatus(st))) return false;
        if (tenor.size) {
          const t = tenorYears(o);
          const k = o.kind === "ACTIONS" || o.kind === "FONDS" || (o.kind === "MARCHE" && o.instrument === "action") ? "eq" : t < 1 ? "lt1" : t <= 3 ? "1-3" : "gt3";
          if (!tenor.has(k)) return false;
        }
        if (min) {
          const y = headlineYield(o);
          if (y == null || y < min) return false;
        }
        if (ql) {
          const hay = [o.title, o.isin, o.issuer, o.countryName, KIND_LABEL[o.kind], FAMILY_LABEL[fam], o.fund?.manager ?? ""].join(" ").toLowerCase();
          if (!hay.includes(ql)) return false;
        }
        return true;
      })
      .map((o) => ({ o, s: summarize(o, now) }));
    const cmp = (a: { o: Offer; s: OfferSummary }, b: { o: Offer; s: OfferSummary }): number => {
      switch (sort) {
        case "deadline": {
          const d = ORDER[a.s.st] - ORDER[b.s.st];
          if (d) return d;
          return (a.s.deadlineAt ? parseDate(a.s.deadlineAt).getTime() : Infinity) - (b.s.deadlineAt ? parseDate(b.s.deadlineAt).getTime() : Infinity);
        }
        case "yield":
          return (a.s.yieldPct ?? -1) - (b.s.yieldPct ?? -1);
        case "coupon":
          return parseNum(a.s.coupon) - parseNum(b.s.coupon);
        case "tenor":
          return tenorYears(a.o) - tenorYears(b.o);
        case "minimum":
          return parseNum(a.s.minimum) - parseNum(b.s.minimum);
        case "commission":
          return a.o.commissionPct - b.o.commissionPct;
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

  return (
    <div className={styles.wrap}>
      <div className={styles.segments} role="tablist" aria-label="Marché">
        <button type="button" role="tab" aria-selected={!segment} onClick={() => update({ marche: undefined, instrument: undefined })}>
          Tout <b>{offers.length}</b>
        </button>
        {SEGMENTS.filter((sg) => segCount[sg] > 0 || segment === sg).map((sg) => (
          <button key={sg} type="button" role="tab" aria-selected={segment === sg} title={SEGMENT_HINT[sg]} onClick={() => update({ marche: sg, instrument: undefined })}>
            {SEGMENT_LABEL[sg]} <b>{segCount[sg]}</b>
          </button>
        ))}
      </div>
      {segment && <p className={styles.segHint}>{SEGMENT_HINT[segment]}</p>}
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Rechercher une ligne, un émetteur, un ISIN" aria-label="Rechercher" defaultValue={q} onChange={(e) => update({ q: e.target.value || undefined })} />
        </label>
        <Dropdown
          label="Instrument"
          items={SEGMENTS.filter((sg) => !segment || sg === segment).flatMap((sg) => [[`#${sg}`, SEGMENT_LABEL[sg]] as [string, string], ...FAMILIES.filter((f) => FAMILY_SEGMENT[f] === sg).map((f) => [f, FAMILY_LABEL[f]] as [string, string])])}
          selected={kind}
          onChange={setFilter("instrument")}
        />
        <Dropdown label="Pays" items={COUNTRIES.map((c) => [c, c])} selected={country} onChange={setFilter("pays")} />
        <Dropdown label="Statut" items={STATUSES} selected={status} onChange={setFilter("statut")} />
        <Dropdown label="Durée" items={TENORS} selected={tenor} onChange={setFilter("duree")} />
        <Dropdown label="Rendement" items={YIELDS} selected={minYield} onChange={setFilter("rendement")} single />
        {(filterCount > 0 || q) && (
          <button type="button" className={styles.clear} onClick={reset}>
            Effacer
          </button>
        )}
        <div className={styles.seg} role="group" aria-label="Affichage">
          {(["table", "list", "cards"] as View[]).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => update({ vue: v })}>
              {v === "table" ? "Tableau" : v === "list" ? "Liste" : "Cartes"}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.meta}>
        <span>
          <b>{rows.length}</b> ligne{rows.length > 1 ? "s" : ""}
          {filterCount > 0 || q ? " correspondant aux filtres" : ""} · {live} ouverte{live > 1 ? "s" : ""} ou cotée{live > 1 ? "s" : ""}
        </span>
        <label className={styles.sortSel}>
          Tri
          <select value={sort} onChange={(e) => update({ tri: e.target.value, sens: undefined })} aria-label="Trier">
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABEL[k]}
              </option>
            ))}
          </select>
          <button type="button" className={styles.dirBtn} onClick={() => update({ sens: dir === "asc" ? "desc" : "asc" })} aria-label={dir === "asc" ? "Ordre croissant" : "Ordre décroissant"} title="Inverser l'ordre">
            {dir === "asc" ? "↑" : "↓"}
          </button>
        </label>
      </div>

      {rows.length === 0 && <div className="empty">Aucune ligne ne correspond à ces filtres.</div>}
      {rows.length > 0 && view === "table" && <Table rows={rows} sort={sort} dir={dir} onSort={onSort} />}
      {rows.length > 0 && view === "list" && <List rows={rows} />}
      {rows.length > 0 && view === "cards" && (
        <div className={styles.cards}>
          {rows.map(({ o, s }) => (
            <OfferCard key={o.id} o={o} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
