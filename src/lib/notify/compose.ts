import { COMPANY, DISCLAIMER } from "@/lib/config";
import { INTENT_LABEL } from "@/lib/domain/intent";
import { headlineYield } from "@/lib/domain/status";
import type { DocumentType, GeneratedDocument, Intent, IntentState, Offer } from "@/lib/domain/types";
import { tenorText } from "@/lib/finance";
import { fmt, fmtDate, fmtDateTime, fmtPct, fmtPrice } from "@/lib/format";
import { DOC_LABEL } from "@/lib/documents/registry";

/**
 * The words clients receive. One composer per moment; each returns the same
 * text for WhatsApp and the e-mail body, plus the positional parameters of the
 * approved WhatsApp template (names in env, see .env.example).
 */
export interface Message {
  subject: string;
  text: string;
  /** WhatsApp template name (env) + body params; undefined = free-form text only. */
  template?: { name: string; params: string[] };
}

const base = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const link = (o: Offer) => `${base()}/offres/${o.id}`;
const tmpl = (key: string, fallback: string) => process.env[key] || fallback;

export function offerPublished(o: Offer, firstName?: string): Message {
  const y = headlineYield(o);
  const headline =
    o.kind === "OTA" || o.kind === "APE"
      ? `${y != null ? fmtPct(y) : "—"} de rendement actuariel brut si servi à ${fmtPrice(o.pricePct ?? 100)} · coupon ${fmtPct(o.couponRate ?? 0, 2)}${o.maturityOn ? ` · ${tenorText(o.settleOn, o.maturityOn)}` : ""}`
      : o.kind === "BTA"
        ? `${y != null ? fmtPct(y) : "—"} de rendement actuariel à ${fmtPct(o.precountRate ?? 0, 2)} précompté · ${o.maturityOn ? tenorText(o.settleOn, o.maturityOn) : ""}`
        : o.kind === "ACTIONS"
          ? `${fmt(o.pricePerShare ?? 0)} FCFA par action · minimum ${o.minShares ?? 1} actions`
          : o.kind === "FONDS" && o.fund
            ? `OPCVM ${o.fund.manager} · VL ${fmt(o.fund.nav)} FCFA au ${fmtDate(o.fund.navDate)} · souscription à la prochaine VL, minimum ${fmt(o.fund.minAmount)} FCFA`
          : o.kind === "MARCHE"
            ? `${o.market} · dernier cours ${o.instrument === "obligation" ? fmtPrice(o.lastPrice ?? 0) : fmt(o.lastPrice ?? 0) + " FCFA"} · achat / vente au marché, règlement T+${o.settlementDays ?? 3}`
            : "rachat au pair (100 % du nominal)";
  const text = `${firstName ? `Bonjour ${firstName},\n\n` : ""}${COMPANY.name} · nouvelle offre\n${o.title} — ${o.issuer}\n${headline}\nTitres inscrits à votre nom.\nDépôt des offres : ${fmtDateTime(o.deadlineAt)}.\n\nVoir la fiche et répondre : ${link(o)}\n\n${DISCLAIMER}`;
  return {
    subject: `${COMPANY.name} — ${o.title} · ${headline.split(" · ")[0]}`,
    text,
    template: { name: tmpl("WA_TEMPLATE_OFFER", "guichet_offre"), params: [o.title, headline, fmtDateTime(o.deadlineAt), link(o)] },
  };
}

export function intentReceived(i: Intent, o: Offer, estimate?: string): Message {
  const what = INTENT_LABEL[i.type];
  const text = `${COMPANY.name} — reçu, réf. ${i.ref}\n${what} sur ${o.title}${i.amount ? ` · ${fmt(i.amount)} ${o.kind === "RACHAT" ? "titres" : "FCFA"}` : ""}.${estimate ? `\n${estimate}` : ""}\n\n${
    i.type === "ferme"
      ? "Un conseiller vous confirme avant la clôture et vous envoie le bulletin à signer."
      : i.type === "appetit"
        ? "Le desk vous rappelle avant la clôture pour arrêter le montant."
        : i.type === "cession"
          ? "Nous vérifions la position et vous confirmons."
          : "Un conseiller vous répond dans l'heure."
  }\nCe message n'est ni un ordre ni une garantie d'allocation.`;
  return { subject: `Reçu — ${i.ref} · ${o.title}`, text, template: { name: tmpl("WA_TEMPLATE_UPDATE", "guichet_maj"), params: [i.clientName, text.replace(/^.*\n/, "")] } };
}

