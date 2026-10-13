/**
 * Parser for the BVMAC « Bulletin Officiel de la Cote » (BOC), from the text
 * produced by pdf-parse. Pure, deterministic, tested against a real bulletin.
 *
 * Text shape (pdf-parse):
 *  - equities: one cell per line after the ISIN line;
 *  - bonds: a header line "ISSUER TITLE ISIN MNEMO" then one dense line of cells;
 *  - OPCVM: one line per fund (sometimes wrapped over 2–4 lines).
 */

export interface BocEquity {
  isin: string;
  mnemo: string;
  issuer: string;
  previousClose: number;
  previousDate: string; // YYYY-MM-DD
  volumeBid: number;
  volumeAsk: number;
  volumeTraded: number;
  valueTraded: number;
  trades: number;
  status: string;
  open: number;
  close: number;
  thresholdHigh: number;
  thresholdLow: number;
  variationPct: number;
  referenceNext: number;
  ytdHigh: number;
  ytdLow: number;
  ytdVariationPct: number | null;
}

export interface BocBond {
  isin: string;
  mnemo: string;
  issuer: string;
  designation: string; // title as printed, e.g. "ECMR 6.25% NET 2022-2029"
  segment: "etats" | "regionales" | "privees";
  previousDate: string;
  previousPct: number;
  previousFcfa: number;
  nominalRemaining: number; // J+3
  accruedCoupon: number; // J+3, FCFA per bond
  status: string;
  open: number;
  close: number;
  thresholdHigh: number;
  thresholdLow: number;
  variationPct: number;
  referenceNextFcfa: number;
}

export interface BocFund {
  manager: string;
  depositary: string;
  name: string;
  category: "M" | "O" | "D" | "A" | "?";
  frequency: "quotidienne" | "hebdomadaire" | "mensuelle" | "trimestrielle" | "?"; // section of the table the fund first appears in = valuation frequency
  variationMonthlyPct?: number; // from the « Mensuelles » section when the fund is repeated there
  variationQuarterlyPct?: number; // from « Trimestrielles »
  navOrigin: number;
  previousNav: number;
  previousDate: string;
  nav: number;
  navDate: string;
  inceptionDate: string;
  perfSinceInceptionPct: number;
  variationPct: number;
}

/** Capitalisation table: shares, market cap, last dividend, EPS and liquidity per listed equity. */
export interface BocCapitalisation {
  isin: string;
  mnemo: string;
  close: number;
  sharesFloat: number;
  sharesTotal: number;
  lastDividend?: number; // FCFA per share, gross
  dividendYear?: number;
  dividendDate?: string; // YYYY-MM-DD
  liquidity3mPct?: number;
  eps?: number;
  marketCapFloat: number;
  marketCapTotal: number;
}

export interface BocParsed {
  bulletinNo: number;
  sessionDate: string; // YYYY-MM-DD
  index?: { value: number; variationPct: number };
  equities: BocEquity[];
  bonds: BocBond[];
  funds: BocFund[];
  capitalisation: BocCapitalisation[];
  notices: string[]; // titles of the avis (amortissements, paiements d'intérêts…)
  warnings: string[];
  /* Les mêmes phrases, avec la ligne fautive quand il y en a une. Le rapport
     d'une séance s'en sert ; l'ingestion n'en garde que « warnings ». */
  notes: Note[];
}

const ISIN_RE = /^([A-Z]{2})\s?(\d{10})$/;
const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;

export const num = (s: string): number => {
  const t = s.replace(/\s/g, "").replace(/ /g, "").replace("%", "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};
/** "26/12/2025" → "2025-12-26"; the BVMAC sometimes prints "05/012/2025" : the month keeps its last two digits. */
/**
 * Une date du bulletin en date ISO, séparateurs abîmés compris.
 *
 * ELLE REND LA CHAÎNE BRUTE QUAND ELLE NE RECONNAÎT PAS, et ce silence a déjà
 * coûté : le 12 octobre 2026, une tolérance posée en amont a laissé passer
 * « 22/11//2024 », que cette fonction a rendu tel quel, et douze rangées ont
 * porté une date illisible sans que rien ne proteste. Les trois défauts
 * d'impression relevés sur les débris de la table des OPCVM sont donc
 * reconnus ici aussi : la barre en trop (« 06/12//2024 »), la barre manquante
 * (« 1312/2024 ») et le mois à trois chiffres, qui l'était déjà.
 */
export const isoDate = (d: string): string => {
  const m = d.match(/^(\d{2})\/{0,2}(\d{2,3})\/{1,2}(\d{4})$/);
  return m ? `${m[3]}-${m[2].slice(-2)}-${m[1]}` : d;
};

/** Une phrase du lecteur, et ce sur quoi il a buté quand il y a de quoi. */
export interface Note {
  message: string;
  /** Le texte du PDF que le lecteur n'a pas su lire, tel quel. */
  brut?: string;
  /** Ce qu'il y cherchait, en clair. */
  attendu?: string;
  /**
   * La page du PDF où ce texte se trouve, quand on a su la retrouver.
   *
   * ELLE NE SORT PAS DU LECTEUR APLATI, qui ne connaît pas les pages :
   * `pdfText` rend un seul bloc. Elle est posée après coup en retrouvant le
   * texte brut dans les rangées géométriques, qui portent une page et des
   * abscisses. Sans elle, le desk lit « ligne de cours non reconnue » et n'a
   * aucun moyen d'aller voir de quelle ligne du document on parle, ce qui
   * rend la question impossible à répondre.
   */
  page?: number;
}

/**
 * LE CARNET DU LECTEUR.
 *
 * Il remplace le tableau de chaînes que les cinq fonctions de section se
 * passaient, et il garde `push` : les dix-sept appels existants n'ont pas
 * bougé. Les huit endroits où une ligne fautive existe appellent `sur`, qui
 * garde en plus le texte brut et le motif attendu.
 *
 * Sans cela, un rapport ne peut rien dire de plus que la phrase : le texte
 * sur lequel le lecteur a buté était jeté à l'instant même de l'échec.
 */
export class Carnet {
  readonly notes: Note[] = [];
  push(message: string): void {
    this.notes.push({ message });
  }
  sur(message: string, brut: string, attendu?: string): void {
    this.notes.push({ message, brut: brut.slice(0, 400), attendu });
  }
  get messages(): string[] {
    return this.notes.map((n) => n.message);
  }
}

export function parseBoc(text: string, nominauxDeReference?: Map<string, number>): BocParsed {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/ /g, " ").trim());
  const warnings = new Carnet();

  const head = text.match(/BULLETIN OFFICIEL DE LA COTE N°\s*(\d+)\s+DU\s+(\d{2}\/\d{2}\/\d{4})/);
  const bulletinNo = head ? Number(head[1]) : 0;
  const sessionDate = head ? isoDate(head[2]) : "";
  if (!head) warnings.push("En-tête du bulletin non reconnu (numéro / date).");

  // Index
  let index: BocParsed["index"];
  // "BVMAC ALL SHARE INDEX" is followed by the level and the day variation, each on its own line.
  const iIdx = lines.findIndex((l) => /^BVMAC ALL SHARE INDEX/.test(l));
  if (iIdx >= 0) {
    const nums = lines.slice(iIdx + 1, iIdx + 6).filter((l) => /^-?[\d ]+,\d{2}%?$/.test(l));
    const v = nums[0] ? num(nums[0]) : NaN;
    const vv = nums[1] ? num(nums[1]) : NaN;
    if (Number.isFinite(v)) index = { value: v, variationPct: Number.isFinite(vv) ? vv : 0 };
    else warnings.push("Indice BVMAC ALL SHARE non lu.");
  } else warnings.push("Indice BVMAC ALL SHARE introuvable.");

  const equities = parseEquities(lines, warnings);
  const bonds = parseBonds(lines, warnings, nominauxDeReference);
  const funds = parseFunds(lines, warnings);
  const capitalisation = parseCapitalisation(lines, warnings);
  const notices = lines.filter((l) => /^«.*»\s*$/.test(l)).map((l) => l.replace(/[«»]/g, "").trim());

  return { bulletinNo, sessionDate, index, equities, bonds, funds, capitalisation, notices, warnings: warnings.messages, notes: warnings.notes };
}

