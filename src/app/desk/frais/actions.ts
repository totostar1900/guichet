"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { CLES_DE_REGLE, LIBELLE_DE_REGLE, REGLES_LUES_PAR_L_ORDRE, departRefuse, exigeUnPreavis, type BaremeDeFrais, type CleDeRegle, type RegleDeFrais } from "@/lib/domain/frais";
import { FRAIS_POLICY_KEY, loadBaremeDeFrais } from "@/lib/policy";
import { REF } from "@/lib/reference";

export type FraisResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * ARRÊTER UNE RÈGLE DU BARÈME : un geste de la direction, jamais d'un opérateur.
 *
 * Une règle est un prix, et il engage tous les clients à la fois. Trois garde-fous :
 *   - une HAUSSE du prix du client demande une date de départ à trente jours au moins (article 6 de la convention) ; une baisse ou
 *     une fermeture s'applique tout de suite ;
 *   - rien n'est écrit sans l'avant et l'après dans l'audit ;
 *   - une règle sans date de départ calcule zéro, quel que soit son taux.
 */
const nombre = z.coerce.number().min(0);
const schema = z.object({
  cle: z.enum(CLES_DE_REGLE),
  clientPct: z.coerce.number().min(0).max(5),
  clientMin: nombre,
  clientMax: nombre,
  tiersPct: z.coerce.number().min(0).max(10),
  tiersPartDesDroitsPct: z.coerce.number().min(0).max(100),
  tiersEncoursPct: z.coerce.number().min(0).max(10),
  tiersMin: nombre,
  tiersMax: nombre,
  tiersEncoursMin: nombre,
  tiersEncoursMax: nombre,
  effetLe: z.string().optional(),
});

export async function arreterRegle(_p: FraisResult | null, form: FormData): Promise<FraisResult> {
  const me = await requireResponsable("/desk/frais");
  const p = schema.safeParse({ clientPct: "0", tiersPartDesDroitsPct: "0", tiersEncoursPct: "0", tiersEncoursMin: "0", tiersEncoursMax: "0", ...Object.fromEntries(form) });
  if (!p.success) return { ok: false, error: "Règle invalide : des taux en pourcentage, des montants en francs." };
  const cle: CleDeRegle = p.data.cle;
  const avant = await loadBaremeDeFrais();
  const ancienne = avant[cle];
  const effetLe = p.data.effetLe?.trim() || undefined;
  const prochaine: RegleDeFrais = {
    clientPct: p.data.clientPct,
    clientMin: p.data.clientMin,
    clientMax: p.data.clientMax,
    tiersPct: p.data.tiersPct,
    tiersPartDesDroitsPct: p.data.tiersPartDesDroitsPct,
    tiersEncoursPct: p.data.tiersEncoursPct,
    tiersMin: p.data.tiersMin,
    tiersMax: p.data.tiersMax,
    tiersEncoursMin: p.data.tiersEncoursMin,
    tiersEncoursMax: p.data.tiersEncoursMax,
    ...(effetLe ? { effetLe } : {}),
  };
  const aujourdHui = new Date().toISOString().slice(0, 10);
  if (prochaine.clientPct > 0 && !REGLES_LUES_PAR_L_ORDRE.includes(cle)) return { ok: false, error: "Le calcul de l'ordre ne lit pas encore cette règle : sur un fonds, les frais du client sont ceux du fonds. Les champs « reçu » et la fermeture d'une règle restent possibles." };
  if (prochaine.clientPct > 0 && !effetLe) return { ok: false, error: "Un taux sans date de départ ne s'applique à personne : fixez la date." };
  if (prochaine.clientMax > 0 && prochaine.clientMax < prochaine.clientMin) return { ok: false, error: "Frais du client : le plafond est inférieur au plancher." };
  if (prochaine.tiersMax > 0 && prochaine.tiersMax < prochaine.tiersMin) return { ok: false, error: "Reçu de tiers : le plafond est inférieur au plancher." };
  if (prochaine.tiersEncoursMax > 0 && prochaine.tiersEncoursMax < prochaine.tiersEncoursMin) return { ok: false, error: "Rétrocession sur encours : le plafond mensuel est inférieur au plancher." };
  const dateChangee = effetLe !== ancienne.effetLe;
  const hausse = exigeUnPreavis(ancienne, prochaine);
  if (effetLe && (hausse || (dateChangee && prochaine.clientPct > 0))) {
    const refus = departRefuse(effetLe, aujourdHui);
    if (refus) return { ok: false, error: refus };
  }
  if (hausse || dateChangee) prochaine.annonceLe = aujourdHui;
  else if (ancienne.annonceLe) prochaine.annonceLe = ancienne.annonceLe;

  const apres: BaremeDeFrais = { ...avant, [cle]: prochaine };
  const r = repo();
  await r.upsertReference(REF.policy, FRAIS_POLICY_KEY, apres, me.name);
  await audit("policy.frais", "reference", `${REF.policy}/${FRAIS_POLICY_KEY}`, { before: ancienne, after: prochaine, reason: `règle « ${LIBELLE_DE_REGLE[cle]} »` });
  revalidatePath("/desk/frais");
  revalidatePath("/moi/tarifs");
  return { ok: true, message: prochaine.clientPct > 0 ? `Règle arrêtée, départ le ${effetLe}.` : "Règle fermée : rien n'est pris sur cette opération." };
}
