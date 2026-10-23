"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { pourquoiPasEcarter } from "@/lib/domain/relance";
import { noter } from "@/lib/journal";

export type RappelResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({ ids: z.string().min(1), motif: z.string().max(400).optional() });

/**
 * LE CLIENT DEMANDE QU'ON SE TAISE, ET LA MAISON SE TAIT.
 *
 * Sans motif, sans confirmation du desk, sans délai. C'est la contrepartie
 * exacte du droit de relancer : une maison qui rappelle cinq fois doit
 * pouvoir être arrêtée une fois, et l'arrêt ne se négocie pas.
 *
 * CE QUE CE GESTE NE FAIT PAS, et c'est l'essentiel : il n'annule rien. Le
 * bulletin reste à signer, la convention reste à accepter, le mandat reste
 * prêt — tout cela reste visible dans le Guichet, à sa place, avec son
 * bouton. Seuls les MESSAGES cessent. Confondre les deux serait la faute
 * grave de ce lot : le client croirait avoir annulé un ordre, et il
 * découvrirait le contraire au pire moment.
 *
 * PLUSIEURS IDENTIFIANTS D'UN COUP, parce qu'une attente en groupe plusieurs.
 * « 3 ordres » porte trois rappels, et celui qui écarte les écarte tous les
 * trois : lui en éteindre un sur trois serait le contraire de ce qu'il
 * demande. Chacun est relu contre SA session — un identifiant deviné ne fait
 * donc rien taire chez un autre.
 */
export async function ecarterRappelAction(_p: RappelResult | null, form: FormData): Promise<RappelResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Votre session a expiré. Reconnectez-vous." };
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Demande incomplète." };

  const r = repo();
  const siennes = await r.listRelances({ userId: session.userId });
  const vises = p.data.ids
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  let n = 0;
  let refus: string | null = null;
  for (const id of vises) {
    const x = siennes.find((q) => q.id === id);
    const pourquoi = pourquoiPasEcarter(x);
    if (pourquoi || !x) {
      refus ??= pourquoi;
      continue;
    }
    await r.majRelance(x.id, { state: "ecartee", motif: p.data.motif?.trim() || undefined });
    await audit("relance.ecartee", "relance", x.id, { before: { state: x.state }, after: { state: "ecartee" } });
    n++;
  }
  /* Rien d'écarté et une raison : on la rend, elle est juste (déjà écarté,
     déjà fait). Rien d'écarté et aucune raison : les identifiants ne sont pas
     à ce client, et on ne le lui confirme pas. */
  if (!n) return { ok: false, error: refus ?? "Ce rappel n'existe pas, ou il ne vous appartient pas." };

  await noter("rappel.ecarte", { objet: siennes.find((q) => q.id === vises[0])?.sujet });
  revalidatePath("/", "layout");
  return { ok: true, message: "C'est noté : nous ne vous le rappellerons plus. La démarche reste ici quand vous voudrez la reprendre." };
}
