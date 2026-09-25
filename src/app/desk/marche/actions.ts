"use server";

import { revalidatePath } from "next/cache";
import { approvalReason, loadPolicy } from "@/lib/policy";
import { ConflictError } from "@/lib/domain/types";
import { isResponsable } from "@/lib/auth/types";
import { audit } from "@/lib/audit";
import { z } from "zod";
import { requireDesk, requireResponsable } from "@/lib/auth";
import { REF } from "@/lib/reference";
import { CROSS_CLOSED, crossCheck, crossOrder, type CrossPolicy } from "@/lib/domain/crossing";
import { loadCrossPolicy, CROSS_POLICY_KEY } from "@/lib/policy";
import { repo } from "@/lib/data";
import { generateForIntent, generateFundBordereau } from "@/lib/documents/generate";
import { positionFor } from "@/lib/documents/position";
import { fmt, fmtPrice } from "@/lib/format";
import { bocUrl, ingestBoc } from "@/lib/market/boc";
import { notifyIntentUpdated } from "@/lib/notify/dispatch";

export type MarketResult = { ok: true; message: string } | { ok: false; error: string };

const quoteSchema = z.object({
  offerId: z.string().min(1),
  lastPrice: z.coerce.number().positive(),
  bid: z.coerce.number().positive().optional(),
  ask: z.coerce.number().positive().optional(),
  lastPriceOn: z.string().optional(),
  version: z.coerce.number().int().optional(),
});

/** The desk updates a line's quote (last, bid, ask). Timestamped; the fiche shows the stamp. */
export async function updateQuoteAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim()) raw[k] = v.trim().replace(",", ".");
  });
  const p = quoteSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Cours invalide." };
  const r = repo();
  const o = await r.getOffer(p.data.offerId);
  if (!o || o.kind !== "MARCHE") return { ok: false, error: "Ligne introuvable." };
  const now = new Date();
  if (p.data.version != null && p.data.version !== o.version) return { ok: false, error: new ConflictError("offer", o.id, p.data.version, o.version).message };
  const next: typeof o = { ...o, lastPrice: p.data.lastPrice, bid: p.data.bid ?? o.bid, ask: p.data.ask ?? o.ask, lastPriceOn: p.data.lastPriceOn || now.toISOString().slice(0, 10), pricedAt: now.toISOString(), priceSource: "desk", priceNote: `Cours saisi par le desk (${desk.name}).`, version: o.version + 1 };
  const reason = approvalReason(next, o, await loadPolicy());
  if (reason && !isResponsable(desk)) {
    const a = await r.createApproval({ kind: "offer_quote", entityId: o.id, title: o.title, payload: next, reason, requestedBy: desk.name });
    await audit("approval.request", "approval", a.id, { after: { offerId: o.id, reason }, reason });
    await r.logEvent({ kind: "desk", offerId: o.id, html: `Cours <b>${o.title}</b> proposé par ${desk.name}, en attente d'un responsable : ${reason}` });
    revalidatePath("/desk/approbations");
    return { ok: true, message: `Proposition transmise à un responsable : ${reason}.` };
  }
  try {
    await r.upsertOffer(next, { expectedVersion: o.version, by: desk.name, note: "Cours saisi" });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
  await audit("offer.quote", "offer", o.id, { before: { lastPrice: o.lastPrice, bid: o.bid, ask: o.ask, lastPriceOn: o.lastPriceOn }, after: { lastPrice: next.lastPrice, bid: next.bid, ask: next.ask, lastPriceOn: next.lastPriceOn } });
  await r.logEvent({ kind: "desk", offerId: o.id, html: `Cours <b>${o.title}</b> : ${o.instrument === "obligation" ? fmtPrice(p.data.lastPrice) : fmt(p.data.lastPrice) + " FCFA"}${p.data.bid ? ` · acheteur ${p.data.bid}` : ""}${p.data.ask ? ` · vendeur ${p.data.ask}` : ""} · par ${desk.name}` });
  revalidatePath("/");
  revalidatePath("/desk/marche");
  return { ok: true, message: "Cours mis à jour." };
}

const execSchema = z.object({
  intentId: z.string().min(1),
  executedPrice: z.coerce.number().positive(),
  executedUnits: z.coerce.number().positive(),
});

