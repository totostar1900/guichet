"use client";

import { type RefObject, useEffect, useSyncExternalStore } from "react";

/**
 * Charts are SVGs scaled to their column: on a phone the same drawing is a
 * third of its desktop size, so labels must be drawn bigger there. One
 * media query, read the React way.
 */
const QUERY = "(max-width: 760px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
export const usePhone = (): boolean => useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);

/** A bubble opened by a touch closes on the next tap anywhere outside the chart. */
export function useOutsideTap(ref: RefObject<Element | null>, active: boolean, dismiss: () => void) {
  useEffect(() => {
    if (!active) return;
    const onTap = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      dismiss();
    };
    document.addEventListener("touchstart", onTap, { passive: true });
    document.addEventListener("mousedown", onTap);
    return () => {
      document.removeEventListener("touchstart", onTap);
      document.removeEventListener("mousedown", onTap);
    };
  }, [ref, active, dismiss]);
}

/** Label size and left margin per character, for a 320-unit-wide frame. */
export const labelMetrics = (phone: boolean) => (phone ? { font: 9.5, perChar: 5.3 } : { font: 6.4, perChar: 3.6 });
