"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { noter } from "@/lib/journal";
import { repo } from "@/lib/data";
import { INSTRUMENTS_SONDES, manquesDeLaLigne } from "@/lib/domain/sondage";
import { PAYS_CEMAC } from "@/lib/market/budget";
import { fmt, localIso, parseAmount } from "@/lib/format";
import type { Country, NewLigneSondee } from "@/lib/domain/types";

export type SondageResult = { ok: true; ref: string; message: string } | { ok: false; error: string };

const PATH = "/sondage";

/**
 * CE QUE LE CLIENT DÉPOSE : UNE ATTENTE, ET RIEN D'AUTRE.
 *
 * Ni un ordre, ni une offre — voir « domain/sondage ». Elle ne passe donc pas
 * par « garde("ordre.deposer") », qui vérifie une clôture et un montant
 * d'engagement : il n'y a ici ni clôture ni engagement, et appeler ce garde
 * ferait refuser une attente parce qu'une séance qui n'existe pas serait
 * fermée. Ce qui la borne est son propre gabarit, et lui seul.
 */
const champs = z.object({
  /** La question à laquelle on répond, s'il y en a une. */
  repondA: z.string().optional(),
  instrument: z.enum(INSTRUMENTS_SONDES),
  country: z.string().optional(),
  tenor: z.string().max(40).optional(),
  rate: z.string().optional(),
  pricePct: z.string().optional(),
  montant: z.string().optional(),
  /** L'un OU l'autre : la contrainte de la base refuse les deux. */
  seanceLe: z.string().optional(),
  dansJours: z.string().optional(),
  note: z.string().max(600).optional(),
});

const nombre = (v?: string): number | undefined => {
  if (!v?.trim()) return undefined;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

export async function deposerLaLigne(_p: SondageResult | null, form: FormData): Promise<SondageResult> {
  const s = await requireSession(PATH);
  const p = champs.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Ce formulaire est incomplet : reprenez le gabarit." };
  const d = p.data;
  const r = repo();

  /* UNE RÉPONSE HÉRITE DE SA QUESTION, et c'est tout l'intérêt d'y répondre :
     le client y dit « combien » et « quand », pas « quel Trésor, quelle
     durée » — la question les porte déjà. Les recopier dans le formulaire
     ouvrirait la porte à une réponse qui ne répond pas à ce qu'on a demandé. */
  let question: Awaited<ReturnType<typeof r.listLignesSondees>>[number] | undefined;
  if (d.repondA) {
    question = (await r.listLignesSondees({ origine: "desk" })).find((x) => x.id === d.repondA);
    if (!question) return { ok: false, error: "Cette ligne sondée n'est plus ouverte : le desk l'a close." };
    if (question.state === "close") return { ok: false, error: "Cette ligne sondée est close : le desk ne la porte plus." };
  }

  const ligne: NewLigneSondee = {
    origine: "client",
    repondA: question?.id,
    userId: s.userId,
    clientName: s.name,
    clientSegment: s.segment,
    instrument: question?.instrument ?? d.instrument,
    country: (question?.country ?? (d.country as Country)) as Country,
    tenor: (question?.tenor ?? d.tenor ?? "").trim(),
    rate: nombre(d.rate),
    pricePct: question?.instrument === "BTA" || d.instrument === "BTA" ? undefined : nombre(d.pricePct),
    montant: parseAmount(d.montant ?? "") ?? 0,
    seanceLe: d.seanceLe?.trim() || undefined,
    dansJours: d.seanceLe?.trim() ? undefined : nombre(d.dansJours),
    note: d.note?.trim() || undefined,
  };

  if (!PAYS_CEMAC.includes(ligne.country)) return { ok: false, error: "Ce Trésor n'est pas de la zone : les six sont le Cameroun, le Gabon, le Congo, le Tchad, la RCA et la Guinée équatoriale." };
  const manques = manquesDeLaLigne(ligne, localIso(new Date()));
  if (manques.length) return { ok: false, error: manques.join(" ") };

  /* UNE SEULE ATTENTE PAR CLIENT ET PAR QUESTION. Deux réponses à la même
     question compteraient deux fois dans le consensus porté au Trésor, et le
     client qui corrige son montant croirait l'avoir remplacé. La seconde
     remplace donc la première, qui se clôt avec son motif. */
  if (question) {
    const sienne = (await r.listLignesSondees({ userId: s.userId })).find((x) => x.repondA === question!.id && x.state !== "close");
    if (sienne) await r.updateLigneSondee(sienne.id, { state: "close", closedReason: "Remplacée par votre nouvelle réponse." });
  }

  const creee = await r.createLigneSondee(ligne);
  await noter("sondage.depose", { objet: creee.ref, detail: `${creee.instrument} ${creee.country} ${creee.tenor} · ${fmt(creee.montant)} FCFA` });
  revalidatePath(PATH);
  revalidatePath("/desk/sondage");
  return {
    ok: true,
    ref: creee.ref,
    message: question
      ? "Votre réponse est au desk. Elle ne vous engage à rien : c'est un renseignement, et il sert à dire au Trésor à quel niveau la demande tient encore."
      : "Votre ligne est au desk. Elle ne vous engage à rien, et elle attend d'autres clients : une ligne se porte à un Trésor quand plusieurs la demandent.",
  };
}

/**
 * RETIRER SON ATTENTE, et c'est le seul geste que le client ait sur l'état.
 *
 * « Portée au Trésor » est un FAIT que le desk constate, pas une case que le
 * client coche. Mais retirer la sienne lui appartient : rien ne l'engageait, et
 * une attente qu'on ne peut pas défaire est une attente qui se garde — c'est
 * exactement le reproche que la maison s'est fait sur l'ordre sans bouton de
 * retrait.
 */
export async function retirerLaLigne(id: string): Promise<{ ok: boolean; error?: string }> {
  const s = await requireSession(PATH);
  const r = repo();
  const sienne = (await r.listLignesSondees({ userId: s.userId })).find((x) => x.id === id);
  if (!sienne) return { ok: false, error: "Cette attente n'est pas la vôtre." };
  if (sienne.state === "close") return { ok: true };
  await r.updateLigneSondee(id, { state: "close", closedReason: "Retirée par vous." });
  await noter("sondage.retire", { objet: sienne.ref });
  revalidatePath(PATH);
  revalidatePath("/desk/sondage");
  return { ok: true };
}
