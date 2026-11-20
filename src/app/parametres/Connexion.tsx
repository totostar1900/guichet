"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { platformAuthenticatorIsAvailable, startRegistration } from "@simplewebauthn/browser";
import { useT } from "@/i18n/client";
import { Interrupteur } from "@/components/Interrupteur";
import { ClavierCode } from "@/components/ClavierCode";
import { clearDevice, codeDeCetAppareil, deviceLabel, enregistrerLaCle, enregistrerLeCode, newDeviceToken, readDevice } from "@/lib/device-client";
import { beginPasskey, enrolPin, finishPasskey, forgetDeviceAction } from "@/app/moi/securite/actions";
import { logout } from "@/app/connexion/actions";
import { verifierLeCode } from "@/app/verrou/actions";
import feuillet from "@/components/Feuillet.module.css";
import styles from "@/app/moi/appareil/page.module.css";

const noop = () => () => {};
const snapshot = () => {
  try {
    return localStorage.getItem("guichet_device") ?? "";
  } catch {
    return "";
  }
};

/**
 * COMMENT ON OUVRE GUICHET : UN INTERRUPTEUR ET UNE LIGNE (19 novembre 2026, planche « Paramètres et connexion », 2A).
 *
 * « Face ID ou empreinte » est un interrupteur : allumé, il enregistre la clé de CET appareil (le téléphone demande son geste), et la prochaine ouverture de Guichet l'offre tout de suite. Éteint, la clé de cet appareil est retirée. Le code, lui, ne s'éteint pas (« tout compte doit avoir au moins un code ») : il se modifie, sur sa page.
 *
 * La ligne n'est montrée que si l'appareil sait faire : sans capteur ni verrou d'écran, un interrupteur qui ne peut rien allumer est une promesse en trop.
 */
export function Connexion({ who, aUnCode }: { who: string; aUnCode: boolean }) {
  const t = useT();
  const raw = useSyncExternalStore(noop, snapshot, () => "");
  const ici = raw ? readDevice() : null;
  const [actif, setActif] = useState<boolean | null>(null);
  const [possible, setPossible] = useState(false);
  const [message, setMessage] = useState<{ erreur?: string; ok?: string } | null>(null);
  const [occupe, start] = useTransition();

  useEffect(() => {
    platformAuthenticatorIsAvailable().then(setPossible, () => setPossible(false));
  }, []);
  const allume = actif ?? ici?.kind === "passkey";

  const [demande, setDemande] = useState(false);
  const [erreurCode, setErreurCode] = useState<string | null>(null);

  const retirer = () =>
    start(async () => {
      setMessage(null);
      if (ici?.kind === "passkey") await forgetDeviceAction(ici.id);
      /* Le code de ce navigateur, s'il y en a un, redevient la méthode : on ne laisse pas l'appareil sans rien. */
      const code = codeDeCetAppareil(ici);
      if (ici && code) enregistrerLeCode({ ...code, who: ici.who, name: ici.name, since: ici.since });
      else clearDevice();
      setActif(false);
      setMessage({ ok: "Face ID retiré de cet appareil : le code à six chiffres ouvre Guichet." });
    });
  /* ALLUMER DEMANDE LE CODE : il prouve que c'est le client, et il devient aussi le code de CE navigateur, la réponse quand le geste est annulé. */
  const allumer = (c: string) =>
    start(async () => {
      setErreurCode(null);
      const v = await verifierLeCode(c);
      if (!v.ok) {
        setErreurCode(v.error);
        if (v.bloque) await logout();
        return;
      }
      try {
        if (!codeDeCetAppareil(readDevice())) {
          const token = newDeviceToken();
          const e = await enrolPin(token, c, deviceLabel());
          if (e.ok) enregistrerLeCode({ id: e.device.id, token, who, name: e.device.name, since: e.device.createdAt });
        }
        const options = await beginPasskey();
        const reponse = await startRegistration({ optionsJSON: options });
        const r = await finishPasskey(reponse, deviceLabel());
        if (!r.ok) {
          setDemande(false);
          return setMessage({ erreur: r.error });
        }
        enregistrerLaCle({ id: r.device.id, who, name: r.device.name, since: r.device.createdAt });
        setActif(true);
        setDemande(false);
        setMessage({ ok: "Face ID activé : la prochaine fois, Guichet vous le proposera tout de suite." });
      } catch (e) {
        const nom = (e as Error).name;
        setDemande(false);
        setMessage({ erreur: nom === "NotAllowedError" ? "Annulé." : nom === "InvalidStateError" ? "Cet appareil est déjà enregistré." : `Impossible : ${(e as Error).message}` });
      }
    });
  const changer = (v: boolean) => {
    setMessage(null);
    if (v) {
      setErreurCode(null);
      setDemande(true);
    } else retirer();
  };

  return (
    <section className={feuillet.bloc}>
      <h2>{t("Connexion")}</h2>
      <div>
        {possible ? (
          <div className={styles.reglage}>
            <span>
              <b>{t("Face ID ou empreinte")}</b>
              <small>{t("Guichet s'ouvre d'un geste sur cet appareil, sans taper de code.")}</small>
            </span>
            <Interrupteur actif={Boolean(allume) || demande} occupe={occupe || !aUnCode} label={t("Face ID ou empreinte")} onChange={changer} />
          </div>
        ) : null}
        <div className={styles.reglage}>
          <span>
            <b>{t("Code de connexion")}</b>
            <small>{t(aUnCode ? "Six chiffres, les mêmes sur tous vos appareils." : "Pas encore défini : Guichet vous le demandera à la prochaine ouverture.")}</small>
          </span>
          {aUnCode ? (
            <Link href="/parametres/code" className="btn sm">
              {t("Modifier")}
            </Link>
          ) : null}
        </div>
        {demande && (
          <div className={styles.reglage + " " + styles.colonne}>
            <span>
              <b>{t("Saisissez votre code")}</b>
              <small>{t("Pour activer Face ID ou l'empreinte sur cet appareil.")}</small>
            </span>
            <ClavierCode onFini={allumer} occupe={occupe} cle="allumer" erreur={erreurCode ? <small className={feuillet.err}>{t(erreurCode)}</small> : null} />
            <button type="button" className="btn sm ghost" onClick={() => setDemande(false)}>
              {t("Annuler")}
            </button>
          </div>
        )}
        {message?.erreur && <small className={feuillet.err}>{t(message.erreur)}</small>}
        {message?.ok && <small className={styles.note}>{t(message.ok)}</small>}
      </div>
    </section>
  );
}
