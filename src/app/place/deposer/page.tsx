import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { ligneAdmise, peutParticiper, placeOuverte, titresDetenus, unitePourLaLigne } from "@/lib/place-donnees";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { FormulaireDAnnonce } from "./FormulaireDAnnonce";

export const dynamic = "force-dynamic";
export const metadata = { title: "Déposer une annonce" };

/** Le dépôt, sur un seul écran (planche 2A). L'annonce n'engage personne ; la maison la relit avant publication. */
export default async function DeposerPage() {
  const s = await requireSession("/place/deposer");
  if (!placeOuverte() || !peutParticiper(s)) notFound();
  const t = await getT();
  const [offres, detenus] = await Promise.all([repo().listOffers(), titresDetenus(s.userId)]);
  const lignes = offres.filter(ligneAdmise).map((o) => ({ id: o.id, titre: o.title, nominal: o.nominal, unite: unitePourLaLigne(o), detenus: detenus.get(o.id) ?? 0 }));
  return (
    <Glissement>
      <div className="pile">
        <EnTete titre={t("Déposer une annonce")} phrase={t("Une annonce n'engage personne. Elle est lue par la maison avant d'être publiée, sans votre nom.")} />
        <FormulaireDAnnonce lignes={lignes} />
      </div>
    </Glissement>
  );
}
