"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BLOCK_LABEL, CAPACITY_LABEL, CONFIDENCE_LABEL, computeProfile, INVESTABLE_LABEL, KNOWLEDGE_LABEL, PROFILE_LABEL, PROFILE_QUESTIONS, toCover, VERIFICATIONS, type FinancialProfile, type ProfileBlock } from "@/data/profile";
import { useLang, useT } from "@/i18n/client";
import { fmtDate } from "@/lib/format";
import { cachedGuideIndex, loadGuideIndex, readDoneLessons } from "@/lib/guide-index-client";
import { useLocalProfile, writeLocalProfile } from "@/lib/profile-local";
import { saveProfile } from "./actions";
import styles from "./page.module.css";

/**
 * One question at a time, in three blocks (what you can bear, what you know,
 * what you can commit), then the profile: a gauge, the measures, what the
 * client knows and what to read next, what it changes on the Guichet. A
 * verification answers back at once: right, or the lesson that explains.
 * A visitor without an account (`guest`) gets the same quiz, for information:
 * the profile is computed here and kept on the device; once signed in, a
 * profile found on the device is offered to keep in the file.
 */
const BLOCKS: ProfileBlock[] = ["appetit", "connaissance", "capacite"];

/** The lessons read on this device: they count as knowledge. */
async function lessonsReadHere(): Promise<number> {
  try {
    const i = cachedGuideIndex() ?? (await loadGuideIndex());
    return readDoneLessons(i.lessons.map((l) => l.key)).length;
  } catch {
    return 0;
  }
}

