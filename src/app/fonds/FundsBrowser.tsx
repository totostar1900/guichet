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
import { BackToTop } from "@/components/BackToTop";
import { nomsCourts } from "@/lib/domain/nom-court";
import { estFenetre, FENETRE_PAR_DEFAUT, FENETRES, type FenetreId, raisonSansFenetre } from "@/lib/domain/fund-perf";
import { TeteGroupe } from "@/components/market/TeteGroupe";
import { Dropdown } from "@/components/market/Dropdown";
import { FundCard } from "./FundCard";
import { BandeFonds } from "./BandeFonds";
import { depuisQuand, FenetreCtx, useFenetre, useNomFenetre, valeurFenetre } from "./fenetre";
import { ChoixFenetre } from "./ChoixFenetre";
import { BandeauRepliable } from "@/components/market/BandeauRepliable";
import { LineMenu } from "@/components/mobile/LineMenu";
import { rememberList, useListScroll } from "@/components/ListNav";
import { useDeskView, useLineHref } from "@/components/DeskView";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL, fundKey, type FundNav } from "@/lib/domain/market";
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
  /**
   * Le taux constant qui, composé sur la vie du fonds, donnerait le cumul
   * depuis l'origine. CALCULÉ SUR LE SERVEUR, parce qu'il dépend de la date
   * du jour : calculé dans le navigateur, il diffère de celui qui a été rendu
   * et React le signale comme un désaccord d'hydratation. La machine est à
   * UTC+3, Vercel à UTC, et le piège a déjà coûté une fois.
   */
  annualPct?: number;
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

/**
 * CINQ RANGEMENTS, ET « RENTABILITÉ » N'EN NOMME PLUS UN SEUL.
 *
 * La liste offrait « 12 mois » et « depuis l'origine » comme deux ordres
 * distincts, ce qui posait la question à l'envers : on choisissait une durée
 * dans le tri, et une autre au-dessus dans la fenêtre d'observation. Deux
 * commandes pour la même chose, et rien ne disait laquelle gagnait.
 *
 * L'ordre s'appelle donc « Rentabilité » et porte sur LA FENÊTRE CHOISIE : on
 * choisit d'abord sur quoi l'on mesure, on trie ensuite. « Depuis l'origine »
 * disparaît du tri pour la raison déjà mesurée : les créations s'étalent de
 * 2017 à 2026, et trier le cumul classe l'âge, pas le gérant.
 *
 * « Variation » et « VL la plus récente » partent aussi : la première est le
 * pas d'une semaine, qui ne range rien, la seconde est une date de
 * publication, qui ne dit rien du fonds.
 */
type SortKey = "categorie" | "nom" | "gestion" | "vl" | "an";
const SORT: [SortKey, string][] = [
  ["categorie", "par catégorie"],
  ["an", "rentabilité"],
  ["vl", "valeur liquidative"],
  ["nom", "nom"],
  ["gestion", "société de gestion"],
];
/** Le sens qu'on attend d'une colonne au premier clic : un rendement du plus fort,
    un nom de A à Z. Le second clic inverse, et c'est lui qui écrit « sens ». */
const NATURAL: Record<SortKey, "asc" | "desc"> = { categorie: "asc", nom: "asc", gestion: "asc", vl: "desc", an: "desc" };
const CATS: FundNav["category"][] = ["M", "O", "D", "A", "?"];
/**
 * TROIS FAÇONS DE RANGER LA LISTE, ET PAS UNE DE PLUS.
 *
 * Qui gère, qui garde, et de quelle sorte : ce sont les trois questions qui
 * font chercher un fonds plutôt qu'un autre. Grouper par VL n'aurait rangé
 * que trois tas, grouper par performance n'a pas de sens — c'est un tri.
 */
type GroupKey = "gestion" | "depositaire" | "categorie" | "aucun";
/* UN MOT CHACUN. Le bouton répète la valeur choisie à côté de son nom :
   « Grouper · Société de gestion » faisait 177 px sur les 384 d'un téléphone,
   et les trois listes passaient à la ligne. « Gestion » dit la même chose en
   un mot, et les trois tiennent sur une ligne. */
/* « AUCUN » EST UNE VALEUR, pas l'absence d'une valeur. Le rangement se
   retirait en vidant la liste, geste qu'il fallait deviner et que rien ne
   nommait ; la page des titres offrait déjà « Aucun » comme choix, et deux
   listes voisines doivent nommer la même chose de la même façon. */
const GROUPES: [GroupKey, string][] = [
  ["gestion", "Gestion"],
  ["depositaire", "Dépositaire"],
  ["categorie", "Catégorie"],
  ["aucun", "Aucun"],
];
/* LES PHRASES DES CATÉGORIES ONT DÉMÉNAGÉ dans « FondsEnBref ». Le bandeau
   qui les portait en haut de page occupait la première moitié de l'écran à
   chaque visite ; il se repliait, et il fallait donc retenir son état d'un
   passage à l'autre, dans le stockage local, avec son abonnement et ses
   écouteurs. Plus de bandeau, plus de replieur, plus de mémoire à tenir.
   « CATS » reste : il donne l'ordre des catégories au tri et aux pastilles. */

