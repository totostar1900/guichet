"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import { dismissNudge, nudgeDismissed, readDevice } from "@/lib/device-client";
import styles from "./TrustNudge.module.css";

const noop = () => () => {};
const snapshot = () => {
  try {
    return `${localStorage.getItem("guichet_device") ?? ""}|${localStorage.getItem("guichet_device_nudge") ?? ""}`;
  } catch {
    return "x|x";
  }
};

/** « Un doigt la prochaine fois ? » : offered once a client is in, until they add a device or wave it away. */
export function TrustNudge() {
  const t = useT();
  const raw = useSyncExternalStore(noop, snapshot, () => "");
  const [gone, setGone] = useState(false);
  if (!raw || gone || raw === "x|x" || readDevice() || nudgeDismissed()) return null;
  return (
    <div className={styles.nudge} role="note">
      <span>
        <b>{t("Entrer sans attendre un code")}</b> {t("Enregistrez cet appareil : la prochaine fois, Face ID, votre empreinte ou un code à quatre chiffres vous connectent, sans passer par votre boîte mail.")}
      </span>
      <Link href="/moi/securite" className="btn sm primary">
        {t("Ajouter cet appareil")}
      </Link>
      <button
        type="button"
        className={styles.x}
        aria-label={t("Plus tard")}
        onClick={() => {
          dismissNudge();
          setGone(true);
        }}
      >
        ×
      </button>
    </div>
  );
}
