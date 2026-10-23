"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { retirerMonOrdre } from "@/app/moi/counter-actions";
import styles from "./page.module.css";

/**
 * VIDER LE PANIER, À L'ENDROIT OÙ ON L'A LAISSÉ PLEIN.
 *
 * Le retrait existait, mais sur une autre page et derrière un « ··· » : il
 * fallait quitter son ordre, retrouver sa carte au relevé, et ouvrir un menu
 * à trois points pour renoncer. Personne ne fait ce chemin-là ; on ferme
 * l'onglet, et l'ordre reste au carnet du desk.
 *
 * LA PAGE DE L'ORDRE DOIT DONC PORTER LES DEUX ISSUES, parce que c'est la
 * page où le rappel renvoie : finir, ou renoncer. Une procédure laissée en
 * route qui n'offre qu'une sortie n'en offre aucune — celui qui ne veut plus
 * ne peut rien faire, donc il ne fait rien, et son panier nous suit pendant
 * des semaines.
 *
 * ELLE NE PÈSE PAS LE MÊME POIDS QUE LA SIGNATURE. Un lien de texte sous le
 * bloc de signature, pas un bouton à côté : on ne met pas « signer » et
 * « renoncer » au même rang, et deux cibles de même taille à un doigt l'une
 * de l'autre finissent par se confondre.
 *
 * LE RAPPEL ARRIVE DROIT ICI, et la question s'ouvre d'elle-même : quelqu'un
 * qui a cliqué « je ne veux plus de cet ordre » dans un message a déjà
 * décidé, et lui faire rechercher le lien sur la page serait le punir d'avoir
 * répondu.
 *
 * SON LIEN PORTE « ?retirer », ET NON « #retirer », et ce détail a une
 * raison. Un fragment n'existe que dans le navigateur : le serveur rendrait
 * la question fermée, le client la rouvrirait après coup, et les deux rendus
 * ne diraient pas la même chose — c'est l'erreur d'hydratation qui, trois
 * jours plus tôt, faisait échouer une page sur deux au premier clic. Une
 * requête, elle, se lit au serveur : l'écran est juste du premier coup.
 */
export function RetirerOrdre({ intentId, ref_, ouvertDoffice }: { intentId: string; ref_: string; ouvertDoffice?: boolean }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(Boolean(ouvertDoffice));

  if (!ouvert)
    return (
      <p className={styles.renonce} id="retirer">
        <button type="button" onClick={() => setOuvert(true)}>
          {t("Je ne veux plus de cet ordre")}
        </button>
      </p>
    );

  return (
    <form action={retirerMonOrdre} className={styles.renonceForm} id="retirer">
      <input type="hidden" name="intentId" value={intentId} />
      {/* CE QU'ON PERD EST DIT AVANT, JAMAIS APRÈS. Un ordre retiré ne
          revient pas : ce n'est pas une mise en pause, c'est une fin. */}
      <p>{t("Cet ordre sera retiré et ne repartira pas. Pour le replacer, il faudra en passer un nouveau, aux conditions du moment.")}</p>
      <span className={styles.renonceBtns}>
        <button className="btn sm" type="submit">
          {t("Retirer l'ordre {r}", { r: ref_ })}
        </button>
        <button type="button" className="btn sm ghost" onClick={() => setOuvert(false)}>
          {t("Le garder")}
        </button>
      </span>
    </form>
  );
}
