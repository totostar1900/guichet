"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { useT } from "@/i18n/client";
import { clearDevice, readDevice } from "@/lib/device-client";
import { passkeyLogin, passkeyOptions, pinLogin } from "./actions";
import styles from "./page.module.css";

const noop = () => () => {};
const snapshot = () => {
  try {
    return localStorage.getItem("guichet_device") ?? "";
  } catch {
    return "";
  }
};

/**
 * The fast way back, ahead of the code: a known device opens with the phone's
 * lock (passkey) or with its four digits. Anything else, or « pas vous ? »,
 * falls through to the code by e-mail below.
 */
export function DeviceSignIn({ next }: { next: string }) {
  const t = useT();
  const raw = useSyncExternalStore(noop, snapshot, () => "");
  const device = raw ? readDevice() : null;
  const [hidden, setHidden] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  // Known only in the browser; the server snapshot says no, so the markup matches on both sides.
  const webauthn = useSyncExternalStore(noop, browserSupportsWebAuthn, () => false);

  const arrive = () => {
    setDone(true);
    window.location.assign(next.startsWith("/") ? next : "/");
  };

  const openWithPasskey = () =>
    start(async () => {
      setError(null);
      try {
        const options = await passkeyOptions();
        const response = await startAuthentication({ optionsJSON: options });
        const r = await passkeyLogin(response);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        arrive();
      } catch (e) {
        const name = (e as Error).name;
        setError(name === "NotAllowedError" ? "Annulé, ou le téléphone n'a pas reconnu le doigt : réessayez, ou entrez le code par e-mail." : `Clé indisponible : ${(e as Error).message}`);
      }
    });

  const openWithPin = (value: string) =>
    start(async () => {
      if (!device || device.kind !== "pin" || !device.token) return;
      setError(null);
      const r = await pinLogin(device.id, device.token, value);
      if (!r.ok) {
        setPin("");
        setError(r.error);
        if (r.forgotten) {
          clearDevice();
          setHidden(true);
        }
        return;
      }
      arrive();
    });

  // No device remembered here: a discreet way in for a passkey synced from another device.
  if (!device || hidden) {
    if (!raw && webauthn && !hidden) {
      return (
        <p className={styles.passkeyHint}>
          <button type="button" className={styles.linkBtn} onClick={openWithPasskey} disabled={pending}>
            {t(pending ? "Vérification…" : "Déjà une clé d'accès sur ce téléphone ? L'utiliser")}
          </button>
          {error && <span className={styles.error}>{error}</span>}
        </p>
      );
    }
    return null;
  }

  return (
    <div className={styles.device} aria-live="polite">
      <div className={styles.deviceHead}>
        <b>{t("Bonjour {name}", { name: device.who })}</b>
        <span className="muted">{device.name}</span>
      </div>
      {device.kind === "passkey" ? (
        <button type="button" className="btn primary" onClick={openWithPasskey} disabled={pending || done}>
          {t(pending ? "Vérification…" : "Ouvrir avec Face ID, empreinte ou code du téléphone")}
        </button>
      ) : (
        <label className={styles.pinField}>
          <span>{t("Votre code à 4 chiffres")}</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            autoFocus
            disabled={pending || done}
            aria-label={t("Code à 4 chiffres")}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setPin(v);
              if (v.length === 4) openWithPin(v);
            }}
          />
        </label>
      )}
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.deviceFoot}>
        <button type="button" className={styles.linkBtn} onClick={() => setHidden(true)}>
          {t("Pas vous, ou plutôt le code par e-mail ?")}
        </button>
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => {
            clearDevice();
            setHidden(true);
          }}
        >
          {t("Oublier cet appareil ici")}
        </button>
      </div>
    </div>
  );
}
