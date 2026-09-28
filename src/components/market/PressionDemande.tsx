"use client";

import { useMemo, useState } from "react";
import type { Country } from "@/lib/domain/types";
import { COUNTRY_COLOR } from "@/lib/market/couleurs";
import { useT } from "@/i18n/client";
import { Barres } from "./Traces";
import styles from "./PressionDemande.module.css";

/**
 * La couverture séance par séance, et par Trésor.
 *
 * Toutes les séances de la zone sur un seul graphique répondent à une question
 * que personne ne pose : la couverture est une mesure de signature, et mêler
 * six Trésors donne une moyenne qui n'appartient à aucun d'eux. Un Trésor
 * régulièrement sous cent pour cent et un autre régulièrement au-dessus se
 * fondent en un nuage.
 *
 * Le choix d'un Trésor remet aussi l'échelle à sa place : une couverture qui
 * oscille entre 90 et 110 pour cent se lisait écrasée contre la ligne des cent
 * dès qu'une séance à trois cents pour cent tirait l'axe vers le haut.
 *
 * L'axe manquait enfin son nom. « Taux de couverture » n'est pas devinable
 * d'une barre et d'un pour cent, et c'est la mesure la plus dure du jeu.
 */
export interface SeanceCouverture {
  on: string;
  v: number;
  pays: Country;
}

export function PressionDemande({ seances }: { seances: SeanceCouverture[] }) {
  const t = useT();
  const [choix, setChoix] = useState<Country | "tous">("tous");

  const pays = useMemo(() => [...new Set(seances.map((s) => s.pays))].sort(), [seances]);
  const vues = useMemo(() => seances.filter((s) => choix === "tous" || s.pays === choix), [seances, choix]);

  return (
    <div>
      <div className={styles.filtres}>
        <div className={styles.grp}>
          <span className={styles.etiq} id="pression-tresor">
            {t("Trésor")}
          </span>
          <div className={styles.seg} role="group" aria-labelledby="pression-tresor">
            <button type="button" aria-pressed={choix === "tous"} onClick={() => setChoix("tous")}>
              {t("Tous")}
            </button>
            {pays.map((p) => (
              <button key={p} type="button" aria-pressed={choix === p} onClick={() => setChoix(p)}>
                <i style={{ background: COUNTRY_COLOR[p] }} aria-hidden="true" />
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.compte}>{t("{n} séances relues", { n: vues.length })}</div>
      </div>

      {/* Le nom de l'axe : « taux de couverture » ne se devine pas d'une barre. */}
      <p className={styles.axeNom}>{t("Taux de couverture · soumissions rapportées au montant annoncé")}</p>

      {vues.length ? (
        <Barres
          points={vues.map((s) => ({ on: s.on, v: s.v, couleur: COUNTRY_COLOR[s.pays] }))}
          seuil={1}
          seuilMot={t("100 % · la demande couvre l'offre")}
          decimales={1}
          ariaLabel={t("Couverture de chaque séance relue")}
        />
      ) : (
        <div className="empty">{t("Aucune séance relue pour ce Trésor.")}</div>
      )}
    </div>
  );
}
