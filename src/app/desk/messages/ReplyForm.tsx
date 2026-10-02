"use client";

import { useActionState, useId, useState } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { Select } from "@/components/ui/Select";
import { useT } from "@/i18n/client";
import { replyAction } from "./actions";
import styles from "./page.module.css";

/**
 * Répondre à un client, avec une relecture avant que le message parte.
 *
 * POURQUOI UNE RELECTURE ET NON UNE QUESTION. Le formulaire envoyait au premier
 * clic, et un message parti ne se rattrape pas : il est chez le client, dans sa
 * boîte, avec le nom de la maison dessus. Mais « êtes-vous sûr » n'attrape rien,
 * parce qu'il entre dans le rythme du clic en une semaine. La feuille redit donc
 * le destinataire, l'objet, et LE TEXTE TEL QU'IL PARTIRA : une faute de frappe
 * ou un paragraphe collé deux fois se voient là, et nulle part ailleurs.
 *
 * L'OBJET DEVIENT OBLIGATOIRE pour un courriel, ici et sur le serveur. Il ne
 * l'était nulle part, et le serveur comblait le vide par un objet inventé,
 * identique sur tous les messages : il se range mal dans la boîte du client et
 * cachait l'oubli. Le bouton reste fermé tant que l'objet et le corps ne sont
 * pas écrits, et la raison s'affiche à côté.
 *
 * WhatsApp passe par la même feuille : un message qui quitte la maison vaut une
 * relecture, quel que soit le tuyau. Il n'a pas d'objet, et on ne lui en demande
 * pas.
 */
export function ReplyForm({ to, channel, name, lines = [] }: { to: string; channel: "whatsapp" | "email"; name?: string; lines?: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState(replyAction, null);
  const formId = useId();
  return (
    <form id={formId} action={action} className={styles.reply}>
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="channel" value={channel} />
      {name && <input type="hidden" name="name" value={name} />}
      {/* LE REMONTAGE VIDE LE FORMULAIRE, ET C'EST VOLONTAIRE.
          Sans cela le message suivant partirait avec le texte du précédent,
          c'est-à-dire exactement l'erreur que la relecture cherche à éviter.
          La clef change à chaque envoi réussi, et aussi quand on passe d'un fil
          à l'autre. Un effet qui remettrait les champs à zéro ferait la même
          chose, mais la maison interdit d'appeler setState dans un effet, et
          elle a raison : une remise à zéro qui se déclenche toute seule finit
          par se déclencher au mauvais moment. */}
      <Champs key={`${to}:${state?.at ?? ""}`} to={to} name={name} channel={channel} lines={lines} formId={formId} pending={pending} erreur={state && !state.ok ? state.error : undefined} />
    </form>
  );
}

function Champs({
  to,
  name,
  channel,
  lines,
  formId,
  pending,
  erreur,
}: {
  to: string;
  name?: string;
  channel: "whatsapp" | "email";
  lines: { id: string; title: string }[];
  formId: string;
  pending: boolean;
  erreur?: string;
}) {
  const t = useT();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [offerId, setOfferId] = useState("");

  const parMail = channel === "email";
  const manque = !body.trim() || (parMail && !subject.trim());
  const ligne = lines.find((l) => l.id === offerId);

  const relecture = [
    // « À : {qui} » serait une clef à trou de trois lettres, qui ne porte aucun
    // sens pour qui traduit. Le mot se traduit seul, la ponctuation est du texte.
    `${t("Destinataire")} : ${name ? `${name} · ${to}` : to}`,
    parMail ? t("Objet : {o}", { o: subject.trim() }) : t("Par WhatsApp, sans objet"),
    ligne ? t("Avec la fiche : {l}", { l: ligne.title }) : t("Sans fiche jointe"),
  ];

  return (
    <>
      {parMail && <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("Objet")} className={styles.subject} required maxLength={160} />}
      <textarea
        name="body"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={channel === "whatsapp" ? "Répondre sur WhatsApp (fenêtre de 24 h après le dernier message du client)" : "Répondre par e-mail"}
        required
      />
      {lines.length > 0 && (
        <label className={styles.withLine}>
          <span>{t("Répondre avec la ligne")}</span>
          <Select block name="offerId" value={offerId} onChange={setOfferId} options={[{ value: "", label: t("aucune") }, ...lines.map((l) => ({ value: l.id, label: l.title }))]} />
          <small className="muted">{t(channel === "whatsapp" ? "La fiche, et un lien qui reconnaît ce numéro : l'intention ne demandera que le code e-mail." : "La fiche de la ligne, en lien.")}</small>
        </label>
      )}
      <div className={styles.replyRow}>
        {erreur && <span className={styles.err}>{erreur}</span>}
        {manque && <small className="muted">{t(parMail ? "Un objet et un message sont nécessaires." : "Un message est nécessaire.")}</small>}
        <ConfirmPublish
          form={formId}
          label={parMail ? t("Envoyer l'e-mail") : t("Envoyer sur WhatsApp")}
          title={t("Relire avant d'envoyer")}
          lines={relecture}
          corps={body.trim()}
          confirmLabel={parMail ? t("Envoyer l'e-mail") : t("Envoyer sur WhatsApp")}
          disabled={manque}
          pending={pending}
        />
      </div>
    </>
  );
}
