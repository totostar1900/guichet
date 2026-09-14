import { Suspense } from "react";
import { OfferBrowser } from "@/components/OfferBrowser";
import { repo } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function GuichetPage() {
  const offers = (await repo().listOffers()).filter((o) => !o.hidden);
  return (
    <Suspense>
      <OfferBrowser offers={offers} nowIso={new Date().toISOString()} />
    </Suspense>
  );
}
