"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./Anomalies.module.css";

/**
 * Ce que la table a attrapé, là où le desk travaille.
 *
 * Le crible existait déjà, et vivait sur la page Analyses : une personne qui
 * relit des communiqués n'y va pas. Une file de travail qui n'est pas sur
 * l'écran de travail n'est pas une file, c'est un rapport.
 *
 * Elle se replie parce qu'on relit une séance à la fois et qu'un panneau
 * permanent finit par ne plus se voir. Le compte, lui, reste visible : c'est
 * lui qui fait ouvrir.
 *
 * Chaque ligne est un lien vers sa séance. Une anomalie n'est pas un verdict,
 * c'est un chemin vers la pièce, et le seul geste qu'elle demande est d'aller
 * regarder.
 */

export interface LigneAnomalie {
  id: string;
  quand: string;
  pays: string;
  instrument: string;
  tenor: string;
  code?: string;
  /** Déjà mise en mots par le serveur : la clef et ses paramètres y sont résolus. */
  dit: string;
  verifier: string;
  confirmee: boolean;
}

export function Anomalies({ lignes, vues, courante }: { lignes: LigneAnomalie[]; vues: number; courante?: string }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  if (!lignes.length) {
    return vues > 0 ? <p className={styles.rien}>{t("Rien à vérifier. {n} anomalie(s) déjà rangée(s).", { n: vues })}</p> : null;
  }

  const confirmees = lignes.filter((l) => l.confirmee).length;

  return (
    <div className={styles.bloc}>
      <button type="button" className={styles.tete} aria-expanded={ouvert} onClick={() => setOuvert((v) => !v)}>
        <span className={styles.compte}>{lignes.length}</span>
        <span>
          {t("à vérifier sur la pièce")}
          {confirmees > 0 && <em className={styles.deja}>{t("dont {n} déjà relue(s)", { n: confirmees })}</em>}
        </span>
        <span className={styles.chevron} aria-hidden="true">
          {ouvert ? "▴" : "▾"}
        </span>
      </button>

      {ouvert && (
        <ul className={styles.liste}>
          {lignes.map((l) => (
            <li key={`${l.id}-${l.dit}`} className={l.id === courante ? styles.ici : undefined}>
              <Link href={`/desk/adjudications?s=${l.id}`} scroll={false}>
                <span className={styles.quand}>
                  {l.pays} · {l.quand}
                  {/* Une anomalie déjà entrée dans les références passe devant, et le dit. */}
                  {l.confirmee && <em className={styles.relue}>{t("relue")}</em>}
                </span>
                <span className={styles.quoi}>{l.dit}</span>
                <span className={styles.verifier}>{t("À regarder : {q}", { q: l.verifier })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {ouvert && vues > 0 && <p className={styles.rien}>{t("{n} anomalie(s) déjà rangée(s) ailleurs.", { n: vues })}</p>}
    </div>
  );
}
