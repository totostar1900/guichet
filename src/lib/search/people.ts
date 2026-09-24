import { fold } from "@/lib/text";

/**
 * Chercher une personne, des deux côtés du desk.
 *
 * La colonne des Dossiers et le Répertoire cherchent la même chose, des gens,
 * et le faisaient chacun à sa façon : l'une sur quatre champs en minuscules,
 * l'autre sur quatre autres. Une recherche qui répond ici et pas là est pire
 * qu'une recherche pauvre, parce qu'on cesse de lui faire confiance. Les deux
 * passent désormais par ce qui suit, et ce qu'on y ajoute paraît des deux
 * côtés le même jour.
 *
 * Trois règles, qui sont ce que le desk fait sans y penser :
 *
 * · chaque mot tapé doit répondre, et non l'un d'eux. « awa douala » donne les
 *   Awa de Douala, pas tous les Awa plus tous les habitants de Douala ;
 * · un mot fait de chiffres se compare au numéro réduit à ses chiffres, de
 *   sorte que « 699 88 » trouve « +237 699 88 77 66 » sans qu'on retape
 *   l'indicatif ni les espaces ;
 * · les accents et la casse ne comptent pas, dans un sens comme dans l'autre.
 *
 * S'y ajoutent quelques mots-clefs, qui font depuis le champ ce que les
 * pastilles font depuis la barre : `palier:2`, `canal:email`, `dossier:non`,
 * `ordres:oui`. Ils servent surtout à combiner, « palier:2 dossier:non »
 * étant une question qu'aucune pastille seule ne pose.
 */
export const digits = (v: string): string => v.replace(/\D+/g, "");

export interface Person {
  /** Ce sur quoi les mots portent : nom, e-mail, ville, adresse, immatriculation… */
  words: (string | undefined)[];
  phone?: string;
  tier?: number;
  whatsapp?: boolean;
  email?: boolean;
  /** Un dossier client existe pour cette personne. */
  file?: boolean;
  orders?: number;
}

export interface PeopleQuery {
  words: string[];
  tier?: number;
  canal?: "whatsapp" | "email" | "aucun";
  file?: boolean;
  orders?: boolean;
  /** Les mots-clefs écrits mais non compris : la page peut le dire plutôt que de rendre zéro ligne sans raison. */
  unknown: string[];
}

const YES = ["oui", "o", "yes", "y", "1", "true", "vrai"];
const NO = ["non", "n", "no", "0", "false", "faux"];
const bool = (v: string): boolean | undefined => (YES.includes(v) ? true : NO.includes(v) ? false : undefined);

const TIERS: Record<string, number> = { "0": 0, "1": 1, "2": 2, visiteur: 0, visitor: 0, identifie: 1, identified: 1, compte: 2, account: 2 };
const CANALS: Record<string, PeopleQuery["canal"]> = { whatsapp: "whatsapp", wa: "whatsapp", email: "email", "e-mail": "email", mail: "email", aucun: "aucun", none: "aucun", sans: "aucun" };

/** Le texte tapé, rendu en question. Ce qui n'est pas un mot-clef reste un mot. */
export function parsePeopleQuery(raw: string): PeopleQuery {
  const q: PeopleQuery = { words: [], unknown: [] };
  for (const tk of fold(raw).split(/\s+/).filter(Boolean)) {
    const m = /^([a-z-]+):(.+)$/.exec(tk);
    if (!m) {
      q.words.push(tk);
      continue;
    }
    const [, key, value] = m;
    if (key === "palier" || key === "tier") {
      if (value in TIERS) q.tier = TIERS[value];
      else q.unknown.push(tk);
    } else if (key === "canal" || key === "channel") {
      if (value in CANALS) q.canal = CANALS[value];
      else q.unknown.push(tk);
    } else if (key === "dossier" || key === "file") {
      const b = bool(value);
      if (b == null) q.unknown.push(tk);
      else q.file = b;
    } else if (key === "ordres" || key === "orders") {
      const b = bool(value);
      if (b == null) q.unknown.push(tk);
      else q.orders = b;
    } else {
      // Pas un mot-clef : « rc/dla:2019 » reste un mot, et c'est le bon défaut.
      q.words.push(tk);
    }
  }
  return q;
}

/** Une personne répond quand chaque mot répond et que chaque mot-clef est satisfait. */
export function peopleMatch(p: Person, q: PeopleQuery): boolean {
  if (q.tier != null && (p.tier ?? 1) !== q.tier) return false;
  if (q.canal === "whatsapp" && !p.whatsapp) return false;
  if (q.canal === "email" && !p.email) return false;
  if (q.canal === "aucun" && (p.whatsapp || p.email)) return false;
  if (q.file != null && Boolean(p.file) !== q.file) return false;
  if (q.orders != null && (p.orders ?? 0) > 0 !== q.orders) return false;
  if (q.words.length === 0) return true;
  const words = p.words.map((v) => fold(v ?? "")).filter(Boolean);
  const tel = digits(p.phone ?? "");
  return q.words.every((tk) => {
    const numeric = !/[a-z]/.test(tk) && digits(tk).length >= 2;
    return (numeric && tel.length > 0 && tel.includes(digits(tk))) || words.some((w) => w.includes(tk));
  });
}

/** Le raccourci des deux pages : analyser puis filtrer, en une fois. */
export const matchesPerson = (p: Person, raw: string): boolean => peopleMatch(p, parsePeopleQuery(raw));
