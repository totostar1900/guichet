"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { COMPANY } from "@/lib/config";
import type { AideRow } from "@/lib/guide-index-shared";
import { TOP_QUESTIONS } from "@/lib/guide-index-shared";
import { helpFeedback } from "./actions";
import styles from "./aide.module.css";

/**
 * The help as a page that answers: the question first (a search over every
 * question of this page), the subjects as tiles, each answer opening in place
 * with what to do next, and a conseiller at the end. The desk learns which
 * answers helped.
 */
export interface AideChapter {
  id: string;
  title: string;
  intro: React.ReactNode; // the chapter's lead, list or flow, rendered by the server
  rows: AideRow[];
}

const ICON: Record<string, string> = {
  guichet: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v5M12 16h.01",
  connexion: "M5 10h14v10H5zM8 10V7a4 4 0 0 1 8 0v3",
  compte: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 4-7 8-7s8 3 8 7",
  lignes: "M4 7h16M4 12h16M4 17h10",
  intentions: "M4 12h12M12 6l6 6-6 6",
  reglement: "M6 3h9l4 4v14H6zM9 12h6M9 16h6",
  contact: "M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20z",
  entretien: "M14 6a4 4 0 0 0-5.6 3.7L3 15l2 2 5.3-5.4A4 4 0 0 0 16 8l-2.5 2.5-1.5-1.5z",
};

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function AideBrowser({ chapters, wa }: { chapters: AideChapter[]; wa: string }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [, start] = useTransition();
  const all = useMemo(() => chapters.flatMap((c) => c.rows), [chapters]);
  const top = TOP_QUESTIONS.map((s) => all.find((r) => r.slug === s)).filter((r): r is AideRow => Boolean(r));
  const words = fold(q)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
  const match = (r: AideRow) => words.length === 0 || words.every((w) => fold(r.q + " " + r.a).includes(w));
  const searching = words.length > 0;
  const found = searching ? all.filter(match) : [];

  // Arriving on #q-<slug> (from the search or the menu): open that answer and bring it into view.
  useEffect(() => {
    const go = () => {
      const m = /^#q-(.+)$/.exec(window.location.hash);
      if (!m) return;
      setOpenSlug(decodeURIComponent(m[1]));
      window.setTimeout(() => document.getElementById(`q-${decodeURIComponent(m[1])}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);

  const vote = (r: AideRow, useful: boolean) => {
    setVoted((v) => ({ ...v, [r.slug]: useful }));
    start(async () => {
      await helpFeedback(r.slug, useful);
    });
  };

  const answer = (r: AideRow) => {
    const open = openSlug === r.slug;
    return (
      <div key={r.slug} id={`q-${r.slug}`} className={`${styles.qa} ${open ? styles.qaOpen : ""}`}>
        <button type="button" className={styles.qaHead} aria-expanded={open} onClick={() => setOpenSlug(open ? null : r.slug)}>
          <b>{r.q}</b>
          <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        {open && (
          <div className={styles.qaBody}>
            <p>{r.a}</p>
            <div className={styles.qaActions}>
              {r.chapter === "connexion" && (
                <Link className="btn sm primary" href="/connexion">
                  {t("Aller à la connexion")}
                </Link>
              )}
              {r.chapter === "compte" && (
                <Link className="btn sm primary" href="/ouvrir-un-compte">
                  {t("Ouvrir mon compte")}
                </Link>
              )}
              {(r.chapter === "lignes" || r.chapter === "intentions") && (
                <Link className="btn sm primary" href="/">
                  {t("Voir les lignes")}
                </Link>
              )}
              <a className="btn sm" href={wa} target="_blank" rel="noopener">
                {t("Écrire sur WhatsApp")}
              </a>
            </div>
            <div className={styles.vote}>
              <span>{voted[r.slug] == null ? t("Cette réponse vous a aidé ?") : voted[r.slug] ? t("Merci.") : t("Merci : nous la réécrivons.")}</span>
              {voted[r.slug] == null && (
                <>
                  <button type="button" onClick={() => vote(r, true)}>
                    {t("Oui")}
                  </button>
                  <button type="button" onClick={() => vote(r, false)}>
                    {t("Non")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.hero} data-coach="aide-page">
        <b>{t("Une question ? Tapez-la, ou choisissez un sujet.")}</b>
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ex. je n'ai pas reçu le code")} aria-label={t("Rechercher dans l'aide")} autoComplete="off" />
        </label>
        <div className={styles.chips}>
          <small>{t("On nous demande souvent :")}</small>
          {top.map((r) => (
            <a key={r.slug} href={`#q-${r.slug}`}>
              {r.q}
            </a>
          ))}
        </div>
      </div>

      {searching ? (
        <section className={styles.found}>
          <h2>{found.length ? t("{n} réponses", { n: found.length }) : t("Aucune réponse ne contient ces mots")}</h2>
          {found.map(answer)}
          {found.length === 0 && (
            <a className="btn sm primary" href={wa} target="_blank" rel="noopener">
              {t("Poser la question sur WhatsApp")}
            </a>
          )}
        </section>
      ) : (
        <>
          <div className={styles.tiles} data-coach="aide-nav">
            {chapters.map((c) => (
              <a key={c.id} href={`#${c.id}`} className={styles.tile}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={ICON[c.id] ?? ICON.guichet} />
                </svg>
                <b>{c.title}</b>
                <small>{c.rows.length ? t("{n} questions", { n: c.rows.length }) : t("en clair")}</small>
              </a>
            ))}
          </div>
          {chapters.map((c) => (
            <section key={c.id} id={c.id} className={styles.chapter} data-coach={c.id === "contact" ? "aide-contact" : c.id === "entretien" ? "aide-entretien" : undefined}>
              <div className={styles.chapterHead}>
                <h2>{c.title}</h2>
                {c.rows.length > 0 && <small>{t("{n} questions", { n: c.rows.length })}</small>}
              </div>
              <div className={styles.intro}>{c.intro}</div>
              {c.rows.map(answer)}
            </section>
          ))}
        </>
      )}

      <div className={styles.stuck}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20z" />
        </svg>
        <span>
          <b>{t("Toujours bloqué ?")}</b>
          <small>{t("un conseiller répond sur WhatsApp dans l'heure ouvrée, ou au {phone}", { phone: COMPANY.phone })}</small>
        </span>
        <a href={wa} target="_blank" rel="noopener">
          {t("Écrire")}
        </a>
      </div>
    </div>
  );
}
