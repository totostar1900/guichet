import { Suspense } from "react";
import { OfferBrowser } from "@/components/OfferBrowser";
import { BackToTop } from "@/components/BackToTop";
import { SwipePager } from "@/components/mobile/SwipePager";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function GuichetPage() {
  const all = await repo().listOffers();
  // Funds live on their own page (every OPCVM with a published NAV, distributed or not).
  const offers = all.filter((o) => !o.hidden && o.kind !== "FONDS");
  const fundsCount = all.filter((o) => o.kind === "FONDS").length;
  const nowIso = new Date().toISOString();
  const t = await getT();
  return (
    <>
      {/* On the phone the Fonds list sits to the right of this one: a swipe reaches it. */}
      <SwipePager next={{ href: "/fonds", title: t("Fonds communs de placement"), pos: `${t("Fonds")} · ${fundsCount}` }} hintKey="liste" hints={{ next: "Glissez vers la gauche : les fonds", prev: "Glissez vers la droite : les titres" }}>
        <Suspense>
          <OfferBrowser offers={offers} nowIso={nowIso} fundsCount={fundsCount} />
        </Suspense>
      </SwipePager>
      <BackToTop />
    </>
  );
}