const signed = (v?: number) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, 2)}`);

/**
 * LE TIRET DU DOUZE MOIS DIT POURQUOI, MÊME DANS UN TABLEAU.
 *
 * La carte l'explique depuis le 5 octobre 2026 ; le tableau et la liste
 * laissaient un tiret nu, et c'est là qu'on l'a cherché. Dix fonds sur
 * quarante-cinq sont concernés, et la raison n'est pas la même pour tous :
 * huit sont trop jeunes, deux ne sont à la cote que depuis peu. Le titre
 * porte l'explication, comme la cellule des frais de gestion juste à côté.
 */
function useDouzeMois() {
  const t = useT();
  const fenetre = useFenetre();
  const noms = useNomFenetre();
  const def = FENETRES.find((f) => f.id === fenetre)!;
  return (r: FundRow) => {
    const v = valeurFenetre(r, fenetre);
    if (v != null) return { texte: signed(v), titre: depuisQuand(r, fenetre) };
    const nom = noms[fenetre];
    /* LE TROU PASSE AVANT LES TROIS AUTRES RAISONS, et c'est ce qui explique
       pourquoi trois mois rend moins de fonds que douze : la borne tombe
       dans une interruption de la série. Makeda Horizon n'a rien publié
       pendant 111 jours autour d'elle, Ecobank Obligataire 104. Le fonds
       n'est ni jeune ni mal lu : il manque juste une VL là où il en
       faudrait une, et aucune des trois autres phrases ne le disait. */
    if (r.curve?.trous?.includes(fenetre)) {
      return { texte: t("série trouée"), mention: true, titre: t("Aucune VL publiée autour d'il y a {f} : la série a un trou à cet endroit, et une valeur plus ancienne ne serait pas {f}.", { f: nom }) };
    }
    const raison = raisonSansFenetre(def.mois, r.inceptionDate, r.navDate, r.curve?.from);
    const titre =
      raison === "jeune" ? t("Le fonds n'a pas encore {f} : il n'y a rien à mesurer sur cette fenêtre.", { f: nom })
      : raison === "cote-recente" ? t("Le fonds est à la cote depuis moins de {f} : le bulletin ne publie pas de VL plus ancienne.", { f: nom })
      : raison === "lecture-courte" ? t("Nos VL ne remontent pas à {f} : le chiffre existe, nous ne l'avons pas encore lu.", { f: nom })
      : undefined;
    /* UN MOT PLUTÔT QU'UN TIRET. Le tiret portait son explication dans un
       survol, que le doigt n'a pas et que l'œil ne cherche pas : trois
       colonnes de tirets se lisaient « rien », alors qu'elles disent trois
       choses différentes. Le mot tient dans la colonne, et le survol garde
       la phrase entière. */
    const mot =
      raison === "jeune" ? t("trop jeune")
      : raison === "cote-recente" ? t("coté depuis peu")
      : raison === "lecture-courte" ? t("pas encore lu")
      : "—";
    return { texte: mot, mention: raison != null, titre };
  };
}

const cls = (v?: number) => (v == null || v === 0 ? "" : v > 0 ? styles.up : styles.down);
const num = (v?: number) => (v == null ? -Infinity : v);


/** One row of the table, with its « ··· ». */
function FundTr({ r }: { r: FundRow }) {
  const t = useT();
  const fenetre = useFenetre();
  const douze = useDouzeMois()(r);
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
      <td className={`${styles.r} ${cls(valeurFenetre(r, fenetre))}`} title={douze.titre}>
        {douze.mention ? <small className={styles.mention}>{douze.texte}</small> : douze.texte}
      </td>
      <td className={styles.r}>{r.managementFeePct != null ? fmtPct(r.managementFeePct, 2) : <span className="muted" title={t("Frais de gestion non renseignés : demandez le prospectus au desk.")}>—</span>}</td>
      {/* LE CUMUL, PUIS LE TAUX PAR AN. Les créations s'étalent de 2017 à
          2026 : trié sur le cumul, ce tableau classait l'âge. ASCA Patrimoine
          est premier avec +62,08 % et ne fait que 5,12 % par an, c'est-à-dire
          le ventre du peloton. Le taux par an est ce qui se compare, la date
          est ce qui explique l'écart. */}
      <td className={`${styles.r} ${styles.hideSm} ${cls(r.perfSinceInceptionPct)}`}>
        {signed(r.perfSinceInceptionPct)}
        {(r.annualPct != null || r.inceptionDate) && (
          <>
            <br />
            <small className="muted">
              {/* « {p} par an » et non « {p}/an » : une clef de trois lettres
                  se recopie d'un écran à l'autre et finit par vouloir dire
                  deux choses, ce que le cliquet des clefs presque vides
                  interdit depuis le comparateur. */}
              {r.annualPct != null ? t("{p} par an", { p: signed(r.annualPct) }) : t("moins de six mois")}
              {r.inceptionDate ? ` · ${r.inceptionDate.slice(0, 4)}` : ""}
            </small>
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
  const fenetre = useFenetre();
  const noms = useNomFenetre();
  const douze = useDouzeMois()(r);
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
      <span className={`${styles.liPerf} ${cls(valeurFenetre(r, fenetre))}`} title={douze.titre}>
        <b className={douze.mention ? styles.mention : undefined}>{douze.texte}</b>
        <small className="muted">{noms[fenetre]}</small>
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
  const depositary = sp.get("depositaire") ?? "";
  const groupe = (GROUPES.some(([k]) => k === sp.get("groupe")) ? sp.get("groupe") : "") as GroupKey | "";
  const sort = (SORT.some(([k]) => k === sp.get("tri")) ? sp.get("tri") : "categorie") as SortKey;
  const asc = (sp.get("sens") ?? NATURAL[sort]) === "asc";
  const vueChoisie = sp.get("vue") as Vue | null;
  /* LA FENÊTRE ET SA PLAGE VIVENT DANS L'ADRESSE, comme les filtres : une
     liste resserrée sur « les fonds entre 5 et 8 % sur trois ans » se partage,
     se met en favori, et revient telle qu'on l'a laissée. */
  const fenetre: FenetreId = estFenetre(sp.get("periode")) ? (sp.get("periode") as FenetreId) : FENETRE_PAR_DEFAUT;
  const noms = useNomFenetre();
  /* LA BANDE S'OUVRE FERMÉE. La liste est ce pour quoi on vient ; le tracé
     sert à choisir où regarder, ce qui est une seconde question. */
  const bandeOuverte = sp.get("bande") === "1";
  /**
   * LES FONDS ÉPINGLÉS, DANS L'ADRESSE COMME LE RESTE. Un point de la bande
   * fait monter son fonds juste dessous, au lieu de quitter la page : les
   * deux sont alors sous les yeux en même temps.
   */
  /* La liste épinglée est gardée SOUS SA FORME DE TEXTE pour les tableaux de
     dépendances : « epingles.join(",") » y est une expression composée, que
     le compilateur de React refuse. */
  const epingleParam = sp.get("epingle") ?? "";
  const epingles = useMemo(() => epingleParam.split(",").filter(Boolean), [epingleParam]);
  /* UNE SEULE ÉPINGLE À LA FOIS. Plusieurs tenaient debout en principe —
     comparer deux fonds est bien la question — mais elles empilaient des
     cartes entre le tracé et la liste, et le tracé qu'on voulait garder sous
     les yeux repartait vers le haut. Un nouveau point remplace donc le
     précédent, et le même point détache. */
  const basculerEpingle = (id: string) => {
    update({ epingle: epingles.includes(id) ? undefined : id, bande: "1" });
  };
  const bornes = (sp.get("perf") ?? "").split(":").map(Number);
  const plage: [number, number] | undefined = bornes.length === 2 && bornes.every((n) => Number.isFinite(n)) ? [bornes[0], bornes[1]] : undefined;
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
  /**
   * TOUT EFFACER EFFACE AUSSI LE TRI, et c'est ce qui manquait.
   *
   * Le bouton ne remettait que les filtres : qui avait trié par « 12 mois »
   * gardait son ordre après l'avoir touché, sans comprendre pourquoi la
   * liste ne revenait pas à ce qu'elle était. Et le tri n'avait pas de
   * sortie à lui : il est toujours à une valeur, donc sa liste n'offrait
   * jamais de retour au rangement par catégorie autrement qu'en le
   * choisissant à la main, parmi huit.
   *
   * « Tout » veut dire tout : les filtres, la recherche, l'ordre et son sens.
   */
  const clearAll = () => {
    pushed.current = "";
    setDraft("");
    /* La fenêtre et sa plage partent avec le reste. La fenêtre n'est pas un
       filtre, mais « tout effacer » veut dire « rends-moi la liste comme elle
       s'ouvre », et elle s'ouvre sur un an sans plage. C'est déjà la règle du
       tri, qui n'est pas un filtre non plus. */
    update({ q: undefined, cat: undefined, gestion: undefined, depositaire: undefined, tri: undefined, sens: undefined, periode: undefined, perf: undefined });
  };
  const setCat = (v: FundNav["category"] | "") => update({ cat: v || undefined });
  const setManager = (v: string) => update({ gestion: v || undefined });
  const setDepositary = (v: string) => update({ depositaire: v || undefined });
  const setGroupe = (v: GroupKey | "") => update({ groupe: v || undefined });
  const setSort = (v: SortKey) => update({ tri: v === "categorie" ? undefined : v, sens: undefined });
  // Depuis l'en-tête d'une colonne : la première fois son sens naturel, la
  // seconde l'inverse. C'est là qu'on cherche à trier un tableau.
  const pickSort = (k: SortKey) => {
    if (sort === k) update({ sens: asc ? "desc" : "asc" });
    else setSort(k);
  };
  const setAsc = (v: boolean) => update({ sens: v === (NATURAL[sort] === "asc") ? undefined : v ? "asc" : "desc" });

  const managers = useMemo(() => [...new Set(rows.map((r) => r.manager))].sort((a, b) => a.localeCompare(b, "fr")), [rows]);
  const depositaries = useMemo(() => [...new Set(rows.map((r) => r.depositary))].sort((a, b) => a.localeCompare(b, "fr")), [rows]);
  const [typing, setTyping] = useState(false);
  // Toucher une suggestion valide la recherche : le clavier se retire et la liste paraît.
  const { input: searchInput, list: searchList, commit: commitSearch } = useSearchCommit<HTMLInputElement, HTMLDivElement>();
  /**
   * CE QUE LES LETTRES TAPÉES RECONNAISSENT, ET LE DÉPOSITAIRE EN FAISAIT
   * PARTIE SANS JAMAIS SE MONTRER.
   *
   * Le champ promet trois choses : un fonds, une société de gestion, un
   * dépositaire. Le filtre tenait bien les trois — il cherche dans le nom, la
   * gestion ET le dépositaire — mais les suggestions n'en offraient que deux.
   * Taper « UBA » retirait donc trente-cinq fonds sans que rien ne dise
   * pourquoi : la liste se vidait, et le mot n'était reconnu nulle part.
   * Mesuré le 4 octobre 2026 sur la production : treize dépositaires, dont
   * « UBA CAMEROUN » (7 fonds), « UBA BANK CAMEROUN » (2) et « UBA CAMEROON »
   * (1), qui sont la même banque écrite trois fois. Le bulletin les écrit
   * ainsi, nous les reprenons tels quels, et les trois paraissent.
   *
   * TROIS SORTES, TROIS PARTS RÉSERVÉES. Les gestions passaient d'abord et
   * les huit places pouvaient leur revenir en entier : « asset » reconnaît
   * treize sociétés sur treize, et plus un seul fonds n'apparaissait. Chaque
   * sorte a donc trois places au plus, et les fonds prennent ce qui reste.
   *
   * L'ISIN N'EST PAS CHERCHABLE, ET CE N'EST PAS UN OUBLI : les quarante-cinq
   * fonds n'en ont pas. La colonne « isin » porte leur clef interne
   * (« fcp-ab-cash »), parce que le Bulletin Officiel de la Cote ne publie
   * pas d'ISIN pour les OPCVM. Promettre « un ISIN » dans ce champ serait
   * promettre ce que la donnée ne contient pas.
   */
  const suggestions = useMemo(() => {
    const d = fold(draft.trim());
    if (!typing || d.length < 2) return [] as { kind: "gestion" | "depositaire" | "fonds"; text: string }[];
    const reconnus = (liste: string[], deja: string) => liste.filter((x) => fold(x).includes(d) && x !== deja);
    return [
      ...reconnus(managers, manager).slice(0, 3).map((text) => ({ kind: "gestion" as const, text })),
      ...reconnus(depositaries, depositary).slice(0, 3).map((text) => ({ kind: "depositaire" as const, text })),
      ...rows.filter((r) => fold(r.title).includes(d) && fold(r.title) !== d).map((r) => ({ kind: "fonds" as const, text: r.title })),
    ].slice(0, 8);
  }, [draft, typing, managers, manager, depositaries, depositary, rows]);

  const filtered = useMemo(() => {
    const ql = fold(draft.trim());
    /* La plage ne retire que des fonds MESURABLES sur la fenêtre : un fonds
       sans chiffre n'est pas « hors plage », il est hors mesure, et le faire
       disparaître ferait croire qu'il a été jugé. */
    const dansLaPlage = (r: FundRow) => {
      if (!plage) return true;
      const v = valeurFenetre(r, fenetre);
      return v != null && v >= plage[0] - 0.001 && v <= plage[1] + 0.001;
    };
    const list = rows.filter((r) => (!cat || r.category === cat) && (!manager || r.manager === manager) && (!depositary || r.depositary === depositary) && dansLaPlage(r) && (!ql || fold(`${r.title} ${r.manager} ${r.depositary}`).includes(ql)));
    const cmp = (a: FundRow, b: FundRow) => {
      switch (sort) {
        case "nom":
          return a.title.localeCompare(b.title, "fr");
        case "gestion":
          return a.manager.localeCompare(b.manager, "fr") || a.title.localeCompare(b.title, "fr");
        case "vl":
          return a.nav - b.nav;
        case "an":
          return num(valeurFenetre(a, fenetre)) - num(valeurFenetre(b, fenetre));
        default:
          return Number(b.open) - Number(a.open) || a.title.localeCompare(b.title, "fr");
      }
    };
    // « par catégorie » est un rangement, pas une mesure : il garde son ordre.
    const dir = sort === "categorie" ? 1 : asc ? 1 : -1;
    return [...list].sort((a, b) => dir * cmp(a, b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, draft, cat, manager, depositary, sort, asc, fenetre, plage?.[0], plage?.[1]]);

  /* Les épinglés sortent de la liste : ils sont montrés à part, et les voir
     deux fois ferait croire à un doublon.
     MÉMOÏSÉ, et pas par goût : « rowsShown » nourrit le calcul des groupes,
     qui l'est aussi. Une liste refabriquée à chaque rendu défait la
     mémoïsation de celui qui la lit, et le compilateur de React le refuse
     plutôt que de la perdre en silence. */
  /* LE FONDS ÉPINGLÉ RESTE DANS LA LISTE, et ce qui paraît sous le tracé en
     est une copie. Il en sortait, pour ne pas le montrer deux fois ; mais
     épingler est un geste de lecture et non un filtre, et une liste qui perd
     une ligne quand on la désigne cesse d'être la liste. */
  const fondsEpingles = useMemo(() => rows.filter((r) => epingles.includes(r.id)), [rows, epingles]);
  const rowsShown = useMemo(() => (sort === "categorie" ? CATS.flatMap((c) => filtered.filter((r) => r.category === c)) : filtered), [filtered, sort]);

  /**
   * LA BANDE NE SE FILTRE PAS ELLE-MÊME. Elle montre les fonds retenus par
   * tous les autres filtres, plage comprise ou non : si elle ne montrait que
   * la plage, resserrer ferait disparaître le reste de la distribution et on
   * ne saurait plus par rapport à quoi on s'est resserré.
   */
  const pourLaBande = useMemo(() => {
    const ql = fold(draft.trim());
    return rows
      .filter((r) => (!cat || r.category === cat) && (!manager || r.manager === manager) && (!depositary || r.depositary === depositary) && (!ql || fold(`${r.title} ${r.manager} ${r.depositary}`).includes(ql)))
      .flatMap((r) => {
        const v = valeurFenetre(r, fenetre);
        return v == null ? [] : [{ id: r.id, titre: r.title, valeur: v }];
      });
  }, [rows, draft, cat, manager, depositary, fenetre]);

  /* Le compte de chaque bouton : les fonds MESURABLES sur cette fenêtre,
     tous filtres appliqués sauf la plage. Un bouton qui annonce quarante-cinq
     et rend trente-huit lignes ment sur ce qu'il va faire. */
  const comptes = useMemo(() => {
    const ql = fold(draft.trim());
    const base = rows.filter((r) => (!cat || r.category === cat) && (!manager || r.manager === manager) && (!depositary || r.depositary === depositary) && (!ql || fold(`${r.title} ${r.manager} ${r.depositary}`).includes(ql)));
    return Object.fromEntries(FENETRES.map((f) => [f.id, base.filter((r) => valeurFenetre(r, f.id) != null).length])) as Record<FenetreId, number>;
  }, [rows, draft, cat, manager, depositary]);
  /**
   * LES GROUPES SUIVENT L'ORDRE DE LA LISTE, pas un ordre à eux.
   *
   * Un groupe naît quand son premier fonds paraît : le tri choisi commande
   * donc aussi l'ordre des blocs, et changer de tri ne rebat pas les cartes
   * d'une façon qu'on n'a pas demandée. Groupé par catégorie et trié par
   * catégorie, on retrouve l'ordre de la maison — du plus calme au plus
   * mobile — sans qu'on ait à l'écrire deux fois.
   *
   * LA CLEF N'EST PAS LE NOM : la bande collante va chercher le bloc par un
   * sélecteur d'attribut, et « L'ARCHER ASSET MANAGEMENT » y porte une
   * apostrophe et des espaces. « fundKey » en fait « l-archer-asset-
   * management », ce qu'un sélecteur accepte sans échappement.
   */
  const groupes = useMemo(() => {
    if (!groupe) return [];
    const nomDe = (r: FundRow) => (groupe === "gestion" ? r.manager : groupe === "depositaire" ? r.depositary : t(FUND_CATEGORY_LABEL[r.category]));
    const out: { clef: string; entier: string; rows: FundRow[] }[] = [];
    const vus = new Map<string, number>();
    for (const r of rowsShown) {
      const entier = nomDe(r) || t("Non renseigné");
      const clef = fundKey(entier) || "sans-nom";
      if (!vus.has(clef)) {
        vus.set(clef, out.length);
        out.push({ clef, entier, rows: [] });
      }
      out[vus.get(clef)!].rows.push(r);
    }
    /* LE NOM COURT SE CALCULE SUR LA LISTE ENTIÈRE, pas groupe par groupe :
       savoir qu'un mot ne distingue rien demande de voir tous les noms. */
    const brefs = nomsCourts(out.map((g) => g.entier));
    return out.map((g) => ({ ...g, nom: brefs.get(g.entier) ?? g.entier }));
  }, [groupe, rowsShown, t]);
  /** Les blocs à rendre : les groupes, ou la liste entière comme un seul bloc muet. */
  const blocs = groupe && groupes.length > 0 ? groupes : [{ clef: "", nom: "", entier: "", rows: rowsShown }];
  /** Ce que le sommaire du titre propose : les mêmes groupes, sans leurs lignes. */
  const sommaire = groupes.map((g) => ({ clef: g.clef, nom: g.nom, entier: g.entier, n: g.rows.length }));
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
  const active = Number(Boolean(cat)) + Number(Boolean(manager)) + Number(Boolean(depositary));
  /* CE QUI EST POSÉ SUR LA LISTE, tri compris : le bouton doit paraître quand
     la liste n'est plus celle qu'on trouve en arrivant, et un ordre choisi
     suffit à l'en éloigner. */
  const poseSurLaListe = active > 0 || Boolean(draft) || sort !== "categorie" || Boolean(sp.get("sens")) || fenetre !== FENETRE_PAR_DEFAUT || Boolean(plage);

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
  /**
   * EN PORTRAIT, LA CARTE ET RIEN D'AUTRE, et le choix des vues disparaît.
   *
   * Un tableau de sept colonnes dans 384 px se lit en le faisant glisser de
   * côté, et une liste d'un trait y perd ses chiffres. Les deux étaient
   * offertes, donc choisies, donc subies. Ce qui reste est ce qui sert : la
   * densité des cartes, et la feuille qui dit ce qu'une carte porte.
   */
  const vue: Vue = phone ? "cards" : (vueChoisie ?? "table");
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
   * CE QUI RESTE PASTILLE, c'est ce qu'aucune commande ne montre : la société
   * de gestion et le dépositaire, qui ne s'obtiennent qu'en touchant une
   * suggestion du champ. La catégorie se retire là où elle se prend, en
   * touchant « Toutes » ou la pastille déjà enfoncée, et la périodicité dans
   * sa liste ; les répéter en dessous aurait dit deux fois la même chose à
   * deux centimètres d'écart.
   */
  const actifs: { clef: string; quoi?: string; valeur: string; retirer: () => void }[] = [];
  if (manager) actifs.push({ clef: "gestion", quoi: "Gestion", valeur: manager, retirer: () => setManager("") });
  if (depositary) actifs.push({ clef: "depositaire", quoi: "Dépositaire", valeur: depositary, retirer: () => setDepositary("") });

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
                    /* Une gestion et un dépositaire FILTRENT : ce sont des
                       listes fermées, et l'on veut tous leurs fonds. Un nom
                       de fonds CHERCHE : c'est un texte, et il peut en
                       désigner plusieurs. */
                    if (sug.kind === "gestion") update({ gestion: sug.text, q: undefined });
                    else if (sug.kind === "depositaire") update({ depositaire: sug.text, q: undefined });
                    else setQ(sug.text);
                  })
                }
              >
                <em>{t(sug.kind === "gestion" ? "Gestion" : sug.kind === "depositaire" ? "Dépositaire" : "Fonds")}</em>
                <b>{sug.text}</b>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  /**
   * LA CATÉGORIE RESTE À PLAT, LA PÉRIODICITÉ RETOURNE DANS UNE LISTE.
   *
   * Ce n'est pas une hésitation, c'est une différence de rang. La catégorie
   * est LA question qu'on se pose devant quarante-cinq fonds — monétaire ou
   * actions, c'est-à-dire tranquille ou mobile — et ses quatre valeurs
   * méritent d'être lues sans geste. La périodicité de la VL est un détail
   * d'exécution, qu'on regarde quand on sait déjà ce qu'on cherche : elle
   * tient dans une liste qui tombe du bord de son bouton, comme les filtres
   * des titres, et laisse sa place à l'écran.
   *
   * LA RANGÉE À PLAT PORTE SON « TOUTES », qui est la sortie : on retire le
   * filtre là où on l'a pris, sans aller chercher ailleurs de quoi l'annuler.
   * Toucher la pastille déjà enfoncée fait la même chose, pour qui s'attend à
   * ce qu'un interrupteur s'éteigne comme il s'allume.
   *
   * Les valeurs viennent des lignes reçues, pas d'une liste écrite d'avance :
   * une catégorie que personne ne pratique n'a pas de pastille, et un filtre
   * ne mène donc jamais à une liste vide.
   */
  const rangee = (etiquette: string, valeur: string, toutes: string, options: [string, string][], choisir: (v: string) => void) => (
    /* L'ÉTIQUETTE RESTE, MAIS POUR L'OREILLE SEULEMENT. Écrite à l'écran,
       « CATÉGORIE » prenait toute une ligne sur un téléphone : les cinq
       pastilles tiennent dans 343 px des 384 disponibles, l'étiquette les
       poussait à 417 et les renvoyait à la ligne suivante. « Toutes ·
       Monétaire · Obligataire · Diversifié · Actions » se nomme tout seul
       pour qui voit ; un lecteur d'écran, lui, a besoin qu'on le dise, et
       c'est ce que fait « aria-label ». */
    <div className={styles.rangee} role="group" aria-label={t(etiquette)}>
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
    <FenetreCtx.Provider value={fenetre}>
      {/* LE BOUTON DES FILTRES RAMÈNE EN HAUT, puisqu'il n'y a plus de
          feuille ici : les commandes sont à plat, et c'est vers elles qu'il
          conduit. Il ne paraît qu'une fois la barre passée sous l'en-tête ;
          le retour en haut de page, lui, a son propre bouton à droite. */}
      {/* LE BOUTON FLOTTANT EST PARTI. Il ramenait en haut, ce que le
          retour en haut fait déjà à deux centimètres de là, et il couvrait
          une rangée de la liste en bas d'écran, là où le pouce lit. */}
      <BackToTop watch={toolsRef} />
      <div className={styles.tools} data-coach="fonds-filtres" ref={toolsRef}>
        {/* UN CHAMP, DEUX RANGÉES, PUIS CE QUE LA LISTE DIT D'ELLE-MÊME.
            Rien derrière un bouton, rien dans une feuille : tout ce qui
            commande cette liste est sous les yeux, du champ au tri. */}
        <div className={styles.barre}>{recherche}</div>
        {/* TROIS LIGNES SOUS LE CHAMP, ET PAS UNE DE PLUS.
            Les pastilles de catégorie, puis les trois listes, puis les vues.
            Les étiquettes de rangée ont disparu : « CATÉGORIE » prenait sa
            ligne entière sur un téléphone (les cinq pastilles tiennent sur
            384 px, l'étiquette les faisait passer à 417), et « Toutes ·
            Monétaire · Obligataire » n'a jamais eu besoin qu'on dise de quoi
            c'est la liste. */}
        <div className={styles.aplat}>
          {rangee(
            "Catégorie",
            cat,
            "Toutes",
            CATS.filter((c) => c !== "?" && rows.some((r) => r.category === c)).map((c) => [c, FUND_CATEGORY_LABEL[c]]),
            (v) => setCat(v as FundNav["category"] | ""),
          )}
          {/* LES TROIS LISTES CÔTE À CÔTE : à quel rythme la VL est frappée,
              comment la liste se range, dans quel ordre. Chacune tombe du bord
              de son propre bouton, règle de la maison, et c'est la liste des
              titres : un seul objet pour les deux pages.
              La flèche ne paraît pas sur « par catégorie », qui est un
              rangement et non une mesure : il n'y a pas de sens à inverser. */}
          <div className={styles.rangee}>
            <Dropdown label="Grouper" single effacable={false} items={GROUPES} selected={new Set([groupe || "aucun"])} onChange={(s) => setGroupe((([...s][0] ?? "aucun") === "aucun" ? "" : [...s][0]) as GroupKey | "")} />
            <Dropdown label="Tri" single effacable={sort !== "categorie"} items={SORT} selected={new Set([sort])} onChange={(s) => setSort((([...s][0] as SortKey) ?? "categorie") as SortKey)} />
            {sort !== "categorie" && (
              <button type="button" className={styles.dirBtn} onClick={() => setAsc(!asc)} aria-label={t(asc ? "Ordre croissant" : "Ordre décroissant")} title={t("Inverser l'ordre")}>
                {asc ? "↑" : "↓"}
              </button>
            )}
          </div>
          {actifs.map((f) => (
            <div key={f.clef} className={styles.rangee}>
              <span className={styles.quoi}>{t(f.quoi ?? "")}</span>
              <button type="button" className={`${styles.pst} ${styles.pstOn}`} onClick={f.retirer} aria-label={`${t("Retirer ce filtre")} : ${f.valeur}`}>
                {f.valeur} <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
        </div>
        {/* LE COMPTE EST PARTI. « 25 obligataires correspondant aux filtres »
            répétait ce que la liste montre déjà, sur une ligne qui coûtait sa
            hauteur à chaque écran, et dont personne ne tire une décision : on
            ne compte pas des fonds, on en cherche un. Ce qui restait d'utile
            sur cette ligne — effacer, trier — a rejoint les listes au-dessus. */}
        <div className={styles.count}>
          {/* « TOUT EFFACER » À GAUCHE DU CHOIX DES VUES : il défait ce que
              les commandes du dessus ont posé, et il se tient donc au bout de
              leur ligne plutôt qu'au milieu d'elles.
              IL RESTE LÀ MÊME SANS RIEN À EFFACER, éteint : un bouton qui
              n'apparaît qu'au moment où l'on en a besoin ne s'apprend
              jamais, et c'est à ce moment-là qu'on le cherche. */}
          <button type="button" className={styles.clear} onClick={clearAll} disabled={!poseSurLaListe} title={poseSurLaListe ? undefined : t("Rien à effacer")}>
            {t("Tout effacer")}
          </button>
          {!phone && (
            <div className={styles.seg} role="group" aria-label={t("Affichage")}>
              {(["table", "list", "cards"] as Vue[]).map((v) => (
                <button key={v} type="button" aria-pressed={vue === v} onClick={() => update({ vue: v })}>
                  {t(v === "table" ? "Tableau" : v === "list" ? "Liste" : "Cartes")}
                </button>
              ))}
            </div>
          )}
          {/* LE RESSERREMENT DES CARTES SUIT LE CHOIX DES VUES, à sa droite :
              il ne règle que la vue cartes, et il se lisait mal posé avant
              elle, comme s'il commandait les trois. Il ne paraît d'ailleurs
              que sur cette vue, parce qu'un réglage sans effet visible se lit
              comme une panne. */}
          {vue === "cards" && !desk && <DensitySwitch />}
        </div>
      </div>

      {/* LA FENÊTRE, PUIS LA BANDE, PUIS LA LISTE. Elles sont hors du bloc des
          filtres, et c'est voulu : un filtre retire des fonds, la fenêtre
          change ce que la colonne MESURE. Les mêler ferait croire que choisir
          « 3 ans » retire les fonds plus jeunes, alors qu'elle les laisse
          avec un tiret qui dit pourquoi. */}
      <BandeauRepliable
        titre={t("Rentabilité des fonds")}
        ouvert={bandeOuverte}
        surOuvrir={(v) => update({ bande: v ? "1" : undefined })}
        resume={
          <>
            <span>
              <b>{pourLaBande.length}</b> {t("fonds mesurables")}
            </span>
            {pourLaBande.length > 0 && <span>{t("de {bas} à {haut}", { bas: fmtPct(Math.min(...pourLaBande.map((p) => p.valeur)), 1), haut: fmtPct(Math.max(...pourLaBande.map((p) => p.valeur)), 1) })}</span>}
            <span>{t("mesurés sur {f}", { f: noms[fenetre] })}</span>
            {plage ? <span className={styles.resumePose}>{t("plage posée")}</span> : null}
          </>
        }
      >
        {/* LA FENÊTRE EST DANS LE BANDEAU, avec la bande qu'elle commande :
            posée dehors, elle réglait une mesure dont le tracé était replié,
            et on changeait de durée sans rien voir changer. La colonne du
            tableau, elle, suit toujours. */}
        <ChoixFenetre fenetre={fenetre} comptes={comptes} surChoix={(f) => update({ periode: f === FENETRE_PAR_DEFAUT ? undefined : f, perf: undefined })} />
        <BandeFonds
          points={pourLaBande}
          nomFenetre={noms[fenetre]}
          plage={plage}
          epingles={epingles}
          surEpingle={basculerEpingle}
          surPlage={(p) => update({ perf: p ? `${p[0]}:${p[1]}` : undefined })}
        />
      </BandeauRepliable>

      {/* LES FONDS ÉPINGLÉS, JUSTE SOUS LE TRACÉ. */}
      {fondsEpingles.length > 0 && (
        <section className={styles.epingles} aria-label={t("Fonds épinglés")}>
          <div className={styles.epinglesTete}>
            <span>{fondsEpingles.length > 1 ? t("{n} fonds épinglés", { n: fondsEpingles.length }) : t("1 fonds épinglé")}</span>
            <button type="button" className={styles.detacherTout} onClick={() => update({ epingle: undefined })}>
              {t("Tout détacher")}
            </button>
          </div>
          {fondsEpingles.map((r) => (
            <div key={r.id} className={styles.epingle}>
              <FundCard r={r} />
              <button type="button" className={styles.detacher} onClick={() => basculerEpingle(r.id)} aria-label={`${t("Détacher")} ${r.title}`} title={t("Détacher")}>
                ×
              </button>
            </div>
          ))}
        </section>
      )}

      {rowsShown.length > 0 && vue === "cards" && (
        <div data-coach="fonds-table" ref={searchList} className={styles.debutDeListe}>
          {blocs.map((b) => (
            <section key={b.clef || "tout"} className={styles.bloc} aria-labelledby={b.clef ? `sec-${b.clef}` : undefined}>
              {b.clef && <TeteGroupe id={`sec-${b.clef}`} nom={b.nom} entier={b.entier} n={b.rows.length} groupes={sommaire} unite="fonds" />}
              <div className={styles.cards} data-sep={sep}>
                {b.rows.map((r) => (
                  <FundCard key={r.id} r={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {rowsShown.length > 0 && vue === "list" && (
        <div data-coach="fonds-table" ref={searchList} className={styles.debutDeListe}>
          {blocs.map((b) => (
            <section key={b.clef || "tout"} className={styles.bloc} aria-labelledby={b.clef ? `sec-${b.clef}` : undefined}>
              {b.clef && <TeteGroupe id={`sec-${b.clef}`} nom={b.nom} entier={b.entier} n={b.rows.length} groupes={sommaire} unite="fonds" />}
              <ul className={styles.list}>
                {b.rows.map((r) => (
                  <FundLi key={r.id} r={r} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {rowsShown.length > 0 && vue === "table" && (
        <section className={`${styles.group} ${styles.debutDeListe}`} data-coach="fonds-table">
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
                  </th>
                  {/* « Var. » et « Depuis l'origine » restent des colonnes et
                      ne sont plus des ordres : la première est le pas d'une
                      semaine, la seconde classe l'âge du fonds. */}
                  <th className={styles.r}>
                    {t("Var.")} <Info term="variation_vl" subtle />
                  </th>
                  {/* LA COLONNE PORTE LE NOM DE LA FENÊTRE. Elle disait
                      « 12 mois » en dur : une colonne qui change de contenu
                      sans changer de nom est un chiffre qu'on lira de
                      travers. */}
                  {sortTh("an", noms[fenetre], styles.r)}
                  {/* Les frais de gestion sont prélevés dans la VL : la performance
                      affichée en est déjà nette, mais c'est le coût qui décide de ce
                      qu'un épargnant garde sur cinq ans, et personne ne le publie. */}
                  <th className={styles.r}>{t("Frais/an")}</th>
                  <th className={`${styles.r} ${styles.hideSm}`}>{t("Depuis l'origine")}</th>
                  <th></th>
                </tr>
              </thead>
              {/* UN CORPS DE TABLE PAR GROUPE, avec sa ligne de tête. Le
                  sommaire conduit au corps, qui porte l'ancre : c'est la
                  même mécanique que pour les cartes, à ceci près qu'un
                  tableau ne tolère pas une section entre ses rangées. */}
              {blocs.map((b) => (
                <tbody key={b.clef || "tout"} aria-labelledby={b.clef ? `sec-${b.clef}` : undefined}>
                  {b.clef && (
                    <tr className={styles.teteRangee}>
                      <td colSpan={8} id={`sec-${b.clef}`}>
                        {b.nom} <b>{b.rows.length}</b>
                      </td>
                    </tr>
                  )}
                  {b.rows.map((r) => (
                    <FundTr key={r.id} r={r} />
                  ))}
                </tbody>
              ))}
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
    </FenetreCtx.Provider>
  );
}
