"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { sansFenetreAPart, useModeAffichage } from "./useModeAffichage";

/**
 * UN LIEN VERS UN SITE EXTÉRIEUR, QUI NE PIÈGE PAS L'APP (15 novembre 2026).
 *
 * Au navigateur, c'est un lien ordinaire dans un onglet qu'on referme. Dans l'app installée il n'y a ni onglet ni retour : le lien emporterait l'app sans rien rendre.
 * Là, il devient « Copier l'adresse » : un site extérieur ne se lit pas en place, et son adresse se colle où l'on veut.
 */
export function LienExterne({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const t = useT();
  const mode = useModeAffichage();
  const [copie, setCopie] = useState(false);
  if (!sansFenetreAPart(mode)) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={className}
      style={{ font: "inherit", textAlign: "left", background: "none", border: 0, padding: 0, color: "inherit", cursor: "pointer" }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(href);
          setCopie(true);
          setTimeout(() => setCopie(false), 3000);
        } catch {
          // sans presse-papiers, l'adresse reste lisible ci-dessous
        }
      }}
    >
      {children}
      <small> · {copie ? t("Adresse copiée") : t("Copier l'adresse")}</small>
    </button>
  );
}
