"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { cheminDeFavori } from "@/lib/domain/favoris";
import { noter } from "@/lib/journal";

/**
 * Mettre une PAGE en favori, ou l'en retirer. Les lignes ont leur étoile à
 * elles (« toggleWatch ») : une ligne favorite est une ligne suivie.
 *
 * Le chemin est nettoyé par « cheminDeFavori » : un favori ne mène jamais hors
 * de la maison, et un client ne peut pas ranger ici une adresse qu'on lui
 * soufflerait. Le titre est borné, et copié tel que le client l'a vu.
 */
export async function basculerFavori(href: string, titre: string, on: boolean): Promise<{ ok: boolean; favori: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false, favori: false };
  const chemin = cheminDeFavori(href);
  if (!chemin) return { ok: false, favori: !on };
  const nom = titre.replace(/\s+/g, " ").trim().slice(0, 120) || chemin;
  try {
    if (on) await repo().addFavori(session.userId, chemin, nom);
    else await repo().removeFavori(session.userId, chemin);
  } catch {
    return { ok: false, favori: !on }; // table absente (migration 0123) : l'étoile reste où elle était
  }
  await noter(on ? "favori.pose" : "favori.retire", { objet: chemin, detail: nom });
  revalidatePath("/favoris");
  return { ok: true, favori: on };
}

/** Cette page est-elle déjà un favori ? Lue à l'ouverture du menu, jamais devinée. */
export async function estFavori(href: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  const chemin = cheminDeFavori(href);
  if (!chemin) return false;
  try {
    return (await repo().listFavoris(session.userId)).some((f) => f.href === chemin);
  } catch {
    return false;
  }
}
