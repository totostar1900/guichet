"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { retirerMonOrdre } from "./counter-actions";
import styles from "./page.module.css";

/**
 * Ce qu'on peut encore faire d'un ordre déjà parti.
 *
 * Une intention envoyée n'offrait rien : la carte disait où elle en était, et
 * c'était tout. Se raviser demandait d'appeler, alors que c'est son ordre.
 *
 * Trois gestes, et le troisième n'existe pas toujours.
 *
 *   VOIR LA LIGNE, qui est consulter, donc toujours là.
 *   NOUS ÉCRIRE, qui est parler, donc toujours là aussi.
 *   RETIRER, qui engage, et qui n'existe que tant que l'ordre est chez nous.
 *
 * LE RETRAIT S'OUVRE AVANT DE S'EXÉCUTER, et dit ce qu'il fait. Un ordre retiré
 * ne revient pas : ce n'est pas une suspension, c'est une fin, et le client doit
 * le savoir avant et non après. C'est la seule commande de cet écran dont on ne
 * se défait pas d'un bouton.
 *
 * Quand l'ordre est confirmé, le retrait n'est pas offert mais la raison l'est :
 * un bouton grisé sans explication se lit comme une panne, et une panne fait
 * appeler pour la mauvaise raison.
 */
export function OrdreMenu({ intentId, offerId, etat, ref_ }: { intentId: string; offerId: string; etat: string; ref_: string }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const retirable = etat === "recue" || etat === "contre_proposee";
  const partie = etat === "transmise" || etat === "servie" || etat === "non_servie" || etat === "reglee";

  if (confirme)
    return (
      <form action={retirerMonOrdre} className={styles.retrait}>
        <input type="hidden" name="intentId" value={intentId} />
        <p>{t("Cet ordre sera retiré et ne repartira pas. Pour le replacer, il faudra en passer un nouveau, aux conditions du moment.")}</p>
        <span className={styles.retraitBtns}>
          <button className="btn sm" type="submit">
            {t("Retirer l'ordre {r}", { r: ref_ })}
          </button>
          <button type="button" className="btn sm ghost" onClick={() => setConfirme(false)}>
            {t("Le garder")}
          </button>
        </span>
      </form>
    );

  if (!ouvert)
    return (
      <button type="button" className={styles.dots} aria-label={t("Autres actions sur cet ordre")} onClick={() => setOuvert(true)}>
        ···
      </button>
    );

  return (
    <div className={styles.ordreMenu}>
      <Link href={`/offres/${offerId}`} onClick={() => setOuvert(false)}>
        {t("Voir la ligne")}
      </Link>
      <Link href={`/info/aide#entretien`} onClick={() => setOuvert(false)}>
        {t("Nous écrire à propos de cet ordre")}
      </Link>
      {retirable ? (
        <button type="button" onClick={() => setConfirme(true)}>
          {t("Retirer cet ordre")}
        </button>
      ) : (
        <span className={styles.ordreNon}>
          {t(partie ? "L'ordre est parti au marché : il ne se retire plus, ni par vous ni par nous." : "L'ordre est confirmé et au carnet : appelez-nous pour le retirer.")}
        </span>
      )}
      <button type="button" className={styles.ordreFerme} onClick={() => setOuvert(false)}>
        {t("Fermer")}
      </button>
    </div>
  );
}
