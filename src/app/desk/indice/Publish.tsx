"use client";

import { useActionState, useId } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";

/**
 * Le bouton qui publie un mois ou un trimestre, avec sa ligne de résultat.
 *
 * Publier dépense un numéro de document et, pour un trimestre, met une page en
 * ligne : c'est irréversible au sens où le numéro ne revient pas. D'où la
 * relecture avant, qui redit les chiffres de la note plutôt que de demander si
 * l'on est sûr.
 */
export function Publish({
  month,
  action,
  label,
  title,
  lines,
  preview,
}: {
  month: string;
  action: (prev: { error?: string } | null, form: FormData) => Promise<{ error?: string }>;
  label: string;
  title: string;
  lines: string[];
  preview?: { href: string; label: string };
}) {
  const [state, submit, pending] = useActionState<{ error?: string } | null, FormData>(action, null);
  const id = useId();
  return (
    <form id={id} action={submit} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <input type="hidden" name="month" value={month} />
      <ConfirmPublish form={id} label={label} title={title} lines={lines} confirmLabel={label} preview={preview} pending={pending} />
      {state?.error && <small style={{ color: "var(--warn)" }}>{state.error}</small>}
    </form>
  );
}
