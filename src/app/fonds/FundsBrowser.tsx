"use client";

import { fold } from "@/lib/text";
import { useSearchCommit } from "@/lib/ui/commit-search";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
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
import type { FundCurve } from "@/lib/domain/fund-curve";

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
  /** Les VL à dessiner au dos de la carte, lues avec la page. */
  curve?: FundCurve;
}

/**
 * Les mêmes trois vues que les titres, sous la même clef d'URL et les mêmes
 * trois mots. La page n'en offrait aucune : un tableau sur grand écran, des
 * cartes sur téléphone, et le lecteur n'avait pas le choix. Deux listes qui
 * s'apprennent séparément sont deux apprentissages.
 */
type Vue = "table" | "list" | "cards";

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
/* LES PHRASES DES CATÉGORIES ONT DÉMÉNAGÉ dans « FondsEnBref ». Le bandeau
   qui les portait en haut de page occupait la première moitié de l'écran à
   chaque visite ; il se repliait, et il fallait donc retenir son état d'un
   passage à l'autre, dans le stockage local, avec son abonnement et ses
   écouteurs. Plus de bandeau, plus de replieur, plus de mémoire à tenir.
   « CATS » reste : il donne l'ordre des catégories au tri et aux pastilles. */

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
 * Une rangée de la vue Liste : le fonds d'un trait, sans colonnes.
 *
 * Elle porte ce qui décide et rien d'autre : le nom, la catégorie, la
 * PÉRIODICITÉ DE LA VL, la société de gestion, la valeur liquidative avec sa
 * date, et les douze mois. La périodicité est là parce qu'elle dit dans combien
 * de temps une souscription sera centralisée, et à quelle VL : sans elle on
 * lit un prix sans savoir quand on l'obtient.
 */
