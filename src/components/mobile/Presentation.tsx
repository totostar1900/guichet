"use client";

import { useT } from "@/i18n/client";
import { deverrouiller, verrouiller } from "./verrou-defilement";
import Link from "next/link";
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
const STEP_MS = 7000;

interface Screen {
  kick: string;
  title: string;
  text: string;
  art: React.ReactNode;
}

/* UNE SEULE INTRO, ET ELLE PARLE DES BIENFAITS (14 novembre 2026, planche « vitrine et intro », option A) : quatre scènes qui disent à quoi sert Guichet, ce que le client y gagne et ce qui le protège.
   Elle remplace « Guichet en trente secondes » (le mode d'emploi en quatre gestes) ET « Premiers pas » (six écrans) : le mode d'emploi vit maintenant dans la vitrine (« Une fois votre
   compte ouvert, quatre gestes ») et dans le Guide. Aucun dessin ne porte un chiffre, un taux ou un montant : la règle de la vitrine tient, et la séquence se joue d'abord devant la porte. */
const Art1 = () => (
  <svg viewBox="0 0 300 180" aria-hidden="true">
    <rect x="30" y="24" width="240" height="132" rx="0" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" className={styles.draw} />
    <g className={styles.rise}>
      <circle cx="66" cy="58" r="14" fill="#d4a63c" />
      <rect x="92" y="50" width="130" height="10" rx="0" fill="rgba(255,255,255,.4)" />
      <rect x="92" y="66" width="86" height="8" rx="0" fill="rgba(255,255,255,.22)" />
    </g>
    <g className={styles.rise2}>
      <circle cx="66" cy="100" r="14" fill="rgba(255,255,255,.7)" />
      <rect x="92" y="92" width="110" height="10" rx="0" fill="rgba(255,255,255,.4)" />
      <rect x="92" y="108" width="72" height="8" rx="0" fill="rgba(255,255,255,.22)" />
    </g>
    <g className={styles.rise3}>
      <circle cx="66" cy="136" r="10" fill="rgba(255,255,255,.45)" />
      <rect x="92" y="130" width="96" height="8" rx="0" fill="rgba(255,255,255,.3)" />
    </g>
  </svg>
);
const Art2 = () => (
  <svg viewBox="0 0 300 180" aria-hidden="true">
    <g className={styles.rise}>
      <rect x="30" y="30" width="240" height="120" rx="0" fill="#fff" />
      <polyline points="46,120 84,106 122,112 160,80 198,90 236,58" fill="none" stroke="#b8860b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="46,130 100,122 154,112 208,104 254,96" fill="none" stroke="#0d2b5b" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" />
    </g>
    <g className={styles.pop}>
      <circle cx="244" cy="46" r="14" fill="#0d2b5b" />
      <text x="244" y="51" textAnchor="middle" fontSize="13" fontWeight="800" fill="#d4a63c">
        i
      </text>
    </g>
  </svg>
);
const Art3 = () => {
  const t = useT();
  return (
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
      <rect x="110" y="120" width="80" height="26" rx="0" fill="#2f7d4f" />
      <text x="150" y="137" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">
        {t("On vous rappelle")}
      </text>
    </g>
  </svg>
  );
};
const Art4 = () => (
  <svg viewBox="0 0 300 180" aria-hidden="true">
    <g className={styles.rise}>
      <path d="M150 22l78 24v46c0 36-30 62-78 78c-48-16-78-42-78-78V46z" fill="#fff" />
    </g>
    <path d="M114 94l26 26 48-52" fill="none" stroke="#2f7d4f" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="120" className={styles.tick} />
  </svg>
);

