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

/**
 * « 52 SEMAINES » → « 52 semaines ». La durée, normalisée.
 *
 * C'est elle qui apparie une séance à venir avec celles qui l'ont précédée :
 * un bon à 26 semaines et un bon à 52 semaines sont deux produits, et leurs
 * taux ne se comparent pas. Les Trésors l'écrivent au singulier, au pluriel,
 * en capitales ; ce qui sort d'ici s'écrit d'une seule façon.
 */
export function tenorOf(text: string): string | undefined {
  /* LE TRÉSOR DU CAMEROUN ÉCRIT AUSSI EN ANGLAIS, et « 13 weeks » désignait la
     même durée que « 13 semaines » sans que le lecteur la reconnaisse.
     LA GUINÉE ÉQUATORIALE ÉCRIT EN ESPAGNOL, et « 52 semanas » de même : son
     titre ne porte jamais la durée, mais la pièce, elle, l'écrit. */
  const m = flat(text).match(/(\d+)\s*(semaines?|semanas?|weeks?|ans?|anos?|years?|mois|months?|mes(?:es)?)\b/);
  if (!m) return undefined;
  const brute = m[2].replace(/s$/, "");
  const unite =
    brute === "week" || brute === "semana" ? "semaine" : brute === "year" || brute === "ano" ? "an" : brute === "month" || brute === "mes" || brute === "mese" ? "mois" : brute;
  return `${m[1]} ${unite}${Number(m[1]) > 1 && unite !== "mois" ? "s" : ""}`;
}

/** Sans accents, sans casse : la seule forme où les six Trésors se ressemblent. */
const flat = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

/**
 * Un mois, écrit en entier ou abrégé.
 *
 * Les Trésors abrègent à leur guise : « septembre », « sept », « déc. ». Le
 * motif accepte donc le nom complet ou n'importe quel préfixe assez long pour
 * lever l'ambiguïté. Trois lettres y suffisent partout, sauf pour juin et
 * juillet qui ne se séparent qu'à la quatrième.
 */
const mois = (m: string): string => {
  const court = m.startsWith("jui") ? 4 : 3;
  if (m.length <= court) return m;
  const reste = m.slice(court);
  return `${m.slice(0, court)}(?:${reste.split("").map((_, i) => reste.slice(0, i + 1)).join("|")})?`;
};

/**
 * Les pays de la zone, tels que la colonne les écrit, y compris ses coquilles.
 *
 * ET TELS QUE LE TITRE LES ÉCRIT EN ANGLAIS. « Republic of Cameroon » ne
 * contenait aucune des formes attendues, et les pièces servies par la colonne
 * de droite, qui n'ont pas de colonne « pays », se retrouvaient sans pays donc
 * sans identité de séance.
 */
const COUNTRIES: [RegExp, Country][] = [
  [/cam(e|er)oun|cameroon/, "Cameroun"],
  /* « centrafric » n'est PAS dans « Centrafrique » : le mot s'arrête à
     « centrafri », et le rapport hebdomadaire écrit « Centrafrique » là où le
     communiqué écrit « République Centrafricaine ». Mesuré le 2026-10-15. */
  [/centrafri|\brca\b|central african/, "RCA"],
  [/congo/, "Congo"],
  [/gabon/, "Gabon"],
  [/guinee|guinea/, "Guinée éq."],
  [/tchad|\bchad\b/, "Tchad"],
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

  /**
   * LA COLONNE DE DROITE N'EST PAS UN TABLEAU, ET QUINZE PIÈCES Y DORMAIENT.
   *
   * Sous le tableau paginé, la page sert une liste « DOCUMENTS » : quinze
   * communiqués de 2019, dont cinq résultats d'adjudication du Gabon et du
   * Congo. Ce ne sont pas des `<tr>`, donc le lecteur ne les voyait pas. La
   * même liste paraît sur les quatre pages de statistiques, ce qui explique
   * qu'on les ait ramassées sans jamais les lire.
   *
   * Ces liens n'ont ni colonne « pays » ni colonne « année » : les deux se
   * lisent dans le titre, comme pour les séances dont la colonne est vide.
   * ON LES AJOUTE SANS DOUBLER : une pièce déjà vue dans le tableau y reste.
   *
   * ET SEULEMENT SI LE TABLEAU A RENDU QUELQUE CHOSE. Le robot refuse de
   * travailler quand il ne lit aucune ligne, parce qu'un gabarit changé vaut
   * mieux muet qu'à moitié juste ; cette liste-ci, elle, ramasserait encore
   * des liens et étoufferait l'alerte.
   */
  if (!out.length) return out;
  const vues = new Set(out.map((d) => d.url));
  for (const m of html.matchAll(/<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]{0,400}?)<\/a>/gi)) {
    if (vues.has(m[1])) continue;
    const title = m[2]
      .replace(/<[^>]*>/g, "")
      .replace(/&#8217;|&rsquo;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!title) continue;
    vues.add(m[1]);
    out.push({ url: m[1], title, country: "", year: (title.match(/\b(20\d{2})\b/) ?? [])[1] ?? "" });
  }
  return out;
}

