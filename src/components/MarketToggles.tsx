"use client";
import { type MarketSegment, SEGMENT_HINT, SEGMENT_LABEL } from "@/lib/domain/status";
import { useT } from "@/i18n/client";
import { EnTete } from "./EnTete";
import { EnBref } from "./EnBref";

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
/**
 * DEUX SERVICES VIVENT SUR CETTE PAGE, et le brief les nomme tous les deux :
 * la cote — acheter au cours du jour ce qui est déjà au bulletin — et les
 * souscriptions, dont le prix est fixé par l'émetteur et ne bouge pas pendant
 * la fenêtre. C'est la distinction que la liste ne peut pas faire d'elle-même :
 * les deux paraissent en lignes identiques, et seul le mot « souscription » de
 * la section les sépare.
 *
 * ET LE BRIEF N'A PAS D'ENFANTS, ici : ce que cette page aurait eu à ajouter —
 * la BVMAC est la bourse régionale, un ordre ne s'exécute que si une
 * contrepartie se présente — est déjà écrit à « /marche », dans la leçon du
 * parcours et dans les risques. Une quatrième copie est le défaut que ce
 * composant existe pour fermer.
 */
export function TitresHead({}: { fundsCount: number }) {
  const t = useT();
  return (
    <EnTete surTitre={t("Investissez")} titre={t("Titres")} phrase={t("Obligations, bons du Trésor et actions de la zone CEMAC")} aCote={<EnBref cles={["cote", "souscription"]} titre="La cote en bref" />} />
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
