"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { useT } from "@/i18n/client";
import { EcranDeCode } from "@/components/EcranDeCode";
import { clearDevice, codeDeCetAppareil, codeOublie, marquerCodeOublie, readDevice } from "@/lib/device-client";
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
 * LA PORTE : L'ÉCRAN DE CODE, L'EMPREINTE D'ABORD POUR QUI L'A CHOISIE (19 novembre 2026, « coller à Revolut »).
 *
 * Sur un appareil reconnu, l'écran n'est qu'un mot de bienvenue avec le prénom, six ronds et le clavier (`EcranDeCode`). Quand le client a choisi Face ID ou l'empreinte, le téléphone la demande tout de suite, PAR-DESSUS ce clavier : annulée, elle laisse le clavier, déjà là, et la touche d'empreinte en bas à gauche la rappelle. « Code oublié ? » est le seul lien : le code reçu par e-mail, puis un nouveau code.
 *
 * Le code qui répond ici est celui de CE navigateur (identifiant et jeton gardés avec la clé) : il n'ouvre rien ailleurs. Un appareil qui n'a que la clé, sans code (enregistré avant ce changement), garde « Toucher pour réessayer » et « Code oublié ? ».
 *
 * L'état de l'appareil n'est connu que du navigateur : avant l'hydratation rien n'est montré, pour ne pas faire clignoter le formulaire e-mail sous un appareil reconnu.
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
  /* La clé n'est pas une transition : un geste en attente (ou un navigateur qui ne répond pas) ne doit jamais verrouiller le clavier. */
  const ouvrirParLaCle = async () => {
      setErreur(null);
      try {
        const options = await passkeyOptions(device?.kind === "passkey" ? device.id : undefined);
        const reponse = await startAuthentication({ optionsJSON: options });
        const r = await passkeyLogin(reponse);
        if (!r.ok) return setErreur(r.error);
        arriver();
      } catch (e) {
        /* UN GESTE ANNULÉ NE SE DIT PAS : le clavier est là, c'est la réponse. Le reste (clé inconnue, panne) se dit. */
        const nom = (e as Error).name;
        if (nom !== "NotAllowedError" && nom !== "AbortError") setErreur(`Clé indisponible : ${(e as Error).message}`);
      }
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

  /* L'EMPREINTE SE PROPOSE D'ELLE-MÊME : l'écran vient de dire « connexion requise ». Une fois par ouverture. Certains navigateurs (Safari sur iPhone) exigent un toucher : l'essai échoue sans bruit et la touche d'empreinte prend le relais. */
  const proposee = useRef(false);
  const auto = pret && device?.kind === "passkey" && !autre && !oublie;
  useEffect(() => {
    if (!auto || proposee.current) return;
    /* Le drapeau se pose à l'échéance : le mode strict de React remonte l'effet. */
    const id = setTimeout(() => {
      proposee.current = true;
      ouvrirParLaCle();
    }, 150);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  if (!pret) return <div className={styles.masque}>{enTete}{children}</div>;

  const deverrouille = device && !autre && !oublie;
  if (!deverrouille) {
    return (
      <>
        {enTete}
        {children}
        {device && !oublie && (
          <button type="button" className={styles.linkBtn} onClick={() => setAutre(false)}>
            {t("Retour au code")}
          </button>
        )}
      </>
    );
  }

  /* Un appareil enregistré avant le prénom portait l'adresse e-mail : on ne salue pas une adresse. */
  const prenom = device.who.includes("@") ? undefined : device.who.trim().split(/\s+/)[0] || undefined;
  if (!code) {
    /* Un appareil qui n'a que la clé : pas de clavier à offrir. */
    return (
      <div className={styles.deverrouillage} aria-live="polite">
        <h1 className="display">{prenom ? t("Bonjour {prenom}", { prenom }) : t("Bonjour")}</h1>
        {erreur && <div className={styles.error}>{t(erreur)}</div>}
        <button type="button" className={styles.deverrouiller} onClick={ouvrirParLaCle} disabled={enCours || fini}>
          {t(enCours ? "Vérification…" : "Toucher pour réessayer")}
        </button>
        <button type="button" className={styles.linkBtn} onClick={codeOublieClic}>
          {t("Code oublié ?")}
        </button>
      </div>
    );
  }
  return (
    <div className={styles.deverrouillage}>
      <EcranDeCode prenom={prenom} onFini={ouvrirParLeCode} occupe={enCours || fini} cle="pin" erreur={erreur} empreinte={device.kind === "passkey" ? ouvrirParLaCle : undefined} onOubli={codeOublieClic} />
    </div>
  );
}