const MOIS_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** « Febuary » sans le r : le Trésor du Cameroun l'écrit deux fois en 2020. */
const MOTIF_EN = MOIS_EN.map((m) => (m === "february" ? "febr?uary" : m));

/**
 * LA DATE QUAND LE TRÉSOR L'ÉCRIT EN ANGLAIS.
 *
 * Deux ordres, et le Cameroun emploie les deux dans la même année : « 19th of
 * june 2019 session » et « September 5th 2022 ». L'ordinal colle au chiffre,
 * « of » est facultatif, et le mois ne s'abrège jamais ici : on n'accepte donc
 * que le nom entier, ce qui évite qu'un préfixe français attrape un mot anglais.
 */
function dateAnglaise(f: string): string | undefined {
  const mois = MOTIF_EN.join("|");
  const ord = "(?:st|nd|rd|th)?";
  const jourDabord = f.match(new RegExp(`\\b(\\d{1,2})${ord}\\s+(?:of\\s+)?(${mois})\\b\\s+(\\d{4})`));
  const moisDabord = f.match(new RegExp(`\\b(${mois})\\b\\s+(\\d{1,2})${ord}\\,?\\s+(\\d{4})`));
  const [jour, nom, an] = jourDabord ? [jourDabord[1], jourDabord[2], jourDabord[3]] : moisDabord ? [moisDabord[2], moisDabord[1], moisDabord[3]] : [];
  if (!jour || !nom || !an) return undefined;
  const rang = MOTIF_EN.findIndex((p) => new RegExp(`^${p}$`).test(nom));
  if (rang < 0) return undefined;
  return `${an}-${String(rang + 1).padStart(2, "0")}-${jour.padStart(2, "0")}`;
}

/**
 * LA DATE ÉCRITE EN CHIFFRES : « 14-08-2019 », « 01/07/2020 ».
 *
 * Le Gabon s'y met une poignée de fois. Le jour vient d'abord, comme partout
 * dans la zone, et on ne l'interprète que lorsque le nombre de tête dépasse
 * douze ou que le second ne peut pas être un jour : AU MOINDRE DOUTE ON NE
 * REND RIEN, une séance datée du mauvais mois valant moins qu'une séance sans
 * date, qui se voit.
 */
function dateChiffree(f: string): string | undefined {
  const m = f.match(/\b(\d{2})[-/](\d{2})[-/](\d{4})\b/);
  if (!m) return undefined;
  const [, a, b, an] = m;
  const jour = Number(a);
  const mois = Number(b);
  if (jour < 1 || jour > 31 || mois < 1 || mois > 12) return undefined;
  return `${an}-${b}-${a}`;
}

const MOIS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/**
 * LA DATE QUAND LE TRÉSOR L'ÉCRIT EN ESPAGNOL.
 *
 * « del 28 de Octubre 2020 », « del 01 Abril 2020 », « el 28 de Agosto 2019 »,
 * « del 09 de Junio de 2021 », « del 08 enero 2020 » : le « de » est facultatif
 * devant le mois comme devant l'année, et la Guinée Équatoriale emploie les
 * quatre formes dans la même année.
 *
 * AUCUN MOIS ESPAGNOL N'EST LE PRÉFIXE D'UN MOIS FRANÇAIS dans cette liste, et
 * le lecteur français passe de toute façon avant : « 16 de octubre » ne peut
 * pas tomber dans « octobre » puisque le motif français veut le mois collé au
 * chiffre, sans « de » entre les deux.
 */
