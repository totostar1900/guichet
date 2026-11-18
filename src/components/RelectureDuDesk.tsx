"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * LE DESK RELIT CHAQUE PAGE À SON OUVERTURE (18 novembre 2026, décidé avec le client).
 *
 * Le navigateur du client garde une page cinq minutes (`staleTimes.dynamic`, voir « next.config.ts ») : les cours ne bougent qu'une fois par jour et le client le sait. Ce réglage est global,
 * donc il vaudrait aussi pour le desk, dont la file « À valider » et les prix changent sous les mains de deux personnes. Ici la page gardée s'affiche d'un coup, puis elle est redemandée
 * au serveur : le desk ne lit jamais plus vieux que la dernière ouverture. La première page d'une visite vient du serveur et ne se relit pas.
 */
export function RelectureDuDesk() {
  const chemin = usePathname();
  const router = useRouter();
  const premiere = useRef(true);
  useEffect(() => {
    if (premiere.current) {
      premiere.current = false;
      return;
    }
    router.refresh();
  }, [chemin, router]);
  return null;
}
