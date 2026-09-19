"use server";

import type { NotifyChannel } from "@/lib/domain/types";
import { loadRegistry } from "@/lib/reference";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { allowedIntents } from "@/lib/domain/intent";
import { displayStatus } from "@/lib/domain/status";
import { normalizePhone, parseAmount, parseUnits } from "@/lib/format";
import { estimate } from "@/lib/domain/estimate";
import { notifyIntentReceived } from "@/lib/notify/dispatch";
import { INDIVISION_CEILING, isIndivision } from "@/lib/kyc/checklist";
import { positionsFrom } from "@/lib/positions";
import { blocking, orderChecks } from "@/lib/domain/checks";
import { fmt } from "@/lib/format";
import { confirmPhoneProof, requestPhoneProof, type ProofCheck, type ProofRequest } from "@/lib/channels";
import { authMode } from "@/lib/auth";

const schema = z.object({
  offerId: z.string().min(1),
  type: z.enum(["appetit", "ferme", "info", "rappel", "cession", "achat", "vente", "souscription", "rachat"]),
  limitPrice: z.string().optional(),
  amount: z.string().optional(),
  channel: z.enum(["WhatsApp", "Appel", "E-mail"]),
  firstName: z.string().max(60).optional(),
  lastName: z.string().max(60).optional(),
  contactPhone: z.string().max(30).optional(),
  contactEmail: z.string().max(120).optional(),
  message: z.string().max(1000).optional(),
});


export type IntentResult =
  | { ok: true; ref: string; type: z.infer<typeof schema>["type"]; channel: z.infer<typeof schema>["channel"]; needsAccount?: boolean; phone: string; email: string; sent: { channel: NotifyChannel; status: string }[] }
  | { ok: false; error: string };

/**
 * Creates an intent at the offer's current published version, attributed to
 * the signed-in client. Anonymous visitors are sent to the login page by the form.
 */
