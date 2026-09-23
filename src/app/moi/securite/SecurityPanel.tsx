"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { platformAuthenticatorIsAvailable, startRegistration } from "@simplewebauthn/browser";
import { useT } from "@/i18n/client";
import { fmtDateTime } from "@/lib/format";
import type { ChannelStatus, TrustedDevice } from "@/lib/domain/types";
import { ProofBlock } from "@/components/ProofBlock";
import { clearDevice, deviceLabel, newDeviceToken, readDevice, saveDevice } from "@/lib/device-client";
import { beginPasskey, enrolPin, finishPasskey, forgetDeviceAction } from "./actions";
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
 * The client's two proven channels and the devices they trust. Adding a device
 * takes the phone's lock (passkey) or four digits bound to this browser; each
 * change is told on both channels.
 */
export function SecurityPanel({ who, channels, devices, sessionEmail }: { who: string; channels: ChannelStatus; devices: TrustedDevice[]; sessionEmail?: string }) {
  const t = useT();
  const raw = useSyncExternalStore(noop, snapshot, () => "");
  const here = raw ? readDevice() : null;
  const [phone, setPhone] = useState(channels.phone ?? "");
  const [proven, setProven] = useState<string | null>(channels.phoneVerifiedAt ? (channels.phone ?? null) : null);
  const [adding, setAdding] = useState<"idle" | "pin">("idle");
  const [pin, setPin] = useState(["", ""]);
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  const [canPasskey, setCanPasskey] = useState(false);
  useEffect(() => {
    platformAuthenticatorIsAvailable().then(setCanPasskey, () => setCanPasskey(false));
  }, []);

  const addPasskey = () =>
    start(async () => {
      setMsg(null);
      try {
        const options = await beginPasskey();
        const response = await startRegistration({ optionsJSON: options });
        const r = await finishPasskey(response, deviceLabel());
        if (!r.ok) {
          setMsg({ error: r.error });
          return;
        }
        saveDevice({ id: r.device.id, kind: "passkey", who, name: r.device.name, since: r.device.createdAt });
        setMsg({ ok: "Appareil ajouté : la prochaine fois, un doigt suffit." });
      } catch (e) {
        const name = (e as Error).name;
        setMsg({ error: name === "NotAllowedError" ? "Annulé." : name === "InvalidStateError" ? "Cet appareil est déjà enregistré." : `Impossible : ${(e as Error).message}` });
      }
    });

  const addPin = () =>
    start(async () => {
      setMsg(null);
      if (pin[0] !== pin[1]) {
        setMsg({ error: "Les deux codes ne sont pas identiques." });
        return;
      }
      const token = newDeviceToken();
      const r = await enrolPin(token, pin[0], deviceLabel());
      if (!r.ok) {
        setMsg({ error: r.error });
        return;
      }
      saveDevice({ id: r.device.id, kind: "pin", token, who, name: r.device.name, since: r.device.createdAt });
      setPin(["", ""]);
      setAdding("idle");
      setMsg({ ok: "Code enregistré pour ce navigateur : la prochaine fois, quatre chiffres suffisent." });
    });

  const forget = (d: TrustedDevice) =>
    start(async () => {
      setMsg(null);
      await forgetDeviceAction(d.id);
      if (here?.id === d.id) clearDevice();
      setMsg({ ok: "Appareil retiré." });
    });

  return (
    <div className={styles.grid}>
      <section className="panel">
        <div className="panel-h">
          <h2>{t("Mes deux canaux")}</h2>
          <span className={styles.sub}>{t("Prouvés une fois ; un nouveau numéro ou une nouvelle adresse se prouve à nouveau.")}</span>
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
                  {t(d.kind === "passkey" ? "Face ID, empreinte ou code du téléphone" : "Code à 4 chiffres, lié à ce navigateur")} · {t("ajouté le {date}", { date: fmtDateTime(d.createdAt) })}
                  {d.lastUsedAt ? ` · ${t("utilisé le {date}", { date: fmtDateTime(d.lastUsedAt) })}` : ""}
                </small>
              </div>
              <button type="button" className="btn sm ghost" disabled={pending} onClick={() => forget(d)}>
                {t("Oublier")}
              </button>
            </li>
          ))}
        </ul>
        {!here && (
          <div className={styles.add}>
            <b>{t("Ajouter cet appareil")}</b>
            <span className="muted">{t("Un doigt, ou quatre chiffres : le code par e-mail reste toujours possible.")}</span>
            {adding === "idle" ? (
              <div className={styles.addRow}>
                {canPasskey && (
                  <button type="button" className="btn primary sm" disabled={pending} onClick={addPasskey}>
                    {t(pending ? "Un instant…" : "Face ID, empreinte ou code du téléphone")}
                  </button>
                )}
                <button type="button" className="btn sm" disabled={pending} onClick={() => setAdding("pin")}>
                  {t("Code à 4 chiffres")}
                </button>
              </div>
            ) : (
              <div className={styles.pinForm}>
                <label>
                  <span>{t("Choisissez 4 chiffres")}</span>
                  <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="new-password" value={pin[0]} onChange={(e) => setPin([e.target.value.replace(/\D/g, ""), pin[1]])} autoFocus />
                </label>
                <label>
                  <span>{t("Encore une fois")}</span>
                  <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="new-password" value={pin[1]} onChange={(e) => setPin([pin[0], e.target.value.replace(/\D/g, "")])} />
                </label>
                <div className={styles.addRow}>
                  <button type="button" className="btn primary sm" disabled={pending || pin[0].length !== 4 || pin[1].length !== 4} onClick={addPin}>
                    {t(pending ? "Enregistrement…" : "Enregistrer")}
                  </button>
                  <button type="button" className="btn sm ghost" onClick={() => setAdding("idle")}>
                    {t("Annuler")}
                  </button>
                </div>
                <small className="muted">{t("Cinq codes faux et l'appareil est oublié : on se reconnecte par le code e-mail.")}</small>
              </div>
            )}
          </div>
        )}
        {msg?.error && <div className={styles.err}>{msg.error}</div>}
        {msg?.ok && <div className={styles.done}>{t(msg.ok)}</div>}
      </section>
    </div>
  );
}
