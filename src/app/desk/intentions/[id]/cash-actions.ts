"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { cashPosition, CLOSED, mayHold, toRestore } from "@/lib/domain/cash";
import { escapeHtml, fmt } from "@/lib/format";

export type CashResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Les deux gestes du desk sur les espèces d'un client.
 *
 * Ils sont volontairement pauvres. Un mouvement s'ajoute, jamais ne se corrige,
 * et rien ici ne devine : c'est l'opérateur qui constate l'arrivée d'un virement
 * sur le compte de règlement et l'inscrit, avec l'ordre auquel il est destiné.
 *
 * Le refus d'encaisser sans destination n'est pas une préférence d'écran : une
 * provision sans opération est de l'argent qui dort, et le garder ressemble à un
 * dépôt que la maison n'a pas l'agrément de recevoir. La règle vit dans
 * `domain/cash.ts` et cette action s'y plie.
 */
const provisionSchema = z.object({
  intentId: z.string().min(1),
  amount: z.coerce.number().positive("Le montant doit être positif."),
  dueBy: z.string().optional(),
});

export async function recordProvision(_p: CashResult | null, form: FormData): Promise<CashResult> {
  const desk = await requireDesk("/desk");
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim()) raw[k] = v.trim().replace(/\s/g, "").replace(",", ".");
  });
  const p = provisionSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Montant invalide." };
  const r = repo();
  const it = (await r.listIntents()).find((x) => x.id === p.data.intentId);
  if (!it || !it.clientId) return { ok: false, error: "Ordre introuvable, ou client sans compte." };
  // La règle, avant l'écriture : une provision porte toujours son ordre.
  if (!mayHold({ kind: "provision", intentId: it.id }, CLOSED)) return { ok: false, error: "Une provision sans opération ne s'encaisse pas." };
  const entry = await r.addCash({ userId: it.clientId, amount: p.data.amount, kind: "provision", label: `Provision reçue pour ${it.ref}`, intentId: it.id, dueBy: p.data.dueBy, createdBy: desk.name });
  await audit("cash.provision", "intent", it.id, { after: { amount: p.data.amount, entry: entry.id }, reason: `provision ${fmt(p.data.amount)} FCFA · ${it.ref}` });
  await r.logEvent({ kind: "desk", intentId: it.id, html: `<b>${fmt(p.data.amount)} FCFA</b> reçus en provision de ${escapeHtml(it.clientName)} pour ${it.ref} · par ${desk.name}` });
  revalidatePath(`/desk/intentions/${it.id}`);
  return { ok: true, message: `${fmt(p.data.amount)} FCFA inscrits, affectés à ${it.ref}.` };
}

/**
 * Renvoyer à la banque du client ce qui ne va nulle part.
 *
 * Le montant n'est pas saisi : il est calculé. Laisser l'opérateur le taper
 * ouvrirait l'écart entre ce que la maison doit et ce qu'elle rend, et c'est
 * précisément l'écart que ce journal existe pour fermer.
 */
export async function recordRestitution(_p: CashResult | null, form: FormData): Promise<CashResult> {
  const desk = await requireDesk("/desk");
  const intentId = String(form.get("intentId") ?? "");
  const r = repo();
  const it = (await r.listIntents()).find((x) => x.id === intentId);
  if (!it || !it.clientId) return { ok: false, error: "Ordre introuvable, ou client sans compte." };
  const [entries, intents] = await Promise.all([r.listCash(it.clientId), r.listIntents()]);
  const mine = intents.filter((x) => x.clientId === it.clientId);
  const due = toRestore(entries, mine, CLOSED);
  if (due <= 0) return { ok: false, error: "Rien à restituer : tout est affecté à une opération." };
  const entry = await r.addCash({ userId: it.clientId, amount: due, kind: "restitution", label: "Restitution du solde inoccupé", createdBy: desk.name });
  await audit("cash.restitution", "client", it.clientId, { after: { amount: due, entry: entry.id }, reason: `restitution ${fmt(due)} FCFA` });
  await r.logEvent({ kind: "desk", intentId: it.id, html: `<b>${fmt(due)} FCFA</b> restitués à ${escapeHtml(it.clientName)} : solde sans destination · par ${desk.name}` });
  revalidatePath(`/desk/intentions/${it.id}`);
  return { ok: true, message: `${fmt(due)} FCFA restitués.` };
}

/** Ce que le desk lit : la position du client, et ce qui doit repartir. */
export async function clientCash(clientId: string | undefined) {
  if (!clientId) return undefined;
  const r = repo();
  const [entries, intents] = await Promise.all([r.listCash(clientId).catch(() => []), r.listIntents()]);
  const mine = intents.filter((x) => x.clientId === clientId);
  return { ...cashPosition(entries, mine), toRestore: toRestore(entries, mine, CLOSED), entries: entries.slice(-6).reverse() };
}
