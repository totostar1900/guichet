"use client";

import { useActionState, useId, useState } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { Select } from "@/components/ui/Select";
import { useT } from "@/i18n/client";
import { replyAction } from "./actions";
import { blocLigne, signature, type Ligne } from "./message-exact";
import styles from "./page.module.css";

/**
 * Répondre à un client, avec une relecture avant que le message parte.
 *
 * POURQUOI UNE RELECTURE ET NON UNE QUESTION. Le formulaire envoyait au premier
 * clic, et un message parti ne se rattrape pas : il est chez le client, dans sa
 * boîte, avec le nom de la maison dessus. Mais « êtes-vous sûr » n'attrape rien,
 * parce qu'il entre dans le rythme du clic en une semaine. La feuille montre
 * donc LE MESSAGE EXACT, et non un résumé : une faute de frappe ou un paragraphe
 * collé deux fois se voient là, et nulle part ailleurs.
 *
 * EXACT VEUT DIRE EXACT. Le résumé en trois lignes laissait dehors trois
 * morceaux que le client reçoit pourtant : le bloc de la fiche (son titre ET son
 * adresse, pas seulement son nom), la signature, et l'enveloppe elle-même, qui
 * est la première chose lue dans une boîte aux lettres. Ils sont tous là
 * maintenant, construits par le même `texteExact()` que le serveur appelle pour
 * envoyer : l'aperçu ne peut pas diverger de l'envoi.
 *
 * LES QUATRE TEINTES, lecture C arrêtée le 2 octobre 2026. Chaque partie porte
 * la sienne : l'enveloppe, ce que l'opérateur a écrit, ce que le serveur ajoute,
 * la signature. L'oeil voit d'un coup ce qui vient de lui et ce qui vient de la
 * machine, et c'est exactement ce qu'une relecture doit trancher. Les teintes
 * viennent des jetons, donc le partage tient aussi la nuit.
 *
 * LE TEXTE DU MESSAGE NE PASSE JAMAIS PAR t(). Il s'adresse au client, et le
 * serveur l'écrit en français quelle que soit la langue de l'écran du desk :
 * le traduire ici donnerait un aperçu faux. Seules les étiquettes autour
 * (« Expéditeur », « ajouté automatiquement ») se traduisent.
 *
 * L'OBJET EST OBLIGATOIRE pour un courriel, ici et sur le serveur. Il ne l'était
 * nulle part, et le serveur comblait le vide par un objet inventé, identique sur
 * tous les messages : il se range mal dans la boîte du client et cachait
 * l'oubli.
 *
 * WhatsApp passe par la même feuille : un message qui quitte la maison vaut une
 * relecture, quel que soit le tuyau. Il n'a pas d'objet, et on ne lui en demande
 * pas.
 */
export function ReplyForm({
  to,
  channel,
  name,
  lines = [],
  deskName,
  appUrl,
  from,
}: {
  to: string;
  channel: "whatsapp" | "email";
  name?: string;
  lines?: { id: string; title: string }[];
  /** Qui signe : le serveur met ce nom au bas du message. */
  deskName: string;
  /** La racine des liens de fiche, telle que le serveur la lira. */
  appUrl: string;
  /** L'adresse d'expédition, telle que le client la verra. */
  from: string;
}) {
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
      <Champs
        key={`${to}:${state?.at ?? ""}`}
        to={to}
        name={name}
        channel={channel}
        lines={lines}
        deskName={deskName}
        appUrl={appUrl}
        from={from}
        formId={formId}
        pending={pending}
        erreur={state && !state.ok ? state.error : undefined}
      />
    </form>
  );
}

function Champs({
  to,
  name,
  channel,
  lines,
  deskName,
  appUrl,
  from,
  formId,
  pending,
  erreur,
}: {
  to: string;
  name?: string;
  channel: "whatsapp" | "email";
  lines: { id: string; title: string }[];
  deskName: string;
  appUrl: string;
  from: string;
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
  const choisie = lines.find((l) => l.id === offerId);

  /* L'adresse de la fiche, telle que le serveur la composera. Sur WhatsApp elle
     porte en plus une marque signée qui reconnaît le numéro : elle se calcule à
     l'envoi, donc elle ne peut pas s'afficher d'avance. Elle est annoncée comme
     telle plutôt qu'inventée : un aperçu qui invente est pire qu'un aperçu qui
     avoue. */
  const ligne: Ligne | undefined = choisie ? { titre: choisie.title, url: `${appUrl}/offres/${choisie.id}${parMail ? "" : "?de="}` } : undefined;
  const ajoute = blocLigne({ ligne, canal: channel }).replace(/^\n+/, "");

  const relecture = [
    // « À : {qui} » serait une clef à trou de trois lettres, qui ne porte aucun
    // sens pour qui traduit. Le mot se traduit seul, la ponctuation est du texte.
    `${t("Destinataire")} : ${name ? `${name} · ${to}` : to}`,
    parMail ? t("Objet : {o}", { o: subject.trim() }) : t("Par WhatsApp, sans objet"),
  ];

  const enveloppe = (
    <div className={styles.relire}>
      <div className={styles.relireEnt}>
        <span>{parMail ? t("Expéditeur") : t("Canal")}</span>
        <b>{parMail ? from : t("WhatsApp")}</b>
        <span>{t("Destinataire")}</span>
        <b>{name ? `${name} · ${to}` : to}</b>
        {parMail && (
          <>
            <span>{t("Objet")}</span>
            <b className={styles.relireObjet}>{subject.trim()}</b>
          </>
        )}
      </div>
      {/* Le texte du message reste littéral : ni t(), ni reformulation. */}
      <p className={styles.relireVotre}>{body.trim()}</p>
      {ajoute && <p className={styles.relireAjoute}>{ajoute}</p>}
      <p className={styles.relireSignature}>{signature(deskName)}</p>
      <p className={styles.relirePied}>
        {t("Rien ne s'ajoute autour : le message part avec ce texte seul.")}
        {!parMail && choisie ? ` ${t("Le lien emportera en plus une marque qui reconnaît ce numéro.")}` : ""}
      </p>
    </div>
  );

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
          corps={enveloppe}
          confirmLabel={parMail ? t("Envoyer l'e-mail") : t("Envoyer sur WhatsApp")}
          disabled={manque}
          pending={pending}
        />
      </div>
    </>
  );
}
