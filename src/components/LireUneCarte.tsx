"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { Sheet } from "./mobile/Sheet";
import styles from "./LireUneCarte.module.css";

/**
 * « LIRE UNE CARTE » : UNE CARTE ANNOTÉE, QUATRE ZONES NUMÉROTÉES (28 novembre 2026, le client : « les novices ne savent pas comment lire les tuiles »).
 *
 * Une carte d'exemple (illustrative, jamais une ligne en vente) dont chaque zone porte un repère, puis la légende dans le même ordre. Elle sert deux fois : dans une fenêtre ouverte depuis
 * le bandeau « Nouveau sur Investir ? », et dans la page « Comprendre l'investissement ».
 */
export function AnatomieDeCarte() {
  const t = useT();
  const repere = (n: number) => (
    <i className={styles.repere} aria-hidden="true">
      {n}
    </i>
  );
  return (
    <div className={styles.anatomie}>
      <article className={styles.carte} aria-label={t("Exemple de carte")}>
        <div className={styles.tete}>
          <span className={styles.nom}>
            <b>{t("Obligation d'exemple 2030")}</b>
            <small>{t("exemple")}</small>
          </span>
          <span className={styles.etat}>
            {repere(1)}
            <span className="pill open">{t("Ouverte")}</span>
          </span>
        </div>
        <div className={styles.tete}>
          <span className={styles.chiffre}>
            {repere(2)}
            <b>6,4 %</b>
            <small>{t("rendement par an")}</small>
          </span>
        </div>
        <div className={styles.grille}>
          {repere(3)}
          <span>
            <small>{t("Échéance")}</small>
            <b>2030</b>
          </span>
          <span>
            <small>{t("Ticket minimum")}</small>
            <b>10 000 FCFA</b>
          </span>
        </div>
        <div className={styles.pied}>
          {repere(4)}
          <span>XX0000000000</span>
          <span className={styles.voir}>{t("Voir la fiche")} →</span>
        </div>
      </article>
      <ol className={styles.legende}>
        <li>
          <b>{t("L'état")}</b> {t("Ouverte, Clôturée ou Cotée. Avant la clôture, un compte à rebours.")}
        </li>
        <li>
          <b>{t("Le chiffre de tête")}</b> {t("Le rendement pour une obligation ; la variation du cours pour une action.")}
        </li>
        <li>
          <b>{t("La grille")}</b> {t("Échéance, ticket minimum, dividende, « cours inchangé depuis ».")}
        </li>
        <li>
          <b>{t("Le pied")}</b> {t("Le code ISIN, la clôture, et « Voir la fiche » pour tout le détail.")}
        </li>
      </ol>
      <p className={styles.geste}>{t("Touchez le chevron pour déplier la carte. Tirez-la vers la gauche pour contacter, déclarer une intention ou suivre la ligne.")}</p>
    </div>
  );
}

/** Le bouton et sa fenêtre : la carte annotée, au milieu de l'écran, comme les autres bulles de la maison. */
export function LireUneCarte({ className }: { className?: string }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOuvert(true)} aria-haspopup="dialog">
        {t("Lire une carte")}
      </button>
      <Sheet open={ouvert} onClose={() => setOuvert(false)} title={t("Lire une carte")} centre>
        <AnatomieDeCarte />
      </Sheet>
    </>
  );
}
