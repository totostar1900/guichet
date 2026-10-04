"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { useFermeDehors } from "@/lib/ui/ferme-dehors";
import styles from "./Dropdown.module.css";

/**
 * LA LISTE DÉROULANTE D'UN FILTRE, ET IL N'Y EN A QU'UNE.
 *
 * Elle vivait dans « OfferBrowser », la page des titres. La page des fonds a
 * voulu la même pour la périodicité des VL : deux listes qui se commandent
 * pareil doivent être le même objet, sinon l'une dérive. Elle a donc déménagé
 * ici, avec ses règles, et les titres l'importent comme les fonds.
 *
 * ELLE TOMBE DU BORD DE SON DÉCLENCHEUR : posée sous le bouton qu'on vient de
 * toucher, jamais au bas de l'écran. C'est la règle de la maison pour tout ce
 * qui s'ouvre, et une liste de quatre valeurs ne mérite pas une feuille.
 *
 * « single » dit qu'on ne choisit qu'une valeur : le bouton montre alors ce
 * qui est choisi, au lieu d'un compte. Sans lui, les choix s'additionnent.
 *
 * Un libellé préfixé de « # » est un titre de groupe, pas une valeur.
 */
export function Dropdown({ label, items, selected, onChange, single }: { label: string; items: [string, string][]; selected: Set<string>; onChange: (s: Set<string>) => void; single?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [bord, setBord] = useState<"gauche" | "droite">("gauche");
  const ref = useRef<HTMLDivElement>(null);
  useFermeDehors(ref, open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    /* De quel côté le menu s'accroche : à gauche de son bouton, sauf s'il
       sortirait de l'écran. Mesuré à l'ouverture, là où les deux largeurs
       sont connues. */
    const r = ref.current?.getBoundingClientRect();
    if (r) setBord(r.left + 200 > window.innerWidth - 8 ? "droite" : "gauche");
  }, [open]);
  const toggle = (v: string) => {
    const n = new Set(single ? [] : selected);
    if (selected.has(v)) n.delete(v);
    else n.add(v);
    onChange(n);
    if (single) setOpen(false);
  };
  const active = selected.size > 0;
  return (
    <div className={styles.dd} ref={ref}>
      <button type="button" className={`${styles.ddBtn} ${active ? styles.ddOn : ""}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        {t(label)}
        {active && <b>{single ? t(items.find(([v]) => selected.has(v))?.[1] ?? "") : selected.size}</b>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className={styles.ddMenu} data-bord={bord} role="group" aria-label={t(label)}>
          {items.map(([v, l]) =>
            v.startsWith("#") ? (
              <div key={v} className={styles.ddGroup}>
                {t(l)}
              </div>
            ) : (
              <label key={v} className={styles.ddItem}>
                <input type={single ? "radio" : "checkbox"} checked={selected.has(v)} onChange={() => toggle(v)} />
                {t(l)}
              </label>
            ),
          )}
          {active && (
            <button type="button" className={styles.ddClear} onClick={() => onChange(new Set())}>
              {t("Effacer")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
