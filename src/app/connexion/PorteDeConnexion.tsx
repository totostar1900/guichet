"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { useT } from "@/i18n/client";
import { ClavierCode } from "@/components/ClavierCode";
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
 * LA PORTE : DÉVERROUILLER D'ABORD, L'E-MAIL EN SECOURS (19 novembre 2026, planche « Compte, connexion et textes », 2A).
 *
 * Le client : « la connexion se fait soit avec un code, soit avec l'empreinte, soit avec Face ID, mais plus avec l'e-mail ou le numéro ». Sur un appareil reconnu, l'écran n'offre que le déverrouillage : Face ID ou l'empreinte (un bouton sur l'écran), ou le code à quatre chiffres au clavier de l'écran. L'adresse e-mail ne paraît qu'à « Code oublié ou autre appareil » ; un appareil inconnu passe par le code reçu, puis fixe son propre code (voir `/connexion/creer`).
 *
 * L'état de l'appareil n'est connu que du navigateur : avant l'hydratation rien n'est montré, pour ne pas faire clignoter le formulaire e-mail sous un appareil reconnu.
 */
export function PorteDeConnexion({ next, enTete, children }: { next: string; /** le titre et la phrase de la vue « Se connecter » */ enTete: React.ReactNode; /** l'adresse e-mail et ce qui l'accompagne */ children: React.ReactNode }) {
  const t = useT();
  const raw = useSyncExternalStore(noop, snapshot, () => "");
  const pret = useSyncExternalStore(noop, () => true, () => false);
  const device = raw ? readDevice() : null;
  const [autre, setAutre] = useState(false);
  const [oublie, setOublie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, start] = useTransition();
  const [fini, setFini] = useState(false);

  const arriver = () => {
    setFini(true);
    window.location.assign(next.startsWith("/") ? next : "/");
  };
  const oublier = () => {
    clearDevice();
    setOublie(true);
  };
  const ouvrirParLaCle = () =>
    start(async () => {
      setErreur(null);
      try {
        const options = await passkeyOptions(device?.kind === "passkey" ? device.id : undefined);
        const reponse = await startAuthentication({ optionsJSON: options });
        const r = await passkeyLogin(reponse);
        if (!r.ok) return setErreur(r.error);
        arriver();
      } catch (e) {
        const nom = (e as Error).name;
        setErreur(nom === "NotAllowedError" ? "Annulé, ou l'appareil ne vous a pas reconnu : réessayez, ou recevez un code." : `Clé indisponible : ${(e as Error).message}`);
      }
    });
  const ouvrirParLeCode = (code: string) =>
    start(async () => {
      if (!device || device.kind !== "pin" || !device.token) return;
      setErreur(null);
      const r = await pinLogin(device.id, device.token, code);
      if (!r.ok) {
        setErreur(r.error);
        if (r.forgotten) oublier();
        return;
      }
      arriver();
    });

  if (!pret) return <div className={styles.masque}>{enTete}{children}</div>;

  const deverrouille = device && !autre && !oublie;
  if (!deverrouille) {
    return (
      <>
        {enTete}
        {children}
        {device && !oublie && (
          <button type="button" className={styles.linkBtn} onClick={() => setAutre(false)}>
            {t("Retour au déverrouillage")}
          </button>
        )}
      </>
    );
  }

  return (
    <div className={styles.deverrouillage} aria-live="polite">
      <h1 className="display">{t("Déverrouillez Guichet")}</h1>
      {device.kind === "passkey" ? (
        <>
          <svg className={styles.bioIcone} viewBox="0 0 24 24" width="72" height="72" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
            <path d="M2 12a10 10 0 0 1 18-6" />
            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
            <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
          </svg>
          <p>{t("Cet appareil est reconnu : un geste suffit.")}</p>
          {erreur && <div className={styles.error}>{t(erreur)}</div>}
          <button type="button" className={styles.deverrouiller} onClick={ouvrirParLaCle} disabled={enCours || fini}>
            {t(enCours ? "Vérification…" : "Ouvrir avec Face ID, empreinte ou code de l'appareil")}
          </button>
        </>
      ) : (
        <ClavierCode onFini={ouvrirParLeCode} occupe={enCours || fini} cle="pin" erreur={erreur ? <div className={styles.error}>{t(erreur)}</div> : null} />
      )}
      <p className={styles.secours}>
        {t("Code oublié ou autre appareil ?")}{" "}
        <button type="button" className={styles.linkBtn} onClick={() => setAutre(true)}>
          {t("Recevoir un code")}
        </button>
      </p>
      <button type="button" className={styles.linkBtn} onClick={oublier}>
        {t("Oublier cet appareil ici")}
      </button>
    </div>
  );
}
