"use client";

import type { Offer } from "@/lib/domain/types";
import { useDates, useT } from "@/i18n/client";
import { joursEnMots } from "@/lib/domain/echeances";
import styles from "./CalendrierDeLaLigne.module.css";

/**
 * LE CALENDRIER D'UNE LIGNE, DANS L'EXTENSION DE SA CARTE (9 novembre 2026, adjudications).
 *
 * Une séance d'adjudication a des étapes datées : l'ouverture des soumissions, la clôture, les résultats quand le Trésor les annonce, le règlement, l'échéance de la ligne. Elles s'écrivent l'une sous l'autre, chacune avec sa date ;
 * celles qui sont passées sont pleines, la prochaine porte le temps qui reste. Aucune date n'est inventée : une étape sans date n'est pas écrite.
 */
const JOUR = 86_400_000;
const minuit = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

export function CalendrierDeLaLigne({ o, aujourdhui }: { o: Offer; aujourdhui: string }) {
  const t = useT();
  const { fmtDate, fmtHeure } = useDates();
  const etapes: { cle: string; mot: string; jour: string; heure?: string }[] = [
    { cle: "ouverture", mot: "Ouverture des soumissions", jour: o.opensAt?.slice(0, 10) ?? "" },
    { cle: "cloture", mot: "Clôture des soumissions", jour: o.deadlineAt?.slice(0, 10) ?? "", heure: o.deadlineAt },
    { cle: "resultats", mot: "Résultats", jour: o.resultsAt?.slice(0, 10) ?? "" },
    { cle: "reglement", mot: "Règlement", jour: o.settleOn ?? "" },
    { cle: "echeance", mot: "Échéance de la ligne", jour: o.maturityOn ?? "" },
  ].filter((e) => e.jour);
  const prochaine = etapes.findIndex((e) => e.jour >= aujourdhui);
  /* LE TEMPS QUI RESTE SE DIT PAR « joursEnMots » (la règle de la maison : « aujourd'hui », « demain », « dans {n} jours »), jamais réécrit ici. */
  const reste = (jour: string) => {
    const q = joursEnMots(Math.round((minuit(jour) - minuit(aujourdhui)) / JOUR));
    return t(q.key, q.params);
  };
  return (
    <ol className={styles.calendrier} aria-label={t("Calendrier de la ligne")}>
      {etapes.map((e, i) => {
        const etat = i < prochaine || prochaine === -1 ? "passee" : i === prochaine ? "prochaine" : "avenir";
        return (
          <li key={e.cle} data-etat={etat}>
            <i aria-hidden="true" />
            <span className={styles.mot}>{t(e.mot)}</span>
            <span className={styles.quand}>
              {fmtDate(e.jour)}
              {e.heure && e.cle === "cloture" ? ` · ${fmtHeure(e.heure)}` : ""}
              {etat === "prochaine" && <em>{reste(e.jour)}</em>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
