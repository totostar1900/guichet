import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { COMPANY } from "@/lib/config";
import { repo } from "@/lib/data";
import { estimate } from "@/lib/domain/estimate";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { displayStatus, headlineYield, isActionable } from "@/lib/domain/status";
import type { Contact, Intent, Offer } from "@/lib/domain/types";
import { bondCalc, tenorText } from "@/lib/finance";
import { fmt, fmtDate, fmtDateTime, fmtPct, fmtPrice } from "@/lib/format";
import { positionsFrom } from "@/lib/positions";

/**
 * The answering robot behind the WhatsApp number. It knows the published
 * offers, the glossary, and the writer's own intents/positions — and it never
 * advises, never promises an allocation, never speaks about other clients.
 * Anything beyond that is handed to a named advisor.
 */

const MODEL = "claude-opus-5";
export const botAvailable = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) && process.env.BOT_ENABLED !== "0";

const Answer = z.object({
  reply: z.string().describe("Réponse au client, en français, ton professionnel et chaleureux, 3 à 8 lignes, sans markdown (WhatsApp). Terminer par une phrase utile (prochaine étape ou lien)."),
  handoff: z.boolean().describe("true si un conseiller doit rappeler : demande de conseil, réclamation, question hors périmètre, prise ferme, cession, sujet sensible."),
  handoffReason: z.string().nullable(),
  intent: z
    .object({
      type: z.enum(["appetit", "info", "rappel"]).describe("Seuls appétit, information et rappel peuvent être créés automatiquement. Une prise ferme, une cession, un ordre d'achat ou de vente = appétit + handoff."),
      offerId: z.string(),
      amount: z.number().nullable().describe("Montant nominal en FCFA si le client l'a exprimé, sinon null"),
      note: z.string().nullable(),
    })
    .nullable()
    .describe("Intention exprimée clairement par le client sur une offre ouverte identifiable ; sinon null."),
});
export type BotAnswer = z.infer<typeof Answer>;

function offerFacts(o: Offer): string {
  const y = headlineYield(o);
  const base = `- id=${o.id} · ${o.title} · ${o.issuer} · ${o.isin} · statut ${displayStatus(o)} · dépôt des offres ${fmtDateTime(o.deadlineAt)} · règlement ${fmtDate(o.settleOn)} · lien ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/offres/${o.id}`;
  if (o.kind === "OTA" || o.kind === "APE") {
    const r = o.couponRate != null && o.maturityOn ? bondCalc({ nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn }, 10_000_000, o.pricePct ?? 100) : undefined;
    return `${base}\n  coupon ${fmtPct(o.couponRate ?? 0, 2)} · prix Purpose ${fmtPrice(o.pricePct ?? 100)}${o.priceNote ? " (indicatif)" : ""} · rendement actuariel brut ${y != null ? fmtPct(y, 2) : "—"} · durée réelle ${o.maturityOn ? tenorText(o.settleOn, o.maturityOn) : "—"} · nominal ${fmt(o.nominal)} · commission ${fmtPct(o.commissionPct, 2)} · ticket minimum ${o.minTitles ?? 1} titres${r ? ` · pour 10 000 000 de nominal : décaissement ${fmt(r.outlay)} dont coupon couru ${fmt(r.accrued)} (${r.accruedDays} j)` : ""}`;
  }
  if (o.kind === "BTA") return `${base}\n  bon à intérêts précomptés · taux ${fmtPct(o.precountRate ?? 0, 2)}${o.rateNote ? " (indicatif)" : ""} · rendement actuariel ${y != null ? fmtPct(y, 2) : "—"} · nominal ${fmt(o.nominal)} · commission ${fmtPct(o.commissionPct, 2)}`;
  if (o.kind === "ACTIONS") return `${base}\n  prix ${fmt(o.pricePerShare ?? 0)} FCFA/action · minimum ${o.minShares} actions · dividende ${fmt(o.dividendPerShare ?? 0)} (${y != null ? fmtPct(y, 2) : "—"}) · dernier cours ${o.lastPrice ? fmt(o.lastPrice) : "—"} · souscription du ${fmtDate(o.opensAt)} au ${fmtDate(o.deadlineAt)}`;
  if (o.kind === "MARCHE") return `${base}\n  ${o.market} · dernier cours ${o.instrument === "obligation" ? fmtPrice(o.lastPrice ?? 0) : fmt(o.lastPrice ?? 0) + " FCFA"}${o.lastPriceOn ? ` au ${fmtDate(o.lastPriceOn)}` : ""} · acheteur ${o.bid ?? "—"} / vendeur ${o.ask ?? "—"} · quantité min ${o.lotSize ?? 1} · commission ${fmtPct(o.commissionPct, 2)} · règlement T+${o.settlementDays ?? 3} · ordres d'achat / vente au marché ou à cours limité (le prix d'exécution dépend du marché)`;
  return `${base}\n  rachat par l'émetteur à 100 % du nominal · commission ${fmtPct(o.commissionPct, 2)}`;
}

