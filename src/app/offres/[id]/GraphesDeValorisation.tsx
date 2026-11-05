"use client";

import { useState, type ReactNode } from "react";
import { Carte } from "@/components/Carte";
import { GrapheDeSerie } from "@/components/GrapheDeSerie";
import { Majeur } from "@/components/Mosaique";
import { PastilleVariation } from "@/components/PastilleVariation";
import { Select } from "@/components/ui/Select";
import { useDates, useT } from "@/i18n/client";
import { fmtPct, fmtScaled, pickScale } from "@/lib/format";
import { lirePeriode, periodeParDefaut, PERIODES, type PeriodeCours } from "@/lib/market/periodes";
import { paliersDExercice, type PointDeValorisation } from "@/lib/market/valorisation";
import styles from "./page.module.css";
import fa from "./FicheAction.module.css";

/**
 * LA VALORISATION D'UNE ACTION : UN GRAPHE PAR INDICATEUR, UNE DURÉE POUR TOUS (fiche, onglet Émetteur, 9 novembre 2026, planche « B »).
 *
 * La capitalisation boursière et les trois indicateurs qui en découlent — rapport cours / bénéfice, cours / valeur comptable, rendement du dividende — ont chacun leur
 * section (titre à plat, carte en relief, axe gradué). UNE SEULE LISTE DÉROULANTE, dans la première carte, règle la durée des quatre : ce sont les mêmes huit périodes
 * que le cours, une période que l'historique ne couvre pas est grisée avec sa raison. Les rapports se lisent en marches : ils bougent avec le cours et d'un cran à
 * chaque nouvel exercice (marqué par un trait). La mention courte du dernier onglet (`fin`) se range sous la dernière section.
 */
