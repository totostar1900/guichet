import { Suspense } from "react";
import { OfferBrowser } from "@/components/OfferBrowser";
import { repo } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function GuichetPage() {
  const all = await repo().listOffers();
  // Funds live on their own page (every OPCVM with a published NAV, distributed or not).
  const offers = all.filter((o) => !o.hidden && o.kind !== "FONDS");
  const fundsCount = all.filter((o) => o.kind === "FONDS").length;
  return (
    <Suspense>
      <OfferBrowser offers={offers} nowIso={new Date().toISOString()} fundsCount={fundsCount} />
    </Suspense>
  );
}
