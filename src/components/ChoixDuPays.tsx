"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import { paysTrouves } from "@/lib/domain/pays";
import styles from "./ChoixDuPays.module.css";

/**
 * UN PAYS SE CHOISIT DANS UNE LISTE À RECHERCHE, LA ZONE EN TÊTE (planche « Parcours d'inscription », 6A).
 * Le champ montre le pays choisi ; il ouvre une feuille avec la recherche, les six pays de la CEMAC, puis les autres. La valeur part au serveur dans un champ caché du même nom que l'ancien champ texte : rien ne change côté données.
 */
export function ChoixDuPays({ name, defaultValue, aide, disabled }: { name: string; defaultValue?: string; aide?: string; disabled?: boolean }) {
  const t = useT();
  const [valeur, setValeur] = useState(defaultValue ?? "");
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const { cemac, autres } = paysTrouves(recherche);
  const choisir = (p: string) => {
    setValeur(p);
    setOuvert(false);
    setRecherche("");
  };
  const ligne = (p: string) => (
    <li key={p}>
      <button type="button" className={styles.pays} aria-pressed={valeur === p} onClick={() => choisir(p)}>
        {p}
      </button>
    </li>
  );
  return (
    <>
      <input type="hidden" name={name} value={valeur} />
      <button type="button" className={styles.champ} disabled={disabled} onClick={() => setOuvert(true)} aria-haspopup="dialog">
        <span className={valeur ? undefined : styles.vide}>{valeur || t("Choisir un pays")}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      <Sheet open={ouvert} onClose={() => setOuvert(false)} title={t("Nationalité")} sub={aide} plein>
        <div className={styles.liste}>
          <input type="search" className={styles.recherche} placeholder={t("Rechercher un pays")} value={recherche} onChange={(e) => setRecherche(e.target.value)} autoComplete="off" aria-label={t("Rechercher un pays")} />
          {cemac.length > 0 && (
            <>
              <h3>{t("La zone CEMAC")}</h3>
              <ul>{cemac.map(ligne)}</ul>
            </>
          )}
          {autres.length > 0 && (
            <>
              <h3>{t("Autres pays")}</h3>
              <ul>{autres.map(ligne)}</ul>
            </>
          )}
          {cemac.length + autres.length === 0 && <p className={styles.rien}>{t("Aucun pays ne correspond.")}</p>}
        </div>
      </Sheet>
    </>
  );
}
