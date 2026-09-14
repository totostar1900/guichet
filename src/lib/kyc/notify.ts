import "server-only";
import { COMPANY } from "@/lib/config";
import { repo } from "@/lib/data";
import type { ClientFile } from "@/lib/domain/kyc";
import { emailConfigured, sendEmail, sendWhatsAppText, whatsappConfigured } from "@/lib/notify/providers";

/**
 * One-time code for the convention acceptance. Goes to the WhatsApp number when
 * configured, else e-mail; in demo mode it is shown on screen.
 */
export async function notifyCode(f: ClientFile, code: string): Promise<"WhatsApp" | "e-mail" | "demo"> {
  const text = `${COMPANY.name} — votre code d'acceptation de la convention d'ouverture de compte-titres : ${code}. Valable 10 minutes. Ne le communiquez à personne.`;
  const r = repo();
  if (f.identity.phone && whatsappConfigured()) {
    try {
      const id = await sendWhatsAppText(f.identity.phone, text);
      await r.createNotification({ kind: "intent_update", channel: "whatsapp", to: f.identity.phone, contactName: f.identity.name, body: "Code d'acceptation de la convention (masqué)", status: "sent", providerId: id, sentAt: new Date().toISOString() });
      return "WhatsApp";
    } catch (e) {
      await r.createNotification({ kind: "intent_update", channel: "whatsapp", to: f.identity.phone, contactName: f.identity.name, body: "Code d'acceptation de la convention (masqué)", status: "failed", error: e instanceof Error ? e.message : "échec" });
    }
  }
  if (f.identity.email && emailConfigured()) {
    const id = await sendEmail(f.identity.email, `${COMPANY.name} — code d'acceptation`, `<p>${text}</p>`, text);
    await r.createNotification({ kind: "intent_update", channel: "email", to: f.identity.email, contactName: f.identity.name, subject: "Code d'acceptation", body: "Code d'acceptation de la convention (masqué)", status: "sent", providerId: id, sentAt: new Date().toISOString() });
    return "e-mail";
  }
  return "demo";
}

/** Tells the client the desk's decision on their file. */
export async function notifyKycDecision(f: ClientFile, decision: "approuve" | "complements" | "refuse", details?: string): Promise<void> {
  const lines = {
    approuve: `Votre compte-titres est ouvert${f.review.custodianAccount ? ` (n° ${f.review.custodianAccount})` : ""}. Vous pouvez désormais passer des prises fermes dans le Guichet. Votre convention signée est disponible dans votre espace.`,
    complements: `Votre dossier d'ouverture de compte a besoin de compléments : ${details ?? "voir votre espace"}. Reprenez-le dans le Guichet › Ouvrir un compte.`,
    refuse: `Nous ne pouvons pas donner suite à votre demande d'ouverture de compte${details ? ` : ${details}` : ""}. Un conseiller reste à votre disposition.`,
  } as const;
  const text = `${COMPANY.name} — ${lines[decision]}`;
  const r = repo();
  const to = f.identity.phone && f.consents.whatsappAt ? { channel: "whatsapp" as const, to: f.identity.phone } : f.identity.email ? { channel: "email" as const, to: f.identity.email } : undefined;
  if (!to) return;
  const row = await r.createNotification({ kind: "intent_update", channel: to.channel, to: to.to, contactName: f.identity.name, subject: "Ouverture de compte", body: text, status: "queued" });
  const configured = to.channel === "whatsapp" ? whatsappConfigured() : emailConfigured();
  if (!configured) {
    await r.updateNotification(row.id, { status: "skipped", error: `${to.channel === "whatsapp" ? "WhatsApp" : "E-mail"} non configuré` });
    return;
  }
  try {
    const id = to.channel === "whatsapp" ? await sendWhatsAppText(to.to, text) : await sendEmail(to.to, "Ouverture de compte — Purpose Capital", `<p>${text}</p>`, text);
    await r.updateNotification(row.id, { status: "sent", providerId: id, sentAt: new Date().toISOString() });
  } catch (e) {
    await r.updateNotification(row.id, { status: "failed", error: e instanceof Error ? e.message : "échec" });
  }
}
