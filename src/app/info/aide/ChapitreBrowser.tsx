"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import type { AideRow } from "@/lib/guide-index-shared";
import { helpFeedback } from "./actions";
import styles from "./aide.module.css";

/**
 * UN CHAPITRE DE L'AIDE, SUR SA PAGE.
 *
 * Ses réponses s'ouvrent en place, comme avant — c'est la bonne forme pour une
 * question qu'on parcourt. Ce qui change est au-dessus : le chapitre n'est plus
 * un accordéon parmi huit sur une page d'index, il a son adresse. Une réponse
 * se partage donc par « /info/aide/<chapitre>#q-<question> », et la recherche
 * y mène directement, sans rien déplier.
 *
 * LA PREMIÈRE RÉPONSE S'OUVRE SEULE QUAND L'ADRESSE LA NOMME, et seulement
 * alors : arriver sur un chapitre ne doit pas ouvrir huit réponses, et arriver
 * sur une réponse ne doit pas obliger à la chercher des yeux.
 */
export function ChapitreBrowser({ id, rows, wa }: { id: string; rows: AideRow[]; wa: string }) {
  const t = useT();
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [, start] = useTransition();

  useEffect(() => {
    const go = () => {
      const m = /^#q-(.+)$/.exec(window.location.hash);
      if (!m) return;
      const slug = decodeURIComponent(m[1]);
      setOpenSlug(slug);
      window.setTimeout(() => document.getElementById(`q-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
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

  return (
    <div className={styles.chapitre} data-coach="aide-chapitre">
      {rows.map((r) => {
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
                  {id === "connexion" && (
                    <Link className="btn sm primary" href="/connexion">
                      {t("Aller à la connexion")}
                    </Link>
                  )}
                  {id === "compte" && (
                    <Link className="btn sm primary" href="/ouvrir-un-compte">
                      {t("Ouvrir mon compte")}
                    </Link>
                  )}
                  {(id === "lignes" || id === "intentions") && (
                    <Link className="btn sm primary" href="/titres">
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
      })}
    </div>
  );
}
