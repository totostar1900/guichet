import type { NextRequest } from "next/server";
import { routeDuRobot } from "@/lib/cron/tour";
import { loadRegistry } from "@/lib/reference";
import { tourDesRelances } from "@/lib/relances/tour";

/**
 * LE ROBOT QUI REPREND LES PROCÉDURES LAISSÉES EN ROUTE.
 *
 * Une fois par jour, en milieu de matinée : un rappel reçu à six heures se
 * lit à midi, et un rappel reçu le soir attend le lendemain. Celui-ci arrive
 * quand on est devant son téléphone et qu'on peut aller au bout du geste,
 * parce qu'un rappel qu'on ne peut pas honorer sur-le-champ est un rappel
 * qu'on oublie une seconde fois.
 *
 * IL NE DÉCIDE DE RIEN. Combien de rappels, à partir de quand, sur quels
 * canaux, pour quels sujets et avec quels mots : tout est au référentiel, que
 * le desk écrit dans sa page (« /desk/referentiel/relances »). Le robot lit,
 * constate, et envoie — ou se tait et dit pourquoi.
 *
 * UN TOUR QUI N'ENVOIE RIEN EST UN SUCCÈS, pas un silence. Il rend le détail
 * des refus — épuisée, écartée, trop tôt, sans canal — pour qu'une file qui
 * n'avance pas se diagnostique depuis la page Santé, sans rejouer le tour.
 */
export async function GET(req: NextRequest) {
  return routeDuRobot("relances", req, async () => {
    /* Le registre d'abord : le tour lit les titres des lignes pour nommer ce
       qui attend, et un libellé de produit surchargé par le desk doit sortir
       tel que le desk l'a écrit. */
    await loadRegistry();
    return tourDesRelances();
  });
}
