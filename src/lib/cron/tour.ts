import "server-only";
import { NextResponse } from "next/server";
import { repo } from "@/lib/data";

/**
 * L'enveloppe d'un tour de robot : elle laisse une ligne, même quand il n'a
 * rien fait.
 *
 * Les robots n'écrivaient au journal que lorsqu'ils agissaient, et c'est la
 * panne la plus confortable : un tour vide ressemble à un tour absent, donc un
 * robot mort ressemble à un robot sans travail. Le 3 octobre 2026, pour dire si
 * celui de l'épargne avait tourné le matin même, il a fallu prouver que
 * l'ordonnanceur marchait par un AUTRE robot.
 *
 * ELLE N'AVALE RIEN. Une erreur est inscrite puis relancée : le robot échoue
 * comme avant, Vercel le voit comme avant, et la ligne garde la raison. Une
 * enveloppe qui transformerait une panne en succès silencieux serait pire que
 * l'absence qu'elle corrige.
 *
 * ET ELLE N'EMPÊCHE PAS LE TOUR. Si l'inscription elle-même échoue, parce que
 * la table manque ou que la base est injoignable, le robot fait quand même son
 * travail : on ne refuse pas de verser un coupon parce qu'un registre de
 * machine est indisponible.
 */
export async function tour<T>(robot: string, travail: () => Promise<T>, par: "cron" | "main" = "main"): Promise<T> {
  const r = repo();
  let id: string | undefined;
  try {
    id = (await r.ouvrirTour(robot, par))?.id;
  } catch {
    // Le registre est muet : le tour a lieu quand même.
  }
  try {
    const sortie = await travail();
    /* Une réponse porte son propre verdict : un 502 est un tour qui a eu lieu et
       qui a échoué, et le confondre avec un succès rendrait ce registre menteur. */
    const rendu = sortie as { status?: number } | undefined;
    const statut = typeof rendu?.status === "number" ? rendu.status : undefined;
    if (id) await r.fermerTour(id, statut === undefined ? { ok: true, detail: sortie } : { ok: statut < 400, detail: { status: statut } }).catch(() => {});
    return sortie;
  } catch (e) {
    const message = e instanceof Error ? e.message : "échec";
    if (id) await r.fermerTour(id, { ok: false, error: message }).catch(() => {});
    throw e;
  }
}

/**
 * Le tour d'une route : le garde du secret, l'enveloppe, et la réponse JSON.
 *
 * Les douze robots écrivaient les mêmes six lignes de garde ; les rassembler
 * ici évite qu'un treizième les écrive de travers, ce qui est la façon dont un
 * robot finit par tourner sans secret.
 */
export async function routeDuRobot<T extends object>(robot: string, req: Request, travail: () => Promise<T | NextResponse>): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  /* Vercel se nomme dans son « user-agent ». Un tour lancé à la main s'inscrit
     et se montre, mais n'éteint aucune alarme : sans cela, le premier qui lance
     un robot pour vérifier qu'il marche ferait taire la page Santé pour une
     cadence entière, et c'est exactement la panne qu'on vient de fermer. */
  const par = /vercel-cron/i.test(req.headers.get("user-agent") ?? "") ? "cron" : "main";
  const sortie = await tour(robot, travail, par);
  /* UN ROBOT PEUT RENDRE SA PROPRE RÉPONSE, et cinq le font : ils distinguent
     « rien à faire » d'un 502 quand une source est injoignable. Aplatir ces
     statuts en objets ferait voir un succès à Vercel là où il y a un échec,
     c'est-à-dire la panne muette que ce registre existe pour fermer. L'état du
     tour se lit alors du statut, et le détail garde lequel. */
  if (sortie instanceof NextResponse) return sortie;
  return NextResponse.json(sortie);
}