/* ---------------- Capitalisation boursière ---------------- */
// One cell per line after the ISIN: mnemo, short name, close, float shares, total shares,
// then either "dividend amount / year / date" or "-", liquidity, "-", EPS (or "-"), float cap, global cap.
function parseCapitalisation(lines: string[], warnings: Carnet): BocCapitalisation[] {
  const out: BocCapitalisation[] = [];
  const start = lines.findIndex((l) => /^CAPITALISATION BOURSIERE/.test(l));
  if (start < 0) {
    warnings.push("Section « Capitalisation boursière » introuvable.");
    return out;
  }
  /**
   * LA LIGNE QUI FERME LA TABLE, MÊME COLLÉE À SES CHIFFRES.
   *
   * Georges a signalé le 13 octobre 2026 que les rangées de la famille O
   * « sont bien complètes ». Elles le sont, et ce n'était pas la bonne table.
   *
   * La section s'appelle « CAPITALISATION BOURSIERE ET ENCOURS DES TITRES DE
   * DETTE » : elle en contient DEUX, celle des actions puis celle de la dette,
   * qui n'ont pas les mêmes colonnes. La première se ferme sur un total, et
   * c'est lui qui sépare. Or l'aplatissement du PDF colle ce total à ses
   * propres chiffres :
   *
   *   Total63 664 048 000438 928 687 500
   *
   * « ^Total$ » ne le reconnaît donc pas, la borne n'est jamais trouvée, et le
   * lecteur avale les deux cents lignes suivantes. Il lit alors les rangées
   * BDEAC de la table de la DETTE avec la grammaire des ACTIONS, qui attend un
   * flottant, un dividende et une capitalisation. D'où « cellules
   * incomplètes » sur des rangées parfaitement formées.
   *
   * Mesuré sur les quatre séances de la famille : « ^Total$ » rend -1 sur les
   * quatre, et la ligne collée est au bon endroit. Sur une séance saine, le
   * total nu existe ET arrive AVANT le total collé de la table de dette, donc
   * prendre la première occurrence de l'un ou l'autre reste juste.
   *
   * Le chiffre ou le tiret est exigé juste après : un émetteur dont le nom
   * commence par « Total » ne fermerait pas la table par accident.
   */
  const end = lines.findIndex((l, i) => i > start && /^Total\s*$|^Total\s*[\d-]/.test(l.trim()));
  const section = lines.slice(start, end > start ? end : start + 200).map((l) => l.trim());
  const isNum = (c: string) => /^-?[\d ]+(?:,\d+)?$/.test(c) && c !== "-";
  for (let i = 0; i < section.length; i++) {
    const m = section[i].match(ISIN_RE);
    if (!m) continue;
    const isin = `${m[1]}${m[2]}`;
    // cells until the next ISIN's issuer name (two lines before the next ISIN) or the end
    let j = i + 1;
    while (j < section.length && !ISIN_RE.test(section[j])) j++;
    const cells = section.slice(i + 1, ISIN_RE.test(section[j] ?? "") ? j - 1 : j).filter((c) => c !== "");
    const nums = cells.filter(isNum).map(num);
    const mnemo = cells[0];
    if (nums.length < 5) {
      warnings.sur(`Capitalisation ${isin} : cellules incomplètes.`, cells.join(" | "), "douze cellules : mnémonique, nom, cours, flottant, total, dividende, année, date, liquidité, bénéfice, capitalisation flottante, capitalisation globale");
      continue;
    }
    const [close, sharesFloat, sharesTotal] = nums;
    const dateAt = cells.findIndex((c) => DATE_RE.test(c));
    const dividend = dateAt > 0 ? { lastDividend: num(cells[dateAt - 2]), dividendYear: Number(cells[dateAt - 1]), dividendDate: isoDate(cells[dateAt]) } : {};
    const marketCapTotal = nums[nums.length - 1];
    const marketCapFloat = nums[nums.length - 2];
    // between the dividend date and the caps: liquidity (%), then EPS when published
    const tail = (dateAt > 0 ? cells.slice(dateAt + 1) : cells.slice(5)).filter(isNum).map(num).slice(0, -2);
    out.push({ isin, mnemo, close, sharesFloat, sharesTotal, ...dividend, liquidity3mPct: tail[0], eps: tail[1], marketCapFloat, marketCapTotal });
  }
  // the section is there but nothing came out of it: say so rather than return empty
  if (out.length === 0) warnings.push("Section « Capitalisation boursière » présente mais illisible : aucune ligne.");
  return out;
}

/* ---------------- Actions ---------------- */
const ISIN_LOOSE = /^(.*?)([A-Z]{2})\s?(\d{10})(.*)$/;
const MNEMO_BY_ISIN: Record<string, string> = { CM0000010009: "SEMC", CM0000010017: "SAF", CM0000010025: "SOCAP", CM0000010041: "REG", GQ0000010050: "BANGE", GA0000010066: "SCGRE", GA0000010074: "BHC" };
/**
 * Un montant, avec ses espaces de milliers : « 49 000 », « 228 085 », « 800 ».
 *
 * LES DEUX DÉCIMALES SONT OPTIONNELLES, et elles ont coûté cher : en 2024,
 * SOCAPALM et LA REGIONALE étaient cotées « 50 000,00 » quand les autres
 * étaient cotées « 47 000 ». Le motif sans virgule ne reconnaissait pas leur
 * ligne, les deux actions sortaient de la séance sans que rien n'échoue, et
 * 456 bulletins sur 808 sont restés « partiels ». Mesuré le 5 octobre 2026 :
 * SOCAP, la plus échangée de la cote, n'était lue que sur 42 des 246 séances
 * de 2024.
 */
const AMT = "(?:[1-9]\\d{0,2}(?: \\d{3})*|0)(?:,\\d{2})?";
// prev close · date · volumes (glued) · status · open · close · high · low · var% · ref · ytd high · ytd low · ytd var
/* Les colonnes se touchent d'ordinaire ; LA REGIONALE, elle, imprime
   « 42 500,00  46 750 ». L'espace est donc toléré entre chacune. */
