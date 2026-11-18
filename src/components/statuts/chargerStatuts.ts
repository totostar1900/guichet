import { getLang, getT } from "@/i18n/server";
import { displayStatus, isActionable, statusLabel } from "@/lib/domain/status";
import { groupeDe, messagesActifs, messagesPourLaLangue, statutsAffiches, type GroupeDeStatut } from "@/lib/domain/statuts";
import { repo } from "@/lib/data";
import { summarize } from "@/lib/domain/summary";
import type { Country, Offer } from "@/lib/domain/types";
import { echantillonner } from "@/lib/domain/fund-curve";
import { listerMessages, listerStatuts } from "@/lib/statuts";

export interface ItemStatut {
  id: string;
  groupe: GroupeDeStatut;
  /** BTA, OTA, Fonds, Action, Obligation : la couleur d'une page de Trésor en dépend. */
  genre: string;
  /** Les VL d'un fonds, de la plus ancienne à la plus récente (au plus 30) : le tracé de la page. */
  courbe?: number[];
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

/** Combien de messages partent vers le navigateur : assez pour que le tirage varie, pas la base entière. */
const MESSAGES_ENVOYES = 40;

/** Les statuts que le client lit : des messages à tirer pour la première page (dans sa langue) et un rond par ligne retenue qu'il peut encore lire. */
export async function chargerStatuts(offres: Offer[], now: Date): Promise<{ messages: string[]; items: ItemStatut[] }> {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const [rows, enBase] = await Promise.all([listerStatuts(), listerMessages()]);
  const visibles = offres.filter((o) => !o.hidden && o.status !== "withdrawn");
  const affiches = statutsAffiches(rows, visibles);
  const courbes = await repo().listFundCurves(affiches.filter((x) => x.offre.kind === "FONDS").map((x) => x.offre.fund?.key).filter((k): k is string => Boolean(k))).catch(() => new Map());
  const items = affiches.map(({ offre: o }): ItemStatut => {
    const s = displayStatus(o, now);
    const resume = summarize(o, now);
    return {
      id: o.id,
      groupe: groupeDe(o.kind),
      genre: GENRE[o.kind] ?? "Titre",
      courbe: o.kind === "FONDS" && o.fund?.key && courbes.get(o.fund.key) ? echantillonner(courbes.get(o.fund.key)!).ys : undefined,
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
  /* Le tirage se fait dans le navigateur, à chaque ouverture : le serveur envoie un échantillon mélangé de la base, dans la langue du client. */
  const pool = messagesPourLaLangue(messagesActifs(enBase), lang).map((m) => m.texte);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { messages: pool.slice(0, MESSAGES_ENVOYES), items };
}
