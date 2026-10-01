import type { Country, OfferKind } from "@/lib/domain/types";

/**
 * Les résultats des adjudications de la zone, et ce qu'on en déduit.
 *
 * Le taux d'un bon du Trésor ne se décrète pas : il sort de la séance, où les
 * spécialistes en valeurs du Trésor soumissionnent et où le Trésor arrête un taux
 * limite. Tant que la séance n'a pas eu lieu, tout chiffre affiché est une
 * indication, et une indication ne vaut que par ce qu'elle regarde. Ce qu'elle
 * doit regarder, c'est la dernière séance comparable.
 *
 * D'où cette table. La BEAC publie les résultats des six Trésors ; nous n'avons
 * publié comme offres qu'une poignée des lignes concernées. La mémoire du marché
 * primaire est donc plus large que notre catalogue, et c'est exactement pour cela
 * qu'elle sert : un BTA 52 semaines du Congo se compare d'abord aux BTA
 * 52 semaines du Congo, y compris ceux que nous n'avons pas distribués.
 *
 * Deux garde-fous tiennent tout le reste.
 *
 * Une séance n'est pas un prix de marché parce qu'elle porte un taux. Le
 * 15 septembre 2026, un BTA 52 semaines congolais est sorti à 6,97 % avec un seul
 * soumissionnaire et 2,50 % de couverture : une banque a posé un chiffre, le
 * Trésor a pris ce qu'il y avait. S'ancrer là-dessus revient à prendre l'avis
 * d'une contrepartie pour celui du marché. « thin » le dit, et l'écran le montre.
 *
 * Et les pays ne se valent pas. Un même instrument, une même durée, deux
 * signatures souveraines : les taux diffèrent, et moyenner les six effacerait
 * précisément l'écart qu'on cherche à lire. La référence se prend donc dans le
 * pays, et sortir du pays est un repli, signalé comme tel.
 */

