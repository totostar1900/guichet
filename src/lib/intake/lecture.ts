import "server-only";
import { repo } from "@/lib/data";
import type { IntakeItem, OfferDraft } from "@/lib/domain/types";
import { emptyDraft, extractionAvailable, extractOffer, modeleDeLecture, type ExtractionInput } from "./extract";
import { IMAGE_TYPES } from "./ingest";
import { readSource } from "./storage";

/**
 * Lire une pièce d'intake, hors de la requête qui l'a reçue.
 *
 * POURQUOI CE FICHIER EXISTE. La lecture se faisait dans la requête du webhook,
 * et le 2026-10-01 une pièce est restée « lecture automatique en cours » :
 * soixante secondes de `maxDuration`, un modèle qui lit un PDF, et la fonction
 * est tuée. Une fonction tuée n'exécute aucun `catch`, donc rien ne s'écrit et
 * rien ne se dit. Resend, qui attend une réponse en quelques secondes, n'a
 * d'ailleurs aucune raison d'attendre une lecture.
 *
 * La maison avait déjà la bonne forme pour les adjudications : le robot remplit,
 * une personne confirme, par petits paquets, et il ne touche jamais à ce qui est
 * déjà lu. Les pièces d'intake prennent la même.
 *
 * TROIS RÈGLES REPRISES DU PRÉCÉDENT, et chacune a coûté quelque chose ailleurs :
 *
 *  - **la lecture se marque, qu'elle ait rendu ou non.** Sans cela une pièce
 *    illisible serait retentée sans fin, et chaque passe paierait son appel.
 *  - **elle ne confirme rien.** Une pièce lue reste à valider par une personne,
 *    la pièce ouverte à côté : un chiffre lu de travers qui deviendrait
 *    référence sans regard se propagerait sans bruit.
 *  - **elle ne recouvre pas une correction humaine.** On ne relit que ce qui n'a
 *    jamais été tenté, sauf demande explicite d'une personne.
 */
export interface Lue {
  item: IntakeItem;
  secondes?: number;
  erreur?: string;
}

/**
 * Un brouillon que personne n'a touché.
 *
 * LE GARDE QUE J'AVAIS OUBLIÉ, et la migration l'a montré tout de suite : le
 * marqueur naît vide sur TOUTES les pièces, donc les dix-huit déjà en base, dont
 * six travaillées et publiées en septembre, se sont présentées comme « à lire ».
 * Une passe les aurait relues et aurait écrasé ce qu'une personne avait rempli.
 * La route des adjudications porte la même règle depuis le début : « il ne prend
 * que ce qui est vide ».
 *
 * « confidence », « official » et « remarks » ne comptent pas : ils existent sur
 * un brouillon neuf. C'est un champ de fond qui dit qu'on y a touché.
 */
const brouillonVierge = (d: OfferDraft): boolean =>
  !Object.entries(d)
    .filter(([clef]) => !["confidence", "official", "remarks"].includes(clef))
    .some(([, valeur]) => valeur !== undefined && valeur !== null && valeur !== "" && !(Array.isArray(valeur) && valeur.length === 0));

/** Ce qui attend une lecture : jamais tenté, rien de rempli, pas publié, le plus ancien d'abord. */
export async function piecesALire(n = 5): Promise<IntakeItem[]> {
  const toutes = await repo().listIntake();
  return toutes
    .filter((i) => !i.readAt && !i.publishedAt && brouillonVierge(i.draft) && lisible(i))
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
    .slice(0, Math.max(1, Math.min(n, 20)));
}

/** Une pièce que la machine sait ouvrir : un PDF, une image, ou du texte. */
export const lisible = (i: IntakeItem): boolean => {
  if (i.fileName && i.mimeType) return i.mimeType === "application/pdf" || (IMAGE_TYPES as readonly string[]).includes(i.mimeType);
  return Boolean(i.rawText?.trim());
};

/** De quoi la machine a besoin pour lire cette pièce-là. */
async function entree(i: IntakeItem): Promise<ExtractionInput | undefined> {
  const hint = i.title ? `Objet du courriel : ${i.title}` : undefined;
  if (i.fileName && i.mimeType) {
    const bytes = await readSource(i.fileName);
    const base64 = Buffer.from(bytes).toString("base64");
    if (i.mimeType === "application/pdf") return { kind: "pdf", base64, hint };
    if ((IMAGE_TYPES as readonly string[]).includes(i.mimeType)) return { kind: "image", base64, mediaType: i.mimeType as (typeof IMAGE_TYPES)[number], hint };
    return undefined;
  }
  const texte = i.rawText?.trim();
  return texte ? { kind: "text", text: texte, hint } : undefined;
}

/**
 * Lire une pièce et garder ce qu'on en tire.
 *
 * `reprendre` est le geste d'une personne au desk : relire une pièce déjà
 * tentée. C'est le seul chemin qui repasse sur une lecture, et il est explicite.
 */
export async function lireUnePiece(id: string, reprendre = false): Promise<Lue | undefined> {
  const r = repo();
  const item = await r.getIntake(id);
  if (!item) return undefined;
  if (!extractionAvailable()) return { item, erreur: "Lecture automatique indisponible : ANTHROPIC_API_KEY absente." };
  if (item.readAt && !reprendre) return { item, erreur: "Déjà lue : seule une reprise explicite la relit." };

  const input = await entree(item).catch((e) => {
    throw new Error(`pièce introuvable au dépôt : ${e instanceof Error ? e.message : "erreur inconnue"}`);
  });
  if (!input) return { item, erreur: "Rien à lire : ni fichier exploitable ni texte." };

  const modele = modeleDeLecture();
  const t0 = Date.now();
  let draft: OfferDraft;
  let secondes: number | undefined;
  let erreur: string | undefined;
  try {
    const lu = await extractOffer(input);
    draft = lu.draft;
    secondes = lu.seconds;
    if (item.draft.official) draft.official = true;
  } catch (e) {
    erreur = e instanceof Error ? e.message : "erreur inconnue";
    draft = emptyDraft(Boolean(item.draft.official));
    draft.remarks = [`Lecture échouée : ${erreur}. Renseignez les champs à la main.`];
  }

  /* Le marqueur est posé DANS LES DEUX CAS : une pièce illisible retentée à
     chaque passe paierait son appel sans fin. Une personne peut toujours
     reprendre la lecture depuis le desk. */
  const apres = await r.updateIntake(item.id, {
    title: draft.title || item.title,
    state: draft.official ? "a_valider" : "bloque",
    draft,
    extractedIn: secondes,
    readAt: new Date().toISOString(),
    readModel: modele,
  });
  await r.logEvent({
    kind: "system",
    html: erreur ? `Pièce <b>${apres.title}</b> : lecture échouée (${modele}), champs à saisir` : `Pièce <b>${apres.title}</b> lue en ${secondes ?? Math.round((Date.now() - t0) / 1000)} s (${modele}) : à valider par une personne`,
  });
  return { item: apres, secondes, erreur };
}
