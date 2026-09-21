"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * A diagnostic for the phone, opened with `?debug=bar`: which elements sit
 * above the bottom tab bar at three points of it (left, middle, right). The
 * list is printed in a small box so a reader can send it back as is.
 */
export function BarProbe() {
  const sp = useSearchParams();
  const on = sp.get("debug") === "bar";
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    if (!on) return;
    const probe = () => {
      const y = window.innerHeight - 28;
      const out: string[] = [`viewport ${window.innerWidth}×${window.innerHeight} · scroll ${Math.round(window.scrollY)}`];
      for (const x of [24, Math.round(window.innerWidth / 2), window.innerWidth - 24]) {
        const stack = document.elementsFromPoint(x, y).slice(0, 4);
        out.push(`x=${x}: ` + stack.map((e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0].replace(/-module__\w+__/, ".") : ""}`).join(" > "));
      }
      const fixed = [...document.querySelectorAll<HTMLElement>("body *")].filter((e) => {
        const cs = getComputedStyle(e);
        if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") return false;
        const r = e.getBoundingClientRect();
        return r.bottom > window.innerHeight - 60 && r.width > 0 && r.height > 0;
      });
      out.push("fixed near the bar: " + (fixed.map((e) => `${e.tagName.toLowerCase()}.${(e.className || "").toString().split(" ")[0].replace(/-module__\w+__/, ".")} z=${getComputedStyle(e).zIndex} bg=${getComputedStyle(e).backgroundColor}`).join(" | ") || "none"));
      setLines(out);
    };
    probe();
    const id = window.setInterval(probe, 1500);
    return () => window.clearInterval(id);
  }, [on]);
  if (!on || !lines.length) return null;
  return (
    <pre style={{ position: "fixed", left: 8, right: 8, top: 60, zIndex: 9999, background: "rgba(255,255,255,.96)", color: "#111", fontSize: 10, lineHeight: 1.35, padding: 8, borderRadius: 8, whiteSpace: "pre-wrap", overflowWrap: "anywhere", border: "1px solid #999", maxHeight: "50vh", overflow: "auto" }}>
      {lines.join("\n")}
    </pre>
  );
}