export function ProfileQuiz({ initial, guest }: { initial?: FinancialProfile; guest?: boolean }) {
  const t = useT();
  const lang = useLang();
  const [saved, setSaved] = useState<FinancialProfile | undefined>(undefined);
  const [redo, setRedo] = useState(false);
  // The device may hold a profile made as a visitor: it is the visitor's own, and, once signed in, one to keep.
  const onDevice = useLocalProfile();
  const profile = saved ?? (guest ? onDevice : initial);
  const local = !guest && !initial && !saved ? onDevice : undefined;
  const [n, setN] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(initial?.answers ?? {});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const q = PROFILE_QUESTIONS[n];
  const chosen = answers[q.key];
  const last = n === PROFILE_QUESTIONS.length - 1;
  const answered = q.multi ? chosen != null && chosen > 0 : chosen != null;
  const blockStart = n === 0 || PROFILE_QUESTIONS[n - 1].block !== q.block;
  const blockIndex = BLOCKS.indexOf(q.block);
  const verifying = Boolean(q.lesson);
  const right = verifying && chosen != null ? Boolean(q.options[chosen]?.correct) : undefined;

  const next = () => {
    if (!answered) return;
    if (!last) {
      setN(n + 1);
      return;
    }
    start(async () => {
      const read = await lessonsReadHere();
      if (guest) {
        const p = computeProfile(answers, read);
        writeLocalProfile(p);
        setSaved(p);
        setRedo(false);
        setN(0);
        return;
      }
      const r = await saveProfile(answers, read);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSaved(r.profile);
      setRedo(false);
      setN(0);
    });
  };
  const keepLocal = () => {
    if (!local) return;
    start(async () => {
      const r = await saveProfile(local.answers, local.lessonsRead ?? 0);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      writeLocalProfile(null);
      setSaved(r.profile);
      setRedo(false);
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
    const cover = toCover(p);
    const v2 = p.version === 2;
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
            <path d="M10 92 A50 50 0 0 1 110 92" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="12" strokeLinecap="round" />
            <path d="M10 92 A50 50 0 0 1 60 42" fill="none" stroke={p.kind === "prudent" ? "#d9a94a" : "rgba(255,255,255,0.18)"} strokeWidth="12" strokeLinecap="round" />
            <path d="M10 92 A50 50 0 0 1 96 57" fill="none" stroke={p.kind === "equilibre" ? "#d9a94a" : "transparent"} strokeWidth="12" strokeLinecap="round" />
            <path d="M10 92 A50 50 0 0 1 110 92" fill="none" stroke={p.kind === "dynamique" ? "#d9a94a" : "transparent"} strokeWidth="12" strokeLinecap="round" />
            <circle cx={nx} cy={ny} r="6" fill="#fff" />
            <text x="60" y="88" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" fontFamily="inherit">
              {PROFILE_LABEL[p.kind][lang]}
            </text>
            <text x="60" y="104" textAnchor="middle" fontSize="8" fill="var(--on-navy-2)" fontFamily="inherit">
              {t("prudent · équilibré · dynamique")}
            </text>
          </svg>
          <div className={styles.heroText}>
            <span className={styles.eyebrow} style={{ color: "#d9a94a" }}>
              {t("Votre profil")}
              {p.confidence && <em className={styles.confidence}>{CONFIDENCE_LABEL[p.confidence][lang]}</em>}
            </span>
            <b>
              {PROFILE_LABEL[p.kind][lang]}, {t("horizon")} {horizonText}
            </b>
            {p.capped && <small className={styles.capped}>{t("Votre appétit dit « dynamique » ; votre réserve, encore à constituer, tient le mot à « équilibré ». Il montera avec elle.")}</small>}
            <small>{guest ? t("à titre d'information · gardé sur cet appareil, le {date}", { date: fmtDate(p.updatedAt) }) : t("établi le {date} · à revoir dans un an ou quand votre situation change", { date: fmtDate(p.updatedAt) })}</small>
          </div>
        </div>

        <div className={styles.panel}>
          <b>{BLOCK_LABEL.appetit[lang]}</b>
          {bar(t("Horizon"), p.measures.horizon, horizonText)}
          {bar(t("Tolérance"), p.measures.tolerance, p.measures.tolerance <= 0.25 ? t("faible") : p.measures.tolerance <= 0.5 ? "−10 %" : t("forte"), true)}
        </div>

        <div className={styles.panel}>
          <b>
            {BLOCK_LABEL.connaissance[lang]}
            {p.knowledge && <em className={styles.level}>{KNOWLEDGE_LABEL[p.knowledge][lang]}</em>}
          </b>
          {bar(t("Connaissance"), p.measures.knowledge, v2 ? t("{n} / 4 vérifiées", { n: p.verified ?? 0 }) : `${Math.round(p.measures.knowledge * 4)} / 4`)}
          {v2 && (
            <ul className={styles.checks}>
              {VERIFICATIONS.map((vq) => {
                const ok = p.answers[vq.key] != null && vq.options[p.answers[vq.key]]?.correct;
                return (
                  <li key={vq.key} className={ok ? styles.checkOk : styles.checkTodo}>
                    <i aria-hidden="true">{ok ? "✓" : "→"}</i>
                    <span>{vq.eyebrow[lang].replace(/^(Vérifions|Let us check) · /, "")}</span>
                    {ok ? <small>{t("su")}</small> : <Link href={`/info/${vq.lesson}`}>{t("lire la leçon")} →</Link>}
                  </li>
                );
              })}
            </ul>
          )}
          <span className={styles.hint}>{v2 && (p.lessonsRead ?? 0) > 0 ? t("{n} leçons du Guide lues : elles comptent.", { n: p.lessonsRead ?? 0 }) : t("Chaque leçon du Guide lue fait monter cette mesure : le Guide est à portée, dans l'onglet en bas.")}</span>
        </div>

        <div className={styles.panel}>
          <b>
            {BLOCK_LABEL.capacite[lang]}
            {p.capacity && <em className={styles.level}>{CAPACITY_LABEL[p.capacity][lang]}</em>}
          </b>
          {bar(t("Capacité"), p.measures.capacity, p.measures.capacity <= 0.25 ? t("limitée") : p.measures.capacity <= 0.5 ? t("moyenne") : t("bonne"))}
          {p.investable != null && (
            <div className={styles.fact}>
              <span>{t("Épargne à placer cette année")}</span>
              <b>{INVESTABLE_LABEL[p.investable]?.[lang]}</b>
            </div>
          )}
          {p.answers.reserve != null && (
            <div className={styles.fact}>
              <span>{t("Réserve de précaution")}</span>
              <b>{PROFILE_QUESTIONS.find((x) => x.key === "reserve")!.options[p.answers.reserve]?.[lang]}</b>
            </div>
          )}
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
                <b>{t("Une confirmation avant l'envoi")}</b> : {t("une intention hors profil, ou au-delà de l'épargne que vous avez dite disponible, vous le dit et vous demande de confirmer ; le desk le voit.")}
              </span>
            </div>
            <div>
              <span className={styles.dot} style={{ background: "var(--chart-out)" }} />
              <span>
                <b>{t("Le conseiller vous parle mieux")}</b> : {cover.length > 0 ? t("il commence par ce que vous n'avez pas encore vu : {items}.", { items: cover.map((c) => c[lang].toLowerCase()).join(", ") }) : t("votre profil est dans votre dossier, comme la COSUMAF le demande.")}
              </span>
            </div>
          </div>
          <span className={styles.hint}>{guest ? t("Ces repères s'activent avec un compte : connectez-vous et ce profil rejoint votre dossier.") : t("Ce profil décrit ce que vous nous avez dit de vous ; le conseil, c'est votre conseiller.")}</span>
        </div>
        <div className={styles.actions}>
          {guest ? (
            <Link href="/connexion?next=%2Fmoi%2Fprofil" className="btn primary">
              {t("Garder ce profil dans mon dossier")}
            </Link>
          ) : (
            <Link href="/" className="btn primary">
              {t("Voir les lignes")}
            </Link>
          )}
          <button type="button" className="btn" onClick={() => setRedo(true)}>
            {t(v2 ? "Refaire" : "Compléter mon profil")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.quiz}>
      {local && !profile && (
        <div className={styles.keep}>
          <span>
            <b>{t("Un profil {kind} attend sur cet appareil", { kind: PROFILE_LABEL[local.kind][lang] })}</b>
            <small>{t("fait avant votre connexion, le {date}", { date: fmtDate(local.updatedAt) })}</small>
          </span>
          <button type="button" className="btn sm primary" disabled={pending} onClick={keepLocal}>
            {t("Le garder")}
          </button>
        </div>
      )}
      <div className={styles.meta}>
        <span>
          {t("Question")} <b>{n + 1}</b> {t("sur {n}", { n: PROFILE_QUESTIONS.length })}
        </span>
        <span>{t("cinq minutes, une fois par an")}</span>
      </div>
      <div className={styles.blocks} aria-hidden="true">
        {BLOCKS.map((b, i) => (
          <span key={b} className={`${styles.block} ${i < blockIndex ? styles.blockDone : i === blockIndex ? styles.blockOn : ""}`}>
            <i />
            {BLOCK_LABEL[b].short[lang]}
          </span>
        ))}
      </div>
      {blockStart && (
        <p className={styles.blockLead}>
          <b>{BLOCK_LABEL[q.block][lang]}</b> · {BLOCK_LABEL[q.block].lead[lang]}
        </p>
      )}
      <span className={styles.eyebrow}>{q.eyebrow[lang]}</span>
      <h1 className={styles.q}>{q.q[lang]}</h1>
      {q.options.map((o, i) => {
        const on = q.multi ? Boolean(((chosen ?? 0) >> i) & 1) : chosen === i;
        const pick = () => {
          if (!q.multi) return setAnswers({ ...answers, [q.key]: i });
          const cur = chosen ?? 0;
          // « none of these » clears the others, and the others clear it
          const noneBit = 1 << (q.options.length - 1);
          const bit = 1 << i;
          const nextMask = bit === noneBit ? (cur & noneBit ? 0 : noneBit) : (cur & ~noneBit) ^ bit;
          setAnswers({ ...answers, [q.key]: nextMask });
        };
        const tone = verifying && chosen != null ? (o.correct ? styles.optRight : on ? styles.optWrong : "") : "";
        return (
          <label key={i} className={`${styles.opt} ${on ? styles.optOn : ""} ${tone}`}>
            <input type={q.multi ? "checkbox" : "radio"} name={q.key} checked={on} onChange={pick} />
            <span>{o[lang]}</span>
          </label>
        );
      })}
      {verifying && chosen != null && (
        <div className={`${styles.feedback} ${right ? styles.feedbackRight : styles.feedbackLesson}`}>
          {right ? (
            <span>
              <b>{t("C'est cela.")}</b> {t("Vous l'aviez.")}
            </span>
          ) : (
            <span>
              <b>{t("La bonne réponse est en vert.")}</b> {t("Deux minutes suffisent pour l'avoir pour de bon :")}{" "}
              <Link href={`/info/${q.lesson}`} target="_blank" rel="noopener">
                {t("lire la leçon")} →
              </Link>
            </span>
          )}
        </div>
      )}
      <span className={styles.hint}>{verifying ? t("Une réponse fausse n'enlève rien : elle dit ce que le Guide vous expliquera en premier.") : t("Toutes les réponses sont bonnes : votre profil sert à vous montrer les bons repères. La décision reste la vôtre.")}</span>
      {error && (
        <span className={styles.hint} style={{ color: "var(--crit)" }}>
          {error}
        </span>
      )}
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
        <button type="button" className="btn primary" disabled={!answered || pending} onClick={next}>
          {t(pending ? "Un instant…" : last ? "Voir mon profil" : "Suivante")} →
        </button>
      </div>
      <div className={styles.list}>{t("Trois blocs : ce que vous pouvez supporter (horizon, objectif, tolérance, réserve) · ce que vous connaissez (expérience, quatre vérifications) · ce que vous pouvez engager (revenus, épargne, réserve, engagements, situation), en fourchettes.")}</div>
    </div>
  );
}
