"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
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
  // Le champ se vidait apres un refus, la main ne revenait pas : on retapait a
  // l aveugle dans un champ qui n avait plus le curseur.
  const champ = useRef<HTMLInputElement>(null);
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
        /* Un appareil reconnu désigne sa propre clé : le téléphone passe directement à Face ID ou à l'empreinte, sans sélecteur de comptes. */
        const options = await passkeyOptions(device?.kind === "passkey" ? device.id : undefined);
        const response = await startAuthentication({ optionsJSON: options });
        const r = await passkeyLogin(response);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        arrive();
      } catch (e) {
        const name = (e as Error).name;
        setError(name === "NotAllowedError" ? "Annulé, ou l'appareil ne vous a pas reconnu : réessayez, ou entrez le code par e-mail." : `Clé indisponible : ${(e as Error).message}`);
      }
    });

  const openWithPin = (value: string) =>
    start(async () => {
      if (!device || device.kind !== "pin" || !device.token) return;
      setError(null);
      const r = await pinLogin(device.id, device.token, value);
      if (!r.ok) {
        setPin("");
        champ.current?.focus();
        setError(r.error);
        if (r.forgotten) {
          clearDevice();
          setHidden(true);
        }
        return;
      }
      arrive();
    });

  const icone = (
    <svg className={styles.bioIcone} viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </svg>
  );

  /* LA BIOMÉTRIE, EN BAS DE LA PAGE, À LA MANIÈRE DE L'IMAGE DU CLIENT (18 novembre 2026) : une grande icône d'empreinte, un titre, une phrase, un bouton à bouts ronds. Pas de « Bonjour » ni de nom (un écran qu'on ouvre devant d'autres personnes n'écrit pas son nom), pas de « Pas vous ? » : le lien ou le code par e-mail est juste au-dessus. */
  const bloc = (phrase: string, bouton: string, inconnu: boolean) => (
    <div className={styles.bioBloc} aria-live="polite">
      {icone}
      <h2>{t("Connexion biométrique")}</h2>
      <p>{t(phrase)}</p>
      <button type="button" className={styles.bioBouton} onClick={openWithPasskey} disabled={pending || done}>
        {t(pending ? "Vérification…" : bouton)}
      </button>
      {error && <div className={styles.error}>{error}</div>}
      {!inconnu && (
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
      )}
    </div>
  );

  // No device remembered here: a way in for a passkey this phone already holds (or one synced from another device).
  if (!device || hidden) {
    if (!raw && webauthn && !hidden) return bloc("Si cet appareil a déjà une clé d'accès, utilisez-la.", "Utiliser la clé d'accès de cet appareil", true);
    return null;
  }

  if (device.kind === "passkey") return bloc("Cet appareil est reconnu : un geste suffit.", "Ouvrir avec Face ID, empreinte ou code de l'appareil", false);

  return (
    <div className={styles.bioBloc} aria-live="polite">
      <h2>{t("Votre code à 4 chiffres")}</h2>
      <label className={styles.pinField}>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          ref={champ}
          disabled={pending || done}
          aria-label={t("Code à 4 chiffres")}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            setPin(v);
            if (v.length === 4) openWithPin(v);
          }}
        />
      </label>
      {error && <div className={styles.error}>{error}</div>}
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
  );
}
