"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PROFILE_LABEL, PROFILE_QUESTIONS, type FinancialProfile } from "@/data/profile";
import { useLang, useT } from "@/i18n/client";
import { fmtDate } from "@/lib/format";
import { saveProfile } from "./actions";
import styles from "./page.module.css";

/** One question at a time, then the profile: a gauge, four bars, and what it changes on the Guichet. */
export function ProfileQuiz({ initial }: { initial?: FinancialProfile }) {
  const t = useT();
  const lang = useLang();
  const [profile, setProfile] = useState<FinancialProfile | undefined>(initial);
  const [redo, setRedo] = useState(!initial);
  const [n, setN] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(initial?.answers ?? {});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const q = PROFILE_QUESTIONS[n];
  const chosen = answers[q.key];
  const last = n === PROFILE_QUESTIONS.length - 1;

  const next = () => {
    if (chosen == null) return;
    if (!last) {
      setN(n + 1);
      return;
    }
    start(async () => {
      const r = await saveProfile(answers);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setProfile(r.profile);
      setRedo(false);
      setN(0);
    });
  };

  if (profile && !redo) {
    const p = profile;
    const [, max] = p.horizonYears;
    const angle = p.kind === "prudent" ? 150 : p.kind === "equilibre" ? 90 : 30; // where the needle points on the half dial
    const rad = (angle * Math.PI) / 180;
    const nx = 60 + 50 * Math.cos(Math.PI - rad);
    const ny = 92 - 50 * Math.sin(rad);
    const horizonText = max === 99 ? t("plus de 5 ans") : t("{a} à {b} ans", { a: p.horizonYears[0], b: max });
    const bar = (label: string, v: number, text: string, gold?: boolean) => (
      <div className={styles.measure}>
        <span>{label}</span>
        <span className={styles.track}>
          <span className={`${styles.fill} ${gold ? styles.fillGold : ""}`} style={{ width: `${Math.round(v * 100)}%` }} />
        </span>
        <b>{text}</b>
      </div>
    );
    return (
      <div className={styles.result}>
        <div className={styles.hero}>
          <svg viewBox="0 0 120 120" width="110" height="110" aria-hidden="true">
            <path d="M10 92 A50 50 0 0 1 110 92" fill="none" stroke="#2b436b" strokeWidth="12" strokeLinecap="round" />
            <path d="M10 92 A50 50 0 0 1 60 42" fill="none" stroke={p.kind === "prudent" ? "#d9a94a" : "#2b436b"} strokeWidth="12" strokeLinecap="round" />
            <path d="M10 92 A50 50 0 0 1 96 57" fill="none" stroke={p.kind === "equilibre" ? "#d9a94a" : "transparent"} strokeWidth="12" strokeLinecap="round" />
            <path d="M10 92 A50 50 0 0 1 110 92" fill="none" stroke={p.kind === "dynamique" ? "#d9a94a" : "transparent"} strokeWidth="12" strokeLinecap="round" />
            <circle cx={nx} cy={ny} r="6" fill="#fff" />
            <text x="60" y="88" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" fontFamily="inherit">
              {PROFILE_LABEL[p.kind][lang]}
            </text>
            <text x="60" y="104" textAnchor="middle" fontSize="8" fill="#c9d2e0" fontFamily="inherit">
              {t("prudent · équilibré · dynamique")}
            </text>
          </svg>
          <div className={styles.heroText}>
            <span className={styles.eyebrow} style={{ color: "#d9a94a" }}>
              {t("Votre profil")}
            </span>
            <b>
              {PROFILE_LABEL[p.kind][lang]}, {t("horizon")} {horizonText}
            </b>
            <small>{t("établi le {date} · à revoir dans un an ou quand votre situation change", { date: fmtDate(p.updatedAt) })}</small>
          </div>
        </div>
        <div className={styles.panel}>
          <b>{t("Quatre mesures")}</b>
          {bar(t("Horizon"), p.measures.horizon, horizonText)}
          {bar(t("Tolérance"), p.measures.tolerance, p.measures.tolerance <= 0.25 ? t("faible") : p.measures.tolerance <= 0.5 ? "−10 %" : t("forte"), true)}
          {bar(t("Connaissance"), p.measures.knowledge, `${Math.round(p.measures.knowledge * 4)} / 4`)}
          {bar(t("Capacité"), p.measures.capacity, p.measures.capacity <= 0.25 ? t("limitée") : p.measures.capacity <= 0.5 ? t("moyenne") : t("bonne"))}
          <span className={styles.hint}>{t("Capacité : la part de votre épargne que vous pouvez immobiliser sans y toucher, votre réserve et vos revenus.")}</span>
        </div>
        <div className={styles.panel}>
          <b>{t("Ce que cela change sur le Guichet")}</b>
          <div className={styles.changes}>
            <div>
              <span className={styles.dot} style={{ background: "var(--good)" }} />
              <span>
                <b>{t("Repères sur les fiches")}</b> : {t("« dans votre horizon », « au-delà de votre horizon » à côté d'une ligne, sans jamais la cacher.")}
              </span>
            </div>
            <div>
              <span className={styles.dot} style={{ background: "var(--gold)" }} />
              <span>
                <b>{t("Une confirmation avant l'envoi")}</b> : {t("une intention hors profil vous le dit et vous demande de confirmer ; le desk le voit.")}
              </span>
            </div>
            <div>
              <span className={styles.dot} style={{ background: "var(--navy)" }} />
              <span>
                <b>{t("Le conseiller vous parle mieux")}</b> : {t("votre profil est dans votre dossier, comme la COSUMAF le demande.")}
              </span>
            </div>
          </div>
          <span className={styles.hint}>{t("Ce profil n'est pas un conseil : il décrit ce que vous nous avez dit de vous.")}</span>
        </div>
        <div className={styles.actions}>
          <Link href="/" className="btn primary">
            {t("Voir les lignes")}
          </Link>
          <button type="button" className="btn" onClick={() => setRedo(true)}>
            {t("Refaire")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.quiz}>
      <div className={styles.meta}>
        <span>
          {t("Question")} <b>{n + 1}</b> {t("sur {n}", { n: PROFILE_QUESTIONS.length })}
        </span>
        <span>{t("deux minutes, une fois par an")}</span>
      </div>
      <div className={styles.steps} aria-hidden="true">
        {PROFILE_QUESTIONS.map((x, i) => (
          <i key={x.key} className={i <= n ? styles.on : undefined} />
        ))}
      </div>
      <span className={styles.eyebrow}>{q.eyebrow[lang]}</span>
      <h1 className={styles.q}>{q.q[lang]}</h1>
      {q.options.map((o, i) => (
        <label key={i} className={`${styles.opt} ${chosen === i ? styles.optOn : ""}`}>
          <input type="radio" name={q.key} checked={chosen === i} onChange={() => setAnswers({ ...answers, [q.key]: i })} />
          <span>{o[lang]}</span>
        </label>
      ))}
      <span className={styles.hint}>{t("Il n'y a pas de bonne réponse : votre profil sert à vous montrer les bons repères, pas à vous juger. Rien n'est un conseil.")}</span>
      {error && <span className={styles.hint} style={{ color: "var(--crit)" }}>{error}</span>}
      <div className={styles.nav}>
        {n > 0 ? (
          <button type="button" className={styles.back} onClick={() => setN(n - 1)}>
            ← {t("Précédente")}
          </button>
        ) : profile ? (
          <button type="button" className={styles.back} onClick={() => setRedo(false)}>
            ← {t("Garder mon profil")}
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="btn primary" disabled={chosen == null || pending} onClick={next}>
          {t(pending ? "Un instant…" : last ? "Voir mon profil" : "Suivante")} →
        </button>
      </div>
      <div className={styles.list}>{t("Les sept questions : horizon · objectif · tolérance aux pertes · connaissance des marchés · part de votre épargne · besoin de liquidité · revenus réguliers.")}</div>
    </div>
  );
}
