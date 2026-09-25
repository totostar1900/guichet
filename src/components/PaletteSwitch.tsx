"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import styles from "./PaletteSwitch.module.css";
import { PALETTES, THEMES, P_KEY, T_KEY, P_COOKIE, T_COOKIE, YEAR } from "@/lib/palette";
import { saveDisplay } from "@/lib/display-actions";


/**
 * « Couleurs » in the ⋮ : the palette (four, all near the brand or neutral)
 * and the theme (auto · clair · sombre). Both stay on the device and are
 * applied before paint by the layout's inline script, so a page never
 * flashes in the wrong colours; here they are applied at once on <html>.
 */
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
  // Les deux témoins tout de suite, pour que le prochain rendu serveur timbre
  // « html » sans attendre l'aller-retour.
  document.cookie = `${P_COOKIE}=${palette}; path=/; max-age=${YEAR}; samesite=lax`;
  document.cookie = `${T_COOKIE}=${theme}; path=/; max-age=${YEAR}; samesite=lax`;
  // Puis le serveur les repose pour de bon : Safari plafonne à sept jours un
  // témoin écrit par un script, et jette le stockage local au bout d'autant.
  // Connecté, le choix va aussi au compte et suit l'appareil suivant.
  void saveDisplay({ palette, theme });
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
            {/* a tiny page: its paper, its header band, a gold mark and two lines of its ink; four palettes, four different pages */}
            <i style={{ background: p.paper, borderColor: palette === p.key ? undefined : p.line }}>
              <b style={{ background: p.a }} />
              <em style={{ background: p.b }} />
              <s style={{ background: p.ink }} />
              <s style={{ background: p.ink, width: "60%" }} />
            </i>
            <small>{p[lang]}</small>
          </button>
        ))}
      </div>
      <div className={styles.seg} role="group" aria-label={t("Thème")}>
        {THEMES.map((k) => (
          <button key={k} type="button" className={theme === k ? styles.segOn : ""} aria-pressed={theme === k} onClick={() => apply(palette, k)}>
            {t(k === "auto" ? "auto" : k === "light" ? "clair" : k === "dim" ? "tamisé" : "sombre")}
          </button>
        ))}
      </div>
    </div>
  );
}


/**
 * Après chaque navigation, « html » reprend le choix de l'appareil : une mise
 * en page rejouée a pu effacer ses attributs.
 *
 * Et au premier passage, si l'appareil ne sait plus rien alors que le compte,
 * lui, se souvient, c'est le compte qui gagne et l'appareil qui réapprend.
 * C'est le cas d'un téléphone dont Safari a jeté le stockage local, ou d'un
 * appareil neuf : sans cela le lecteur retrouverait le thème par défaut en
 * ayant pourtant choisi, une fois, sur un autre écran.
 */
export function PaletteKeeper({ saved }: { saved?: { palette?: string; theme?: string; lang?: string } }) {
  const path = usePathname();
  useEffect(() => {
    try {
      const known = localStorage.getItem(P_KEY) ?? localStorage.getItem(T_KEY);
      if (!known && saved && (saved.palette || saved.theme)) {
        apply(saved.palette ?? "navy", saved.theme ?? "auto");
        return;
      }
      const p = localStorage.getItem(P_KEY) ?? "navy";
      const t = localStorage.getItem(T_KEY) ?? "auto";
      const r = document.documentElement;
      if (p === "navy") r.removeAttribute("data-palette");
      else if (r.getAttribute("data-palette") !== p) r.setAttribute("data-palette", p);
      if (t === "auto") r.removeAttribute("data-theme");
      else if (r.getAttribute("data-theme") !== t) r.setAttribute("data-theme", t);
    } catch {
      // storage unavailable
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, saved?.palette, saved?.theme]);
  return null;
}
