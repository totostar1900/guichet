import { z } from "zod";

/**
 * LA DÉCISION DU DESK À LA PUBLICATION : prix (ou taux), ticket minimum, segment.
 *
 * ELLE LIT LES NOMBRES COMME LE DESK LES ÉCRIT (12 novembre 2026). Le champ du prix est rempli au format français — « 97,500 », « 6,2500 » — par
 * le niveau mesuré du marché, et le desk tape de même une virgule ou un espace entre les milliers. `Number("97,500")` vaut NaN : la publication
 * échouait avec « Décision incomplète » alors que tous les champs étaient renseignés. La virgule devient un point et les espaces (dont l'insécable
 * fine que `toLocaleString("fr-FR")` écrit entre les milliers) tombent AVANT la lecture.
 *
 * ET LE MESSAGE DIT CE QUI CLOCHE. « Décision incomplète : prix et ticket minimum » valait pour toutes les erreurs, y compris une valeur hors de sa
 * plage (un prix de 130 %), qui n'a rien d'incomplet. Il nomme maintenant le champ fautif et sa plage.
 */
export const decisionSchema = z.object({
  itemId: z.string().min(1),
  pricePct: z.coerce.number().min(50).max(120).optional(),
  precountRate: z.coerce.number().min(0).max(30).optional(),
  commissionPct: z.coerce.number().min(0).max(5).default(0),
  minTitles: z.coerce.number().int().min(1).optional(),
  /** Un fonds : la première souscription se dit en francs. */
  minAmount: z.coerce.number().int().min(0).optional(),
  segment: z.string().default("Tous les clients"),
});

export type DecisionDuDesk = z.infer<typeof decisionSchema>;

const NOMBRES = ["pricePct", "precountRate", "commissionPct", "minTitles", "minAmount"] as const;

/** « 97,500 » → « 97.500 », « 1 000 000 » → « 1000000 » : ce que `Number` sait lire. */
export const chiffreDeSaisie = (s: string): string => s.replace(/[\s  ]/g, "").replace(",", ".");

const LIBELLES: Record<string, string> = {
  itemId: "la source",
  pricePct: "le prix (de 50 à 120 % du nominal)",
  precountRate: "le taux précompté (de 0 à 30 %)",
  commissionPct: "la commission (de 0 à 5 %)",
  minTitles: "le ticket minimum (un nombre entier de titres, au moins 1)",
  minAmount: "la souscription minimale (un nombre entier de francs)",
  segment: "le segment",
};

export function lireDecision(brut: Record<string, string>): { ok: true; data: DecisionDuDesk } | { ok: false; error: string } {
  const propre: Record<string, string> = { ...brut };
  for (const k of NOMBRES) if (propre[k] !== undefined) propre[k] = chiffreDeSaisie(propre[k]);
  const r = decisionSchema.safeParse(propre);
  if (r.success) return { ok: true, data: r.data };
  const champs = [...new Set(r.error.issues.map((i) => String(i.path[0] ?? "")))].map((k) => LIBELLES[k] ?? k);
  return { ok: false, error: `Décision invalide : vérifiez ${champs.join(", ")}.` };
}
