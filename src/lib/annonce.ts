import { repo } from "@/lib/data";
import { REF_ANNONCE, annonceEnCours, type Annonce } from "@/lib/domain/annonce";

/** Toutes les annonces, de la plus récente à la plus ancienne. Une ligne de la table dont le contenu n'est pas une annonce est ignorée. */
export async function listerAnnonces(): Promise<Annonce[]> {
  const rows = await repo().listReference(REF_ANNONCE).catch(() => []);
  return rows
    .map((r) => r.data as Annonce | null)
    .filter((a): a is Annonce => Boolean(a && typeof a.texte === "string" && typeof a.id === "string"))
    .sort((a, b) => b.publieeLe.localeCompare(a.publieeLe));
}

/** L'annonce affichée aujourd'hui, ou rien. Une seule lecture, bornée à une petite table. */
export async function annonceDuJour(aujourdhui = new Date().toISOString().slice(0, 10)): Promise<Annonce | undefined> {
  return annonceEnCours(await listerAnnonces(), aujourdhui);
}
