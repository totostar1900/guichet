"use client";

import { useMemo, useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { FORMES_DE_GRAPHE, PERIODE_DU_GESTIONNAIRE_PAR_DEFAUT, PERIODES_DU_GESTIONNAIRE, resumeDeLaSerie, type FormeDeGraphe, type PeriodeDuGestionnaire, type PointDuJour } from "@/lib/domain/gestionnaire";
import { Select } from "@/components/ui/Select";
import { abrege, GrapheGestion, type SerieDuGraphe } from "./GrapheGestion";
import styles from "./TableauDeBord.module.css";

export interface FondsPourLEcran {
  id: string;
  nom: string;
  vl?: { valeur: number; le: string };
  serie: PointDuJour[];
}

type Mesure = "encours" | "flux" | "vl" | "porteurs";
const NOM_DE_LA_FORME: Record<FormeDeGraphe, string> = { courbe: "Courbe", aires: "Aires", barres: "Barres" };
const NOM_DE_LA_MESURE: Record<Mesure, string> = { encours: "Encours", flux: "Souscriptions et rachats", vl: "Valeur liquidative", porteurs: "Porteurs" };

/**
 * LE TABLEAU DE BORD DU GESTIONNAIRE (28 novembre 2026, planche « Espace gestionnaire », 2C : quatre chiffres du mois, puis un fonds par ligne ; le client : « chaque jour, par fonds ou au global, et des
 * évolutions dans le temps sous plusieurs formes de graphes »).
 *
 * Un choix de PORTÉE (tous les fonds, ou un seul), un choix de PÉRIODE, quatre chiffres, UN GRAPHE à trois formes et quatre mesures, puis une ligne par fonds : toucher une ligne choisit ce fonds. Les séries
 * viennent du serveur, jour par jour ; tout le reste se calcule ici, sans nouvel appel. Aucun chiffre ne désigne un client : le nombre de porteurs n'est dit qu'à partir de cinq.
 */
export function TableauDeBord({ fonds, global }: { fonds: FondsPourLEcran[]; global: PointDuJour[] }) {
  const t = useT();
  const { fmtDate } = useDates();
  const [portee, setPortee] = useState<string>("tous");
  const [periode, setPeriode] = useState<PeriodeDuGestionnaire>(PERIODE_DU_GESTIONNAIRE_PAR_DEFAUT);
  const [mesure, setMesure] = useState<Mesure>("encours");
  const [forme, setForme] = useState<FormeDeGraphe>("courbe");
  const choisi = fonds.find((f) => f.id === portee);
  const serieChoisie = choisi ? choisi.serie : global;
  const nbJours = PERIODES_DU_GESTIONNAIRE.find((p) => p.cle === periode)!.jours;
  const tranche = useMemo(() => serieChoisie.slice(-nbJours), [serieChoisie, nbJours]);
  const resume = resumeDeLaSerie(tranche);
  const jours = tranche.map((p) => p.jour);
  const mesures: Mesure[] = choisi ? ["encours", "flux", "vl", "porteurs"] : ["encours", "flux", "porteurs"];
  const mesureAffichee: Mesure = mesures.includes(mesure) ? mesure : "encours";
  const series: SerieDuGraphe[] =
    mesureAffichee === "flux"
      ? [
          { nom: "Souscriptions", valeurs: tranche.map((p) => p.souscriptions), teinte: 0 },
          { nom: "Rachats", valeurs: tranche.map((p) => p.rachats), teinte: 1 },
        ]
      : mesureAffichee === "vl"
        ? [{ nom: "Valeur liquidative", valeurs: tranche.map((p) => p.vl ?? null), teinte: 0 }]
        : mesureAffichee === "porteurs"
          ? [{ nom: "Porteurs", valeurs: tranche.map((p) => p.porteurs), teinte: 0 }]
          : [{ nom: "Encours", valeurs: tranche.map((p) => p.encours), teinte: 0 }];
  const unite = mesureAffichee === "porteurs" ? "" : "FCFA";
  const variation = resume.variationEncours;
  return (
    <div className={styles.tableau}>
      <div className={styles.commandes}>
        <Select
          label={t("Portée")}
          value={portee}
          onChange={setPortee}
          cherchable={false}
          options={[{ value: "tous", label: t("Tous mes fonds") }, ...fonds.map((f) => ({ value: f.id, label: f.nom }))]}
        />
        <div className={styles.groupe} role="group" aria-label={t("Période")}>
          {PERIODES_DU_GESTIONNAIRE.map((p) => (
            <button key={p.cle} type="button" aria-pressed={periode === p.cle} onClick={() => setPeriode(p.cle)}>
              {t(p.libelle)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tuiles}>
        <div className={styles.tuile}>
          <small>{t("Encours chez nous")}</small>
          <b>{abrege(resume.encours)} FCFA</b>
          <em className={variation > 0 ? styles.hausse : variation < 0 ? styles.baisse : undefined}>
            {variation > 0 ? "▲ +" : variation < 0 ? "▼ −" : ""}
            {abrege(Math.abs(variation))} {t("sur la période")}
          </em>
        </div>
        <div className={styles.tuile}>
          <small>{t("Souscriptions")}</small>
          <b>{abrege(resume.souscriptions)} FCFA</b>
        </div>
        <div className={styles.tuile}>
          <small>{t("Rachats")}</small>
          <b>{abrege(resume.rachats)} FCFA</b>
        </div>
        <div className={styles.tuile}>
          <small>{t("Porteurs")}</small>
          <b>{resume.porteurs == null ? t("moins de cinq") : resume.porteurs}</b>
        </div>
      </div>

      <section className={styles.graphe} aria-label={t("Évolution")}>
        <div className={styles.commandes}>
          <div className={styles.groupe} role="group" aria-label={t("Mesure")}>
            {mesures.map((m) => (
              <button key={m} type="button" aria-pressed={mesureAffichee === m} onClick={() => setMesure(m)}>
                {t(NOM_DE_LA_MESURE[m])}
              </button>
            ))}
          </div>
          <div className={styles.groupe} role="group" aria-label={t("Forme du graphe")}>
            {FORMES_DE_GRAPHE.map((f) => (
              <button key={f} type="button" aria-pressed={forme === f} onClick={() => setForme(f)}>
                {t(NOM_DE_LA_FORME[f])}
              </button>
            ))}
          </div>
        </div>
        <GrapheGestion jours={jours} series={series} forme={forme} unite={unite} />
      </section>

      <section className={styles.lignes} aria-label={t("Mes fonds")}>
        <h2>{t("Mes fonds")}</h2>
        <ul>
          {fonds.map((f) => {
            const r = resumeDeLaSerie(f.serie.slice(-nbJours));
            const net = r.souscriptions - r.rachats;
            return (
              <li key={f.id}>
                <button type="button" className={styles.ligne} aria-pressed={portee === f.id} onClick={() => setPortee(f.id)}>
                  <b>{f.nom}</b>
                  <span>{f.vl ? `${t("VL du")} ${fmtDate(f.vl.le, true)} · ${f.vl.valeur.toLocaleString("fr-FR")} FCFA` : t("Pas de valeur liquidative")}</span>
                  <span>
                    {t("Encours")} {abrege(r.encours)} · {t("flux")} {net > 0 ? "+" : net < 0 ? "−" : ""}
                    {abrege(Math.abs(net))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
