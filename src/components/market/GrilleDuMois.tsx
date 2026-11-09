"use client";

import Link from "next/link";
import { useState } from "react";
import { useDates, useLang, useT } from "@/i18n/client";
import styles from "./GrilleDuMois.module.css";

/** Une séance posée sur son jour de clôture : ce qu'il faut pour la nommer et mener à sa fiche. */
export interface SeanceDuMois {
  id: string;
  titre: string;
  /** Le jour de clôture, « YYYY-MM-DD ». */
  jour: string;
  /** L'heure de clôture, ISO complet, pour la dire. */
  clotureLe: string;
  href: string;
}

const UTC = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * LE CALENDRIER DES SÉANCES, SOUS LA LISTE DES ADJUDICATIONS (9 novembre 2026, planche « Cartes, adjudications, portefeuille », 2B).
 *
 * Un mois, une grille de sept colonnes qui commence le lundi ; un point sur chaque jour où une séance se clôt, le jour d'aujourd'hui cerné. On touche un jour : ses séances s'écrivent dessous, chacune est un lien vers sa
 * fiche. Les flèches changent de mois. Il ne montre que les séances annoncées : il n'en invente aucune.
 */
export function GrilleDuMois({ seances, aujourdhui }: { seances: SeanceDuMois[]; aujourdhui: string }) {
  const t = useT();
  const lang = useLang();
  const { fmtHeure, fmtDate } = useDates();
  const prochaine = seances.map((s) => s.jour).filter((j) => j >= aujourdhui).sort()[0] ?? aujourdhui;
  const [mois, setMois] = useState(prochaine.slice(0, 7));
  const [choisi, setChoisi] = useState<string | null>(seances.some((s) => s.jour === prochaine) ? prochaine : null);
  const premier = UTC(`${mois}-01`);
  const loc = lang === "en" ? "en-GB" : "fr-FR";
  const nom = premier.toLocaleDateString(loc, { month: "long", year: "numeric", timeZone: "UTC" });
  /* Lundi en premier : getUTCDay vaut 0 le dimanche. */
  const decalage = (premier.getUTCDay() + 6) % 7;
  const nb = new Date(Date.UTC(premier.getUTCFullYear(), premier.getUTCMonth() + 1, 0)).getUTCDate();
  const jours = Array.from({ length: nb }, (_, i) => iso(new Date(Date.UTC(premier.getUTCFullYear(), premier.getUTCMonth(), i + 1))));
  const noms = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(loc, { weekday: "narrow", timeZone: "UTC" }));
  const parJour = new Map<string, SeanceDuMois[]>();
  for (const s of seances) parJour.set(s.jour, [...(parJour.get(s.jour) ?? []), s]);
  const bouger = (d: number) => {
    const n = new Date(Date.UTC(premier.getUTCFullYear(), premier.getUTCMonth() + d, 1));
    setMois(iso(n).slice(0, 7));
    setChoisi(null);
  };
  const duJour = choisi ? parJour.get(choisi) ?? [] : [];
  return (
    <div className={styles.mois}>
      <div className={styles.tete}>
        <button type="button" className={styles.fleche} onClick={() => bouger(-1)} aria-label={t("Mois précédent")}>
          ‹
        </button>
        <b className={styles.nom} aria-live="polite">
          {nom}
        </b>
        <button type="button" className={styles.fleche} onClick={() => bouger(1)} aria-label={t("Mois suivant")}>
          ›
        </button>
      </div>
      <div className={styles.grille} role="grid" aria-label={nom}>
        {noms.map((n, i) => (
          <span key={i} className={styles.jourNom} aria-hidden="true">
            {n}
          </span>
        ))}
        {Array.from({ length: decalage }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {jours.map((j) => {
          const n = parJour.get(j)?.length ?? 0;
          return (
            <button key={j} type="button" className={`${styles.jour} ${j === aujourdhui ? styles.auj : ""} ${j === choisi ? styles.choisi : ""}`} disabled={n === 0} aria-pressed={j === choisi} aria-label={n ? `${fmtDate(j)} : ${n}` : fmtDate(j)} onClick={() => setChoisi(j === choisi ? null : j)}>
              {Number(j.slice(8))}
              {n > 0 && <i className={styles.point} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {choisi && duJour.length > 0 && (
        <ul className={styles.liste}>
          {duJour.map((s) => (
            <li key={s.id}>
              <Link href={s.href} className={styles.ligne}>
                <b>{s.titre}</b>
                <small>
                  {t("Clôture")} · {fmtHeure(s.clotureLe)}
                </small>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!choisi && <p className={styles.dit}>{t("Touchez un jour marqué pour lire ses séances.")}</p>}
    </div>
  );
}
