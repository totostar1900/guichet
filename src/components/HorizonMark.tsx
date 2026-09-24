"use client";

import Link from "next/link";
import { useState } from "react";
import { Sheet } from "./mobile/Sheet";
import { useT } from "@/i18n/client";
import styles from "./HorizonMark.module.css";

/**
 * Ce que votre profil dit de cette ligne, en un bouton rond.
 *
 * C'était une pastille de texte dans l'en-tête, à côté du statut et de trois
 * boutons. Sa forme d'alerte, « au-delà de votre horizon : 7 ans, vous avez
 * dit 3 ans maximum », y tenait sur deux lignes et poussait le reste ; sur un
 * téléphone elle prenait la moitié de la largeur pour une phrase qu'on ne lit
 * qu'une fois.
 *
 * Elle devient un signe, et la phrase passe dans une feuille qu'on ouvre :
 * elle y a la place d'expliquer, et de renvoyer au profil.
 *
 * Elle paraît aussi quand il n'y a pas de profil, et c'est le vrai gain : un
 * client qui n'a jamais répondu aux sept questions ne voyait rien du tout,
 * donc rien ne lui disait qu'il manquait quelque chose. Le signe est alors
 * neutre et propose le test.
 */
export function HorizonMark({ level, text, hasProfile }: { level?: "ok" | "warn"; text?: string; hasProfile: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const state = !hasProfile ? "none" : level === "warn" ? "warn" : "ok";
  const label = state === "none" ? t("Votre profil financier : pas encore renseigné") : t("Cette ligne est {flag}.", { flag: text ?? "" });
  return (
    <>
      <button type="button" className={`${styles.mark} ${styles[state]}`} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={label} title={label}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {state === "ok" ? <path d="M5 13l4 4L19 7" /> : state === "warn" ? <path d="M12 8v5M12 17v.01M10.3 3.9 2.6 17.3A1.6 1.6 0 0 0 4 19.7h16a1.6 1.6 0 0 0 1.4-2.4L13.7 3.9a1.6 1.6 0 0 0-2.8 0z" /> : <path d="M12 17v.01M12 14c0-2 2.5-2.2 2.5-4.4A2.5 2.5 0 0 0 12 7a2.5 2.5 0 0 0-2.5 2.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />}
        </svg>
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("Cette ligne et votre profil")}
        foot={
          <div className={styles.foot}>
            <Link className="btn sm primary" href={hasProfile ? "/moi/profil" : "/moi/profil?commencer=1"} onClick={() => setOpen(false)}>
              {t(hasProfile ? "Voir mon profil" : "Répondre aux sept questions")}
            </Link>
          </div>
        }
      >
        {state === "none" ? (
          <div className={styles.body}>
            <p>
              <b>{t("Nous ne savons pas encore si cette ligne vous convient.")}</b>
            </p>
            <p>{t("Sept questions, deux minutes : combien de temps vous pouvez laisser l'argent placé, ce qu'une baisse vous ferait, ce que vous pouvez placer cette année. Les fiches disent ensuite, d'un coup d'œil, si une ligne tient dans votre horizon.")}</p>
            <p className={styles.note}>{t("Vos réponses restent chez nous, elles ne servent qu'à vous prévenir ; vous pouvez les changer à tout moment, et une intention reste possible dans tous les cas.")}</p>
          </div>
        ) : (
          <div className={styles.body}>
            <p>
              <b>{t("Cette ligne est {flag}.", { flag: text ?? "" })}</b>
            </p>
            <p>
              {t(
                level === "warn"
                  ? "Ce n'est pas un refus : c'est un écart entre ce que cette ligne demande et ce que vous nous avez dit. Vous pouvez la déclarer quand même, en le confirmant dans le formulaire, et un conseiller en parlera avec vous avant toute transmission."
                  : "Sa durée tient dans l'horizon que vous nous avez donné. Cela ne dit rien du reste : le rendement n'est pas garanti, et les risques d'une ligne se lisent dans sa fiche.",
              )}
            </p>
            <p className={styles.note}>{t("Le repère vient de vos réponses aux sept questions du profil. Si votre situation a changé, changez-les : les fiches suivront.")}</p>
          </div>
        )}
      </Sheet>
    </>
  );
}