export async function submitIntent(_prev: IntentResult | null, form: FormData): Promise<IntentResult> {
  await loadRegistry();
  const session = await getSession();
  if (!session) return { ok: false, error: "Connectez-vous pour envoyer une intention." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Formulaire incomplet : vérifiez le type et le canal." };
  const { offerId, type, amount, channel, message, limitPrice } = parsed.data;
  const firstName = (parsed.data.firstName ?? "").trim().replace(/\s+/g, " ");
  const lastName = (parsed.data.lastName ?? "").trim().replace(/\s+/g, " ");
  if (firstName.length < 2 || lastName.length < 2) return { ok: false, error: "Indiquez votre prénom et votre nom tels qu'ils figurent sur votre pièce d'identité." };
  const clientName = `${firstName} ${lastName}`;
  const contactPhone = normalizePhone(parsed.data.contactPhone);
  const contactEmail = (parsed.data.contactEmail ?? "").trim().toLowerCase();
  // Both are required: the acknowledgement goes out on WhatsApp and by e-mail, the bulletin to sign by e-mail.
  if (!/^\+\d{8,15}$/.test(contactPhone)) return { ok: false, error: "Indiquez un numéro de téléphone joignable, indicatif compris (ex. +237 6 87 67 67 67)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { ok: false, error: "Indiquez une adresse e-mail valide : le bulletin à signer vous y est envoyé." };

  const r = repo();
  const offer = await r.getOffer(offerId);
  if (!offer) return { ok: false, error: "Offre introuvable." };
  // The rule: an intention leaves with both channels proven. The e-mail is the one the session signed in with;
  // the phone must have been proven by code, and be the one typed here.
  const channels = await r.getChannelStatus(session.userId);
  const emailOk = Boolean(session.email && session.email.toLowerCase() === contactEmail) || (authMode() === "dev" && Boolean(contactEmail));
  if (!emailOk) return { ok: false, error: "L'e-mail doit être celui de votre connexion : changez-le depuis Mon espace › Sécurité." };
  if (!channels.emailVerifiedAt && session.email) await r.markChannelVerified(session.userId, "email", session.email.toLowerCase());
  const phoneOk = Boolean(channels.phoneVerifiedAt && channels.phone === contactPhone);
  if (!phoneOk) return { ok: false, error: "Ce numéro WhatsApp n'est pas encore prouvé : saisissez le code reçu avant d'envoyer." };
  if (!allowedIntents(offer, displayStatus(offer)).includes(type)) return { ok: false, error: "Cette intention n'est plus possible sur cette offre." };

  const amt = offer.kind === "FONDS" && type === "rachat" ? parseUnits(amount) : parseAmount(amount);
  if ((type === "ferme" || type === "cession") && !amt) return { ok: false, error: "Indiquez un montant pour une prise ferme ou une cession." };
  if ((type === "achat" || type === "vente" || type === "rachat") && !amt) return { ok: false, error: "Indiquez une quantité." };
  if (type === "souscription" && (!amt || (offer.fund && amt < offer.fund.minAmount))) return { ok: false, error: `Indiquez un montant (minimum ${fmt(offer.fund?.minAmount ?? 0)} FCFA).` };
  const limit = limitPrice ? Number(String(limitPrice).replace(",", ".")) : null;
  let held: number | undefined;
  if (type === "vente" || type === "rachat") {
    const [allIntents, offers] = await Promise.all([r.listIntents(), r.listOffers()]);
    held = positionsFrom(allIntents.filter((i) => i.clientId === session.userId), offers).filter((p) => p.offer.isin === offer.isin).reduce((s, p) => s + p.units, 0);
  }
  const stop = blocking(orderChecks(offer, type, amt, limit && !isNaN(limit) ? limit : null, { held }));
  if (stop) return { ok: false, error: `${stop.text} ${stop.why}` };

  if (type === "ferme" && amt) {
    const file = await r.getClientFileByUser(session.userId);
    if (file && isIndivision(file)) {
      const [allIntents, offers] = await Promise.all([r.listIntents(), r.listOffers()]);
      const held = positionsFrom(allIntents.filter((i) => i.clientId === session.userId), offers).reduce((s, p) => s + p.nominalAmount, 0);
      if (held + amt > INDIVISION_CEILING) return { ok: false, error: `Un groupement en indivision est limité à ${fmt(INDIVISION_CEILING)} FCFA de nominal (déjà détenu : ${fmt(held)}). Au-delà, le groupe doit être une association déclarée : parlez-en au desk.` };
    }
  }
  // Funds are registered at the depositary in the client's name: an approved file is enough, no SVT sub-account needed.
  const needsAccount = (type === "ferme" || type === "cession" || type === "achat" || type === "vente") && session.tier < 2 ? true : (type === "souscription" || type === "rachat") && session.tier < 2 && session.kycStatus !== "approuve";
  const intent = await r.createIntent({
    offerId,
    type,
    amount: amt || null,
    limitPrice: limit && !isNaN(limit) ? limit : null,
    channel,
    contactPhone: contactPhone || undefined,
    contactEmail: contactEmail || undefined,
    message: needsAccount ? `[compte-titres à ouvrir] ${message ?? ""}`.trim() : message,
    clientId: session.userId,
    clientName,
    clientSegment: session.segment,
    phoneVerified: true,
    emailVerified: true,
  });
  // Keep the profile reachable with what the client just typed (the desk calls from there).
  await r.updateContact(session.userId, { name: clientName, phone: contactPhone || undefined, email: contactEmail || undefined });
  if (needsAccount) await r.logEvent({ kind: "system", intentId: intent.id, offerId, html: `${intent.ref} : <b>en attente d'ouverture de compte</b> (${session.name}, niveau ${session.tier}) : à prioriser avant la clôture` });
  const sent = (await notifyIntentReceived(intent, offer, amt ? estimate(offer, amt).text : undefined)).map((n) => ({ channel: n.channel, status: n.status }));
  revalidatePath("/desk");
  return { ok: true, ref: intent.ref, type, channel, needsAccount, phone: contactPhone, email: contactEmail, sent };
}

/** Follow / unfollow a line from its fiche; the daily alert takes it from there. */
export async function toggleWatch(offerId: string, on: boolean): Promise<{ ok: boolean; watching: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false, watching: false };
  const r = repo();
  const offer = await r.getOffer(offerId);
  if (!offer) return { ok: false, watching: false };
  try {
    if (on) {
      const { watchSnapshot } = await import("@/lib/watch");
      await r.addWatch(session.userId, offerId, watchSnapshot(offer));
    } else await r.removeWatch(session.userId, offerId);
  } catch {
    return { ok: false, watching: false }; // table missing (migration 0014) : the button stays off
  }
  revalidatePath(`/offres/${offerId}`);
  revalidatePath("/moi");
  return { ok: true, watching: on };
}

/** The NAV curve on the back of a fund's card: the last sixty published NAVs, fetched the first time the card turns. */
export interface LineCurve {
  label: string;
  unit: "nav";
  points: { x: string; y: number }[]; // ascending dates
}
export async function fundCurve(offerId: string): Promise<LineCurve | null> {
  await loadRegistry();
  const o = await repo().getOffer(offerId);
  if (!o || o.kind !== "FONDS" || !o.fund) return null;
  const navs = (await repo().listFundNavs(o.fund.key, 60)).sort((a, b) => a.navDate.localeCompare(b.navDate));
  if (navs.length < 2) return null;
  return { label: "Valeurs liquidatives", unit: "nav", points: navs.map((n) => ({ x: n.navDate, y: n.nav })) };
}

/* ---------- Proving the phone, inline in the intention form ---------- */

export async function sendPhoneProof(rawPhone: string): Promise<ProofRequest> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Connectez-vous d'abord." };
  return requestPhoneProof(session.userId, rawPhone);
}

