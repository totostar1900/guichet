"use client";

import { useActionState } from "react";

/** The one button that publishes a month, with its result line. */
export function Publish({ month, action, label }: { month: string; action: (prev: { error?: string } | null, form: FormData) => Promise<{ error?: string }>; label: string }) {
  const [state, submit, pending] = useActionState<{ error?: string } | null, FormData>(action, null);
  return (
    <form action={submit} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <input type="hidden" name="month" value={month} />
      <button className="btn sm primary" type="submit" disabled={pending}>
        {pending ? "…" : label}
      </button>
      {state?.error && <small style={{ color: "var(--warn)" }}>{state.error}</small>}
    </form>
  );
}
