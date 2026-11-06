"use client";

import { useState, type ReactNode } from "react";
import { Carte } from "@/components/Carte";
import { Info } from "@/components/Info";
import { GrapheComptes } from "@/components/GrapheComptes";
import { GrapheDeSerie } from "@/components/GrapheDeSerie";
import { Majeur, Tuiles } from "@/components/Mosaique";
import { PastilleVariation } from "@/components/PastilleVariation";
import { Select } from "@/components/ui/Select";
import { useDates, useT } from "@/i18n/client";
import { fmt, fmtPct, fmtScaled, pickScale } from "@/lib/format";
import { lirePeriode, periodeParDefaut, PERIODES, type PeriodeCours } from "@/lib/market/periodes";
import { motDeMois } from "@/lib/ui/axes";
import { paliersDExercice, rotationParMois, rotationSurPeriode, type PointDeValorisation } from "@/lib/market/valorisation";
import styles from "./page.module.css";
import fa from "./FicheAction.module.css";

/** Une section de valorisation : l'habillage d'une fiche (titre à plat, carte) ou celui d'un panneau de la page d'une société. Défini hors du composant : défini dedans, il serait un autre composant à chaque rendu et ferait perdre leur état aux graphes. */
function Enveloppe({ pane, panneau, titre, info, children, fin }: { pane: string; panneau?: string; titre: string; info: string; children: ReactNode; fin?: ReactNode }) {
  return panneau ? (
    <div className={panneau} data-pane={pane}>
      <h2>
        {titre}
        <Info text={info} label={titre} />
      </h2>
      {children}
      {fin}
    </div>
  ) : (
    <section className={styles.sec} data-pane={pane}>
      <h3>
        {titre}
        <Info text={info} label={titre} />
      </h3>
      <Carte>{children}</Carte>
      {fin}
    </section>
  );
}

/**
 * LA VALORISATION D'UNE ACTION : UN GRAPHE PAR INDICATEUR, UNE DURÉE POUR TOUS (fiche, onglet Émetteur, 9 novembre 2026, planche « B »).
 *
 * La capitalisation boursière et les trois indicateurs qui en découlent — rapport cours / bénéfice, cours / valeur comptable, rendement du dividende — ont chacun leur
 * section (titre à plat, carte en relief, axe gradué). LA LISTE DE DURÉE EST DANS CHACUN DES QUATRE GRAPHES, et elles se mettent à jour ensemble : un seul état, quatre
 * listes. Ce sont les mêmes huit périodes que le cours, une période que l'historique ne couvre pas est grisée avec sa raison. Les rapports se lisent en marches : ils bougent avec le cours et d'un cran à
 * chaque nouvel exercice (marqué par un trait). La mention courte du dernier onglet (`fin`) se range sous la dernière section.
 */
