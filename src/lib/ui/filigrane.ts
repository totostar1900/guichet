"use client";

import { useEffect, useState } from "react";
import { signesPossibles } from "@/lib/domain/filigrane";
import type { Country } from "@/lib/domain/types";

/**
 * Le signe du pays à poser en filigrane sur une carte : tiré au hasard APRÈS le montage (le serveur et le navigateur ne tireraient pas le même, et la page se corrigerait en
 * criant), puis gardé pour la vie de la carte. Rien avant le tirage : la carte se rend sans filigrane, puis le reçoit sans saut (il est hors du flux).
 */
export function useFiligrane(pays: Country | undefined): string | undefined {
  const [tire, setTire] = useState<{ pays: Country | undefined; signe: string | undefined }>({ pays: undefined, signe: undefined });
  useEffect(() => {
    const id = setTimeout(() => {
      const possibles = signesPossibles(pays);
      setTire({ pays, signe: possibles.length ? possibles[Math.floor(Math.random() * possibles.length)] : undefined });
    }, 0);
    return () => clearTimeout(id);
  }, [pays]);
  /* Le signe tiré pour un AUTRE pays ne se lit pas : à l'arrivée d'une page, il manque un instant plutôt que de montrer le monument du pays d'avant. */
  return tire.pays === pays ? tire.signe : undefined;
}
