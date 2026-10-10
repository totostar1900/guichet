import type { NextRequest } from "next/server";
import { routeDuRobot } from "@/lib/cron/tour";
import { repo } from "@/lib/data";
import { borneDeLaPurge, MOIS_DE_DETAIL } from "@/lib/domain/journal-client";

/**
 * LA PURGE DU REGISTRE DES GESTES, UNE FOIS PAR MOIS.
 *
 * L'article 8 de la convention promet treize mois de détail, puis des
 * compteurs sans le geste. Une promesse écrite dans un contrat et tenue par
 * personne est pire que pas de promesse : ce robot la tient.
 *
 * IL NE DÉCIDE DE RIEN. La borne est dans le domaine, l'agrégation et la
 * suppression sont un seul ordre en base, et le robot ne fait que donner
 * l'heure. Le jour où la durée change, elle change à un seul endroit, et
 * l'article de la convention change avec elle.
 *
 * UNE PURGE QUI NE TROUVE RIEN EST UN SUCCÈS, pas un silence : le registre a
 * commencé le 10 octobre 2026, donc ce robot ne supprimera rien avant
 * novembre 2027. Il le dit à chaque tour plutôt que de laisser croire, dans
 * un an, qu'il a travaillé.
 */
export async function GET(req: NextRequest) {
  return routeDuRobot("purge-gestes", req, async () => {
    const avant = borneDeLaPurge();
    const resumes = await repo().purgerGestes(avant);
    return {
      resumes,
      avant: avant.toISOString().slice(0, 10),
      mois: MOIS_DE_DETAIL,
      dit:
        resumes > 0
          ? `${resumes} geste(s) antérieur(s) au ${avant.toISOString().slice(0, 10)} résumés en compteurs mensuels, puis supprimés.`
          : `Rien à résumer : aucun geste n'est antérieur au ${avant.toISOString().slice(0, 10)}.`,
    };
  });
}
