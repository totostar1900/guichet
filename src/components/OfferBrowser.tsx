"use client";

import { fold } from "@/lib/text";
import { useSearchCommit } from "@/lib/ui/commit-search";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DisplayStatus, Offer } from "@/lib/domain/types";
import { displayStatus, FAMILIES, familyLabel, familySegment, familyShort, headlineYield, isActionable, KIND_LABEL, type MarketSegment, offerFamily, SEGMENT_LABEL, tenorYears, clientStatusGroup } from "@/lib/domain/status";
import { COUNTRY_CODE, summarize, type OfferSummary } from "@/lib/domain/summary";
import { parseDate } from "@/lib/finance";
import { OfferCard } from "./OfferCard";
import { MarketToggles, TitresHead } from "./MarketToggles";
import { CoachMarks } from "./mobile/CoachMarks";
import { DensitySwitch, useDistinction } from "./Density";
import { BackToTop } from "./BackToTop";
import { SectionChips } from "./SectionChips";
import { DureeGauge, dureeRangeLabel, dureeRangeParam, parseDureeRange } from "./DureeRange";
import { NuageTitres } from "./market/NuageTitres";
import { BandeauRepliable } from "./market/BandeauRepliable";
import { fmtPct } from "@/lib/format";
import { estMesure, MESURE_PAR_DEFAUT, type MesureNuage } from "@/lib/domain/nuage";
import { TeteGroupe, type Groupe } from "./market/TeteGroupe";
import { nomsCourts } from "@/lib/domain/nom-court";
import { Dropdown } from "./market/Dropdown";
import { SECTIONS, SECTION_LABEL, sectionDe, type Lieu, type Section } from "@/lib/domain/sections";
import { usePhone } from "./chart-utils";
import { FoldAll, useFold } from "./Fold";
import { issuerKey, issuerZone, type IssuerZone } from "@/data/issuer-registry";
import { LineMenu } from "./mobile/LineMenu";
import { useDeskView, useLineHref } from "./DeskView";
import { Sheet } from "./mobile/Sheet";
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
  ["closed", "Clôturées"],
];
/**
 * DEUX RANGEMENTS, PAS UNE CASE À COCHER. « Grouper par émetteur » cochée ou
 * non laissait croire qu'il n'y a qu'une façon de ranger et qu'on l'ajoute ;
 * sur les adjudications il y en a deux, et l'une des deux est toujours en
 * vigueur.
 */
const GROUPEMENTS: [string, string][] = [
  /* UN MOT CHACUN : le bouton répète la valeur choisie à côté de son nom, et
     « Grouper · Type de titre » prenait 187 px des 384 d'un téléphone, ce qui
     renvoyait « Tout effacer » à la ligne. « Grouper » dit déjà qu'il s'agit
     d'un rangement ; « Type » suffit à dire lequel. */
  ["type", "Type"],
  ["emetteur", "Émetteur"],
  /* « Aucun » est une valeur, pas l'absence d'une valeur : sans elle, il n'y
     avait aucun moyen d'obtenir la liste à plat, « Effacer » ramenant sur
     « Type », qui est un rangement comme les autres. */
  ["aucun", "Aucun"],
];
const TENORS: [string, string][] = [
  ["lt1", "Moins d'un an"],
  ["1-3", "1 à 3 ans"],
  ["gt3", "Plus de 3 ans"],
  ["eq", "Actions et fonds"],
];
export type SortKey = "deadline" | "yield" | "coupon" | "tenor" | "minimum" | "title" | "issuer";
type Dir = "asc" | "desc";
type View = "table" | "list" | "cards";
/**
 * UN SEUL ORDRE POUR LES TROIS VUES, ET UN SEUL ENDROIT QUI LE DIT.
 *
 * Le sélecteur existe à deux endroits : la barre d'outils, qui disparaît sous
 * 760 px, et la feuille de filtres, qui est alors le seul chemin. Les deux
 * listes étaient écrites à la main, et dans l'ordre inverse l'une de l'autre :
 * « Tableau · Liste · Cartes » dans la barre, « Cartes · Liste · Tableau » dans
 * la feuille. Chacune mettait sa vue par défaut en tête, ce qui explique la
 * dérive sans l'excuser.
 *
 * Mesuré le 4 octobre 2026 : un téléphone fait 390 px debout et 844 px couché,
 * donc il TRAVERSE la bascule des 760. On tourne l'appareil, les trois boutons
 * sont dans l'autre sens, et le geste appris choisit une autre vue. La vue
 * active se marque déjà par `aria-pressed` : ni l'une ni l'autre n'avait besoin
 * de mettre sa favorite en tête.
 */
const VIEWS: View[] = ["table", "list", "cards"];
const VIEW_LABEL: Record<View, string> = { table: "Tableau", list: "Liste", cards: "Cartes" };
/* « Date de clôture » et non « clôture la plus proche » : le second nommait
   l'ordre, pas la colonne, et un ordre se renverse — « la plus proche »
   devenait faux dès qu'on inversait la flèche. « Plus récent » est parti : il
   range sur la date d'entrée au référentiel, qui ne dit rien de la ligne. */
const SORT_LABEL: Record<SortKey, string> ={ deadline: "Date de clôture", yield: "rendement", coupon: "coupon", tenor: "échéance", minimum: "ticket minimum", title: "nom", issuer: "émetteur" };
const ORDER: Record<DisplayStatus, number> = { closing: 0, open: 1, upcoming: 2, quoted: 2, on_request: 3, results: 4, closed: 4, live: 5, matured: 6 };

