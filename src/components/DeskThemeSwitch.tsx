"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { DESK_T_COOKIE, DESK_T_KEY, DESK_THEMES, isDeskTheme, YEAR, type DeskTheme } from "@/lib/palette";
import { saveDeskTheme } from "@/lib/display-actions";
import styles from "./DeskThemeSwitch.module.css";

/**
 * Les trois thèmes du Desk, au pied de la barre latérale. Ils n'ont rien de commun avec la palette et le thème du client : autre clé d'appareil, autre témoin, autre champ de compte.
 * Sans choix, le Desk est sombre.
 */
const EVENT = "guichet:desk-theme";
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
const read = (): DeskTheme => {
  try {
    const v = localStorage.getItem(DESK_T_KEY);
    return isDeskTheme(v) ? v : "dark";
  } catch {
    return "dark";
  }
};

function paint(theme: DeskTheme) {
  const r = document.documentElement;
  r.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  if (theme === "sable") r.setAttribute("data-desk", "sable");
  else r.removeAttribute("data-desk");
}

function apply(theme: DeskTheme) {
  paint(theme);
  try {
    localStorage.setItem(DESK_T_KEY, theme);
  } catch {
    // le choix tient pour cette page
  }
  document.cookie = `${DESK_T_COOKIE}=${theme}; path=/; max-age=${YEAR}; samesite=lax`;
  void saveDeskTheme(theme);
  window.dispatchEvent(new Event(EVENT));
}

const LABEL: Record<DeskTheme, string> = { light: "Clair", dark: "Sombre", sable: "Sable" };
const ORDER: DeskTheme[] = ["light", "dark", "sable"];

export function DeskThemeSwitch() {
  const t = useT();
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as DeskTheme);
  return (
    <div className={styles.seg} role="group" aria-label={t("Thème du Desk")}>
      {ORDER.filter((k) => DESK_THEMES.includes(k)).map((k) => (
        <button key={k} type="button" className={theme === k ? styles.on : ""} aria-pressed={theme === k} onClick={() => apply(k)}>
          {t(LABEL[k])}
        </button>
      ))}
    </div>
  );
}

/** Après chaque navigation, « html » reprend le choix du Desk ; au premier passage, si l'appareil ne sait plus rien, le compte gagne. */
export function DeskThemeKeeper({ saved }: { saved?: string }) {
  const path = usePathname();
  useEffect(() => {
    try {
      const known = localStorage.getItem(DESK_T_KEY);
      if (!known && isDeskTheme(saved)) {
        apply(saved);
        return;
      }
      paint(isDeskTheme(known) ? known : "dark");
    } catch {
      // stockage indisponible
    }
  }, [path, saved]);
  return null;
}
