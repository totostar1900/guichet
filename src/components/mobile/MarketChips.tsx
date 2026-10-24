"use client";

import Link from "next/link";
import { LienAvant, LienRetour } from "./Glissement";
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

  const ici = MARKET_PAGES.findIndex((p) => p.key === here);
  /* PAS SUR LA PORTE DE LA FAMILLE, depuis le 24 octobre 2026.
     Ce bandeau sert « celui qui LIT et veut savoir où il est » : sa propre
     note le dit. Sur « /marche », on ne lit pas un article du marché, on est
     devant la porte — et la page y pose déjà, au téléphone, la liste des
     autres entrées avec la phrase de chacune. La famille se lisait donc deux
     fois avant le titre : sept pastilles courtes dont la plus inutile marque
     la page où l'on se tient, puis six rubriques nommées et expliquées.
     C'est le même retrait que celui de la bande de pied, pour la même
     raison, et c'est la page elle-même qui l'avait écrite : « une bande qui
     répète la famille est du bruit une fois les pastilles posées. » Ici les
     deux sont posées, et c'est la plus pauvre qui s'efface : le rail montre
     deux ou trois pastilles à la fois sur un téléphone, le sommaire les
     montre toutes, avec ce qu'elles contiennent. */
  if (!here || here === "marche") return null;
  return (
    <nav className={styles.rail} ref={rail} aria-label={t("Les pages du marché")}>
      {MARKET_PAGES.map((p, i) => {
        const isHere = p.key === here;
        /* LA DIRECTION SE LIT DANS LE RAIL LUI-MÊME.
           Entre deux pages d'une même section on ne descend ni ne remonte :
           on se déplace de côté, et le seul ordre qui existe est celui des
           pastilles qu'on a sous les yeux. Aller vers la droite du rail glisse
           comme un « plus loin », aller vers la gauche comme un « retour ».
           Sans cela ces liens ne portaient aucun type, « default: none »
           s'appliquait, et passer d'une page du marché à l'autre ne montrait
           rien — mesuré le 24 octobre 2026 sur « /societes → /indice ». */
        const Glisse = i === ici ? Link : i > ici ? LienAvant : LienRetour;
        return (
          <Glisse key={p.key} href={p.href} ref={isHere ? on : undefined} className={isHere ? styles.on : undefined} aria-current={isHere ? "page" : undefined}>
            {t(p.short ?? p.label)}
          </Glisse>
        );
      })}
    </nav>
  );
}