export async function checkPhoneProof(rawPhone: string, code: string): Promise<ProofCheck> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Connectez-vous d'abord." };
  const res = await confirmPhoneProof(session.userId, rawPhone, code);
  if (res.ok) {
    revalidatePath(`/offres`);
    revalidatePath("/moi");
  }
  return res;
}

/* ---------- A guest declares: the e-mail first (a code signs them in and creates the account), then the phone ---------- */

export type GuestEmail = { ok: true; step: "code" } | { ok: true; step: "in"; email: string } | { ok: false; error: string };

export async function guestSendEmailCode(rawEmail: string): Promise<GuestEmail> {
  const email = z.string().email().safeParse(rawEmail.trim().toLowerCase());
  if (!email.success) return { ok: false, error: "Adresse e-mail invalide." };
  if (authMode() !== "supabase") return { ok: false, error: "Sur ce serveur de démonstration, connectez-vous d'abord (bouton en haut à droite)." };
  const { supabaseAuthClient } = await import("@/lib/auth/supabase");
  const sb = await supabaseAuthClient();
  const { error } = await sb.auth.signInWithOtp({ email: email.data, options: { shouldCreateUser: true } });
  if (error) return { ok: false, error: `Envoi impossible : ${error.message}` };
  return { ok: true, step: "code" };
}

export async function guestVerifyEmailCode(rawEmail: string, code: string): Promise<GuestEmail> {
  const email = rawEmail.trim().toLowerCase();
  const token = code.replace(/s/g, "");
  if (!/^d{6,8}$/.test(token)) return { ok: false, error: "Le code comporte 6 chiffres." };
  if (authMode() !== "supabase") return { ok: false, error: "Sur ce serveur de démonstration, connectez-vous d'abord." };
  const { supabaseAuthClient } = await import("@/lib/auth/supabase");
  const sb = await supabaseAuthClient();
  const { data, error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) return { ok: false, error: "Code incorrect ou expiré." };
  await repo().markChannelVerified(data.user.id, "email", email);
  return { ok: true, step: "in", email };
}
