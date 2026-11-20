"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useT } from "@/i18n/client";
import { EcranDeCode } from "@/components/EcranDeCode";
import { LogoDAttente } from "@/components/LogoDAttente";
import { clearDevice, codeDeCetAppareil, codeOublie, marquerCodeOublie, readDevice } from "@/lib/device-client";
import { pinLogin } from "./actions";
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
 * LA PORTE : L'ÉCRAN DE CODE, ET LE CODE SEUL (20 novembre 2026, « le password de l'écran ne devrait pas pouvoir ouvrir l'application »).
 *
 * Sur un appareil reconnu, l'écran n'est qu'un mot de bienvenue avec le prénom, six ronds et le clavier (`EcranDeCode`). « Code oublié ? » est le seul lien : le code reçu par e-mail, puis un nouveau code. L'empreinte n'y est plus : le navigateur l'accorde aussi au code d'écran du téléphone (voir `connexion/actions.ts`).
 *
 * Le code qui répond ici est celui de CE navigateur (identifiant et jeton gardés avec lui) : il n'ouvre rien ailleurs. Un appareil enregistré avant ce changement, qui n'avait que la clé, n'a plus de code ici : il passe par l'adresse e-mail.
 *
 * L'état de l'appareil n'est connu que du navigateur : avant l'hydratation, le G se trace (rendu par le serveur) au lieu d'un écran vide, et rien d'autre ne se montre, pour ne pas faire clignoter le formulaire e-mail sous un appareil reconnu.
 */
export function PorteDeConnexion({ next, enTete, children }: { next: string; /** le titre et la phrase de la vue « Se connecter » */ enTete: React.ReactNode; /** l'adresse e-mail et ce qui l'accompagne */ children: React.ReactNode }) {
  const t = useT();
  const raw = useSyncExternalStore(noop, snapshot, () => "");
  const pret = useSyncExternalStore(noop, () => true, () => false);
  const device = raw ? readDevice() : null;
  const code = codeDeCetAppareil(device);
  /* « Code oublié ? » posé avant un détour : la porte va droit au code reçu. */
  const [autre, setAutre] = useState(() => typeof window !== "undefined" && codeOublie());
  const [oublie, setOublie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, start] = useTransition();
  const [fini, setFini] = useState(false);

  const arriver = () => {
    setFini(true);
    window.location.assign(next.startsWith("/") ? next : "/");
  };
  const ouvrirParLeCode = (c: string) =>
    start(async () => {
      if (!code) return;
      setErreur(null);
      const r = await pinLogin(code.id, code.token, c);
      if (!r.ok) {
        setErreur(r.error);
        if (r.forgotten) {
          clearDevice();
          setOublie(true);
        }
        return;
      }
      arriver();
    });
  const codeOublieClic = () => {
    marquerCodeOublie();
    setAutre(true);
  };

  if (!pret)
    return (
      <>
        <div className={styles.attente} role="status" aria-label={t("Ouverture")}>
          <LogoDAttente />
          <span>{t("Ouverture…")}</span>
        </div>
        <div className={styles.masque}>
          {enTete}
          {children}
        </div>
      </>
    );

  const deverrouille = device && code && !autre && !oublie;
  if (!deverrouille) {
    return (
      <>
        {enTete}
        {children}
        {device && code && !oublie && (
          <button type="button" className={styles.linkBtn} onClick={() => setAutre(false)}>
            {t("Retour au code")}
          </button>
        )}
      </>
    );
  }

  /* Un appareil enregistré avant le prénom portait l'adresse e-mail : on ne salue pas une adresse. */
  const prenom = device.who.includes("@") ? undefined : device.who.trim().split(/\s+/)[0] || undefined;
  return (
    <div className={styles.deverrouillage}>
      <EcranDeCode prenom={prenom} onFini={ouvrirParLeCode} occupe={enCours || fini} cle="pin" erreur={erreur} onOubli={codeOublieClic} />
    </div>
  );
}
