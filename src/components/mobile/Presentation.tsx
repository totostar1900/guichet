"use client";

import { useT } from "@/i18n/client";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Presentation.module.css";

/**
 * « Guichet en trente secondes » : five screens of six seconds for whoever
 * arrives knowing nothing. What Guichet is, then the four gestures: voir,
 * dire, parler, suivre. On the phone a full-screen story, bars on top,
 * a tap on the right two thirds goes forward, on the left third back, a
 * finger held pauses, « Passer » leaves. On a wide screen the same screens
 * in two columns, the drawing on the left, the four steps lighting up on
 * the right. Shown once per device before « Premiers pas », replayable from
 * the Guide and the sign-in page. SVG + CSS only: nothing to host.
 */
const SEEN = "guichet:presented";
const STEP_MS = 6000;

interface Screen {
  kick: string;
  title: string;
  text: string;
  art: React.ReactNode;
}

const Art1 = () => (
  <svg viewBox="0 0 300 180" aria-hidden="true">
    <rect x="30" y="30" width="240" height="120" rx="14" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" className={styles.draw} />
    <g className={styles.pop}>
      <circle cx="90" cy="90" r="26" fill="#d4a63c" />
      <text x="90" y="97" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0d2b5b">
        %
      </text>
    </g>
    <g className={styles.rise2}>
      <rect x="140" y="62" width="110" height="12" rx="6" fill="rgba(255,255,255,.35)" />
      <rect x="140" y="84" width="80" height="12" rx="6" fill="rgba(255,255,255,.25)" />
      <rect x="140" y="106" width="95" height="12" rx="6" fill="rgba(255,255,255,.25)" />
    </g>
  </svg>
);
const Art2 = () => (
  <svg viewBox="0 0 300 180" aria-hidden="true">
    <g className={styles.rise}>
      <rect x="30" y="34" width="240" height="112" rx="12" fill="#fff" />
      <text x="48" y="70" fontSize="26" fontWeight="800" fill="#8a6a1d">
        11,26 %
      </text>
      <text x="48" y="90" fontSize="10" fill="#6b7386">
        actuariel · si servi à 94 %
      </text>
      <rect x="48" y="104" width="60" height="8" rx="4" fill="#e3e7ee" />
      <rect x="120" y="104" width="60" height="8" rx="4" fill="#e3e7ee" />
      <rect x="192" y="104" width="60" height="8" rx="4" fill="#e3e7ee" />
    </g>
    <g className={styles.pop}>
      <circle cx="236" cy="62" r="14" fill="#0d2b5b" />
      <text x="236" y="67" textAnchor="middle" fontSize="13" fontWeight="800" fill="#d4a63c">
        i
      </text>
    </g>
    {/* the bubble a touch on « i » opens: kept inside the drawing, its text short enough for the box */}
    <g className={styles.rise3}>
      <rect x="118" y="122" width="164" height="44" rx="8" fill="#fff4d6" />
      <text x="128" y="140" fontSize="9" fontWeight="700" fill="#8a6a1d">
        Rendement actuariel
      </text>
      <text x="128" y="154" fontSize="8" fill="#4a5266">
        ce que rapporte la ligne, par an
      </text>
    </g>
  </svg>
);
const Art3 = () => (
  <svg viewBox="0 0 300 180" aria-hidden="true">
    <g className={styles.rise}>
      <rect x="40" y="26" width="220" height="30" rx="8" fill="#fff" />
      <text x="52" y="46" fontSize="11" fill="#16213a">
        10 000 000 FCFA
      </text>
      <rect x="40" y="66" width="220" height="30" rx="8" fill="#fff" />
      <text x="52" y="86" fontSize="11" fill="#6b7386">
        +237 6 87 67 67 67
      </text>
    </g>
    <g className={styles.rise2}>
      <rect x="40" y="110" width="220" height="34" rx="17" fill="#d4a63c" />
      <text x="150" y="132" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0d2b5b">
        Déclarer une intention
      </text>
    </g>
    <g className={styles.pop}>
      <circle cx="150" cy="164" r="9" fill="#fff" />
      <path d="M145 164l4 4 7-7" fill="none" stroke="#2f7d4f" strokeWidth="2" />
    </g>
  </svg>
);
const Art4 = () => (
  <svg viewBox="0 0 300 180" aria-hidden="true">
    <g className={styles.rise}>
      <circle cx="90" cy="80" r="34" fill="#fff" />
      <circle cx="90" cy="70" r="12" fill="#0d2b5b" />
      <path d="M66 106c4-14 14-20 24-20s20 6 24 20" fill="#0d2b5b" />
    </g>
    <g className={styles.rise2}>
      <circle cx="210" cy="80" r="34" fill="#fff" />
      <circle cx="210" cy="70" r="12" fill="#8a6a1d" />
      <path d="M186 106c4-14 14-20 24-20s20 6 24 20" fill="#8a6a1d" />
    </g>
    <path d="M128 80h44" stroke="#d4a63c" strokeWidth="3" strokeDasharray="6 6" className={styles.pulse} />
    <g className={styles.pop}>
      <rect x="110" y="120" width="80" height="26" rx="13" fill="#2f7d4f" />
      <text x="150" y="137" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">
        On vous rappelle
      </text>
    </g>
  </svg>
);
const Art5 = () => (
  <svg viewBox="0 0 300 180" aria-hidden="true">
    {[
      ["Intention reçue", 30],
      ["Ordre exécuté · 1 000 titres", 62],
      ["Relevé du 30 sept. · PDF", 94],
    ].map(([label, y], k) => (
      <g key={label} className={k === 0 ? styles.rise : k === 1 ? styles.rise2 : styles.rise3}>
        <rect x="40" y={y} width="220" height="24" rx="6" fill="#fff" />
        <text x="52" y={Number(y) + 16} fontSize="10" fill="#16213a">
          {label}
        </text>
        <path d={`M232 ${Number(y) + 12}l4 4 8-8`} fill="none" stroke="#2f7d4f" strokeWidth="2.5" strokeDasharray="40" className={styles.tick} />
      </g>
    ))}
    {/* the one « Commencer » of the last screen: drawn in the picture, and a real button (the scene listens for data-start) */}
    <g className={`${styles.pop} ${styles.start}`} data-start role="button" tabIndex={0}>
      <rect x="40" y="130" width="220" height="30" rx="15" fill="#d4a63c" />
      <text x="150" y="150" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0d2b5b">
        Commencer
      </text>
    </g>
  </svg>
);