const E = "\\s*";
const EQ_DENSE = new RegExp("^(" + AMT + ")(\\d{2}/\\d{2}/\\d{4})([\\d ]*?)([A-Z]{1,3}[a-z]?)" + E + "(" + AMT + ")" + E + "(" + AMT + ")" + E + "(" + AMT + ")" + E + "(" + AMT + ")" + E + "(-?\\d+,\\d{2})%" + E + "(" + AMT + ")" + E + "(" + AMT + ")" + E + "(" + AMT + ")" + E + "(-?\\d+,\\d{2}|-)?$");

function parseEquityDense(isin: string, issuer: string, line: string): BocEquity | undefined {
  const m = line.replace(/\s+/g, " ").trim().match(EQ_DENSE);
  if (!m) return undefined;
  // Volumes are glued without separators. When the line traded (PEq) the value keeps its thousand
  // spaces and the trade count is the last digit: "…41821818 748 0002" → the split is chosen so that
  // value / volume falls inside the session's price band (here 18 748 000 / 218 = 86 000).
  const low = num(m[8]);
  const high = num(m[7]);
  let valueTraded = 0;
  let volumeTraded = 0;
  let trades = 0;
  if (m[4] !== "NC") {
    const v = m[3].trim();
    const tr = v.match(/(\d)$/);
    const body = tr ? v.slice(0, -1) : v;
    outer: for (const lead of [1, 2, 3]) {
      const mv = body.match(new RegExp(`(\\d{${lead}}(?: \\d{3})+)$`));
      if (!mv) continue;
      const value = num(mv[1]);
      const before = body.slice(0, -mv[1].length).replace(/\s/g, "");
      for (let len = 1; len <= Math.min(6, before.length); len++) {
        const vol = Number(before.slice(-len));
        if (vol > 0 && value / vol >= low * 0.98 && value / vol <= high * 1.02) {
          valueTraded = value;
          volumeTraded = vol;
          trades = tr ? Number(tr[1]) : 1;
          break outer;
        }
      }
    }
  }
  return {
    isin,
    mnemo: MNEMO_BY_ISIN[isin] ?? "",
    issuer,
    previousClose: num(m[1]),
    previousDate: isoDate(m[2]),
    volumeBid: 0,
    volumeAsk: 0,
    volumeTraded,
    valueTraded,
    trades,
    status: m[4],
    open: num(m[5]),
    close: num(m[6]),
    thresholdHigh: num(m[7]),
    thresholdLow: num(m[8]),
    variationPct: num(m[9]),
    referenceNext: num(m[10]),
    ytdHigh: num(m[11]),
    ytdLow: num(m[12]),
    ytdVariationPct: m[13] && m[13] !== "-" ? num(m[13]) : null,
  };
}

function parseEquities(lines: string[], warnings: Carnet): BocEquity[] {
  const out: BocEquity[] = [];
  const start = lines.findIndex((l) => /^MARCHE DES ACTIONS/.test(l));
  const end = lines.findIndex((l, i) => i > start && /^MARCHE DES OBLIGATIONS/.test(l));
  if (start < 0) {
    warnings.push("Section « Marché des actions » introuvable.");
    return out;
  }
  const section = lines.slice(start, end > start ? end : undefined);
  for (let i = 0; i < section.length; i++) {
    const loose = section[i].match(ISIN_LOOSE);
    if (!loose || /\d{2}\/\d{2}\/\d{4}/.test(section[i])) continue;
    const isin = `${loose[2]}${loose[3]}`;
    // issuer = the non-empty lines just above, until a previous row's trailing number
    const issuerLines: string[] = [];
    for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
      const l = section[j];
      /* Un nom d'émetteur ne commence jamais par un chiffre. La ligne dense de
         la valeur précédente, elle, commence par son cours et porte son statut
         en lettres (« 2230000NC26 500… ») : faite de chiffres ET de lettres,
         elle passait le filtre et entrait dans le nom. 525 cotations en
         portaient la trace. */
      if (!l || /^\d/.test(l) || /^[\d\s,.%-]+$/.test(l) || ISIN_LOOSE.test(l) || /^(Haut|Bas|Variation)\b/.test(l) || /\d{2}\/\d{2}\/\d{4}/.test(l)) break;
      issuerLines.unshift(l);
    }
    const issuer = [...issuerLines, loose[1]].join(" ").replace(/\s+/g, " ").trim();
    // The row sits on the next 1 to 4 lines: today everything is glued together,
    // before November 2025 the close, the date and the rest came out separately.
    let dense: BocEquity | undefined;
    /* Le dernier candidat examiné survit à la boucle : c'est lui que le
       rapport montre quand aucun des quatre n'a été reconnu. Sans cela, le
       texte sur lequel le lecteur bute est jeté à l'instant de l'échec. */
    let dernier = "";
    for (let k = 1; k <= 4 && !dense; k++) {
      const cand = section.slice(i + 1, i + 1 + k).join("").replace(/^[A-Za-z\s-]+(?=\d)/, "");
      dernier = cand;
      // La virgule du cours précédent fait partie du nombre : « 50 000,0031/05/2024 ».
      if (/^[\d ,]+\d{2}\/\d{2}\/\d{4}/.test(cand)) dense = parseEquityDense(isin, issuer, cand);
    }
    if (dense) {
      out.push(dense);
      continue;
    }
    const m = section[i].match(ISIN_RE);
    if (!m) {
      warnings.sur(`Action ${isin} : ligne dense non reconnue.`, dernier, "cours précédent, date, cours du jour, statut, volumes et seuils, collés sur une ligne");
      continue;
    }
    /* UNE CELLULE BLANCHE N'EST PAS UNE VALEUR ABSENTE, c'est un artefact de
       mise en page, et la confondre avec une colonne a décalé tout le reste.
       Mesuré le 6 octobre 2026 : SOCAPALM sort avec « 54 450 », six espaces,
       une espace, « 44 550 », six espaces, une espace, « 1,01% ». Les deux
       seuils sont des colonnes VOISINES : ce qui les sépare ne porte rien.
       Lues comme des cellules, ces quatre respirations poussaient le seuil
       bas dans la case de la référence, et le seuil bas tombait à zéro.
       164 lignes en base : SOCAP depuis le 20 janvier 2026 et encore
       aujourd'hui, REG sur l'hiver 2023 — précisément les deux valeurs que
       le bulletin imprime avec décimales. Dans 164 cas sur 164 la référence
       valait exactement le seuil bas, ce qui ne laisse aucun doute.
       Rien ne l'avait signalé : ces séances sont marquées « ok ». */
    const cells = section.slice(i + 1, i + 24).filter((c) => c.trim() !== "");
    // mnemo (1–2 lines) until the previous close (a number)
    let k = 0;
    const mnemoParts: string[] = [];
    while (k < cells.length && Number.isNaN(num(cells[k])) && !DATE_RE.test(cells[k]) && k < 3) mnemoParts.push(cells[k++]);
    const dateAt = cells.findIndex((c, idx) => idx >= k && DATE_RE.test(c));
    if (dateAt < 0) {
      warnings.push(`Action ${isin} : ligne incomplète.`);
      continue;
    }
    const previousClose = num(cells[dateAt - 1]);
    const previousDate = isoDate(cells[dateAt]);
    const rest = cells.slice(dateAt + 1);
    const statusAt = rest.findIndex((c) => /^[A-Z]{1,3}[a-z]?$/.test(c));
    if (statusAt < 0) {
      warnings.push(`Action ${isin} : statut introuvable.`);
      continue;
    }
    const vols = rest.slice(0, statusAt).map(num);
    const after = rest.slice(statusAt + 1);
    const n = (idx: number) => num(after[idx] ?? "");
    const ytdVar = after[8] === "-" || after[8] === undefined || Number.isNaN(n(8)) ? null : n(8);
    out.push({
      isin,
      mnemo: (mnemoParts[0] ?? "").replace(/\s/g, "") || MNEMO_BY_ISIN[isin] || "",
      issuer,
      previousClose,
      previousDate,
      volumeBid: vols[0] ?? 0,
      volumeAsk: vols[1] ?? 0,
      volumeTraded: vols[2] ?? 0,
      valueTraded: vols[3] ?? 0,
      trades: vols[4] ?? 0,
      status: rest[statusAt],
      open: n(0),
      close: n(1),
      thresholdHigh: n(2),
      thresholdLow: n(3),
      variationPct: n(4),
      referenceNext: n(5),
      ytdHigh: n(6),
      ytdLow: n(7),
      ytdVariationPct: ytdVar,
    });
  }
  return out;
}