const normStatus = (s: DisplayStatus): string => clientStatusGroup(s);
const parseNum = (s: string) => Number(s.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;

/* La liste déroulante d'un filtre a déménagé dans « market/Dropdown » : la
   page des fonds voulait la même pour la périodicité des VL, et deux listes
   qui se commandent pareil doivent être le même objet. */

/* ---------- grouping ---------- */
type Row = { o: Offer; s: OfferSummary };
/** Rows in their current order, bucketed by issuer (first appearance keeps the sort). */
/** Groups follow the issuer registry: one head for a borrower's spellings, its zone (a country, or CEMAC) on the flag. */
/**
 * LES SECTIONS, DANS L'ORDRE DU LIEU, Y COMPRIS LES VIDES.
 *
 * Une section sans ligne garde son titre et son zéro : la règle de la maison
 * est que l'absence se voie. « En souscription · aucune émission ouverte » dit
 * quelque chose ; une section escamotée laisse croire qu'elle n'existe pas.
 */
function groupBySection(rows: Row[], lieu: Lieu): { section: Section; rows: Row[] }[] {
  const par = new Map<Section, Row[]>();
  for (const x of SECTIONS[lieu]) par.set(x, []);
  for (const r of rows) par.get(sectionDe(r.o))?.push(r);
  return SECTIONS[lieu].map((section) => ({ section, rows: par.get(section) ?? [] }));
}

function groupByIssuer(rows: Row[]): { issuer: string; zone: IssuerZone; countryName: string; rows: Row[] }[] {
  const out: { issuer: string; zone: IssuerZone; countryName: string; rows: Row[] }[] = [];
  const idx = new Map<string, number>();
  for (const r of rows) {
    const k = issuerKey(r.o);
    if (!idx.has(k)) {
      idx.set(k, out.length);
      const zone = issuerZone(r.o);
      out.push({ issuer: k, zone, countryName: zone === "CEMAC" ? "Institution de la CEMAC" : r.o.countryName, rows: [] });
    }
    out[idx.get(k)!].rows.push(r);
  }
  return out;
}
/**
 * Le titre d'une section, collant pendant le défilement.
 *
 * Il remplace la pastille qu'on aurait mise à gauche de chaque carte, et il
 * fait mieux : une pastille dit le pays, un titre dit à qui on prête. C'est
 * une vraie `<section>` avec son `<h2>`, donc un lecteur d'écran les énumère
 * et saute de l'une à l'autre avec ses propres commandes.
 */
function SectionHead({ section, n }: { section: Section; n: number }) {
  const t = useT();
  return (
    <div className={styles.secHead}>
      {/* LA PHRASE SOUS LE TITRE EST PARTIE. Elle disait la règle
          d'appartenance de la section — « Emprunts des six États de la zone,
          cotés en continu » — et elle la disait à chaque passage, sur un
          écran qu'on parcourt pour comparer des lignes. Le titre suffit à
          celui qui descend ; celui qui veut la règle la trouve au Guide. */}
      <h2 id={`sec-${section}`}>{t(SECTION_LABEL[section])}</h2>
      <span className={styles.secN}>{n > 0 ? n : t("aucune ligne")}</span>
    </div>
  );
}

/** The slug the fold state of an issuer's group is kept under. */
const groupId = (issuer: string) => issuer.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** An issuer's head: flag, name, count; it folds its lines on a tap (the state stays on the device, « Tout replier » folds them all). */
function GroupHead({ g, colSpan }: { g: ReturnType<typeof groupByIssuer>[number]; colSpan?: number }) {
  const t = useT();
  const { open, toggle } = useFold("titres", groupId(g.issuer));
  const fams = [...new Set(g.rows.map((r) => r.s.kind))];
  const inner = (
    <>
      <span className={`cc ${g.zone === "CEMAC" ? "cemac" : ""}`} title={g.countryName}>
        {g.zone === "CEMAC" ? "CEMAC" : COUNTRY_CODE[g.zone]}
      </span>
      <b>{g.issuer}</b>
      <span className={styles.groupMeta}>
        {g.rows.length} {t(g.rows.length > 1 ? "lignes" : "ligne")} · {fams.join(" · ")}
      </span>
      <span className={`${styles.groupChev} ${open ? styles.groupOpen : ""}`} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </>
  );
  const a11y = { role: "button" as const, tabIndex: 0, "aria-expanded": open, onClick: toggle, onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle()) };
  return colSpan ? (
    <tr className={styles.groupRow} {...a11y}>
      <td colSpan={colSpan}>{inner}</td>
    </tr>
  ) : (
    <div className={styles.groupHead} {...a11y}>
      {inner}
    </div>
  );
}

/** A group's rows, only while its head is open. */
function GroupBody({ issuer, children }: { issuer: string; children: React.ReactNode }) {
  const { open } = useFold("titres", groupId(issuer));
  return open ? <>{children}</> : null;
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

/**
 * LE TABLEAU GROUPE AUSSI PAR TYPE, et c'est ce qui manquait.
 *
 * Il ne connaissait qu'un rangement, celui par émetteur : « Type », qui est
 * le rangement par défaut, y rendait donc une table d'un seul tenant. Les
 * deux valeurs « Type » et « Aucun » donnaient exactement le même écran, et
 * personne ne pouvait voir à quoi servait la liste déroulante.
 *
 * Les sections arrivent toutes faites : le parent les connaît déjà, puisque
 * les cartes et la liste les affichent. Les recalculer ici aurait fait un
 * second découpage à tenir d'accord avec le premier.
 */
function Table({ rows, sort, dir, onSort, grouped, featured, chosen, sections }: { rows: Row[]; sort: SortKey; dir: Dir; onSort: (k: SortKey) => void; grouped: boolean; featured?: boolean; chosen?: boolean; sections?: { clef: string; nom: string; rows: Row[] }[] }) {
  const groups = sections
    ? sections.map((x) => ({ issuer: x.nom, zone: "Cameroun" as const, countryName: "", rows: x.rows, section: x.clef }))
    : grouped
      ? groupByIssuer(rows)
      : [{ issuer: "", zone: "Cameroun" as const, countryName: "", rows }];
  const t = useT();
  return (
    <div className={styles.tableWrap} data-chosen={chosen ? "1" : undefined}>
      <table className={styles.table}>
        <thead>
          <tr>
            <Th k="title" label={t("Ligne")} sort={sort} dir={dir} onSort={onSort} />
            <th>{t("Statut")}</th>
            <Th k="deadline" label={t("Clôture")} sort={sort} dir={dir} onSort={onSort} right />
            <Th k="yield" label={t("Rendement")} sort={sort} dir={dir} onSort={onSort} right term="rendement_cours" />
            <Th k="tenor" label={t("Échéance")} sort={sort} dir={dir} onSort={onSort} right className={styles.hideMd} />
            <th className={`${styles.r} ${styles.hideMd}`}>{t("Durée")}</th>
            <Th k="minimum" label={t("Ticket minimum")} sort={sort} dir={dir} onSort={onSort} right term="ticket" className={styles.hideSm} />
            <th></th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((g) => [
            /* Un titre de section est une rangée pleine largeur, comme celui
               d'un émetteur : le tableau n'a pas deux façons de nommer un
               groupe. */
            ...(sections ? [
              <tr key={`s-${g.issuer}`} className={styles.secRow}>
                <th colSpan={8} scope="colgroup" id={`sec-${(g as { section?: string }).section ?? g.issuer}`}>
                  {g.issuer}
                </th>
              </tr>,
            ] : grouped ? [<GroupHead key={`g-${g.issuer}`} g={g} colSpan={8} />] : []),
            <GroupBody key={`b-${g.issuer}`} issuer={grouped && !sections ? g.issuer : ""}>
              {g.rows.map(({ o, s }) => (
                <TableRow key={o.id} o={o} s={s} featured={featured} />
              ))}
            </GroupBody>,
          ])}
        </tbody>
      </table>
    </div>
  );
}

/** One row of the table, with its « ··· ». */
function TableRow({ o, s, featured }: { o: Offer; s: OfferSummary; featured?: boolean }) {
  const t = useT();
  const href = useLineHref();
  const desk = useDeskView();
  return (
        <tr className={`${s.past ? styles.past : ""} ${featured ? styles.pick : ""}`}>
          <td className={styles.line}>
            <LineIdentity o={o} s={s} href={href(o.id)} />
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
            <span className={`${styles.hero} ${s.gold ? styles.taux : ""}`}>{s.hero}</span>
            <small>{t(s.heroUnit ?? s.heroSub)}</small>
          </td>
          <td className={`${styles.r} ${styles.hideMd} num`} title={s.maturityNote}>
            {s.maturity}
            {s.maturityNote && <span className={styles.approx} aria-label={s.maturityNote}>≈</span>}
          </td>
          <td className={`${styles.r} ${styles.hideMd} num`}>{s.tenor}</td>
          <td className={`${styles.r} ${styles.hideSm} num`}>
            {s.minimum}
            {s.minimum !== "—" && <Info text={s.minimumSub} label={t("Ce ticket représente")} subtle />}
          </td>
          <td className={styles.r}>
            <span className={styles.rowBtns}>
              <Link className="btn sm ghost" href={href(o.id)}>
                {t(desk ? "Voir la ligne" : "Voir la fiche")}
              </Link>
              {!desk && <LineMenu line={{ id: o.id, title: o.title, isin: o.isin, sub: `${s.subtitle} · ${s.hero} ${s.heroUnit ?? ""}`.trim() }} />}
            </span>
          </td>
        </tr>
  );
}

