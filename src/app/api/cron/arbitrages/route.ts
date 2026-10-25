import type { NextRequest } from "next/server";
import { routeDuRobot } from "@/lib/cron/tour";
import { loadRegistry } from "@/lib/reference";
import { tourDesArbitrages } from "@/lib/arbitrage/tour";

/**
 * LE ROBOT QUI REND LA MAIN SUR LES ARBITRAGES ÉCHUS.
 *
 * Une fois par jour, après la clôture de la séance de la BVMAC : une paire
 * armée dont la date tombe aujourd'hui doit avoir eu sa dernière chance avant
 * qu'on l'éteigne, et cette chance est la séance du jour. Le tour passe donc
 * après elle, pas le matin.
 *
 * SON SILENCE EST LA PANNE À CRAINDRE. Un robot d'expiration qui ne tourne pas
 * ne casse rien de visible : les ordres restent simplement armés, et le client
 * continue de lire « armé, rien n'a bougé » — exactement ce qu'il lirait si
 * tout allait bien. C'est pour cela qu'il est au tableau des robots, avec sa
 * cadence : son absence se voit depuis la page Santé.
 */
export async function GET(req: NextRequest) {
  return routeDuRobot("arbitrages", req, async () => {
    /* Le registre d'abord : le motif nomme la ligne d'arrivée, et un libellé
       surchargé par le desk doit sortir tel que le desk l'a écrit. */
    await loadRegistry();
    return tourDesArbitrages();
  });
}