/* ---------------- Obligations ---------------- */
const BOND_HEAD = /^(.*?)([A-Z]{2}\d{10})([A-Z][A-Z0-9]{3,5}?)(\d{2}\/\d{2}\/\d{4}.*)?$/;

/**
 * Splits "<prix FCFA><nominal,ddd>" where the price may lack decimals.
 *
 * DEUX IDENTITÉS, ET LA SECONDE A ÉTÉ MESURÉE LE 11 OCTOBRE 2026.
 *
 * La première est celle d'origine : le prix vaut le pourcentage du nominal
 * IMPRIMÉ. Elle tranche la plupart des lignes et ne bouge pas.
 *
 * Elle ne peut pas tenir sur une ligne AMORTISSABLE, et c'est la cause de la
 * famille « prix / nominal ambigus » : 78 remarques sur 66 séances. Relevé
 * sur le texte brut de trois lignes, que la base ne gardait pas avant
 * aujourd'hui :
 *
 *   CM0000020354   98,40 %   prix 9 840,00    nominal imprimé 0,000
 *   GA0000020248   99,50 %   prix 2 487,50    nominal imprimé 0,000
 *   CM0000020362  100,00 %   prix 10 000,00   nominal imprimé 5 000,000
 *
 * Le prix n'est donc pas rapporté au nominal du jour : il est rapporté au
 * DERNIER NOMINAL NON NUL de la ligne, celui qui courait avant que le capital
 * ne soit remboursé. Les deux premières lignes impriment même un nominal nul,
 * ce que la première identité rejette de toute façon (« nominal <= 0 »).
 *
 * D'où la seconde identité, essayée seulement quand la première a renoncé :
 * le prix vaut le pourcentage d'un nominal de RÉFÉRENCE que l'appelant
 * fournit, pris dans la dernière lecture de cette ligne. L'information
 * dormait en base depuis le premier jour, et le lecteur ne la regardait pas.
 *
 * Ce n'est pas une permission : c'est une seconde identité, aussi stricte que
 * la première, et le nominal nul n'est accepté QUE sous son contrôle. Sans
 * référence, le comportement d'avant, mot pour mot.
 */
export function splitPriceNominal(mid: string, pct: number, nominalRef?: number): { price: number; nominal: number } | undefined {
  const clean = mid.replace(/ /g, "");
  const m = clean.match(/^(.*?),(\d{3})$/);
  const body = m ? m[1] : clean; // "<price><nominal-int>" with optional ",dd" in price; nominal decimals optional
  const attendu = nominalRef != null && nominalRef > 0 ? (pct * nominalRef) / 100 : undefined;
  let parLaReference: { price: number; nominal: number; ecart: number } | undefined;
  for (let cut = 1; cut < body.length; cut++) {
    const price = num(body.slice(0, cut));
    const nominal = num(m ? `${body.slice(cut)},${m[2]}` : body.slice(cut));
    if (!Number.isFinite(price) || !Number.isFinite(nominal) || nominal < 0) continue;
    if (nominal > 0 && Math.abs(price - (pct * nominal) / 100) < 1.5) return { price, nominal };
    /* LA PREMIÈRE IDENTITÉ GARDE LA PRIORITÉ : on retient la meilleure
       découpe de la référence et on ne la rend qu'une fois la boucle épuisée.
       LA MEILLEURE, ET NON LA PREMIÈRE, parce que la tolérance d'un franc et
       demi laisse passer une découpe antérieure et fausse : sur
       « 2487,500,000 » à 99,5 % de 2 500, le prix attendu est 2 487,50, et
       couper à « 2487 » laisse un écart de cinquante centimes qui tient dans
       la fenêtre. Le lecteur aurait rendu un prix de 2 487 et un nominal de
       500, tous les deux faux, au lieu de 2 487,50 et zéro. */
    if (attendu === undefined) continue;
    const ecart = Math.abs(price - attendu);
    if (ecart < 1.5 && (!parLaReference || ecart < parLaReference.ecart)) parLaReference = { price, nominal, ecart };
  }
  return parLaReference ? { price: parLaReference.price, nominal: parLaReference.nominal } : undefined;
}

/** Issuers whose name is glued to the title in the dense layout ("ETAT DU CAMEROUNECMR 6.25% …"). */
const ISSUERS = ["ETAT DU CAMEROUN", "ETAT DU GABON", "ETAT DU TCHAD", "ETAT DU CONGO", "ETAT DE CENTRAFRIQUE", "ETAT DE GUINEE EQUATORIALE", "BDEAC", "BEAC", "ALIOS FINANCE", "ACEP CAMEROUN", "SNPC"];
function splitIssuer(raw: string): { issuer: string; designation: string } {
  const t = raw.replace(/\s+/g, " ").trim();
  for (const iss of ISSUERS) {
    if (t.toUpperCase().startsWith(iss)) return { issuer: iss, designation: t.slice(iss.length).trim() || t };
  }
  // generic: "<ISSUER> <CODE> <rate>% …" : the title starts at the token preceding the rate
  const m = t.match(/^(.*?)\s+([A-Z0-9-]+(?: MT)? \d+[.,]?\d*\s?%.*)$/);
  if (m) return { issuer: m[1].trim(), designation: m[2].trim() };
  return { issuer: t, designation: t };
}

function segmentOf(designation: string): BocBond["segment"] {
  if (/^ETAT|^REPUBLIQUE/i.test(designation)) return "etats";
  if (/BDEAC|BEAC|CEMAC/i.test(designation)) return "regionales";
  return "privees";
}