/* ---------- list ---------- */
function List({ rows, grouped, featured }: { rows: Row[]; grouped: boolean; featured?: boolean }) {
  const t = useT();
  const groups = grouped ? groupByIssuer(rows) : [{ issuer: "", zone: "Cameroun" as const, countryName: "", rows }];
  return (
    <div className={styles.list}>
      {groups.flatMap((g) => [
        ...(grouped ? [<GroupHead key={`g-${g.issuer}`} g={g} />] : []),
        <GroupBody key={`b-${g.issuer}`} issuer={grouped ? g.issuer : ""}>
          {g.rows.map(({ o, s }) => (
            <ListRow key={o.id} o={o} s={s} featured={featured} />
          ))}
        </GroupBody>,
      ])}
    </div>
  );
}

/** One row of the list: the « ··· » sits on the corner of the link (a button cannot live inside it). */
function ListRow({ o, s, featured }: { o: Offer; s: OfferSummary; featured?: boolean }) {
  const t = useT();
  const href = useLineHref();
  const desk = useDeskView();
  return (
    <div className={styles.rowWrap}>
      <Link href={href(o.id)} className={`${styles.row} ${s.past ? styles.past : ""} ${featured ? styles.pick : ""}`} style={{ borderLeftColor: `var(--fam-${s.family}, ${famVars(s.family)["--fam-c"] ?? "var(--line-2)"})` }}>
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
              <dd className={i === 0 && s.gold ? styles.taux : undefined}>
                {v}
                {note && <small>{t(note)}</small>}
              </dd>
            </div>
          ))}
        </dl>
        <div className={styles.rowAct}>{t(desk ? "Voir la ligne" : "Voir la fiche")} →</div>
      </Link>
      {!desk && <LineMenu line={{ id: o.id, title: o.title, isin: o.isin, sub: `${s.subtitle} · ${s.hero} ${s.heroUnit ?? ""}`.trim() }} className={styles.rowDots} />}
    </div>
  );
}


/* ---------- the filters, the search and the sort in a sheet over the list (the page keeps its place) ---------- */
type Group = { key: string; label: string; items: [string, string][]; selected: Set<string>; single?: boolean };
function FilterSheet({ open, onClose, groups, onToggle, onClear, count, gauge, extra, trie = true }: { open: boolean; onClose: () => void; groups: Group[]; onToggle: (key: string, value: string, single?: boolean) => void; onClear: () => void; count: number; gauge: React.ReactNode; extra: React.ReactNode; /** Faux quand la feuille ne porte pas le tri : son titre ne doit pas le promettre. */ trie?: boolean }) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t(trie ? "Filtrer et trier" : "Filtrer")}>
      <div className={styles.sheetBody}>
          {extra}
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
          {/* Le titre ne paraît qu'avec sa jauge : la cote n'en a plus, le
              nuage réglant déjà cette plage, et « Rendement » tout seul
              annonçait une commande absente. */}
          {gauge ? (
            <div className={styles.fg}>
              <span>{t("Rendement")}</span>
              {gauge}
            </div>
          ) : null}
      </div>
      <div className={styles.sheetFoot}>
        <button type="button" className="btn sm ghost" onClick={onClear}>
          {t("Effacer")}
        </button>
        <button type="button" className={`btn primary ${styles.sheetApply}`} onClick={onClose}>
          {t("Voir")} {count} {count > 1 ? "lignes" : "ligne"}
        </button>
      </div>
    </Sheet>
  );
}

