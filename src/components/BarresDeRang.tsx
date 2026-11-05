"use client";

import Link from "next/link";
import { useT } from "@/i18n/client";
import type { LigneClassee } from "@/lib/market/comparatif";
import { BulleNoire, type Lecture } from "./charts/lecture";
import styles from "./BarresDeRang.module.css";

const signe = (v: number) => `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

/**
 * LES BARRES DU COMPARATIF : LE FONDS ET SES PAIRS, RANGÉS PAR PERFORMANCE (11 novembre 2026, planche « Comparatif », option A).
 *
 * Une rangée par fonds : son nom, sa barre (à partir de zéro, vers la gauche pour une baisse), sa performance sur la période. Le fonds lu est en or. Toucher une rangée ouvre la bulle
 * noire (au-dessus du dessin, jamais sous le doigt) et fait de ce pair celui du lien « Comparer … → », qui mène à la page « Comparer » avec les deux fonds. La zone a la hauteur de la courbe
 * qu'elle remplace (même rapport largeur/hauteur) : changer de mesure ne déplace rien.
 */
export function BarresDeRang({ lignes, choisi, onChoisir, idDuFonds, titreDuFonds, depuisLe }: { lignes: LigneClassee[]; choisi?: string; onChoisir: (id: string) => void; idDuFonds: string; titreDuFonds: string; depuisLe: (iso: string) => string }) {
  const t = useT();
  const bas = Math.min(0, ...lignes.map((l) => l.pct));
  const haut = Math.max(0, ...lignes.map((l) => l.pct));
  const etendue = haut - bas || 1;
  const zero = (-bas / etendue) * 100;
  const pair = lignes.find((l) => l.id === choisi && !l.moi) ?? lignes.find((l) => !l.moi);
  const lue = lignes.find((l) => l.id === choisi);
  const lecture: Lecture | null = lue
    ? {
        titre: lue.titre,
        lignes: [
          { nom: t("Rang"), valeur: `${lue.rang}`, couleur: "var(--ink-3)" },
          { nom: t("Performance"), valeur: signe(lue.pct), couleur: "var(--gold)" },
          ...(lue.depuis ? [{ nom: t("Depuis la VL du"), valeur: depuisLe(lue.depuis), couleur: "var(--ink-3)" }] : []),
        ],
      }
    : null;
  return (
    <div className={styles.zone}>
      <BulleNoire lecture={lecture} x={160} W={320} />
      <ul className={styles.rangs} aria-label={t("Fonds de la même catégorie, du mieux classé au moins bien classé")}>
        {lignes.map((l) => {
          const g = l.pct < 0 ? zero - (Math.abs(l.pct) / etendue) * 100 : zero;
          const largeur = (Math.abs(l.pct) / etendue) * 100;
          return (
            <li key={l.id}>
              <button type="button" className={`${styles.rang} ${l.moi ? styles.moi : ""} ${l.id === choisi ? styles.choisi : ""}`} aria-pressed={l.id === choisi} onClick={() => onChoisir(l.id)}>
                <span className={styles.nom}>{l.titre}</span>
                <span className={styles.piste} aria-hidden="true">
                  <i style={{ left: `${g}%`, width: `${Math.max(largeur, 1.5)}%` }} />
                </span>
                <b className={styles.val}>{signe(l.pct)}</b>
              </button>
            </li>
          );
        })}
      </ul>
      {pair && (
        <Link className={styles.lien} href={`/comparer?a=${encodeURIComponent(idDuFonds)}&b=${encodeURIComponent(pair.id)}`}>
          {t("Comparer {a} et {b}", { a: titreDuFonds, b: pair.titre })} →
        </Link>
      )}
    </div>
  );
}
