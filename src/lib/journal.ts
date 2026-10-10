import "server-only";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { clefDuJour, estQuotidien, genreDe, GESTES } from "@/lib/domain/journal-client";

/**
 * NOTER UN GESTE DU CLIENT.
 *
 * Une ligne par geste, et la phrase ne s'écrit pas ici : le nom suffit, le
 * catalogue porte le reste. L'appelant dit CE QU'IL A FAIT, pas comment cela
 * se raconte, parce que la même ligne se lit dans deux écrans et deux
 * langues.
 *
 * UN JOURNAL QUI CASSE UN GESTE EST PIRE QUE PAS DE JOURNAL. Rien ne remonte
 * à l'appelant : un client qui signe son mandat ne doit pas voir sa signature
 * échouer parce qu'une ligne de registre n'est pas passée. L'échec part dans
 * la sortie d'erreur du serveur, où Santé et les journaux de la plateforme le
 * trouvent, et nulle part ailleurs.
 *
 * Le nom est vérifié contre le catalogue : une faute de frappe écrirait une
 * ligne que personne ne saurait plus nommer, et elle se verrait au premier
 * essai plutôt qu'au bout d'un an.
 */
export async function noter(
  geste: string,
  detail: { objet?: string; detail?: string; canal?: string; userId?: string } = {},
): Promise<void> {
  try {
    if (!GESTES[geste]) {
      console.error(`journal : geste inconnu « ${geste} »`);
      return;
    }
    const userId = detail.userId ?? (await getSession())?.userId;
    if (!userId) return; // un visiteur sans compte n'a pas de journal

    let ip: string | undefined;
    let userAgent: string | undefined;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
      userAgent = h.get("user-agent")?.slice(0, 200) ?? undefined;
    } catch {
      // hors d'une requête : un cron ou un essai
    }

    await repo().logClientAction({
      userId,
      geste,
      genre: genreDe(geste),
      objet: detail.objet,
      detail: detail.detail,
      canal: detail.canal,
      ip,
      userAgent,
      clefDuJour: estQuotidien(geste) ? clefDuJour(userId, geste, detail.objet, new Date().toISOString().slice(0, 10)) : undefined,
    });
  } catch (e) {
    console.error("journal :", e instanceof Error ? e.message : e);
  }
}
