"use client";

import { useT } from "@/i18n/client";
import { useId } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { discardReferenceAction, publishReferenceAction, resetReferenceAction } from "./actions";
import styles from "./page.module.css";

/**
 * The buttons that move a reference entry between its three states: the
 * code default, a draft, the published value. Each one is a form on a
 * server action; the destructive ones ask once.
 */
export function ResetButton({ kind, k, builtin, from, to }: { kind: string; k: string; builtin: boolean; from?: string; to?: string }) {
  const tr = useT();
  const label = builtin ? tr("Revenir aux valeurs par défaut") : tr("Supprimer cette entrée");
  const q = builtin ? tr("Revenir aux valeurs livrées avec l'application pour {k} ?", { k }) + (from && to ? `\n${from} → ${to}` : "") : tr("Supprimer {k} ? L'entrée disparaît à la publication.", { k });
  return (
    <form action={resetReferenceAction} className={styles.inlineForm} onSubmit={(e) => !window.confirm(q) && e.preventDefault()}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="key" value={k} />
      <button className={`btn sm ${builtin ? "" : styles.dangerBtn}`} type="submit">
        {label}
      </button>
    </form>
  );
}

/**
 * Publier un brouillon du référentiel change ce que l’application lit, pour les
 * clients comme pour le desk, et consomme le brouillon : il n’y a pas de retour
 * en arrière d’un clic. La relecture dit combien d’entrées bougent et lesquelles.
 */
export function PublishButton({ kind, k, n, primary }: { kind: string; k?: string; n?: number; primary?: boolean }) {
  const tr = useT();
  const id = useId();
  const label = k ? tr("Publier cette entrée") : tr("Publier {n} modification(s)", { n: String(n ?? 0) });
  return (
    <form id={id} action={publishReferenceAction} className={styles.inlineForm}>
      <input type="hidden" name="kind" value={kind} />
      {k && <input type="hidden" name="key" value={k} />}
      <ConfirmPublish
        form={id}
        label={label}
        confirmLabel={label}
        className={`btn sm ${primary ? "primary" : ""}`}
        title={tr("Publier au référentiel")}
        lines={[
          k
            ? tr("L'entrée {k} devient ce que l'application lit, pour les clients comme pour le desk.", { k })
            : tr("{n} modification(s) deviennent ce que l'application lit, pour les clients comme pour le desk.", { n: String(n ?? 0) }),
          tr("Le brouillon est consommé : revenir en arrière demande de ressaisir la valeur précédente."),
        ]}
      />
    </form>
  );
}

export function DiscardButton({ kind, k, n }: { kind: string; k?: string; n?: number }) {
  const tr = useT();
  const q = k ? tr("Abandonner le brouillon de {k} ? La valeur publiée ne bouge pas.", { k }) : tr("Abandonner les {n} brouillon(s) de cet onglet ? Les valeurs publiées ne bougent pas.", { n: String(n ?? 0) });
  return (
    <form action={discardReferenceAction} className={styles.inlineForm} onSubmit={(e) => !window.confirm(q) && e.preventDefault()}>
      <input type="hidden" name="kind" value={kind} />
      {k && <input type="hidden" name="key" value={k} />}
      <button className="btn sm ghost" type="submit">
        {k ? tr("Abandonner ce brouillon") : tr("Abandonner les brouillons")}
      </button>
    </form>
  );
}
