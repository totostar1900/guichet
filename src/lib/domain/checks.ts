import type { IntentType, Offer } from "./types";
import { estimate } from "./estimate";
import { fmt, fmtPct, fmtPrice } from "@/lib/format";

/**
 * Order consistency: the same checks run under the client's amount field (as
 * info bubbles), on the server when the intent is saved (blocking ones only),
 * and on the desk when an intention is opened. Each check says what is wrong,
 * why it matters, and what the client can do : never a bare « invalide ».
 */
export type CheckLevel = "ok" | "warn" | "block";
export interface OrderCheck {
  key: string;
  level: CheckLevel;
  /** One line under the field. */
  text: string;
  /** The « i » bubble: the rule and why it exists. */
  why: string;
}

const UNIT: Record<string, string> = { OTA: "titre", APE: "titre", BTA: "bon", ACTIONS: "action" };

export function orderChecks(o: Offer, type: IntentType, amount: number | null | undefined, limitPrice?: number | null, ctx?: { held?: number; needsAccount?: boolean }): OrderCheck[] {
  const out: OrderCheck[] = [];
  const amt = amount ?? 0;
  const wantsAmount = type === "ferme" || type === "cession" || type === "achat" || type === "vente" || type === "souscription" || type === "rachat" || type === "appetit";
  if (!wantsAmount) return out;
  if (!amt) {
    if (type !== "appetit") out.push({ key: "amount", level: "block", text: "Indiquez un montant.", why: "Sans montant, le desk ne peut ni réserver la ligne ni préparer le bulletin." });
    return out;
  }

  // Primary bonds, bills and IPOs: at least one title, then the issuer's minimum; the rest is rounded down.
  if (o.kind === "OTA" || o.kind === "APE" || o.kind === "BTA" || o.kind === "ACTIONS") {
    const e = estimate(o, amt);
    const unit = UNIT[o.kind] ?? "titre";
    // Whole units as the desk counts them (estimate() hides the count when it refuses the amount).
    const perUnit0 = o.kind === "ACTIONS" ? (o.pricePerShare ?? 0) : o.kind === "BTA" ? 0 : o.nominal;
    const titles = e.titles ?? (perUnit0 > 0 ? Math.floor(amt / perUnit0) : 0);
    if (!titles) {
      out.push({ key: "min-unit", level: "block", text: e.text || `Montant inférieur à un ${unit}.`, why: `Un ordre porte sur un nombre entier de ${unit}s : on ne peut pas acheter une fraction de ${unit}. Le nominal d'un ${unit} est de ${fmt(o.nominal)} FCFA${o.kind === "ACTIONS" && o.pricePerShare ? ` ; le prix d'une action est de ${fmt(o.pricePerShare)} FCFA` : ""}.` });
      return out;
    }
    const min = o.kind === "ACTIONS" ? (o.minShares ?? 1) : (o.minTitles ?? 1);
    if (titles < min) {
      out.push({ key: "min-titles", level: "block", text: `Minimum ${fmt(min)} ${unit}s sur cette ligne.`, why: "Le minimum est fixé par l'émetteur dans les conditions de l'opération ; en dessous, l'ordre serait rejeté à la centralisation." });
      return out;
    }
    const perUnit = o.kind === "ACTIONS" ? (o.pricePerShare ?? 0) : o.nominal;
    if (perUnit > 0 && o.kind !== "BTA") {
      const rest = amt - titles * perUnit;
      if (rest > 0 && (o.kind === "ACTIONS" || rest >= perUnit * 0.001)) {
        out.push({ key: "round", level: "warn", text: `Arrondi à ${fmt(titles)} ${unit}s (${fmt(titles * perUnit)} FCFA de ${o.kind === "ACTIONS" ? "prix" : "nominal"}) : ${fmt(rest)} FCFA ne seront pas investis.`, why: `Le montant est converti en ${unit}s entiers, à ${fmt(perUnit)} FCFA l'unité. Saisissez un multiple pour investir la totalité.` });
      }
    }
    out.push({ key: "ok", level: "ok", text: e.text, why: "Estimation au prix publié, avant commission ; le nombre exact de titres est confirmé sur le bulletin." });
  }

  // Secondary market: whole shares, lot size, and a limit price that can actually be executed.
  if (o.kind === "MARCHE") {
    const isBond = o.instrument === "obligation";
    const ref = o.ask ?? o.lastPrice ?? 0;
    const qty = Math.floor(amt);
    if (qty < 1) {
      out.push({ key: "min-unit", level: "block", text: `Quantité inférieure à ${isBond ? "un titre" : "une action"}.`, why: "Un ordre de bourse porte sur un nombre entier de titres." });
      return out;
    }
    if (amt !== qty) out.push({ key: "whole", level: "warn", text: `Quantité arrondie à ${fmt(qty)}.`, why: "Les titres cotés ne se divisent pas." });
    if (o.lotSize && qty < o.lotSize) {
      out.push({ key: "lot", level: "block", text: `Quantité minimale ${fmt(o.lotSize)} sur cette ligne.`, why: "La quotité est fixée par le marché pour cette valeur ; en dessous, l'ordre n'est pas recevable." });
      return out;
    }
    if (o.lotSize && qty % o.lotSize !== 0) out.push({ key: "lot-mult", level: "warn", text: `La quantité n'est pas un multiple de la quotité (${fmt(o.lotSize)}) : le reste peut ne pas être exécuté.`, why: "Les ordres s'apparient par quotité ; un reliquat inférieur à la quotité reste en carnet." });
    if (limitPrice != null && ref > 0) {
      const dev = ((limitPrice - ref) / ref) * 100;
      const shown = isBond ? fmtPrice(ref) : `${fmt(ref)} FCFA`;
      if (Math.abs(dev) > 30) out.push({ key: "limit-far", level: "block", text: `Prix limite à ${fmtPct(Math.abs(dev), 0)} du dernier cours (${shown}) : hors des bornes de cotation.`, why: "La BVMAC limite la variation d'un cours par séance ; un ordre trop éloigné du dernier cours ne serait pas exécuté. Vérifiez l'unité (FCFA par action, ou % du nominal pour une obligation)." });
      else if (type === "achat" ? dev < -10 : dev > 10) out.push({ key: "limit-away", level: "warn", text: `Prix limite ${type === "achat" ? "inférieur" : "supérieur"} de ${fmtPct(Math.abs(dev), 1)} au dernier cours (${shown}) : l'ordre peut rester non exécuté.`, why: "L'ordre ne s'exécute que si une contrepartie accepte ce prix. Plus la limite s'éloigne du cours, plus l'exécution est incertaine." });
      else if (type === "achat" ? dev > 10 : dev < -10) out.push({ key: "limit-gen", level: "warn", text: `Prix limite ${type === "achat" ? "supérieur" : "inférieur"} de ${fmtPct(Math.abs(dev), 1)} au dernier cours : l'exécution se fera au cours du marché.`, why: "Une limite généreuse protège contre l'absence d'exécution, pas contre un mauvais prix : le desk transmet au mieux." });
    }
    if (type === "vente" && ctx?.held != null && qty > ctx.held) out.push({ key: "held", level: "block", text: `Vous détenez ${fmt(ctx.held)} unité(s) de cette ligne chez nous : la vente ne peut pas dépasser ce nombre.`, why: "Un ordre de vente porte sur des titres inscrits en compte." });
    const unit = isBond ? (o.nominal * ref) / 100 : ref;
    if (qty >= 1 && ref > 0) out.push({ key: "ok", level: "ok", text: `≈ ${fmt(qty * unit)} FCFA au cours de référence · règlement T+${o.settlementDays ?? 3}`, why: "Le montant final dépend du cours d'exécution et des frais de bourse." });
  }

  // Funds: the manager's minimum, then thousandths of a unit.
  if (o.kind === "FONDS" && o.fund) {
    const f = o.fund;
    if (type === "souscription") {
      if (amt < f.minAmount) {
        out.push({ key: "min-fund", level: "block", text: `Souscription minimale ${fmt(f.minAmount)} FCFA.`, why: "Le minimum de première souscription figure dans le prospectus du fonds et dans notre convention de distribution." });
        return out;
      }
      const e = estimate(o, amt);
      out.push({ key: "ok", level: "ok", text: e.text, why: "Le nombre de parts est calculé à la VL retenue lors de la centralisation, pas à la dernière VL publiée." });
    }
    if (type === "rachat") {
      if (amt <= 0) out.push({ key: "min-unit", level: "block", text: "Indiquez un nombre de parts (millièmes acceptés).", why: "Les parts d'OPCVM se rachètent au millième." });
      if (ctx?.held != null && amt > ctx.held) out.push({ key: "held", level: "block", text: `Vous détenez ${ctx.held.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts : le rachat ne peut pas dépasser ce nombre.`, why: "Le rachat porte sur les parts inscrites à votre nom chez le dépositaire." });
    }
  }

  // Buybacks: whole titles.
  if (o.kind === "RACHAT" && amt !== Math.floor(amt)) out.push({ key: "whole", level: "warn", text: `Nombre de titres arrondi à ${fmt(Math.floor(amt))}.`, why: "Le Trésor rachète des titres entiers." });

  if (ctx?.needsAccount) out.push({ key: "account", level: "warn", text: "Un compte-titres doit être ouvert avant le règlement : le desk vous rappelle pour finaliser le dossier.", why: "Les titres sont inscrits à votre nom chez le teneur de compte ; sans compte, l'ordre est gardé mais ne peut pas être réglé." });
  return out;
}

export const blocking = (checks: OrderCheck[]) => checks.find((c) => c.level === "block");
