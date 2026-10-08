import "server-only";
import { COMPANY } from "@/lib/config";
import { repo } from "@/lib/data";
import type { ClientFile } from "@/lib/domain/kyc";
import { sendEmail, sendWhatsAppText } from "@/lib/notify/providers";
import type { CanalDuCode } from "./canal";

/** Ce que l'envoi du code a donné. « demo » : aucun canal configuré, le code s'affiche. */
export type EnvoiDuCode = { via: "WhatsApp" | "e-mail"; to: string } | { via: "demo" } | { via: "echec"; to: string; raison: string };

/**
 * LE CODE À USAGE UNIQUE, ET POURQUOI LES DEUX BRANCHES SE RESSEMBLENT MAINTENANT.
 *
 * La branche WhatsApp attrapait son erreur et en gardait une trace ; la branche
 * e-mail, non. Un refus du fournisseur traversait donc l'action, le client voyait
 * une erreur sans nom, et la table des notifications ne portait aucune ligne :
 * rien à montrer au desk, rien à compter, rien à reprendre. Les deux canaux
 * écrivent désormais la ligne AVANT l'envoi, puis la ferment en « sent » ou en
 * « failed » : un envoi qui échoue laisse une trace, c'est tout ce qu'on lui
 * demande.
 *
 * La destination arrive de « canalDuCode » : jamais du champ libre du formulaire,
 * voir ce module pour la raison.
 */
export async function notifyCode(f: ClientFile, code: string, canal: CanalDuCode | undefined): Promise<EnvoiDuCode> {
  if (!canal) return { via: "demo" };
  const text = `${COMPANY.name} : votre code d'acceptation de la convention d'ouverture de compte-titres : ${code}. Valable 10 minutes. Ne le communiquez à personne.`;
  const r = repo();
  const row = await r.createNotification({ kind: "intent_update", channel: canal.channel, to: canal.to, contactName: f.identity.name, subject: canal.channel === "email" ? "Code d'acceptation" : undefined, body: "Code d'acceptation de la convention (masqué)", status: "queued" });
  try {
    const id = canal.channel === "whatsapp" ? await sendWhatsAppText(canal.to, text) : await sendEmail(canal.to, `${COMPANY.name} : code d'acceptation`, `<p>${text}</p>`, text);
    await r.updateNotification(row.id, { status: "sent", providerId: id, sentAt: new Date().toISOString() });
    return { via: canal.channel === "whatsapp" ? "WhatsApp" : "e-mail", to: canal.to };
  } catch (e) {
    const raison = e instanceof Error ? e.message : "échec";
    await r.updateNotification(row.id, { status: "failed", error: raison });
    return { via: "echec", to: canal.to, raison };
  }
}

/** Tells the client the desk's decision on their file. */
export async function notifyKycDecision(f: ClientFile, decision: "approuve" | "complements" | "refuse", details?: string): Promise<void> {
  /* L'approbation ne dit plus « votre convention signée est dans votre espace » :
     elle ne l'est plus à cette minute, c'est maintenant au client de l'accepter. */
  const signee = Boolean(f.consents.conventionAt);
  const lines = {
    approuve: !signee
      ? `Votre dossier d'ouverture de compte est approuvé. Dernière étape, à vous : acceptez la convention par code dans Guichet › Ouvrir un compte. Nous ouvrons ensuite le sous-compte à votre nom chez le teneur de compte.`
      : f.review.custodianAccount
        ? `Votre compte-titres est actif : sous-compte n° ${f.review.custodianAccount} ouvert à votre nom chez le teneur de compte. Vous pouvez désormais passer des prises fermes dans le Guichet. Votre convention signée est dans votre espace.`
        : `Votre dossier est approuvé et votre convention signée est dans votre espace. Le sous-compte à votre nom est en cours d'ouverture chez le teneur de compte (24 à 48 h) ; nous vous confirmons le numéro dès réception.`,
    complements: `Votre dossier d'ouverture de compte a besoin de compléments : ${details ?? "voir votre espace"}. Reprenez-le dans le Guichet › Ouvrir un compte.`,
    refuse: `Nous ne pouvons pas donner suite à votre demande d'ouverture de compte${details ? ` : ${details}` : ""}. Un conseiller reste à votre disposition.`,
  } as const;
  const text = `${COMPANY.name} : ${lines[decision]}`;
  const r = repo();
  /* La décision part où le client lit vraiment : un canal prouvé d'abord, le
     champ du formulaire en dernier recours. WhatsApp passe devant quand le
     client l'a demandé, parce que c'est ce qu'il a demandé. Voir canal.ts. */
  const { canalDuCode } = await import("./canal");
  const to = await canalDuCode(f.userId, f, Boolean(f.consents.whatsappAt));
  if (!to) {
    await r.createNotification({ kind: "intent_update", channel: "email", to: f.identity.email ?? f.identity.phone ?? "?", contactName: f.identity.name, subject: "Ouverture de compte", body: text, status: "skipped", error: "Aucun canal joignable : ni e-mail ni WhatsApp configuré pour ce dossier" });
    return;
  }
  const row = await r.createNotification({ kind: "intent_update", channel: to.channel, to: to.to, contactName: f.identity.name, subject: "Ouverture de compte", body: text, status: "queued" });
  try {
    const id = to.channel === "whatsapp" ? await sendWhatsAppText(to.to, text) : await sendEmail(to.to, "Ouverture de compte : Purpose Capital", `<p>${text}</p>`, text);
    await r.updateNotification(row.id, { status: "sent", providerId: id, sentAt: new Date().toISOString() });
  } catch (e) {
    await r.updateNotification(row.id, { status: "failed", error: e instanceof Error ? e.message : "échec" });
  }
}
