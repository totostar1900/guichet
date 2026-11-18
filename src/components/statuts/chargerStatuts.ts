import { getT } from "@/i18n/server";
import { displayStatus, isActionable, statusLabel } from "@/lib/domain/status";
import { messageDe, statutsAffiches } from "@/lib/domain/statuts";
import { summarize } from "@/lib/domain/summary";
import type { Country, Offer } from "@/lib/domain/types";
import { listerStatuts } from "@/lib/statuts";

export interface ItemStatut {
  id: string;
  /** Le nom court sous le rond : « OTA Gabon » ; un fonds se nomme par son titre (deux fonds d'un même pays ne se distingueraient pas). */
  nom: string;
  pays: Country;
  ouverte: boolean;
  titre: string;
  emetteur: string;
  /** Le chiffre de la ligne et sa condition, tels que la carte les dit. */
  hero: string;
  heroSub: string;
  etat: string;
  fiche: string;
  /** Absent quand la ligne n'accepte plus d'ordre : la page ne propose alors que la fiche. */
  ordre?: string;
}

const GENRE: Record<string, string> = { BTA: "BTA", OTA: "OTA", FONDS: "Fonds", ACTIONS: "Action", APE: "Obligation", MARCHE: "Obligation", RACHAT: "Obligation" };

/** Les statuts que le client lit : le message de la première page et un rond par ligne retenue que le client peut encore lire. */
export async function chargerStatuts(offres: Offer[], now: Date): Promise<{ message: string; items: ItemStatut[] }> {
  const t = await getT();
  const rows = await listerStatuts();
  const visibles = offres.filter((o) => !o.hidden && o.status !== "withdrawn");
  const items = statutsAffiches(rows, visibles).map(({ offre: o }): ItemStatut => {
    const s = displayStatus(o, now);
    const resume = summarize(o, now);
    return {
      id: o.id,
      nom: o.kind === "FONDS" ? t(o.title) : `${GENRE[o.kind] ?? "Titre"} ${o.countryName}`,
      pays: o.country,
      ouverte: isActionable(s),
      titre: t(o.title),
      emetteur: o.issuer || o.countryName,
      hero: resume.hero,
      heroSub: t(resume.heroSub),
      etat: t(statusLabel(o, s)),
      fiche: `/offres/${o.id}`,
      ordre: isActionable(s) ? `/offres/${o.id}/intention` : undefined,
    };
  });
  return { message: t(messageDe(rows)), items };
}
