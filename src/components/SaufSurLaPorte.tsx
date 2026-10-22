"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * CE QUI NE PARAÎT PAS SUR LA PORTE.
 *
 * « /connexion » portait le pied entier du site : le guide, l'aide, les
 * risques, l'agrément COSUMAF, la convention de rendement et le numéro de
 * version — cent treize pixels de vitrine sous un formulaire de six lignes.
 * Une page qui demande une adresse e-mail n'est pas une page qui vend la
 * maison, et tout ce qui s'y lit en plus est une raison de partir.
 *
 * Le chemin décide, pas la session : la porte reste la porte, qu'on arrive
 * d'un lien partagé ou d'un renvoi du proxy. « usePathname » répond déjà au
 * rendu serveur, donc le pied ne paraît pas une image avant de disparaître.
 */
export function SaufSurLaPorte({ children }: { children: ReactNode }) {
  const path = usePathname() || "/";
  if (path.startsWith("/connexion") || path.startsWith("/auth")) return null;
  return <>{children}</>;
}
