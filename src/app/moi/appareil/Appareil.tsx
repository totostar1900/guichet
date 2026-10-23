"use client";

import { useState, useTransition } from "react";
import { useLang, useT } from "@/i18n/client";
import { prefsAction } from "@/app/moi/actions";
import type { ClientPrefs } from "@/lib/domain/types";
import { LangSwitch } from "@/components/LangSwitch";
import { PaletteSwitch } from "@/components/PaletteSwitch";
import { PushToggle } from "@/components/PushToggle";
import feuillet from "@/components/Feuillet.module.css";
import styles from "./page.module.css";

/**
 * LES RÉGLAGES, ET CE QUI LES SÉPARE EN DEUX.
 *
 * Ils vivaient au fond de la feuille du compte, après la recherche, le statut,
 * deux canaux, dix-sept tuiles et trois groupes : quatre interrupteurs qu'on
 * ne trouvait qu'en défilant jusqu'au bout. Un réglage qu'on cherche ne se
 * trouve pas au fond d'un défilement.
 *
 * DEUX SECTIONS, PARCE QUE DEUX PORTÉES. Les alertes appartiennent à CET
 * appareil — l'abonnement vit dans ce navigateur-ci, et l'autoriser sur le
 * téléphone n'allume rien sur l'ordinateur. Le canal préféré et les relevés
 * par e-mail appartiennent au COMPTE : les changer ici les change partout. La
 * page le dit au lieu de laisser son titre le faire croire, parce qu'un
 * réglage dont on se trompe sur la portée est un réglage qu'on refait.
 *
 * L'APPARENCE EST ENTRE LES DEUX, ET C'EST ASSUMÉ : on la choisit sur
 * l'appareil qu'on a sous les yeux, et elle est gardée au compte pour suivre
 * ailleurs — Safari jette le stockage d'un site ouvert il y a plus de sept
 * jours, et une maison qui perd les couleurs de son client à chaque semaine de
 * silence ne les lui a pas vraiment données.
 *
 * UN RÉGLAGE QUI ÉCHOUE REVIENT EN ARRIÈRE. On montre le nouvel état tout de
 * suite, parce qu'un interrupteur qui attend le serveur paraît cassé ; si
 * l'écriture échoue, l'état d'avant est remis et l'erreur s'écrit. Mentir à
 * l'œil une seconde est tenable, le laisser croire une minute ne l'est pas.
 */
export function Appareil({ prefs: initial, phoneOk, vapidKey }: { prefs?: ClientPrefs; phoneOk?: boolean; vapidKey?: string }) {
  const t = useT();
  const lang = useLang();
  const [prefs, setPrefs] = useState<ClientPrefs>(initial ?? {});
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

  /* Le canal par défaut suit la preuve : sans numéro prouvé, commencer par
     WhatsApp promettrait un message qui ne part pas. */
  const reach = prefs.reach ?? (phoneOk ? "whatsapp" : "email");
  const releves = prefs.statementsByEmail !== false;

  return (
    <>
      <section className={feuillet.bloc}>
        <h2>{t("Sur cet appareil")}</h2>
        <div>
          {/* SANS CLEF, PAS D'ALERTES, et la ligne ne paraît pas : un
              interrupteur qui ne peut rien allumer est une promesse en trop. */}
          {vapidKey ? (
            <div className={`${styles.reglage} ${styles.colonne}`}>
              <span>
                <b>{t("Alertes")}</b>
                <small>{t("Un bulletin à signer, une réponse du desk, une échéance : l'alerte part sur cet appareil-ci et sur aucun autre.")}</small>
              </span>
              <PushToggle vapidKey={vapidKey} compact />
            </div>
          ) : null}
          <div className={`${styles.reglage} ${styles.colonne}`}>
            <span>
              <b>{t("Couleurs")}</b>
              <small>{t("Choisies ici, gardées à votre compte : elles vous suivent sur vos autres appareils.")}</small>
            </span>
            <PaletteSwitch lang={lang} />
          </div>
          <div className={styles.reglage}>
            <span>
              <b>{t("Langue")}</b>
              <small>{t("Le français et l'anglais disent la même chose ; les documents officiels restent en français.")}</small>
            </span>
            <LangSwitch compact clair />
          </div>
        </div>
      </section>

      <section className={feuillet.bloc}>
        <h2>{t("Sur tous vos appareils")}</h2>
        <div>
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
          <div className={styles.reglage}>
            <span>
              <b>{t("Relevés par e-mail")}</b>
              <small>{t("Chaque relevé, dès qu'il est produit ; ils restent dans Mes documents.")}</small>
            </span>
            <button type="button" role="switch" aria-checked={releves} aria-label={t("Relevés par e-mail")} className={`${styles.switch} ${releves ? styles.switchOn : ""}`} disabled={saving} onClick={() => setPref({ statementsByEmail: !releves })}>
              <i />
            </button>
          </div>
          {err && <small className={feuillet.err}>{t(err)}</small>}
        </div>
      </section>
    </>
  );
}