// date · prev % · price+nominal · accrued · volumes (may hold spaces when the line traded) · status · open · close · high · low · var · ref
/**
 * LES DÉCIMALES SONT FACULTATIVES SUR LES POURCENTAGES, et c'est mesuré.
 *
 * Les bulletins anciens impriment « 100 » là où les récents impriment
 * « 100,00 », sur le pourcentage comme sur les quatre seuils :
 *
 *   27/10/2023  100  10000 10000 504,77 … NC  100 100 100 100  0,00%  10 000,00
 *
 * Les deux expressions exigeaient « ,dd » partout et refusaient donc la
 * rangée entière. Le groupe facultatif est GOURMAND, donc une rangée bien
 * formée se lit exactement comme avant : « 100,00 » prend ses décimales en
 * priorité, et rien ne change là où rien n'allait mal. C'est la raison pour
 * laquelle cet assouplissement se mesure sur les 812 séances et pas sur les
 * seules 212 : il pourrait toucher ce qui va bien.
 */
const PCT = String.raw`(\d{1,3}(?:,\d{2})?)`;
const DENSE = new RegExp(`^(\\d{2}/\\d{2}/\\d{4})${PCT}(.+?,\\d{3})(\\d{1,4},\\d{2})([\\d ]*?)([A-Z]{1,3}[a-z]?)${PCT}${PCT}${PCT}${PCT}(-?\\d+,\\d{2}%)([\\d ]+,\\d{2})$`);
// Older bulletins print the nominal without decimals ("5910" + "6000" + "28,54"): the accrued coupon is then the first ",dd" amount.
const DENSE_OLD = new RegExp(`^(\\d{2}/\\d{2}/\\d{4})${PCT}(\\d{6,16}),(\\d{2})([\\d ]*?)([A-Z]{1,3}[a-z]?)${PCT}${PCT}${PCT}${PCT}(-?\\d+,\\d{2}%)([\\d ]+,\\d{2})$`);

/** Old layout: "<price><nominal><accrued-int>" glued, then ",dd" : pick the accrued length that makes price ≈ pct × nominal. */
function splitOld(digits: string, dec: string, pct: number, nominalRef?: number): { price: number; nominal: number; accrued: number } | undefined {
  for (let n = 1; n <= 4; n++) {
    if (digits.length - n < 2) break;
    const pn = splitPriceNominal(digits.slice(0, -n), pct, nominalRef);
    const accrued = num(`${digits.slice(-n)},${dec}`);
    if (pn && accrued < pn.nominal * 0.15) return { ...pn, accrued };
  }
  return undefined;
}

function parseBonds(lines: string[], warnings: Carnet, nominauxDeReference?: Map<string, number>): BocBond[] {
  const out: BocBond[] = [];
  const start = lines.findIndex((l) => /^MARCHE DES OBLIGATIONS/.test(l));
  const end = lines.findIndex((l, i) => i > start && /^CAPITALISATION BOURSIERE/.test(l));
  if (start < 0) {
    warnings.push("Section « Marché des obligations » introuvable.");
    return out;
  }
  const seen = new Set<string>();
  /* DÉCOLLER LA TÊTE DE L'OBLIGATION SUIVANTE, et pas seulement après un
     montant à décimales.
     La règle d'origine coupait après « ,dd » suivi de majuscules, ce qui
     traite « …0,00%9 700,00ETAT DU GABON… ». Mais quand le DERNIER champ
     manque, le pourcentage touche directement le nom : « …0,00%BDEACBDEAC
     5,6% NET… », et il n'y avait plus rien à couper. Mesuré le 11 octobre
     2026 sur les 48 séances de la famille « ligne de cours non reconnue » :
     47 des 139 lignes refusées finissent sur la tête suivante ou sur le titre
     de la section d'après.
     ON NE COUPE QUE DEVANT UN NOM CONNU, jamais devant « deux majuscules » :
     un statut (« NC », « PEq ») est fait de majuscules lui aussi, et couper
     devant lui briserait la rangée en son milieu. */
  const NOM_SUIVANT = new RegExp(`(?<=[%\\d])(?=(?:${ISSUERS.join("|")}|OBLIGATIONS REGIONALES|OBLIGATIONS PRIVEES)[A-Z ])`);
  const section = lines
    .slice(start, end > start ? end : undefined)
    .flatMap((l) => l.split(/(?<=,\d{2})(?=[A-Z]{2,})/))
    .flatMap((l) => l.split(NOM_SUIVANT));
  for (let i = 0; i < section.length; i++) {
    const l = section[i].replace(/\s+/g, " ");
    // Layout A: dense head "ISSUER TITLE ISIN MNEMO" + dense data line(s)
    const h = l.match(BOND_HEAD);
    if (h && !ISIN_RE.test(l)) {
      const isin = h[2];
      if (seen.has(isin)) continue;
      // The data row may start on the head line itself and wrap over up to three lines.
      let r: RegExpMatchArray | null = null;
      let cand = (h[4] ?? "").trim();
      let old: RegExpMatchArray | null = null;
      for (let k = 0; k <= 4 && !r && !old; k++) {
        /* NE JAMAIS AVALER LA TÊTE D'UNE AUTRE OBLIGATION. La boucle
           accumulait les lignes suivantes jusqu'à ce qu'une expression tombe ;
           quand aucune ne tombait, elle collait la tête de l'obligation
           d'après, et le candidat devenait illisible de toute façon. C'est ce
           qu'on lit dans le texte brut de presque toutes les lignes refusées :
           un défaut en devenait deux, et le second masquait le premier. */
        const suite = (section[i + k] ?? "").replace(/\s{2,}/g, " ");
        if (k > 0 && /[A-Z]{2}\d{10}/.test(suite.replace(/\s/g, ""))) break;
        if (k > 0) cand += suite;
        r = cand.match(DENSE);
        if (!r) old = cand.match(DENSE_OLD);
      }
      const m0 = r ?? old;
      if (!m0) {
        warnings.sur(`Obligation ${isin} : ligne de cours non reconnue.`, cand, "cours précédent, date, pourcentage, prix et nominal, coupon couru");
        continue;
      }
      const pct = num(m0[2]);
      /* Le dernier nominal non nul de CETTE ligne, quand on le connaît : il
         sert de seconde identité quand la première renonce, et il n'a aucun
         effet tant qu'elle suffit. */
      const ref = nominauxDeReference?.get(isin);
      const pn = r ? splitPriceNominal(r[3], pct, ref) : splitOld(old![3], old![4], pct, ref);
      if (!pn) {
        warnings.sur(`Obligation ${isin} : prix / nominal ambigus (« ${m0[3]} »).`, cand, "deux nombres séparables : le prix en pourcentage, puis le nominal restant");
        continue;
      }
      const accrued = r ? num(r[4]) : ((pn as { accrued?: number }).accrued ?? 0);
      seen.add(isin);
      const { issuer, designation } = splitIssuer(h[1]);
      out.push({ isin, mnemo: h[3], issuer, designation, segment: segmentOf(issuer), previousDate: isoDate(m0[1]), previousPct: pct, previousFcfa: pn.price, nominalRemaining: pn.nominal, accruedCoupon: accrued, status: m0[6], open: num(m0[7]), close: num(m0[8]), thresholdHigh: num(m0[9]), thresholdLow: num(m0[10]), variationPct: num(m0[11]), referenceNextFcfa: num(m0[12]) });
      continue;
    }
    // Layout B: one cell per line"ISSUER", "TITLE", "ISIN", "MNEMO", date, pct, fcfa, nominal, accrued, vol×5, status, open, close, high, low, variation, ref
    const m = section[i].match(ISIN_RE);
    if (!m) continue;
    const isin = `${m[1]}${m[2]}`;
    if (seen.has(isin)) continue;
    const cells = section.slice(i + 1, i + 22);
    const dateAt = cells.findIndex((c) => DATE_RE.test(c));
    if (dateAt < 0 || dateAt > 2) continue;
    const mnemo = cells[0];
    const after = cells.slice(dateAt + 1);
    const statusAt = after.findIndex((c) => /^[A-Z]{1,3}[a-z]?$/.test(c));
    if (statusAt < 4) {
      warnings.push(`Obligation ${isin} : cellules incomplètes.`);
      continue;
    }
    seen.add(isin);
    const { issuer, designation } = splitIssuer([section[i - 2], section[i - 1]].filter((x) => x && !/^[\d\s,.%-]+$/.test(x)).join(" "));
    const tail = after.slice(statusAt + 1).map(num);
    out.push({ isin, mnemo, issuer, designation, segment: segmentOf(issuer), previousDate: isoDate(cells[dateAt]), previousPct: num(after[0]), previousFcfa: num(after[1]), nominalRemaining: num(after[2]), accruedCoupon: num(after[3]), status: after[statusAt], open: tail[0], close: tail[1], thresholdHigh: tail[2], thresholdLow: tail[3], variationPct: tail[4], referenceNextFcfa: tail[5] });
  }
  return out;
}

