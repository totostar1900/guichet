import type { Country, OfferKind } from "@/lib/domain/types";

/**
 * Le marché des titres publics de la CEMAC, tel que la BEAC le publie.
 *
 * Une adjudication s'annonce une semaine avant de se fermer. Le desk l'apprend
 * par courriel, ce qui reste le chemin le plus rapide, mais rien ne garantit
 * qu'il reçoive celle du Tchad ou de la Guinée Équatoriale. La BEAC, elle, les
 * publie toutes, au même endroit, avec le communiqué en pièce : c'est la seule
 * source qui couvre les six États, et elle est publique.
 *
 * La page « Annonces et Communiqués » est un tableau de mille lignes rendu
 * d'un bloc, que le navigateur pagine ensuite lui-même. Une seule requête
 * rapporte donc tout, sans clef, sans pagination et sans exécuter de script.
 *
 * Et le titre du document suffit. « COMMUNIQUE DANNONCE DE LEMISSION DES BTA 26
 * SEMAINES DU LUNDI 21 SEPTEMBRE 2026_TRESOR DU CAMEROUN » porte l'instrument,
 * la durée, la date et la nature de l'acte ; le pays est dans sa propre colonne,
 * ce qui évite d'avoir à le lire dans un titre où il s'écrit « EQUTORIALE ».
 * Aucun PDF n'a besoin d'être ouvert pour tenir un calendrier : le PDF reste la
 * pièce qu'on cite, il n'est pas la donnée.
 *
 * Les Trésors n'écrivent pas pareil, et c'est la seule difficulté. Majuscules ou
 * non, accents ou non, apostrophe mangée, jour de la semaine glissé devant la
 * date, tiret ou souligné avant le pays. Le lecteur ci-dessous ne cherche donc
 * que ce qui ne varie pas.
 */

export const BEAC_ANNONCES = "https://www.beac.int/m-des-titres-publics/annonces-et-communiques/";

/** Une ligne du tableau : le document, et ce que la BEAC en dit elle-même. */
export interface BeacDoc {
  url: string;
  title: string;
  country: string;
  year: string;
}

export type BeacKind = "annonce" | "resultats" | "calendrier" | "autre";

export interface BeacAuction {
  doc: BeacDoc;
  kind: BeacKind;
  /** BTA ou OTA, quand le titre le dit. */
  instrument?: OfferKind;
  /** « 26 semaines », « 3 ans » : tel que le Trésor l'écrit, normalisé. */
  tenor?: string;
  /** La date de la séance, en ISO. */
  on?: string;
  /** Un abondement vient s'ajouter à une ligne déjà émise. */
  abondement: boolean;
  country?: Country;
}

/** Sans accents, sans casse : la seule forme où les six Trésors se ressemblent. */
const flat = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

/** Les pays de la zone, tels que la colonne les écrit, y compris ses coquilles. */
const COUNTRIES: [RegExp, Country][] = [
  [/cam(e|er)oun/, "Cameroun"],
  [/centrafric|rca/, "RCA"],
  [/congo/, "Congo"],
  [/gabon/, "Gabon"],
  [/guinee/, "Guinée éq."],
  [/tchad/, "Tchad"],
];

export function beacCountry(label: string): Country | undefined {
  const f = flat(label);
  return COUNTRIES.find(([re]) => re.test(f))?.[1];
}

/**
 * Les lignes du tableau, lues dans le HTML tel qu'il arrive.
 *
 * Une expression régulière plutôt qu'un analyseur : la page est un gabarit
 * WordPress qui ne bouge pas, quatre cellules dans le même ordre depuis des
 * années, et rien ici ne dépend de la mise en forme. Le jour où elle changera,
 * le compte tombera à zéro et le robot le dira, ce qui vaut mieux qu'un
 * analyseur qui rendrait des lignes à moitié justes.
 */