/** Une séance, telle que le communiqué de résultats la publie. */
export interface AuctionResult {
  id: string;
  /**
   * Le code d'émission du Trésor : c'est lui qui relie la séance à une de nos lignes.
   *
   * Vide tant que personne n'a lu le communiqué. L'index de la BEAC donne le
   * pays, l'instrument, la durée et la date ; le code, lui, est imprimé à
   * l'intérieur d'un scan. Il est donc facultatif à la proposition et exigé à
   * la confirmation, faute de quoi la séance ne se rattache à rien.
   */
  codeEmission?: string;
  country: Country;
  instrument: Extract<OfferKind, "BTA" | "OTA">;
  /** « 26 semaines », « 3 ans » : tel que le Trésor l'écrit, normalisé. */
  tenor: string;
  sessionOn: string; // YYYY-MM-DD
  abondement: boolean;
  /** En francs. Le communiqué les imprime en millions. */
  announced?: number;
  bid?: number;
  served?: number;
  networkSize?: number;
  bidders?: number;
  /** Les bons : des taux précomptés, en %. */
  rateMin?: number;
  rateMax?: number;
  rateLimit?: number;
  rateAvg?: number;
  /** Les obligations : des prix, en % du nominal. */
  priceMin?: number;
  priceMax?: number;
  priceLimit?: number;
  priceAvg?: number;
  /**
   * Le prix moyen quand le Trésor l'écrit en francs par titre, et non en
   * pourcentage : le camerounais imprime « 9 899,45 ». La conversion se fait
   * dans le code, sur une valeur nominale de 10 000 F, déclarée comme
   * hypothèse partout où elle sert.
   */
  priceAvgFcfa?: number;
  /**
   * Le rendement, quand le Trésor l'imprime lui-même. C'est la meilleure des
   * sources : elle ne suppose rien. Tout le reste se calcule, et se dit
   * calculé (src/lib/market/yield.ts).
   */
  yieldAvg?: number;
  yieldLimit?: number;
  /** Le taux d'intérêt facial : sans lui, un prix d'obligation ne donne aucun rendement. */
  couponRate?: number;
  /** L'échéance imprimée : la durée annoncée compare, l'échéance calcule. */
  maturityOn?: string;
  /**
   * Le dernier passage du lecteur automatique, qu'il en ait tiré quelque chose
   * ou non.
   *
   * Vide veut dire « jamais lue », et c'est ce que la file regarde. Le déduire
   * de « updated_at » était faux : le robot d'ingestion réécrit chaque ligne à
   * chacun de ses passages, et cent vingt communiqués parfaitement lisibles
   * sont ainsi passés pour déjà tentés sans avoir jamais été ouverts.
   */
  /**
   * Les motifs d'anomalie vérifiés sur la pièce.
   *
   * La contradiction vient de la source et notre lecture est fidèle : le Gabon
   * publie un prix moyen au-dessus de son propre maximum, le Tchad un servi
   * supérieur aux soumissions. Sans moyen de le noter, le panneau afficherait
   * les mêmes seize lignes indéfiniment, ce qui est la façon la plus sûre de le
   * rendre invisible.
   */
  anomaliesVues?: string[];
  readAt?: string;
  /** Le modèle de ce passage : comparer deux campagnes suppose de savoir laquelle vient de qui. */
  readModel?: string;
  /** Tel que le Trésor le publie, jamais recalculé. */
  coverage?: number;
  sourceUrl: string;
  sourceTitle: string;
  /** Le communiqué gardé octet pour octet : une adresse chez la BEAC ne se lira plus dans deux ans. */
  fileKey?: string;
  /** Vide : la lecture automatique n'a pas été relue, et le chiffre ne sert de référence à rien. */
  confirmedBy?: string;
  confirmedAt?: string;
  /**
   * Pourquoi cette pièce a été mise de côté, quand elle l'a été, et par qui.
   *
   * Une séance écartée n'est ni relue ni à relire : c'est un troisième état, et
   * il porte un motif plutôt qu'une case à cocher. « Ce n'est pas un résultat »
   * est une information qui doit survivre à celui qui l'a constaté.
   *
   * La pièce reste entière : la ligne, le communiqué et son lien ne bougent
   * pas. C'est réversible, et ce doit l'être : une mise à l'écart qui ne se
   * défait pas n'a pas sa place dans une table que plusieurs mains tiennent.
   */
  setAsideReason?: string;
  setAsideBy?: string;
  setAsideAt?: string;
  offerId?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewAuctionResult = Omit<AuctionResult, "id" | "createdAt" | "updatedAt">;

/**
 * Ce qu une mise à jour peut porter.
 *
 * Un champ absent ne touche pas sa colonne, un `null` écrit l efface. Le
 * mappeur du dépôt le fait depuis toujours et le documente ; le type, lui, ne
 * le disait pas, et écarter une pièce en effaçant sa confirmation ne se
 * formulait pas.
 */
export type PatchAuctionResult = { [K in keyof NewAuctionResult]?: NewAuctionResult[K] | null };

/**
 * Les motifs d'une mise à l'écart, en liste fermée.
 *
 * Le premier a donné naissance au mécanisme : la BEAC publie ses avis
 * d'annonce et ses communiqués de résultats sous des adresses voisines, et
 * l'un des premiers s'est retrouvé dans la table des résultats. Son titre
 * disait « résultats », son URL disait « annonce », et seule la donnée
 * tranchait : un montant annoncé, et rien d'autre.
 *
 * Aucune règle automatique ne pouvait le faire, et les deux évidentes ont été
 * essayées. « L'URL dit annonce » attrape douze pièces dont onze sont de vrais
 * résultats, publiés dans des communiqués qui annoncent et résultent à la
 * fois. « Aucun chiffre de résultat » décrit exactement une séance pas encore
 * lue. C'est donc une décision de personne, et ce qu'on garde est son motif.
 */
export const MOTIFS_ECART = [
  "avis d'annonce, pas un résultat",
  "doublon d'une séance déjà saisie",
  "pièce illisible ou tronquée",
  /* Deux motifs ajoutés à l'usage. « Chiffres douteux » n'est pas « illisible » :
     la pièce se lit très bien, et c'est ce qu'elle dit qui ne tient pas, un
     taux à deux chiffres là où la séance voisine en donne six. « Autre » ferme
     la liste honnêtement : sans lui, qui ne trouve pas son cas choisit le motif
     le plus proche, et le registre se met à mentir poliment. La précision
     facultative, à côté, est ce qui le sauve. */
  "chiffres douteux",
  "hors périmètre",
  "autre",
] as const;
export type MotifEcart = (typeof MOTIFS_ECART)[number];

/**
 * Cette séance compte-t-elle parmi les résultats ?
 *
 * Un seul prédicat, parce que le filtre vivait recopié dans une dizaine
 * d'endroits : la courbe, les analyses, l'export, le tableau, le badge du rail.
 * Dix conditions finissent par diverger, et celle qui diverge est celle qu'on
 * oublie.
 */
export const compteDansLesResultats = (r: Pick<AuctionResult, "setAsideAt">): boolean => !r.setAsideAt;

/**
 * Cette séance a-t-elle un prix d'exécution ?
 *
 * Une adjudication qui n'a rien servi n'en a pas : le Trésor a refusé ce qu'on
 * lui demandait. Le taux qui subsiste sur une telle séance est le taux DEMANDÉ
 * par le marché, jamais un taux payé, et le porter sur la courbe publierait un
 * prix que personne n'a accepté.
 *
 * Ce n'est pas un drapeau que quelqu'un pose : c'est un fait que la donnée
 * énonce déjà. D'où une règle, et non une mise à l'écart. La séance reste un
 * vrai résultat, publié par son Trésor : elle compte dans la pression de la
 * demande et dans l'exécution du programme, et elle ne donne pas de point.
 *
 * Les retirer des volumes embellirait les années : mesuré sur le dépôt, la
 * couverture de 2025 passerait de 0,67 à 0,72 et celle de 2026 de 0,71 à 0,76.
 * Une adjudication déserte est un fait sur la demande, et l'écarter là serait
 * cacher ce que le marché a dit.
 */
export const aUnPrixDExecution = (r: Pick<AuctionResult, "served">): boolean => r.served !== 0;

/** Le communiqué imprime « 15 000 » pour quinze milliards. La conversion se fait une fois. */
export const millions = (m: number): number => m * 1_000_000;

/**
 * Le chiffre de la séance, avec son unité.
 *
 * Un bon se sert à un taux, une obligation à un prix, et les deux ne se rangent
 * pas dans la même colonne : convertir un prix en rendement demande le coupon et
 * l'échéancier, ce qui appartient au code financier, pas à la lecture d'un
 * communiqué. Le taux moyen pondéré passe devant le taux limite parce qu'il dit
 * ce que la séance a coûté en moyenne, là où le limite ne dit que le pire servi.
 */
export function headline(r: AuctionResult): { value: number; unit: "taux" | "prix" } | undefined {
  if (r.instrument === "BTA") {
    const v = r.rateAvg ?? r.rateLimit;
    return v == null ? undefined : { value: v, unit: "taux" };
  }
  const v = r.priceAvg ?? r.priceLimit;
  return v == null ? undefined : { value: v, unit: "prix" };
}

/**
 * La fourchette publiée, quand c'est tout ce que le Trésor publie.
 *
 * Ce n'est pas un repli sur « headline » : c'est autre chose. Un chiffre servi
 * se pose sur une courbe, un intervalle ne s'y pose pas, et les confondre
 * reviendrait à inventer le milieu que le Trésor a choisi de taire. La table
 * l'affiche, la courbe l'écarte, et les deux ont raison.
 *
 * Les bornes sortent déjà remises dans l'ordre par la lecture : le Congo et le
 * Tchad inversent tous deux leurs propres libellés.
 */
export function fourchette(r: Pick<AuctionResult, "instrument" | "rateMin" | "rateMax" | "priceMin" | "priceMax">): { lo: number; hi: number; unit: "taux" | "prix" } | undefined {
  const [a, b, unit] = r.instrument === "BTA" ? [r.rateMin, r.rateMax, "taux" as const] : [r.priceMin, r.priceMax, "prix" as const];
  if (a == null && b == null) return undefined;
  const lo = Math.min(a ?? b!, b ?? a!);
  const hi = Math.max(a ?? b!, b ?? a!);
  return { lo, hi, unit };
}

/** Le taux de couverture : celui du Trésor, sinon celui que les montants donnent. */
export function coverageOf(r: AuctionResult): number | undefined {
  if (r.coverage != null) return r.coverage;
  if (r.bid != null && r.announced) return (r.bid / r.announced) * 100;
  return undefined;
}

/**
 * Une séance trop mince pour servir d'ancre.
 *
 * Un seul soumissionnaire, ou des soumissions qui ne couvrent pas ce qui était
 * annoncé : dans les deux cas le taux sorti est celui d'une contrepartie, pas
 * celui du marché. Le chiffre reste vrai, il cesse simplement d'être
 * représentatif, et c'est une distinction que l'écran doit porter.
 */
export function thin(r: AuctionResult): boolean {
  if (r.bidders != null && r.bidders <= 1) return true;
  const c = coverageOf(r);
  return c != null && c < 100;
}

/**
 * Où en est une séance, en trois états et non en deux.
 *
 * Lire et relire sont deux gestes, et l'écran les confondait sous un seul mot.
 * Le desk pressait « Lire le communiqué », voyait la pastille afficher toujours
 * « à relire », et recommençait : la machine avait bien lu, mais la pastille ne
 * parle que de la relecture, qui n'a pas eu lieu. En anglais c'était pire, « to
 * read » répondant à un bouton « read ».
 *
 * Trois états, donc, qui suivent exactement la donnée : rien dans les champs,
 * des chiffres que personne n'a vérifiés, une séance arrêtée par une personne.
 */
/* « écartée » s'ajoute aux trois autres et les précède toutes : une pièce
   rangée n'est plus ni à lire, ni à relire, ni relue. */
export type EtatSeance = "a_lire" | "a_relire" | "relue" | "ecartee";

/**
 * Tout ce qu'une lecture peut rapporter, et pas seulement ce que la courbe sait
 * employer.
 *
 * Le Trésor tchadien ne publie ni prix limite ni prix moyen pondéré : son
 * communiqué donne les montants, la couverture, et une fourchette de prix. Une
 * séance tchadienne entièrement lue n'avait donc aucun des quatre champs que
 * l'écran regardait, et restait « à lire » pour toujours. C'est l'origine de la
 * ligne TD2A00001246, lue quatre fois de suite par un desk qui voyait toujours
 * le même mot.
 */
const champsLus = (r: Pick<AuctionResult, "rateAvg" | "rateLimit" | "priceAvg" | "priceLimit" | "rateMin" | "rateMax" | "priceMin" | "priceMax" | "yieldAvg" | "announced" | "bidders">) =>
  r.rateAvg ?? r.rateLimit ?? r.priceAvg ?? r.priceLimit ?? r.rateMin ?? r.rateMax ?? r.priceMin ?? r.priceMax ?? r.yieldAvg ?? r.announced ?? r.bidders;

export const etatSeance = (
  r: Pick<AuctionResult, "confirmedBy" | "setAsideAt" | "readAt" | "rateAvg" | "rateLimit" | "priceAvg" | "priceLimit" | "rateMin" | "rateMax" | "priceMin" | "priceMax" | "yieldAvg" | "announced" | "bidders">,
): EtatSeance => {
  /* L'écart passe avant tout : une pièce qui n'est pas un résultat n'a pas
     d'état de lecture, elle est rangée. */
  if (r.setAsideAt) return "ecartee";
  if (r.confirmedBy) return "relue";
  // Une pièce ouverte dont on n'a rien tiré n'est pas « à lire » : elle a été
  // lue, et ce qu'il faut en dire est qu'elle attend une personne.
  return champsLus(r) == null && !r.readAt ? "a_lire" : "a_relire";
};

/**
 * Un champ est entré après que quelqu'un a signé.
 *
 * La colonne « rendement » et le coupon sont nés après que cinquante-sept
 * séances eurent été relues. Les remplir par la machine rendait la courbe
 * possible ; les remplir en silence aurait fait passer sous l'attestation d'une
 * personne un chiffre qu'elle n'a pas vu. La base porte déjà la réponse, et
 * elle ne coûte pas une colonne : une mise à jour postérieure à la
 * confirmation se lit dans les deux horodatages.
 *
 * Le point reste utilisable. Ce qui change est qu'il se présente comme à
 * vérifier, et qu'il se compte.
 */
export const completedAfterConfirmation = (r: Pick<AuctionResult, "confirmedAt" | "updatedAt">): boolean =>
  Boolean(r.confirmedAt) && Date.parse(r.updatedAt) > Date.parse(r.confirmedAt!) + 60_000;

const days = (a: string, b: string): number => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

export interface RateReference {
  /** Le taux (BTA) ou le prix (OTA) proposé au desk. */
  proposed: number;
  unit: "taux" | "prix";
  /** La séance retenue. */
  from: AuctionResult;
  /** Les autres séances comparables, la plus récente d'abord : de quoi lire la tendance. */
  also: AuctionResult[];
  /** Faux : aucune séance du pays, la référence vient du reste de la zone. */
  sameCountry: boolean;
  /** Vrai : la séance retenue est mince, faute de mieux dans la fenêtre. */
  thin: boolean;
}

/**
 * Ce que la dernière séance comparable suggère.
 *
 * L'ordre est celui d'un opérateur : le pays d'abord, la séance la plus récente
 * ensuite, et une séance représentative avant une séance mince. Rien n'est
 * moyenné entre deux pays, ni entre deux durées : ce sont des produits
 * différents, et la moyenne effacerait l'écart qui fait tout l'intérêt du calcul.
 *
 * Seules les séances relues comptent (« confirmedBy »). Une lecture automatique
 * non confirmée peut porter un 7,00 % lu sur un scan de travers, et une faute de
 * lecture devenue référence se propagerait sans bruit à toutes les offres
 * suivantes.
 */
/**
 * Ce qu'une séance doit porter pour cesser d'être une proposition.
 *
 * Deux choses, et deux seulement : sa durée et son chiffre. C'est de quoi la
 * placer sur une courbe et de quoi en faire une référence, ce à quoi la table
 * sert. La durée est exigée parce que la moitié des titres de la BEAC ne la
 * porte pas, cent trente-deux sur deux cent cinquante-trois : elle est dans le
 * communiqué, et sans elle la séance ne se compare à rien.
 *
 * Le code d'émission ne l'est plus. Il sert à rattacher la séance à une de nos
 * lignes, ce qui n'a de sens que pour les lignes que nous distribuons : une
 * poignée. L'exiger partout obligeait à le relever sur chaque séance gabonaise
 * ou tchadienne que nous ne distribuerons jamais, et doublait le coût d'une
 * reprise d'historique pour un rattachement dont personne ne se servirait.
 */
export const confirmable = (r: Pick<AuctionResult, "tenor" | "instrument" | "rateAvg" | "rateLimit" | "priceAvg" | "priceLimit" | "rateMin" | "rateMax" | "priceMin" | "priceMax">): string | null => {
  const tenor = r.tenor?.trim();
  if (!tenor || tenor === "—") return "La durée de la séance, lue sur le communiqué : sans elle, elle ne se compare à rien.";
  if (r.instrument === "BTA" && r.rateAvg == null && r.rateLimit == null && r.rateMin == null && r.rateMax == null) return "Le taux limite, le taux moyen pondéré, ou la fourchette publiée.";
  // Le Trésor tchadien n'imprime qu'une fourchette : exiger de lui un prix
  // moyen pondéré revient à lui demander un chiffre qu'il ne publie pas, et à
  // condamner ses séances à ne jamais être arrêtées. La fourchette est ce
  // qu'il a publié, et elle suffit à confirmer ; elle ne suffira pas à poser un
  // point sur la courbe, et c'est la courbe qui le dira.
  if (r.instrument === "OTA" && r.priceAvg == null && r.priceLimit == null && r.priceMin == null && r.priceMax == null) return "Le prix limite, le prix moyen pondéré, ou la fourchette publiée.";
  return null;
};

export function referenceRate(
  target: { country: Country; instrument: AuctionResult["instrument"]; tenor: string; on: string },
  history: AuctionResult[],
  windowDays = 180,
): RateReference | undefined {
  const fit = history
    .filter((r) => r.confirmedBy && r.instrument === target.instrument && r.tenor === target.tenor && headline(r))
    .filter((r) => {
      const d = days(target.on, r.sessionOn);
      return d >= 0 && d <= windowDays;
    })
    .sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));
  if (!fit.length) return undefined;

  const home = fit.filter((r) => r.country === target.country);
  const pool = home.length ? home : fit;
  // Une séance représentative passe devant une séance récente : le taux d'une
  // séance à un soumissionnaire n'informe que sur ce soumissionnaire.
  const pick = pool.find((r) => !thin(r)) ?? pool[0];
  const h = headline(pick);
  if (!h) return undefined;
  return {
    proposed: h.value,
    unit: h.unit,
    from: pick,
    also: pool.filter((r) => r.id !== pick.id).slice(0, 4),
    sameCountry: home.length > 0,
    thin: thin(pick),
  };
}

