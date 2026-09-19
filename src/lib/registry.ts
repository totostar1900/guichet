import type { IntentType, Offer, OfferKind } from "@/lib/domain/types";
import type { BondTerms } from "@/data/bond-terms";
import { BOND_TERMS } from "@/data/bond-terms";
import { GLOSSARY as GLOSSARY_DEFAULTS, type Term } from "@/lib/glossary";
import { LESSONS, type Lesson } from "@/data/lessons";

/**
 * What the desk configures without code: the product types (how a line is
 * named, coloured, checked, explained), the bond schedules and the glossary.
 * Code keeps the maths (engines). The registry is loaded from the reference
 * table on the server, sent to the browser with the page, and falls back to
 * these built-in defaults when the table is empty.
 */
export type MarketSegment = "primaire" | "secondaire" | "fonds";

/** The cash-flow engines : the only thing a new product cannot configure. */
export type Engine = "bullet_bond" | "amort_bond" | "discount_bill" | "equity" | "fund_unit" | "buyback" | "info";
export const ENGINE_LABEL: Record<Engine, string> = {
  bullet_bond: "Obligation in fine (coupon annuel, capital à l'échéance)",
  amort_bond: "Obligation amortissable (capital remboursé par fractions)",
  discount_bill: "Bon à intérêts précomptés",
  equity: "Action (cours + dividende)",
  fund_unit: "Part de fonds (valeur liquidative)",
  buyback: "Rachat au pair",
  info: "Information seule (pas de rendement calculé)",
};

export interface ProductField {
  key: string;
  label: string;
  required: boolean;
}

export interface ProductType {
  key: string; // "OTA", "ACTION_COTEE", or a desk-created key
  label: string; // in filters: "OTA : Obligations du Trésor"
  short: string; // badge: "OTA"
  segment: MarketSegment;
  engine: Engine;
  color: string; // badge text / edge
  colorSoft: string; // badge background
  cautions: [string, string][]; // « À garder en tête »
  checklist: string[]; // what must be true before publishing
  intentsOpen: IntentType[]; // intents while the line is open / quoted
  fields: ProductField[]; // extra free-text facts shown on the fiche
  enabled: boolean;
  sort: number;
  builtin: boolean;
}

/** Storage kind an engine writes to (the existing enum), so old logic keeps working. */
export function kindForEngine(engine: Engine, segment: MarketSegment): { kind: OfferKind; instrument?: "action" | "obligation" } {
  switch (engine) {
    case "bullet_bond":
      return segment === "secondaire" ? { kind: "MARCHE", instrument: "obligation" } : { kind: "APE" };
    case "amort_bond":
      return { kind: "MARCHE", instrument: "obligation" };
    case "discount_bill":
      return { kind: "BTA" };
    case "equity":
      return segment === "secondaire" ? { kind: "MARCHE", instrument: "action" } : { kind: "ACTIONS" };
    case "fund_unit":
      return { kind: "FONDS" };
    case "buyback":
      return { kind: "RACHAT" };
    default:
      return { kind: "APE" };
  }
}

const SOV: [string, string][] = [
  ["Crédit.", "L'émetteur est un État de la CEMAC ; coupons et capital dépendent de sa capacité à honorer sa dette."],
  ["Allocation.", "Prix et volumes servis sont arrêtés par le Trésor : une soumission peut être servie à un autre prix, en partie, ou pas du tout."],
  ["Liquidité.", "Conservé jusqu'au terme, le titre délivre le rendement calculé ; cédé avant, il se négocie au prix d'un secondaire encore étroit."],
];
const LISTED: [string, string][] = [
  ["Prix d'exécution.", "Le cours indiqué est le dernier connu ; votre ordre s'exécute au prix du marché ou à votre limite, en tout ou partie, selon la contrepartie disponible."],
  ["Liquidité.", "Le marché secondaire régional est étroit : un ordre peut rester non exécuté plusieurs séances."],
  ["Perte en capital.", "La valeur des titres varie ; céder avant l'échéance peut dégager une perte."],
];
const CHECK_BOND = ["Communiqué ou note d'information joint", "Coupon, nominal et échéance saisis", "Prix indicatif ou servi renseigné", "Date et heure limite de dépôt vérifiées", "Règlement et premier coupon cohérents"];

const t = (p: Omit<ProductType, "enabled" | "builtin" | "fields"> & Partial<Pick<ProductType, "fields">>): ProductType => ({ enabled: true, builtin: true, fields: [], ...p });