function dateEspagnole(f: string): string | undefined {
  const m = f.match(new RegExp(`\\b(\\d{1,2})\\s+(?:de\\s+)?(${MOIS_ES.join("|")})\\s+(?:de\\s+)?(\\d{4})`));
  if (!m) return undefined;
  return `${m[3]}-${String(MOIS_ES.indexOf(m[2]) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** Ce que le titre dit, et rien de ce qu'il ne dit pas. */
export function readBeacDoc(doc: BeacDoc): BeacAuction {
  const f = flat(doc.title);
  /**
   * LE CAMEROUN PUBLIE AUSSI EN ANGLAIS, ET QUARANTE-DEUX ANNONCES SONT RESTÉES
   * DEHORS.
   *
   * « Announcement issuance of Fungible Treasury Bills of the Republic of
   * Cameroon : 19th of june 2019 session » dit exactement ce que dit son
   * équivalent français, et le lecteur le classait « autre » faute de
   * reconnaître un seul de ses mots. Mesuré le 15 octobre 2026 : quarante-deux
   * pièces vues et jamais déposées, presque toutes camerounaises.
   */
  /**
   * ET LA GUINÉE ÉQUATORIALE PUBLIE EN ESPAGNOL : trente-sept pièces, le seul
   * État de la zone dont nos communiqués n'expliquaient RIEN de l'encours
   * officiel. « Aviso de comunicado de la emision » est une annonce,
   * « Comunicado de resultados de adjudicaciones » un résultat.
   *
   * ET LA BEAC SE TROMPE EN TAPANT. « Annoucement » sans le second n (neuf
   * annonces camerounaises de 2020), « Communicado » avec deux m,
   * « resultadaos », « resultos » : quatre coquilles, toutes du côté de la
   * source, toutes mesurées le 15 octobre 2026. Un lecteur qui exige
   * l'orthographe exacte perd une pièce sur vingt-trois.
   */
  /**
   * ET TOUT « COMMUNIQUÉ DES RÉSULTATS » N'EST PAS UNE ADJUDICATION. La BEAC
   * publie sur la même page ses propres marchés publics : « Communiqué des
   * résultats de l'Appel d'offres AON/OPIL n°29/E7/2019-BEAC du 23 juillet
   * 2019 » est l'attribution d'un marché de fournitures, pas une séance du
   * marché des titres. Une pièce, trouvée le 16 octobre 2026 parce qu'elle
   * tenait seule un contrôle au rouge : elle n'a ni Trésor ni ligne, donc
   * elle ne pouvait jamais être rapprochée de rien.
   *
   * Le motif vise l'appel d'offres de la BAEC elle-même, et non le mot
   * « adjudication » que les Trésors emploient justement pour leurs séances.
   */
  const marcheDeLaBeac = /appel d.?offres|\bAON\b|\bOPIL\b/i.test(f);

  const kind: BeacKind = marcheDeLaBeac
    ? "autre"
    : /resultat|result[ad]*os?|\bresults?\b/.test(f)
    ? "resultats"
    : /annonce|annou?n?cement|\baviso\b/.test(f)
      ? "annonce"
      : /calendrier|calendar/.test(f)
        ? "calendrier"
        : "autre";

  // Les sigles, et les mêmes écrits en toutes lettres : trois Trésors sur six le
  // font au moins une fois, et une annonce sans instrument n'est pas classable.
  /**
   * « BONOS DEL TESORO » NE DIT PAS LEQUEL, ET ON NE DEVINE PAS.
   *
   * C'est le calque de « bons du Trésor », donc des BTA ; mais la Guinée écrit
   * aussi « OTA » en toutes lettres la même année, ce qui prouve que le terme
   * générique n'est pas réservé au court terme. Une seule pièce lisible le
   * tranche dans un sens (« GQ1300000692 BTA 52 », séance du 25 septembre
   * 2019) : un cas ne fait pas une règle. L'instrument reste donc silencieux
   * sur ces titres-là, et c'est la lecture de la pièce qui le dira.
   */
  const bta = /\bbta\b/.test(f) || /bons? du tresor assimilables?/.test(f) || /treasury bills?/.test(f);
  const ota = /\bota\b/.test(f) || /obligations? du tresor assimilables?/.test(f) || /treasury bonds?/.test(f);
  const instrument: OfferKind | undefined = bta ? "BTA" : ota ? "OTA" : undefined;

  const tenor = tenorOf(doc.title);

  // « du 22 septembre 2026 », « DU LUNDI 21 SEPTEMBRE 2026 » : le jour de la
  // semaine, quand il est là, n'ajoute rien et se laisse ignorer.
  // « 1er novembre » : le premier du mois porte son ordinal, et l'oublier perdait
  // une annonce sur trente-huit, toujours la même, toujours en début de mois.
  // Et le mois s'abrège. « _14 SEPT 2026_TRESOR DU CAMEROUN » : cinq résultats
  // camerounais du 14 septembre 2026, une journée entière de la courbe, du 3 ans
  // au 7 ans, tombaient parce que le lecteur attendait « septembre » en toutes
  // lettres. Le préfixe suffit à désigner un mois sans ambiguïté, « juin » et
  // « juillet » se séparant dès la quatrième lettre.
  const dateMatch = f.match(new RegExp(`(\\d{1,2})\\s*(?:er|ere)?[\\s_]+(${MONTHS.map(mois).join("|")})\\.?[\\s_]+(\\d{4})`));
  const on = dateMatch
    ? `${dateMatch[3]}-${String(MONTHS.findIndex((m) => m.startsWith(dateMatch[2])) + 1).padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`
    : dateAnglaise(f) ?? dateEspagnole(f) ?? dateChiffree(f);

  /**
   * LE TITRE NOMME LE PAYS, LA COLONNE LE COMPLÈTE : pas l'inverse.
   *
   * La colonne passait d'abord, parce que le titre écrit parfois
   * « EQUTORIALE » et qu'un titre illisible ne vaut rien. Mais illisible
   * n'est pas faux. Mesuré le 15 octobre 2026 sur les 1 347 pièces : 1 019
   * fois les deux s'accordent, 308 fois le titre se tait, et 20 fois ils se
   * contredisent. Sur ces vingt, le nom du fichier publié par la BEAC donne
   * raison au titre 13 fois et à la colonne JAMAIS :
   * « Résultats-BTA-Gabon-18-01-2023.pdf » porte « Tchad » en colonne.
   *
   * Une annonce gabonaise déposée comme tchadienne fausse deux pays à la
   * fois, et le taux qu'elle porte entre dans la mauvaise courbe.
   */
  return { doc, kind, instrument, tenor, on, abondement: /abondement/.test(f), country: beacCountry(doc.title) || beacCountry(doc.country) };
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
