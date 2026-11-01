"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./TuilesDossier.module.css";

export interface TuileDeDossier {
  cle: string;
  href: string;
  nom: string;
  /** La ligne qui dit ce qui compte — jamais un compte dans le nom. */
  resume: string;
  /** Ce que l'ouverture révèle : au plus deux lignes. */
  lignes: { texte: string; note?: string }[];
  etiquette?: string;
}
export interface Geste {
  href: string;
  nom: string;
}

/**
 * LE DOSSIER EN TUILES QUI SE DÉVELOPPENT. Fermées, deux par ligne, chacune
 * porte son information ; au toucher, UNE s'ouvre sur toute la largeur et
 * révèle deux lignes de plus puis renvoie à sa page. Une seule à la fois : deux
 * ouvertes ne se lisent plus comme un sommaire. Fermées au chargement — la page
 * ne retient pas l'état, c'est un coup d'œil, pas un réglage.
 *
 * Le dernier carré d'un nombre impair s'étire sur la rangée : une case vide à
 * côté d'une tuile se lit comme un manque.
 *
 * « VOUS POUVEZ AUSSI » RESTE OUVERT, toujours : trois gestes que le client peut
 * faire lui-même, et que la page ne cache pas derrière un chevron.
 */
export function TuilesDossier({ titre, items, aussiTitre, gestes, ouvrir, replier }: { titre: string; items: TuileDeDossier[]; aussiTitre: string; gestes: Geste[]; ouvrir: string; replier: string }) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const impair = items.length % 2 === 1;
  return (
    <section className={styles.bloc} aria-label={titre}>
      <span className="eyebrow">{titre}</span>
      {items.length > 0 && (
        <div className={styles.grille}>
          {items.map((x, i) => {
            const est = ouvert === x.cle;
            const large = est || (impair && i === items.length - 1);
            return (
              <div key={x.cle} className={`${styles.tuile} ${large ? styles.large : ""} ${est ? styles.ouverte : ""}`}>
                <button type="button" className={styles.entete} aria-expanded={est} onClick={() => setOuvert(est ? null : x.cle)} title={est ? replier : undefined}>
                  <span className={styles.nom}>
                    <b>{x.nom}</b>
                    <small>{x.resume}</small>
                  </span>
                  {x.etiquette && <span className={styles.etiquette}>{x.etiquette}</span>}
                  <svg className={`${styles.chev} ${est ? styles.haut : ""}`} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {est && (
                  <div className={styles.corps}>
                    {x.lignes.map((l, k) => (
                      <span key={k} className={styles.ligne}>
                        <b>{l.texte}</b>
                        {l.note && <small>{l.note}</small>}
                      </span>
                    ))}
                    <Link href={x.href} className={styles.ouvrir}>
                      {ouvrir} →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {gestes.length > 0 && (
        <div className={styles.aussi}>
          <b>{aussiTitre}</b>
          <ul>
            {gestes.map((g) => (
              <li key={g.href + g.nom}>
                <Link href={g.href}>
                  <span>{g.nom}</span>
                  <svg className={styles.plus} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
