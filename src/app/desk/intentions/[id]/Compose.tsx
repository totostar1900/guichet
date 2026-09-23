"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { fill } from "@/lib/documents/passages-catalog";
import type { PreparedMessage } from "@/lib/documents/messages";
import { notePreparedMessage } from "./message-actions";
import styles from "./page.module.css";

/**
 * Écrire au client : un message préparé, relu, corrigé, puis ouvert dans
 * WhatsApp ou dans le courrier de l'opérateur.
 *
 * Trois règles tiennent cet écran.
 *
 * Le texte se voit avant de partir. Un bouton qui envoie sans montrer fait
 * écrire à la maison des phrases que personne n'a lues.
 *
 * Le texte se corrige. Le modèle est un premier jet, jamais un carcan : la
 * moitié des situations demandent un mot de plus.
 *
 * Rien ne part d'ici. Le lien ouvre WhatsApp ou le courrier, et c'est la main
 * de l'opérateur qui appuie. L'application note seulement qu'il a été ouvert,
 * pour que le collègue de demain ne réécrive pas la même chose.
 */
export function Compose({ intentId, messages, phone, email, subject, asked }: { intentId: string; messages: PreparedMessage[]; phone?: string; email?: string; subject: string; asked: "wa" | "mail" | "tel" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(messages[0]?.key ?? "");
  const [note, setNote] = useState("");
  // Le texte corrigé à la main, ou rien : changer de message ou de précision le reprend.
  const [edited, setEdited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();
  const def = messages.find((m) => m.key === key) ?? messages[0];
  if (!def) return null;
  const body = edited ?? fill(def.text, { precision: note.trim() || undefined });
  // Un champ resté en place partirait tel quel : c'est la seule chose qui bloque,
  // et corriger le texte à la main suffit à la lever.
  const hole = body.match(/\{([a-z_]+)\}/)?.[1];
  const pick = (k: string) => {
    setKey(k);
    setEdited(null);
    setCopied(false);
  };
  const noted = (channel: "whatsapp" | "email" | "copie") => start(() => void notePreparedMessage(intentId, def.key, channel, body));
  const wa = phone ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(body)}` : undefined;
  const mail = email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : undefined;
  const copy = () => {
    navigator.clipboard?.writeText(body).then(
      () => {
        setCopied(true);
        noted("copie");
      },
      () => setCopied(false),
    );
  };

  if (!open) {
    return (
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        {t("Écrire au client")}
        {asked !== "tel" && <em className={styles.asked}> · {t(asked === "wa" ? "WhatsApp demandé" : "e-mail demandé")}</em>}
      </button>
    );
  }
  return (
    <div className={styles.compose}>
      <div className={styles.composeHead}>
        <b>{t("Écrire au client")}</b>
        <span className="muted">{t("Le message s'ouvre dans WhatsApp ou dans votre courrier : rien ne part d'ici.")}</span>
        <button type="button" className="btn sm ghost" onClick={() => setOpen(false)}>
          {t("Fermer")}
        </button>
      </div>
      <div className={styles.composePick} role="group" aria-label={t("Message préparé")}>
        {messages.map((m) => (
          <button key={m.key} type="button" className={`${styles.composeChip} ${m.key === def.key ? styles.composeOn : ""}`} onClick={() => pick(m.key)} title={t(m.hint)}>
            {t(m.label)}
          </button>
        ))}
      </div>
      {def.askNote && (
        <label className={styles.composeNote}>
          <span>{t(def.askNote)}</span>
          {/* Plusieurs lignes, parce que « il manque la CNI, le RIB et le justificatif »
              se lit mieux en liste qu’en phrase, et que le client y répond pièce par pièce. */}
          <textarea
            value={note}
            rows={2}
            onChange={(e) => {
              setNote(e.target.value);
              setEdited(null);
              setCopied(false);
            }}
            maxLength={600}
            placeholder={t("ce que le client lira, une ligne par point")}
          />
        </label>
      )}
      <textarea
        className={styles.composeBody}
        rows={5}
        value={body}
        onChange={(e) => {
          setEdited(e.target.value);
          setCopied(false);
        }}
        aria-label={t("Le message, tel qu'il partira")}
      />
      <div className={styles.composeFoot}>
        {hole && <em className={styles.composeWarn}>{t("Le message porte encore un champ à remplir : {c}", { c: `{${hole}}` })}</em>}
        {!hole && (
          <>
            {wa && (
              <a className={`btn sm ${asked === "wa" ? "primary" : ""}`} href={wa} target="_blank" rel="noreferrer" onClick={() => noted("whatsapp")}>
                {t("Ouvrir dans WhatsApp")}
              </a>
            )}
            {mail && (
              <a className={`btn sm ${asked === "mail" ? "primary" : ""}`} href={mail} onClick={() => noted("email")}>
                {t("Ouvrir dans le courrier")}
              </a>
            )}
            <button type="button" className="btn sm ghost" onClick={copy}>
              {t(copied ? "Copié" : "Copier")}
            </button>
          </>
        )}
        <span className={styles.spacer} />
        <a className={styles.composeLink} href="/desk/referentiel/modeles?type=message">
          {t("Modifier ces textes")}
        </a>
      </div>
    </div>
  );
}
