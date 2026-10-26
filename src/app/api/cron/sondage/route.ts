import type { NextRequest } from "next/server";
import { routeDuRobot } from "@/lib/cron/tour";
import { loadRegistry } from "@/lib/reference";
import { tourDuSondage } from "@/lib/sondage/tour";

/**
 * LE ROBOT DU SONDAGE D'AVANT SÉANCE.
 *
 * Le matin, avant que le desk ouvre sa file : une attente dont la date est
 * passée doit être close avant qu'on lise le consensus du jour, sinon la
 * première lecture du matin porte une demande dont une part est déjà partie
 * ailleurs. L'ordre importe plus que l'heure, et c'est pourquoi celui-ci passe
 * tôt alors que celui des arbitrages passe tard : l'un rend la main avant la
 * journée, l'autre après la séance.
 *
 * SON SILENCE SE VOIT, et il faut qu'il se voie : un sondage qui n'expire plus
 * grossit tout seul, et le desk porterait au Trésor des demandes de l'été. Il
 * est donc au tableau des robots, avec sa cadence.
 */
export async function GET(req: NextRequest) {
  return routeDuRobot("sondage", req, async () => {
    /* Le registre d'abord : les motifs nomment des lignes et des pays, et un
       libellé surchargé par le desk doit sortir tel que le desk l'a écrit. */
    await loadRegistry();
    return tourDuSondage();
  });
}
