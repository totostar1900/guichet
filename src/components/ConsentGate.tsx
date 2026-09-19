"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { LEGAL, LEGAL_VERSION } from "@/data/legal";
import { useLang, useT } from "@/i18n/client";
import { acceptTerms } from "@/app/moi/actions";
import styles from "./ConsentGate.module.css";

/**
 * Once per version of the legal text, after a sign-in: the text, a box to
 * tick, one button. Nothing else of the page is reachable until then; the
 * text stays readable afterwards at /info/mentions and from the ⋮ menu.
 */
export function ConsentGate({ previous }: { previous?: string }) {
  const t = useT();
  const lang = useLang();
  const [read, setRead] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const accept = () =>
    start(async () => {
      const r = await acceptTerms(LEGAL_VERSION);
      if (!r.ok) setError(r.error);
    });
  return (
    <div className={styles.layer} role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className={styles.box}>
        <div className={styles.head}>
          <span className="eyebrow">{t(previous ? "Le texte a changé" : "Avant de commencer")}</span>
          <b id="consent-title">{t("Mentions et responsabilités")}</b>
          <small>{t("Version du {date} · deux minutes de lecture, une seule fois", { date: LEGAL_VERSION })}</small>
        </div>
        <div className={styles.text}>
          {LEGAL.map((s) => (
            <section key={s.id}>
              <h3>{s.title[lang]}</h3>
              {s.body[lang].map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>
          ))}
        </div>
        <div className={styles.foot}>
          <label className={styles.check}>
            <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />
            <span>{t("J'ai lu ces mentions : je comprends que le Guichet n'est pas un conseil et que je porte les risques décrits.")}</span>
          </label>
          {error && <em className={styles.error}>{error}</em>}
          <div className={styles.row}>
            <Link href="/info/mentions" className={styles.link} target="_blank">
              {t("Garder une copie")}
            </Link>
            <button type="button" className="btn primary" disabled={!read || pending} onClick={accept}>
              {t(pending ? "Un instant…" : "J'accepte")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