/** A placed order got executed (fully or partly): price and quantity → servie, avis d'exécution. */
export async function executeOrderAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim()) raw[k] = v.trim().replace(",", ".");
  });
  const p = execSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Prix et quantité exécutés requis." };
  const r = repo();
  const intents = await r.listIntents();
  const i = intents.find((x) => x.id === p.data.intentId);
  if (!i || !["achat", "vente", "souscription", "rachat"].includes(i.type)) return { ok: false, error: "Ordre introuvable." };
  if (i.state !== "transmise") return { ok: false, error: "L'ordre doit être placé (transmis) avant exécution." };
  const o = await r.getOffer(i.offerId);
  if (!o) return { ok: false, error: "Ligne introuvable." };
  const asked = positionFor(i, o).units;
  // Funds: the subscription amount is fixed, units follow the NAV retained : accept what the manager confirms.
  const units = o.kind === "FONDS" ? p.data.executedUnits : Math.min(p.data.executedUnits, asked);
  const updated = await r.updateIntent(i.id, { state: "servie", executedPrice: p.data.executedPrice, servedUnits: units, allocationPct: Math.round((units / Math.max(asked, 1)) * 100) });
  const unitsText = o.kind === "FONDS" ? `${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts à la VL ${fmt(p.data.executedPrice)} FCFA` : `${fmt(units)} / ${fmt(asked)} à ${o.instrument === "obligation" ? fmtPrice(p.data.executedPrice) : fmt(p.data.executedPrice) + " FCFA"}`;
  await r.logEvent({ kind: "desk", intentId: i.id, offerId: o.id, html: `${i.ref} (${i.clientName}) : <b>exécuté</b> ${unitsText} · par ${desk.name}` });
  await notifyIntentUpdated(updated, o, "servie", desk.name);
  revalidatePath("/desk/marche");
  revalidatePath("/desk");
  return { ok: true, message: o.kind === "FONDS" ? `Exécuté : ${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts. Passez en réglé à réception de l'avis du dépositaire.` : `Exécuté : ${fmt(units)} unité(s). Passez l'ordre en réglé après le règlement T+${o.settlementDays ?? 3}.` };
}

/** Settlement of an executed market order → position, avis d'opéré. */
export async function settleOrderAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const intentId = String(form.get("intentId") ?? "");
  const r = repo();
  const intents = await r.listIntents();
  const i = intents.find((x) => x.id === intentId);
  if (!i || i.state !== "servie") return { ok: false, error: "Ordre non exécuté." };
  const o = await r.getOffer(i.offerId);
  if (!o) return { ok: false, error: "Ligne introuvable." };
  const updated = await r.updateIntent(i.id, { state: "reglee" });
  await r.logEvent({ kind: "desk", intentId: i.id, offerId: o.id, html: `${i.ref} (${i.clientName}) : <b>réglé</b> · par ${desk.name}` });
  try {
    await generateForIntent("opere", i.id, { advisor: desk.name, allocation: (updated.allocationPct ?? 100) / 100 });
  } catch (e) {
    await r.logEvent({ kind: "system", intentId: i.id, html: `Avis d'opéré non généré : ${e instanceof Error ? e.message : "erreur"}` });
  }
  await notifyIntentUpdated(updated, o, "reglee", desk.name);
  revalidatePath("/desk/marche");
  revalidatePath("/desk");
  revalidatePath("/moi");
  return { ok: true, message: "Réglé : position mise à jour, avis d'opéré généré." };
}

const signalSchema = z.object({
  tell: z.string().optional(),
  showDepth: z.string().optional(),
  execute: z.string().optional(),
  minOrders: z.coerce.number().int().min(1).max(20),
});

/**
 * Le signal d'appariement : ce que le client apprend du carnet interne.
 *
 * Une décision de maison, pas un réglage d'opérateur, d'où le responsable et
 * l'audit. Elle publie l'existence des ordres d'autres clients, agrégée et sans
 * nom, et elle ne se reprend pas discrètement : le journal en garde l'avant et
 * l'après, et le jour où quelqu'un demandera depuis quand le Guichet le disait,
 * la réponse sera écrite.
 */
