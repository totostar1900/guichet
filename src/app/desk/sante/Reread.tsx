"use client";

import { useActionState } from "react";
import type { RereadResult } from "./actions";

/**
 * Le bouton qui relance la lecture d'un bulletin, ou des plus anciens de la
 * liste quand aucune date n'est donnée. La ligne de résultat reste sous le
 * bouton : c'est elle qui dit ce que la relecture a changé.
 */
export function Reread({
  action,
  label,
  date,
  offerId,
  primary,
}: {
  action: (prev: RereadResult | null, form: FormData) => Promise<RereadResult>;
  label: string;
  date?: string;
  offerId?: string;
  primary?: boolean;
}) {
  const [state, submit, pending] = useActionState<RereadResult | null, FormData>(action, null);
  return (
    <form action={submit} style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {date && <input type="hidden" name="date" value={date} />}
      {offerId && <input type="hidden" name="offerId" value={offerId} />}
      <button className={`btn sm ${primary ? "primary" : "ghost"}`} type="submit" disabled={pending}>
        {pending ? "…" : label}
      </button>
      {state?.ok && <small className="muted">{state.ok}</small>}
      {state?.error && <small style={{ color: "var(--warn)" }}>{state.error}</small>}
    </form>
  );
}
