"use client";

import { useActionState } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { useT } from "@/i18n/client";
import { transfererAction } from "./actions";
import styles from "./page.module.css";

/**
 * Transférer un message reçu, avec ses pièces.
 *
 * POURQUOI IL EST REPLIÉ. Un transfert est rare à l'échelle d'un fil, et un
 * champ d'adresse ouvert sous chaque message encombrerait la lecture de tous
 * pour le besoin d'un seul. Le `<details>` le range sans le cacher, et il
 * fonctionne sans JavaScript.
 *
 * POURQUOI LA MÊME RELECTURE QUE L'ENVOI. Un transfert quitte la maison comme
 * un courriel ordinaire : même nom d'expéditeur, même conséquence, et une
 * adresse mal tapée l'envoie chez quelqu'un d'autre pour de bon. La feuille
 * redit donc où il part, et ce qu'il emporte.
 */
export function TransfertForm({ messageId, sujet, pieces }: { messageId: string; sujet?: string; pieces: number }) {
  const t = useT();
  const [state, action, pending] = useActionState(transfererAction, null);
  const formId = `tr-${messageId}`;
  return (
    <details className={styles.transfert}>
      <summary>{t("Transférer")}</summary>
      <form id={formId} action={action} className={styles.transfertCorps}>
        <input type="hidden" name="messageId" value={messageId} />
        <input type="email" name="vers" required placeholder={t("adresse@exemple.com")} aria-label={t("Transférer à")} className={styles.subject} />
        {state && !state.ok && <span className={styles.err}>{state.error}</span>}
        {state?.ok && <span className={styles.okMsg}>{t("Transféré.")}</span>}
        <ConfirmPublish
          form={formId}
          label={t("Transférer")}
          title={t("Relire avant de transférer")}
          lines={[
            t("Objet : {o}", { o: `Tr. : ${sujet || t("message reçu")}` }),
            pieces > 0 ? t("Avec ses {n} pièce(s) jointe(s)", { n: String(pieces) }) : t("Sans pièce jointe"),
            t("Le message d'origine part cité, avec son expéditeur et sa date."),
          ]}
          confirmLabel={t("Transférer")}
          pending={pending}
          className="btn sm"
        />
      </form>
    </details>
  );
}
