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
 * Le Guichet, lui, se laisse lire en entier sauf l'espace du client et ce qui
 * n'a de sens que pour une main déjà connectée.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");
  if (isDeskHost(host)) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/moi/", "/api/", "/auth/", "/ne-plus-recevoir", "/connexion"] }],
  };
}
