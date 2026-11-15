"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { RECU_KIND, cleDuRecu } from "@/lib/domain/retrocession";

export type RecuResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({ source: z.string().min(1).max(120), mois: z.string().regex(/^\d{4}-\d{2}$/), montant: z.coerce.number().min(0), le: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/**
 * SAISIR CE QUI EST ARRIVÉ D'UN PARTENAIRE OU D'UN ÉMETTEUR pour un mois : une somme et le jour où elle est arrivée.
 *
 * Elle se range dans la table du desk (`desk_prive`), jamais dans la table de référence qui est publique. L'avant et l'après passent par
 * l'audit : un montant reçu qu'on corrige doit laisser sa trace.
 */
export async function saisirLeRecu(_p: RecuResult | null, form: FormData): Promise<RecuResult> {
  const me = await requireDesk("/desk/frais/rapprochement");
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Saisie invalide : une somme en francs et une date." };
  const r = repo();
  const cle = cleDuRecu(p.data.source, p.data.mois);
  try {
    const avant = (await r.listPrive(RECU_KIND)).find((x) => x.key === cle)?.data ?? null;
    const apres = { montant: p.data.montant, le: p.data.le };
    await r.upsertPrive(RECU_KIND, cle, apres, me.name);
    await audit("frais.recu", "desk_prive", `${RECU_KIND}/${cle}`, { before: avant, after: apres, reason: "reçu d'un partenaire ou d'un émetteur" });
    revalidatePath("/desk/frais/rapprochement");
    return { ok: true, message: "Reçu enregistré." };
  } catch (e) {
    return { ok: false, error: /desk_prive/.test((e as Error).message) ? "Le magasin réservé au desk n'existe pas encore : appliquer la migration 0130." : "Enregistrement impossible, réessayez." };
  }
}
