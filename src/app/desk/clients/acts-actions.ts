"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { Closure, Mandate } from "@/lib/domain/kyc";
import { clientPositions, generateComplaint, generateCouponNotice, generateMandate, generateStatement, generateTransferOrder } from "@/lib/documents/generate";
import { notifyClientDocument } from "@/lib/notify/dispatch";
import { positionsFrom } from "@/lib/positions";
import { fmtDate } from "@/lib/format";

/**
 * The acts and notices of a client file: the mandate given to a third party,
 * the coupon or redemption notices, the transfer / closure order, a
 * complaint the desk received. Each produces a numbered document, sends it
 * on the client's proven channel when there is one, and writes the journal.
 */
export type ActResult = { ok: true; message: string; docId?: string } | { ok: false; error: string };

/** The channel a client document goes out on: the client's preference when proven, else the proven one, else nothing (kept in the file). */
export async function preferredChannel(userId: string): Promise<"whatsapp" | "email" | undefined> {
  const r = repo();
  const [prefs, ch] = await Promise.all([r.getPrefs(userId).catch(() => undefined), r.getChannelStatus(userId).catch(() => undefined)]);
  const phoneOk = Boolean(ch?.phoneVerifiedAt);
  const emailOk = Boolean(ch?.emailVerifiedAt);
  if (prefs?.reach === "email" && emailOk) return "email";
  if ((prefs?.reach === "whatsapp" || !prefs?.reach) && phoneOk) return "whatsapp";
  if (emailOk) return "email";
  if (phoneOk) return "whatsapp";
  return undefined;
}

const channelWord = (c: "whatsapp" | "email") => (c === "whatsapp" ? "WhatsApp" : "e-mail");

/** Prepares the mandate for one declared mandatary (or a new one): the PDF goes to the client, who has it signed by both. */
export async function mandateAction(_p: ActResult | null, form: FormData): Promise<ActResult> {
  const desk = await requireDesk("/desk/clients");
  const r = repo();
  const f = await r.getClientFile(String(form.get("fileId") ?? ""));
  if (!f) return { ok: false, error: "Dossier introuvable." };
  if (f.status !== "approuve") return { ok: false, error: "Le mandat se donne sur un compte approuvé." };
  const personName = String(form.get("personName") ?? "").trim();
  if (personName.length < 3) return { ok: false, error: "Indiquez le nom du mandataire." };
  const idNumber = String(form.get("idNumber") ?? "").trim() || undefined;
  const relation = String(form.get("relation") ?? "").trim() || undefined;
  const until = String(form.get("until") ?? "").trim();
  if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) return { ok: false, error: "Date de fin invalide." };
  const scope = { orders: form.get("orders") === "on", notices: form.get("notices") === "on", fundsOnly: form.get("fundsOnly") === "on" };
  if (!scope.orders && !scope.notices) return { ok: false, error: "Cochez au moins une étendue : passer des ordres, ou recevoir les avis." };
  const mandate: Mandate = { id: randomUUID(), personName, idNumber, relation, scope, until: until || undefined, status: "prepare", createdAt: new Date().toISOString(), createdBy: desk.name };
  const doc = await generateMandate(f, mandate, desk.name);
  mandate.docId = doc.id;
  mandate.docNumber = doc.number;
  const persons = f.persons.some((p) => p.role === "mandataire" && p.name === personName) ? f.persons : [...f.persons, { role: "mandataire" as const, name: personName, idNumber }];
  await r.updateClientFile(f.id, { persons, acts: { ...f.acts, mandates: [...(f.acts?.mandates ?? []), mandate] } });
  await audit("client.mandate", "client_file", f.id, { after: mandate });
  const contact = await r.getContact(f.userId);
  const channel = await preferredChannel(f.userId);
  if (contact && channel) await notifyClientDocument(doc, contact, channel);
  await r.logEvent({ kind: "desk", html: `<b>Mandat</b> ${doc.number} préparé : ${f.identity.name} → ${personName} · ${channel ? `envoyé par ${channelWord(channel)}` : "gardé au dossier"} · par ${desk.name}` });
  revalidatePath("/desk/clients");
  return { ok: true, message: `Mandat ${doc.number} préparé${channel ? ` et envoyé par ${channelWord(channel)}` : ", gardé au dossier (aucun canal prouvé)"} : marquez « signé » à réception des deux signatures.`, docId: doc.id };
}

