import Link from "next/link";
import { amountFlag, CAPACITY_LABEL, CONFIDENCE_LABEL, INVESTABLE_LABEL, KNOWLEDGE_LABEL, PROFILE_LABEL, toCover, type FinancialProfile } from "@/data/profile";
import type { Lang } from "@/i18n/core";
import { fmt, fmtDate } from "@/lib/format";
import styles from "./ProfileCard.module.css";

/**
 * The client's financial profile as the desk reads it, on the intent page and
 * in the client file: the word and its horizon, what the client knows and
 * what a call should cover first (the verifications missed, with their
 * lessons), what they said they can commit, and, given an amount, its share
 * of the savings declared for the year. Bands and words only, as the client
 * saw them: the desk and the client read the same thing.
 */
export function ProfileCard({ profile, lang, t, amount }: { profile: FinancialProfile | undefined; lang: Lang; t: (s: string, p?: Record<string, string | number>) => string; amount?: number }) {
  if (!profile) {
    return (
      <p className={styles.none}>
        {t("Pas encore de profil financier : proposez-le au client, cinq minutes sur son téléphone.")}{" "}
        <span className="muted">{t("Mon espace › Mon profil.")}</span>
      </p>
    );
  }
  const p = profile;
  const [, max] = p.horizonYears;
  const horizon = max === 99 ? t("plus de 5 ans") : t("{a} à {b} ans", { a: p.horizonYears[0], b: max });
  const cover = toCover(p);
  const share = amount ? amountFlag(p, amount) : null;
  const v2 = p.version === 2;
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <b>
          {PROFILE_LABEL[p.kind][lang]} · {t("horizon")} {horizon}
        </b>
        <small>
          {p.confidence ? CONFIDENCE_LABEL[p.confidence][lang] : t("Déclaré")} · {fmtDate(p.updatedAt, false)}
          {p.capped ? ` · ${t("appétit dynamique, tenu par la réserve")}` : ""}
        </small>
      </div>
      <dl className={styles.kv}>
        <dt>{t("Connaît")}</dt>
        <dd>
          {p.knowledge ? KNOWLEDGE_LABEL[p.knowledge][lang] : `${Math.round(p.measures.knowledge * 4)} / 4`}
          {v2 ? ` · ${t("{n} / 4 vérifiées", { n: p.verified ?? 0 })}${p.lessonsRead ? ` · ${t("{n} leçons lues", { n: p.lessonsRead })}` : ""}` : ""}
        </dd>
        <dt>{t("Peut engager")}</dt>
        <dd>
          {p.capacity ? CAPACITY_LABEL[p.capacity][lang] : p.measures.capacity <= 0.25 ? t("limitée") : p.measures.capacity <= 0.5 ? t("moyenne") : t("bonne")}
          {p.investable != null ? ` · ${t("épargne à placer")} : ${INVESTABLE_LABEL[p.investable][lang]}` : ""}
        </dd>
        <dt>{t("Tolérance")}</dt>
        <dd>{p.measures.tolerance <= 0.25 ? t("faible") : p.measures.tolerance <= 0.5 ? "−10 %" : t("forte")}</dd>
        {share && (
          <>
            <dt>{t("Ce montant")}</dt>
            <dd className={share.level === "warn" ? styles.warn : undefined}>
              {fmt(amount!)} FCFA · {Math.round(share.share * 100)} % {t("de l'épargne déclarée")} · {share[lang]}
            </dd>
          </>
        )}
      </dl>
      {v2 && (
        <div className={styles.cover}>
          <b>{cover.length > 0 ? t("À couvrir à l'appel") : t("Les quatre bases sont sues")}</b>
          {cover.length > 0 && (
            <ul>
              {cover.map((c) => (
                <li key={c.key}>
                  {c[lang]}
                  <Link href={`/info/${c.lesson}`} target="_blank" rel="noopener">
                    {t("leçon")} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
