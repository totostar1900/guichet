"use client";

import { setFraisClient } from "@/lib/frais-registre";
import type { BaremeDeFrais } from "@/lib/domain/frais";
import { useMemo } from "react";
import type { BondTerms } from "@/data/bond-terms";
import type { Term } from "@/lib/glossary";
import type { Lesson } from "@/data/lessons";
import { setRegistry, type ProductType } from "@/lib/registry";
import { setIssuerRegistry, type IssuerProfile } from "@/data/issuer-registry";

/**
 * Installs the desk-configured registry in the browser before any client
 * component renders, so summaries, badges and bubbles read the same product
 * types, bond schedules, glossary and issuers as the server.
 *
 * `issuers` : le registre des émetteurs, allégé de ses phrases sourcées. Sans
 * lui, le navigateur de lignes et la carte d'identité d'une ligne groupaient et
 * pavoisaient sur les fiches du code, pendant que le reste de l'application
 * lisait celles du desk.
 */
export function RegistryProvider({ types, bondTerms, glossary, lessons, issuers, frais, children }: { types: ProductType[]; bondTerms: BondTerms[]; glossary: Record<string, Term>; lessons: Lesson[]; issuers: IssuerProfile[]; /** Le barème des frais, part client seule (`baremePourLeClient`) : le formulaire du navigateur calcule les mêmes frais que le serveur. */ frais: BaremeDeFrais; children: React.ReactNode }) {
  useMemo(() => {
    setRegistry({ types, bondTerms: new Map(bondTerms.map((b) => [b.isin, b])), glossary, lessons });
    setIssuerRegistry(issuers);
    setFraisClient(frais);
  }, [types, bondTerms, glossary, lessons, issuers, frais]);
  return <>{children}</>;
}
