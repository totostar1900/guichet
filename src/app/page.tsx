import { Suspense } from "react";
import { OfferBrowser } from "@/components/OfferBrowser";
import { BackToTop } from "@/components/BackToTop";
import { repo } from "@/lib/data";
import { IndexPulse } from "@/components/IndexPulse";

export const dynamic = "force-dynamic";

export default async function GuichetPage() {
  const all = await repo().listOffers();
  // Funds live on their own page (every OPCVM with a published NAV, distributed or not).
  // A primary line (OTA, APE) that is settled or matured and quoted at the BVMAC since : its bulletin line stands for it, once.
  const quoted = new Set(all.filter((o) => o.kind === "MARCHE" && !o.hidden && o.isin).map((o) => o.isin));
  const offers = all.filter((o) => !o.hidden && o.kind !== "FONDS" && !(o.kind !== "MARCHE" && (o.status === "live" || o.status === "matured") && quoted.has(o.isin)));
  const fundsCount = all.filter((o) => o.kind === "FONDS").length;
  const nowIso = new Date().toISOString();
  return (
    <>
      <IndexPulse compact />
      <Suspense>
        <OfferBrowser offers={offers} nowIso={nowIso} fundsCount={fundsCount} />
      </Suspense>
      <BackToTop />
    </>
  );
}
