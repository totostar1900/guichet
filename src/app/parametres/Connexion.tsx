"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { platformAuthenticatorIsAvailable, startRegistration } from "@simplewebauthn/browser";
import { useT } from "@/i18n/client";
import { Interrupteur } from "@/components/Interrupteur";
import { clearDevice, deviceLabel, readDevice, saveDevice } from "@/lib/device-client";
import { beginPasskey, finishPasskey, forgetDeviceAction } from "@/app/moi/securite/actions";
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

  const changer = (v: boolean) =>
    start(async () => {
      setMessage(null);
      if (!v) {
        if (ici?.kind === "passkey") await forgetDeviceAction(ici.id);
        clearDevice();
        setActif(false);
        setMessage({ ok: "Face ID retiré de cet appareil : à la prochaine connexion, un code vous sera envoyé." });
        return;
      }
      try {
        const options = await beginPasskey();
        const reponse = await startRegistration({ optionsJSON: options });
        const r = await finishPasskey(reponse, deviceLabel());
        if (!r.ok) return setMessage({ erreur: r.error });
        saveDevice({ id: r.device.id, kind: "passkey", who, name: r.device.name, since: r.device.createdAt });
        setActif(true);
        setMessage({ ok: "Face ID activé : la prochaine fois, Guichet vous le proposera tout de suite." });
      } catch (e) {
        const nom = (e as Error).name;
        setMessage({ erreur: nom === "NotAllowedError" ? "Annulé." : nom === "InvalidStateError" ? "Cet appareil est déjà enregistré." : `Impossible : ${(e as Error).message}` });
      }
    });

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
            <Interrupteur actif={Boolean(allume)} occupe={occupe} label={t("Face ID ou empreinte")} onChange={changer} />
          </div>
        ) : null}
        <div className={styles.reglage}>
          <span>
            <b>{t("Code de connexion")}</b>
            <small>{t(aUnCode ? "Quatre chiffres, les mêmes sur tous vos appareils." : "Pas encore défini : Guichet vous le demandera à la prochaine ouverture.")}</small>
          </span>
          {aUnCode ? (
            <Link href="/parametres/code" className="btn sm">
              {t("Modifier")}
            </Link>
          ) : null}
        </div>
        {message?.erreur && <small className={feuillet.err}>{t(message.erreur)}</small>}
        {message?.ok && <small className={styles.note}>{t(message.ok)}</small>}
      </div>
    </section>
  );
}
