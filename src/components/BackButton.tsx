"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";

/** « ← Retour » : the page the reader came from when there is one in this tab, a fallback link otherwise. */
export function BackButton({ fallbackHref, fallbackLabel, className = "btn sm ghost" }: { fallbackHref: string; fallbackLabel: string; className?: string }) {
  const t = useT();
  const router = useRouter();
  const canGoBack = useSyncExternalStore(
    () => () => {},
    () => window.history.length > 1 && document.referrer !== "" && new URL(document.referrer).origin === location.origin,
    () => false,
  );
  if (!canGoBack)
    return (
      <Link href={fallbackHref} className={className}>
        ← {fallbackLabel}
      </Link>
    );
  return (
    <button type="button" className={className} onClick={() => router.back()}>
      ← {t("Retour")}
    </button>
  );
}
