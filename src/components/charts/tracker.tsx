"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import styles from "./tracker.module.css";

/**
 * LE SUIVI D'UN GRAPHIQUE, PARTAGÉ PAR TOUTE LA PLATEFORME : le point le plus
 * proche du pointeur, un bandeau de hauteur fixe AU-DESSUS du tracé, et deux
 * épingles qui posent une période. Au doigt, le premier toucher lit, le second
 * sur le même point épingle. Le graphique garde son dessin ; il pose
 * `handlers` sur son <svg>, dessine <TrackMarks>, et écrit <TrackBand>.
 *
 * LA BULLE EST PARTIE, le 5 octobre 2026. Mesurée au téléphone sur l'indice :
 * 240 × 90 px dans un tracé de 313 × 235, soit 30 % du dessin, et le doigt
 * (44 px) se posait dessus. La bulle se place à côté du point, donc SUR la
 * courbe, et le doigt se place sur le point : à deux, ils cachaient l'endroit
 * exact qu'on cherchait à lire.
 *
 * TROIS CHOSES TIENNENT LE BANDEAU, et chacune répond à un défaut constaté :
 *
 *   - Il est là AVANT le geste. Au repos il donne le dernier point, donc la
 *     page se lit sans qu'on la touche, ce que le graphique d'hier ne faisait
 *     pas : il fallait poser un doigt pour connaître la dernière valeur.
 *   - Sa hauteur est FIXE. S'il apparaissait au toucher, ou s'il grandissait
 *     d'une ligne en cours de glissement, le tracé descendrait sous le doigt et
 *     le point lu changerait tout seul.
 *   - Il tient trois zones et pas une de plus : quand, combien, de combien ça
 *     a bougé. Ce qui ne tient pas descend sous le graphique ; une bulle de six
 *     lignes n'était pas lue, elle était subie.
 */
export interface TrackerArgs {
  /** One key per point, in drawing order (a date, usually). */
  keys: string[];
  /** x d'un point en unités du viewBox. Le y ne sert plus : le bandeau ne se
   *  place pas, il est posé au-dessus du tracé. */
  x: (i: number) => number;
  W: number;
  /** The pinned keys the chart is given (none, one, or two, sorted). */
  pins?: string[];
  onPin?: (key: string) => void;
  /** A range drawn in one gesture (long press, then drag) : both pins at once. */
  onRange?: (a: string, b: string) => void;
}

