"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DisplayStatus, Offer, OfferKind } from "@/lib/domain/types";
import { countdown, displayStatus, headlineYield, isActionable, KIND_LABEL, tenorYears } from "@/lib/domain/status";
import { parseDate } from "@/lib/finance";
import { fmtDateTime, fmtPct } from "@/lib/format";
import { OfferCard } from "./OfferCard";
import styles from "./OfferBrowser.module.css";

const KINDS: OfferKind[] = ["OTA", "BTA", "ACTIONS", "APE", "RACHAT"];
const COUNTRIES = ["RCA", "Congo", "Cameroun", "Gabon", "Tchad", "Guinée éq."];
const STATUSES: [string, string][] = [
  ["open", "Ouvertes"],
  ["upcoming", "À venir"],
  ["results", "Résultats"],
  ["live", "En vie"],
  ["matured", "Échues"],
];
const TENORS: [string, string][] = [
  ["lt1", "< 1 an"],
  ["1-3", "1 à 3 ans"],
  ["gt3", "> 3 ans"],
  ["eq", "Actions"],
];
type Sort = "deadline" | "yield" | "tenor" | "recent";
const ORDER: Record<DisplayStatus, number> = { closing: 0, open: 1, upcoming: 2, results: 3, closed: 3, live: 4, matured: 5 };

function normStatus(s: DisplayStatus): string {
  if (s === "closing") return "open";
  if (s === "closed") return "results";
  return s;
}

