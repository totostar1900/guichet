"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * LES ANCRES DE L'ANCIEN GUIDE MÈNENT ENCORE OÙ ELLES DISAIENT.
 *
 * « /info#terme-coupon », « /info#simulateur », « /info#glossaire » sont partis
 * dans des messages, des favoris et des documents : la page les portait, et
 * c'est elle qu'on démonte. Le navigateur rattache le fragment à la
 * redirection, qui amène donc ici avec l'ancre d'origine ; il n'y a plus rien
 * à ce nom sur cette page, et un lien qui n'ouvre rien ne dit pas qu'il a
 * échoué.
 *
 * ON NE REMPLACE PAS LA REDIRECTION DU SERVEUR PAR CELLE-CI : « /info » rend
 * les éclairages sans attendre le script, et ce report ne s'ajoute que pour
 * les ancres, qui n'atteignent de toute façon jamais le serveur.
 */
const vers = (ancre: string): string | null => {
  if (ancre.startsWith("terme-")) return `/info/glossaire#${ancre}`;
  if (ancre === "glossaire") return "/info/glossaire";
  if (ancre === "simulateur") return "/info/simulateur";
  if (ancre === "parcours") return "/info/parcours";
  /* « lecons », « recherche » et « outils » : on est déjà sur leur page. */
  return null;
};

export function AncreHeritee() {
  const router = useRouter();
  useEffect(() => {
    const brut = window.location.hash.slice(1);
    if (!brut) return;
    let ancre = brut;
    try {
      ancre = decodeURIComponent(brut);
    } catch {
      /* Une ancre mal encodée reste telle quelle : elle ne mènera nulle part. */
    }
    const ou = vers(ancre);
    if (ou) router.replace(ou);
  }, [router]);
  return null;
}
