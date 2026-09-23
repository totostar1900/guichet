"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { fmtDateTime } from "@/lib/format";
import styles from "./page.module.css";

export interface DeskMessage {
  at: string;
  dir: "out" | "in" | "sys";
  who: string;
  text: string;
  html: boolean;
  status: string;
}

/**
 * Le fil d'un ordre, et ce qu'on veut y lire.
 *
 * Trois flux y arrivaient ensemble : ce que nous avons envoyé, ce que le client
 * a fait, et tout le reste. Or chaque passage d'état écrit sa ligne au journal,
 * chaque document produit en écrit une autre, et ces lignes-là s'alignent à
 * côté de la conversation. L'échange réel, trois ou quatre lignes, se lisait
 * donc au milieu de quarante.
 *
 * « Échanges » d'abord, par défaut : la trace système compte pour l'audit, pas
 * pour travailler l'ordre. Elle reste à un doigt, et le compte de ce qu'on
 * cache est écrit sur l'onglet, pour qu'on sache qu'elle est là.
 */
export function Messages({ messages }: { messages: DeskMessage[] }) {
  const t = useT();
  const [show, setShow] = useState<"echanges" | "systeme" | "tout">("echanges");
  const talk = messages.filter((m) => m.dir !== "sys");
  const sys = messages.filter((m) => m.dir === "sys");
  const shown = show === "echanges" ? talk : show === "systeme" ? sys : messages;
  const tabs: [typeof show, string, number][] = [
    ["echanges", t("Échanges"), talk.length],
    ["systeme", t("Système"), sys.length],
    ["tout", t("Tout"), messages.length],
  ];

  return (
    <>
      <div className="panel-h">
        <h2>{t("Messages")}</h2>
        <span className={styles.msgTabs} role="group" aria-label={t("Ce qu'on affiche")}>
          {tabs.map(([k, label, n]) => (
            <button key={k} type="button" aria-pressed={show === k} className={show === k ? styles.msgTabOn : undefined} onClick={() => setShow(k)}>
              {label} <em>{n}</em>
            </button>
          ))}
        </span>
      </div>
      <ul className={styles.msgs}>
        {shown.map((m, i) => (
          <li key={`${m.at}-${i}`} className={styles[m.dir]}>
            <span className={styles.when}>{fmtDateTime(m.at)}</span>
            <b>{m.who}</b>
            {m.html ? <span dangerouslySetInnerHTML={{ __html: m.text }} /> : <span>{m.text}</span>}
            {m.status && <small className="muted">{m.status}</small>}
          </li>
        ))}
        {shown.length === 0 && <li className="muted">{t(show === "echanges" ? "Aucun échange avec ce client sur cet ordre." : "Rien à afficher.")}</li>}
      </ul>
    </>
  );
}