function Chips({ items, selected, onToggle }: { items: [string, string][]; selected: Set<string>; onToggle: (v: string) => void }) {
  return (
    <div className={styles.chips}>
      {items.map(([v, l]) => (
        <button key={v} type="button" className={styles.chip} aria-pressed={selected.has(v)} onClick={() => onToggle(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function OfferBrowser({ offers, nowIso }: { offers: Offer[]; nowIso: string }) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [kind, setKind] = useState<Set<string>>(new Set());
  const [country, setCountry] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Set<string>>(new Set());
  const [tenor, setTenor] = useState<Set<string>>(new Set());
  const [minYield, setMinYield] = useState(0);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("deadline");
  const [layout, setLayout] = useState<"cards" | "list">("cards");

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void) => (v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    setter(n);
  };
  const reset = () => {
    setKind(new Set());
    setCountry(new Set());
    setStatus(new Set());
    setTenor(new Set());
    setMinYield(0);
    setQ("");
  };

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const filtered = offers.filter((o) => {
      const st = displayStatus(o, now);
      if (kind.size && !kind.has(o.kind)) return false;
      if (country.size && !country.has(o.country)) return false;
      if (status.size && !status.has(normStatus(st))) return false;
      if (tenor.size) {
        const t = tenorYears(o);
        const k = o.kind === "ACTIONS" ? "eq" : t < 1 ? "lt1" : t <= 3 ? "1-3" : "gt3";
        if (!tenor.has(k)) return false;
      }
      if (minYield) {
        const y = headlineYield(o);
        if (y == null || y < minYield) return false;
      }
      if (ql) {
        const hay = [o.title, o.isin, o.issuer, o.countryName, KIND_LABEL[o.kind]].join(" ").toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      if (sort === "deadline") {
        const d = ORDER[displayStatus(a, now)] - ORDER[displayStatus(b, now)];
        if (d) return d;
        return parseDate(a.deadlineAt).getTime() - parseDate(b.deadlineAt).getTime();
      }
      if (sort === "yield") return (headlineYield(b) ?? 0) - (headlineYield(a) ?? 0);
      if (sort === "tenor") return tenorYears(a) - tenorYears(b);
      return parseDate(b.opensAt).getTime() - parseDate(a.opensAt).getTime();
    });
  }, [offers, now, kind, country, status, tenor, minYield, q, sort]);

  const liveCount = offers.filter((o) => isActionable(displayStatus(o, now))).length;

  // "Aujourd'hui" strip — one entry per issuer × event within 48 h.
  const today = useMemo(() => {
    const seen = new Set<string>();
    const out: { o: Offer; st: DisplayStatus; when: string; n: number }[] = [];
    offers.forEach((o) => {
      const st = displayStatus(o, now);
      if (!isActionable(st)) return;
      const when = st === "upcoming" ? o.opensAt : o.deadlineAt;
      if (parseDate(when).getTime() - now.getTime() > 48 * 3600e3) return;
      const key = `${o.countryName}|${st === "upcoming" ? "open" : "close"}`;
      if (seen.has(key)) return;
      seen.add(key);
      const n = offers.filter((x) => x.countryName === o.countryName && (displayStatus(x, now) === "upcoming") === (st === "upcoming") && isActionable(displayStatus(x, now))).length;
      out.push({ o, st, when, n });
    });
    return out.sort((a, b) => parseDate(a.when).getTime() - parseDate(b.when).getTime());
  }, [offers, now]);

  return (
    <>
      <div className={styles.today}>
        <div>
          <h2 className="display">Aujourd&apos;hui</h2>
          <div className={styles.sub}>Échéances des prochaines 48 h — un clic ouvre la fiche.</div>
        </div>
        <div className={styles.dlList}>
          {today.length === 0 && <span className="muted" style={{ fontSize: ".82rem" }}>Aucune échéance dans les 48 h.</span>}
          {today.map(({ o, st, when, n }) => (
            <Link key={o.id} href={`/offres/${o.id}`} className={styles.dl}>
              <span className={`${styles.cd} ${st === "closing" ? styles.hot : st === "upcoming" ? styles.soon : ""}`}>{countdown(when, now)}</span>
              <span>
                <b>
                  {st === "upcoming" ? "Ouverture" : "Clôture"} · {o.countryName}
                </b>
                <small>
                  {n} ligne{n > 1 ? "s" : ""} · {fmtDateTime(when)}
                </small>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.filters} aria-label="Filtres">
          <label className={styles.search}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input type="search" placeholder="Rechercher (ISIN, émetteur, maturité…)" aria-label="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className={styles.fgroup}>
            <span className="eyebrow">Instrument</span>
            <Chips items={KINDS.map((k) => [k, KIND_LABEL[k]])} selected={kind} onToggle={toggle(kind, setKind)} />
          </div>
          <div className={styles.fgroup}>
            <span className="eyebrow">Émetteur / pays</span>
            <Chips items={COUNTRIES.map((c) => [c, c])} selected={country} onToggle={toggle(country, setCountry)} />
          </div>
          <div className={styles.fgroup}>
            <span className="eyebrow">Statut</span>
            <Chips items={STATUSES} selected={status} onToggle={toggle(status, setStatus)} />
          </div>
          <div className={styles.fgroup}>
            <span className="eyebrow">Durée restante</span>
            <Chips items={TENORS} selected={tenor} onToggle={toggle(tenor, setTenor)} />
          </div>
          <div className={styles.fgroup}>
            <span className="eyebrow">Rendement minimum</span>
            <div className={styles.range}>
              <input type="range" min={0} max={12} step={0.5} value={minYield} onChange={(e) => setMinYield(+e.target.value)} aria-label="Rendement minimum" />
              <output>{minYield ? `≥ ${fmtPct(minYield)}` : "tous"}</output>
            </div>
          </div>
          <button type="button" className={styles.linkbtn} onClick={reset}>
            Réinitialiser les filtres
          </button>
        </aside>

        <div>
          <div className={styles.toolbar}>
            <span>
              <b>{list.length}</b> offre{list.length > 1 ? "s" : ""} · {liveCount} en cours ou à venir
            </span>
            <div className={styles.seg} role="group" aria-label="Affichage">
              <button type="button" aria-pressed={layout === "cards"} onClick={() => setLayout("cards")}>
                Cartes
              </button>
              <button type="button" aria-pressed={layout === "list"} onClick={() => setLayout("list")}>
                Liste
              </button>
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Trier">
              <option value="deadline">Trier : clôture la plus proche</option>
              <option value="yield">Trier : rendement décroissant</option>
              <option value="tenor">Trier : durée croissante</option>
              <option value="recent">Trier : plus récent</option>
            </select>
          </div>
          <div className={`${styles.grid} ${layout === "list" ? styles.gridList : ""}`}>
            {list.length === 0 && <div className="empty">Aucune offre ne correspond à ces filtres.</div>}
            {list.map((o) => (
              <OfferCard key={o.id} o={o} now={now} layout={layout} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
