import type { AuctionResult } from "./auction-results";

/**
 * Les modalités d'un emprunt, et ce qu'elles répondent.
 *
 * Nous lisions les communiqués de résultats et rien d'autre. Ils disent qui a
 * acheté quoi et à quel prix. Ils ne disent jamais comment le titre se
 * rembourse, et c'est pourtant la première chose qu'il faut savoir pour
 * actualiser un prix : un capital rendu en une fois à l'échéance et un capital
 * amorti par tranches après un différé ne donnent pas le même rendement, à prix
 * égal, de plusieurs centaines de points de base.
 *
 * Le Trésor l'écrit, mais sur un second document : le « communiqué d'annonce »,
 * publié une semaine avant la séance, que la BEAC range dans le même index.
 * « Remboursement : In fine ». « Les intérêts sont payés annuellement ».
 * « Valeur nominale unitaire : 10 000 ». Tout ce que nous supposions y est
 * imprimé.
 *
 * Une ligne par document et non par emprunt, comme pour les résultats : on
 * recopie une pièce, et le regroupement se fait ici. Un abondement republie un
 * avis pour un code déjà connu, et les deux doivent dire la même chose. Quand
 * ils divergent, c'est une contradiction à montrer et non une valeur à écraser,
 * parce qu'aucun des deux avis n'est plus vrai que l'autre : l'un des deux est
 * mal lu, ou le Trésor s'est contredit, et seule la pièce tranche.
 */

export interface EmissionNotice {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  fileKey?: string;

  country: AuctionResult["country"];
  instrument: AuctionResult["instrument"];
  tenor?: string;
  /** La séance annoncée, datée par l'index de la BEAC et non par la lecture du scan. */
  sessionOn: string;
  abondement: boolean;

  codeEmission?: string;
  maturityOn?: string;
  /** Le taux facial. Le Trésor l'imprime sous « Rendement », ce qu'il n'est pas. */
  couponRate?: number;
  /** La mention recopiée telle quelle : « In fine », ou l'amortissement en toutes lettres. */
  redemption?: string;
  nominalUnit?: number;
  issueVolume?: number;
  settleOn?: string;

  readAt?: string;
  readModel?: string;
  remarks: string[];

  confirmedBy?: string;
  confirmedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export type NewEmissionNotice = Omit<EmissionNotice, "id" | "createdAt" | "updatedAt" | "remarks"> & { remarks?: string[] };

/**
 * Un correctif d'avis, où un null explicite efface.
 *
 * « undefined » saute la colonne, ce qui protège un complément. Mais une
 * relecture lit la pièce entière et fait autorité sur elle : quand une garde
 * refuse un volume hors d'échelle, le champ doit être effacé et non laissé tel
 * quel, sans quoi la garde parle dans le vide et la valeur qu'on vient de juger
 * fausse survit à son propre rejet.
 */
export type EmissionNoticePatch = { [K in keyof NewEmissionNotice]?: NewEmissionNotice[K] | null };

/**
 * Le capital rendu en une fois, ou non.
 *
 * La colonne garde la phrase du Trésor plutôt qu'un booléen, et c'est ici qu'on
 * la lit. Le test est volontairement étroit : « in fine » se reconnaît, tout le
 * reste est « autre chose », et « autre chose » ne se devine pas. Un avis qui
 * décrirait un amortissement par tranches après différé tomberait dans ce
 * second cas, et le desk verrait la phrase entière plutôt qu'un faux négatif.
 */
export const rembourseInFine = (redemption: string | undefined): boolean | undefined =>
  redemption == null || redemption.trim() === ""
    ? undefined
    : /\bin\s*fine\b/i.test(
        redemption
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, ""),
      );

