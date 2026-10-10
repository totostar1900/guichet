"use server";

import { noter } from "@/lib/journal";
import { genreDe, GESTES } from "@/lib/domain/journal-client";

/**
 * NOTER UNE CONSULTATION, DEPUIS LE NAVIGATEUR ET NON AU RENDU.
 *
 * Une page qui écrirait son propre passage au rendu noterait aussi les pages
 * que personne n'a regardées : la maison préfetche les fiches depuis les
 * listes, et le serveur en rend la charge avant tout clic. Le registre dirait
 * alors « a consulté » d'une fiche survolée. La consultation se note donc
 * depuis le navigateur, une fois la page affichée.
 *
 * CETTE ACTION EST OUVERTE AU CLIENT : elle n'accepte donc que des gestes de
 * la famille « consultation », pour qu'on ne puisse pas s'en servir pour
 * écrire une signature ou un ordre dans le registre. L'objet est borné, et la
 * clef du jour rend tout doublon inutile.
 */
export async function noterConsultation(geste: string, objet: string, detail?: string): Promise<void> {
  if (!GESTES[geste] || genreDe(geste) !== "consultation") return;
  await noter(geste, { objet: objet.slice(0, 120), detail: detail?.slice(0, 160) });
}
