"use client";

import { useMemo } from "react";
import type { BondTerms } from "@/data/bond-terms";
import type { Term } from "@/lib/glossary";
import { setRegistry, type ProductType } from "@/lib/registry";

/**
 * Installs the desk-configured registry in the browser before any client
 * component renders, so summaries, badges and bubbles read the same product
 * types, bond schedules and glossary as the server.
 */
export function RegistryProvider({ types, bondTerms, glossary, children }: { types: ProductType[]; bondTerms: BondTerms[]; glossary: Record<string, Term>; children: React.ReactNode }) {
  useMemo(() => setRegistry({ types, bondTerms: new Map(bondTerms.map((b) => [b.isin, b])), glossary }), [types, bondTerms, glossary]);
  return <>{children}</>;
}
