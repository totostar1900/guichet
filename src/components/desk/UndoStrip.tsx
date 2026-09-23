"use client";

import { useActionState, useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./UndoStrip.module.css";

/**
 * « Annuler la publication », une minute durant.
 *
 * L'accident réel n'est pas de publier une chose fausse, c'est de publier la
 * mauvaise ligne, ou la bonne trop tôt. Une boîte de confirmation taxe les cent
 * publications correctes pour attraper la centième ; un retour arrière ne taxe
 * que celle qu'on rattrape. On le pose donc partout où il est vrai, et nulle
 * part où il ne l'est pas : un WhatsApp parti ne revient pas, et là c'est la
 * relecture avant qui tient lieu de garde-fou.
 *
 * Soixante secondes : le temps de lire la page publiée et de se raviser, pas
 * celui d'oublier que l'on a publié.
 */
export function UndoStrip({
  message,
  action,
  fields,
  seconds = 60,
  onDone,
}: {
  message: string;
  action: (form: FormData) => Promise<void>;
  /** ce que l'action de retour attend, en clair */
  fields: Record<string, string>;
  seconds?: number;
  onDone?: () => void;
}) {
  const t = useT();
  const [left, setLeft] = useState(seconds);
  const [undone, submit, pending] = useActionState<boolean, FormData>(async (_prev, form) => {
    await action(form);
    return true;
  }, false);

  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);

  useEffect(() => {
    if (left <= 0) onDone?.();
  }, [left, onDone]);

  if (left <= 0 || undone) return null;
  return (
    <div className={styles.strip} role="status">
      <span>{message}</span>
      <form action={submit}>
        {Object.entries(fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button type="submit" disabled={pending}>
          {pending ? "…" : t("Annuler la publication")}
        </button>
      </form>
      {/* la seconde s’écrit pareil dans les deux langues : rien à traduire, et une clef
          « {n} s » attraperait toute phrase française finissant par un s */}
      <small>{left} s</small>
    </div>
  );
}
