/**
 * The palettes and the theme, shared by the server (which stamps <html> from
 * the cookies) and the client (the switch, the boot script). Four palettes,
 * all near the brand or neutral; the choice stays on the device.
 */
export const PALETTES = [
  { key: "navy", fr: "Navy et or", en: "Navy and gold", a: "#0b2545", b: "#b8860b", paper: "#eef2f8", line: "#b9c4d6", ink: "#3d5478" },
  { key: "ivoire", fr: "Ivoire", en: "Ivory", a: "#0b2545", b: "#b8860b", paper: "#efe4c9", line: "#cdbf9c", ink: "#6b5a38" },
  { key: "ardoise", fr: "Ardoise", en: "Slate", a: "#24303f", b: "#b8860b", paper: "#e3e7ec", line: "#b4bcc7", ink: "#3f4a58" },
  { key: "encre", fr: "Encre", en: "Ink", a: "#111827", b: "#b8860b", paper: "#eeede8", line: "#bdbcb4", ink: "#2b2f37" },
] as const;
export const THEMES = ["auto", "light", "dim", "dark"] as const;
export const P_KEY = "guichet:palette";
export const T_KEY = "guichet:theme";
/** The same choice in two cookies, so the server renders <html> with it: a navigation never resets the colours. */
export const P_COOKIE = "guichet_palette";
export const T_COOKIE = "guichet_theme";
export const YEAR = 60 * 60 * 24 * 365;

/** The script the layout inlines in <head>: applies the device's choice before the first paint; localStorage is the truth, the cookies follow it. */
export const PALETTE_BOOT = `(function(){try{var p=localStorage.getItem("${P_KEY}"),t=localStorage.getItem("${T_KEY}"),r=document.documentElement;if(p&&p!=="navy")r.setAttribute("data-palette",p);else r.removeAttribute("data-palette");if(t==="light"||t==="dim"||t==="dark")r.setAttribute("data-theme",t);else r.removeAttribute("data-theme");if(p&&document.cookie.indexOf("${P_COOKIE}="+p)<0)document.cookie="${P_COOKIE}="+p+"; path=/; max-age=${YEAR}; samesite=lax";if(t&&document.cookie.indexOf("${T_COOKIE}="+t)<0)document.cookie="${T_COOKIE}="+t+"; path=/; max-age=${YEAR}; samesite=lax";}catch(e){}})();`;

/** What the server puts on <html> from the cookies: the same attributes the boot script would set. */
export function paletteAttrs(palette?: string, theme?: string): { "data-palette"?: string; "data-theme"?: string } {
  const out: { "data-palette"?: string; "data-theme"?: string } = {};
  if (palette && palette !== "navy" && PALETTES.some((p) => p.key === palette)) out["data-palette"] = palette;
  if (theme === "light" || theme === "dim" || theme === "dark") out["data-theme"] = theme;
  return out;
}
