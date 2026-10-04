"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { CANAL_PROMESSE, MESSAGE_CLEF, canauxOuverts } from "@/lib/domain/contact-rapide";
import type { Channel, Offer } from "@/lib/domain/types";
import styles from "./ContactRapide.module.css";

/**
 * JOINDRE LE DESK SUR CETTE LIGNE, SANS RIEN REDÉCLARER.
 *
 * Un client dont un canal est déjà prouvé voyait, pour poser une question, le
 * formulaire d'intention entier : prénom, nom, numéro, adresse, le tout déjà
 * connu et déjà prouvé. Ce formulaire existe pour engager une opération ; une
 * demande de rappel n'engage rien, et le péage se payait deux fois.
 *
 * TROIS BOUTONS, UN MESSAGE, UN ENVOI. Le message nomme la ligne de lui-même,
 * parce qu'un desk qui lit « bonjour, je voudrais des informations » doit
 * rouvrir la fiche pour savoir de quoi on parle ; il reste modifiable, et
 * c'est tout ce qu'il y a à faire.
 *
 * LE CANAL EST CELUI DE LA RÉPONSE. « WhatsApp » veut dire « rappelez-moi
 * là », et le bouton le dit en toutes lettres plutôt que de le laisser
 * deviner : trois icônes sans phrase laisseraient croire que l'une d'elles
 * ouvre WhatsApp. Aucune ne sort de la maison, le message entre dans la file
 * du desk, et la conversation se poursuit dans son fil.
 */
export function ContactRapide({ offer, emailProuve, telephoneProuve, canalInitial }: { offer: Pick<Offer, "id" | "title">; emailProuve: boolean; telephoneProuve: boolean; canalInitial?: Channel }) {
  const t = useT();
  const canaux = canauxOuverts({ emailProuve, telephoneProuve });
  const [canal, setCanal] = useState<Channel>(canalInitial && canaux.includes(canalInitial) ? canalInitial : (canaux[0] ?? "E-mail"));
  const [texte, setTexte] = useState(t(MESSAGE_CLEF, { t: offer.title }));
  const [envoye, setEnvoye] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, demarrer] = useTransition();
  if (canaux.length === 0) return null;

  const envoyer = () => {
    setErreur(null);
    demarrer(async () => {
      const { contacterSurLigne } = await import("@/app/offres/[id]/actions");
      const res = await contacterSurLigne(offer.id, canal, texte);
      if (res.ok) setEnvoye(res.ref);
      else setErreur(res.error);
    });
  };

  if (envoye)
    return (
      <div className={styles.bloc} role="status">
        <b className={styles.ok}>{t("Message envoyé · {ref}", { ref: envoye })}</b>
        <p className={styles.note}>{t(CANAL_PROMESSE[canal])}</p>
        <p className={styles.note}>{t("Vous le retrouvez dans vos messages, avec la réponse du desk.")}</p>
      </div>
    );

  return (
    <div className={styles.bloc}>
      <b>{t("Joindre un conseiller sur cette ligne")}</b>
      <p className={styles.note}>{t("Vos coordonnées sont déjà prouvées : il n'y a rien à ressaisir.")}</p>
      <div className={styles.canaux} role="group" aria-label={t("Comment vous répondre")}>
        {canaux.map((c) => (
          <button key={c} type="button" aria-pressed={canal === c} className={canal === c ? styles.on : undefined} onClick={() => setCanal(c)}>
            {t(c)}
          </button>
        ))}
      </div>
      <p className={styles.promesse}>{t(CANAL_PROMESSE[canal])}</p>
      <label className={styles.champ}>
        <span>{t("Votre message")}</span>
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} maxLength={1000} />
      </label>
      {erreur && <p className={styles.err}>{erreur}</p>}
      <button type="button" className="btn primary" onClick={envoyer} disabled={envoi}>
        {t(envoi ? "Envoi…" : "Envoyer au desk")}
      </button>
    </div>
  );
}
