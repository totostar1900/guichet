import { FicheSkeleton } from "@/components/Skeleton";

/**
 * L'attente d'une fiche.
 *
 * Elle existe autant pour le glissement d'une carte à l'autre que pour le
 * premier chargement : c'est cette enveloppe que Next précharge, et c'est sur
 * elle que le geste retombe pendant que le serveur travaille.
 */
export default function Loading() {
  return <FicheSkeleton />;
}
