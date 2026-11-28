"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import styles from "./page.module.css";

/** Le temps qui reste sur les 72 heures, mis à jour chaque minute. */
export function Decompte({ expireLe }: { expireLe: string }) {
  const t = useT();
  const [maintenant, setMaintenant] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMaintenant(Date.now());
    tick();
    const i = setInterval(tick, 60_000);
    return () => clearInterval(i);
  }, []);
  if (maintenant == null) return <p className={styles.decompte}>&nbsp;</p>;
  const min = Math.max(0, Math.floor((Date.parse(expireLe) - maintenant) / 60_000));
  return (
    <p className={styles.decompte}>
      {t("Il reste")} <strong>{Math.floor(min / 60)} h {String(min % 60).padStart(2, "0")}</strong> {t("pour signer")}
    </p>
  );
}
