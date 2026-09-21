"use client";

import { useT } from "@/i18n/client";
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

export function PublishButton({ kind, k, n, primary }: { kind: string; k?: string; n?: number; primary?: boolean }) {
  const tr = useT();
  return (
    <form action={publishReferenceAction} className={styles.inlineForm}>
      <input type="hidden" name="kind" value={kind} />
      {k && <input type="hidden" name="key" value={k} />}
      <button className={`btn sm ${primary ? "primary" : ""}`} type="submit" title={tr("Rend la modification visible des clients et du desk")}>
        {k ? tr("Publier cette entrée") : tr("Publier {n} modification(s)", { n: String(n ?? 0) })}
      </button>
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