/** Marks the mandate signed (both signatures received) or revoked. */
export async function mandateStatusAction(_p: ActResult | null, form: FormData): Promise<ActResult> {
  const desk = await requireDesk("/desk/clients");
  const r = repo();
  const f = await r.getClientFile(String(form.get("fileId") ?? ""));
  const id = String(form.get("mandateId") ?? "");
  const status = String(form.get("status") ?? "");
  if (!f || !f.acts?.mandates?.some((m) => m.id === id) || (status !== "signe" && status !== "revoque")) return { ok: false, error: "Mandat introuvable." };
  const now = new Date().toISOString();
  const mandates = f.acts.mandates.map((m) => (m.id === id ? { ...m, status: status as Mandate["status"], ...(status === "signe" ? { signedAt: now } : { revokedAt: now }) } : m));
  await r.updateClientFile(f.id, { acts: { ...f.acts, mandates } });
  const m = mandates.find((x) => x.id === id)!;
  if (m.docId && status === "signe") await r.updateDocument(m.docId, { status: "signe", signedAt: now });
  await r.logEvent({ kind: "desk", html: `<b>Mandat</b> ${m.docNumber ?? ""} ${status === "signe" ? "signé par les deux parties" : "révoqué"} : ${f.identity.name} → ${m.personName} · par ${desk.name}` });
  revalidatePath("/desk/clients");
  return { ok: true, message: status === "signe" ? `Mandat signé : ${m.personName} peut passer des ordres pour ${f.identity.name}.` : "Mandat révoqué." };
}

