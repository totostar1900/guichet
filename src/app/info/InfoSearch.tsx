"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./InfoSearch.module.css";

/**
 * The support box of the Guide tab: one field, every word, notion, lesson,
 * tool or page of the app behind it. A question works as well as a word
 * (« c'est quoi un coupon », « what is a coupon ») : the filler is dropped,
 * plurals and a few everyday synonyms are understood. Results rank title
 * matches first, show the sentence where the word appears, Enter opens the
 * first one, and a result inside this page scrolls to the spot and lights it up.
 */
export interface SearchEntry {
  /* « service » et « instrument » sont entrés le 24 octobre 2026, avec la page
     de recherche : un lecteur qui tape « prélèvement » ou « rachats du Trésor »
     ne cherche ni une définition ni un éclairage, et l'étiquette du résultat
     doit le lui dire avant qu'il clique. */
  kind: "terme" | "lecon" | "outil" | "page" | "service" | "instrument";
  title: string;
  text: string;
  href: string;
  extra?: string; // aliases (« OTA », « VL ») that should also match
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'");

// Words a question is made of, in both languages : never what the reader is looking for.
const STOP = new Set("qu est ce que quoi c un une le la les des du de d l au aux et ou en sur pour dans veut dire signifie definition definir comment fonctionne marche ca what is are a an the does do mean means meaning how work works define explain me my mon ma mes je j on peut puis".split(" "));
// Everyday words → the words the glossary uses.
const SYN: Record<string, string[]> = {
  interet: ["coupon", "rendement"],
  taux: ["rendement", "coupon"],
  gain: ["rendement", "coupon", "dividende"],
  rapporte: ["rendement"],
  vl: ["valeur liquidative"],
  fcp: ["fonds"],
  opcvm: ["fonds"],
  sicav: ["fonds"],
  bon: ["bta", "ota", "tresor"],
  etat: ["tresor", "bta", "ota"],
  prix: ["cours"],
  cours: ["prix"],
  acheter: ["souscrire", "intention", "secondaire"],
  achat: ["souscrire", "intention"],
  vendre: ["intention", "secondaire", "cession"],
  vente: ["intention", "secondaire"],
  argent: ["regler", "virement", "paiement"],
  payer: ["regler", "paiement"],
  paiement: ["regler"],
  password: ["code", "connexion"],
  login: ["connexion"],
  connecter: ["connexion"],
  compte: ["ouvrir un compte", "connexion"],
  risque: ["risques"],
  interest: ["coupon", "yield"],
  yield: ["rendement"],
  price: ["prix", "cours"],
  fund: ["fonds"],
  bond: ["obligation"],
  share: ["action"],
  stock: ["action"],
  buy: ["souscrire", "intention"],
  sell: ["intention", "secondaire"],
  pay: ["regler", "paiement"],
  account: ["compte"],
  help: ["aide"],
  /* CE QU'ON CHERCHE QUAND ON CHERCHE UN RÉGLAGE, dans les deux langues.
     Relevé à l'écran le 28 octobre 2026 : « j'ai cherché la langue et je n'ai
     pas trouvé le réglage ». La page existait et était indexée ; aucun des
     mots qu'on tape pour la trouver n'y figurait. Les mots-clefs de la page
     règlent le cas de « langue » ; ceux-ci règlent les mots voisins, que la
     page ne dira jamais d'elle-même sans devenir une liste de synonymes. */
  /* LES CLEFS SONT DES MOTS RÉDUITS : `stem` retire le « s » final avant de
     consulter cette table, donc « réglages » y entre comme « reglage » et
     « settings » comme « setting ». Une clef au pluriel ne serait jamais
     consultée. */
  reglage: ["parametrages"],
  parametre: ["parametrages"],
  preference: ["parametrages"],
  setting: ["parametrages", "langue"],
  language: ["langue", "parametrages"],
  langue: ["parametrages"],
  english: ["langue", "parametrages"],
  french: ["langue", "parametrages"],
  traduction: ["langue"],
  theme: ["couleurs", "parametrages"],
  couleur: ["parametrages"],
  dark: ["couleurs", "theme"],
  notification: ["alertes", "parametrages"],
};
const stem = (w: string) => (w.length > 3 ? w.replace(/(s|x)$/, "") : w);

function snippet(text: string, words: string[]): string {
  const f = fold(text);
  let at = -1;
  for (const w of words) {
    const i = f.indexOf(w);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) return text.slice(0, 140) + (text.length > 140 ? "…" : "");
  const prev = f.lastIndexOf(". ", at);
  const start = prev < 0 ? 0 : prev + 2;
  const end = f.indexOf(". ", at);
  const s = text.slice(start, end > 0 ? end + 1 : Math.min(text.length, at + 160));
  return s.length > 200 ? s.slice(0, 200) + "…" : s;
}

/** Brings the reader to an element of this page and lights it up for a moment. */
export function revealAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.remove("flash");
  void el.offsetWidth; // restart the animation when the same spot is opened twice
  el.classList.add("flash");
  window.setTimeout(() => el.classList.remove("flash"), 2800);
  history.replaceState(null, "", `#${id}`);
  return true;
}

