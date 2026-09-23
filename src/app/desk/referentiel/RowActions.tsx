"use client";

import { useT } from "@/i18n/client";
import { useId } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { discardReferenceAction, publishReferenceAction, removeReferenceAction, resetReferenceAction, restoreReferenceAction } from "./actions";
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
 * Supprimer une entrée du référentiel.
 *
 * Deux lectures avant le brouillon, puis « Publier » : trois portes pour un
 * geste qui retire au client un mot qu'il pouvait lire. La première nomme
 * l'entrée et dit où elle disparaît ; la seconde demande de recopier sa clef,
 * parce qu'une main qui recopie « rendement_actuariel » ne se trompe pas
 * d'entrée, alors qu'une main qui clique « oui » se trompe tous les jours.
 *
 * Rien n'est perdu : une entrée supprimée se rétablit tant que le code la
 * livre, et l'historique du référentiel garde le geste.
 */
export function DeleteButton({ kind, k, what, where }: { kind: string; k: string; what: string; where: string }) {
  const tr = useT();
  const id = useId();
  return (
    <form id={id} action={removeReferenceAction} className={styles.inlineForm}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="key" value={k} />
      <ConfirmPublish
        form={id}
        label={tr("Supprimer")}
        confirmLabel={tr("Supprimer {k}", { k })}
        className={`btn sm ${styles.dangerBtn}`}
        title={tr("Supprimer du référentiel")}
        typed={k}
        lines={[
          tr("« {w} » disparaît de {x} à la publication.", { w: what, x: where }),
          tr("La suppression attend « Publier » comme toute modification, et se défait par « Revenir aux valeurs par défaut »."),
        ]}
      />
    </form>
  );
}

/** Une entrée supprimée que le code livre encore : elle peut revenir. */
export function RestoreButton({ kind, k }: { kind: string; k: string }) {
  const tr = useT();
  return (
    <form action={restoreReferenceAction} className={styles.inlineForm}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="key" value={k} />
      <button className="btn sm" type="submit">
        {tr("Rétablir")}
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