const SCREENS: Screen[] = [
  { kick: "Guichet · Purpose Capital", title: "Le marché de la CEMAC, sur votre téléphone.", text: "Obligations des Trésors, actions cotées à la BVMAC, fonds : tout ce qui se place dans la zone, au même endroit.", art: <Art1 /> },
  { kick: "1 · Voir", title: "Chaque chiffre est expliqué, la décision reste la vôtre.", text: "Le rendement, le coupon, la clôture, le ticket : un « i » à côté de chaque mot, et une fiche par ligne avec ses risques écrits noir sur blanc.", art: <Art2 /> },
  { kick: "2 · Dire", title: "Vous dites ce que vous voulez faire.", text: "Un montant, vos coordonnées, un récapitulatif. C'est une intention, que le desk reçoit : l'ordre vient après, avec un conseiller.", art: <Art3 /> },
  { kick: "3 · Parler", title: "Un conseiller vous rappelle avant tout engagement.", text: "Rien n'est débité sans votre accord. Le règlement se fait par virement, sur le compte de l'appel de fonds que vous recevez.", art: <Art4 /> },
  { kick: "4 · Suivre", title: "Vos ordres, vos titres, vos documents : Mon espace.", text: "Chaque étape vous est notifiée ; relevés et avis se téléchargent ; vos parts sont à votre nom chez le dépositaire.", art: <Art5 /> },
];
const STEPS: [string, string][] = [
  ["Voir", "chaque chiffre expliqué, la décision reste la vôtre"],
  ["Dire", "une intention, pas un ordre"],
  ["Parler", "un conseiller vous rappelle avant tout engagement"],
  ["Suivre", "ordres, titres, documents dans Mon espace"],
];

