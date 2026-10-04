"use client";

import { fold } from "@/lib/text";
import { useSearchCommit } from "@/lib/ui/commit-search";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Info } from "@/components/Info";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { DensitySwitch, useDistinction } from "@/components/Density";
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
  /**
   * TOUT EST À PLAT, IL N'Y A PLUS DE FEUILLE.
   *
   * La page avait deux feuilles — « Filtrer » et « Trier » — et un bouton
   * flottant pour les rappeler. Or tout ce qu'elles contenaient tient en deux
   * rangées de pastilles et un sélecteur : quatre catégories, quatre
   * périodicités, huit ordres. Une feuille se justifie quand les commandes ne
   * tiennent pas sous les yeux ; ici elles tenaient, et la feuille n'ajoutait
   * qu'un geste et un état à retenir devant chaque filtre.
   *
   * Ce qui est parti avec elles : « cible », pour savoir laquelle s'ouvrait ;
   * « ancre », pour la faire tomber de son déclencheur ; « FilterFab », le
   * bouton flottant ; et « toolbar », la rangée écrite une fois pour la page
   * et une fois pour la feuille, qui était le vrai motif de cette mécanique.
   *
   * CE QUI RESTE PASTILLE, c'est ce qu'aucune rangée ne montre : la société de
   * gestion, qui ne s'obtient qu'en touchant une suggestion du champ. La
   * catégorie et la périodicité se retirent là où elles se prennent, en
   * touchant « Toutes » ou la pastille déjà enfoncée ; les répéter en dessous
   * aurait dit deux fois la même chose à deux centimètres d'écart.
   */
  const actifs: { clef: string; quoi?: string; valeur: string; retirer: () => void }[] = [];
  if (manager) actifs.push({ clef: "gestion", quoi: "Gestion", valeur: manager, retirer: () => setManager("") });

  /**
   * LA BARRE DE RECHERCHE, TOUJOURS VISIBLE.
   *
   * Le champ vivait dans la barre d'outils : montré sur grand écran, ENFERMÉ
   * DANS LA FEUILLE DES FILTRES sur téléphone. Chercher « Harvest » demandait
   * donc d'ouvrir les filtres, alors que taper trois lettres est le geste le
   * plus direct de cette page. Il en sort et devient la barre.
   *
   * Il cherche dans les trois choses qu'on tape — un nom de fonds, une société
   * de gestion, un dépositaire — et propose en dessous ce qu'il reconnaît, en
   * disant de quoi il s'agit : « Gestion » n'est pas « Fonds », et toucher
   * l'un FILTRE quand l'autre CHERCHE.
   *
   * LA PASTILLE DE LA SOCIÉTÉ DE GESTION A QUITTÉ LE CHAMP. Elle y était
   * posée à gauche du curseur, et elle est désormais dans la rangée des
   * filtres actifs, avec les autres : la garder aux deux endroits aurait
   * montré « Harvest » deux fois à trois centimètres d'écart, dont une fois
   * sans dire que c'est un filtre de société.
   */
  const recherche = (
    <div className={styles.search}>
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
  );

  /**
   * LES DEUX FILTRES, À PLAT.
   *
   * La catégorie était une grille encadrée de quatre tuiles, la périodicité
   * une liste déroulante : deux formes différentes pour deux choix de même
   * nature, et la seconde cachait ses quatre valeurs derrière un geste. Les
   * voici dans la même forme, l'une sous l'autre, chaque valeur visible et
   * chaque rangée dite par son étiquette.
   *
   * CHAQUE RANGÉE PORTE SON « TOUTES », qui est la sortie : on retire un
   * filtre là où on l'a pris, sans aller chercher ailleurs de quoi l'annuler.
   * Toucher la pastille déjà enfoncée fait la même chose, pour qui s'attend à
   * ce qu'un interrupteur s'éteigne comme il s'allume.
   *
   * Les valeurs viennent des lignes reçues, pas d'une liste écrite d'avance :
   * une périodicité que personne ne pratique n'a pas de pastille, et un filtre
   * ne mène donc jamais à une liste vide.
   */
  const rangee = (etiquette: string, valeur: string, toutes: string, options: [string, string][], choisir: (v: string) => void) => (
    <div className={styles.rangee} role="group" aria-label={t(etiquette)}>
      <span className={styles.quoi}>{t(etiquette)}</span>
      <button type="button" className={`${styles.pst} ${valeur === "" ? styles.pstOn : ""}`} aria-pressed={valeur === ""} onClick={() => choisir("")}>
        {t(toutes)}
      </button>
      {options.map(([v, l]) => (
        <button key={v} type="button" className={`${styles.pst} ${valeur === v ? styles.pstOn : ""}`} aria-pressed={valeur === v} onClick={() => choisir(valeur === v ? "" : v)}>
          {t(l)}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className={styles.tools} data-coach="fonds-filtres" ref={toolsRef}>
        {/* UN CHAMP, DEUX RANGÉES, PUIS CE QUE LA LISTE DIT D'ELLE-MÊME.
            Rien derrière un bouton, rien dans une feuille : tout ce qui
            commande cette liste est sous les yeux, du champ au tri. */}
        <div className={styles.barre}>{recherche}</div>
        <div className={styles.aplat}>
          {rangee(
            "Catégorie",
            cat,
            "Toutes",
            CATS.filter((c) => c !== "?" && rows.some((r) => r.category === c)).map((c) => [c, FUND_CATEGORY_LABEL[c]]),
            (v) => setCat(v as FundNav["category"] | ""),
          )}
          {rangee("VL", freq, "Toutes", freqs.map((f) => [f, FUND_FREQUENCY_LABEL[f]]), (v) => setFreq(v as FundNav["frequency"] | ""))}
          {actifs.map((f) => (
            <div key={f.clef} className={styles.rangee}>
              <span className={styles.quoi}>{t(f.quoi ?? "")}</span>
              <button type="button" className={`${styles.pst} ${styles.pstOn}`} onClick={f.retirer} aria-label={`${t("Retirer ce filtre")} : ${f.valeur}`}>
                {f.valeur} <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
        </div>
        <div className={styles.count}>
          <b>{filtered.length}</b> {cat ? t(`${t(FUND_CATEGORY_LABEL[cat])}s`).toLowerCase() : t("fonds")}
          {active > 0 || draft ? ` ${t("correspondant aux filtres")}` : ""}
          {(active > 0 || draft) && (
            <button type="button" className={styles.clear} onClick={clearAll}>
              {t("Tout effacer")}
            </button>
          )}
          {/* LE TRI, COMME SUR LES TITRES : son nom, la liste des ordres, et la
              flèche qui retourne celui-ci. Il était dans la feuille, où il
              fallait le chercher ; il est maintenant à côté du compte des
              lignes qu'il range, sur les deux pages de la même façon.
              La flèche ne paraît pas sur « par catégorie », qui est un
              rangement et non une mesure : il n'y a pas de sens à inverser. */}
          <label className={styles.sortSel}>
            {t("Tri")}
            <Select compact value={sort} onChange={(v) => setSort(v as SortKey)} options={SORT.map(([k, l]) => ({ value: k, label: t(l) }))} />
            {sort !== "categorie" && (
              <button type="button" className={styles.dirBtn} onClick={() => setAsc(!asc)} aria-label={t(asc ? "Ordre croissant" : "Ordre décroissant")} title={t("Inverser l'ordre")}>
                {asc ? "↑" : "↓"}
              </button>
            )}
          </label>
          {/* LE RESSERREMENT DES CARTES, comme sur les titres : il ne paraît
              que sur la vue qui en a une, parce qu'un réglage sans effet
              visible se lit comme une panne. */}
          {vue === "cards" && !desk && <DensitySwitch />}
          <div className={styles.seg} role="group" aria-label={t("Affichage")}>
            {(["table", "list", "cards"] as Vue[]).map((v) => (
              <button key={v} type="button" aria-pressed={vue === v} onClick={() => update({ vue: v })}>
                {t(v === "table" ? "Tableau" : v === "list" ? "Liste" : "Cartes")}
              </button>
            ))}
          </div>
        </div>
      </div>

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
          { target: "fonds-filtres", title: t("Trouver un fonds"), text: t("Le champ cherche dans trois choses : un nom de fonds, une société de gestion, un dépositaire. En dessous, la catégorie et la périodicité de la VL sont à plat, toutes leurs valeurs visibles : « Toutes » retire le filtre. Le tri est à droite du compte, avec la flèche qui retourne l'ordre.") },
          { target: "fonds-table", title: t("Lire une ligne"), text: t("Dernière VL et sa date, la variation depuis la VL précédente, la performance sur douze mois et depuis l'origine. « Voir la fiche » donne l'historique des VL et le formulaire de souscription ; le « ··· » suit, compare, partage.") },
        ]}
      />}
    </>
  );
}
