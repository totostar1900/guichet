"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { REF } from "@/lib/reference";
import { SOUFFRANCE_DEFAUT, SOUFFRANCE_KEY, type DelaiDeSouffrance } from "@/lib/domain/souffrance";

export type DelaiResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  jours: z.coerce.number().int().min(1).max(120),
  avantCloture: z.coerce.number().int().min(0).max(30),
});

/**
 * ENREGISTRER LE DÉLAI : TOUT DE SUITE, ET NON EN BROUILLON.
 *
 * Le barème de l'activité passe par un brouillon parce qu'il commande les
 * cohortes, donc les envois : un poids changé d'un trait modifierait une liste
 * de diffusion sans que personne ne l'ait regardée. Ce délai-ci ne commande
 * rien de tel. Il colore une colonne et remplit une pastille ; un délai trop
 * court fait du bruit, un délai trop long rend la pastille inutile, et les
 * deux se corrigent en une saisie. Lui imposer un brouillon ajouterait un
 * geste sans rien protéger.
 *
 * Il reste AUDITÉ et JOURNALISÉ, parce que savoir qui a desserré un seuil
 * compte même quand desserrer ne casse rien.
 */
export async function enregistrerDelaiAction(_p: DelaiResult | null, form: FormData): Promise<DelaiResult> {
  const me = await requireResponsable("/desk/referentiel/souffrance");
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Deux nombres entiers de jours : de 1 à 120, et de 0 à 30." };

  const next: DelaiDeSouffrance = { jours: p.data.jours, avantCloture: p.data.avantCloture };
  const r = repo();
  const before = (await r.listReference(REF.policy)).find((x) => x.key === SOUFFRANCE_KEY)?.data ?? SOUFFRANCE_DEFAUT;
  await r.upsertReference(REF.policy, SOUFFRANCE_KEY, next, me.name);
  await audit("policy.update", "reference", `${REF.policy}/${SOUFFRANCE_KEY}`, { before, after: next });
  await r.logEvent({
    kind: "desk",
    html: `Délai de souffrance modifié par ${me.name} : ${next.jours} jours sans mouvement, ${next.avantCloture} jours avant clôture`,
  });
  revalidatePath("/desk/referentiel/souffrance");
  revalidatePath("/desk");
  return { ok: true, message: "Délai enregistré. Le carnet le lit dès maintenant." };
}