export function Presentation({ force = false, onClose }: { force?: boolean; onClose?: () => void }) {
  const t = useT();
  const path = usePathname();
  const [open, setOpen] = useState(force);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const hold = useRef<{ timer: number; held: boolean } | null>(null);

  // Once per device, on a client page, after a moment; « Premiers pas » waits for this one to close.
  useEffect(() => {
    if (force) return;
    if (path.startsWith("/desk") || path.startsWith("/connexion") || path.startsWith("/auth")) return;
    const timer = setTimeout(() => {
      try {
        if (!localStorage.getItem(SEEN)) setOpen(true);
      } catch {
        // storage unavailable: never nag
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [force, path]);

  const close = useCallback(() => {
    try {
      localStorage.setItem(SEEN, new Date().toISOString());
    } catch {
      // storage unavailable
    }
    setOpen(false);
    onClose?.();
  }, [onClose]);

  // The clock: six seconds a screen, the last one waits for the reader.
  useEffect(() => {
    if (!open || paused || i === SCREENS.length - 1) return;
    const timer = setTimeout(() => setI((k) => Math.min(k + 1, SCREENS.length - 1)), STEP_MS);
    return () => clearTimeout(timer);
  }, [open, paused, i]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((k) => Math.min(k + 1, SCREENS.length - 1));
      if (e.key === "ArrowLeft") setI((k) => Math.max(k - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;
  const s = SCREENS[i];
  const last = i === SCREENS.length - 1;
  const next = () => (last ? close() : setI(i + 1));
  const back = () => setI(Math.max(i - 1, 0));
  // A tap: right two thirds forward, left third back (as a status). A finger held pauses; its release is not a tap.
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    hold.current = { timer: window.setTimeout(() => { if (hold.current) hold.current.held = true; setPaused(true); }, 220), held: false };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!hold.current) return;
    window.clearTimeout(hold.current.timer);
    const held = hold.current.held;
    hold.current = null;
    setPaused(false);
    if (held || (e.target as HTMLElement).closest("button, a")) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX - r.left < r.width / 3) back();
    else next();
  };
  const onPointerCancel = () => {
    if (hold.current) window.clearTimeout(hold.current.timer);
    hold.current = null;
    setPaused(false);
  };
  return (
    <div className={styles.veil} role="dialog" aria-modal="true" aria-label={t("Guichet en trente secondes")}>
      <div className={styles.story} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onPointerLeave={onPointerCancel}>
        <div className={styles.bars} aria-hidden="true">
          {SCREENS.map((_, k) => (
            <i key={k} className={k < i ? styles.done : k === i ? styles.run : undefined} style={{ ["--ms" as string]: `${STEP_MS}ms`, animationPlayState: paused ? "paused" : "running" }}>
              <b style={{ animationPlayState: paused ? "paused" : "running" }} />
            </i>
          ))}
        </div>
        <button type="button" className={styles.skip} onClick={close}>
          {t("Passer")} ›
        </button>
        <div className={styles.scene} key={i}>
          <div className={styles.pic}>
            <span className={`${styles.kick} ${styles.rise}`}>{t(s.kick)}</span>
            <h2 className={styles.rise2}>{t(s.title)}</h2>
            <p className={styles.rise3}>{t(s.text)}</p>
            <div className={styles.art} onClick={(e) => (e.target as Element).closest("[data-start]") && close()} onKeyDown={(e) => e.key === "Enter" && (e.target as Element).closest("[data-start]") && close()}>
              {s.art}
            </div>
          </div>
          <div className={styles.steps}>
            <h3>{t("En quatre gestes")}</h3>
            {STEPS.map(([name, what], k) => (
              <button key={name} type="button" className={`${styles.step} ${k + 1 === i ? styles.on : k + 1 < i ? styles.doneStep : ""}`} onClick={() => setI(k + 1)}>
                <i>{k + 1}</i>
                <span>
                  <b>{t(name)}</b>
                  {t(what)}
                </span>
              </button>
            ))}
            <div className={styles.deskCta}>
              <button type="button" className="btn primary" onClick={close}>
                {t("Voir les lignes")}
              </button>
              <span className={styles.hint}>{t("← → pour passer d'un écran à l'autre")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** « Guichet en 30 secondes ▶ » wherever the page wants it: the Guide (also from ?presentation=1), the sign-in page. */
export function ReplayPresentation({ className, label, fromQuery = false }: { className?: string; label?: string; fromQuery?: boolean }) {
  const [show, setShow] = useState(false);
  const t = useT();
  const sp = useSearchParams();
  const wanted = fromQuery && sp.get("presentation") === "1";
  useEffect(() => {
    if (!wanted) return;
    const id = setTimeout(() => setShow(true), 0);
    return () => clearTimeout(id);
  }, [wanted]);
  return (
    <>
      <button type="button" className={className ?? "btn sm"} onClick={() => setShow(true)}>
        {label ?? t("Guichet en 30 secondes")} ▶
      </button>
      {show && <Presentation force onClose={() => setShow(false)} />}
    </>
  );
}
