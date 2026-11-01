"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { logout, logoutEverywhere } from "@/app/connexion/actions";
import styles from "./page.module.css";

/**
 * LA SEULE LIGNE DU SOMMAIRE QUI N'EST PAS UNE DESTINATION.
 *
 * On ne fait pas une page pour sortir. Elle se distingue donc des cinq
 * rubriques au lieu de se ranger parmi elles : pas de chevron, pas de phrase
 * qui promet une suite, et un cadre qui dit que c'est un geste.
 *
 * « PARTOUT » A LE MÊME BOUTON QUE « CET APPAREIL » (1er novembre 2026, sur demande),
 * ET SE DEMANDE ENCORE. Se déconnecter de cet appareil est sans conséquence : on se
 * reconnecte. Se déconnecter de TOUS retire aussi la clé d'accès des autres, et
 * quelqu'un qui n'a plus son téléphone d'avant se retrouve dehors. Le bouton a
 * donc la même forme, mais il ne déconnecte pas au premier toucher : il ouvre une
 * confirmation, « Oui, partout » ou « Annuler ».
 */
export function Deconnexion() {
  const t = useT();
  const [partout, setPartout] = useState(false);

  return (
    <section className={styles.sortie}>
      <form action={logout}>
        <button type="submit" className={styles.sortieBtn}>
          {t("Se déconnecter de cet appareil")}
        </button>
      </form>
      {partout ? (
        <form action={logoutEverywhere} className={styles.sortieConfirme}>
          <span>{t("Déconnecter tous vos appareils ? Il faudra se reconnecter sur chacun.")}</span>
          <button type="submit" className={styles.sortieOui}>
            {t("Oui, partout")}
          </button>
          <button type="button" className={styles.sortieNon} onClick={() => setPartout(false)}>
            {t("Annuler")}
          </button>
        </form>
      ) : (
        <button type="button" className={styles.sortieBtn} onClick={() => setPartout(true)}>
          {t("Se déconnecter partout")}
        </button>
      )}
    </section>
  );
}
