"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { audit } from "@/lib/audit";
import { fmt, localIso } from "@/lib/format";
import { standingBlock } from "@/lib/domain/standing";

export type StandingResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  offerId: z.string().min(1),
  amount: z.coerce.number().positive(),
  dayOfMonth: z.coerce.number().int().min(1).max(28),
  endsOn: z.string().optional(),
  onBlocked: z.enum(["passer", "arreter"]).default("passer"),
});

/**
 * Le client signe son instruction permanente.
 *
 * C'est un ordre, pas un réglage : il porte tout ce qui décidera des versements
 * à venir, et la maison n'y ajoutera aucun jugement. Il est donc contrôlé comme
 * un ordre, tracé comme un ordre, et sa destination est relue au serveur, parce
 * qu'un fonds peut fermer entre l'affichage de la page et la signature.
 *
 * Le premier versement part au prochain jour dit, jamais à la signature : le
 * client choisit une date, et lui prélever quelque chose le jour même serait
 * exécuter un ordre qu'il n'a pas donné.
 */
export async function createStandingAction(_p: StandingResult | null, form: FormData): Promise<StandingResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Connectez-vous pour programmer un versement." };
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Montant et jour du mois requis." };
  const r = repo();
  const o = await r.getOffer(p.data.offerId);
  const wrong = standingBlock(o, { amount: p.data.amount, dayOfMonth: p.data.dayOfMonth, startsOn: localIso(new Date()), endsOn: p.data.endsOn });
  if (wrong.length) return { ok: false, error: wrong.join(" ") };

  const [channels, existing] = await Promise.all([r.getChannelStatus(session.userId), r.listStandingOrders(session.userId)]);
  // Deux instructions sur la même ligne se prélèveraient deux fois le même mois
  // sans que personne l'ait voulu : on reprend celle qui existe.
  if (existing.some((s) => s.state === "active" && s.offerId === p.data.offerId)) {
    return { ok: false, error: "Un versement est déjà programmé sur cette ligne. Arrêtez-le avant d'en programmer un autre." };
  }

  const s = await r.createStandingOrder({
    userId: session.userId,
    clientName: session.name,
    clientSegment: session.segment ?? "",
    offerId: p.data.offerId,
    amount: p.data.amount,
    dayOfMonth: p.data.dayOfMonth,
    startsOn: localIso(new Date()),
    endsOn: p.data.endsOn || undefined,
    onBlocked: p.data.onBlocked,
    // Le canal des avis de versement : le téléphone prouvé s'il existe, sinon
    // l'e-mail, qui est toujours là puisqu'il sert à se connecter.
    channel: channels?.phoneVerifiedAt && channels.phone ? "WhatsApp" : "E-mail",
    contactPhone: channels?.phone,
    contactEmail: channels?.email ?? session.email,
  });
  await r.logEvent({
    kind: "intent",
    offerId: p.data.offerId,
    html: `${s.ref} (${s.clientName}) : <b>épargne programmée</b> de ${fmt(s.amount)} FCFA le ${s.dayOfMonth} de chaque mois sur ${o?.title ?? p.data.offerId}`,
  });
  await audit("standing.create", "standing", s.id, { after: { ref: s.ref, offerId: s.offerId, amount: s.amount, dayOfMonth: s.dayOfMonth, endsOn: s.endsOn } });
  revalidatePath("/moi");
  return { ok: true, message: `Versement programmé : ${fmt(s.amount)} FCFA le ${s.dayOfMonth} de chaque mois. Référence ${s.ref}.` };
}

/**
 * L'arrêt, qui doit être au moins aussi simple que la signature.
 *
 * Un versement récurrent facile à prendre et difficile à arrêter se lit très mal
 * partout, et d'abord chez un régulateur. Un bouton, pas de motif obligatoire,
 * effet immédiat : le prochain versement ne part pas.
 */
export async function stopStandingAction(_p: StandingResult | null, form: FormData): Promise<StandingResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Connectez-vous." };
  const id = String(form.get("id") ?? "");
  const r = repo();
  const mine = await r.listStandingOrders(session.userId);
  const s = mine.find((x) => x.id === id);
  if (!s) return { ok: false, error: "Versement introuvable." };
  if (s.state !== "active") return { ok: false, error: "Ce versement ne court plus." };
  await r.updateStandingOrder(s.id, { state: "annulee", stopReason: "arrêté par le client" });
  await r.logEvent({ kind: "intent", offerId: s.offerId, html: `${s.ref} (${s.clientName}) : épargne programmée <b>arrêtée</b> par le client` });
  await audit("standing.stop", "standing", s.id, { before: { state: s.state }, after: { state: "annulee" } });
  revalidatePath("/moi");
  return { ok: true, message: "Versement arrêté. Rien ne partira le mois prochain." };
}