/** One coupon / redemption notice for one paid flow, sent on the client's channel when it is proven. */
export async function couponNoticeAction(_p: ActResult | null, form: FormData): Promise<ActResult> {
  const desk = await requireDesk("/desk/clients");
  const clientId = String(form.get("clientId") ?? "");
  const isin = String(form.get("isin") ?? "");
  const date = String(form.get("date") ?? "");
  const paidOn = String(form.get("paidOn") ?? "").trim() || undefined;
  const note = String(form.get("note") ?? "").trim() || undefined;
  const send = String(form.get("send") ?? "auto");
  if (!clientId || !isin || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Flux incomplet." };
  try {
    const doc = await generateCouponNotice(clientId, isin, date, { advisor: desk.name, paidOn, note });
    const r = repo();
    const contact = await r.getContact(clientId);
    const channel = send === "none" ? undefined : send === "whatsapp" || send === "email" ? send : await preferredChannel(clientId);
    let sent = " · gardé au dossier";
    if (contact && channel) {
      const n = await notifyClientDocument(doc, contact, channel);
      sent = n.status === "skipped" ? ` · non envoyé (${n.error})` : ` · envoyé par ${channelWord(channel)}`;
    }
    revalidatePath("/desk/clients");
    revalidatePath("/desk");
    return { ok: true, message: `${doc.number} émis${sent}.`, docId: doc.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Every paid flow without a notice, for all clients: one click from Aujourd'hui. */
export async function couponBatchAction(): Promise<ActResult> {
  const desk = await requireDesk("/desk");
  const r = repo();
  const [intents, offers, docs] = await Promise.all([r.listIntents(), r.listOffers(), r.listDocuments()]);
  const done = new Set(docs.filter((d) => d.flowKey).map((d) => d.flowKey));
  const clients = [...new Set(intents.map((i) => i.clientId).filter((x): x is string => Boolean(x)))];
  let issued = 0;
  let sent = 0;
  for (const clientId of clients) {
    const positions = positionsFrom(intents.filter((i) => i.clientId === clientId), offers);
    for (const p of positions)
      for (const flow of p.paid) {
        if (done.has(`${clientId}|${p.offer.isin}|${flow.date}`)) continue;
        try {
          const doc = await generateCouponNotice(clientId, p.offer.isin, flow.date, { advisor: desk.name });
          issued++;
          const contact = await r.getContact(clientId);
          const channel = await preferredChannel(clientId);
          if (contact && channel) {
            const n = await notifyClientDocument(doc, contact, channel);
            if (n.status !== "skipped") sent++;
          }
        } catch {
          // a flow that cannot be documented is left to the file's own button
        }
      }
  }
  await r.logEvent({ kind: "desk", html: `<b>Avis de coupon</b> : ${issued} émis, ${sent} envoyés · par ${desk.name}` });
  revalidatePath("/desk");
  revalidatePath("/desk/clients");
  return { ok: true, message: `${issued} avis émis, ${sent} envoyés ; les autres sont au dossier.` };
}

/** Prepares the transfer / closure order; the file waits for the signature. */
export async function transferAction(_p: ActResult | null, form: FormData): Promise<ActResult> {
  const desk = await requireDesk("/desk/clients");
  const r = repo();
  const f = await r.getClientFile(String(form.get("fileId") ?? ""));
  if (!f) return { ok: false, error: "Dossier introuvable." };
  if (f.status !== "approuve") return { ok: false, error: "Le dossier doit être approuvé (compte actif)." };
  const scope = String(form.get("scope") ?? "tout");
  if (scope !== "tout" && scope !== "partiel" && scope !== "vide") return { ok: false, error: "Portée inconnue." };
  const destination = String(form.get("destination") ?? "").trim() || undefined;
  const destinationAccount = String(form.get("destinationAccount") ?? "").trim() || undefined;
  const reason = String(form.get("reason") ?? "").trim() || undefined;
  const isins = form.getAll("isin").map(String).filter(Boolean);
  const positions = await clientPositions(f.userId);
  if (scope !== "vide" && positions.length === 0) return { ok: false, error: "Aucune position à transférer : choisissez « clôture sans position »." };
  if (scope !== "vide" && !destination) return { ok: false, error: "Indiquez l'établissement de destination." };
  if (scope === "partiel" && !isins.length) return { ok: false, error: "Cochez les lignes à transférer." };
  const closure: Closure = { scope: scope as Closure["scope"], destination, destinationAccount, reason, isins: scope === "partiel" ? isins : undefined, requestedAt: new Date().toISOString(), requestedBy: desk.name };
  const doc = await generateTransferOrder(f, closure, desk.name);
  closure.docId = doc.id;
  closure.docNumber = doc.number;
  await r.updateClientFile(f.id, { acts: { ...f.acts, closure } });
  await audit("client.transfer", "client_file", f.id, { after: closure });
  const contact = await r.getContact(f.userId);
  const channel = await preferredChannel(f.userId);
  if (contact && channel) await notifyClientDocument(doc, contact, channel);
  await r.logEvent({ kind: "desk", html: `<b>Ordre de transfert${scope === "partiel" ? "" : " et de clôture"}</b> ${doc.number} préparé : ${f.identity.name}${destination ? ` → ${destination}` : ""} · par ${desk.name}` });
  revalidatePath("/desk/clients");
  return { ok: true, message: `${doc.number} préparé${channel ? ` et envoyé pour signature par ${channelWord(channel)}` : ""} ; marquez « signé » à réception, le dossier passera en clôture.`, docId: doc.id };
}

/** The signature received: the file goes « en clôture » (no new intention); then the custodian's confirmation closes it. */
export async function closureStepAction(_p: ActResult | null, form: FormData): Promise<ActResult> {
  const desk = await requireDesk("/desk/clients");
  const r = repo();
  const f = await r.getClientFile(String(form.get("fileId") ?? ""));
  const step = String(form.get("step") ?? "");
  if (!f?.acts?.closure) return { ok: false, error: "Aucun ordre de transfert sur ce dossier." };
  const now = new Date().toISOString();
  const c = f.acts.closure;
  const partial = c.scope === "partiel";
  if (step === "signe") {
    if (c.docId) await r.updateDocument(c.docId, { status: "signe", signedAt: now });
    await r.updateClientFile(f.id, { status: partial ? f.status : "en_cloture", acts: { ...f.acts, closure: { ...c, signedAt: now } } });
    await r.logEvent({ kind: "desk", html: `<b>Ordre ${c.docNumber ?? ""}</b> signé : ${f.identity.name}${partial ? "" : " · dossier en clôture, plus de nouvelle intention"} · par ${desk.name}` });
    revalidatePath("/desk/clients");
    return { ok: true, message: partial ? "Ordre signé : lancez le transfert chez le dépositaire." : "Ordre signé : le dossier est en clôture, les nouvelles intentions sont refusées jusqu'à la confirmation du dépositaire." };
  }
  if (step === "confirme") {
    if (!c.signedAt) return { ok: false, error: "L'ordre doit d'abord être signé." };
    await r.updateClientFile(f.id, { status: partial ? f.status : "clos", acts: { ...f.acts, closure: { ...c, confirmedAt: now, confirmedBy: desk.name } } });
    let msg = "";
    if (!partial) {
      const releve = await generateStatement("releve", f.userId, desk.name).catch(() => undefined);
      const contact = await r.getContact(f.userId);
      const channel = await preferredChannel(f.userId);
      if (releve && contact && channel) await notifyClientDocument(releve, contact, channel);
      msg = releve ? ` Relevé final ${releve.number} joint.` : "";
    }
    await r.logEvent({ kind: "desk", html: `<b>Transfert confirmé</b> par le dépositaire : ${f.identity.name}${partial ? "" : " · dossier clos"} · par ${desk.name}` });
    revalidatePath("/desk/clients");
    return { ok: true, message: (partial ? "Transfert confirmé." : "Dossier clos.") + msg };
  }
  if (step === "abandon") {
    await r.updateClientFile(f.id, { status: f.status === "en_cloture" ? "approuve" : f.status, acts: { ...f.acts, closure: undefined } });
    await r.logEvent({ kind: "desk", html: `Ordre de transfert abandonné : ${f.identity.name} · par ${desk.name}` });
    revalidatePath("/desk/clients");
    return { ok: true, message: "Ordre abandonné : le dossier reste actif." };
  }
  return { ok: false, error: "Étape inconnue." };
}

/** A complaint the desk received by phone, WhatsApp, e-mail or mail: documented like one the client deposits. */
export async function complaintDeskAction(_p: ActResult | null, form: FormData): Promise<ActResult> {
  const desk = await requireDesk("/desk/clients");
  const r = repo();
  const f = await r.getClientFile(String(form.get("fileId") ?? ""));
  if (!f) return { ok: false, error: "Dossier introuvable." };
  const facts = String(form.get("facts") ?? "").trim();
  const ask = String(form.get("ask") ?? "").trim();
  const operation = String(form.get("operation") ?? "").trim() || undefined;
  const receivedVia = String(form.get("receivedVia") ?? "Appel").trim();
  if (facts.length < 10 || ask.length < 5) return { ok: false, error: "Notez les faits et la demande, avec les mots du client." };
  const doc = await generateComplaint(f.userId, { operation, facts, ask, receivedVia: `${receivedVia} (enregistrée par ${desk.name})`, signedBy: `enregistrée par ${desk.name} d'après ${receivedVia.toLowerCase()}`, advisor: desk.name });
  const contact = await r.getContact(f.userId);
  await r.createInbound({ channel: receivedVia === "E-mail" ? "email" : "whatsapp", from: contact?.phone ?? contact?.email ?? f.userId, name: f.identity.name, subject: `Réclamation ${doc.number}`, body: `${facts}\n\nDemande : ${ask}\n\nAccusé de réception avant le ${doc.ackBy}, réponse avant le ${doc.answerBy}.` });
  const channel = await preferredChannel(f.userId);
  if (contact && channel) await notifyClientDocument(doc, contact, channel);
  await r.logEvent({ kind: "desk", html: `<b>Réclamation</b> ${doc.number} enregistrée : ${f.identity.name} (${receivedVia}) · accusé avant le ${fmtDate(doc.ackBy)} · par ${desk.name}` });
  revalidatePath("/desk/clients");
  revalidatePath("/desk/messages");
  return { ok: true, message: `${doc.number} enregistrée ; elle attend dans Messages, accusé de réception avant le ${fmtDate(doc.ackBy)}.`, docId: doc.id };
}