/* ---------------- OPCVM ---------------- */
/**
 * UN MONTANT DE LA TABLE DES OPCVM.
 *
 * LES GROUPES DE MILLIERS ONT ÉTÉ RENDUS FACULTATIFS, PUIS REMIS. Le 9 août
 * 2023 la bourse écrit « 9765,78 » là où les autres rangées écrivent
 * « 9 765,78 », et cette forme figure bien dans les débris : la rendre
 * facultative semblait devoir rendre la rangée, comme l'étape 2b l'avait fait
 * pour les obligations. Les deux lecteurs sur le même texte ont dit non :
 * ZÉRO fonds gagné sur les 46 séances concernées. La rangée échoue donc pour
 * une AUTRE raison, qui reste à trouver, et une tolérance que rien n'exerce
 * est une surface non éprouvée dans une expression déjà difficile à tenir.
 */
const MONTANT_VL = String.raw`\d{1,3}(?: \d{3})*,\d{2}`;

/**
 * LA SECONDE PASSE, ET POURQUOI ELLE EST SÛRE LÀ OÙ LA PREMIÈRE NE L'EST PAS.
 *
 * CE QUI A ÉTÉ COMPRIS LE 12 OCTOBRE 2026. En relevant un débris entier par
 * forme, un cas a tout expliqué : une rangée PARFAITEMENT CONFORME, lettre,
 * origine, valeur, date, valeur précédente, date, création, deux
 * pourcentages. Elle aurait dû passer. Elle n'est pas passée parce que
 * FUND_TAIL exige la queue en FIN de tampon, et que l'aplatissement du PDF
 * colle parfois le nom de la rangée suivante derrière cette queue : elle
 * n'est alors jamais testée à cette position. Le défaut n'était pas la forme,
 * c'était la POSITION. Deux tolérances posées la veille sur la forme n'ont
 * donc rien rendu, et l'une a corrompu douze rangées.
 *
 * LE DÉBRIS, LUI, SE TERMINE EXACTEMENT À LA FIN DE LA QUEUE PERDUE. Le
 * réessayer ne demande aucune tolérance : c'est la même preuve, appliquée à
 * un texte qu'on allait jeter.
 *
 * ET C'EST SEULEMENT ICI QUE LES TOLÉRANCES DEVIENNENT LÉGITIMES. Dans la
 * boucle, le tampon grandit et une expression plus souple trouve d'autres
 * alignements : c'est ainsi que la barre en trop avait fait prendre la valeur
 * de la ligne voisine. Sur un débris, il n'y a qu'une rangée et aucun
 * alignement concurrent possible. Ce qui était dangereux en général devient
 * sans risque une fois le périmètre réduit à une seule ligne.
 *
 * Les trois défauts relevés sur les soixante débris de la base :
 *   la barre manquante   « 1312/2024 » pour 13/12/2024        17 fois
 *   la barre en trop     « 06/12//2024 »                       3 fois
 *   la variation unique  une seule au lieu de deux             5 fois
 */
const DATE_SOUPLE = String.raw`\d{2}\/{0,2}\d{2,3}\/{1,2}\d{4}`;
const MONTANT_SOUPLE = String.raw`(?:\d{1,3}(?: \d{3})+|\d+),\d{2}`;
const POURCENT_VL = String.raw`-?[\d ]+(?:,\d{1,2})?%`;
const FUND_TAIL_SOUPLE = new RegExp(
  String.raw`\b([MODA0])\s+([\d ]+?)\s+(-|${MONTANT_SOUPLE})\s+(${DATE_SOUPLE})\s+(${MONTANT_SOUPLE})\s+(${DATE_SOUPLE})\s+(${DATE_SOUPLE})\s+(${POURCENT_VL})(?:\s+(-|${POURCENT_VL}))?\s*$`,
);
/**
 * UNE DATE DE LA TABLE. LA BARRE EN TROP A ÉTÉ TOLÉRÉE UNE HEURE, PUIS RETIRÉE.
 *
 * « 20/07//2023 » paraît sur les débris, et l'accepter semblait gratuit. La
 * comparaison des deux lecteurs sur le même texte a dit le contraire : zéro
 * fonds gagné, et DOUZE rangées changées de valeur. Avec la barre en trop, la
 * tête de l'expression trouve un autre alignement et prend la VL de la ligne
 * voisine ; isoDate ne reconnaît plus la date et la laisse brute. Une
 * tolérance qui ne gagne rien et qui déplace une valeur n'est pas une
 * tolérance, c'est une corruption silencieuse.
 */
/**
 * LA QUATRIÈME TOLÉRANCE : UNE DATE RESTÉE EN NUMÉRO DE SÉRIE EXCEL.
 *
 * TROUVÉE PAR GEORGES LE 12 OCTOBRE 2026, et elle m'avait échappé trois fois.
 * La rangée de FCP ECOBANK OBLIGATAIRE CEMAC imprime, là où les quarante
 * autres fonds impriment une date :
 *
 *   M 10 000  14 434,00  46 120,00  14 454,00  15/04/2026  21/07/2020  44,54%  0,14%
 *
 * 46120 n'est pas un montant, c'est le 8 avril 2026 : le PDF sort d'un
 * tableur et cette cellule-là n'a jamais reçu son format de date. Elle
 * traverse la chaîne en nombre nu.
 *
 * TROIS FOIS LA MAUVAISE DIMENSION. J'avais élargi les séparateurs de
 * milliers, puis les barres de date : des tolérances sur la FORME. La veille,
 * la seconde passe avait appris que le défaut était la POSITION. Ici il n'est
 * ni l'une ni l'autre, c'est le TYPE de la cellule, et aucune souplesse sur
 * l'écriture d'une date ne pouvait attraper un nombre.
 *
 * MESURÉ SUR LES 805 SÉANCES DE LA BASE : 65 des 68 débris restants, un seul
 * fonds, une seule colonne, celle de la date précédente. Zéro série dans la
 * colonne de la VL courante, zéro dans celle de la création : ce n'est donc
 * pas l'export qui est cassé, c'est une cellule mal typée à la source.
 *
 * CE QUI REND LA RÉPARATION SÛRE, c'est le troisième garde et lui seul. Une
 * VL de 46 120 francs est parfaitement plausible : la fenêtre des dates ne
 * suffit pas à distinguer une date d'un montant. Mais la rangée imprime sa
 * propre variation, et cette variation ne s'accorde avec les deux VL que si
 * la lecture est la bonne. C'est le bulletin qui valide sa réparation, et non
 * moi. Sans ce contrôle, je n'aurais pas posé la tolérance.
 */