export function GraphesDeValorisation({ serie, resultatAuDessusDuChiffreDAffaires = false, fin, pane = "emetteur", panneau }: { /** Le volet où se rangent les sections (« emetteur » sur la fiche, « ratios » sur la page d'une société). */ pane?: string; /** La classe d'un panneau de la page d'une société : les sections prennent son habillage (titre h2, sans carte) au lieu de celui de la fiche (titre à plat, carte). */ panneau?: string; serie: PointDeValorisation[]; /** Un résultat net supérieur au chiffre d'affaires publié : les rapports qui en sortent sont à lire avec prudence. */ resultatAuDessusDuChiffreDAffaires?: boolean; fin?: ReactNode }) {
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
  const rotation = rotationSurPeriode(fenetre);
  const mois = rotationParMois(fenetre);
  const echelleValeur = pickScale([rotation.valeur]);
  const valeurEchangee = `${fmtScaled(rotation.valeur, echelleValeur.div, echelleValeur.div === 1 ? 0 : 1)} ${echelleValeur.short}`;
  const rotationTexte = rotation.rotationPct == null ? "—" : fmtPct(rotation.rotationPct, 2);
  const variationCap = fenetre[0].cap > 0 ? ((dernier.cap - fenetre[0].cap) / fenetre[0].cap) * 100 : undefined;

  const selecteur = () => (
    <Select
      compact
      block
      className={fa.choix}
      libelleVisible={false}
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
  const indicateurs: { cle: "per" | "pb" | "rendement"; titre: string; unite: string; info: string }[] = [
    { cle: "per", titre: t("Rapport cours / bénéfice"), unite: "×", info: t("Combien d'années de bénéfice le marché paie : capitalisation ÷ résultat net du dernier exercice en vigueur. Il change avec le cours et d'un cran à chaque nouvel exercice (trait pointillé).") },
    { cle: "pb", titre: t("Cours / valeur comptable"), unite: "×", info: t("Combien de fois la valeur comptable le marché paie : capitalisation ÷ capitaux propres du dernier exercice en vigueur.") },
    { cle: "rendement", titre: t("Rendement du dividende"), unite: "%", info: t("Dividende brut par action du dernier exercice en vigueur ÷ cours. Un dividende n'est pas garanti : il peut baisser ou ne pas être versé.") },
  ];
  return (
    <>
      <Enveloppe pane={pane} panneau={panneau} titre={t("Capitalisation boursière")} info={t("La valeur de toutes les actions au cours de clôture : cours × nombre de titres de la séance. La part flottante est la partie des titres réellement échangeable en bourse.")}>
          <div className={fa.entete}>
            <Majeur etiquette={t("Valeur au {d}", { d: fmtDate(dernier.d) })} valeur={fmtScaled(dernier.cap, echelle.div, 1)} unite={echelle.short} sous={variationCap !== undefined ? <PastilleVariation v={variationCap} periode={t(lue.libelle)} /> : undefined} />
            {selecteur()}
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
          <Tuiles tuiles={[[t("Valeur échangée"), valeurEchangee], [t("Rotation du flottant"), rotationTexte]]} />
        </Enveloppe>
      {indicateurs.map((ind) => {
        const valeurs = fenetre.map((p) => p[ind.cle]);
        const b = bornes(valeurs);
        const courant = dernier[ind.cle];
        const decimales = ind.cle === "rendement" ? (v: number) => fmtPct(v, 2).replace(" %", "") : nombre1;
        return (
          <Enveloppe key={ind.cle} pane={pane} panneau={panneau} titre={ind.titre} info={ind.info}>
              <div className={fa.entete}>
                <Majeur
                  etiquette={t("Valeur au {d}", { d: fmtDate(dernier.d) })}
                  valeur={courant == null ? "—" : decimales(courant)}
                  unite={ind.unite}
                  sous={courant == null ? t("Aucun exercice en vigueur à cette date.") : b && b.de !== b.a ? t("de {a} à {b} sur la période", { a: decimales(b.de), b: decimales(b.a) }) : t("inchangé sur la période")}
                />
                {selecteur()}
              </div>
              <GrapheDeSerie dates={dates} unite={ind.unite} pas series={[{ nom: ind.titre, valeurs: valeurs.map((v) => (v == null ? null : Math.round(v * 100) / 100)), teinte: "or" }]} marques={marques} exercices={fenetre.map((p) => p.exercice)} resume={`${ind.titre} : ${b ? `${decimales(b.de)} → ${decimales(b.a)} ${ind.unite}` : "—"}`} />
              {resultatAuDessusDuChiffreDAffaires && ind.cle !== "rendement" && <p className={fa.note}>{t("Tiré d'un résultat net supérieur au chiffre d'affaires publié : à lire avec prudence.")}</p>}
            </Enveloppe>
        );
      })}
      <Enveloppe pane={pane} panneau={panneau} titre={t("Rotation du flottant")} info={t("La part du flottant qui s'est échangée : valeur échangée ÷ capitalisation flottante, mois par mois. Elle dit à quel point le titre se négocie ; un chiffre bas décrit le marché, pas la société.")} fin={fin}>
          <div className={fa.entete}>
            <Majeur etiquette={t("Sur la période")} valeur={rotation.rotationPct == null ? "—" : fmtPct(rotation.rotationPct, 2).replace(" %", "")} unite="%" sous={t("{v} échangés", { v: valeurEchangee })} />
            {selecteur()}
          </div>
          <GrapheComptes
            annees={mois.map((m, j) => motDeMois(`${m.mois}-01`, j === 0 || m.mois.endsWith("-01")))}
            etiquettesLues={mois.map((m) => motDeMois(`${m.mois}-01`, true))}
            unite="%"
            barres={[{ nom: t("Rotation du flottant"), valeurs: mois.map((m) => (m.rotationPct == null ? null : Math.round(m.rotationPct * 100) / 100)), teinte: "or" }]}
            resume={mois.map((m) => `${m.mois} : ${m.rotationPct == null ? "—" : fmtPct(m.rotationPct, 2)} (${fmt(m.valeur)} FCFA)`).join(" ; ")}
          />
        </Enveloppe>
    </>
  );
}
