"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";
import { LineIdentity } from "./LineIdentity";
import { LineMenu } from "./mobile/LineMenu";
import { useDeskView, useLineHref } from "./DeskView";
import { SwipeActions } from "./mobile/SwipeActions";
import { CardBack } from "./mobile/CardBack";
import { backFacts } from "@/lib/domain/back";
import { useMemo, useRef } from "react";
import { famVars } from "@/lib/registry";
import { useDensity } from "./Density";
import { lieuDe } from "@/lib/domain/sections";
import styles from "./OfferCard.module.css";

const Turn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
    <path d="M18 3v4h-4M6 21v-4h4" />
  </svg>
);

/**
 * One number, three facts, one action. The « ··· » sits in the corner by
 * the status, « Voir la fiche » at the foot; on the phone the card pulls
 * left for « Déclarer » and « Me rappeler », and turns over (a pull to the
 * right) to show the four figures of the list, the ISIN and the closing.
 *
 * COMPACTE (le réglage du téléphone) : l'émetteur, sa promesse en gris, et à
 * droite le seul chiffre en avant avec son origine sous lui. Elle portait
 * jusqu'au 4 octobre 2026 une phrase de 89 caractères dans une place qui en
 * laisse 33, et le lecteur voyait « actuariel annuel brut au cours 9… » : les
 * qualificatifs passaient, « aucun échange relevé » et « coupon 6,60 % »
 * tombaient dans les points de suspension. Les trois champs courts viennent du
 * résumé, qui les compose avec l'heure du serveur (domain/carte-compacte.ts).
 *
 * LA PASTILLE DE STATUT DESCEND dans la ligne grise et ne remonte que
 * lorsqu'elle annonce un événement, une clôture proche : elle disait « Cotée »
 * sur presque toutes les cartes, et ce coin est la place la plus chère de
 * l'écran. LE « ··· » ET LE RETOURNEMENT RESTENT, dans une colonne à eux :
 * « Suivre » ne se fait nulle part ailleurs, et en compacte le dos est le seul
 * endroit où vivent les quatre autres chiffres.
 */
export function OfferCard({ o, s }: { o: Offer; s: OfferSummary }) {
  const href = useLineHref()(o.id);
  const desk = useDeskView();
  const t = useT();
  const compact = useDensity() === "compact";
  // « Clôture · jeu. 15 oct. 17 h 00 » on the card's foot; a listed line reads « cotation continue ».
  const continuous = s.deadline === "continue";
  const when = continuous ? t("cotation continue") : t(s.deadline);
  const whenLabel = continuous || !when ? null : <em className={styles.whenLabel}>{t("Clôture")}</em>;
  const more = useRef<(() => void) | null>(null);
  const turn = useRef<(() => void) | null>(null);
  const facts = useMemo(() => backFacts(o, new Date()), [o]);
  const menu = { id: o.id, title: o.title, isin: o.isin, sub: `${s.subtitle} · ${s.hero} ${s.heroUnit ?? ""}`.trim() };
  return (
    <SwipeActions
      id={o.id}
      turnRef={turn}
      /* Une seance se rappelle chaque jour jusqu a sa cloture, une ligne cotee
         se suit a chaque changement : deux marches, deux cadences. */
      cadence={lieuDe(o) === "adjudications" ? "quotidien" : "evenement"}
      backHead={
        <div className={styles.corner}>
          <span className={`pill ${s.statusClass}`}>{s.countdown ? s.countdown : t(s.status)}</span>
          <button type="button" className={styles.dotsBack} onClick={() => more.current?.()} aria-label={t("Plus d'actions")}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          <button type="button" className={styles.flipBtn} data-recto aria-label={t("Recto")} title={t("Recto")}>
            <Turn />
          </button>
        </div>
      }
      back={<CardBack facts={facts} figures={s.ledger.slice(1)} />}
    >
      {compact ? (
        <article data-coach="titres-carte" className={`${styles.card} ${styles.compact} ${s.past ? styles.past : ""}`} style={{ ["--card-c" as string]: `var(--fam-${s.family}, ${famVars(s.family)["--fam-c"] ?? "var(--line-2)"})` }}>
          <Link href={href} className={styles.cLink}>
            <span className={styles.cId}>
              <b className={styles.cCode}>{s.code}</b>
              <small className={styles.cSub}>{s.countdown ? <em className={styles.cClose}>{t("clôture dans {d}", { d: s.countdown })}</em> : t(s.promesse.key, s.promesse.params)}</small>
            </span>
            <span className={styles.cNum} data-coach="titres-chiffre">
              <b className={s.gold ? styles.gold : ""}>{s.hero}</b>
              <small>{t(s.origine.key, s.origine.params)}</small>
            </span>
          </Link>
          <span className={styles.cTools}>
            {!desk && <LineMenu line={menu} openRef={more} className={styles.cDots} />}
            <button type="button" data-coach="titres-retourner" className={styles.cFlip} onClick={() => turn.current?.()} aria-label={t("Retourner la carte")} title={t("Retourner la carte")}>
              <Turn />
            </button>
          </span>
        </article>
      ) : (
        <article data-coach="titres-carte" className={`${styles.card} ${s.past ? styles.past : ""}`} style={{ ["--card-c" as string]: `var(--fam-${s.family}, ${famVars(s.family)["--fam-c"] ?? "var(--line-2)"})` }}>
          <div className={styles.head}>
            <LineIdentity o={o} s={s} href={href} size="lg" />
            <div className={styles.corner}>
              <span className={`pill ${s.statusClass}`}>{s.countdown ? s.countdown : t(s.status)}</span>
              {!desk && <LineMenu line={menu} openRef={more} />}
              <button type="button" data-coach="titres-retourner" className={styles.flipBtn} onClick={() => turn.current?.()} aria-label={t("Retourner la carte")} title={t("Retourner la carte")}>
                <Turn />
              </button>
            </div>
          </div>
          <div className={styles.big}>
            <b className={s.gold ? styles.gold : ""}>{s.hero}</b>
            <small>{t(s.heroSub)}</small>
            <span className={styles.whenC}>
              {whenLabel}
              {when}
            </span>
          </div>
          <div className={styles.facts}>
            {s.facts.map(([k, v, note]) => (
              <div key={k}>
                <span>{t(k)}</span>
                <b>{v}</b>
                {note && <em>{t(note)}</em>}
              </div>
            ))}
          </div>
          <div className={styles.foot}>
            {/* « Cotation continue » se lisait ici ET dans la ligne grise sous
                le titre, à quatre lignes d'écart. Le pied ne garde que ce qui
                presse : la clôture d'une séance. Une ligne cotée n'en a pas. */}
            {!continuous && (
              <span className={styles.when}>
                {whenLabel}
                {when}
              </span>
            )}
            <Link className="btn sm" href={href}>
              {t("Voir la fiche")} →
            </Link>
          </div>
        </article>
      )}
    </SwipeActions>
  );
}