export const BUILTIN_TYPES: ProductType[] = [
  t({ key: "OTA", label: "OTA : Obligations du Trésor", short: "OTA", segment: "primaire", engine: "bullet_bond", color: "#0b2545", colorSoft: "#e3e9f3", cautions: SOV, checklist: CHECK_BOND, intentsOpen: ["ferme", "appetit", "info", "rappel"], sort: 10 }),
  t({ key: "BTA", label: "BTA : Bons du Trésor", short: "BTA", segment: "primaire", engine: "discount_bill", color: "#0f6e6a", colorSoft: "#d8efec", cautions: SOV, checklist: ["Communiqué joint", "Taux précompté et échéance saisis", "Date et heure limite vérifiées"], intentsOpen: ["ferme", "appetit", "info", "rappel"], sort: 20 }),
  t({ key: "APE", label: "Emprunts obligataires (APE)", short: "APE", segment: "primaire", engine: "bullet_bond", color: "#6d3b8f", colorSoft: "#ece2f4", cautions: [["Crédit.", "L'émetteur est une entreprise ou une institution : coupons et capital dépendent de sa solidité, décrite dans la note d'information visée par la COSUMAF."], SOV[1], SOV[2]], checklist: [...CHECK_BOND, "Visa COSUMAF de la note d'information vérifié"], intentsOpen: ["ferme", "appetit", "info", "rappel"], sort: 30 }),
  t({ key: "IPO", label: "Introductions en bourse", short: "IPO", segment: "primaire", engine: "equity", color: "#b0426a", colorSoft: "#f7e1ea", cautions: [["Volatilité et liquidité.", "Le cours dépend de l'offre et de la demande sur un compartiment actions encore étroit ; la BVMAC borne les variations quotidiennes."], ["Perte en capital.", "Comme tout actionnaire, l'investisseur peut perdre tout ou partie de sa mise."], ["Dividende non garanti.", "Le dividende dépend des résultats et de la décision de l'assemblée."]], checklist: ["Prospectus visé joint", "Prix de souscription et minimum saisis", "Calendrier (ouverture, clôture, cotation) vérifié"], intentsOpen: ["ferme", "info"], sort: 40 }),
  t({ key: "RACHAT", label: "Rachats par le Trésor", short: "Rachat", segment: "primaire", engine: "buyback", color: "#b84a1e", colorSoft: "#f8e3da", cautions: [["Prix.", "Le rachat se fait au pair ; le coupon couru est réglé par le Trésor."], ["Décision.", "Céder maintenant, c'est renoncer aux coupons restants : à comparer avec le rendement d'un réemploi."], ["Volume.", "Le Trésor peut retenir une partie seulement des titres présentés."]], checklist: ["Communiqué joint", "Échéance initiale et volume saisis", "Date limite vérifiée"], intentsOpen: ["cession", "info"], sort: 50 }),
  t({ key: "ACTION_COTEE", label: "Actions cotées", short: "Action", segment: "secondaire", engine: "equity", color: "#2f7d4f", colorSoft: "#dff1e6", cautions: LISTED, checklist: ["Cours repris du bulletin", "Société rattachée (analyse)"], intentsOpen: ["achat", "vente", "info"], sort: 60 }),
  t({ key: "OBLIGATION_COTEE", label: "Obligations cotées", short: "Obligation", segment: "secondaire", engine: "amort_bond", color: "#2a5db0", colorSoft: "#e1eaf8", cautions: LISTED, checklist: ["Cours repris du bulletin", "Échéancier exact renseigné (sinon ≈)"], intentsOpen: ["achat", "vente", "info"], sort: 70 }),
  t({ key: "OPCVM", label: "Fonds (OPCVM)", short: "OPCVM", segment: "fonds", engine: "fund_unit", color: "#8a6408", colorSoft: "#fbf1da", cautions: [["Valeur liquidative inconnue à l'ordre.", "Une souscription ou un rachat s'exécute à la prochaine VL calculée par la société de gestion, pas à celle affichée ; le nombre de parts n'est connu qu'après centralisation."], ["Performance non garantie.", "Les performances passées ne préjugent pas des performances futures ; la VL peut baisser, y compris pour un fonds monétaire ou obligataire."], ["Frais et liquidité.", "Les frais du fonds (entrée, sortie, gestion prélevée dans la VL) figurent dans son prospectus ; un rachat est réglé après la VL de rachat, selon la périodicité du fonds. Les parts sont inscrites à votre nom chez le dépositaire ; Purpose Capital n'est que distributeur."]], checklist: ["Convention de distribution enregistrée", "Frais du fonds et minimum saisis", "Cut-off et délai de règlement renseignés"], intentsOpen: ["souscription", "rachat", "info"], sort: 80 }),
];

export interface Registry {
  types: ProductType[];
  bondTerms: Map<string, BondTerms>;
  glossary: Record<string, Term>;
  lessons: Lesson[];
}

let REG: Registry = { types: BUILTIN_TYPES, bondTerms: new Map(BOND_TERMS.map((b) => [b.isin, b])), glossary: GLOSSARY_DEFAULTS, lessons: LESSONS };

export const getRegistry = (): Registry => REG;
export function setRegistry(r: Partial<Registry>): void {
  REG = { ...REG, ...r };
}

/** Built-in family of an offer stored before product types existed. */
export function legacyTypeKey(o: Pick<Offer, "kind" | "instrument">): string {
  switch (o.kind) {
    case "OTA":
    case "BTA":
    case "APE":
    case "RACHAT":
      return o.kind;
    case "ACTIONS":
      return "IPO";
    case "FONDS":
      return "OPCVM";
    default:
      return o.instrument === "obligation" ? "OBLIGATION_COTEE" : "ACTION_COTEE";
  }
}

export const typeByKey = (key: string): ProductType | undefined => REG.types.find((x) => x.key === key);
export function typeOf(o: Pick<Offer, "kind" | "instrument" | "typeKey">): ProductType {
  const key = o.typeKey ?? legacyTypeKey(o);
  return typeByKey(key) ?? typeByKey(legacyTypeKey(o)) ?? BUILTIN_TYPES[0];
}
export const lessons = (): Lesson[] => [...REG.lessons].sort((a, b) => a.order - b.order);
/** The lesson a glossary term points to, if any. */
export const lessonForTerm = (term: string): Lesson | undefined => REG.lessons.find((l) => l.terms.includes(term));
export const enabledTypes = (): ProductType[] => [...REG.types].filter((x) => x.enabled).sort((a, b) => a.sort - b.sort);

/** Inline colour variables for a family badge / edge (desk-created types have no CSS class). */
export function famVars(key: string): Record<string, string> {
  const t = typeByKey(key);
  return t ? { "--fam-c": t.color, "--fam-s": t.colorSoft, [`--fam-${key}`]: t.color } : {};
}