/* ---------- browser ---------- */
export function OfferBrowser({ offers, nowIso, fundsCount, lieu = "cote", suivis }: { offers: Offer[]; nowIso: string; fundsCount: number; lieu?: Lieu; /** Les lignes sur lesquelles CE lecteur a armé une alerte, lues au serveur. */ suivis?: string[] }) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const t: T = useT();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const setOf = (k: string) => new Set((sp.get(k) ?? "").split(",").filter(Boolean));

  const kind = setOf("instrument");
  const segment = (sp.get("marche") as MarketSegment | null) ?? undefined;
  const sectionChoisie = (sp.get("section") as Section | null) ?? undefined;
  const grouped = sp.get("groupe") === "emetteur";
  const country = setOf("pays");
  const status = setOf("statut");
  const tenor = setOf("duree");
  const yr = parseYieldRange(sp.get("rendement"));
  /* Ce que le nuage montre : les deux axes, ou l'un des deux seul. */
  const mesure: MesureNuage = estMesure(sp.get("mesure")) ? (sp.get("mesure") as MesureNuage) : MESURE_PAR_DEFAUT;
  /* LE TRACÉ S'OUVRE FERMÉ. La liste est ce pour quoi on vient ; le tracé
     sert à choisir où regarder, ce qui est une seconde question. */
  const nuageOuvert = sp.get("nuage") === "1";
  /**
   * LES LIGNES ÉPINGLÉES, DANS L'ADRESSE COMME LE RESTE.
   *
   * Un point du tracé fait monter sa ligne juste sous le nuage, au lieu de
   * quitter la page : les deux sont alors sous les yeux en même temps, ce qui
   * est tout l'objet du geste. Plusieurs épingles, parce qu'on ne pointe pas
   * un point pour l'admirer mais pour le comparer à son voisin.
   */
  const epingles = (sp.get("epingle") ?? "").split(",").filter(Boolean);
  /* UNE SEULE ÉPINGLE À LA FOIS. Plusieurs tenaient debout en principe —
     comparer deux lignes est bien la question — mais elles empilaient des
     cartes entre le tracé et la liste, et le tracé qu'on voulait garder sous
     les yeux repartait vers le haut. Un nouveau point remplace donc le
     précédent, et le même point détache. */
  const basculerEpingle = (id: string) => {
    update({ epingle: epingles.includes(id) ? undefined : id, nuage: "1" });
  };
  /**
   * LA PAGE DES ADJUDICATIONS N'EST PAS UNE COTE, ET SA BARRE NE DOIT PAS
   * L'ÊTRE.
   *
   * Huit séances d'emprunt d'État, toutes de la même famille : chercher par
   * nom n'a pas de sens (personne ne connaît « OTA 6,25 % · 8 juil. 2031 » de
   * mémoire), trier non plus (une séance se lit par sa clôture, et c'est
   * déjà l'ordre), grouper par émetteur revient à grouper par pays, qui est
   * un filtre, et choisir entre tableau, liste et cartes n'a pas à se régler
   * devant huit lignes. Ce qui sépare vraiment deux séances, c'est la DURÉE :
   * treize semaines ou cinq ans ne s'achètent pas pour la même raison.
   *
   * La feuille des filtres y perd donc la recherche, le tri, la présentation
   * et les vues, et y gagne la durée en jauge, à côté de celle du rendement.
   */
  const adj = lieu === "adjudications";
  /* La cote et les adjudications rangent leur liste de la même façon : un
     titre figé par bloc, qui est le sommaire. */
  const sommaire = adj || lieu === "cote";
  const armees = useMemo(() => new Set(suivis ?? []), [suivis]);
  /* LA PLAGE DE DURÉE VAUT AUSSI SUR LA COTE DEPUIS LE NUAGE. Elle n'était
     lue qu'aux adjudications, où la jauge la pose ; le nuage de la cote la
     pose à son tour, et une adresse qui porte « ans » doit filtrer là où le
     geste existe, sinon le tracé se resserre et la liste ne bouge pas. */
  const dr = parseDureeRange(adj || lieu === "cote" ? sp.get("ans") : null);
  /* Les durées de TOUTES les lignes du lieu : les barres de la jauge doivent
     montrer la distribution entière, pas celle de ce qui reste après filtre,
     sinon la jauge se vide à mesure qu'on s'en sert. */
  const durees = useMemo(() => offers.map((o) => tenorYears(o)).filter((a) => a > 0), [offers]);
  /**
   * HUIT SÉANCES SE RANGENT DE DEUX FAÇONS : par type et par émetteur.
   *
   * Par TYPE, c'est ce que la page faisait déjà sous le nom de sections —
   * bons, obligations, rachats — et c'est le rangement par défaut, parce
   * qu'un bon à treize semaines et une obligation à cinq ans ne s'achètent
   * pas pour la même raison. Par ÉMETTEUR, c'est le Trésor qui emprunte, et
   * c'est la question de celui qui regarde un pays.
   *
   * Les deux prennent la même forme que sur les fonds : un titre figé qui
   * EST le sommaire. La bande des sections, elle, se retire de cette page :
   * trois pastilles pour trois types n'avaient pas besoin d'une barre à
   * elles, et deux rangements auraient demandé deux barres.
   */
  /* TROIS RANGEMENTS, DONT « AUCUN ». « Effacer » ramenait sur « Type »,
     qui est un rangement : il n'y avait pas moyen d'obtenir une liste à plat.
     Le vide est donc une valeur offerte, et non l'absence d'une valeur. */
  const sansGroupe = sp.get("groupe") === "aucun";
  const parEmetteur = sommaire && grouped;
  const q = sp.get("q") ?? "";
  const sort = (sp.get("tri") as SortKey) || "deadline";
  const dir = (sp.get("sens") as Dir) || (sort === "yield" || sort === "coupon" ? "desc" : "asc");
  const desk = useDeskView();
  // The phone reads cards, the desk a table: decided from the media query at hydration, not after a first paint (no compact flash).
  const phone = usePhone();
  /**
   * EN PORTRAIT, LA CARTE ET RIEN D'AUTRE, et le choix des vues disparaît.
   *
   * Un tableau de huit colonnes dans 384 px se lit en le faisant glisser de
   * côté, et une liste d'un trait y perd ses chiffres. Les deux étaient
   * offertes, donc choisies, donc subies. Ce qui reste est ce qui sert : la
   * densité des cartes, et la feuille qui dit ce qu'une carte porte.
   */
  const view: View = phone ? "cards" : ((sp.get("vue") as View) || "table");
  const [sheet, setSheet] = useState(false);
  // The search's suggestions while typing: distinct lines, issuers and ISINs that contain the letters.
  const [draft, setDraft] = useState("");
  const suggestions = useMemo(() => {
    const d = fold(draft.trim());
    if (d.length < 2) return [];
    const seen = new Set<string>();
    const out: { kind: string; text: string }[] = [];
    const push = (kind: string, text: string) => {
      const k = kind + text;
      if (!text || seen.has(k) || !fold(text).includes(d) || fold(text) === d) return;
      seen.add(k);
      out.push({ kind, text });
    };
    // Le nom du registre, celui que porte la tête de groupe, et non l’orthographe de
    // la ligne : proposer « BGFI » tel qu’il est écrit sur une ligne puis ne trouver
    // que celle-là, c’est promettre un émetteur et rendre une écriture.
    for (const o of offers) push("Émetteur", issuerKey(o));
    for (const o of offers) push("Ligne", o.title);
    for (const o of offers) push("ISIN", o.isin ?? "");
    return out.slice(0, 8);
  }, [draft, offers]);
  const sep = useDistinction();
  useEffect(() => {
    try {
      sessionStorage.setItem(LAST_LIST_KEY, `${pathname}${sp.toString() ? `?${sp}` : ""}`);
    } catch {
      // storage unavailable
    }
  }, [pathname, sp]);
  // The floating filter button watches the toolbar: it shows once the toolbar is under the header.
  const top = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Toucher une suggestion valide la recherche : le clavier se retire et la liste paraît.
  const { input: searchInput, list: searchList, commit: commitSearch } = useSearchCommit<HTMLInputElement, HTMLDivElement>();

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
  /* TOUT EFFACER VEUT DIRE TOUT : les filtres, la recherche, la section
     choisie, l'ordre et son sens. Il ne remettait que les filtres, et qui
     avait trié gardait son ordre après l'avoir touché. */
  const reset = () => update({ marche: undefined, instrument: undefined, pays: undefined, statut: undefined, duree: undefined, ans: undefined, rendement: undefined, q: undefined, section: undefined, tri: undefined, sens: undefined, mesure: undefined });
  const filterCount = kind.size + country.size + status.size + tenor.size + (yr.min != null || yr.max != null ? 1 : 0) + (dr.min != null || dr.max != null ? 1 : 0) + (segment ? 1 : 0);
  /* Ce que « Tout effacer » aurait à défaire : il se lit après le compte des
     filtres, qui en fait partie. */
  /* « mesure » n'est pas un filtre, elle ne retire aucune ligne : elle est
     dans « Tout effacer » pour la raison du tri, parce qu'effacer veut dire
     rendre la page telle qu'elle s'ouvre. */
  const aEffacer = filterCount > 0 || Boolean(q) || Boolean(sp.get("tri")) || Boolean(sp.get("sens")) || Boolean(sectionChoisie) || Boolean(sp.get("mesure"));
  const famItems = SEGMENTS.filter((sg) => !segment || sg === segment).flatMap((sg) => FAMILIES().filter((f) => familySegment(f) === sg).map((f) => [f, familyShort(f)] as [string, string]));
  const groups: Group[] = [
    { key: "instrument", label: t("Instrument"), items: famItems, selected: kind },
    { key: "pays", label: t("Pays"), items: COUNTRIES.map((c) => [c, c] as [string, string]), selected: country },
    { key: "statut", label: t("Statut"), items: STATUSES, selected: status },
    /* LES PALIERS DE DURÉE SONT PARTIS DU FILTRE. Le nuage règle la même
       borne, en continu et à la barre : trois paliers à côté d'une barre,
       c'est la même question posée deux fois, et deux réponses possibles. */
  ];
  const toggle = (key: string, value: string, single?: boolean) => {
    if (key === "rendement") return update({ rendement: undefined });
    if (key === "ans") return update({ ans: undefined });
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
    ...(dr.min != null || dr.max != null ? [{ key: "ans", value: "*", label: `${t("Durée")} ${dureeRangeLabel(dr)}`, single: true }] : []),
  ];
  const setYield = (min?: number, max?: number) => update({ rendement: yieldRangeParam(min, max) });
  const yields = useMemo(() => offers.map((o) => headlineYield(o)).filter((y): y is number => y != null), [offers]);
  /* Le compte de chaque section se fait sur TOUTES les lignes du lieu, pas sur
     celles qui restent après les autres filtres : une pastille qui changerait
     de nombre selon le pays coché ne dirait plus ce que contient la section. */
  const sectionCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of SECTIONS[lieu]) c[x] = 0;
    for (const o of offers) {
      const k = sectionDe(o);
      if (k in c) c[k]++;
    }
    return c;
  }, [offers, lieu]);
  const segCount = useMemo(() => {
    const c: Record<MarketSegment, number> = { primaire: 0, secondaire: 0, fonds: 0 };
    for (const o of offers) c[familySegment(offerFamily(o))]++;
    return c;
  }, [offers]);

  /**
   * LE CRIBLE, ÉCRIT UNE FOIS, ET SES DEUX PLAGES EN OPTION.
   *
   * Le nuage doit montrer les lignes que les AUTRES filtres retiennent, sans
   * se filtrer lui-même : s'il ne montrait que sa propre plage, resserrer
   * ferait disparaître le reste de la distribution et on ne saurait plus par
   * rapport à quoi on s'est resserré. Il lui faut donc la même liste, moins
   * les deux bornes qu'il pose. Recopier le crible pour cela, c'était deux
   * vérités sur la même page le jour où l'une des deux change.
   */
  const garde = (o: Offer, ql: string, avecPlages: boolean): boolean => {
    const st = displayStatus(o, now);
    const fam = offerFamily(o);
    if (segment && familySegment(fam) !== segment) return false;
    if (sectionChoisie && sectionDe(o) !== sectionChoisie) return false;
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
    if (avecPlages && (dr.min != null || dr.max != null)) {
      const an = tenorYears(o);
      if (!(an > 0) || (dr.min != null && an < dr.min) || (dr.max != null && an > dr.max)) return false;
    }
    if (avecPlages && (yr.min != null || yr.max != null)) {
      const y = headlineYield(o);
      if (y == null || (yr.min != null && y < yr.min) || (yr.max != null && y > yr.max)) return false;
    }
    if (ql) {
      // les deux écritures : celle de la ligne et celle du registre, qui rassemble les alias
      const hay = [o.title, o.isin, o.issuer, issuerKey(o), o.countryName, KIND_LABEL[o.kind], familyLabel(fam), o.fund?.manager ?? ""].join(" ");
      if (!fold(hay).includes(ql)) return false;
    }
    return true;
  };

  const rows = useMemo(() => {
    const ql = fold(q.trim());
    const out = offers.filter((o) => garde(o, ql, true)).map((o) => ({ o, s: summarize(o, now) }));
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
        case "issuer":
          // By issuer (the registry's name, so a borrower's spellings sort together), then by closing within the issuer.
          return issuerKey(a.o).localeCompare(issuerKey(b.o), "fr") || (a.s.deadlineAt ? parseDate(a.s.deadlineAt).getTime() : Infinity) - (b.s.deadlineAt ? parseDate(b.s.deadlineAt).getTime() : Infinity);
        default:
          return parseDate(a.o.opensAt).getTime() - parseDate(b.o.opensAt).getTime();
      }
    };
    out.sort((a, b) => (dir === "asc" ? cmp(a, b) : cmp(b, a)));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers, now, sp, sort, dir]);

  /**
   * LES POINTS DU NUAGE : les lignes à échéance, sans les deux plages qu'il
   * pose lui-même. Une action n'y figure pas, et ce n'est pas un oubli :
   * sans échéance ni rendement actuariel, elle n'a aucun des deux axes.
   */
  const pointsDuNuage = useMemo(() => {
    const ql = fold(q.trim());
    return offers
      .filter((o) => o.maturityOn && garde(o, ql, false))
      .map((o) => ({ id: o.id, titre: o.title, pays: o.country, ans: tenorYears(o), ytm: headlineYield(o) ?? null, coupon: o.couponRate, cours: o.pricePct ?? o.lastPrice }))
      .filter((p) => p.ans > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers, now, sp]);

  /* CE QUE LE BANDEAU REPLIÉ MONTRE : les trois chiffres qui décident
     d'ouvrir. Calculés sur les points du tracé, donc après les autres
     filtres et avant les deux plages qu'il règle lui-même. */
  const resumeNuage = useMemo(() => {
    const ys = pointsDuNuage.map((p) => p.ytm).filter((v): v is number => v != null);
    return {
      n: pointsDuNuage.length,
      bas: ys.length ? Math.min(...ys) : 0,
      haut: ys.length ? Math.max(...ys) : 0,
      decotees: pointsDuNuage.filter((p) => p.cours != null && p.cours < 100).length,
    };
  }, [pointsDuNuage]);

  /**
   * LA LIGNE ÉPINGLÉE RESTE DANS LA LISTE, et ce qui paraît sous le tracé en
   * est une COPIE.
   *
   * Elle en sortait, au motif qu'on ne veut pas croire à un doublon de la
   * cote. L'argument ne tient pas : épingler est un geste de lecture, pas un
   * filtre, et une liste qui perd une ligne quand on la désigne cesse d'être
   * la liste. On cherchait ensuite sa voisine à la place où elle n'était
   * plus, et le compte des lignes affichées baissait d'un sans raison
   * visible. La copie sous le tracé est là pour qu'on garde la ligne sous les
   * yeux en faisant défiler ; l'originale reste à son rang.
   */
  const lignesEpinglees = rows.filter((r) => epingles.includes(r.o.id));

  const live = offers.filter((o) => isActionable(displayStatus(o, now))).length;
  // « À la une » : the desk's picks, in their own frame under the toolbar, in the same view as the list.
  const today = nowIso.slice(0, 10);
  // « À la une » only while a client can act on the line: a closed line leaves the frame by itself.
  const picks = rows.filter(({ o, s }) => o.featured && o.featured.until >= today && !s.past).slice(0, 3);
  const pickIds = new Set(picks.map(({ o }) => o.id));
  /* Seules les lignes « à la une » sortent d'ici, parce qu'elles ont leur
     propre cadre au-dessus. L'épinglée, elle, garde son rang. */
  const rest = rows.filter(({ o }) => !pickIds.has(o.id));
  // The line pages step through this exact order and come back to this exact list.
  const listUrl = `${pathname}${sp.toString() ? `?${sp}` : ""}`;
  const orderKey = [...picks, ...rest].map(({ o }) => o.id).join(",");
  useEffect(() => {
    rememberList({ url: listUrl, ids: orderKey.split(",").filter(Boolean), label: "Toutes les offres", titles: [...picks, ...rest].map(({ o }) => o.title), peeks: [...picks, ...rest].map(({ s }) => ({ stamp: t(s.status), tone: s.statusClass, sub: t(s.subtitle), hero: s.hero, unit: s.heroUnit ? t(s.heroUnit) : undefined, gold: s.gold })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listUrl, orderKey]);
  useListScroll(listUrl);
  /**
   * LES SECTIONS NE S'APPLIQUENT PAS AU TABLEAU.
   *
   * Le tableau sert à comparer des chiffres colonne par colonne, et on y trie
   * par rendement ou par échéance à travers toute la liste : le couper en cinq
   * blocs empêcherait exactement ce pour quoi on l'ouvre. Les cartes et la
   * liste se lisent de haut en bas, elles se sectionnent.
   *
   * Et quand une pastille est touchée, il ne reste qu'une section : son titre
   * ne se répète pas au-dessus, la pastille le dit déjà.
   */
  /* « AUCUN » DOIT DÉSARMER LES TROIS BRANCHES, et il n'en désarmait que
     deux. Celle-ci rendait les cinq sections — En souscription, États,
     Institutions régionales, Entreprises, Actions — alors que la liste
     déroulante affichait bien « Aucun » : le réglage disait une chose et
     l'écran en montrait une autre. */
  const parSections = !sectionChoisie && view !== "table" && !sansGroupe;
  const renderUn = (list: Row[], featured: boolean, deja = false) =>
    view === "list" ? (
      <List rows={list} grouped={grouped && !featured && !deja} featured={featured} />
    ) : (
      <div className={`${styles.cards} ${featured ? styles.pickCards : ""}`} data-sep={sep}>
        {/* « deja » : le bloc qui nous appelle a déjà posé son titre. Sans
            lui, la page des adjudications groupée par émetteur montrait deux
            titres par groupe à vingt pixels l'un de l'autre — « Cameroun ·
            2 lignes » en figé, « CM État du Cameroun · 2 lignes » juste
            dessous. */}
        {(grouped && !featured && !deja ? groupByIssuer(list) : [{ issuer: "", zone: "Cameroun" as const, countryName: "", rows: list }]).flatMap((g) => [
          ...(grouped && !featured && !deja ? [<GroupHead key={`g-${g.issuer}`} g={g} />] : []),
          <GroupBody key={`b-${g.issuer}`} issuer={grouped && !featured && !deja ? g.issuer : ""}>
            {g.rows.map(({ o, s }) => (
              <div key={o.id} className={featured ? styles.pickCard : undefined}>
                <OfferCard o={o} s={s} suivi={armees.has(o.id)} />
                {featured && o.featured?.reason && <small className={styles.reason}>{o.featured.reason}</small>}
              </div>
            ))}
          </GroupBody>,
        ])}
      </div>
    );

  /**
   * Les blocs d'une liste à sommaire : par émetteur, ou par type.
   *
   * UNE SECTION VIDE RESTE, avec son zéro. C'est la règle de la maison et
   * elle vaut surtout ici : « En souscription 0 » dit qu'aucune émission
   * n'est ouverte, ce qu'une section absente ne dit pas. Un émetteur vide,
   * lui, n'existe pas : on ne le nomme que parce qu'il a des lignes.
   */
  const blocsDuSommaire = (list: Row[]): { clef: string; entier: string; rows: Row[] }[] => {
    if (parEmetteur) return groupByIssuer(list).map((g) => ({ clef: groupId(g.issuer), entier: g.issuer, rows: g.rows }));
    return groupBySection(list, lieu).map((g) => ({ clef: g.section, entier: t(SECTION_LABEL[g.section]), rows: g.rows }));
  };

  const render = (list: Row[], featured: boolean) =>
    view === "table" ? (
      <Table
        rows={list}
        sort={sort}
        dir={dir}
        onSort={onSort}
        grouped={grouped && !featured}
        featured={featured}
        chosen={Boolean(sp.get("vue"))}
        sections={!featured && !sansGroupe && !grouped && !sectionChoisie ? blocsDuSommaire(list).map((b) => ({ clef: b.clef, nom: b.entier, rows: b.rows })) : undefined}
      />
    ) : sommaire && !featured && !sansGroupe ? (
      (() => {
        const blocs = blocsDuSommaire(list);
        /* LES NOMS COURTS NE VALENT QUE POUR LES ÉMETTEURS. « Trésor public
           de la République centrafricaine » ne tient pas dans un titre de
           téléphone, et les six Trésors ne diffèrent que par leur pays.
           Les noms de SECTION, eux, sont déjà courts et déjà choisis : les
           dégraisser les abîme. Vu à l'écran le 5 octobre 2026 sur la cote
           en anglais, « Open for subscription » devenait « Open for » —
           deux mots, dont le second est une préposition que la liste des
           mots-outils française ne connaît pas. */
        const brefs = parEmetteur ? nomsCourts(blocs.map((b) => b.entier)) : new Map<string, string>();
        const titres: Groupe[] = blocs.map((b) => ({ clef: b.clef, nom: brefs.get(b.entier) ?? b.entier, entier: b.entier, n: b.rows.length }));
        return (
          <>
            {blocs.map((b, i) => (
              <section key={b.clef} className={styles.bloc} aria-labelledby={`sec-${b.clef}`}>
                <TeteGroupe id={`sec-${b.clef}`} nom={titres[i].nom} entier={b.entier} n={b.rows.length} groupes={titres} unite={b.rows.length > 1 ? "lignes" : "ligne"} />
                {b.rows.length > 0 && renderUn(b.rows, false, true)}
              </section>
            ))}
          </>
        );
      })()
    ) : parSections && !featured ? (
      <>
        {groupBySection(list, lieu).map((g) => (
          <section key={g.section} className={styles.bloc} aria-labelledby={`sec-${g.section}`}>
            <SectionHead section={g.section} n={g.rows.length} />
            {g.rows.length > 0 && renderUn(g.rows, false)}
          </section>
        ))}
      </>
    ) : (
      renderUn(list, featured)
    );

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {/* L'en-tête nomme la cote et renvoie aux fonds : il n'a rien à dire sur
          une page d'adjudications, qui a son propre titre et son calendrier. */}
      {lieu === "cote" && <TitresHead fundsCount={fundsCount} />}
      {/* LA BANDE DES SECTIONS SORT DE « top », ET C EST CE QUI LA REND
          COLLANTE. Un element collant ne depasse pas la boite de son parent :
          dans « top », qui est un bloc court en haut de page, elle se
          decollait au bout de quarante pixels et partait avec lui. Mesure :
          elle se retrouvait a -1223 apres un defilement de 1400. Son parent
          est donc « wrap », aussi haut que la liste. */}
      {/* LA BANDE DES SECTIONS NE PARAÎT PLUS SUR LES ADJUDICATIONS : le
          titre de chaque bloc y est le sommaire, comme sur les fonds, et deux
          rangements au choix auraient demandé deux barres. */}
      {!sommaire && <SectionChips sections={SECTIONS[lieu]} counts={sectionCounts} selected={sectionChoisie} total={offers.length} onChange={(k) => update({ section: k, instrument: undefined })} />}
      <div className={styles.top} ref={top}>
        <div className={styles.toolbar} data-coach="titres-filtres">
          {!adj && (
          <label className={styles.search}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder={t("Rechercher une ligne, un émetteur, un ISIN")}
              aria-label={t("Rechercher")}
              defaultValue={q}
              ref={searchInput}
              autoComplete="off"
              onChange={(e) => {
                setDraft(e.target.value);
                update({ q: e.target.value || undefined });
              }}
              onFocus={(e) => setDraft(e.target.value)}
              onBlur={() => window.setTimeout(() => setDraft(""), 150)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setDraft("");
                // Entrée vaut choisir : on a fini de taper, on veut voir.
                if (e.key === "Enter") commitSearch(() => setDraft(""));
              }}
            />
            {/* what the typed letters match: lines, issuers, ISINs; a tap fills the field and filters the list */}
            {suggestions.length > 0 && (
              <ul className={styles.suggest} role="listbox">
                {suggestions.map((sug) => (
                  <li key={sug.kind + sug.text}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        const input = (e.currentTarget.closest("label") as HTMLLabelElement).querySelector("input");
                        if (input) input.value = sug.text;
                        commitSearch(() => {
                          setDraft("");
                          update({ q: sug.text });
                        });
                      }}
                    >
                      <em>{t(sug.kind)}</em>
                      <b>{sug.text}</b>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>
          )}
          <button type="button" className={styles.sheetBtn} onClick={() => setSheet(true)} aria-haspopup="dialog">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {t("Filtrer")}{filterCount > 0 ? ` · ${filterCount}` : ""}
          </button>
          {/* CE QU'ON RETIRE, COMMENT ON RANGE, COMMENT ON LIT : les trois
              commandes de la page sur une ligne, dans l'ordre des décisions.
              Elles étaient sur trois lignes, « Filtrer » seule en haut et les
              deux autres soixante pixels plus bas. */}
          {sommaire && (
            <Dropdown label="Grouper" single effacable={false} items={GROUPEMENTS} selected={new Set([sansGroupe ? "aucun" : grouped ? "emetteur" : "type"])} onChange={(x) => update({ groupe: [...x][0] === "type" ? undefined : [...x][0] })} />
          )}
          {sommaire && view === "cards" && !desk && <DensitySwitch />}
          {/* TOUT EFFACER RESTE À SA PLACE, MÊME SANS RIEN À EFFACER.
              Il ne paraissait que lorsqu'un filtre était posé, et c'était
              defendable — sauf qu'un bouton qui n'est là que lorsqu'on en a
              besoin ne s'apprend jamais : on ne sait pas qu'il existe tant
              qu'on n'est pas dans l'état où il apparaît, et c'est justement
              l'état où l'on cherche comment sortir. Signalé à l'écran : « je
              ne vois pas le "tout effacer" ».
              Il est donc toujours là, éteint quand il n'a rien à défaire :
              la ligne garde sa forme, et le bouton s'apprend à froid. */}
          <button type="button" className={styles.clearAll} onClick={reset} disabled={!aEffacer} title={aEffacer ? undefined : t("Rien à effacer")}>
            {t("Tout effacer")}
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
          {!phone && (
            <div className={styles.seg} role="group" aria-label={t("Affichage")} data-coach="titres-vues">
              {VIEWS.map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => update({ vue: v })}>
                  {t(VIEW_LABEL[v])}
                </button>
              ))}
            </div>
          )}
          </div>
        </div>
        {activeChips.length > 0 && (
          <div className={styles.activeRow}>
            {activeChips.map((c) => (
              <button key={c.key + c.value} type="button" className={`${styles.chipBtn} ${styles.chipOn}`} onClick={() => toggle(c.key, c.value, c.single)} aria-label={`${t("Retirer le filtre")} ${c.label}`}>
                {c.label} <span aria-hidden="true">×</span>
              </button>
            ))}
            {/* Le « Tout effacer » de cette rangée est parti : celui de la
                ligne des commandes est toujours là, à portée, et deux
                boutons du même nom à deux centimètres se disputaient le
                même geste. */}
          </div>
        )}
      </div>
      <FilterSheet
        trie={false}
        open={sheet}
        onClose={() => setSheet(false)}
        groups={groups}
        onToggle={toggle}
        onClear={reset}
        count={rows.length}
        /* LA JAUGE DU RENDEMENT A QUITTÉ LA FEUILLE SUR LA COTE : le nuage
           règle déjà cette plage, et la même borne commandée à deux endroits
           est une borne dont on ne sait plus lequel la tient. Elle reste aux
           adjudications, qui n'ont pas de nuage. */
        gauge={adj ? <YieldGauge values={yields} min={yr.min} max={yr.max} onChange={setYield} /> : null}
        extra={
          adj ? (
            /* LA DURÉE EN JAUGE, et rien d'autre. Ce qui a été retiré de
               cette feuille pour la page des adjudications, et pourquoi :
               la RECHERCHE, parce qu'on ne connaît pas une séance par son
               nom ; le TRI, parce qu'une séance se lit par sa clôture et
               que c'est déjà l'ordre ; le GROUPEMENT par émetteur, parce
               qu'il recoupe le pays, qui est un filtre juste au-dessus ; les
               VUES, parce qu'on ne règle pas trois présentations devant huit
               lignes. */
            <div className={styles.fg}>
              <span>{t("Durée")}</span>
              <DureeGauge values={durees} min={dr.min} max={dr.max} onChange={(min, max) => update({ ans: dureeRangeParam(min, max) })} />
            </div>
          ) : (
            /* LA FEUILLE NE PORTE PLUS QUE DES FILTRES, et c'est ce que son
               titre promet. Elle recopiait la recherche, le groupement, le
               tri et les vues, tous déjà posés sur la barre au-dessus de la
               liste : quatre commandes en double, dont deux ne s'accordaient
               pas toujours avec leur jumelle. Une feuille qui s'appelle
               « Filtrer » filtre. */
            null
          )
        }
      />
      {/* LES DEUX BOUTONS DU COIN, montés ensemble et sur le même signal :
          les filtres à gauche, le retour en haut à droite. Ils vivaient à
          deux endroits et répondaient à deux questions, donc ils
          paraissaient l'un après l'autre. */}
      {/* LE BOUTON FLOTTANT EST PARTI : il couvrait une rangée de la liste
          en bas d'écran, là où le pouce lit, et la feuille des filtres se
          rouvre par sa propre commande en haut. */}
      <BackToTop watch={top} />

      <div className={styles.meta}>
        {/* « 13 lignes · 1 ouverte ou cotée » répétait ce que la liste montre,
            sur une page qui en porte huit : le compte se voit. Il reste sur
            la cote, où il y en a trente-cinq et où le filtre en retire. */}
        {!sommaire && (
        <span>
          <b>{rows.length}</b> {t(rows.length > 1 ? "lignes" : "ligne")}
          {filterCount > 0 || q ? ` ${t("correspondant aux filtres")}` : ""} · {live} {t(live > 1 ? "ouvertes ou cotées" : "ouverte ou cotée")}
        </span>
        )}
        <Link className={styles.compareLink} href="/comparer">
          {t("Comparer deux lignes")}
        </Link>
        {/* Le rangement est monté sur la ligne du filtre, avec le
            resserrement : trois commandes d'une même famille sur une seule
            ligne. La case à cocher ne survit que là où il n'y a pas de
            sommaire, c'est-à-dire nulle part aujourd'hui — elle attend un
            troisième lieu. */}
        {!sommaire && (
          <label className={styles.groupToggle}>
            <input type="checkbox" checked={grouped} onChange={(e) => update({ groupe: e.target.checked ? "emetteur" : undefined })} />
            {t("Grouper par émetteur")}
          </label>
        )}
        {grouped && !sommaire && <FoldAll group="titres" ids={groupByIssuer(rest).map((g) => groupId(g.issuer))} />}
        {!adj && (
        <label className={styles.sortSel}>
          {t("Tri")}
          <Select compact cherchable={false} value={sort} onChange={(v) => update({ tri: v, sens: undefined })} options={(Object.keys(SORT_LABEL) as SortKey[]).map((k) => ({ value: k, label: t(SORT_LABEL[k]) }))} />
          <button type="button" className={styles.dirBtn} onClick={() => update({ sens: dir === "asc" ? "desc" : "asc" })} aria-label={t(dir === "asc" ? "Ordre croissant" : "Ordre décroissant")} title={t("Inverser l'ordre")}>
            {dir === "asc" ? "↑" : "↓"}
          </button>
        </label>
        )}
        {view === "cards" && !desk && !sommaire && <DensitySwitch />}
      </div>

      {/* LE NUAGE NE PARAÎT QUE SUR LA COTE. Aux adjudications, huit séances
          de la même famille se lisent dans leurs deux jauges, qui posent déjà
          les mêmes bornes ; ailleurs il n'y a pas d'échéance à porter en
          abscisse. Il se tient entre les commandes et la liste parce qu'il
          est les deux : il montre, et il resserre. */}
      {lieu === "cote" && (
        <BandeauRepliable
          titre={t("Rendement et durée")}
          ouvert={nuageOuvert}
          surOuvrir={(v) => update({ nuage: v ? "1" : undefined })}
          resume={
            <>
              <span>
                <b>{resumeNuage.n}</b> {t("lignes")}
              </span>
              {/* UNE SEULE CLEF POUR LA FOURCHETTE. « de » et « à »
                  traduits séparément donnaient « of 4,6 % at 11,1 % » :
                  deux mots-outils n'ont pas de sens hors de leur phrase. */}
              {resumeNuage.n > 0 && <span>{t("de {bas} à {haut}", { bas: fmtPct(resumeNuage.bas, 1), haut: fmtPct(resumeNuage.haut, 1) })}</span>}
              <span>
                <b>{resumeNuage.decotees}</b> {t("sous 100 %")}
              </span>
              {dr.min != null || dr.max != null || yr.min != null || yr.max != null ? <span className={styles.resumePose}>{t("plage posée")}</span> : null}
            </>
          }
        >
        <NuageTitres
          points={pointsDuNuage}
          mesure={mesure}
          surMesure={(m) => update({ mesure: m === MESURE_PAR_DEFAUT ? undefined : m })}
          duree={dr}
          rendement={yr}
          epingles={epingles}
          surEpingle={basculerEpingle}
          surZone={(z) =>
            update({
              ...(z.duree ? { ans: dureeRangeParam(z.duree.min, z.duree.max) } : {}),
              ...(z.rendement ? { rendement: yieldRangeParam(z.rendement.min, z.rendement.max) } : {}),
            })
          }
        />
        </BandeauRepliable>
      )}

      {/* LES LIGNES ÉPINGLÉES, JUSTE SOUS LE TRACÉ. Elles quittent la liste
          et viennent se poser là, pour qu'un point désigné se lise sans
          perdre le nuage de vue. La croix les renvoie à leur place. */}
      {lieu === "cote" && lignesEpinglees.length > 0 && (
        <section className={styles.epingles} aria-label={t("Lignes épinglées")}>
          <div className={styles.epinglesTete}>
            <span>{lignesEpinglees.length > 1 ? t("{n} lignes épinglées", { n: lignesEpinglees.length }) : t("1 ligne épinglée")}</span>
            <button type="button" className={styles.detacherTout} onClick={() => update({ epingle: undefined })}>
              {t("Tout détacher")}
            </button>
          </div>
          {lignesEpinglees.map(({ o, s: som }) => (
            <div key={o.id} className={styles.epingle}>
              <OfferCard o={o} s={som} suivi={armees.has(o.id)} />
              <button type="button" className={styles.detacher} onClick={() => basculerEpingle(o.id)} aria-label={`${t("Détacher")} ${o.title}`} title={t("Détacher")}>
                ×
              </button>
            </div>
          ))}
        </section>
      )}

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
      {/* ce que la recherche vient de rendre : c’est cela qu’on ramène sous les yeux quand le clavier se retire */}
      <div ref={searchList} className={styles.debutDeListe}>{rest.length > 0 && render(rest, false)}</div>
      {!desk && <CoachMarks
        id="titres"
        replayLabel={t("Comment lire cette page ?")}
        stops={[
          { target: "titres-marches", title: t("Deux marchés, deux interrupteurs"), text: t("Marché primaire : vous souscrivez auprès de l'émetteur pendant une fenêtre. Marché secondaire : vous achetez à un autre investisseur au cours du jour. Les deux sont affichés ; éteignez-en un pour ne voir que l'autre.") },
          { target: "titres-fonds", title: t("Les fonds ont leur page"), text: t("Les parts de fonds (OPCVM) se souscrivent à la prochaine valeur liquidative : elles ont leur propre tableau, avec leurs catégories et leur société de gestion.") },
          { target: "titres-filtres", title: t("Filtrer, puis trier"), text: t("Instrument, pays, statut, durée, rendement : chaque filtre s'ajoute aux autres, et le compte des lignes retenues s'affiche à côté. Le tri se prend dans la même feuille, ou dans l'en-tête d'une colonne du tableau. Tri et filtres restent dans l'adresse de la page : revenez d'une fiche, la liste est telle que vous l'aviez laissée, et le lien que vous envoyez montre ce que vous voyiez.") },
          { target: "titres-vues", title: t("Tableau, liste ou cartes"), text: t("Le tableau compare les chiffres colonne par colonne, la liste se lit d'un trait, les cartes conviennent au téléphone. Un second réglage, la densité, resserre les cartes : en compacte une carte ne porte plus qu'un nom et un chiffre, et tout le reste passe au dos. Le rendement est toujours le premier chiffre.") },
          { target: "titres-chiffre", title: t("Le chiffre en avant, et d'où il vient"), text: t("Le grand nombre est le rendement actuariel annuel brut : ce que la ligne rapporte si vous l'achetez à ce cours et la gardez jusqu'au bout. La petite ligne sous lui en dit l'origine, et c'est elle qui compte : « 97 % · 47 j » veut dire que le cours est de 97 % du nominal et qu'il n'a pas bougé depuis 47 jours. Ce n'est pas la date d'une transaction.") },
          { target: "titres-carte", title: t("Tirez la carte vers la gauche"), text: t("Trois actions apparaissent sous la carte. Contacter ouvre un message prêt à envoyer sur cette ligne. Déclarer ouvre une intention, sans engagement. La troisième dépend du marché : sur la cote c'est Suivre, qui vous prévient à chaque mouvement de la ligne ; à l'adjudication c'est Alerte, qui vous rappelle chaque jour jusqu'à la clôture du dépôt.") },
          { target: "titres-retourner", title: t("Les deux faces de la carte"), text: t("La face dit ce qu'il faut pour choisir : qui emprunte, ce que ça rapporte, depuis quand ce cours tient. Le dos dit ce qu'il faut pour vérifier, et il est le même quelle que soit la vue : le nom complet de la ligne avec son ISIN, trois chiffres côte à côte (le cours, le rendement, l'échéance), les faits datés de la ligne, et enfin le calcul de référence, qui montre d'où sort le rendement, coupon couru compris. Tirez vers la droite ou touchez l'icône pour retourner.") },
        ]}
      />}
    </div>
  );
}
