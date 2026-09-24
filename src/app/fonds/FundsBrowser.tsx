"use client";

import { fold } from "@/lib/text";
import { useSearchCommit } from "@/lib/ui/commit-search";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Info } from "@/components/Info";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { DensitySwitch, useDistinction } from "@/components/Density";
import { Sheet } from "@/components/mobile/Sheet";
import { FilterFab } from "@/components/FilterFab";
import { FilterLine } from "@/components/FilterLine";
import { usePhone } from "@/components/chart-utils";
import { FundCard } from "./FundCard";
import { LineMenu } from "@/components/mobile/LineMenu";
import { rememberList, useListScroll } from "@/components/ListNav";
import { Select } from "@/components/ui/Select";
import { useDeskView, useLineHref } from "@/components/DeskView";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL, type FundNav } from "@/lib/domain/market";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import styles from "./page.module.css";
import { useT } from "@/i18n/client";

/** One fund as the browser needs it : flat, serialisable, computed on the server. */
export interface FundRow {
  id: string;
  title: string;
  isin: string;
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
  entryFeePct: number;
  exitFeePct: number;
  managementFeePct?: number;
  minAmount: number;
  cutoff?: string;
  settlementDays?: number;
  featured?: string; // the desk's reason when the fund is « À la une »
}

type SortKey = "categorie" | "nom" | "gestion" | "vl" | "var" | "an" | "origine" | "date";
const SORT: [SortKey, string][] = [
  ["categorie", "par catégorie"],
  ["an", "12 mois"],
  ["var", "variation"],
  ["origine", "depuis l'origine"],
  ["vl", "valeur liquidative"],
  ["date", "VL la plus récente"],
  ["nom", "nom"],
  ["gestion", "société de gestion"],
];
/** Le sens qu'on attend d'une colonne au premier clic : un rendement du plus fort,
    un nom de A à Z. Le second clic inverse, et c'est lui qui écrit « sens ». */
const NATURAL: Record<SortKey, "asc" | "desc"> = { categorie: "asc", nom: "asc", gestion: "asc", vl: "desc", var: "desc", an: "desc", origine: "desc", date: "desc" };
const CATS: FundNav["category"][] = ["M", "O", "D", "A", "?"];
const BLURB: Record<FundNav["category"], string> = {
  M: "Placement de trésorerie : titres courts, valeur liquidative très régulière, argent disponible sous quelques jours.",
  O: "Investis en obligations d'États et d'entreprises de la zone ; rendement porté par les coupons, sensibilité aux taux.",
  D: "Un panachage d'obligations, d'actions et de trésorerie, arbitré par la société de gestion.",
  A: "Exposés aux actions cotées à la BVMAC et à la région : le potentiel et la volatilité les plus élevés.",
  "?": "Catégorie non précisée au bulletin.",
};

const FAMILIES_KEY = "guichet:fonds:familles"; // "0" once the reader folded the explanation
let familiesListeners: (() => void)[] = [];
const readFamilies = () => {
  try {
    return localStorage.getItem(FAMILIES_KEY) !== "0";
  } catch {
    return true;
  }
};
const subscribeFamilies = (cb: () => void) => {
  familiesListeners.push(cb);
  return () => {
    familiesListeners = familiesListeners.filter((x) => x !== cb);
  };
};
const setFamilies = (open: boolean) => {
  try {
    localStorage.setItem(FAMILIES_KEY, open ? "1" : "0");
  } catch {
    // storage unavailable
  }
  familiesListeners.forEach((cb) => cb());
};

