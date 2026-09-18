"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleWatch } from "@/app/offres/[id]/actions";

/** « Suivre » on a fiche: one click, the daily alert does the rest. */
export function WatchButton({ offerId, initial, signedIn }: { offerId: string; initial: boolean; signedIn: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const t = useT();
  if (!signedIn) {
    return (
      <Link className="btn sm ghost" href={`/connexion?next=${encodeURIComponent(`/offres/${offerId}`)}`} title={t("Connectez-vous pour suivre cette ligne")}>
        {t("Suivre")}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={`btn sm ${on ? "" : "ghost"}`}
      disabled={pending}
      aria-pressed={on}
      title={t(on ? "Vous êtes prévenu à chaque changement de cours, de prix ou de statut" : "Recevoir un message à chaque changement de cours, de prix ou de statut")}
      onClick={() =>
        start(async () => {
          const res = await toggleWatch(offerId, !on);
          if (res.ok) setOn(res.watching);
        })
      }
    >
      {on ? `✓ ${t("Suivie")}` : t("Suivre")}
    </button>
  );
}
