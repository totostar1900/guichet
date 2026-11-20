"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { prefsAction } from "@/app/moi/actions";
import type { ClientPrefs } from "@/lib/domain/types";
import { PushToggle } from "@/components/PushToggle";
import { consentAction } from "@/app/moi/actions";
import { Interrupteur } from "@/components/Interrupteur";
import feuillet from "@/components/Feuillet.module.css";
import styles from "./page.module.css";

/**
 * CE QUI VOUS NOTIFIE, EN INTERRUPTEURS (19 novembre 2026, planche « Paramètres et connexion », 2A).
 *
 * Les alertes, les informations par WhatsApp, les informations par e-mail et les relevés par e-mail sont quatre interrupteurs : on dit oui ou non du même doigt, et chacun s'enregistre à l'instant. « Apparence et langue » n'est plus ici : la palette et la langue se changent dans le menu du coin.
 *
 * Les alertes appartiennent à CET appareil (l'abonnement vit dans ce navigateur) ; le reste appartient au COMPTE. Les messages liés aux ordres arrivent toujours : ils découlent de ce que le client a demandé.
 *
 * UN RÉGLAGE QUI ÉCHOUE REVIENT EN ARRIÈRE : l'état nouveau se montre tout de suite (un interrupteur qui attend le serveur paraît cassé), l'écriture refusée remet l'ancien et dit pourquoi.
 */
export function Appareil({ prefs: initial, phoneOk, vapidKey, whatsapp, emailOptIn, hasPhone, hasEmail }: { prefs?: ClientPrefs; phoneOk?: boolean; vapidKey?: string; whatsapp: boolean; emailOptIn: boolean; hasPhone: boolean; hasEmail: boolean }) {
  const t = useT();
  const [prefs, setPrefs] = useState<ClientPrefs>(initial ?? {});
  const [consent, setConsent] = useState({ whatsapp, email: emailOptIn });
  const [err, setErr] = useState("");
  const [saving, startSave] = useTransition();

  const setPref = (patch: ClientPrefs) => {
    const avant = prefs;
    setPrefs({ ...prefs, ...patch });
    setErr("");
    startSave(async () => {
      const r = await prefsAction(patch);
      if (!r.ok) {
        setPrefs(avant);
        setErr(r.error);
      }
    });
  };
  const setConsentement = (canal: "whatsapp" | "email", on: boolean) => {
    setConsent((c) => ({ ...c, [canal]: on }));
    setErr("");
    startSave(async () => {
      const r = await consentAction(canal, on);
      if (!r.ok) {
        setConsent((c) => ({ ...c, [canal]: !on }));
        setErr(r.error);
      }
    });
  };

  /* Le canal par défaut suit la preuve : sans numéro prouvé, commencer par WhatsApp promettrait un message qui ne part pas. */
  const reach = prefs.reach ?? (phoneOk ? "whatsapp" : "email");
  const releves = prefs.statementsByEmail !== false;

  return (
    <section className={feuillet.bloc}>
      <h2>{t("Notifications")}</h2>
      <div>
        {/* SANS CLEF, PAS D'ALERTES, et la ligne ne paraît pas : un interrupteur qui ne peut rien allumer est une promesse en trop. */}
        {vapidKey ? (
          <div className={styles.reglage}>
            <span>
              <b>{t("Alertes")}</b>
              <small>{t("Un bulletin à signer, une réponse du desk, une échéance : l'alerte part sur cet appareil-ci et sur aucun autre.")}</small>
            </span>
            <PushToggle vapidKey={vapidKey} compact interrupteur />
          </div>
        ) : null}
        <div className={styles.reglage}>
          <span>
            <b>{t("Informations · WhatsApp")}</b>
            <small>{hasPhone ? t("Nos informations et opportunités, sur WhatsApp.") : t("Ajoutez un numéro dans Profil et coordonnées.")}</small>
          </span>
          <Interrupteur actif={consent.whatsapp} label={t("Informations · WhatsApp")} occupe={saving || !hasPhone} onChange={(v) => setConsentement("whatsapp", v)} />
        </div>
        <div className={styles.reglage}>
          <span>
            <b>{t("Informations · e-mail")}</b>
            <small>{hasEmail ? t("Nos informations et opportunités, par e-mail.") : t("Ajoutez une adresse dans Profil et coordonnées.")}</small>
          </span>
          <Interrupteur actif={consent.email} label={t("Informations · e-mail")} occupe={saving || !hasEmail} onChange={(v) => setConsentement("email", v)} />
        </div>
        <div className={styles.reglage}>
          <span>
            <b>{t("Relevés par e-mail")}</b>
            <small>{t("Chaque relevé, dès qu'il est produit ; ils restent dans Mes documents.")}</small>
          </span>
          <Interrupteur actif={releves} label={t("Relevés par e-mail")} occupe={saving} onChange={(v) => setPref({ statementsByEmail: v })} />
        </div>
        <div className={`${styles.reglage} ${styles.colonne}`}>
          <span>
            <b>{t("Comment vous joindre d'abord")}</b>
            <small>{t("Le conseiller commence par là ; les accusés de réception vont sur les deux canaux.")}</small>
          </span>
          <div className={styles.seg} role="group" aria-label={t("Comment vous joindre d'abord")}>
            {(["whatsapp", "email", "call"] as const).map((k) => (
              <button key={k} type="button" className={reach === k ? styles.segOn : ""} aria-pressed={reach === k} disabled={saving} onClick={() => setPref({ reach: k })}>
                {k === "whatsapp" ? "WhatsApp" : t(k === "email" ? "E-mail" : "Appel")}
              </button>
            ))}
          </div>
        </div>
        {err && <small className={feuillet.err}>{t(err)}</small>}
      </div>
    </section>
  );
}
