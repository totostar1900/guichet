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
  kind: "terme" | "lecon" | "outil" | "page";
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

export function InfoSearch({ entries }: { entries: SearchEntry[] }) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const KIND: Record<SearchEntry["kind"], string> = { terme: t("Définition"), lecon: t("Leçon"), outil: t("Outil"), page: t("Page") };

  const { results, words, asked } = useMemo(() => {
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
      .sort((a, b) => b.score - a.score || a.e.title.localeCompare(b.e.title, "fr"))
      .slice(0, 8);
    return { results, words: [...words, ...alts], asked };
  }, [q, entries]);

  const go = (href: string) => {
    setQ("");
    const hash = href.startsWith("/info#") ? href.slice("/info#".length) : href.startsWith("#") ? href.slice(1) : null;
    if (hash && revealAnchor(hash)) return;
    router.push(href);
  };
  const shown = q.trim().length >= 2;

  return (
    <div className={styles.wrap} ref={box}>
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
          aria-label={t("Rechercher dans l'aide")}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              go(results[active].e.href);
            } else if (e.key === "Escape") setQ("");
          }}
        />
        {q && (
          <button type="button" className={styles.clear} onClick={() => setQ("")} aria-label={t("Effacer")}>
            ×
          </button>
        )}
      </label>
      {shown && (
        <div className={styles.results} role="listbox" aria-label={t("Résultats")}>
          <div className={styles.resultsHead}>
            {results.length > 0 ? (
              <span>
                <b>{results.length}</b> {t(results.length > 1 ? "résultats pour" : "résultat pour")} « {words.slice(0, 3).join(" ") || q.trim()} » : {t("Entrée ouvre le premier")}
              </span>
            ) : (
              <span>{t("Aucun résultat")}</span>
            )}
          </div>
          {results.map(({ e }, i) => (
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
          {results.length === 0 && (
            <div className={styles.empty}>
              {t("Rien trouvé pour")} « {q} ». {t("Posez la question au desk depuis n'importe quelle fiche (bouton « Question ») ou sur WhatsApp.")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
