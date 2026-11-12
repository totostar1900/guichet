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
      {/* ACTION ET OBLIGATION COTÉE NE SE LISENT PAS PAREIL (12 novembre 2026) : deux objets sur la même liste, deux chiffres qui ne veulent pas dire la même chose. Le dernier point dit pourquoi une ligne peut n'avoir aucun rendement : on n'écrit pas un chiffre faux. */}
      <section className={styles.ajout}>
        <h3>{t("Actions et obligations cotées : deux lectures")}</h3>
        <ul>
          <li>
            <b>{t("Une action.")}</b> {t("Vous détenez une part d'une société. Son cours est en FCFA ; le chiffre de tête est la variation du cours, le cours est dessous. Le rendement est le dividende de la dernière année rapporté au cours : il dépend des résultats et se vote chaque année. Il n'y a pas d'échéance.")}
          </li>
          <li>
            <b>{t("Une obligation cotée.")}</b> {t("Vous prêtez à un émetteur, qui verse un coupon et rembourse le nominal à l'échéance. Son cours est en pourcentage du nominal : 100 % veut dire « au pair ». Le rendement est le taux actuariel, ce que vous gagnez au cours du jour si vous la gardez jusqu'à l'échéance, coupons compris : il diffère du coupon dès que le cours n'est pas à 100 %. La variation du cours compte moins, puisque le prix se rapproche de 100 % à mesure que l'échéance approche.")}
          </li>
          <li>
            <b>{t("Pas de rendement affiché ?")}</b> {t("Une action sans dividende connu, une obligation déjà remboursée, ou dont on ne connaît que l'année d'échéance et qui arrive à terme dans l'année : le chiffre serait faux, alors la ligne n'en montre pas.")}
          </li>
        </ul>
      </section>
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
        </div>
      </Sheet>
    </>
  );
}
