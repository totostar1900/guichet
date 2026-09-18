"use client";

import Link from "next/link";
import { type MarketSegment, SEGMENT_HINT, SEGMENT_LABEL } from "@/lib/domain/status";
import { useT } from "@/i18n/client";

/**
 * The head of the Titres page (what it holds, the bridge to the funds) and,
 * in the sticky band, the two market switches. Both are on by default — switching one off
 * keeps only the other; switching the last one off turns both back on, so the
 * list is never empty and « tout » no longer needs a button of its own.
 */
type Seg = "primaire" | "secondaire";

export function TitresHead({ fundsCount }: { fundsCount: number }) {
  const t = useT();
  return (
    <div className="mtogglesHead">
      <div>
        <span className="eyebrow">{t("Titres")}</span>
        <h1 className="display">{t("Obligations, bons du Trésor et actions de la zone CEMAC")}</h1>
      </div>
      <Link href="/fonds" className="btn sm ghost mtogglesFunds">
        {t("Voir les {n} fonds (OPCVM)", { n: fundsCount })} →
      </Link>
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
        <div className="mtogglesGroup" role="group" aria-label={t("Marché")}>
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
