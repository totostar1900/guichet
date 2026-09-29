import { redirect } from "next/navigation";
import { Accueil } from "./Accueil";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * La racine, et ce qu'elle devient selon qui regarde.
 *
 * Elle portait la liste des titres. C'était le défaut de fond de la
 * plateforme : rangée par instrument, elle sert l'acquisition, et un visiteur
 * y tombait sur un catalogue sans savoir chez qui il était ni ce que la maison
 * fait. Un client, lui, n'a pas besoin qu'on lui vende ce qu'il a déjà pris.
 *
 * Déconnecté : la présentation, qui mène par les services et par le marché.
 * Connecté : la liste, en attendant la console qui prendra cette place. Ce
 * renvoi est une étape et non un état, mais il vaut déjà mieux qu'un client
 * connecté tombant sur une page qui lui propose d'ouvrir un compte.
 */
export default async function RacinePage() {
  const session = await getSession();
  if (session) redirect("/titres");
  return <Accueil />;
}