const SERIE_MIN = 42005; // 1ᵉʳ janvier 2015
const SERIE_MAX = 47484; // 1ᵉʳ janvier 2030
const SERIE_EXCEL = String.raw`\d{2}(?: )?\d{3}(?:,\d{1,2})?`;

/** Le jour qu'un numéro de série désigne, au format du bulletin. */
const jourDeSerie = (n: number): string => {
  const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};

/**
 * La cellule est-elle une date en série, et laquelle ? Les trois gardes sont
 * cumulatifs, et le dernier est celui qui compte.
 */
export function dateDeSerieExcel(cellule: string, dateCourante: string, vlPrecedente: number, vl: number, variation: string | undefined): string | undefined {
  const n = Number(cellule.replace(/ /g, "").replace(",", "."));
  // 1 · dans la fenêtre des dates plausibles, et entier (une date n'a pas de centimes)
  if (!Number.isFinite(n) || Math.abs(n - Math.round(n)) > 1e-9) return undefined;
  const serie = Math.round(n);
  if (serie < SERIE_MIN || serie > SERIE_MAX) return undefined;
  const jour = jourDeSerie(serie);
  // 2 · elle précède la date courante de la rangée, et de moins de 400 jours
  const a = Date.parse(isoDate(jour));
  const b = Date.parse(isoDate(dateCourante));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  const ecart = (b - a) / 86400000;
  if (ecart <= 0 || ecart > 400) return undefined;
  // 3 · LA VARIATION IMPRIMÉE S'ACCORDE AVEC LES DEUX VALEURS LIQUIDATIVES
  if (!variation || variation === "-") return undefined;
  if (!Number.isFinite(vlPrecedente) || !Number.isFinite(vl) || vlPrecedente === 0) return undefined;
  const attendue = num(variation.replace("%", ""));
  if (!Number.isFinite(attendue)) return undefined;
  const calculee = ((vl - vlPrecedente) / vlPrecedente) * 100;
  // Le pourcentage est imprimé à deux décimales : l'écart d'arrondi vaut 0,005.
  if (Math.abs(calculee - attendue) > 0.0055) return undefined;
  return jour;
}

const FUND_TAIL_SERIE = new RegExp(
  String.raw`\b([MODA0])\s+([\d ]+?)\s+(-|${MONTANT_SOUPLE})\s+(${SERIE_EXCEL})\s+(${MONTANT_SOUPLE})\s+(${DATE_SOUPLE})\s+(${DATE_SOUPLE})\s+(${POURCENT_VL})(?:\s+(-|${POURCENT_VL}))?\s*$`,
);

const DATE_VL = String.raw`\d{2}\/\d{2,3}\/\d{4}`;
const FUND_TAIL = new RegExp(String.raw`\b([MODA0])\s+([\d ]+?)\s+(-|${MONTANT_VL})\s+(${DATE_VL})\s+(${MONTANT_VL})\s+(${DATE_VL})\s+(${DATE_VL})\s+(-?[\d ]+(?:,\d{1,2})?%)\s+(-|-?[\d ]+(?:,\d{1,2})?%)\s*$`);
const MANAGER_RE = /^(.*?(ASSET MANAGEMENT(?: S\.A\.?| CEMAC| CENTRAL AFRICA)?|CAPITAL CENTRAL AFRICA))\s+(.*)$/;
const FUND_SKIP = /^(BULLETIN OFFICIEL|Société de gestion|Valeur liquidative|Origine|Précédente|Variation|Valeur Date|CAPITAL VARIABLE|\d{1,2}$)/;
const SECTION: Record<string, BocFund["frequency"]> = { quotidiennes: "quotidienne", hebdomadaires: "hebdomadaire", mensuelles: "mensuelle", trimestrielles: "trimestrielle" };

