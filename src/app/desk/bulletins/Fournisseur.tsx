"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./fournisseur.module.css";

/**
 * LE RAPPORT AU FOURNISSEUR DE DONNÉES, DEMANDÉ D'ICI.
 *
 * Deux dates et deux boutons. Le formulaire n'envoie rien : il construit une
 * adresse et l'ouvre, parce que le serveur rend un fichier et non une page.
 * C'est aussi ce qui rend l'adresse copiable et rejouable, ce qu'un POST
 * n'aurait pas permis.
 *
 * LES RACCOURCIS DE PLAGE NE SONT PAS UN CONFORT. Un rapport qu'on envoie à
 * un tiers se refait tous les mois ou tous les trimestres, et une plage
 * saisie à la main se trompe d'un jour une fois sur dix. Les bornes nommées
 * suppriment la question.
 */
export function Fournisseur({ premiere, derniere }: { premiere: string; derniere: string }) {
  const t = useT();
  const [du, setDu] = useState(premiere);
  const [au, setAu] = useState(derniere);

  const invalide = !du || !au || du > au;
  const adresse = (format: "xlsx" | "pdf") => `/desk/bulletins/fournisseur?du=${du}&au=${au}&format=${format}`;

  /** Le premier jour du mois ou du trimestre écoulé, et son dernier. */
  const poser = (mois: number) => {
    const fin = new Date(`${derniere}T00:00:00Z`);
    const debut = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() - mois + 1, 1));
    setDu(debut.toISOString().slice(0, 10) < premiere ? premiere : debut.toISOString().slice(0, 10));
    setAu(derniere);
  };

  return (
    <div className={styles.bloc}>
      <div className={styles.plage}>
        <label className="field">
          {t("Du")}
          <input type="date" value={du} min={premiere} max={derniere} onChange={(e) => setDu(e.target.value)} />
        </label>
        <label className="field">
          {t("Au")}
          <input type="date" value={au} min={premiere} max={derniere} onChange={(e) => setAu(e.target.value)} />
        </label>
        <div className={styles.bornes}>
          <button type="button" className="btn sm ghost" onClick={() => poser(1)}>
            {t("Le mois")}
          </button>
          <button type="button" className="btn sm ghost" onClick={() => poser(3)}>
            {t("Le trimestre")}
          </button>
          <button type="button" className="btn sm ghost" onClick={() => poser(12)}>
            {t("L'année")}
          </button>
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => {
              setDu(premiere);
              setAu(derniere);
            }}
          >
            {t("Tout")}
          </button>
        </div>
      </div>

      <div className={styles.sorties}>
        {invalide ? (
          <span className={styles.erreur}>{t("Choisissez une plage : la date de début doit précéder la date de fin.")}</span>
        ) : (
          <>
            <a className="btn" href={adresse("xlsx")} download>
              {t("Classeur Excel")}
            </a>
            <a className="btn ghost" href={adresse("pdf")} target="_blank" rel="noreferrer">
              {t("Lettre PDF")}
            </a>
          </>
        )}
      </div>
    </div>
  );
}
