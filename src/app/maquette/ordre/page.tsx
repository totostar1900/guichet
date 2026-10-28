import { notFound } from "next/navigation";
import { Glissement } from "@/components/mobile/Glissement";
import { repo } from "@/lib/data";
import { Maquette } from "./Maquette";

export const metadata = { title: "Maquette · passer un ordre" };

/**
 * UNE MAQUETTE, PAS UNE PAGE DE LA MAISON.
 *
 * Demandée le 28 octobre 2026 : « une forme plus généreuse, à la manière de
 * Western Union ou d'une application fintech — des montants saisis dans de
 * grandes boîtes, de grandes polices, quelque chose de moderne ; pour
 * l'instant c'est une présentation discrète et timide. Maquette d'abord. »
 *
 * ELLE VIT À UNE ADRESSE PROVISOIRE, aucune barre n'y mène, et elle n'envoie
 * rien : c'est une proposition qu'on ouvre sur son téléphone pour décider.
 * Si elle est retenue, elle est démontée et ses choix passent dans le vrai
 * formulaire ; si elle ne l'est pas, elle est démontée aussi.
 *
 * ELLE PREND UNE VRAIE LIGNE, ses vrais chiffres : une maquette sur des
 * nombres inventés ment sur ce qui tient à l'écran — « 90 000 FCFA » et
 * « 1 000 » ne pèsent pas la même largeur, et c'est la largeur qui décide
 * d'une boîte de saisie.
 */
export default async function MaquetteOrdrePage() {
  const o = (await repo().listOffers()).find((x) => x.kind === "MARCHE" && x.lastPrice) ?? (await repo().listOffers())[0];
  if (!o) notFound();
  /* Le glissement entre pages est de la navigation, pas du dessin : la
     maquette s'y plie comme toute page du guichet. */
  return (
    <Glissement>
      <Maquette
        titre={o.title}
        isin={o.isin}
        cours={o.lastPrice ?? 0}
        quotite={o.lotSize ?? 1}
        detenu={120}
        marche={o.kind === "MARCHE" ? "Cotation continue" : "Adjudication"}
      />
    </Glissement>
  );
}
