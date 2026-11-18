"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Drapeau } from "@/components/Drapeau";
import { deverrouiller, verrouiller } from "@/components/mobile/verrou-defilement";
import { useT } from "@/i18n/client";
import { tic } from "@/lib/ui/haptique";
import type { ItemStatut } from "./chargerStatuts";
import styles from "./Statuts.module.css";

/**
 * LES STATUTS (17 novembre 2026) : une rangée de ronds, un rond par ligne que le desk a retenue, et une visionneuse plein écran.
 *
 * Le premier rond ouvre la première page : le message du desk, sur le logo. Chaque autre rond ouvre la page de sa ligne, avec « Voir la fiche » et « Passer un ordre ».
 * L'anneau or dit « ouverte », pas « vite » : aucun compte à rebours, aucune urgence. Rien ne défile seul : on touche à droite pour avancer, à gauche pour reculer,
 * on tire vers le bas ou on touche la croix pour fermer (Échap et les flèches au clavier).
 */
export function Statuts({ message, items }: { message: string; items: ItemStatut[] }) {
  const t = useT();
  const [page, setPage] = useState<number | null>(null);
  const total = items.length + 1;
  const ouvrir = (n: number) => {
    tic(6);
    setPage(n);
  };
  const fermer = useCallback(() => setPage(null), []);
  return (
    <section className={styles.rangee} aria-label={t("Statuts")}>
      <h2 className={styles.titre}>{t("Statuts")}</h2>
      <ul className={styles.ronds}>
        <li>
          <button type="button" className={`${styles.rond} ${styles.logo}`} onClick={() => ouvrir(0)} aria-haspopup="dialog">
            <span className={styles.anneau} aria-hidden="true">
              <b>G</b>
            </span>
            <span className={styles.nom}>{t("La semaine")}</span>
          </button>
        </li>
        {items.map((it, i) => (
          <li key={it.id}>
            <button type="button" className={styles.rond} onClick={() => ouvrir(i + 1)} aria-haspopup="dialog">
              <span className={`${styles.anneau} ${it.ouverte ? styles.ouverte : ""}`} aria-hidden="true">
                <Drapeau pays={it.pays} largeur={26} />
              </span>
              <span className={styles.nom}>{it.nom}</span>
            </button>
          </li>
        ))}
      </ul>
      {page !== null && <Visionneuse message={message} items={items} page={page} total={total} aller={setPage} fermer={fermer} />}
    </section>
  );
}

function Visionneuse({ message, items, page, total, aller, fermer }: { message: string; items: ItemStatut[]; page: number; total: number; aller: (n: number) => void; fermer: () => void }) {
  const t = useT();
  const [monte, setMonte] = useState(false);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const it = page > 0 ? items[page - 1] : undefined;

  useEffect(() => {
    verrouiller();
    const id = requestAnimationFrame(() => setMonte(true));
    return () => {
      cancelAnimationFrame(id);
      deverrouiller();
    };
  }, []);
  const suivant = useCallback(() => (page < total - 1 ? aller(page + 1) : fermer()), [page, total, aller, fermer]);
  const precedent = useCallback(() => (page > 0 ? aller(page - 1) : undefined), [page, aller]);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
      else if (e.key === "ArrowRight") suivant();
      else if (e.key === "ArrowLeft") precedent();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [fermer, suivant, precedent]);

  const fin = (x: number, y: number) => {
    const d = depart.current;
    depart.current = null;
    if (!d) return;
    if (y - d.y > 80 && Math.abs(x - d.x) < 60) fermer();
  };
  return createPortal(
    <div className={`${styles.voile} ${monte ? styles.monte : ""}`} role="dialog" aria-modal="true" aria-label={t("Statuts")} onPointerDown={(e) => (depart.current = { x: e.clientX, y: e.clientY })} onPointerUp={(e) => fin(e.clientX, e.clientY)}>
      <div className={styles.pages} aria-hidden="true">
        {Array.from({ length: total }, (_, n) => (
          <i key={n} className={n <= page ? styles.faite : undefined} />
        ))}
      </div>
      <button type="button" className={styles.fermer} onClick={fermer} aria-label={t("Fermer")}>
        ×
      </button>
      <button type="button" className={`${styles.zone} ${styles.gauche}`} onClick={precedent} aria-label={t("Page précédente")} tabIndex={page > 0 ? 0 : -1} />
      <button type="button" className={`${styles.zone} ${styles.droite}`} onClick={suivant} aria-label={page < total - 1 ? t("Page suivante") : t("Fermer")} />
      {it ? (
        <article className={styles.ligne} aria-live="polite">
          <span className={styles.pastille}>{it.etat}</span>
          <h2>{it.titre}</h2>
          <p className={styles.emetteur}>{it.emetteur}</p>
          <p className={styles.chiffre}>
            <b>{it.hero}</b>
            <small>{it.heroSub}</small>
          </p>
          <div className={styles.boutons}>
            <Link href={it.fiche} className="btn" onClick={fermer}>
              {t("Voir la fiche")}
            </Link>
            {it.ordre && (
              <Link href={it.ordre} className="btn primary" onClick={fermer}>
                {t("Passer un ordre")}
              </Link>
            )}
          </div>
        </article>
      ) : (
        <article className={styles.premiere} aria-live="polite">
          <p>{message}</p>
        </article>
      )}
    </div>,
    document.body,
  );
}