export async function saveCrossPolicyAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const me = await requireResponsable("/desk/marche");
  const p = signalSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Valeurs invalides." };
  const next: CrossPolicy = { tell: p.data.tell === "on", minOrders: p.data.minOrders, showDepth: p.data.showDepth === "on", execute: p.data.execute === "on" };
  const before = await loadCrossPolicy();
  const r = repo();
  await r.upsertReference(REF.policy, CROSS_POLICY_KEY, next, me.name);
  // Sa propre action, et non « policy.update » : le journal rangeait l'appariement
  // sous « fenêtre déléguée », qui est une tout autre décision.
  await audit("policy.cross", "reference", `${REF.policy}/${CROSS_POLICY_KEY}`, { before, after: next });
  await r.logEvent({
    kind: "desk",
    // Les deux décisions dans la même phrase : ce que le desk peut faire, et ce
    // que le client en lit. Relues six mois plus tard, elles doivent se distinguer.
    html: `Appariement par ${me.name} : le desk ${next.execute ? "<b>peut apparier</b>" : "est en <b>lecture seule</b>"}, signal ${next.tell ? `<b>ouvert</b> à partir de ${next.minOrders} ordre(s) en face, ${next.showDepth ? "avec" : "sans"} les quantités` : "<b>fermé</b>"}`,
  });
  revalidatePath("/desk/marche");
  // Les fiches sont rendues à chaque requête : il n'y a pas de cache à reprendre.
  return { ok: true, message: `${next.execute ? "Le desk peut apparier." : "Appariement en lecture seule."} ${next.tell ? "Les clients connectés voient qu'une contrepartie existe." : "Le carnet reste au desk."}` };
}

const crossSchema = z.object({
  buyId: z.string().min(1),
  sellId: z.string().min(1),
  qty: z.coerce.number().int().positive(),
  price: z.coerce.number().positive(),
});

/**
 * Deux clients appariés, à un prix, en un seul geste.
 *
 * Les deux côtés bougent ensemble et ne peuvent pas ne pas bouger ensemble :
 * c'est toute la raison de cette action. Exécuter chaque ordre séparément, avec
 * les boutons qui existent déjà, laisserait passer deux prix différents sur un
 * échange qui n'en a qu'un, et personne ne s'en apercevrait avant les avis
 * d'opéré.
 *
 * Les deux passent par « transmise » avant « servie », comme tout ordre de
 * bourse : l'appariement est une application portée au marché, et le journal
 * doit pouvoir le raconter dans cet ordre.
 *
 * Le côté le plus gros est servi partiellement, et son reste se ferme avec lui :
 * le modèle sait dire « servie à 60 % », il ne sait pas dire « servie à 60 % et
 * toujours ouverte ». Le client garde donc à faire un nouvel ordre pour le
 * reste, et l'écran le dit avant le geste plutôt qu'après.
 *
 * Le lien entre les deux vit dans le journal, chaque côté nommant la référence
 * de l'autre : c'est la trace qu'un contrôle suivra, et elle n'a demandé aucune
 * colonne de plus.
 */
export async function crossAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const policy = await loadCrossPolicy();
  if (!policy.execute) return { ok: false, error: "L'appariement est en lecture seule : un responsable doit l'ouvrir." };
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim()) raw[k] = v.trim().replace(",", ".");
  });
  const p = crossSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Quantité et prix requis." };
  const r = repo();
  const intents = await r.listIntents();
  const bi = intents.find((x) => x.id === p.data.buyId);
  const si = intents.find((x) => x.id === p.data.sellId);
  if (!bi || !si) return { ok: false, error: "Ordre introuvable." };
  if (bi.offerId !== si.offerId) return { ok: false, error: "Les deux ordres ne portent pas la même ligne." };
  const o = await r.getOffer(bi.offerId);
  if (!o) return { ok: false, error: "Ligne introuvable." };
  const buy = crossOrder(bi, o);
  const sell = crossOrder(si, o);
  if (!buy || !sell) return { ok: false, error: "Ces ordres ne sont plus appariables." };
  // Un prix porte l'habit de sa ligne, jusque dans un refus : « 97.25 » se lit
  // comme un nombre d'informaticien, « 97,250 % » comme le prix qu'on a saisi.
  const shown = (v: number) => (o.instrument === "obligation" ? fmtPrice(v) : `${fmt(v)} FCFA`);
  const wrong = crossCheck(buy, sell, p.data.qty, p.data.price, { lotSize: o.lotSize });
  // Le serveur parle français au journal : l'écran, lui, a déjà traduit avant le geste.
  if (wrong.length) return { ok: false, error: wrong.map((w) => w.key.replace("{n}", w.qty != null ? fmt(w.qty) : w.price != null ? shown(w.price) : "")).join(" ") };

  const priceText = shown(p.data.price);
  const both: [typeof bi, typeof si] = [bi, si];
  for (const i of both) {
    const other = i === bi ? si : bi;
    const asked = positionFor(i, o).units;
    await r.updateIntent(i.id, { state: "transmise" });
    const updated = await r.updateIntent(i.id, {
      state: "servie",
      executedPrice: p.data.price,
      servedUnits: p.data.qty,
      allocationPct: Math.round((p.data.qty / Math.max(asked, 1)) * 100),
    });
    await r.logEvent({
      kind: "desk",
      intentId: i.id,
      offerId: o.id,
      html: `${i.ref} (${i.clientName}) : <b>apparié</b> avec ${other.ref} · ${fmt(p.data.qty)} / ${fmt(asked)} titres à ${priceText} · par ${desk.name}`,
    });
    await notifyIntentUpdated(updated, o, "servie", desk.name);
  }
  await audit("intent.cross", "intent", `${bi.id}+${si.id}`, {
    after: { offerId: o.id, buy: bi.ref, sell: si.ref, qty: p.data.qty, price: p.data.price },
    reason: `Appariement interne sur ${o.title}`,
  });
  revalidatePath("/desk/marche");
  revalidatePath("/desk");
  return {
    ok: true,
    message: `Apparié : ${fmt(p.data.qty)} titres à ${priceText} entre ${bi.ref} et ${si.ref}. Passez chaque côté en réglé après le règlement T+${o.settlementDays ?? 3}.`,
  };
}

