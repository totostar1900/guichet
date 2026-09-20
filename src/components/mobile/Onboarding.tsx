"use client";

import { useT } from "@/i18n/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./Onboarding.module.css";

/**
 * « Premiers pas » : six screens, one idea each, shown once per device on the
 * first visit (never on the desk or the login page), replayable from the Guide.
 * SVG + CSS only: nothing to host, nothing to load.
 */
const SEEN = "guichet:onboarded";
/** Dispatched to open the six screens from elsewhere (the presentation's last screen). */
export const OPEN_EVENT = "guichet:onboarding:open";

const SLIDES = [
  {
    title: "Toutes les opportunités de la zone CEMAC, à un endroit",
    text: "Emprunts des Trésors, introductions en bourse, obligations et actions cotées à la BVMAC, fonds. Chaque ligne avec son rendement, sa date, son minimum.",
    art: (
      <svg viewBox="0 0 200 170" aria-hidden="true">
        <g className={styles.a1}>
          <rect x="20" y="40" width="160" height="34" rx="8" fill="#fff" opacity=".95" />
          <rect x="30" y="50" width="70" height="6" rx="3" fill="#0b2545" />
          <rect x="30" y="61" width="40" height="5" rx="2" fill="#b8860b" />
          <text x="170" y="62" textAnchor="end" fontSize="13" fontWeight="800" fill="#8a6408">
            9,61 %
          </text>
        </g>
        <g className={styles.a2}>
          <rect x="20" y="84" width="160" height="34" rx="8" fill="#fff" opacity=".8" />
          <rect x="30" y="94" width="80" height="6" rx="3" fill="#0b2545" />
          <rect x="30" y="105" width="40" height="5" rx="2" fill="#b8860b" />
          <text x="170" y="106" textAnchor="end" fontSize="13" fontWeight="800" fill="#8a6408">
            7,84 %
          </text>
        </g>
        <g className={styles.a3}>
          <rect x="20" y="128" width="160" height="34" rx="8" fill="#fff" opacity=".65" />
          <rect x="30" y="138" width="60" height="6" rx="3" fill="#0b2545" />
          <rect x="30" y="149" width="40" height="5" rx="2" fill="#b8860b" />
          <text x="170" y="150" textAnchor="end" fontSize="13" fontWeight="800" fill="#8a6408">
            5,2 %
          </text>
        </g>
      </svg>
    ),
  },
  {
    title: "Trois marchés, trois façons d'acheter",
    text: "Titres réunit le marché primaire (vous souscrivez auprès de l'émetteur pendant une fenêtre) et le marché secondaire (vous achetez à un autre investisseur au cours du jour) : deux interrupteurs en haut de la page. Les fonds, souscrits à la prochaine valeur liquidative, ont leur propre page.",
    art: (
      <svg viewBox="0 0 200 170" aria-hidden="true">
        <rect x="10" y="60" width="55" height="50" rx="8" fill="#fff" />
        <text x="37" y="90" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0b2545">
          PRIMAIRE
        </text>
        <rect x="72" y="60" width="55" height="50" rx="8" fill="#fff" opacity=".85" />
        <text x="99" y="90" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0b2545">
          SECONDAIRE
        </text>
        <rect x="134" y="60" width="55" height="50" rx="8" fill="#fff" opacity=".7" />
        <text x="161" y="90" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0b2545">
          FONDS
        </text>
        <circle className={styles.mv} cx="37" cy="130" r="7" fill="#b8860b" />
        <text x="10" y="155" fontSize="9" fill="#b9c6da">
          neuf · échangé · géré
        </text>
      </svg>
    ),
  },
  {
    title: "Une intention n'est pas un ordre",
    text: "Vous dites ce que vous voulez ; le desk vous rappelle, confirme, puis transmet. Vous suivez chaque étape dans Mon espace. Rien n'est débité sans votre confirmation.",
    art: (
      <svg viewBox="0 0 200 170" aria-hidden="true">
        <g fontSize="9" fontWeight="700" fill="#0b2545">
          <rect x="10" y="70" width="34" height="26" rx="6" fill="#b8860b" />
          <text x="27" y="87" textAnchor="middle">
            Vous
          </text>
          <rect x="83" y="70" width="34" height="26" rx="6" fill="#fff" />
          <text x="100" y="87" textAnchor="middle">
            Desk
          </text>
          <rect x="156" y="70" width="34" height="26" rx="6" fill="#fff" />
          <text x="173" y="87" textAnchor="middle">
            Trésor
          </text>
        </g>
        <path d="M46 83h35M119 83h35" stroke="#b9c6da" strokeWidth="2" strokeDasharray="3 3" />
        <circle className={styles.mv} cx="52" cy="83" r="4" fill="#fff" />
        <text x="100" y="125" textAnchor="middle" fontSize="9" fill="#b9c6da">
          intention → appel → ordre transmis
        </text>
      </svg>
    ),
  },
  {
    title: "Ce qui bouge, expliqué en trois lignes",
    text: "Communiqués des Trésors, bulletins de la BVMAC, avis de la COSUMAF, presse : le desk retient ce qui compte pour vos lignes et dit pourquoi, en deux lignes. L'article reste chez son éditeur, à un clic.",
    art: (
      <svg viewBox="0 0 200 170" aria-hidden="true">
        <g className={styles.a1}>
          <rect x="16" y="28" width="168" height="52" rx="8" fill="#fbf1da" stroke="#b8860b" strokeWidth="1.5" />
          <text x="26" y="42" fontSize="7" fontWeight="800" fill="#8a6408" letterSpacing="1">
            À LA UNE
          </text>
          <rect x="26" y="48" width="120" height="6" rx="3" fill="#0b2545" />
          <rect x="26" y="58" width="96" height="6" rx="3" fill="#0b2545" />
          <rect x="26" y="69" width="36" height="5" rx="2" fill="#b8860b" />
          <rect x="66" y="69" width="70" height="5" rx="2" fill="#c9d3e3" />
          <text x="174" y="43" textAnchor="end" fontSize="9" fontWeight="800" fill="#0b2545">
            ↗
          </text>
        </g>
        <g className={styles.a2}>
          <rect x="16" y="90" width="168" height="34" rx="8" fill="#fff" opacity=".9" />
          <rect x="26" y="99" width="18" height="6" rx="3" fill="#2a5db0" />
          <rect x="50" y="99" width="90" height="6" rx="3" fill="#0b2545" />
          <rect x="26" y="111" width="30" height="5" rx="2" fill="#b8860b" />
          <rect x="60" y="111" width="80" height="5" rx="2" fill="#c9d3e3" />
        </g>
        <g className={styles.a3}>
          <rect x="16" y="132" width="168" height="34" rx="8" fill="#fff" opacity=".7" />
          <rect x="26" y="141" width="18" height="6" rx="3" fill="#b4600a" />
          <rect x="50" y="141" width="70" height="6" rx="3" fill="#0b2545" />
          <rect x="26" y="153" width="30" height="5" rx="2" fill="#b8860b" />
          <rect x="60" y="153" width="60" height="5" rx="2" fill="#c9d3e3" />
        </g>
      </svg>
    ),
  },
  {
    title: "Comprendre, et trouver de l'aide",
    text: "Le Guide explique chaque mot en une phrase, propose huit leçons de deux minutes et un simulateur. La page Aide répond à vos questions : se connecter, ouvrir un compte, lire une ligne, régler, nous joindre.",
    art: (
      <div className={styles.shotPair}>
        <div className={styles.shotFrame}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/guide/onboarding-info.png" alt="" loading="lazy" />
        </div>
        <div className={`${styles.shotFrame} ${styles.shotBack}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/guide/onboarding-aide.png" alt="" loading="lazy" />
        </div>
      </div>
    ),
  },
  {
    title: "Le desk répond sur WhatsApp",
    text: "Une question sur une ligne, un doute sur un chiffre : le bouton « Information » de chaque fiche ouvre la conversation. Les avis et relevés arrivent aussi là.",
    art: (
      <svg viewBox="0 0 200 170" aria-hidden="true">
        <rect x="55" y="30" width="90" height="110" rx="14" fill="#fff" />
        <rect x="70" y="50" width="60" height="8" rx="4" fill="#0b2545" />
        <rect x="70" y="66" width="40" height="6" rx="3" fill="#b8860b" />
        <rect x="70" y="92" width="60" height="6" rx="3" fill="#e5e7eb" />
        <rect x="70" y="104" width="46" height="6" rx="3" fill="#e5e7eb" />
        <circle className={styles.blink} cx="100" cy="128" r="6" fill="#1e7f4f" />
        <text x="100" y="160" textAnchor="middle" fontSize="9" fill="#b9c6da">
          WhatsApp · appel · e-mail
        </text>
      </svg>
    ),
  },
];

export function Onboarding({ force = false, onClose }: { force?: boolean; onClose?: () => void }) {
  const path = usePathname();
  const [open, setOpen] = useState(force);
  const [i, setI] = useState(0);
  // Never on its own: the thirty-second presentation is the one first-visit screen. These six open
  // when asked (the ⋮, the Guide, the presentation's last screen) through this event.
  useEffect(() => {
    if (force) return;
    if (path.startsWith("/desk") || path.startsWith("/connexion") || path.startsWith("/auth")) return;
    const on = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, on);
    return () => window.removeEventListener(OPEN_EVENT, on);
  }, [force, path]);
  const close = () => {
    try {
      localStorage.setItem(SEEN, new Date().toISOString());
    } catch {
      // storage unavailable
    }
    setOpen(false);
    onClose?.();
  };
  const t = useT();
  if (!open) return null;
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  return (
    <div className={styles.ob} role="dialog" aria-modal="true" aria-label={t("Premiers pas")}>
      <div className={styles.card}>
        <button type="button" className={styles.skip} onClick={close}>
          {t("Passer")}
        </button>
        <div className={styles.art} key={i}>
          {s.art}
        </div>
        <h2>{t(s.title)}</h2>
        <p>{t(s.text)}</p>
        <div className={styles.dots} aria-hidden="true">
          {SLIDES.map((_, k) => (
            <i key={k} className={k === i ? styles.on : undefined} />
          ))}
        </div>
        <button type="button" className={`btn ${styles.next}`} onClick={() => (last ? close() : setI(i + 1))}>
          {t(last ? "Ouvrir le Guichet" : "Continuer")}
        </button>
      </div>
    </div>
  );
}

/** « Revoir les premiers pas » on the Guide page. */
export function ReplayOnboarding() {
  const router = useRouter();
  const sp = useSearchParams();
  const [show, setShow] = useState(false);
  const t = useT();
  // The help search links here with ?premiers-pas=1.
  useEffect(() => {
    if (sp.get("premiers-pas") !== "1") return;
    const id = setTimeout(() => setShow(true), 0);
    return () => clearTimeout(id);
  }, [sp]);
  return (
    <>
      <button type="button" className="btn sm" onClick={() => setShow(true)}>
        {t("Revoir les premiers pas")}
      </button>
      {show && (
        <Onboarding
          force
          onClose={() => {
            setShow(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
