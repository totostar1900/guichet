"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import styles from "./PaletteSwitch.module.css";

/**
 * « Couleurs » in the ⋮ : the palette (four, all near the brand or neutral)
 * and the theme (auto · clair · sombre). Both stay on the device and are
 * applied before paint by the layout's inline script, so a page never
 * flashes in the wrong colours; here they are applied at once on <html>.
 */
export const PALETTES = [
  { key: "navy", fr: "Navy et or", en: "Navy and gold", a: "#0b2545", b: "#b8860b", paper: "#f6f7f9" },
  { key: "ivoire", fr: "Ivoire", en: "Ivory", a: "#0b2545", b: "#b8860b", paper: "#f7f3ea" },
  { key: "ardoise", fr: "Ardoise", en: "Slate", a: "#24303f", b: "#b8860b", paper: "#f4f5f7" },
  { key: "encre", fr: "Encre", en: "Ink", a: "#111827", b: "#b8860b", paper: "#f7f7f5" },
] as const;
const THEMES = ["auto", "light", "dark"] as const;
const P_KEY = "guichet:palette";
const T_KEY = "guichet:theme";
const EVENT = "guichet:colors";

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
const read = () => {
  try {
    return `${localStorage.getItem(P_KEY) ?? "navy"}|${localStorage.getItem(T_KEY) ?? "auto"}`;
  } catch {
    return "navy|auto";
  }
};
function apply(palette: string, theme: string) {
  const root = document.documentElement;
  if (palette === "navy") root.removeAttribute("data-palette");
  else root.setAttribute("data-palette", palette);
  if (theme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(P_KEY, palette);
    localStorage.setItem(T_KEY, theme);
  } catch {
    // storage unavailable: the choice lasts for this page
  }
  window.dispatchEvent(new Event(EVENT));
}

export function PaletteSwitch({ lang }: { lang: "fr" | "en" }) {
  const t = useT();
  const [palette, theme] = useSyncExternalStore(subscribe, read, () => "navy|auto").split("|");
  return (
    <div className={styles.wrap}>
      <div className={styles.row} role="group" aria-label={t("Palette")}>
        {PALETTES.map((p) => (
          <button key={p.key} type="button" className={`${styles.swatch} ${palette === p.key ? styles.on : ""}`} aria-pressed={palette === p.key} onClick={() => apply(p.key, theme)} title={p[lang]}>
            <i style={{ background: `linear-gradient(135deg, ${p.a} 50%, ${p.b} 50%)`, boxShadow: `inset 0 0 0 3px ${p.paper}` }} />
            <small>{p[lang]}</small>
          </button>
        ))}
      </div>
      <div className={styles.seg} role="group" aria-label={t("Thème")}>
        {THEMES.map((k) => (
          <button key={k} type="button" className={theme === k ? styles.segOn : ""} aria-pressed={theme === k} onClick={() => apply(palette, k)}>
            {t(k === "auto" ? "auto" : k === "light" ? "clair" : "sombre")}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The script the layout inlines in <head>: applies the device's choice before the first paint. */
export const PALETTE_BOOT = `(function(){try{var p=localStorage.getItem("${P_KEY}"),t=localStorage.getItem("${T_KEY}"),r=document.documentElement;if(p&&p!=="navy")r.setAttribute("data-palette",p);if(t==="light"||t==="dark")r.setAttribute("data-theme",t);}catch(e){}})();`;
