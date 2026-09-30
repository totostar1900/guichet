import { headers } from "next/headers";
import type { MetadataRoute } from "next";
import { isDeskHost } from "@/lib/hosts";

export const dynamic = "force-dynamic";

/**
 * Ce que les moteurs ont le droit de lire.
 *
 * Il n'y en avait aucun : « /robots.txt » rendait la page d'accueil, et rien
 * ne disait que le domaine du desk n'est pas un site public. Il ne sert que
 * des pages fermées, mais son adresse de connexion et ses mentions, elles,
 * répondent à qui les demande ; il n'y a aucune raison de les voir paraître
 * dans un moteur à côté du Guichet.
 *
 * Le Guichet s'est refermé : tout demande une connexion sauf une colonne
 * vertébrale mince, et ce fichier dit la même chose que `src/lib/porte.ts`.
 * Autoriser ici une adresse que la porte ferme ne l'ouvrirait pas : cela
 * remplirait seulement un moteur de liens vers un mur de connexion.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");
  if (isDeskHost(host)) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    // La porte tient une liste blanche, ce fichier aussi : « disallow: / » ferme
    // tout, et chaque ligne autorisée rouvre une branche de la colonne.
    rules: [{ userAgent: "*", allow: ["/$", "/info/", "/indice/notes", "/indice/note/", "/offres/", "/ouvrir-un-compte"], disallow: "/" }],
  };
}