export function useTracker<E extends Element = SVGSVGElement>({ keys, x, W, pins = [], onPin, onRange }: TrackerArgs) {
  /* Générique sur son élément : le suivi se pose sur un <svg> dans la plupart
     des graphiques, et sur le bloc qui enveloppe trois étages quand un seul
     geste doit les désigner tous. */
  const svgRef = useRef<E>(null);
  const [hover, setHover] = useState<number | null>(null);
  // the finger : where it landed, whether it moved, whether the long press turned the drag into a range
  const touch = useRef<{ id: number; x0: number; i0: number; moved: boolean; range: boolean; wasReading: boolean; timer: number | null } | null>(null);
  const nearest = (clientX: number, svg: E) => {
    const r = svg.getBoundingClientRect();
    if (r.width < 1) return hover ?? 0; // not laid out (a closed fold, a hidden tab) : keep what was read
    const px = ((clientX - r.left) / r.width) * W;
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < keys.length; i++) {
      const d = Math.abs(x(i) - px);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  };
  /* Le bandeau ne se place pas : il est déjà posé, à sa hauteur, au-dessus du
     tracé. Lire un point ne fait donc plus que dire LEQUEL. */
  const show = (i: number) => setHover(i);
  const hide = () => setHover(null);
  // a reading stays after the finger lifts : it closes on the next touch or click elsewhere, on a scroll, or on Escape
  useEffect(() => {
    if (hover == null) return;
    const outside = (e: Event) => {
      const el = svgRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      setHover(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setHover(null);
    const onScroll = () => setHover(null);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [hover]);
  const clearTimer = () => {
    if (touch.current?.timer) window.clearTimeout(touch.current.timer);
  };
  const handlers = {
    ref: svgRef,
    onPointerDown: (e: React.PointerEvent<E>) => {
      if (e.pointerType !== "touch") return;
      const svg = e.currentTarget;
      const i = nearest(e.clientX, svg);
      clearTimer();
      touch.current = { id: e.pointerId, x0: e.clientX, i0: i, moved: false, range: false, wasReading: hover === i, timer: null };
      try {
        svg.setPointerCapture(e.pointerId);
      } catch {
        /* an old browser : the drag still follows while the finger stays on the chart */
      }
      show(i);
      if (onRange) {
        touch.current.timer = window.setTimeout(() => {
          if (touch.current && !touch.current.moved) {
            touch.current.range = true;
            onRange(keys[i], keys[i]);
            if (navigator.vibrate) navigator.vibrate(12);
          }
        }, 420);
      }
    },
    onPointerMove: (e: React.PointerEvent<E>) => {
      if (e.pointerType !== "touch") {
        show(nearest(e.clientX, e.currentTarget));
        return;
      }
      const tch = touch.current;
      if (!tch || tch.id !== e.pointerId) return;
      if (Math.abs(e.clientX - tch.x0) > 6) {
        if (!tch.moved) {
          tch.moved = true;
          if (!tch.range) clearTimer();
        }
      }
      const i = nearest(e.clientX, e.currentTarget);
      show(i);
      if (tch.range && onRange) {
        const [p, q] = [keys[tch.i0], keys[i]].sort();
        onRange(p, q);
      }
    },
    onPointerUp: (e: React.PointerEvent<E>) => {
      if (e.pointerType !== "touch") return;
      const tch = touch.current;
      clearTimer();
      touch.current = null;
      if (!tch) return;
      // a tap on the point already read pins it ; a tap elsewhere or a scrub leaves the reading
      if (!tch.moved && !tch.range && tch.wasReading && onPin) onPin(keys[tch.i0]);
    },
    onPointerCancel: () => {
      clearTimer();
      touch.current = null;
    },
    onPointerLeave: (e: React.PointerEvent<E>) => {
      if (e.pointerType !== "touch") hide();
    },
    onClick: (e: React.MouseEvent<E>) => {
      // the mouse : a click pins ; the finger's taps are handled above (its click follows and is ignored)
      if (touch.current || e.nativeEvent.detail === 0 || (e.nativeEvent as PointerEvent).pointerType === "touch") return;
      if (onPin) onPin(keys[nearest(e.clientX, e.currentTarget)]);
    },
  };
  const pinA = pins[0] && keys.includes(pins[0]) ? pins[0] : undefined;
  const pinB = pins[1] && keys.includes(pins[1]) ? pins[1] : undefined;
  return { handlers, hover, pinA, pinB, hide };
}

/** Toggle a key in a pins list : one, then two (sorted), a third starts over. */
export const togglePin = (cur: string[], key: string): string[] => (cur.includes(key) ? cur.filter((d) => d !== key) : cur.length >= 2 ? [key] : [...cur, key].sort());

/** The crosshair, the pins and the pinned range, drawn inside the chart's <svg>. */
export function TrackMarks({ x, y, hover, pinA, pinB, padT, padB, H }: { x: (key: string) => number; y: (key: string) => number; hover?: string; pinA?: string; pinB?: string; padT: number; padB: number; H: number }) {
  return (
    <>
      {pinA && pinB && <rect x={x(pinA)} y={padT} width={Math.max(0, x(pinB) - x(pinA))} height={H - padT - padB} className={styles.range} />}
      {[pinA, pinB].filter((d): d is string => Boolean(d)).map((d) => (
        <g key={d} className={styles.pin}>
          <line x1={x(d)} x2={x(d)} y1={padT} y2={H - padB} />
          <circle cx={x(d)} cy={y(d)} r={5} />
        </g>
      ))}
      {hover && (
        <g className={styles.cross}>
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} />
          <circle cx={x(hover)} cy={y(hover)} r={4} />
        </g>
      )}
    </>
  );
}

/** Une série dans le bandeau : la pastille de sa courbe, son nom, sa valeur. */
export interface SerieLue {
  /** La couleur de la courbe, quand le graphique la connaît en clair. */
  couleur?: string;
  /** Ou la classe qui la porte, quand elle vient d'une feuille de style. */
  classe?: string;
  nom: React.ReactNode;
  valeur: React.ReactNode;
}

/**
 * CE QUE LE BANDEAU DIT D'UN POINT. Trois zones, deux lignes chacune au plus :
 * la date à gauche avec ce qu'elle est (« dernière séance », « séance lue »,
 * « épinglé »), la valeur au milieu, les écarts à droite. Un graphique qui
 * voudrait une septième ligne doit choisir : c'est la contrainte qui fait
 * qu'on lit le bandeau d'un coup d'œil.
 */
export interface Lu {
  quand: React.ReactNode;
  dit?: React.ReactNode;
  valeur?: React.ReactNode;
  /** Sous la valeur, en petit : une précision qui n'est pas un écart. */
  sous?: React.ReactNode;
  /** À droite, deux lignes au plus ; au-delà, c'est un tableau. */
  droite?: React.ReactNode[];
  /** À la place de la valeur : une ligne par série, trois au plus. */
  series?: SerieLue[];
}

/**
 * LE BANDEAU, AU-DESSUS DU TRACÉ, TOUJOURS LÀ.
 *
 * Sa hauteur ne bouge pas : `height` fixe et débordement caché, pas
 * `min-height`. Une ligne de trop ferait descendre le tracé sous le doigt
 * pendant la lecture, et le point désigné changerait sans que la main bouge.
 */
export function TrackBand({ lu, mince, onClear, clearLabel }: { lu: Lu; /** Un trace de 96 px : le bandeau tient alors sur une seule ligne. */ mince?: boolean; onClear?: () => void; clearLabel?: string }) {
  return (
    <div className={`${styles.band} ${mince ? styles.bandMince : ""}`}>
      <span className={styles.bWhen}>
        <b>{lu.quand}</b>
        {lu.dit ? <small>{lu.dit}</small> : null}
      </span>
      {lu.series ? (
        <span className={styles.bSeries}>
          {lu.series.slice(0, 3).map((s, i) => (
            <span key={i} className={styles.bSerie}>
              <i className={s.classe} style={s.couleur ? { background: s.couleur } : undefined} />
              <b>{s.nom}</b>
              <span>{s.valeur}</span>
            </span>
          ))}
        </span>
      ) : (
        <span className={styles.bVal}>
          <b>{lu.valeur}</b>
          {lu.sous ? <small>{lu.sous}</small> : null}
        </span>
      )}
      {lu.droite && lu.droite.length > 0 ? (
        <span className={styles.bRight}>
          {lu.droite.slice(0, 2).map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </span>
      ) : null}
      {onClear && (
        <button type="button" className={styles.bClear} onClick={onClear} title={clearLabel} aria-label={clearLabel}>
          ×
        </button>
      )}
    </div>
  );
}

/** A range line under a chart : « du … au … : … », with a clear button. */
export function RangeRead({ children, onClear, clearLabel }: { children: React.ReactNode; onClear?: () => void; clearLabel: string }) {
  return (
    <p className={styles.read}>
      {children}
      {onClear && (
        <button type="button" className={styles.clear} onClick={onClear}>
          {clearLabel}
        </button>
      )}
    </p>
  );
}

export { styles as trackStyles };
