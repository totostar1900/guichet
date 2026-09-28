"use client";

import { useState, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import styles from "./Commentaire.module.css";

/**
 * Ce qu'un analyste doit avoir en tête, à côté du chiffre et non en pied de page.
 *
 * Une note rangée en bas de l'écran se lit après coup, c'est-à-dire jamais :
 * le lecteur a déjà tiré sa conclusion du graphique quand il arrive dessus.
 * Elle se tient donc dans la colonne de droite, à la hauteur de sa propre
 * section, et reste collée tant qu'on lit cette section-là.
 *
 * Trois registres, et la distinction compte. Une « lecture » dit ce que les
 * chiffres racontent aujourd'hui et se rédige ; une « alerte » dit ce qui
 * empêche de les citer tels quels ; une « méthode » dit ce que la mesure ne
 * peut pas dire, et celle-là ne change pas d'une semaine à l'autre. Les mêmes
 * mots sur un fond identique se confondraient, et le desk cesserait de
 * distinguer une opinion d'une limite de méthode.
 *
 * Et elle se replie. Douze sections font douze notes, ce qui est beaucoup pour
 * qui vient lire une seule courbe.
 */
export type RegistreNote = "lecture" | "alerte" | "methode";

export function Commentaire({ registre = "lecture", titre, children, replieParDefaut }: { registre?: RegistreNote; titre: string; children: ReactNode; replieParDefaut?: boolean }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(!replieParDefaut);
  return (
    <div className={`${styles.note} ${styles[registre]}`}>
      <h4 className={styles.tete}>
        <span>{t(titre)}</span>
        {registre === "methode" && <span className={styles.chip}>{t("méthode")}</span>}
        <button type="button" className={styles.plier} onClick={() => setOuvert((v) => !v)} aria-expanded={ouvert} aria-label={ouvert ? t("Replier la note") : t("Déplier la note")}>
          {ouvert ? "−" : "+"}
        </button>
      </h4>
      {ouvert && <div className={styles.dedans}>{children}</div>}
    </div>
  );
}
