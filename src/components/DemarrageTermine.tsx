"use client";

import { useEffect } from "react";

/** Dit à la page que l'hydratation est faite : l'écran de démarrage peut partir (`html[data-pret]`). */
export function DemarrageTermine() {
  useEffect(() => {
    document.documentElement.dataset.pret = "1";
  }, []);
  return null;
}