const signed = (v?: number) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, 2)}`);
const cls = (v?: number) => (v == null || v === 0 ? "" : v > 0 ? styles.up : styles.down);
const num = (v?: number) => (v == null ? -Infinity : v);

/** One row of the table, with its « ··· ». */
function FundTr({ r }: { r: FundRow }) {
  const t = useT();
  const href = useLineHref()(r.id);
  const desk = useDeskView();
  return (
    <tr>
      <td className={styles.name}>
        <Link href={href}>{r.title}</Link>
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
      <td className={styles.r}>{r.managementFeePct != null ? fmtPct(r.managementFeePct, 2) : <span className="muted" title={t("Frais de gestion non renseignés : demandez le prospectus au desk.")}>—</span>}</td>
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
        <span className={styles.rowBtns}>
          <Link className="btn sm ghost" href={href}>
            {t(desk ? "Voir la ligne" : "Voir la fiche")}
          </Link>
          {!desk && <LineMenu line={{ id: r.id, title: r.title, isin: r.isin, sub: `${r.manager} · VL ${fmt(r.nav)} FCFA` }} />}
        </span>
      </td>
    </tr>
  );
}

/**
 * La même liste des deux côtés.
 *
 * Rien n'est recopié : les rangées, les cartes, les filtres et le tri sont
 * les mêmes objets. Enveloppée dans « DeskView », une rangée mène à la ligne
 * du desk et les commandes faites pour un client (le « ··· » qui suit,
 * compare et partage, la densité des cartes, la visite guidée) ne paraissent
 * pas. Une correction faite ici paraît des deux côtés le même jour.
 */
export function FundsBrowser({ rows }: { rows: FundRow[] }) {
  const desk = useDeskView();
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
  const asc = (sp.get("sens") ?? NATURAL[sort]) === "asc";
  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };
  // Le champ garde ce qu'on tape ; l'URL suit après une pause. Écrire dans
  // l'URL à chaque touche relançait le rendu de la page entre deux lettres,
  // et le champ retardait sur le clavier. La liste, elle, se refiltre tout de
  // suite : c'est `draft` qu'elle lit, pas l'adresse.
  const [draft, setDraft] = useState(q);
  const pushed = useRef(q);
  useEffect(() => {
    if (draft === pushed.current) return;
    const id = window.setTimeout(() => {
      pushed.current = draft;
      update({ q: draft || undefined });
    }, 180);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  // Un retour arrière, un lien ouvert : l'adresse a changé sans nous.
  useEffect(() => {
    if (q !== pushed.current) {
      pushed.current = q;
      setDraft(q);
    }
  }, [q]);
  const setQ = (v: string) => {
    pushed.current = v;
    setDraft(v);
    update({ q: v || undefined });
  };
  const clearAll = () => {
    pushed.current = "";
    setDraft("");
    update({ q: undefined, cat: undefined, gestion: undefined, vl: undefined });
  };
  const setCat = (v: FundNav["category"] | "") => update({ cat: v || undefined });
  const setManager = (v: string) => update({ gestion: v || undefined });
  const setFreq = (v: FundNav["frequency"] | "") => update({ vl: v || undefined });
  const setSort = (v: SortKey) => update({ tri: v === "categorie" ? undefined : v, sens: undefined });
  // Depuis l'en-tête d'une colonne : la première fois son sens naturel, la
  // seconde l'inverse. C'est là qu'on cherche à trier un tableau.
  const pickSort = (k: SortKey) => {
    if (sort === k) update({ sens: asc ? "desc" : "asc" });
    else setSort(k);
  };
  const setAsc = (v: boolean) => update({ sens: v === (NATURAL[sort] === "asc") ? undefined : v ? "asc" : "desc" });

  const managers = useMemo(() => [...new Set(rows.map((r) => r.manager))].sort((a, b) => a.localeCompare(b, "fr")), [rows]);
  // What the typed letters match: management companies (a filter) and funds (a search); a tap applies it.
  const [typing, setTyping] = useState(false);
  // Toucher une suggestion valide la recherche : le clavier se retire et la liste paraît.
  const { input: searchInput, list: searchList, commit: commitSearch } = useSearchCommit<HTMLInputElement, HTMLElement>();
  const suggestions = useMemo(() => {
    const d = fold(draft.trim());
    if (!typing || d.length < 2) return [] as { kind: "gestion" | "fonds"; text: string }[];
    const out: { kind: "gestion" | "fonds"; text: string }[] = [];
    for (const m of managers) if (fold(m).includes(d) && m !== manager) out.push({ kind: "gestion", text: m });
    for (const r of rows) if (fold(r.title).includes(d) && fold(r.title) !== d) out.push({ kind: "fonds", text: r.title });
    return out.slice(0, 8);
  }, [draft, typing, managers, manager, rows]);
  const freqs = useMemo(() => [...new Set(rows.map((r) => r.frequency))].filter((f) => f !== "?"), [rows]);

  const filtered = useMemo(() => {
    const ql = fold(draft.trim());
    const list = rows.filter((r) => (!cat || r.category === cat) && (!manager || r.manager === manager) && (!freq || r.frequency === freq) && (!ql || fold(`${r.title} ${r.manager} ${r.depositary}`).includes(ql)));
    const cmp = (a: FundRow, b: FundRow) => {
      switch (sort) {
        case "nom":
          return a.title.localeCompare(b.title, "fr");
        case "gestion":
          return a.manager.localeCompare(b.manager, "fr") || a.title.localeCompare(b.title, "fr");
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
    // « par catégorie » est un rangement, pas une mesure : il garde son ordre.
    const dir = sort === "categorie" ? 1 : asc ? 1 : -1;
    return [...list].sort((a, b) => dir * cmp(a, b));
  }, [rows, draft, cat, manager, freq, sort, asc]);

  const rowsShown = sort === "categorie" ? CATS.flatMap((c) => filtered.filter((r) => r.category === c)) : filtered;
  // L'en-tête d'une colonne est déjà le nom de ce qu'on veut trier : une
  // fonction, pas un composant, qu'un composant déclaré dans le rendu
  // reperdrait son état à chaque passage.
  const sortTh = (k: SortKey, label: React.ReactNode, cls?: string) => (
    <th className={cls} aria-sort={sort === k ? (asc ? "ascending" : "descending") : "none"}>
      <button type="button" className={`${styles.sortTh} ${sort === k ? styles.sortOn : ""}`} onClick={() => pickSort(k)} title={sort === k ? t("Inverser l'ordre") : t("Trier par cette colonne")}>
        {label}
        <i aria-hidden="true">{sort === k ? (asc ? "↑" : "↓") : "↕"}</i>
      </button>
    </th>
  );
  const familiesOpen = useSyncExternalStore(subscribeFamilies, readFamilies, () => true);
  const active = Number(Boolean(cat)) + Number(Boolean(manager)) + Number(Boolean(freq));

  // Remember this list (URL + order shown) so a fund's page can bring the reader back and step to the next fund.
  const listUrl = `${pathname}${sp.toString() ? `?${sp}` : ""}`;
  const orderKey = rowsShown.map((r) => r.id).join(",");
  useEffect(() => {
    rememberList({ url: listUrl, ids: orderKey.split(",").filter(Boolean), label: "Tous les fonds", titles: rowsShown.map((r) => r.title) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listUrl, orderKey]);
  useListScroll(listUrl);

  // The controls are not frozen any more: once they scroll out above, a floating « Filtrer · Trier » brings them back over the list.
  const phone = usePhone();
  const sep = useDistinction();
  const toolsRef = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState(false);

  // The controls, once: in the page, and again in the sheet the floating button
  // opens. La boîte de tri ne paraît que dans la feuille : sur un écran large,
  // le tableau porte ses colonnes et c'est d'elles qu'on trie ; sur téléphone
  // il n'y a pas de colonnes, donc la boîte reste le seul moyen.
  const toolbar = (withSort: boolean) => (
    <div className={styles.toolbar}>
      <div className={styles.search}>
        {manager && (
          <button type="button" className={styles.managerTag} onClick={() => setManager("")} title={t("Retirer ce filtre")}>
            {manager} ×
          </button>
        )}
        <input
          ref={searchInput}
          type="search"
          placeholder={manager ? t("Un fonds de cette société…") : t("Un fonds, une société de gestion, un dépositaire")}
          aria-label={t("Rechercher")}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setTyping(true);
          }}
          onFocus={() => setTyping(true)}
          onBlur={() => window.setTimeout(() => setTyping(false), 150)}
          autoComplete="off"
        />
        {suggestions.length > 0 && (
          <ul className={styles.suggest} role="listbox">
            {suggestions.map((sug) => (
              <li key={sug.kind + sug.text}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    commitSearch(() => {
                      setTyping(false);
                      if (sug.kind === "gestion") update({ gestion: sug.text, q: undefined });
                      else setQ(sug.text);
                    })
                  }
                >
                  <em>{t(sug.kind === "gestion" ? "Gestion" : "Fonds")}</em>
                  <b>{sug.text}</b>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
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
      <Select className={styles.fixedSm} value={freq} onChange={(v) => setFreq(v as FundNav["frequency"] | "")} label={t("VL")} options={[{ value: "", label: t("toute périodicité") }, ...freqs.map((f) => ({ value: f, label: t(FUND_FREQUENCY_LABEL[f]) }))]} />
      {withSort && (
        <label className={styles.sort}>
          {t("Tri")}
          <Select compact value={sort} onChange={(v) => setSort(v as SortKey)} options={SORT.map(([k, l]) => ({ value: k, label: t(l) }))} />
          {sort !== "categorie" && (
            <button type="button" className={styles.dir} onClick={() => setAsc(!asc)} aria-label={t(asc ? "Ordre croissant" : "Ordre décroissant")} title={t("Inverser l'ordre")}>
              {asc ? "↑" : "↓"}
            </button>
          )}
        </label>
      )}
      {!desk && <DensitySwitch className={styles.density} />}
    </div>
  );

  return (
    <>
      <section className={`${styles.families} ${familiesOpen ? "" : styles.familiesClosed}`} aria-label={t("Les quatre catégories de fonds")} data-coach="fonds-familles">
        <div className={styles.familiesHead}>
          <button type="button" className={styles.familiesToggle} onClick={() => setFamilies(!familiesOpen)} aria-expanded={familiesOpen}>
            <h2>{t("Quatre catégories, quatre façons de placer")}</h2>
            <svg viewBox="0 0 24 24" aria-hidden="true" className={familiesOpen ? styles.chevOpen : undefined}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {familiesOpen && <Link href="/info/fonds-vl">{t("Leçon : la VL et les frais")} →</Link>}
        </div>
        {familiesOpen && (
          <div className={styles.familiesGrid}>
            {CATS.filter((c) => c !== "?").map((c) => (
              <button key={c} type="button" className={`${styles.family} ${cat === c ? styles.familyOn : ""}`} aria-pressed={cat === c} onClick={() => setCat(cat === c ? "" : c)} data-cat={c}>
                <b>
                  <i className={styles.familyDot} aria-hidden="true" />
                  {t(FUND_CATEGORY_LABEL[c])} <em>· {rows.filter((r) => r.category === c).length}</em>
                </b>
                <span>{t(BLURB[c])}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      <div className={styles.tools} data-coach="fonds-filtres" ref={toolsRef}>
        <div className={styles.deskTools}>{toolbar(false)}</div>
        <FilterLine count={active + Number(Boolean(draft))} summary={[draft && `« ${draft} »`, cat && t(FUND_CATEGORY_LABEL[cat]), manager, freq && t(FUND_FREQUENCY_LABEL[freq])].filter(Boolean).join(" · ")} sortLabel={t(SORT.find(([k]) => k === sort)?.[1] ?? "")} onOpen={() => setSheet(true)} />
        <div className={styles.count}>
          <b>{filtered.length}</b> {cat ? t(`${t(FUND_CATEGORY_LABEL[cat])}s`).toLowerCase() : t("fonds")}
          {active > 0 || draft ? ` ${t("correspondant aux filtres")}` : ""}
          {cat && <span className={styles.countHint}> : {t(BLURB[cat])}</span>}
          {sort !== "categorie" && (
            <button type="button" className={styles.clear} onClick={() => setSort("categorie")}>
              {t("Par catégorie")}
            </button>
          )}
          {(active > 0 || draft) && (
            <button type="button" className={styles.clear} onClick={clearAll}>
              {t("Effacer")}
            </button>
          )}
        </div>
      </div>
      {/* The same controls, brought back over the list from the floating button: the page keeps its place. */}
      <FilterFab watch={toolsRef} onClick={() => setSheet(true)} count={active + Number(Boolean(draft))} open={sheet} />
      <Sheet open={sheet} onClose={() => setSheet(false)} title={t("Filtrer et trier")}>
        <div className={styles.sheetTools}>{toolbar(true)}</div>
        <div className={styles.sheetFoot}>
          <span>
            <b>{filtered.length}</b> {t("fonds")}
          </span>
          {(active > 0 || draft) && (
            <button type="button" className="btn sm ghost" onClick={clearAll}>
              {t("Effacer")}
            </button>
          )}
          <button type="button" className="btn sm primary" onClick={() => setSheet(false)}>
            {t("Voir")}
          </button>
        </div>
      </Sheet>

      {rowsShown.length > 0 && phone && (
        <section className={styles.cards} data-coach="fonds-table" data-sep={sep} ref={searchList}>
          {rowsShown.map((r) => (
            <FundCard key={r.id} r={r} />
          ))}
        </section>
      )}
      {rowsShown.length > 0 && !phone && (
        <section className={styles.group} data-coach="fonds-table">
          <div className="scroll-x">
            <table className={styles.tbl}>
              <thead>
                <tr>
                  {sortTh("nom", t("Fonds"))}
                  {sortTh("gestion", t("Société de gestion · dépositaire"), styles.hideSm)}
                  <th className={styles.r}>
                    <button type="button" className={`${styles.sortTh} ${sort === "vl" ? styles.sortOn : ""}`} onClick={() => pickSort("vl")} title={sort === "vl" ? t("Inverser l'ordre") : t("Trier par cette colonne")}>
                      {t("VL (FCFA)")}
                      <i aria-hidden="true">{sort === "vl" ? (asc ? "↑" : "↓") : "↕"}</i>
                    </button>{" "}
                    <Info term="vl" subtle />
                    <br />
                    <button type="button" className={`${styles.sortTh} ${styles.sortThSub} ${sort === "date" ? styles.sortOn : ""}`} onClick={() => pickSort("date")} title={t("Trier par date de VL")}>
                      {t("date")}
                      <i aria-hidden="true">{sort === "date" ? (asc ? "↑" : "↓") : "↕"}</i>
                    </button>
                  </th>
                  <th className={styles.r}>
                    <button type="button" className={`${styles.sortTh} ${sort === "var" ? styles.sortOn : ""}`} onClick={() => pickSort("var")} title={sort === "var" ? t("Inverser l'ordre") : t("Trier par cette colonne")}>
                      {t("Var.")}
                      <i aria-hidden="true">{sort === "var" ? (asc ? "↑" : "↓") : "↕"}</i>
                    </button>{" "}
                    <Info term="variation_vl" subtle />
                  </th>
                  {sortTh("an", t("12 mois"), styles.r)}
                  {/* Les frais de gestion sont prélevés dans la VL : la performance
                      affichée en est déjà nette, mais c'est le coût qui décide de ce
                      qu'un épargnant garde sur cinq ans, et personne ne le publie. */}
                  <th className={styles.r}>{t("Frais/an")}</th>
                  {sortTh("origine", t("Depuis l'origine"), `${styles.r} ${styles.hideSm}`)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rowsShown.map((r) => (
                  <FundTr key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {filtered.length === 0 && <div className="empty">{t("Aucun fonds ne correspond à ces filtres.")}</div>}
      {!desk && <CoachMarks
        id="fonds"
        replayLabel={t("Comment lire cette page ?")}
        stops={[
          { target: "fonds-familles", title: t("Quatre catégories"), text: t("Monétaire, obligataire, diversifié, actions : du plus calme au plus mobile. Chaque carte explique la catégorie en une phrase et filtre le tableau ; repliez le bandeau quand vous le connaissez.") },
          { target: "fonds-filtres", title: t("Trouver un fonds"), text: t("Un nom, une société de gestion, un dépositaire ; la catégorie, la périodicité de la VL ; le tri. Quand la bande est sortie de l'écran, le bouton « Filtrer · Trier » en bas la ramène sans remonter.") },
          { target: "fonds-table", title: t("Lire une ligne"), text: t("Dernière VL et sa date, la variation depuis la VL précédente, la performance sur douze mois et depuis l'origine. « Voir la fiche » donne l'historique des VL et le formulaire de souscription ; le « ··· » suit, compare, partage.") },
        ]}
      />}
    </>
  );
}