/**
 * The words of a query, the results ranked (title matches first), and whether it was a question.
 *
 * ELLE NE COUPE PLUS, ET C'EST CE QUI REND LE COMPTE VRAI. Elle tranchait à
 * huit, et l'en-tête annonçait « 8 résultats » : mesuré le 24 octobre 2026,
 * « fonds » en a 49, « compte » 41, « ordre » 39. Le lecteur lisait un total
 * qui était une limite d'affichage, et ne pouvait pas savoir qu'il manquait
 * quarante et une réponses. Classer et montrer sont deux gestes : celui-ci
 * classe, l'affichage décide de ce qu'il montre et le dit.
 */
export function rankEntries(entries: SearchEntry[], q: string): { results: { e: SearchEntry; score: number }[]; words: string[]; asked: boolean } {
  const raw = fold(q)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
  const words = raw.filter((w) => !STOP.has(w)).map(stem);
  const asked = raw.length > words.length; // the reader typed a question, not just a word
  if (words.length === 0) return { results: [], words, asked };
  const alts = words.flatMap((w) => (SYN[w] ?? []).map(stem));
  const results = entries
    .map((e) => {
      const title = fold(e.title + " " + (e.extra ?? ""));
      const body = fold(e.text);
      const tw = title.split(/[^a-z0-9]+/).map(stem);
      let score = 0;
      for (const w of words) {
        if (tw.includes(w)) score += 10;
        else if (title.includes(w)) score += 6;
        if (body.includes(w)) score += 2;
      }
      for (const w of alts) {
        if (tw.includes(w)) score += 4;
        else if (title.includes(w)) score += 2;
        else if (body.includes(w)) score += 1;
      }
      if (e.kind === "terme" && asked) score += 1; // a question wants a definition first
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.e.title.localeCompare(b.e.title, "fr"));
  return { results, words: [...words, ...alts], asked };
}

/**
 * LE SEUL CHAMP DE RECHERCHE DE LA MAISON, ET SES QUATRE PLACEMENTS.
 *
 * Il y en avait TROIS, sur le même classement : celui-ci, celui de la feuille
 * du compte (`MenuRecherche`) et celui de la barre du Guide (`GuideBar`). Les
 * deux derniers portaient la MÊME ligne, copiée caractère pour caractère :
 *
 *   t(e.kind === "terme" ? "Définition" : e.kind === "lecon" ? "Éclairage"
 *     : e.kind === "outil" ? "Outil" : "Aide")
 *
 * Quatre branches pour six genres. Mesuré le 24 octobre 2026 : « Prélèvement
 * automatique », un SERVICE, s'étiquetait « Aide » dans la feuille et
 * « Service » sur la page ; « Rachats par le Trésor », un INSTRUMENT, pareil.
 * Un genre de plus retombait sur « Aide » dans deux surfaces sur trois, sans
 * que rien n'échoue — et le ternaire dans t() est invisible au scanner de
 * clefs, donc même la traduction ne le signalait pas.
 *
 * TROIS RENDUS POUR UN CLASSEMENT, C'ÉTAIT DEUX DE TROP. Il n'en reste qu'un,
 * et les placements ne diffèrent plus que par deux choses : combien de lignes
 * ils montrent, et ce qu'ils font après un clic. Tout le reste — l'étiquette,
 * la phrase où le mot apparaît, les flèches, le compte — est écrit une fois.
 */
export function InfoSearch({
  entries,
  auto,
  vide,
  limit,
  close,
  dense,
  depart,
}: {
  entries: SearchEntry[];
  /** La page de recherche n'a que ce champ : le curseur s'y pose. Dans le Guide, non : le champ y est un outil parmi d'autres, et voler le curseur ferait sauter la page au clavier. */
  auto?: boolean;
  /** Ce qui se lit tant qu'on n'a rien tapé : sur la page dédiée, les questions les plus posées. */
  vide?: React.ReactNode;
  /** Combien de lignes ce placement montre. Sans limite — la page — il les montre toutes. */
  limit?: number;
  /** Dans une feuille, elle se referme sur un résultat ; sur une page, il n'y a rien à fermer. */
  close?: () => void;
  /** Dans une feuille : la phrase se replie sur une ligne, pour que six résultats et le lien du bas tiennent à l'écran. */
  dense?: boolean;
  /** La question déjà tapée ailleurs : la colonne de l'écran large passe la sienne en arrivant. */
  depart?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState(depart ?? "");
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const KIND: Record<SearchEntry["kind"], string> = { terme: t("Définition"), lecon: t("Éclairage"), outil: t("Outil"), page: t("Page"), service: t("Service"), instrument: t("Instrument") };

  const { results, words, asked } = useMemo(() => rankEntries(entries, q), [q, entries]);
  /* Le classement donne tout, le placement montre ce qu'il peut : la page les
     affiche tous, une feuille les six premiers. Le compte, lui, reste celui du
     classement — c'est la seule façon qu'il ne mente pas. */
  const montres = limit === undefined ? results : results.slice(0, limit);
  const reste = results.length - montres.length;

  const go = (href: string) => {
    setQ("");
    close?.();
    const hash = href.startsWith("/info#") ? href.slice("/info#".length) : href.startsWith("#") ? href.slice(1) : null;
    if (hash && revealAnchor(hash)) return;
    router.push(href);
  };
  const shown = q.trim().length >= 2;
  /* L'index d'une feuille arrive après l'ouverture : sans lui, « aucun
     résultat » accuserait la question au lieu d'annoncer l'attente. */
  const attend = entries.length === 0;

  return (
    <div className={`${styles.wrap} ${dense ? styles.dense : ""}`} ref={box}>
      <label className={styles.field}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          placeholder={t("Un mot, une question… ex. coupon couru, c'est quoi une adjudication, VL, relevé")}
          aria-label={t("Rechercher")}
          autoComplete="off"
          autoFocus={auto}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(montres.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && montres[active]) {
              e.preventDefault();
              go(montres[active].e.href);
            } else if (e.key === "Escape") setQ("");
          }}
        />
        {q && (
          <button type="button" className={styles.clear} onClick={() => setQ("")} aria-label={t("Effacer")}>
            ×
          </button>
        )}
      </label>
      {!shown && vide}
      {shown && (
        <div className={styles.results} role="listbox" aria-label={t("Résultats")}>
          <div className={styles.resultsHead}>
            {results.length > 0 ? (
              <span>
                <b>{results.length}</b> {t(results.length > 1 ? "résultats pour" : "résultat pour")} « {words.slice(0, 3).join(" ") || q.trim()} »
                {reste > 0 ? ` · ${t("les {n} premiers", { n: String(montres.length) })}` : ` : ${t("Entrée ouvre le premier")}`}
              </span>
            ) : (
              <span>{attend ? t("Un instant…") : t("Aucun résultat")}</span>
            )}
          </div>
          {montres.map(({ e }, i) => (
            <button key={e.href + e.title} type="button" role="option" aria-selected={i === active} className={`${styles.item} ${i === active ? styles.on : ""}`} onMouseEnter={() => setActive(i)} onClick={() => go(e.href)}>
              <span className={`${styles.kind} ${styles[e.kind]}`}>{KIND[e.kind]}</span>
              <span className={styles.body}>
                <b>{e.kind === "terme" && asked ? `${t("Qu'est-ce que")} « ${e.title.split(" : ")[0]} » ?` : e.title}</b>
                <small>{e.kind === "terme" ? snippet(e.text, []) : snippet(e.text, words)}</small>
              </span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </button>
          ))}
          {results.length === 0 && !attend && (
            <div className={styles.empty}>
              {t("Rien trouvé pour")} « {q} ». {t("Posez la question au desk depuis n'importe quelle fiche (bouton « Question ») ou sur WhatsApp.")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