const GLOSSARY = `Rendement actuariel : ce que rapporte réellement le placement, prix d'achat et coupon couru compris ; seule mesure comparable d'une ligne à l'autre.
Coupon couru : intérêts déjà produits depuis le dernier versement ; avancés au règlement, récupérés intégralement au coupon suivant.
In fine : le capital revient en une fois à l'échéance.
Adjudication : le Trésor retient les offres les mieux-disantes ; une soumission peut être servie en partie ou pas du tout. Purpose Capital présente les ordres au prix qu'elle publie, via un SVT (banque agréée).
Nouvelle ligne / abondement / rachat : ligne nouvelle sans coupon couru ; abondement = réouverture d'une ligne existante ; rachat = l'émetteur reprend ses titres, en général au pair.
BTA : bon du Trésor à intérêts précomptés (on paie moins que le nominal, on reçoit le nominal) ; OTA : obligation du Trésor à coupon annuel.
Niveaux de relation : 1 = identifié (appétit, question) ; 2 = compte-titres ouvert (prise ferme, cession). Ouverture du compte : ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/ouvrir-un-compte (10 minutes, pièces en photo).`;

export async function answerInbound(from: string, text: string, opts: { dryRun?: boolean } = {}): Promise<{ answer: BotAnswer; contact?: Contact; createdRef?: string }> {
  const r = repo();
  const phone = `+${from.replace(/[^\d]/g, "")}`;
  const contacts = await r.listContacts();
  const contact = contacts.find((c) => c.phone && c.phone.replace(/[^\d]/g, "") === phone.replace(/[^\d]/g, ""));
  const [offers, intents] = await Promise.all([r.listOffers(), r.listIntents()]);
  const open = offers.filter((o) => isActionable(displayStatus(o)));
  const mine: Intent[] = contact ? intents.filter((i) => i.clientId === contact.id) : [];
  const byId = new Map(offers.map((o) => [o.id, o]));
  const positions = contact ? positionsFrom(mine, offers) : [];

  const system = `Tu es l'assistant WhatsApp de ${COMPANY.name} (${COMPANY.licence}), société de bourse en zone CEMAC. Tu réponds en français, brièvement, sans markdown.
CE QUE TU FAIS : expliquer les termes (glossaire ci-dessous), donner les caractéristiques exactes des offres publiées (chiffres fournis, ne jamais en inventer), chiffrer un montant à partir des références fournies (règle de trois sur le décaissement pour 10 000 000), rappeler les dates, dire où en est une intention ou un document du client, indiquer les prochaines étapes, enregistrer un appétit, une demande d'information ou de rappel.
CE QUE TU NE FAIS JAMAIS : recommander une ligne plutôt qu'une autre ou dire si « c'est un bon placement » (réponds que le desk ne donne pas de conseil personnalisé par ce canal et propose un rappel), promettre une allocation ou un rendement (toujours « si servi au prix publié », « brut, hors commission et fiscalité »), parler d'autres clients, inventer un prix ou une date, traiter une réclamation.
PRISE FERME OU CESSION : tu enregistres un appétit avec le montant, tu expliques qu'un conseiller confirme et envoie le bulletin, et tu demandes un rappel (handoff=true). Si le client n'a pas de compte-titres ouvert (niveau < 2), rappelle qu'il faut l'ouvrir (lien) — l'intention est gardée.
Termine par une phrase concrète. Mentionne « ${COMPANY.phone} » si le client veut parler à quelqu'un.

GLOSSAIRE
${GLOSSARY}

OFFRES OUVERTES OU À VENIR (${fmtDateTime(new Date().toISOString())})
${open.map(offerFacts).join("\n") || "- aucune"}

CLIENT
${contact ? `${contact.name} · ${contact.segment} · niveau ${contact.id.startsWith("dev-") || positions.length ? 2 : 1}` : "inconnu (numéro non enregistré) : invite-le à se présenter et à ouvrir un compte ; ne donne aucune information personnelle"}
${mine.length ? `Ses intentions : ${mine.map((i) => `${i.ref} ${INTENT_LABEL[i.type]} sur ${byId.get(i.offerId)?.title ?? i.offerId}${i.amount ? ` ${fmt(i.amount)}` : ""} — ${INTENT_STATE_LABEL[i.state]}`).join(" ; ")}` : ""}
${positions.length ? `Ses positions : ${positions.map((p) => `${fmt(p.units)} ${p.unitWord} ${p.offer.title}${p.nextFlow ? `, prochain flux ${fmtDate(p.nextFlow.date)} ${fmt(p.nextFlow.amount)}` : ""}`).join(" ; ")}` : ""}`;

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: zodOutputFormat(Answer) },
    system,
    messages: [{ role: "user", content: text }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return { answer: { reply: `Merci pour votre message. Un conseiller de ${COMPANY.name} vous rappelle rapidement (${COMPANY.phone}).`, handoff: true, handoffReason: "réponse automatique indisponible", intent: null }, contact };
  }
  const answer = response.parsed_output;

  let createdRef: string | undefined;
  if (!opts.dryRun && contact && answer.intent && byId.has(answer.intent.offerId)) {
    const offer = byId.get(answer.intent.offerId)!;
    const created = await r.createIntent({ offerId: offer.id, type: answer.intent.type, amount: answer.intent.amount ?? null, channel: "WhatsApp", message: answer.intent.note ?? undefined, clientId: contact.id, clientName: contact.name, clientSegment: contact.segment });
    createdRef = created.ref;
    if (answer.intent.amount) answer.reply += `\n(Estimation : ${estimate(offer, answer.intent.amount).text})`;
  }
  if (!opts.dryRun && answer.handoff) {
    await r.logEvent({ kind: "intent", html: `<b>Rappel demandé</b> — ${contact ? contact.name : phone} : ${answer.handoffReason ?? "question hors robot"} — « ${text.slice(0, 140).replace(/</g, "&lt;")} »` });
  }
  return { answer, contact, createdRef };
}