function FundLi({ r }: { r: FundRow }) {
  const t = useT();
  const href = useLineHref()(r.id);
  const desk = useDeskView();
  return (
    <li className={styles.li}>
      <span className={styles.liName}>
        <Link href={href}>{r.title}</Link>
        <small>
          {t(FUND_CATEGORY_LABEL[r.category])} · {t(FUND_FREQUENCY_LABEL[r.frequency])} · {r.manager}
        </small>
      </span>
      <span className={styles.liNav}>
        <b>{fmt(r.nav)}</b>
        <small className="muted">
          {t("au")} {fmtDate(r.navDate, false)}
        </small>
      </span>
      <span className={`${styles.liPerf} ${cls(r.perf1yPct)}`}>
        <b>{signed(r.perf1yPct)}</b>
        <small className="muted">{t("12 mois")}</small>
      </span>
      <span className={styles.rowBtns}>
        <Link className="btn sm ghost" href={href}>
          {t(desk ? "Voir la ligne" : "Voir la fiche")}
        </Link>
        {!desk && <LineMenu line={{ id: r.id, title: r.title, isin: r.isin, sub: `${r.manager} · VL ${fmt(r.nav)} FCFA` }} />}
      </span>
    </li>
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
  const vueChoisie = sp.get("vue") as Vue | null;
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
  //
  // L'attente compte. Au desk, la page se rend à chaque requête, et l'adresse
  // met une seconde ou deux à changer : une écriture partie trois lettres plus
  // tôt atterrissait après la suivante, et comme on ne se souvenait que de la
  // dernière, elle passait pour une adresse venue d'ailleurs. Le champ reculait
  // alors d'une lettre, parfois de trois. « corridor » tapé posément y devenait
  // « corrid ».
  //
  // Deux corrections. L'écriture passe par une transition, donc on sait qu'une
  // est en vol et on ne relit pas l'adresse pendant ce temps. Et la pause passe
  // de 180 à 400 ms, plus longue que l'hésitation d'un doigt : une frappe posée
  // ne déclenche plus un rendu complet par lettre.
  const [draft, setDraft] = useState(q);
  const pushed = useRef(q);
  const [pushing, startPush] = useTransition();
  useEffect(() => {
    if (draft === pushed.current) return;
    const id = window.setTimeout(() => {
      pushed.current = draft;
      startPush(() => update({ q: draft || undefined }));
    }, 400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  // Un retour arrière, un lien ouvert : l'adresse a changé sans nous. Jamais
  // pendant qu'une de nos écritures est en vol, sans quoi c'est la nôtre, en
  // retard, qu'on prendrait pour celle d'un autre.
  useEffect(() => {
    if (pushing) return;
    if (q !== pushed.current) {
      pushed.current = q;
      setDraft(q);
    }
  }, [q, pushing]);
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
  const active = Number(Boolean(cat)) + Number(Boolean(manager)) + Number(Boolean(freq));

  // Remember this list (URL + order shown) so a fund's page can bring the reader back and step to the next fund.
  const listUrl = `${pathname}${sp.toString() ? `?${sp}` : ""}`;
  const orderKey = rowsShown.map((r) => r.id).join(",");
  useEffect(() => {
    rememberList({ url: listUrl, ids: orderKey.split(",").filter(Boolean), label: "Tous les fonds", titles: rowsShown.map((r) => r.title), peeks: rowsShown.map((r) => ({ stamp: t(r.open ? "Souscription ouverte" : "Information"), tone: r.open ? "open" : "quoted", sub: `${t(FUND_CATEGORY_LABEL[r.category])} · ${r.manager}`, hero: `VL ${fmt(r.nav)}`, unit: "FCFA" })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listUrl, orderKey]);
  useListScroll(listUrl);

  // The controls are not frozen any more: once they scroll out above, a floating « Filtrer · Trier » brings them back over the list.
  const phone = usePhone();
  // Le téléphone garde sa carte par défaut, l'ordinateur son tableau : c'est ce
  // que la page faisait déjà. Ce qui change est qu'un choix explicite l'emporte,
  // et qu'il tient dans l'adresse comme sur les titres.
  const vue: Vue = vueChoisie ?? (phone ? "cards" : "table");
  const sep = useDistinction();
  const toolsRef = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState(false);
  /* LA FEUILLE S OUVRE SUR LA PARTIE DEMANDEE. « Filtres » et « Trier »
     menaient au meme endroit, en haut de la meme feuille : qui voulait
     changer le tri devait traverser quatre filtres pour l atteindre. */
  const [cible, setCible] = useState<"filtres" | "tri">("filtres");

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
      <div className={styles.tools} data-coach="fonds-filtres" ref={toolsRef}>
        <div className={styles.deskTools}>{toolbar(false)}</div>
        <FilterLine count={active + Number(Boolean(draft))} summary={[draft && `« ${draft} »`, cat && t(FUND_CATEGORY_LABEL[cat]), manager, freq && t(FUND_FREQUENCY_LABEL[freq])].filter(Boolean).join(" · ")} sortLabel={t(SORT.find(([k]) => k === sort)?.[1] ?? "")} onOpen={(cible) => { setCible(cible); setSheet(true); }} />
        <div className={styles.count}>
          <b>{filtered.length}</b> {cat ? t(`${t(FUND_CATEGORY_LABEL[cat])}s`).toLowerCase() : t("fonds")}
          {active > 0 || draft ? ` ${t("correspondant aux filtres")}` : ""}
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
          <div className={styles.seg} role="group" aria-label={t("Affichage")}>
            {(["table", "list", "cards"] as Vue[]).map((v) => (
              <button key={v} type="button" aria-pressed={vue === v} onClick={() => update({ vue: v })}>
                {t(v === "table" ? "Tableau" : v === "list" ? "Liste" : "Cartes")}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* The same controls, brought back over the list from the floating button: the page keeps its place. */}
      <FilterFab watch={toolsRef} onClick={() => setSheet(true)} count={active + Number(Boolean(draft))} open={sheet} />
      {/* DEUX FEUILLES, PARCE QUE CE SONT DEUX ACTIONS. Filtrer retire des
          lignes, trier les remet dans un autre ordre : une seule feuille
          intitulée « Filtrer et trier » obligeait à traverser quatre filtres
          pour changer un ordre, et le bouton « Tri » y menait au même endroit
          que le bouton « Filtres ». */}
      <Sheet open={sheet && cible === "tri"} onClose={() => setSheet(false)} title={t("Trier")} sub={t("{n} fonds", { n: filtered.length })}>
        <div className={styles.triListe} role="radiogroup" aria-label={t("Trier")}>
          {SORT.map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={sort === k} className={sort === k ? styles.triOn : undefined} onClick={() => setSort(k)}>
              <span>{t(l)}</span>
              {sort === k && k !== "categorie" && (
                <em>{t(asc ? "du plus petit au plus grand" : "du plus grand au plus petit")}</em>
              )}
            </button>
          ))}
        </div>
        <div className={styles.sheetFoot}>
          {sort !== "categorie" && (
            <button type="button" className="btn sm ghost" onClick={() => setAsc(!asc)}>
              {asc ? "↑" : "↓"} {t("Inverser l'ordre")}
            </button>
          )}
          <button type="button" className="btn sm primary" onClick={() => setSheet(false)}>
            {t("Voir")}
          </button>
        </div>
      </Sheet>
      <Sheet open={sheet && cible === "filtres"} onClose={() => setSheet(false)} title={t("Filtrer")}>
        <div className={styles.sheetTools}>{toolbar(false)}</div>
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

      {rowsShown.length > 0 && vue === "cards" && (
        <section className={styles.cards} data-coach="fonds-table" data-sep={sep} ref={searchList}>
          {rowsShown.map((r) => (
            <FundCard key={r.id} r={r} />
          ))}
        </section>
      )}
      {rowsShown.length > 0 && vue === "list" && (
        <ul className={styles.list} data-coach="fonds-table" ref={searchList as React.RefObject<HTMLUListElement>}>
          {rowsShown.map((r) => (
            <FundLi key={r.id} r={r} />
          ))}
        </ul>
      )}
      {rowsShown.length > 0 && vue === "table" && (
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
          { target: "fonds-enbref", title: t("Quatre catégories"), text: t("Monétaire, obligataire, diversifié, actions : du plus calme au plus mobile. « En bref » les définit en une phrase chacune, avec le nombre de fonds, et rappelle ce qu'est un OPCVM agréé.") },
          { target: "fonds-filtres", title: t("Trouver un fonds"), text: t("Un nom, une société de gestion, un dépositaire ; la catégorie, la périodicité de la VL ; le tri. Quand la bande est sortie de l'écran, le bouton « Filtrer · Trier » en bas la ramène sans remonter.") },
          { target: "fonds-table", title: t("Lire une ligne"), text: t("Dernière VL et sa date, la variation depuis la VL précédente, la performance sur douze mois et depuis l'origine. « Voir la fiche » donne l'historique des VL et le formulaire de souscription ; le « ··· » suit, compare, partage.") },
        ]}
      />}
    </>
  );
}
