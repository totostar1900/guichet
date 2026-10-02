"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { fmt, fmtDate } from "@/lib/format";
import { demanderRestitution, type RestitutionResult } from "./trader/restitution-actions";
import styles from "./Console.module.css";

/**
 * Réclamer son disponible, à l'endroit où on le lit.
 *
 * La règle du 2 octobre 2026 laisse ce solde chez la maison aussi longtemps que
 * le client le souhaite. Son souhait a donc besoin d'un geste, et le geste a
 * besoin d'être là où le chiffre est : un bouton rangé trois pages plus loin
 * laisserait le solde s'accumuler faute d'avoir trouvé la porte.
 *
 * LA DERNIÈRE RÉPONSE S'AFFICHE AUSSI, et c'est la moitié qui compte. Un refus
 * motivé que le client ne verrait jamais serait pire que pas de refus du tout :
 * il attendrait un virement qui ne vient pas, sans savoir pourquoi.
 *
 * Le montant n'est pas saisi. Il réclame ce qui est réclamable, et le desk
 * recalcule au moment de virer, parce qu'un coupon peut tomber entre les deux.
 */
export function DemanderVersement({ montant, demande }: { montant: number; demande?: { state: "demandee" | "payee" | "refusee"; askedAt: string; askedAmount: number; paidAmount?: number; closedReason?: string; closedAt?: string } }) {
  const t = useT();
  const [res, action, pending] = useActionState<RestitutionResult | null, FormData>(demanderRestitution, null);
  const [ouvert, setOuvert] = useState(false);

  if (demande?.state === "demandee")
    return (
      <p className={styles.versementEtat}>
        {t("Versement demandé le {d} pour {m} FCFA. Le desk vire sur le compte déclaré à l'ouverture, et vous recevez un avis.", { d: fmtDate(demande.askedAt), m: fmt(Math.round(demande.askedAmount)) })}
      </p>
    );

  if (demande?.state === "refusee" && demande.closedReason)
    return (
      <p className={styles.versementEtat}>
        {t("Votre demande du {d} n'a pas été suivie : {motif}", { d: fmtDate(demande.askedAt), motif: demande.closedReason })}{" "}
        {montant > 0 && (
          <button type="button" className={styles.versementLien} onClick={() => setOuvert(true)}>
            {t("Demander de nouveau")}
          </button>
        )}
        {ouvert && <Formulaire action={action} pending={pending} res={res} montant={montant} t={t} />}
      </p>
    );

  if (montant <= 0) return null;

  if (!ouvert)
    return (
      <p className={styles.versementEtat}>
        {demande?.state === "payee" && demande.paidAmount != null && (
          <>{t("Dernier versement : {m} FCFA le {d}. ", { m: fmt(Math.round(demande.paidAmount)), d: fmtDate(demande.closedAt ?? demande.askedAt) })}</>
        )}
        {t("Ce solde reste ici aussi longtemps que vous le souhaitez.")}{" "}
        <button type="button" className={styles.versementLien} onClick={() => setOuvert(true)}>
          {t("Me le faire virer")}
        </button>
      </p>
    );

  return <Formulaire action={action} pending={pending} res={res} montant={montant} t={t} />;
}

function Formulaire({ action, pending, res, montant, t }: { action: (f: FormData) => void; pending: boolean; res: RestitutionResult | null; montant: number; t: (s: string, v?: Record<string, string>) => string }) {
  return (
    <form action={action} className={styles.versementForm}>
      <p>{t("{m} FCFA seront virés sur le compte déclaré à l'ouverture de votre compte-titres. Le desk recalcule au moment du virement : un coupon qui tombe d'ici là s'y ajoute.", { m: fmt(Math.round(montant)) })}</p>
      <input name="note" maxLength={240} placeholder={t("Un mot pour le desk (facultatif)")} />
      <button className="btn sm primary" type="submit" disabled={pending}>
        {pending ? "…" : t("Demander le versement")}
      </button>
      {res && <small className={res.ok ? styles.versementOk : styles.versementKo}>{res.ok ? res.message : res.error}</small>}
    </form>
  );
}
