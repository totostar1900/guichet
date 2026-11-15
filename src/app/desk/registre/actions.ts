"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { positionsFrom } from "@/lib/positions";
import { ALPHABET_DES_CODES, CODES_KIND, LONGUEUR_DU_CODE, RELEVES_KIND, codeLibre } from "@/lib/domain/registre-des-parts";

export type RegistreResult = { ok: true; message: string } | { ok: false; error: string };

const manque = (e: unknown): boolean => /desk_prive/.test((e as Error).message);

/**
 * ATTRIBUER LES CODES PORTEUR : un code par client qui détient des parts, une fois pour toutes.
 *
 * Un code est tiré au hasard et rangé dans la table du desk : il n'a aucun lien lisible avec le client, il ne change plus, et il ne se
 * recalcule jamais d'un secret (une clef qui tourne ne doit pas casser ce que le gestionnaire a reçu). La table du desk n'est lue que par le desk.
 */
export async function attribuerLesCodes(): Promise<RegistreResult> {
  const me = await requireDesk("/desk/registre");
  const r = repo();
  try {
    const [intents, offers, existants] = await Promise.all([r.listIntents(), r.listOffers(), r.listPrive(CODES_KIND)]);
    const codes = new Map(existants.map((x) => [x.key, (x.data as { code?: string })?.code ?? ""]));
    const pris = new Set([...codes.values()].filter(Boolean));
    const detenteurs = new Set(positionsFrom(intents, offers).filter((p) => p.offer.kind === "FONDS" && p.intent.clientId).map((p) => p.intent.clientId as string));
    const sans = [...detenteurs].filter((c) => !codes.get(c));
    if (sans.length === 0) return { ok: true, message: "Chaque porteur a déjà son code." };
    const tirer = () => `P-${Array.from({ length: LONGUEUR_DU_CODE }, () => ALPHABET_DES_CODES[randomInt(ALPHABET_DES_CODES.length)]).join("")}`;
    for (const clientId of sans) {
      const code = codeLibre(pris, tirer);
      pris.add(code);
      await r.upsertPrive(CODES_KIND, clientId, { code }, me.name);
    }
    await audit("registre.codes", "desk_prive", CODES_KIND, { before: { attribues: codes.size }, after: { attribues: codes.size + sans.length }, reason: `${sans.length} code(s) porteur attribué(s)` });
    revalidatePath("/desk/registre");
    return { ok: true, message: `${sans.length} code(s) attribué(s).` };
  } catch (e) {
    return { ok: false, error: manque(e) ? "Le magasin réservé au desk n'existe pas encore : appliquer la migration 0130." : "Attribution impossible, réessayez." };
  }
}

const schema = z.object({ offerId: z.string().min(1), parts: z.coerce.number().min(0), au: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/** Saisir le relevé du compte global chez le gestionnaire : le total de parts de la maison à une date. L'avant et l'après passent par l'audit. */
export async function saisirLeReleve(_p: RegistreResult | null, form: FormData): Promise<RegistreResult> {
  const me = await requireDesk("/desk/registre");
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Relevé invalide : un nombre de parts et une date." };
  const r = repo();
  try {
    const avant = (await r.listPrive(RELEVES_KIND)).find((x) => x.key === p.data.offerId)?.data ?? null;
    const apres = { parts: p.data.parts, au: p.data.au };
    await r.upsertPrive(RELEVES_KIND, p.data.offerId, apres, me.name);
    await audit("registre.releve", "desk_prive", `${RELEVES_KIND}/${p.data.offerId}`, { before: avant, after: apres, reason: "relevé du compte global chez le gestionnaire" });
    revalidatePath("/desk/registre");
    return { ok: true, message: "Relevé enregistré." };
  } catch (e) {
    return { ok: false, error: manque(e) ? "Le magasin réservé au desk n'existe pas encore : appliquer la migration 0130." : "Enregistrement impossible, réessayez." };
  }
}