function parseFunds(lines: string[], warnings: Carnet): BocFund[] {
  const out: BocFund[] = [];
  const start = lines.findIndex((l) => /^OPCVM\s*:/.test(l));
  if (start < 0) {
    warnings.push("Section OPCVM introuvable.");
    return out;
  }
  // The table is split in four sections by the period of the variation shown
  // (daily, weekly, monthly, quarterly). A fund appears first in the section of
  // its valuation frequency and may be repeated in the longer periods.
  let frequency: BocFund["frequency"] = "?";
  let buffer = "";
  const byName = new Map<string, BocFund>();

  /**
   * D UNE QUEUE RECONNUE ET DU TEXTE QUI LA PRÉCÈDE, UNE RANGÉE.
   *
   * Extrait de la boucle pour que la seconde passe puisse le rejouer sur un
   * débris : deux copies auraient divergé au premier changement, et c est
   * toujours celle qu on relit le moins qui se serait périmée.
   */
  const poser = (prefixe: string, q: RegExpMatchArray): void => {
      const names = [...prefixe.matchAll(/\b(FCPE|FCP|SICAV)/g)];
      const nameAt = names.length ? (names[names.length - 1].index ?? -1) : prefixe.search(/\b(FCPE|FCP|SICAV)/);
      const name = nameAt >= 0 ? prefixe.slice(nameAt).replace(/^FCP(?=[A-DF-Z]|E[A-Z])/, "FCP ").replace(/\s+/g, " ").trim() : prefixe;
      const prior = byName.get(name);
      if (prior) {
        /* LA SECONDE VARIATION PEUT MANQUER : cinq rangées sur soixante n en
           portent qu une. Absente, elle n est pas nulle, elle n est pas. */
        const v = q[9] == null || q[9] === "-" ? undefined : num(q[9]);
        if (frequency === "mensuelle") prior.variationMonthlyPct = v;
        if (frequency === "trimestrielle") prior.variationQuarterlyPct = v;
        return;
      }
      const before = nameAt >= 0 ? prefixe.slice(0, nameAt).trim() : "";
      const mm = before.match(MANAGER_RE);
      const manager = mm ? mm[1].trim() : before;
      const depositary = mm ? mm[3].trim() : "";
      const cat = q[1] === "0" ? "O" : (q[1] as BocFund["category"]);
      const fund: BocFund = {
        manager,
        depositary,
        name,
        category: (["M", "O", "D", "A"] as const).includes(cat as "M") ? (cat as BocFund["category"]) : "?",
        frequency,
        navOrigin: num(q[2]),
        previousNav: q[3] === "-" ? NaN : num(q[3]),
        previousDate: isoDate(q[4]),
        nav: num(q[5]),
        navDate: isoDate(q[6]),
        inceptionDate: isoDate(q[7]),
        perfSinceInceptionPct: num(q[8]),
        variationPct: q[9] == null || q[9] === "-" ? NaN : num(q[9]),
      };
      byName.set(name, fund);
      out.push(fund);
  };

  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (!l) continue;
    if (/^OPCVM\s*:\s*Organisme/i.test(l)) break; // footnote closes the table
    const sec = SECTION[l.trim().toLowerCase()];
    if (sec) {
      frequency = sec;
      buffer = "";
      continue;
    }
    if (FUND_SKIP.test(l) || /^OPCVM\s*:/.test(l)) continue;
    buffer = buffer ? `${buffer} ${l}` : l;
    const m = buffer.match(FUND_TAIL);
    if (!m) {
      if (buffer.length > 260) buffer = "";
      continue;
    }
    let prefix = buffer.slice(0, m.index).trim();
    buffer = "";
    // A previous row that did not match (odd cell, missing value) leaves its figures in the
    // prefix: keep only what follows the last date or percentage, and anchor the name on the last FCP.
    const junk = [...prefix.matchAll(/(\d{1,2}\/\d{2,3}\/\d{4}|-?[\d ]+,\d{1,2}%)/g)].pop();
    if (junk && junk.index != null) {
      /* MONTRER CE QU'ON JETTE, ET NON SEULEMENT CE QUI SUIT.
         Le message nommait le fonds qui vient APRÈS les débris, c'est-à-dire
         celui qui a été lu : il fallait ouvrir le PDF et compter les rangées
         pour deviner lequel manquait. Or les débris portent le nom ET les
         chiffres de la rangée perdue, et le lecteur les a en main au moment
         précis où il les coupe. Les montrer change la question posée au desk :
         « laquelle manque ? » devient « est-ce bien celle-là ? ». */
      const jete = prefix.slice(0, junk.index + junk[0].length).trim();
      /* ON NE SE PLAINT QUE SI UNE RANGÉE EST VRAIMENT PERDUE.
         Mesuré le 12 octobre 2026 sur les 60 débris de la base : 17 ne sont
         qu'un pourcentage seul, « 0,31% ». Aucun nom, aucune date : c'est la
         dernière colonne de la rangée précédente restée derrière sa propre
         queue, et rien n'a été perdu. Un tiers de cette famille annonçait donc
         une perte qui n'avait pas eu lieu, ce qui est la pire espèce de
         remarque : elle use le desk pour rien. Un fonds porte toujours un nom,
         donc des lettres. */
      /* LA SECONDE PASSE. On réessaie la queue SUR LE DÉBRIS, qui se termine
         exactement là où celle de la rangée perdue se terminait : ce que la
         boucle n'a jamais pu tester, faute d'avoir cette fin-là au bout du
         tampon. Voir FUND_TAIL_SOUPLE pour les trois défauts d'impression
         tolérés, et pour la raison qui les rend sans risque ici et dangereux
         ailleurs. */
      const repris = jete.match(FUND_TAIL_SOUPLE);
      /* LA DATE RESTÉE EN NUMÉRO DE SÉRIE EXCEL : voir FUND_TAIL_SERIE. On
         n'essaie qu'après l'échec de la queue souple, et la réparation ne
         s'applique que si la variation imprimée sur la rangée s'accorde avec
         ses deux valeurs liquidatives. */
      const serie = repris ? null : jete.match(FUND_TAIL_SERIE);
      if (repris && repris.index != null) {
        poser(jete.slice(0, repris.index).trim(), repris);
      } else if (serie && serie.index != null && dateDeSerieExcel(serie[4], serie[6], num(serie[3]), num(serie[5]), serie[9]) != null) {
        const jour = dateDeSerieExcel(serie[4], serie[6], num(serie[3]), num(serie[5]), serie[9]) as string;
        const nomme = jete.slice(0, serie.index).trim();
        const corrige = [...serie] as unknown as RegExpMatchArray;
        corrige[4] = jour;
        poser(nomme, corrige);
        /* ON NE RÉPARE PAS EN SILENCE. Le desk doit voir ce qui a été déduit,
           et de quoi : une date qu'aucun œil ne lit dans le PDF vaut mieux
           annoncée que devinée. */
        warnings.push(`OPCVM ${nomme.slice(-44).trim()} : date au format Excel convertie, « ${serie[4].trim()} » lu ${jour} (variation imprimée ${serie[9]} vérifiée).`);
      } else if (/[A-Za-zÀ-ÿ]{3,}/.test(jete)) {
        warnings.push(`OPCVM : ligne ignorée (format inattendu), jeté « ${jete.slice(0, 200)} » avant « ${prefix.slice(junk.index + junk[0].length).trim().slice(0, 40)} »`);
      }
      prefix = prefix.slice(junk.index + junk[0].length).trim();
    }
    poser(prefix, m);
  }
  if (out.length === 0) warnings.push("Aucun OPCVM lu.");
  return out;
}

/**
 * UNE LIGNE DE LA TABLE « ENCOURS DES TITRES DE DETTE ».
 *
 * Publiée à chaque séance, elle donne le STOCK de la dette cotée, ligne par
 * ligne, là où les adjudications ne donnent que des flux. Un stock publié est
 * complet par construction : il n'a pas besoin qu'on ait vu passer chaque
 * émission, ce qui en fait la seule route honnête vers le mur des échéances
 * tant que notre collecte d'adjudications reste partielle.
 *
 * ELLE PORTE AUSSI LE NOMINAL RÉSIDUEL, imprimé. Le lecteur d'obligations le
 * déduit aujourd'hui par une seconde identité, faute de l'avoir ; il est ici,
 * à chaque séance, pour chaque ligne.
 *
 * ET L'ÉCHÉANCIER DE SERVICE VIENT AVEC : type d'amortissement, périodicité,
 * dernier coupon payé, prochain coupon théorique.
 */
export interface BocEncours {
  isin: string;
  mnemo: string;
  /** « ETAT DU CAMEROUN », « BDEAC ». */
  issuer: string;
  /** « ECMR 6.25% NET 2022-2029 ». */
  designation: string;
  couponRate: number;
  /** Première cotation, en ISO. */
  firstListedOn: string;
  /** Le montant levé à l'émission. */
  amountRaised: number;
  /** Le nombre de titres cotés. */
  units: number;
  /** Le nominal RESTANT d'un titre, après amortissements. */
  nominalRemaining: number;
  pricePct: number;
  /** La maturité d'origine, en années. */
  maturityYears: number;
  /** « CONSTANT », « IN FINE ». */
  amortisation: string;
  /** « AN », « SEM », « TRIM ». */
  periodicity: string;
  /** La dernière échéance de coupon, en ISO. */
  previousCouponOn: string;
  /** La prochaine échéance théorique, en ISO. */
  nextCouponOn: string;
  /** L'encours, et il vaut units × nominalRemaining : c'est le contrôle. */
  outstanding: number;
  netYieldPct?: number;
  turnoverPct?: number;
}