export function parseBeacRows(html: string): BeacDoc[] {
  const out: BeacDoc[] = [];
  const row = /<tr[^>]*>\s*<td>\s*<a\s+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>\s*<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>/gi;
  for (const m of html.matchAll(row)) {
    const title = m[2]
      .replace(/<[^>]*>/g, "")
      .replace(/&#8217;|&rsquo;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (!title) continue;
    out.push({ url: m[1], title, country: m[4].trim(), year: m[5].trim() });
  }
  return out;
}

/** Ce que le titre dit, et rien de ce qu'il ne dit pas. */
export function readBeacDoc(doc: BeacDoc): BeacAuction {
  const f = flat(doc.title);
  const kind: BeacKind = /resultat/.test(f) ? "resultats" : /annonce/.test(f) ? "annonce" : /calendrier/.test(f) ? "calendrier" : "autre";

  // Les sigles, et les mêmes écrits en toutes lettres : trois Trésors sur six le
  // font au moins une fois, et une annonce sans instrument n'est pas classable.
  const bta = /\bbta\b/.test(f) || /bons? du tresor assimilables?/.test(f);
  const ota = /\bota\b/.test(f) || /obligations? du tresor assimilables?/.test(f);
  const instrument: OfferKind | undefined = bta ? "BTA" : ota ? "OTA" : undefined;

  const tenorMatch = f.match(/(\d+)\s*(semaines?|ans?|mois)/);
  const tenor = tenorMatch ? `${tenorMatch[1]} ${tenorMatch[2].replace(/s$/, "") + (Number(tenorMatch[1]) > 1 && tenorMatch[2] !== "mois" ? "s" : "")}` : undefined;

  // « du 22 septembre 2026 », « DU LUNDI 21 SEPTEMBRE 2026 » : le jour de la
  // semaine, quand il est là, n'ajoute rien et se laisse ignorer.
  // « 1er novembre » : le premier du mois porte son ordinal, et l'oublier perdait
  // une annonce sur trente-huit, toujours la même, toujours en début de mois.
  const dateMatch = f.match(new RegExp(`(\\d{1,2})\\s*(?:er|ere)?\\s+(${MONTHS.join("|")})\\s+(\\d{4})`));
  const on = dateMatch ? `${dateMatch[3]}-${String(MONTHS.indexOf(dateMatch[2]) + 1).padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}` : undefined;

  return { doc, kind, instrument, tenor, on, abondement: /abondement/.test(f), country: beacCountry(doc.country) || beacCountry(doc.title) };
}

/**
 * Les adjudications annoncées et encore devant nous.
 *
 * Les résultats et les calendriers restent dehors : les premiers racontent le
 * passé, les seconds sont un prévisionnel que le Trésor révise, et le mélange
 * ferait annoncer comme une séance ce qui n'est qu'une intention. Une séance
 * sans date n'entre pas non plus : un calendrier sans date n'est rien.
 */
export function forthcoming(docs: BeacDoc[], today: string): BeacAuction[] {
  return docs
    .map(readBeacDoc)
    .filter((a) => a.kind === "annonce" && a.on && a.on >= today)
    .sort((a, b) => (a.on ?? "").localeCompare(b.on ?? "") || (a.country ?? "").localeCompare(b.country ?? ""));
}

/**
 * Le communiqué des résultats d'une séance, quand la BEAC l'a publié.
 *
 * Une adjudication n'est pas finie quand elle se tient : elle est finie quand
 * le Trésor publie ce qu'il a servi et à quel taux. C'est ce chiffre-là que le
 * desk inscrit sur la ligne, et c'est lui que le client veut lire : « 7,00 %
 * sur 5,34 milliards demandés » dit ce qu'une annonce ne dit pas.
 *
 * Une séance se reconnaît à quatre choses qui ne varient pas d'un Trésor à
 * l'autre : le pays, l'instrument, la durée et la date. Le titre du document
 * les porte toutes, donc l'appariement se fait sans ouvrir un seul PDF.
 *
 * Les résultats paraissent avec quelques jours de retard, parfois une semaine :
 * une séance sans résultats n'est pas une anomalie, c'est le cours normal des
 * choses, et l'écran ne l'annonce pas comme un manque.
 */
export function resultsFor(a: BeacAuction, all: BeacAuction[]): BeacAuction | undefined {
  return all.find(
    (r) =>
      r.kind === "resultats" &&
      r.on === a.on &&
      r.instrument === a.instrument &&
      r.tenor === a.tenor &&
      r.country === a.country &&
      r.abondement === a.abondement,
  );
}

/**
 * La séance déjà dépouillée sur laquelle un taux indicatif peut se fonder.
 *
 * Le taux d'un bon sort de l'adjudication : l'émetteur ne l'impose pas. Le
 * chiffre que le desk affiche avant la séance est donc une indication, et une
 * indication se fonde sur ce que le marché vient de payer, pas sur une
 * intuition. Le bon comparable est la séance la plus récente de même durée et
 * même émetteur ; à défaut, la même durée chez un voisin de la zone, ce qui
 * reste un repère et doit se dire comme tel.
 *
 * Rien n'est rendu au-delà de la fenêtre : un taux servi il y a huit mois ne
 * dit plus rien du marché d'aujourd'hui, et le silence vaut mieux qu'un repère
 * périmé que personne ne penserait à vérifier.
 */
export interface Comparable {
  doc: BeacAuction;
  /** Même émetteur, ou seulement même durée ailleurs dans la zone. */
  sameCountry: boolean;
  /** Jours écoulés entre cette séance et celle qu'on prépare. */
  daysBefore: number;
}

export function nearestComparable(target: BeacAuction, all: BeacAuction[], windowDays = 120): Comparable | undefined {
  if (!target.on || !target.instrument || !target.tenor) return undefined;
  const day = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const past = all
    .filter((r) => r.kind === "resultats" && r.on && r.on < target.on! && r.instrument === target.instrument && r.tenor === target.tenor)
    .map((r) => ({ doc: r, sameCountry: r.country === target.country, daysBefore: Math.round((day(target.on!) - day(r.on!)) / 86400000) }))
    .filter((c) => c.daysBefore <= windowDays);
  if (!past.length) return undefined;
  // Le même émetteur d'abord, puis le plus récent : un voisin d'hier vaut mieux
  // qu'un compatriote d'il y a trois mois, mais pas mieux qu'un compatriote d'hier.
  past.sort((a, b) => Number(b.sameCountry) - Number(a.sameCountry) || a.daysBefore - b.daysBefore);
  return past[0];
}

/** Le titre court qu'on affiche : « BTA 26 semaines · Cameroun ». */
export function beacLabel(a: BeacAuction): string {
  const bits = [a.instrument, a.tenor].filter(Boolean).join(" ");
  return [bits || "Adjudication", a.country].filter(Boolean).join(" · ") + (a.abondement ? " (abondement)" : "");
}
