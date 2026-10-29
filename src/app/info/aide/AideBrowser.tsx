"use client";

import { fold } from "@/lib/text";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import { COMPANY } from "@/lib/config";
import type { AideRow } from "@/lib/guide-index-shared";
import { TOP_QUESTIONS } from "@/lib/guide-index-shared";
import styles from "./aide.module.css";

/**
 * L'AIDE COMME INDEX, ET RIEN D'AUTRE.
 *
 * Elle portait les huit chapitres DEUX FOIS : en tuiles, puis en accordéons
 * juste dessous. La tuile ne menait donc pas à son chapitre, elle sautait à
 * une ancre deux écrans plus bas, qu'il fallait encore déplier. Et chaque
 * tuile annonçait un compte — « 11 questions » — qui ne dit pas si la réponse
 * cherchée s'y trouve, et qui mentait déjà sur « Ce que Guichet fait pour
 * vous », lequel n'en porte aucune et affichait « en clair ».
 *
 * Chaque chapitre a désormais son adresse, « /info/aide/<chapitre> » : une
 * réponse se partage, se met en favori, et la recherche y mène sans rien
 * déplier. Cette page garde ce qu'un index doit garder — le champ qui cherche
 * dans les quarante et une réponses, et les huit portes.
 */
export interface AideChapter {
  id: string;
  title: string;
  promesse?: string;
  rows: AideRow[];
}

export const ICON: Record<string, string> = {
  guichet: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v5M12 16h.01",
  connexion: "M5 10h14v10H5zM8 10V7a4 4 0 0 1 8 0v3",
  compte: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 4-7 8-7s8 3 8 7",
  lignes: "M4 7h16M4 12h16M4 17h10",
  intentions: "M4 12h12M12 6l6 6-6 6",
  reglement: "M6 3h9l4 4v14H6zM9 12h6M9 16h6",
  contact: "M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20z",
  entretien: "M14 6a4 4 0 0 0-5.6 3.7L3 15l2 2 5.3-5.4A4 4 0 0 0 16 8l-2.5 2.5-1.5-1.5z",
};

/** L'adresse d'une réponse : sa page de chapitre, puis son ancre. */
export const lienReponse = (r: AideRow): string => `/info/aide/${r.chapter}#q-${r.slug}`;

export function AideBrowser({ chapters, wa }: { chapters: AideChapter[]; wa: string }) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const all = useMemo(() => chapters.flatMap((c) => c.rows), [chapters]);

  /**
   * « /info/aide#q-<question> » MÈNE ENCORE À SA RÉPONSE.
   *
   * C'était l'adresse de chacune des quarante et une réponses tant qu'elles
   * vivaient toutes sur cette page : elle est partie dans des messages, et
   * l'index de recherche la visait jusqu'à ce matin. Elle n'ouvre plus rien
   * ici — la réponse est sur la page de son chapitre, et c'est là qu'on
   * l'envoie, sans laisser d'étape dans l'historique.
   */
  useEffect(() => {
    const go = () => {
      const m = /^#q-(.+)$/.exec(window.location.hash);
      if (!m) return;
      const slug = decodeURIComponent(m[1]);
      const r = all.find((x) => x.slug === slug);
      if (r) router.replace(lienReponse(r));
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, [all, router]);
  const top = TOP_QUESTIONS.map((s) => all.find((r) => r.slug === s)).filter((r): r is AideRow => Boolean(r));
  const words = fold(q)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
  const match = (r: AideRow) => words.length === 0 || words.every((w) => fold(r.q + " " + r.a).includes(w));
  const searching = words.length > 0;
  const found = searching ? all.filter(match) : [];

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
            <Link key={r.slug} href={lienReponse(r)}>
              {r.q}
            </Link>
          ))}
        </div>
      </div>

      {searching ? (
        <section className={styles.found}>
          <h2>{found.length ? t("{n} réponses", { n: found.length }) : t("Aucune réponse ne contient ces mots")}</h2>
          {/* LE RÉSULTAT MÈNE À SA PAGE, il ne s'ouvre plus ici : la réponse
              vit à une adresse, et c'est cette adresse qu'on partage. */}
          <div className={styles.resultats}>
            {found.map((r) => (
              <Link key={r.slug} href={lienReponse(r)} className={styles.resultat}>
                <b>{r.q}</b>
                <small>{r.chapterTitle}</small>
              </Link>
            ))}
          </div>
          {found.length === 0 && (
            <a className="btn sm primary" href={wa} target="_blank" rel="noopener">
              {t("Poser la question sur WhatsApp")}
            </a>
          )}
        </section>
      ) : (
        <div className={styles.tiles} data-coach="aide-nav">
          {chapters.map((c) => (
            /* La tuile porte le repère que portait le chapitre déplié : la
               visite guidée garde son arrêt, il vise la porte au lieu du
               contenu. */
            <Link key={c.id} href={`/info/aide/${c.id}`} className={styles.tile} data-coach={c.id === "entretien" ? "aide-entretien" : undefined}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={ICON[c.id] ?? ICON.guichet} />
              </svg>
              <b>{c.title}</b>
              {c.promesse ? <small>{c.promesse}</small> : null}
            </Link>
          ))}
        </div>
      )}

      <div className={styles.stuck} data-coach="aide-contact">
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
