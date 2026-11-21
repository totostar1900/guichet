"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useDates, useT } from "@/i18n/client";
import type { TrustedDevice } from "@/lib/domain/types";
import { clearDevice, marquerAppareilOublie, readDevice } from "@/lib/device-client";
import { forgetDeviceAction } from "./actions";
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
 * Les appareils que le client a reconnus, et le geste de les retirer.
 *
 * AJOUTER SE FAIT AILLEURS (19 novembre 2026, planche « Paramètres et connexion », 2A) : Face ID par l'interrupteur de « Connexion », le code par sa propre page. Il ne reste ici que la liste : chaque retrait est annoncé sur les deux canaux.
 */
export function SecurityPanel({ devices }: { devices: TrustedDevice[] }) {
  const { fmtDateTime } = useDates();
  const t = useT();
  const raw = useSyncExternalStore(noop, snapshot, () => "");
  const here = raw ? readDevice() : null;
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const forget = (d: TrustedDevice) =>
    start(async () => {
      setMsg(null);
      await forgetDeviceAction(d.id);
      if (here?.id === d.id) {
        clearDevice();
        marquerAppareilOublie();
      }
      setMsg("Appareil retiré.");
    });

  return (
    <section className="panel">
      <div className="panel-h">
        <h2>{t("Mes appareils")}</h2>
        <span className={styles.sub}>{t("Chaque ajout et chaque retrait vous sont annoncés sur les deux canaux.")}</span>
      </div>
      {devices.length === 0 ? <p className={styles.empty}>{t("Aucun appareil pour l'instant : la connexion passe par le code e-mail.")}</p> : null}
      <ul className={styles.devices}>
        {devices.map((d) => (
          <li key={d.id}>
            <span className={styles.kind} aria-hidden>
              {d.kind === "passkey" ? "◉" : "⁘"}
            </span>
            <div>
              <b>
                {d.name}
                {here?.id === d.id && <em className={styles.here}>{t("cet appareil")}</em>}
              </b>
              <small className="muted">
                {t(d.kind === "passkey" ? "Face ID, empreinte ou code du téléphone" : "Code à 6 chiffres, lié à ce navigateur")} · {t("ajouté le {date}", { date: fmtDateTime(d.createdAt) })}
                {d.lastUsedAt ? ` · ${t("utilisé le {date}", { date: fmtDateTime(d.lastUsedAt) })}` : ""}
              </small>
            </div>
            <button type="button" className="btn sm ghost" disabled={pending} onClick={() => forget(d)}>
              {t("Oublier")}
            </button>
          </li>
        ))}
      </ul>
      {msg && <div className={styles.done}>{t(msg)}</div>}
    </section>
  );
}
