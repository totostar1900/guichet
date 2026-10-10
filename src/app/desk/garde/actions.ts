"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { baremeOuvert, periodeDeCle, type BaremeGarde } from "@/lib/domain/garde";
import { apercuGarde } from "./apercu";
import { GARDE_POLICY_KEY, loadBaremeGarde } from "@/lib/policy";
import { REF } from "@/lib/reference";
import { escapeHtml, fmt } from "@/lib/format";

export type GardeResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Deux gestes, et tous deux appartiennent au responsable.
 *
 * Arrêter le barème est une décision de maison : c'est le prix d'un service, et
 * il engage tous les clients à la fois. Émettre les avis prélève réellement, et
 * un prélèvement n'est pas une tâche d'opérateur.
 *
 * Le barème est fermé tant que personne ne l'a ouvert, et son absence a un
 * sens : il n'y a pas de tarif par défaut, parce qu'un tarif par défaut serait
 * un prélèvement décidé par le code.
 */
const baremeSchema = z.object({
  bps: z.coerce.number().min(0).max(500),
  minimum: z.coerce.number().min(0),
  franchise: z.coerce.number().min(0),
  /* Un fonds porte déjà ses frais dans sa valeur liquidative : l'exonérer par
     défaut évite de facturer deux fois la même conservation. */
  exonereFonds: z.union([z.literal("on"), z.literal("")]).optional(),
});

export async function arreterBareme(_p: GardeResult | null, form: FormData): Promise<GardeResult> {
  const me = await requireResponsable("/desk/garde");
  const p = baremeSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Barème invalide : un taux en points de base, un plancher et une franchise en francs." };
  const next: BaremeGarde = {
    bps: p.data.bps,
    minimum: p.data.minimum,
    franchise: p.data.franchise,
    exonerees: p.data.exonereFonds ? ["FONDS"] : [],
  };
  const r = repo();
  const before = await loadBaremeGarde();
  await r.upsertReference(REF.policy, GARDE_POLICY_KEY, next, me.name);
  await audit("policy.garde", "reference", `${REF.policy}/${GARDE_POLICY_KEY}`, { before, after: next, reason: `barème de garde ${next.bps} pb` });
  await r.logEvent({
    kind: "system",
    html: baremeOuvert(next)
      ? `<b>Droits de garde</b> : barème arrêté à ${next.bps} points de base, plancher ${fmt(next.minimum)} FCFA, franchise ${fmt(next.franchise)} FCFA · par ${escapeHtml(me.name)}`
      : `<b>Droits de garde</b> : barème refermé, plus rien n'est facturé · par ${escapeHtml(me.name)}`,
  });
  revalidatePath("/desk/garde");
  return { ok: true, message: baremeOuvert(next) ? `Barème arrêté : ${next.bps} points de base par an.` : "Barème refermé : plus rien n'est facturé." };
}

const emissionSchema = z.object({ period: z.string().regex(/^\d{4}-T[1-4]$/) });

/**
 * Émettre les avis d'une période, et prélever ce qui est dû.
 *
 * Trois garanties, et chacune évite une erreur qu'on ne verrait pas passer.
 *
 * L'avis se GARDE avec son barème et son détail recopiés. Les positions sont le
 * registre et tout s'en déduit, ce qui est vrai tant qu'on regarde aujourd'hui :
 * un avis du deuxième trimestre doit rester ce qu'il disait, même si la
 * position a bougé depuis.
 *
 * Il ne s'émet QU'UNE FOIS par client et par période, et la base le garantit
 * deux fois : sur l'avis, et sur le mouvement du journal. Un double
 * prélèvement ressemble à un fonctionnement normal, et c'est pour cela que
 * personne ne le voit.
 *
 * Un avis à ZÉRO s'émet quand même. Il dit au client que sa conservation a été
 * calculée et qu'elle ne lui coûte rien, ce qui est une information ; et il
 * empêche qu'un barème ouvert plus tard rattrape un trimestre déjà arrêté.
 */
export async function emettreAvis(_p: GardeResult | null, form: FormData): Promise<GardeResult> {
  const me = await requireResponsable("/desk/garde");
  const p = emissionSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Période invalide." };
  const bareme = await loadBaremeGarde();
  const periode = periodeDeCle(p.data.period);
  if (!periode) return { ok: false, error: "Période invalide." };

  const r = repo();
  const apercu = await apercuGarde(periode, bareme);
  const aEmettre = apercu.filter((c) => !c.dejaEmis);
  if (!aEmettre.length) return { ok: false, error: "Tous les avis de cette période sont déjà émis." };

  let emis = 0;
  let preleve = 0;
  for (const c of aEmettre) {
    const d = c.droits;
    let cashId: string | undefined;
    /* On ne passe un mouvement que s'il y a quelque chose à prélever : un
       mouvement de zéro franc encombrerait le journal sans rien dire. */
    if (d.du > 0) {
      const entry = await r.addCash({
        userId: c.clientId,
        amount: Math.round(d.du),
        kind: "frais",
        label: `Droits de garde ${periode.cle}`,
        feePeriod: periode.cle,
        createdBy: me.name,
      });
      cashId = entry.id;
      preleve += Math.round(d.du);
    }
    const avis = await r.createCustodyNotice({
      userId: c.clientId,
      clientName: c.nom,
      period: periode.cle,
      periodFrom: periode.du,
      periodTo: periode.au,
      bareme,
      lignes: d.lignes,
      assietteMoyenne: d.assietteMoyenne,
      brut: d.brut,
      du: d.du,
      raison: d.raison,
      plancher: d.plancherApplique,
      cashId,
      issuedBy: me.name,
    });
    /* L'AVIS DEVIENT UN PAPIER NUMÉROTÉ : un frais qu'on ne voit qu'en ligne
       est un frais qu'on subit ; celui qu'on peut citer dans une réclamation
       est un frais qu'on vérifie. Son échec n'arrête pas l'arrêté : les
       droits sont calculés, et un avis manquant se voit au journal. */
    try {
      const { generateAvisGarde } = await import("@/lib/documents/generate");
      await generateAvisGarde(avis.id, me.name);
    } catch (e) {
      await r.logEvent({ kind: "system", html: `Avis de garde ${avis.ref} non produit en PDF : ${e instanceof Error ? e.message : "erreur"}` });
    }
    await audit("garde.avis", "client", c.clientId, { after: { ref: avis.ref, period: periode.cle, du: d.du }, reason: `avis de garde ${periode.cle} · ${fmt(Math.round(d.du))} FCFA` });
    emis += 1;
  }

  await r.logEvent({
    kind: "desk",
    html: `<b>Droits de garde ${periode.cle}</b> : ${emis} avis émis, ${fmt(preleve)} FCFA prélevés · par ${escapeHtml(me.name)}`,
  });
  revalidatePath("/desk/garde");
  revalidatePath("/");
  return {
    ok: true,
    message: preleve > 0 ? `${emis} avis émis, ${fmt(preleve)} FCFA prélevés.` : `${emis} avis émis. Le barème étant fermé, rien n'a été prélevé.`,
  };
}