export function intentUpdated(i: Intent, o: Offer, state: IntentState, advisor?: string): Message {
  const lines: Record<IntentState, string> = {
    recue: "Votre intention est enregistrée.",
    confirmee:
      i.type === "ferme"
        ? `Votre prise ferme est confirmée${advisor ? ` par ${advisor}` : ""}. Le bulletin à signer et l'appel de fonds suivent dans ce fil.`
        : i.type === "souscription"
          ? `Votre souscription est confirmée${advisor ? ` par ${advisor}` : ""}. Le bulletin de souscription à signer et l'appel de fonds suivent dans ce fil ; exécution à la prochaine VL.`
        : i.type === "rachat"
          ? `Votre demande de rachat est confirmée${advisor ? ` par ${advisor}` : ""}. La demande à signer suit dans ce fil ; exécution à la prochaine VL de rachat.`
        : i.type === "cession"
          ? `Votre ordre de cession est confirmé${advisor ? ` par ${advisor}` : ""}. L'ordre à signer suit dans ce fil.`
          : `Votre ${INTENT_LABEL[i.type].toLowerCase()} est pris en compte${advisor ? ` par ${advisor}` : ""}. Nous revenons vers vous avant la clôture pour arrêter le montant.`,
    transmise: o.kind === "FONDS" ? `Votre ordre ${i.ref} est transmis à ${o.fund?.manager ?? "la société de gestion"} pour la prochaine valeur liquidative. Nous vous confirmons le nombre de parts dès l'avis de la société de gestion.` : o.kind === "MARCHE" ? `Votre ordre ${i.ref} est placé sur ${o.market}${i.limitPrice != null ? ` (limite ${i.limitPrice})` : " au marché"}. Nous vous confirmons l'exécution dès qu'elle intervient.` : `Votre ordre ${i.ref} a été transmis au SVT pour l'adjudication du ${fmtDate(o.deadlineAt)}. Résultats attendus ${o.resultsAt ? fmtDateTime(o.resultsAt) : "dans la journée"}.`,
    servie: o.kind === "FONDS" ? `Votre ordre ${i.ref} est exécuté${i.executedPrice != null ? ` à la VL de ${fmt(i.executedPrice)} FCFA` : ""}${i.servedUnits != null ? ` pour ${i.servedUnits.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts` : ""}. L'avis d'opération suit après inscription au registre.` : o.kind === "MARCHE" ? `Votre ordre ${i.ref} est exécuté${i.executedPrice != null ? ` à ${o.instrument === "obligation" ? fmtPrice(i.executedPrice) : fmt(i.executedPrice) + " FCFA"}` : ""}${i.servedUnits != null ? ` pour ${fmt(i.servedUnits)} unités` : ""}. Règlement T+${o.settlementDays ?? 3}, puis avis d'opéré.` : `Résultats : votre ordre ${i.ref} est servi${o.servedPricePct != null ? ` à ${fmtPrice(o.servedPricePct)}` : ""}. Règlement le ${fmtDate(o.settleOn)}. L'avis de résultat suit.`,
    non_servie: `Résultats : votre ordre ${i.ref} n'a pas été servi. Les fonds sont restitués sous deux jours ouvrés, sans frais.`,
    reglee: o.kind === "FONDS" ? `${i.type === "rachat" ? "Rachat réglé : le produit est viré sur votre compte bancaire." : `Vos parts de ${o.title} sont inscrites à votre nom au registre du dépositaire.`} L'avis d'opération suit.` : `Règlement effectué le ${fmtDate(o.settleOn)} : vos titres ${o.isin} sont inscrits à votre nom. L'avis d'opéré suit.`,
    annulee: `Votre intention ${i.ref} a été annulée. Contactez-nous si ce n'est pas attendu.`,
  };
  const text = `${COMPANY.name} — ${o.title}\n${lines[state]}`;
  return { subject: `${o.title} — ${i.ref}`, text, template: { name: tmpl("WA_TEMPLATE_UPDATE", "guichet_maj"), params: [i.clientName, lines[state]] } };
}

export function documentSent(d: GeneratedDocument, o?: Offer): Message {
  const action: Partial<Record<DocumentType, string>> = {
    bulletin: "Merci de le signer et de nous le retourner (photo ou scan suffit) avant la clôture.",
    fonds: "Merci d'effectuer le virement avec la référence indiquée en motif.",
    cession: "Merci de le signer et de nous le retourner avant la clôture.",
    allocation: "Votre allocation définitive et le montant à régler y figurent.",
    non_allocation: "Vos fonds sont restitués sous deux jours ouvrés.",
    opere: "Il confirme l'inscription des titres à votre nom et votre échéancier.",
  };
  const text = `${COMPANY.name} — ${DOC_LABEL[d.type]} ${d.number}${o ? ` · ${o.title}` : ""}\n${action[d.type] ?? ""}`;
  return { subject: `${DOC_LABEL[d.type]} ${d.number}${o ? ` · ${o.title}` : ""}`, text };
}

export const emailHtml = (m: Message): string =>
  `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#14213A;max-width:640px"><div style="background:#0B2545;color:#fff;padding:14px 20px"><b style="letter-spacing:.14em;font-family:Georgia,serif">${COMPANY.name.toUpperCase()}</b><br><span style="color:#E0B65A;font-size:12px">${COMPANY.tagline}</span></div><div style="padding:20px;white-space:pre-line">${m.text.replace(/</g, "&lt;")}</div><div style="padding:0 20px 20px;font-size:11px;color:#7C8797">${COMPANY.legalName} · ${COMPANY.licence} · ${COMPANY.phone} · ${COMPANY.email}</div></div>`;