/** La ligne de contexte que le desk lit sous le taux proposé. */
export function referenceLine(ref: RateReference): string {
  const c = coverageOf(ref.from);
  const bits = [`séance du ${ref.from.sessionOn}`];
  if (!ref.sameCountry) bits.push(`relevée au ${ref.from.country}`);
  if (ref.from.bidders != null) bits.push(`${ref.from.bidders} soumissionnaire${ref.from.bidders > 1 ? "s" : ""}`);
  if (c != null) bits.push(`couverture ${c.toFixed(2).replace(".", ",")} %`);
  if (ref.thin) bits.push("séance mince, à prendre avec réserve");
  return bits.join(" · ");
}

/**
 * Les deux bornes rangées par leur valeur, quelle que soit la porte d'entrée.
 *
 * Un bon et une obligation emploient le même canevas dans deux sens opposés.
 * Pour un bon, la borne est un taux : le plus grand nombre est aussi le plus
 * coûteux pour l'émetteur, et les deux façons de nommer coïncident. Pour une
 * obligation, la borne est un prix : à 90 l'émetteur reçoit 90 et remboursera
 * 100, à 95 il reçoit 95, donc le prix le plus BAS est celui qu'il nomme
 * « maximum ». Le Congo et le Tchad nomment ainsi, le Cameroun et le Gabon
 * nomment par le prix.
 *
 * Nos colonnes, elles, n'ont qu'un sens : « min » porte le plus petit nombre.
 * La normalisation vivait dans le lecteur automatique et nulle part ailleurs,
 * si bien qu'une saisie à la main entrait à l'envers sans que rien ne le voie.
 * Elle est ici pour que toutes les portes y passent.
 *
 * Les bornes ne sont pas décoratives : priceOf() se sert de la borne haute pour
 * décider si un prix moyen inclut le coupon couru, et onze rendements publiés
 * en dépendent, pour un écart moyen de cent cinquante et un points de base.
 */
export function rangerBornes<T extends Partial<Pick<AuctionResult, "rateMin" | "rateMax" | "priceMin" | "priceMax">>>(p: T): T {
  const out = { ...p };
  if (out.rateMin != null && out.rateMax != null && out.rateMin > out.rateMax) [out.rateMin, out.rateMax] = [out.rateMax, out.rateMin];
  if (out.priceMin != null && out.priceMax != null && out.priceMin > out.priceMax) [out.priceMin, out.priceMax] = [out.priceMax, out.priceMin];
  return out;
}
