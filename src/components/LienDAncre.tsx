"use client";

import type { AnchorHTMLAttributes } from "react";

/**
 * UN LIEN VERS UNE SECTION DE LA MÊME PAGE, SANS ENTRÉE D'HISTORIQUE (19 novembre 2026).
 *
 * Le client : « le bouton retour se balade sur le document en fonction de ce qui a été cliqué sur le menu collant ». Chaque `href="#section"` ajoutait une entrée à l'historique du navigateur : la flèche de retour revenait de rubrique en rubrique, au lieu de quitter la page. Ici le lien fait défiler jusqu'à la section et REMPLACE l'adresse (`replaceState`) : l'adresse reste partageable, la flèche de retour quitte la page.
 */
export function LienDAncre({ href, onClick, ...reste }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: `#${string}` }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const cible = document.getElementById(decodeURIComponent(href.slice(1)));
        if (!cible) return;
        e.preventDefault();
        cible.scrollIntoView({ block: "start" });
        history.replaceState(history.state, "", href);
      }}
      {...reste}
    />
  );
}
