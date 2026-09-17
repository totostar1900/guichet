"use client";

import { useEffect, useState } from "react";
import styles from "./PushToggle.module.css";

/**
 * « Recevoir les alertes sur ce téléphone » — registers the service worker and
 * a push subscription for the signed-in user. iPhone needs the app installed on
 * the home screen first; we say so instead of failing silently.
 */
type State = "unsupported" | "needs-install" | "denied" | "off" | "on" | "busy";

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export function PushToggle({ vapidKey, compact = false }: { vapidKey?: string; compact?: boolean }) {
  const [state, setState] = useState<State>("busy");
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!vapidKey || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        const ios = /iphone|ipad/i.test(navigator.userAgent);
        const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
        setState(ios && !standalone ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    }, 0);
    return () => clearTimeout(t);
  }, [vapidKey]);

  const enable = async () => {
    setState("busy");
    setErr("");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState("denied");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapidKey!) });
      const j = sub.toJSON();
      const r = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint, keys: j.keys }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Enregistrement refusé.");
      setState("on");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Impossible d'activer les alertes.");
      setState("off");
    }
  };
  const disable = async () => {
    setState("busy");
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
  };

  if (state === "unsupported") return compact ? null : <small className={styles.note}>Ce navigateur ne prend pas en charge les alertes.</small>;
  if (state === "needs-install") return <small className={styles.note}>Sur iPhone : ajoutez le Guichet à l&apos;écran d&apos;accueil (Partager → « Sur l&apos;écran d&apos;accueil »), puis ouvrez-le de là pour activer les alertes.</small>;
  if (state === "denied") return <small className={styles.note}>Alertes bloquées dans les réglages du navigateur : autorisez les notifications pour ce site pour les recevoir.</small>;
  return (
    <span className={styles.wrap}>
      <button type="button" className={`btn sm ${state === "on" ? "" : "primary"}`} disabled={state === "busy"} onClick={state === "on" ? disable : enable}>
        {state === "busy" ? "…" : state === "on" ? "Alertes activées · désactiver" : "Recevoir les alertes sur cet appareil"}
      </button>
      {err && <small className={styles.err}>{err}</small>}
      {!compact && state === "off" && <small className={styles.note}>Une opportunité du moment, une clôture qui approche, un ordre servi : une notification, pas plus d&apos;une par jour.</small>}
    </span>
  );
}
