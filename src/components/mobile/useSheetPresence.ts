"use client";

import { useEffect, useState } from "react";

/**
 * A sheet is in the DOM only while it is open, plus the moment its closing
 * animation takes: fifty cards each with a fixed scrim and sheet in the page
 * were fifty full-screen layers for Safari to composite, and the hidden
 * scrims flashed as a dark band over the tab bar while the viewport moved.
 * `shown`: render it; `visible`: give it its open classes (one frame after
 * mounting, so the slide-in plays).
 */
export function useSheetPresence(open: boolean, ms = 300): { shown: boolean; visible: boolean } {
  const [shown, setShown] = useState(open);
  const [visible, setVisible] = useState(open);
  useEffect(() => {
    if (open) {
      const a = window.setTimeout(() => setShown(true), 0);
      // a beat after mounting (a timer, not a frame: a hidden tab still gets there), so the slide-in plays
      const b = window.setTimeout(() => setVisible(true), 20);
      return () => {
        window.clearTimeout(a);
        window.clearTimeout(b);
      };
    }
    const a = window.setTimeout(() => setVisible(false), 0);
    const b = window.setTimeout(() => setShown(false), ms);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [open, ms]);
  return { shown, visible };
}
