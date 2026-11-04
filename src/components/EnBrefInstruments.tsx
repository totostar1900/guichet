"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import { BoutonBrief, CorpsDeBrief } from "@/components/EnBref";
import styles from "./EnBrefInstruments.module.css";

/**
 * LE « i » DES TROIS PAGES D'INSTRUMENTS : UNE FEUILLE, TROIS ONGLETS (4 novembre 2026, choix 1B + 2A de la planche).
 *
 * Titres, Fonds et Adjudications avaient chacun leur « en bref », ouvert depuis le « i » de leur page. Le bouton de la barre du haut n'est
 * plus à côté d'un titre : il ouvre une seule feuille, sur l'onglet de la page où l'on est, et on lit les deux autres sans la quitter.
 *
 * 1B — UN TABLEAU « EN UN COUP D'ŒIL » EN TÊTE : prix, délai, rendement des trois instruments, la colonne de l'onglet ouvert en or. Ce
 * sont des lignes déjà vraies dans l'application (un cours à la cote, la valeur liquidative d'un fonds, le prix d'une adjudication) :
 * elles ne promettent rien de plus que les pages.
 *
 * 2A — LES ONGLETS NE FONT QUE LIRE. Aucun lien « aller aux titres » : les cartes du haut de Trade sont le seul chemin pour changer de page.
 */
export type Instrument = "titres" | "fonds" | "adjudications";

const BRIEF: Record<Instrument, string> = { titres: "cote", fonds: "fonds", adjudications: "adjudications" };
const NOM: Record<Instrument, string> = { titres: "Titres", fonds: "Fonds", adjudications: "Adjudications" };
const LIGNES: { quoi: string; vals: Record<Instrument, string> }[] = [
  { quoi: "Prix", vals: { titres: "un cours", fonds: "la valeur liquidative", adjudications: "le prix d'adjudication" } },
  { quoi: "Délai", vals: { titres: "en séance, en continu", fonds: "à la prochaine valeur liquidative", adjudications: "à la clôture du dépôt" } },
  { quoi: "Rendement", vals: { titres: "dividende ou coupon", fonds: "variation de la valeur liquidative", adjudications: "taux actuariel de l'adjudication" } },
];

/**
 * LA VARIATION AFFICHÉE ET CE QU'IL EST BON DE SAVOIR (6 novembre 2026, choix 4·1) : la variation d'une action est une performance passée ; la liquidité vient en
 * premier parce que c'est le trait de ce marché. Le ton est celui d'un repère, pas d'une alerte. UN SEUL LIEN, vers la page « Risques et limites » (le texte
 * opposable) : la leçon « Les quatre risques » y est déjà citée, deux liens dans une feuille courte feraient du bruit.
 */
function VariationEtRisques() {
  const t = useT();
  return (
    <>
      <section className={styles.ajout}>
        <h3>{t("Comment lire la variation")}</h3>
        <p>{t("La variation d'une action est celle de son cours sur trois mois, hors dividendes. Elle décrit le passé : elle ne préjuge pas des performances futures.")}</p>
      </section>
      <section className={styles.ajout}>
        <h3>{t("Pour investir sereinement")}</h3>
        <ul>
          <li>
            <b>{t("Liquidité.")}</b> {t("Peu d'actions s'échangent à chaque séance : prévoyez un délai pour revendre, et gardez en tête que le prix de vente peut différer du dernier cours. L'âge du cours est affiché sur chaque carte.")}
          </li>
          <li>
            <b>{t("Prix.")}</b> {t("Un cours évolue avec le marché, dans les deux sens ; le capital investi n'est pas garanti.")}
          </li>
          <li>
            <b>{t("Dividende.")}</b> {t("Il dépend des résultats de la société et se vote chaque année : un dividende passé n'est pas une promesse.")}
          </li>
        </ul>
        <p>{t("Un repère simple : n'investissez que ce que vous pouvez conserver, et répartissez entre plusieurs sociétés.")}</p>
        <Link className={styles.lien} href="/info/risques#risques">
          {t("Tout savoir sur les risques et les limites")} →
        </Link>
      </section>
    </>
  );
}

export function EnBrefInstruments({ page, className }: { page: Instrument; className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [onglet, setOnglet] = useState<Instrument>(page);
  const ordre: Instrument[] = ["titres", "fonds", "adjudications"];
  const titre = t("Les instruments en bref");
  /* LES ONGLETS SE PARCOURENT AU DOIGT (7 novembre 2026) : un glissement horizontal d'au moins 60 px, plus large que haut, passe à l'onglet voisin (vers la gauche : le suivant). Un geste vertical reste un défilement. */
  const depart = useRef<{ x: number; y: number } | null>(null);
  const glisser = (dx: number, dy: number) => {
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const i = ordre.indexOf(onglet) + (dx < 0 ? 1 : -1);
    if (i >= 0 && i < ordre.length) setOnglet(ordre[i]);
  };
  return (
    <>
      <BoutonBrief
        titre={titre}
        coach={`enbref-${BRIEF[page]}`}
        onClick={() => {
          setOnglet(page);
          setOpen(true);
        }}
        className={className}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={titre} plein tabs={ordre.map((k) => ({ key: k, label: t(NOM[k]), on: k === onglet, pick: () => setOnglet(k) }))}>
        <div
          className={styles.glisse}
          onTouchStart={(e) => (depart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
          onTouchEnd={(e) => {
            const d = depart.current;
            depart.current = null;
            if (d) glisser(e.changedTouches[0].clientX - d.x, e.changedTouches[0].clientY - d.y);
          }}
        >
        <div className={styles.glance} role="table" aria-label={t("En un coup d'œil")}>
          <span role="row" className={styles.ligne}>
            <span role="columnheader" />
            {ordre.map((k) => (
              <b key={k} role="columnheader" className={k === onglet ? styles.ici : undefined}>
                {t(NOM[k])}
              </b>
            ))}
          </span>
          {LIGNES.map((l) => (
            <span key={l.quoi} role="row" className={styles.ligne}>
              <span role="rowheader" className={styles.quoi}>
                {t(l.quoi)}
              </span>
              {ordre.map((k) => (
                <span key={k} role="cell" className={k === onglet ? styles.ici : undefined}>
                  {t(l.vals[k])}
                </span>
              ))}
            </span>
          ))}
        </div>
        <CorpsDeBrief brief={BRIEF[onglet]} />
        {onglet === "titres" && <VariationEtRisques />}
        {/* LA VISITE SE LANCE DEPUIS LE « i » (7 novembre 2026, choix 3c A) : la feuille se ferme, puis la visite adaptée à la vue courante démarre. Le signal est celui que le menu « ⋮ » envoie déjà. */}
        <button
          type="button"
          className={`btn sm ghost ${styles.lire}`}
          onClick={() => {
            setOpen(false);
            window.setTimeout(() => window.dispatchEvent(new Event("guichet:coach:replay")), 350);
          }}
        >
          {t("Comment lire cette page ?")}
        </button>
        </div>
      </Sheet>
    </>
  );
}
