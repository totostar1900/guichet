import type { ChannelStatus, ClientPrefs } from "@/lib/domain/types";
import styles from "./ReachLine.module.css";

/**
 * How the client asked to be reached, for the desk: the channel to start with
 * (their preference, or the proven one), each channel with its proof, and
 * whether statements go by e-mail. One line under the identity, on the
 * client file and on an intention.
 */
const REACH_LABEL = { whatsapp: "WhatsApp d'abord", email: "E-mail d'abord", call: "Un appel d'abord" } as const;

export function ReachLine({ prefs, channels, t }: { prefs?: ClientPrefs; channels?: ChannelStatus; t: (s: string) => string }) {
  if (!prefs && !channels) return null;
  const reach = prefs?.reach ?? (channels?.phoneVerifiedAt ? "whatsapp" : channels?.email ? "email" : undefined);
  const proof = (ok?: string, has?: string) => (ok ? t("prouvé") : has ? t("à prouver") : t("absent"));
  return (
    <div className={styles.line}>
      {reach && (
        <span className={`${styles.pill} ${styles.first}`} title={prefs?.reach ? t("choisi par le client") : t("déduit du canal prouvé")}>
          {t(REACH_LABEL[reach])}
          {prefs?.reach ? "" : " · " + t("par défaut")}
        </span>
      )}
      {channels && (
        <>
          <span className={`${styles.pill} ${channels.phoneVerifiedAt ? styles.ok : ""}`}>WhatsApp · {proof(channels.phoneVerifiedAt, channels.phone)}</span>
          <span className={`${styles.pill} ${channels.emailVerifiedAt ? styles.ok : ""}`}>{t("E-mail")} · {proof(channels.emailVerifiedAt, channels.email)}</span>
        </>
      )}
      {prefs && <span className={styles.pill}>{t(prefs.statementsByEmail === false ? "relevés : dans Mes documents seulement" : "relevés par e-mail")}</span>}
    </div>
  );
}