const SCREENS: Screen[] = [
  { kick: "Guichet · Purpose Capital", title: "Épargnez, prêtez, investissez : dans la zone, depuis votre téléphone.", text: "Obligations des Trésors, actions cotées à la BVMAC, fonds agréés : tout ce qui se place dans la zone, au même endroit.", art: <Art1 /> },
  { kick: "L'information", title: "Tout le marché, lu et expliqué.", text: "L'indice, la courbe des taux, les séances des Trésors, les sociétés et les fonds : le bureau lit et commente, et chaque mot a son « i ». Les chiffres s'ouvrent avec votre compte.", art: <Art2 /> },
  { kick: "À vos côtés", title: "Vous dites ce que vous voulez ; un conseiller vous rappelle avant tout engagement.", text: "C'est une intention, pas un ordre : rien n'est débité sans votre accord, et la décision reste la vôtre.", art: <Art3 /> },
  { kick: "En confiance", title: "Société de bourse agréée COSUMAF.", text: "Vos titres sont à votre nom, vos espèces séparées, et vous seul donnez les ordres. Tout placement comporte un risque de perte en capital.", art: <Art4 /> },
];
const STEPS: [string, string][] = [
  ["Vos ambitions", "épargner, prêter, investir, dans la zone"],
  ["L'information", "tout le marché, lu et expliqué"],
  ["À vos côtés", "un conseiller vous rappelle avant tout engagement"],
  ["En confiance", "agréée COSUMAF, vos titres à votre nom"],
];

export function Presentation({ force = false, onClose, visiteur = false }: { force?: boolean; onClose?: () => void; /** Pas de session : la séquence se joue d'abord devant la porte, sur la vitrine. */ visiteur?: boolean }) {
  const t = useT();
  const path = usePathname();
  const [open, setOpen] = useState(force);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const hold = useRef<{ timer: number; held: boolean } | null>(null);

  // Once per device, on a client page, after a moment; « Premiers pas » waits for this one to close.
  useEffect(() => {
    if (force) return;
    // UNE SEULE INTRO (14 novembre 2026) : elle se joue d'abord devant la porte, sur la vitrine, au premier passage d'un visiteur. Pour un client, la racine est sa console, et il n'a plus
    // rien à se faire présenter : elle l'attend alors sur la première autre page, une fois par appareil, comme avant.
    if ((path === "/" && !visiteur) || path.startsWith("/desk") || path.startsWith("/connexion") || path.startsWith("/auth")) return;
    const timer = setTimeout(() => {
      try {
        if (!localStorage.getItem(SEEN)) setOpen(true);
      } catch {
        // storage unavailable: never nag
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [force, path, visiteur]);

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
    verrouiller();
    return () => {
      document.removeEventListener("keydown", onKey);
      deverrouiller();
    };
  }, [open, close]);

  if (!open) return null;
  const s = SCREENS[i];
  const last = i === SCREENS.length - 1;
  const next = () => (last ? close() : setI(i + 1));
  const back = () => setI(Math.max(i - 1, 0));
  // A tap: right two thirds forward, left third back (as a status). A finger held pauses; its release is not a tap.
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, [data-start]")) return;
    hold.current = { timer: window.setTimeout(() => { if (hold.current) hold.current.held = true; setPaused(true); }, 220), held: false };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!hold.current) return;
    window.clearTimeout(hold.current.timer);
    const held = hold.current.held;
    hold.current = null;
    setPaused(false);
    if (held || (e.target as HTMLElement).closest("button, a, [data-start]")) return;
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
            {last &&
              (visiteur ? (
                <Link href="/connexion?creer=1" className={styles.more} onClick={close}>
                  {t("Créer mon compte")} →
                </Link>
              ) : (
                <button type="button" className={styles.more} onClick={close}>
                  {t("Voir les lignes")} →
                </button>
              ))}
          </div>
          <div className={styles.steps}>
            <h3>{t("Ce que Guichet vous apporte")}</h3>
            {STEPS.map(([name, what], k) => (
              <button key={name} type="button" className={`${styles.step} ${k === i ? styles.on : k < i ? styles.doneStep : ""}`} onClick={() => setI(k)}>
                <i>{k + 1}</i>
                <span>
                  <b>{t(name)}</b>
                  {t(what)}
                </span>
              </button>
            ))}
            <div className={styles.deskCta}>
              {visiteur ? (
                <Link href="/connexion?creer=1" className="btn primary" onClick={close}>
                  {t("Créer mon compte")}
                </Link>
              ) : (
                <button type="button" className="btn primary" onClick={close}>
                  {t("Voir les lignes")}
                </button>
              )}
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
