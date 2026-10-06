"use client";

import Link from "next/link";
import { type MarketSegment, SEGMENT_HINT, SEGMENT_LABEL } from "@/lib/domain/status";
import { useT } from "@/i18n/client";

/**
 * The head of the Titres page (what it holds, the bridge to the funds) and,
 * in the sticky band, the two market switches. Both are on by default : switching one off
 * keeps only the other; switching the last one off turns both back on, so the
 * list is never empty and « tout » no longer needs a button of its own.
 */
type Seg = "primaire" | "secondaire";

/* LE RENVOI VERS LES FONDS A QUITTÉ CET EN-TÊTE : la bande des lieux porte
   « Fonds » en permanence, au même endroit sur les trois pages. Un deuxième
   chemin vers la même page, à deux centimètres du premier, coûtait une ligne
   de titre sans rien ajouter. « fundsCount » reste reçu : la page le compte
   déjà et le tour de la page le nomme. */
export function TitresHead({ fundsCount }: { fundsCount: number }) {
  const t = useT();
  return (
    <div className="mtogglesHead">
      {/* LE SURTITRE EST PARTI. « Titres » au-dessus de « Obligations, bons
          du Trésor et actions de la zone CEMAC » ne disait rien de plus que
          la phrase qu'il surmontait, et l'onglet de la page porte déjà ce
          mot-là. */}
      <div>
        <h1 className="display">{t("Obligations, bons du Trésor et actions de la zone CEMAC")}</h1>
      </div>
    </div>
  );
}

export function MarketToggles({ selected, counts, onChange }: { selected?: MarketSegment; counts: { primaire: number; secondaire: number }; onChange: (seg: MarketSegment | undefined) => void }) {
  const t = useT();
  const segs = ["primaire", "secondaire"] as const;
  const other = (s: Seg): Seg => (s === "primaire" ? "secondaire" : "primaire");
  const toggle = (s: Seg) => {
    if (!selected) onChange(other(s)); // both on → keep only the other one
    else onChange(undefined); // the last one on, or the off one → both back on
  };
  return (
    <div className="mtoggles">
      <div className="mtogglesRow">
        <div className="mtogglesGroup" role="group" aria-label={t("Marché")} data-coach="titres-marches">
          {segs.map((s) => {
            const on = !selected || selected === s;
            return (
              <button key={s} type="button" aria-pressed={on} className={on ? "on" : ""} title={t(SEGMENT_HINT[s])} onClick={() => toggle(s)}>
                {t(SEGMENT_LABEL[s])} <b>{counts[s]}</b>
              </button>
            );
          })}
        </div>
        <span className="mtogglesHint">{selected ? t(SEGMENT_HINT[selected]) : t("Les deux marchés sont affichés : éteignez-en un pour ne voir que l'autre.")}</span>
      </div>
    </div>
  );
}
