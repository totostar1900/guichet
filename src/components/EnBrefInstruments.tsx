"use client";

import { useState } from "react";
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

export function EnBrefInstruments({ page, className }: { page: Instrument; className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [onglet, setOnglet] = useState<Instrument>(page);
  const ordre: Instrument[] = ["titres", "fonds", "adjudications"];
  const titre = t("Les instruments en bref");
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
      </Sheet>
    </>
  );
}
