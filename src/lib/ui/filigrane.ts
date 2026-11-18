"use client";

import { useEffect, useState } from "react";
import { signesPossibles } from "@/lib/domain/filigrane";
import type { Country } from "@/lib/domain/types";

/**
 * Le signe du pays à poser en filigrane sur une carte : tiré au hasard APRÈS le montage (le serveur et le navigateur ne tireraient pas le même, et la page se corrigerait en
 * criant), puis gardé pour la vie de la carte. Rien avant le tirage : la carte se rend sans filigrane, puis le reçoit sans saut (il est hors du flux).
 */
export function useFiligrane(pays: Country | undefined): string | undefined {
  const [signe, setSigne] = useState<string | undefined>();
  useEffect(() => {
    const id = setTimeout(() => {
      const possibles = signesPossibles(pays);
      setSigne(possibles.length ? possibles[Math.floor(Math.random() * possibles.length)] : undefined);
    }, 0);
    return () => clearTimeout(id);
  }, [pays]);
  return signe;
}