/** Les modalités d'une ligne, telles que ses avis les donnent, et ce sur quoi ils se contredisent. */
export interface EmissionLine {
  codeEmission: string;
  country: AuctionResult["country"];
  instrument: AuctionResult["instrument"];
  maturityOn?: string;
  couponRate?: number;
  redemption?: string;
  nominalUnit?: number;
  /** Les avis qui portent cette ligne, du plus récent au plus ancien. */
  notices: EmissionNotice[];
  /**
   * Ce sur quoi deux avis de la même ligne ne disent pas la même chose.
   *
   * Vide dans l'immense majorité des cas, et c'est bien pour cela qu'un désaccord
   * mérite d'être nommé : il signale une lecture à reprendre, jamais une valeur
   * à moyenner.
   */
  desaccords: { champ: string; valeurs: string[] }[];
}

const distinct = (xs: (string | undefined)[]): string[] => [...new Set(xs.filter((x): x is string => x != null && x !== ""))];

/**
 * Replier les avis en lignes d'emprunt.
 *
 * Seuls les avis relus entrent : ces modalités nourrissent un rendement, donc
 * une référence donnée à un client, et la règle de la maison ne change pas
 * parce que le document change. Un avis lu par la machine et non confirmé est
 * une proposition, pas une modalité.
 */
export function emissionLines(notices: EmissionNotice[], opts: { confirmedOnly?: boolean } = {}): EmissionLine[] {
  const retenus = notices.filter((n) => n.codeEmission && (opts.confirmedOnly === false || n.confirmedBy));
  const parCode = new Map<string, EmissionNotice[]>();
  for (const n of retenus) parCode.set(n.codeEmission!, [...(parCode.get(n.codeEmission!) ?? []), n]);

  return [...parCode.entries()]
    .map(([codeEmission, lot]) => {
      const tri = [...lot].sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));
      const desaccords: EmissionLine["desaccords"] = [];
      const seul = <T extends string | number>(champ: string, xs: (T | undefined)[]): T | undefined => {
        const vus = distinct(xs.map((x) => (x == null ? undefined : String(x))));
        if (vus.length > 1) desaccords.push({ champ, valeurs: vus });
        return xs.find((x) => x != null);
      };
      return {
        codeEmission,
        country: tri[0].country,
        instrument: tri[0].instrument,
        maturityOn: seul("échéance", tri.map((n) => n.maturityOn)),
        couponRate: seul("coupon", tri.map((n) => n.couponRate)),
        redemption: seul("remboursement", tri.map((n) => n.redemption)),
        nominalUnit: seul("valeur nominale", tri.map((n) => n.nominalUnit)),
        notices: tri,
        desaccords,
      };
    })
    .sort((a, b) => a.codeEmission.localeCompare(b.codeEmission));
}

/**
 * Ce qu'un avis apporte à une séance qui n'en a pas.
 *
 * Beaucoup de communiqués de résultats n'impriment pas le coupon : le prix
 * adjugé y est, mais 90,00 % ne dit rien tant qu'on ignore ce que la ligne
 * paie. Ces séances restaient sans point de courbe, comptées comme des trous.
 * L'avis de la même ligne porte le chiffre, et le rattachement se fait par le
 * code d'émission, qui est le seul identifiant que les deux documents
 * partagent.
 *
 * Ce qui vient de l'avis ne remplace jamais ce qui est sur la séance. Les deux
 * pièces sont du même Trésor, mais c'est le communiqué de résultats qui fait
 * foi sur sa propre séance, et un désaccord entre les deux est une chose à
 * montrer, pas à arbitrer en silence.
 */
export function completerDepuisAvis(
  r: Pick<AuctionResult, "codeEmission" | "couponRate" | "maturityOn">,
  lignes: EmissionLine[],
): { couponRate?: number; maturityOn?: string; depuis: EmissionLine } | undefined {
  const code = r.codeEmission?.trim();
  if (!code) return undefined;
  const ligne = lignes.find((l) => l.codeEmission === code);
  if (!ligne) return undefined;
  const couponRate = r.couponRate ?? ligne.couponRate;
  const maturityOn = r.maturityOn ?? ligne.maturityOn;
  if (couponRate === r.couponRate && maturityOn === r.maturityOn) return undefined;
  return { couponRate, maturityOn, depuis: ligne };
}