/* ---------------- OPCVM ---------------- */

const fundSchema = z.object({
  offerId: z.string().min(1),
  distributed: z.enum(["on", "off"]).default("off"),
  entryFeePct: z.coerce.number().min(0).max(10).default(0),
  exitFeePct: z.coerce.number().min(0).max(10).default(0),
  managementFeePct: z.coerce.number().min(0).max(10).optional(),
  trailerPct: z.coerce.number().min(0).max(10).optional(),
  minAmount: z.coerce.number().min(0).default(100_000),
  cutoff: z.string().max(120).optional(),
  agreementRef: z.string().max(80).optional(),
  settlementDays: z.coerce.number().int().min(0).max(30).optional(),
});

/** Terms of the distribution agreement for one fund; activating it shows the fund in the Guichet with « Souscrire ». */
export async function updateFundTermsAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim()) raw[k] = v.trim().replace(",", ".");
  });
  const p = fundSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Conditions invalides (frais 0–10 %, minimum ≥ 0)." };
  const r = repo();
  const o = await r.getOffer(p.data.offerId);
  if (!o || o.kind !== "FONDS" || !o.fund) return { ok: false, error: "Fonds introuvable." };
  const distributed = p.data.distributed === "on";
  if (distributed && !p.data.agreementRef) return { ok: false, error: "Indiquez la référence de la convention de distribution avant d'activer la souscription." };
  const fund = { ...o.fund, distributed, entryFeePct: p.data.entryFeePct, exitFeePct: p.data.exitFeePct, managementFeePct: p.data.managementFeePct, trailerPct: p.data.trailerPct, minAmount: p.data.minAmount, cutoff: p.data.cutoff, agreementRef: p.data.agreementRef, settlementDays: p.data.settlementDays };
  const next: typeof o = { ...o, fund, hidden: !distributed, commissionPct: fund.entryFeePct, pricedAt: new Date().toISOString(), version: o.version + 1 };
  const reason = approvalReason(next, o, await loadPolicy());
  if (reason && !isResponsable(desk)) {
    const a = await r.createApproval({ kind: "offer_publish", entityId: o.id, title: o.title, payload: next, reason, requestedBy: desk.name });
    await audit("approval.request", "approval", a.id, { after: { offerId: o.id, reason }, reason });
    revalidatePath("/desk/approbations");
    return { ok: true, message: `Proposition transmise à un responsable : ${reason}.` };
  }
  try {
    await r.upsertOffer(next, { expectedVersion: o.version, by: desk.name, note: "Conditions du fonds" });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
  await audit("offer.fund_terms", "offer", o.id, { before: { fund: o.fund, hidden: o.hidden }, after: { fund, hidden: !distributed } });
  await r.logEvent({ kind: "desk", offerId: o.id, html: `OPCVM <b>${o.title}</b> ${distributed ? "ouvert à la souscription" : "retiré de la souscription"} · droits d'entrée ${fund.entryFeePct} % · sortie ${fund.exitFeePct} %${fund.managementFeePct != null ? ` · gestion ${fund.managementFeePct} %/an` : ""}${fund.trailerPct != null ? ` · rétrocession ${fund.trailerPct} %/an` : ""} · minimum ${fmt(fund.minAmount)} FCFA${fund.agreementRef ? ` · convention ${fund.agreementRef}` : ""} · par ${desk.name}` });
  revalidatePath("/");
  revalidatePath("/fonds");
  revalidatePath("/desk/marche");
  return { ok: true, message: distributed ? "Fonds ouvert à la souscription dans le Guichet." : "Conditions enregistrées ; fonds présenté sur demande." };
}