export function GraphesDeValorisation({ serie, resultatAuDessusDuChiffreDAffaires = false, fin }: { serie: PointDeValorisation[]; /** Un résultat net supérieur au chiffre d'affaires publié : les rapports qui en sortent sont à lire avec prudence. */ resultatAuDessusDuChiffreDAffaires?: boolean; fin?: ReactNode }) {
  const t = useT();
  const { fmtDate } = useDates();
  const reperes = serie.map((p) => ({ d: p.d, c: p.cap, v: 0 }));
  const [periode, setPeriode] = useState<PeriodeCours>(() => periodeParDefaut(reperes));
  if (serie.length < 2) return null;
  const lectures = PERIODES.map((p) => lirePeriode(reperes, p.cle));
  const lue = lectures.find((l) => l.cle === periode && l.disponible) ?? lectures.find((l) => l.cle === "max")!;
  const fenetre = lue.depuis ? serie.filter((p) => p.d >= (lue.depuis as string)) : serie;
  const dates = fenetre.map((p) => p.d);
  const dernier = fenetre[fenetre.length - 1];
  const echelle = pickScale(fenetre.map((p) => p.cap));
  const sur = (v: number | null) => (v == null ? null : Math.round((v / echelle.div) * 100) / 100);
  const marques = paliersDExercice(fenetre).map((p) => ({ d: p.d, libelle: t("exercice {y}", { y: String(p.exercice) }) }));
  const signe = (v: number) => `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
  const nombre1 = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const bornes = (vals: (number | null)[]) => {
    const lues = vals.filter((v): v is number => v != null);
    return lues.length ? { de: lues[0], a: lues[lues.length - 1] } : undefined;
  };
  const variationCap = fenetre[0].cap > 0 ? ((dernier.cap - fenetre[0].cap) / fenetre[0].cap) * 100 : undefined;

  const selecteur = (
    <Select
      compact
      cherchable={false}
      label={t("Durée")}
      value={lue.cle}
      onChange={(v) => setPeriode(v as PeriodeCours)}
      options={lectures.map((l) => ({
        value: l.cle,
        label: t(l.libelle),
        disabled: !l.disponible,
        hint: l.disponible ? (l.cle === "max" && l.depuis ? t("depuis le {d}", { d: fmtDate(l.depuis) }) : l.variationPct !== undefined ? signe(l.variationPct) : "—") : t("historique insuffisant"),
      }))}
    />
  );
  const indicateurs: { cle: "per" | "pb" | "rendement"; titre: string; unite: string; formule: string }[] = [
    { cle: "per", titre: t("Rapport cours / bénéfice"), unite: "×", formule: t("Capitalisation ÷ résultat net du dernier exercice en vigueur.") },
    { cle: "pb", titre: t("Cours / valeur comptable"), unite: "×", formule: t("Capitalisation ÷ capitaux propres du dernier exercice en vigueur.") },
    { cle: "rendement", titre: t("Rendement du dividende"), unite: "%", formule: t("Dividende brut par action du dernier exercice en vigueur ÷ cours.") },
  ];
  return (
    <>
      <section className={styles.sec} data-pane="emetteur">
        <h3>{t("Capitalisation boursière")}</h3>
        <Carte>
          <div className={fa.entete}>
            <Majeur etiquette={t("Valeur au {d}", { d: fmtDate(dernier.d) })} valeur={fmtScaled(dernier.cap, echelle.div, 1)} unite={echelle.short} sous={variationCap !== undefined ? <PastilleVariation v={variationCap} periode={t(lue.libelle)} /> : undefined} />
            {selecteur}
          </div>
          <GrapheDeSerie
            dates={dates}
            unite={echelle.short}
            aire
            series={[
              { nom: t("Capitalisation"), valeurs: fenetre.map((p) => sur(p.cap)), teinte: "or" },
              ...(fenetre.every((p) => p.capFlottante != null) ? [{ nom: t("Capitalisation flottante"), valeurs: fenetre.map((p) => sur(p.capFlottante)), teinte: "bleu" as const }] : []),
            ]}
            resume={`${t("Capitalisation du {a} au {b}", { a: fmtDate(dates[0]), b: fmtDate(dates[dates.length - 1]) })} : ${fmtScaled(fenetre[0].cap, echelle.div, 1)} → ${fmtScaled(dernier.cap, echelle.div, 1)} ${echelle.short}`}
          />
          <p className={fa.note}>{t("Cours × nombre de titres de la séance. La durée choisie vaut pour les quatre graphiques de la valorisation.")}</p>
        </Carte>
      </section>
      {indicateurs.map((ind, i) => {
        const valeurs = fenetre.map((p) => p[ind.cle]);
        const b = bornes(valeurs);
        const courant = dernier[ind.cle];
        const decimales = ind.cle === "rendement" ? (v: number) => fmtPct(v, 2).replace(" %", "") : nombre1;
        return (
          <section key={ind.cle} className={styles.sec} data-pane="emetteur">
            <h3>{ind.titre}</h3>
            <Carte>
              <Majeur
                etiquette={t("Valeur au {d}", { d: fmtDate(dernier.d) })}
                valeur={courant == null ? "—" : decimales(courant)}
                unite={ind.unite}
                sous={courant == null ? t("Aucun exercice en vigueur à cette date.") : b && b.de !== b.a ? t("de {a} à {b} sur la période", { a: decimales(b.de), b: decimales(b.a) }) : t("inchangé sur la période")}
              />
              <GrapheDeSerie dates={dates} unite={ind.unite} pas series={[{ nom: ind.titre, valeurs: valeurs.map((v) => (v == null ? null : Math.round(v * 100) / 100)), teinte: "or" }]} marques={marques} resume={`${ind.titre} : ${b ? `${decimales(b.de)} → ${decimales(b.a)} ${ind.unite}` : "—"}`} />
              <p className={fa.note}>{ind.formule}</p>
              {resultatAuDessusDuChiffreDAffaires && ind.cle !== "rendement" && <p className={fa.note}>{t("Tiré d'un résultat net supérieur au chiffre d'affaires publié : à lire avec prudence.")}</p>}
            </Carte>
            {i === indicateurs.length - 1 && fin}
          </section>
        );
      })}
    </>
  );
}
