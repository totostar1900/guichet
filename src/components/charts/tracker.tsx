"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import styles from "./tracker.module.css";

/**
 * The tracking of a time chart, shared by every chart of the platform : the
 * nearest point under the pointer, a bubble fixed to the viewport (never
 * clipped by a panel, kept inside the window, above the point near the
 * bottom), and two pins that set a range. On touch, the first tap reads,
 * the second on the same point pins. The chart keeps its own drawing ; it
 * spreads `handlers` on its <svg>, draws <TrackMarks>, and renders the
 * bubble with <TrackTip>.
 */
export interface TrackerArgs {
  /** One key per point, in drawing order (a date, usually). */
  keys: string[];
  /** x of a point in viewBox units, and y of the point at index i. */
  x: (i: number) => number;
  yAt: (i: number) => number;
  W: number;
  H: number;
  /** The pinned keys the chart is given (none, one, or two, sorted). */
  pins?: string[];
  onPin?: (key: string) => void;
  /** A range drawn in one gesture (long press, then drag) : both pins at once. */
  onRange?: (a: string, b: string) => void;
}

export function useTracker({ keys, x, yAt, W, H, pins = [], onPin, onRange }: TrackerArgs) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean } | null>(null);
  // the finger : where it landed, whether it moved, whether the long press turned the drag into a range
  const touch = useRef<{ id: number; x0: number; i0: number; moved: boolean; range: boolean; wasReading: boolean; timer: number | null } | null>(null);
  const nearest = (clientX: number, svg: SVGSVGElement) => {
    const r = svg.getBoundingClientRect();
    const px = ((clientX - r.left) / Math.max(1, r.width)) * W;
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
  const show = (i: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = r.left + (x(i) / W) * r.width;
    const py = r.top + (yAt(i) / H) * r.height;
    const half = 120;
    const cx = Math.min(window.innerWidth - half - 8, Math.max(half + 8, px));
    const above = py + 170 > window.innerHeight;
    setHover(i);
    setPos({ x: cx, y: above ? py - 12 : py + 14, above });
  };
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
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => {
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
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => {
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
    onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => {
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
    onPointerLeave: (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType !== "touch") hide();
    },
    onClick: (e: React.MouseEvent<SVGSVGElement>) => {
      // the mouse : a click pins ; the finger's taps are handled above (its click follows and is ignored)
      if (touch.current || e.nativeEvent.detail === 0 || (e.nativeEvent as PointerEvent).pointerType === "touch") return;
      if (onPin) onPin(keys[nearest(e.clientX, e.currentTarget)]);
    },
  };
  const pinA = pins[0] && keys.includes(pins[0]) ? pins[0] : undefined;
  const pinB = pins[1] && keys.includes(pins[1]) ? pins[1] : undefined;
  return { handlers, hover, pos, pinA, pinB, hide };
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

/** The bubble, fixed to the viewport, on the tip tokens (the inverse of the ground in every theme). */
export function TrackTip({ pos, children }: { pos: { x: number; y: number; above: boolean } | null; children: React.ReactNode }) {
  if (!pos) return null;
  return (
    <div className={`${styles.tip} ${pos.above ? styles.tipAbove : ""}`} style={{ left: pos.x, top: pos.y }} role="status">
      {children}
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