/** Grouped subscription / redemption orders for one manager, addressed to its centralising agent. */
export async function fundBordereauAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const manager = String(form.get("manager") ?? "");
  try {
    const doc = await generateFundBordereau(manager, { advisor: desk.name });
    revalidatePath("/desk/documents");
    revalidatePath("/desk/marche");
    return { ok: true, message: `${doc.number} généré : à retrouver dans Documents.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Génération impossible." };
  }
}

/* ---------------- BVMAC bulletin ---------------- */

/** Desk asks for a given session's bulletin (default: today); same path as the cron. */
export async function ingestBocAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const date = String(form.get("sessionDate") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Date de séance invalide." };
  try {
    const res = await ingestBoc({ sessionDate: date, by: "desk" });
    if (!res.found) return { ok: false, error: `Aucun bulletin publié pour le ${date} à l'adresse BVMAC (${bocUrl(date)}). Réessayez plus tard ou déposez le PDF ci-dessous.` };
    if (res.error) return { ok: false, error: `Bulletin téléchargé mais illisible : ${res.error}.` };
    revalidatePath("/");
    revalidatePath("/desk");
    revalidatePath("/desk/marche");
    const b = res.bulletin!;
    return { ok: true, message: `BOC n° ${b.number} du ${date} ingéré par ${desk.name} : ${b.counts.equities} actions, ${b.counts.bonds} obligations, ${b.counts.funds} OPCVM${res.created.filter((id) => !id.startsWith("fund-")).length ? ` · ${res.created.filter((id) => !id.startsWith("fund-")).length} nouvelle(s) ligne(s) cotée(s)` : ""}${res.created.filter((id) => id.startsWith("fund-")).length ? ` · ${res.created.filter((id) => id.startsWith("fund-")).length} fonds ajouté(s)` : ""}${b.anomalies.length ? ` · ${b.anomalies.length} anomalie(s)` : ""}.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ingestion impossible." };
  }
}

/** Fallback when the site is down or the URL changed: the desk drops the PDF it received by e-mail. */
export async function uploadBocAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Déposez le PDF du bulletin." };
  if (file.size > 15 * 1024 * 1024) return { ok: false, error: "PDF trop lourd (15 Mo max)." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const fromName = file.name.match(/(\d{4})(\d{2})(\d{2})/);
  const guess = fromName ? `${fromName[1]}-${fromName[2]}-${fromName[3]}` : new Date().toISOString().slice(0, 10);
  try {
    const res = await ingestBoc({ sessionDate: guess, bytes, by: "desk", sourceUrl: `upload:${file.name}` });
    if (res.error) return { ok: false, error: `PDF illisible : ${res.error}.` };
    revalidatePath("/");
    revalidatePath("/desk");
    revalidatePath("/desk/marche");
    const b = res.bulletin!;
    return { ok: true, message: `BOC n° ${b.number} du ${b.sessionDate} ingéré depuis le fichier par ${desk.name}${b.anomalies.length ? ` · ${b.anomalies.length} anomalie(s)` : ""}.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ingestion impossible." };
  }
}

/** Show or hide an ingested line in the Guichet (it keeps being quoted). */
export async function toggleHiddenAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/marche");
  const id = String(form.get("offerId") ?? "");
  const r = repo();
  const o = await r.getOffer(id);
  if (!o || o.kind !== "MARCHE") return;
  await r.upsertOffer({ ...o, hidden: !o.hidden, version: o.version + 1 }, { expectedVersion: o.version, by: desk.name, note: o.hidden ? "Affichée" : "Masquée" });
  await audit("offer.visibility", "offer", o.id, { before: { hidden: Boolean(o.hidden) }, after: { hidden: !o.hidden } });
  await r.logEvent({ kind: "desk", offerId: o.id, html: `Ligne <b>${o.title}</b> ${o.hidden ? "affichée au" : "masquée du"} Guichet · par ${desk.name}` });
  revalidatePath("/");
  revalidatePath("/desk/marche");
}
