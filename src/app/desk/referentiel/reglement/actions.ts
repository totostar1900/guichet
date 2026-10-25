"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { direLeGestePasseSeul, quatreYeux } from "@/lib/desk/quatre-yeux";
import { REF } from "@/lib/reference";
import { loadReglement } from "@/lib/policy";
import { cequiManque, REGLEMENT_KEY, type CoordonneesDeReglement } from "@/lib/domain/reglement";

export type ReglementResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * CE QU'UNE BANQUE ACCEPTE DANS CES CHAMPS.
 *
 * Pas de validation d'IBAN : la zone CEMAC n'en utilise pas partout, et un RIB
 * à vingt-trois chiffres sans code pays ne passerait aucun contrôle de clef
 * IBAN alors qu'il est parfaitement valide à Douala. Ce qui est vérifié, c'est
 * ce qui casse à coup sûr : un champ vide, et des caractères qu'un formulaire
 * de virement n'accepte pas.
 */
const CARACTERES_DU_RIB = /^[A-Za-z0-9 .\-/]+$/;

const schema = z.object({
  beneficiaire: z.string().trim().min(3).max(140),
  banque: z.string().trim().min(2).max(140),
  rib: z.string().trim().min(6).max(60).regex(CARACTERES_DU_RIB),
  bic: z
    .string()
    .trim()
    .max(11)
    .regex(/^([A-Za-z0-9]{8}|[A-Za-z0-9]{11})?$/)
    .optional(),
  quoi: z.string().trim().max(200).optional(),
});

const lignes = async () => (await repo().listReference(REF.policy)).find((x) => x.key === REGLEMENT_KEY);

/**
 * ENREGISTRER : UN BROUILLON, TOUJOURS.
 *
 * Ce n'est pas un seuil qu'on corrige en une saisie, c'est la destination de
 * l'argent de toute la clientèle. Une main seule ne l'écrit pas : le brouillon
 * attend qu'une AUTRE personne le publie, et c'est exactement la défense
 * contre la fraude au virement — le faux RIB arrive toujours par une seule
 * main pressée.
 */
export async function enregistrerReglementAction(_p: ReglementResult | null, form: FormData): Promise<ReglementResult> {
  const me = await requireResponsable("/desk/referentiel/reglement");
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) {
    return { ok: false, error: "Bénéficiaire, banque et RIB sont obligatoires. Le RIB n'accepte que lettres, chiffres, espaces, points, tirets et barres ; le BIC fait 8 ou 11 caractères." };
  }
  const next: CoordonneesDeReglement = { beneficiaire: p.data.beneficiaire, banque: p.data.banque, rib: p.data.rib, bic: p.data.bic || undefined };
  await repo().saveReferenceDraft(REF.policy, REGLEMENT_KEY, { op: "set", data: next }, me.name);
  /* AUDITÉ DÈS LE BROUILLON, et non seulement à la publication : savoir qui a
     PROPOSÉ un RIB compte autant que savoir qui l'a publié, puisque c'est la
     proposition qui porte le numéro. */
  await audit("reglement.brouillon", "reference", `${REF.policy}/${REGLEMENT_KEY}`, { after: next, reason: p.data.quoi || "coordonnées de règlement proposées" });
  revalidatePath("/desk/referentiel/reglement");
  return { ok: true, message: "Brouillon enregistré. Rien n'a bougé pour les clients : il faut qu'une autre personne le publie." };
}

/**
 * PUBLIER : PAS LA MÊME MAIN QUE CELLE QUI A ÉCRIT.
 *
 * La règle est celle de la file d'approbations — « la personne qui propose ne
 * peut pas approuver » — et elle regarde la PERSONNE, pas le rôle. Dans une
 * maison qui n'a qu'un responsable, le contrôle est impossible et non à
 * inventer : le geste passe, et il SE DIT (audit dédié, ligne au journal,
 * compteur en Santé).
 */
export async function publierReglementAction(_p: ReglementResult | null, form: FormData): Promise<ReglementResult> {
  const me = await requireResponsable("/desk/referentiel/reglement");
  const mot = String(form.get("mot") ?? "").trim().toLowerCase();
  if (mot !== "publier") return { ok: false, error: "Recopiez le mot « publier » pour confirmer." };

  const row = await lignes();
  const brouillon = row?.draft?.op === "set" ? (row.draft.data as CoordonneesDeReglement) : undefined;
  if (!brouillon) return { ok: false, error: "Aucun brouillon à publier." };
  const manque = cequiManque(brouillon);
  if (manque.length) return { ok: false, error: `Le brouillon est incomplet : ${manque.join(", ")}.` };

  const parQui = row?.draftBy ?? "";
  if (parQui && parQui === me.name) {
    /* Quatre yeux : la raison de sensibilité est toujours présente ici, parce
       que ce geste est sensible par nature et non selon un seuil. */
    const verdict = await quatreYeux(me, "le compte de règlement de la maison : un RIB publié détourne les virements de toute la clientèle");
    if (verdict.quoi === "attend") {
      return { ok: false, error: "Vous avez écrit ce brouillon : une autre personne du desk doit le publier. Il l'attend ici." };
    }
    if (verdict.quoi === "seul") {
      await direLeGestePasseSeul(me, "Compte de règlement publié", `${REF.policy}/${REGLEMENT_KEY}`, verdict.raison, verdict.motif);
    }
  }

  const avant = await loadReglement();
  const r = repo();
  await r.publishReference(REF.policy, [REGLEMENT_KEY]);
  await audit("reglement.publier", "reference", `${REF.policy}/${REGLEMENT_KEY}`, { before: avant, after: brouillon, reason: `écrit par ${parQui || "inconnu"}, publié par ${me.name}` });
  await r.logEvent({
    kind: "desk",
    html: `<b>Compte de règlement</b> publié : ${brouillon.banque} · <span class="mono">${brouillon.rib}</span> · écrit par ${parQui || "inconnu"}, publié par ${me.name}`,
  });
  for (const path of ["/desk/referentiel/reglement", "/desk/referentiel", "/moi/provision/alimenter"]) revalidatePath(path);
  return { ok: true, message: "Publié. Les clients lisent ces coordonnées dès maintenant, et les appels de fonds les portent." };
}

export async function jeterReglementAction(): Promise<ReglementResult> {
  const me = await requireResponsable("/desk/referentiel/reglement");
  const row = await lignes();
  const brouillon = row?.draft?.op === "set" ? (row.draft.data as CoordonneesDeReglement) : undefined;
  await repo().discardReference(REF.policy, [REGLEMENT_KEY]);
  /* UN BROUILLON JETÉ SE DIT AUSSI : c'est le seul geste par lequel un RIB
     proposé disparaît sans laisser de ligne publiée, et un refus silencieux
     ressemble trait pour trait à une proposition qui n'a jamais existé. */
  if (brouillon) {
    await audit("reglement.jeter", "reference", `${REF.policy}/${REGLEMENT_KEY}`, { before: brouillon, reason: `brouillon de ${row?.draftBy ?? "inconnu"} jeté par ${me.name}` });
    await repo().logEvent({ kind: "desk", html: `<b>Compte de règlement</b> : brouillon de ${row?.draftBy ?? "inconnu"} jeté par ${me.name}` });
  }
  revalidatePath("/desk/referentiel/reglement");
  return { ok: true, message: "Brouillon abandonné." };
}
