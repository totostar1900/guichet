"use client";

import { useActionState } from "react";
import type { RereadResult } from "@/lib/desk/reprise";

/**
 * Le bouton d'une action de desk qui rend une phrase, et la phrase reste
 * sous lui : c'est elle qui dit ce que le geste a changé.
 *
 * Il est né pour la relecture d'un bulletin, d'où son nom ; il sert aussi au
 * rattrapage des derniers échanges et à la clôture d'une ligne sortie de la
 * cote. Trois pages l'utilisent depuis que chaque sujet a rejoint son
 * domicile, donc il vit avec les composants du desk et non dans l'une d'elles.
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
