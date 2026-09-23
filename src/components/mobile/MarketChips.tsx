"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useT } from "@/i18n/client";
import { MARKET_PAGES, currentMarketPage } from "@/lib/market/pages";
import styles from "./MarketChips.module.css";

/**
 * Le bandeau du marché, en haut d'une page de la famille, sur le téléphone.
 *
 * La feuille de l'onglet « Marché » sert celui qui cherche où aller ; ce
 * bandeau sert celui qui lit et veut savoir où il est. Il ne demande aucun
 * geste nouveau : la famille est là, la page ouverte est marquée, on glisse
 * du pouce pour voir le reste.
 *
 * Il ne se fige pas. Deux barres figées en haut d'un écran de téléphone, c'est
 * déjà la moitié de l'écran ; la page de l'indice et la note ont leur propre
 * ligne « Sur cette page », et c'est elle qui doit rester.
 */
export function MarketChips() {
  const path = usePathname();
  const t = useT();
  const here = currentMarketPage(path);
  const rail = useRef<HTMLDivElement>(null);
  const on = useRef<HTMLAnchorElement>(null);

  // La page ouverte se met d'elle-même en vue : sixième sur sept, elle serait
  // hors du bandeau, et le bandeau dirait qu'on est ailleurs.
  useEffect(() => {
    const r = rail.current;
    const a = on.current;
    if (!r || !a) return;
    const want = a.offsetLeft - r.clientWidth / 2 + a.offsetWidth / 2;
    r.scrollTo({ left: Math.max(0, want), behavior: "auto" });
  }, [here]);

  if (!here) return null;
  return (
    <nav className={styles.rail} ref={rail} aria-label={t("Les pages du marché")}>
      {MARKET_PAGES.map((p) => {
        const isHere = p.key === here;
        return (
          <Link key={p.key} href={p.href} ref={isHere ? on : undefined} className={isHere ? styles.on : undefined} aria-current={isHere ? "page" : undefined}>
            {t(p.short ?? p.label)}
          </Link>
        );
      })}
    </nav>
  );
}
