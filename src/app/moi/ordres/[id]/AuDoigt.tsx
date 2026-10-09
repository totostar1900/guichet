"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { useT } from "@/i18n/client";
import { clearDevice, readDevice } from "@/lib/device-client";
import { optionsDeClefAction, signerAvecLaClefAction, signerAvecLeCodeDeLAppareilAction, type OrdreResult } from "./actions";
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
 * SIGNER AU DOIGT, SUR L'APPAREIL QU'ON A DÉJÀ RECONNU.
 *
 * Un ordre couvert par la provision n'a plus rien à attendre : l'argent est
 * là, le plafond est signé, et il restait un code à aller chercher dans une
 * boîte aux lettres. Trois gestes et deux écrans pour une opération déjà
 * payée, c'est la friction que ce lot enlève.
 *
 * L'APPAREIL N'EST CONNU QUE DU NAVIGATEUR, et le serveur l'ignore : le rendu
 * côté serveur dit donc « rien », et la première peinture du client aussi. Le
 * bloc paraît ensuite, sans faire mentir le HTML du serveur. C'est la leçon
 * de l'écran de connexion, qui porte le même détour.
 *
 * LE CODE REÇU RESTE, toujours, en dessous : pour l'appareil qu'on n'a pas
 * enregistré, pour celui qui préfère, et pour le jour où la clef est refusée.
 */
export function AuDoigt({ id, couvert }: { id: string; couvert: boolean }) {
  const t = useT();
  const raw = useSyncExternalStore(noop, snapshot, () => "");
  const device = raw ? readDevice() : null;
  const webauthn = useSyncExternalStore(noop, browserSupportsWebAuthn, () => false);
  const [pin, setPin] = useState("");
  const champ = useRef<HTMLInputElement>(null);
  const [res, setRes] = useState<OrdreResult | null>(null);
  const [pending, start] = useTransition();
  const [cache, setCache] = useState(false);

  const fini = (r: OrdreResult) => {
    setRes(r);
    if (r.ok) window.location.reload();
  };

  const parLaClef = () =>
    start(async () => {
      setRes(null);
      try {
        const options = await optionsDeClefAction();
        const response = await startAuthentication({ optionsJSON: options as Parameters<typeof startAuthentication>[0]["optionsJSON"] });
        fini(await signerAvecLaClefAction(id, response));
      } catch (e) {
        const name = (e as Error).name;
        setRes({
          ok: false,
          error: name === "NotAllowedError" ? t("Annulé, ou l'appareil n'a pas reconnu le doigt. Réessayez, ou signez avec un code reçu.") : t("Clé indisponible : {m}", { m: (e as Error).message }),
        });
      }
    });

  const parLeCode = (valeur: string) =>
    start(async () => {
      if (!device || device.kind !== "pin" || !device.token) return;
      setRes(null);
      const r = await signerAvecLeCodeDeLAppareilAction(id, device.id, device.token, valeur);
      if (!r.ok) {
        setPin("");
        champ.current?.focus();
        setRes(r);
        /* Cinq codes faux et l'appareil est oublié : il faut retirer ce bloc,
           sinon il invite à un geste qui ne peut plus aboutir. */
        if (/oublié/.test(r.error)) {
          clearDevice();
          setCache(true);
        }
        return;
      }
      fini(r);
    });

  if (cache) return null;

  /* Aucun appareil retenu ici, mais un navigateur qui sait faire : on propose
     discrètement la clef synchronisée depuis un autre téléphone. */
  if (!device) {
    if (!raw && webauthn)
      return (
        <p className={styles.auDoigtFin}>
          <button type="button" className={styles.lien} onClick={parLaClef} disabled={pending}>
            {pending ? t("Vérification…") : t("Signer avec ma clé d'accès")}
          </button>
          {res && !res.ok && <span className={styles.err}>{res.error}</span>}
        </p>
      );
    return null;
  }

  return (
    <div className={styles.auDoigt} aria-live="polite">
      <div className={styles.auDoigtTete}>
        <b>{couvert ? t("Signer, et c'est tout") : t("Signer sans attendre un code")}</b>
        <span className="muted">{device.name}</span>
      </div>
      {couvert && <p className={styles.auDoigtNote}>{t("Cet ordre est couvert par votre provision : une fois signé, il n'y a rien à virer.")}</p>}
      {device.kind === "passkey" ? (
        <button type="button" className="btn primary" onClick={parLaClef} disabled={pending}>
          {pending ? t("Vérification…") : t("Signer avec Face ID, empreinte ou code du téléphone")}
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
            ref={champ}
            disabled={pending}
            aria-label={t("Code à 4 chiffres")}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setPin(v);
              if (v.length === 4) parLeCode(v);
            }}
          />
        </label>
      )}
      {res && !res.ok && <div className={styles.err}>{res.error}</div>}
      <p className={styles.auDoigtFin}>{t("Ou signez avec un code reçu, ci-dessous.")}</p>
    </div>
  );
}
