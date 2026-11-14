"use client";

import { useActionState, useId, useState } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { useT } from "@/i18n/client";
import { ANNONCE_MAX } from "@/lib/domain/annonce";
import { publierAnnonceAction, retirerAnnonceAction, type AnnonceResult } from "./actions";
import styles from "./page.module.css";

/** Publier : le texte, la date de fin, puis une seconde question qui redit ce que les clients liront. */
export function FormulaireAnnonce({ aujourdhui, defaut, max, enCours }: { aujourdhui: string; defaut: string; max: string; enCours?: string }) {
  const t = useT();
  const id = useId();
  const [state, action, pending] = useActionState<AnnonceResult | null, FormData>(publierAnnonceAction, null);
  const [texte, setTexte] = useState("");
  const [jusquAu, setJusquAu] = useState(defaut);
  const propre = texte.trim();
  return (
    <form id={id} action={action} className={styles.formulaire}>
      <label>
        <span>{t("Le texte de l'annonce")}</span>
        <textarea name="texte" rows={3} maxLength={ANNONCE_MAX} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={t("Une phrase factuelle : ce qui se passe, et quand.")} required />
        <small className={styles.compte}>
          {propre.length} / {ANNONCE_MAX}
        </small>
      </label>
      <label>
        <span>{t("Affichée jusqu'au")}</span>
        <input name="jusquAu" type="date" value={jusquAu} min={aujourdhui} max={max} onChange={(e) => setJusquAu(e.target.value)} required />
      </label>
      <ConfirmPublish
        form={id}
        label={t("Publier l'annonce")}
        title={t("Publier cette annonce ?")}
        lines={[
          t("« {a} » s'affiche au-dessus des pages, pour tous les clients, dès maintenant.", { a: propre || "—" }),
          t("Jusqu'au {d}.", { d: jusquAu }),
          ...(enCours ? [t("Elle remplace l'annonce en cours : « {a} ».", { a: enCours })] : []),
          t("Un client peut la fermer ; elle ne revient pas pour lui."),
        ]}
        confirmLabel={t("Publier maintenant")}
        disabled={propre.length < 8 || !jusquAu}
        pending={pending}
      />
      {state && !state.ok && <small className={styles.err}>{state.error}</small>}
    </form>
  );
}

/** Retirer l'annonce en cours, avec une seconde question. */
export function RetirerAnnonce({ id, texte }: { id: string; texte: string }) {
  const t = useT();
  const formId = useId();
  return (
    <form id={formId} action={retirerAnnonceAction}>
      <input type="hidden" name="id" value={id} />
      <ConfirmPublish
        form={formId}
        className="btn sm ghost"
        label={t("Retirer")}
        title={t("Retirer l'annonce ?")}
        lines={[t("« {a} » disparaît des pages : les clients ne la voient plus.", { a: texte }), t("Elle reste au journal, avec la date et le nom de qui l'a retirée.")]}
        confirmLabel={t("Retirer l'annonce")}
      />
    </form>
  );
}
