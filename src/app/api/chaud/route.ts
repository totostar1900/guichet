import { NextResponse } from "next/server";
import { repo } from "@/lib/data";

/**
 * LE RÉCHAUFFEUR (17 novembre 2026).
 *
 * Une fonction que personne n'appelle s'endort, et le premier visiteur paie le réveil : 1,3 à 1,8 s
 * mesurés sur la page d'accueil, puis 0,5 s dès le deuxième appel. Ce passage, toutes les cinq minutes
 * dans la journée du client, garde réveillées les fonctions qui rendent les pages et la connexion à la
 * base — il rend deux pages publiques et fait une lecture.
 *
 * CE N'EST PAS UN ROBOT : il ne fait rien d'utile à la maison et n'écrit rien (pas de ligne au registre
 * des tours, qui se remplirait de 200 lignes par jour). Il n'est donc pas surveillé par la page Santé ;
 * l'exception est déclarée dans `robots.test.ts`.
 *
 * CE QU'IL NE RÉCHAUFFE PAS : une page derrière la connexion, qu'on ne peut pas rendre sans session.
 * Si le rendu des pages du client vit dans une autre fonction que celle de l'accueil, le gain est
 * moindre : se mesure en production, pas ici.
 */
const PAGES = ["/", "/a-propos"];

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const origine = new URL(req.url).origin;
  const t0 = Date.now();
  const [pages, base] = await Promise.all([
    Promise.all(PAGES.map(async (p) => (await fetch(`${origine}${p}`, { cache: "no-store", redirect: "manual" }).catch(() => undefined))?.status ?? 0)),
    repo().listOffers().then((o) => o.length).catch(() => -1),
  ]);
  return NextResponse.json({ ok: true, ms: Date.now() - t0, pages, offres: base });
}
