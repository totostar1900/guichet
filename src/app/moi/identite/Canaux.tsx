"use client";

import { useState } from "react";
import { useDates, useT } from "@/i18n/client";
import type { ChannelStatus } from "@/lib/domain/types";
import { ProofBlock } from "@/components/ProofBlock";
import styles from "../securite/page.module.css";

/**
 * LES COORDONNÉES, UNE FOIS, ICI (19 novembre 2026, planche « Compte, connexion et textes », 3A).
 *
 * L'e-mail et le téléphone figuraient en TROIS endroits (Profil › Mes canaux, Sécurité › Mes deux canaux, Sécurité › Mes coordonnées). Ils vivent maintenant sur la page « Profil et coordonnées », avec leur preuve : un canal prouvé est celui sur lequel un code à usage unique peut partir. La page « Sécurité et connexion » ne parle plus que de la façon d'ouvrir Guichet.
 */
export function Canaux({ channels, sessionEmail }: { channels: ChannelStatus; sessionEmail?: string }) {
  const { fmtDateTime } = useDates();
  const t = useT();
  const [phone, setPhone] = useState(channels.phone ?? "");
  const [proven, setProven] = useState<string | null>(channels.phoneVerifiedAt ? (channels.phone ?? null) : null);
  return (
    <section className="panel" id="canaux">
      <div className="panel-h">
        <h2>{t("Mes coordonnées")}</h2>
        <span className={styles.sub}>{t("Prouvées une fois ; un nouveau numéro ou une nouvelle adresse se prouve à nouveau.")}</span>
      </div>
      <dl className={styles.channels}>
        <div>
          <dt>{t("E-mail")}</dt>
          <dd>
            <b>{sessionEmail ?? channels.email ?? "·"}</b>
            <small className={styles.ok}>{sessionEmail ? t("prouvé par votre connexion") : channels.emailVerifiedAt ? t("prouvé le {date}", { date: fmtDateTime(channels.emailVerifiedAt) }) : t("à prouver à la prochaine intention")}</small>
            <small className="muted">{t("Pour changer d'adresse : connectez-vous avec la nouvelle, par son code ; vos intentions vous suivent par le desk.")}</small>
          </dd>
        </div>
        <div>
          <dt>{t("Téléphone")}</dt>
          <dd>
            <input type="tel" inputMode="tel" autoComplete="tel" value={phone} placeholder="+237 6 87 67 67 67" onChange={(e) => setPhone(e.target.value)} aria-label={t("Numéro de téléphone")} />
            {proven && phone.replace(/\D/g, "") === proven.replace(/\D/g, "") ? (
              <small className={styles.ok}>{t("prouvé le {date}", { date: fmtDateTime(channels.phoneVerifiedAt ?? new Date().toISOString()) })}</small>
            ) : phone.replace(/\D/g, "").length >= 8 ? (
              <ProofBlock kind="phone" target={phone} onProven={setProven} />
            ) : (
              <small className="muted">{t("Le numéro sur lequel arrivent le code, les accusés de réception et les rappels.")}</small>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
