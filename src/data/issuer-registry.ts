import type { Country, Offer } from "@/lib/domain/types";
import { COMPANIES, type Company } from "./companies";
import { ISSUERS, type BondIssuer } from "./issuers";

/**
 * One issuer behind its spellings. The bulletin, the desk's own entries and
 * the BVMAC fiches each write a borrower their own way (« État du Gabon »,
 * « Trésor public de la République gabonaise », « EOG »); this registry ties
 * them to one entity with a family, a zone (a country, or CEMAC for the
 * region's institutions) and a short text taken from what the issuer or the
 * BVMAC published, with its source. Nothing here changes a line's own
 * figures or label: it is a classification layer, kept apart.
 *
 * Matching order: an ISIN listed on the issuer, then an alias (case and
 * accents ignored), then a prefix the bulletin uses for the line's label.
 */
export type IssuerFamily = "etat" | "supranational" | "banque" | "societe" | "gestion";
export type IssuerZone = Country | "CEMAC";

export interface IssuerProfile {
  slug: string;
  name: string; // the one name shown on group heads and cards
  family: IssuerFamily;
  zone: IssuerZone;
  city?: string;
  /** Spellings met in the bulletin, the desk's entries, the fiches. */
  aliases: string[];
  /** Label prefixes of the issuer's lines in the bulletin (« EOG », « BDEAC »). */
  labelPrefixes?: string[];
  isins?: string[];
  sector?: string;
  /** One or two sentences, from the source named below; nothing else. */
  activity?: string;
  source?: string;
  website?: string;
  /** Where the full profile lives: the company page or the bond-issuer page. */
  href?: string;
}

export const FAMILY_LABEL: Record<IssuerFamily, string> = { etat: "État", supranational: "Institution régionale", banque: "Banque · établissement financier", societe: "Société", gestion: "Société de gestion" };

const BVMAC_EM = "BVMAC, Espace émetteurs, sept. 2026";

const STATES: IssuerProfile[] = [
  { slug: "etat-gabon", name: "État du Gabon", family: "etat", zone: "Gabon", city: "Libreville", aliases: ["État du Gabon", "Etat du Gabon", "République gabonaise", "Trésor public de la République gabonaise", "Trésor public gabonais", "Gabon"], labelPrefixes: ["EOG"], activity: "Emprunts obligataires par appel public à l'épargne de la République gabonaise, cotés à la BVMAC ; le Trésor public émet aussi des bons et obligations du Trésor par adjudication à la BEAC.", source: `${BVMAC_EM} · calendrier des adjudications BEAC` },
  { slug: "etat-cameroun", name: "État du Cameroun", family: "etat", zone: "Cameroun", city: "Yaoundé", aliases: ["État du Cameroun", "Etat du Cameroun", "République du Cameroun", "Trésor public de la République du Cameroun", "Trésor public camerounais", "Cameroun"], labelPrefixes: ["ECMR"], activity: "Emprunts obligataires de la République du Cameroun par appel public à l'épargne, cotés à la BVMAC ; le Trésor public émet des BTA et OTA par adjudication à la BEAC.", source: `${BVMAC_EM} · calendrier des adjudications BEAC` },
  { slug: "etat-congo", name: "État du Congo", family: "etat", zone: "Congo", city: "Brazzaville", aliases: ["État du Congo", "Etat du Congo", "République du Congo", "Trésor public de la République du Congo", "Trésor public congolais", "Congo"], labelPrefixes: ["EOCG"], activity: "Emprunts obligataires de la République du Congo, cotés à la BVMAC ; le Trésor public émet des BTA et OTA par adjudication à la BEAC.", source: `${BVMAC_EM} · calendrier des adjudications BEAC` },
  { slug: "etat-tchad", name: "État du Tchad", family: "etat", zone: "Tchad", city: "N'Djamena", aliases: ["État du Tchad", "Etat du Tchad", "République du Tchad", "Trésor public de la République du Tchad", "Trésor public tchadien", "Tchad"], labelPrefixes: ["ETCD", "EOT"], activity: "Emprunts obligataires de la République du Tchad, cotés à la BVMAC ; le Trésor public émet des BTA et OTA par adjudication à la BEAC.", source: `${BVMAC_EM} · calendrier des adjudications BEAC` },
  { slug: "etat-rca", name: "État centrafricain", family: "etat", zone: "RCA", city: "Bangui", aliases: ["État centrafricain", "Etat centrafricain", "République centrafricaine", "Trésor public de la République centrafricaine", "Trésor public centrafricain", "RCA"], labelPrefixes: ["ERCA"], activity: "Le Trésor public de la République centrafricaine émet des BTA et OTA par adjudication à la BEAC.", source: "calendrier des adjudications BEAC" },
  { slug: "etat-guinee-equatoriale", name: "État de Guinée équatoriale", family: "etat", zone: "Guinée éq.", city: "Malabo", aliases: ["État de Guinée équatoriale", "Etat de Guinée équatoriale", "République de Guinée équatoriale", "Trésor public de la République de Guinée équatoriale", "Guinée équatoriale", "Guinée éq."], labelPrefixes: ["EGE"], activity: "Le Trésor public de la République de Guinée équatoriale émet des BTA et OTA par adjudication à la BEAC.", source: "calendrier des adjudications BEAC" },
];

const REGIONAL: IssuerProfile[] = [
  { slug: "bdeac", name: "BDEAC", family: "supranational", zone: "CEMAC", city: "Brazzaville", aliases: ["BDEAC", "Banque de Développement des États de l'Afrique Centrale", "Banque de Developpement des Etats de l'Afrique Centrale"], labelPrefixes: ["BDEAC"], sector: "Banque de développement", activity: "Banque de développement de la CEMAC, détenue par les six États membres et la BEAC ; elle finance des projets publics et privés de la zone et se refinance par des emprunts obligataires cotés à la BVMAC.", source: `${BVMAC_EM} · états financiers IFRS 2025 de la BDEAC, mai 2026` },
  { slug: "beac", name: "BEAC", family: "supranational", zone: "CEMAC", city: "Yaoundé", aliases: ["BEAC", "Banque des États de l'Afrique Centrale", "Banque des Etats de l'Afrique Centrale"], activity: "Banque centrale des six États de la CEMAC ; elle tient les adjudications des titres publics.", source: "BEAC, site institutionnel" },
];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(s\.?a\.?|sarl|s\.?a\.?s\.?)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Le registre, construit sur les fiches qu'on lui donne.
 *
 * Il partait des constantes du code, si bien qu'une société renommée au desk
 * gardait ici son ancien nom, son ancienne zone et ses anciens alias : la page
 * /societes disait une chose, la tête de groupe du navigateur de lignes en
 * disait une autre. Les états et les institutions régionales restent dans le
 * code, parce qu'aucune fiche ne les décrit ; le reste vient des fiches.
 */
export function buildIssuerRegistry(companies: Company[], issuers: BondIssuer[]): IssuerProfile[] {
  return [
  ...STATES,
  ...REGIONAL,
  ...companies.map<IssuerProfile>((c) => ({
    slug: c.mnemo.toLowerCase(),
    name: c.shortName,
    family: /banque|bank|banco|finance|crédit|credit|assur/i.test(`${c.name} ${c.sector}`) ? "banque" : "societe",
    zone: c.country,
    city: c.city,
    aliases: [c.name, c.shortName, c.mnemo],
    isins: [c.isin],
    sector: c.sector,
    activity: c.activity,
    source: "fiche signalétique BVMAC · comptes certifiés",
    href: `/societes/${c.mnemo.toLowerCase()}`,
  })),
  ...issuers.map<IssuerProfile>((i) => ({
    slug: i.slug,
    name: i.shortName,
    family: /banque|bank|finance|crédit|credit|assur/i.test(`${i.name} ${i.sector}`) ? "banque" : "societe",
    zone: i.country,
    city: i.city,
    aliases: [i.name, i.shortName, i.mnemo],
    isins: i.isins,
    sector: i.sector,
    activity: i.activity,
    source: "fiche signalétique BVMAC, Espace émetteurs",
    website: i.website,
    href: `/emetteurs/${i.slug}`,
  })),
  ];
}

/** Ce que le code livre : le registre d'un serveur qui n'a encore rien lu. */
export const ISSUER_REGISTRY: IssuerProfile[] = buildIssuerRegistry(COMPANIES, ISSUERS);

/**
 * Le registre en vigueur, et ses deux index.
 *
 * Même geste que `setRegistry` pour les types et le glossaire : le serveur
 * l'installe en lisant le référentiel, le navigateur le reçoit par
 * RegistryProvider, et `resolveIssuer` garde sa signature partout. Sans quoi
 * il faudrait passer le registre en propriété à travers le navigateur de
 * lignes, la carte d'identité d'une ligne et tout ce qui viendra après.
 */
const index = (list: IssuerProfile[]) => {
  const isin = new Map<string, IssuerProfile>();
  const alias = new Map<string, IssuerProfile>();
  for (const p of list) {
    for (const i of p.isins ?? []) isin.set(i, p);
    for (const a of p.aliases) alias.set(norm(a), p);
  }
  return { list, isin, alias };
};

let REG = index(ISSUER_REGISTRY);

export const getIssuerRegistry = (): IssuerProfile[] => REG.list;
export function setIssuerRegistry(list: IssuerProfile[]): void {
  REG = index(list);
}

/**
 * Le registre allégé pour le navigateur : les phrases sourcées et les liens
 * ne servent qu'au volet « Émetteur », rendu sur le serveur. Ce qui traverse
 * est ce qui sert à reconnaître un émetteur, rien de plus.
 */
export const issuersForClient = (list: IssuerProfile[]): IssuerProfile[] => list.map(({ slug, name, family, zone, aliases, labelPrefixes, isins }) => ({ slug, name, family, zone, aliases, labelPrefixes, isins }));

/** The issuer behind a line, when the registry knows it. */
export function resolveIssuer(o: Pick<Offer, "isin" | "issuer" | "title">): IssuerProfile | undefined {
  const { list, isin: byIsin, alias: byAlias } = REG;
  if (o.isin && byIsin.has(o.isin)) return byIsin.get(o.isin);
  const n = norm(o.issuer ?? "");
  if (n && byAlias.has(n)) return byAlias.get(n);
  // « BGFI Holding Corporation S.A. » and « BGFI Holding Corporation » : the same once the suffixes go.
  for (const [alias, p] of byAlias) if (n && (alias === n || (n.length > 6 && alias.startsWith(n)) || (alias.length > 6 && n.startsWith(alias)))) return p;
  const label = (o.title ?? "").toUpperCase();
  for (const p of list) for (const pre of p.labelPrefixes ?? []) if (label.startsWith(pre + " ")) return p;
  return undefined;
}

/** What the list groups and sorts on: the registry's name when known, the line's own spelling otherwise. */
export const issuerKey = (o: Pick<Offer, "isin" | "issuer" | "title">): string => resolveIssuer(o)?.name ?? o.issuer;

/** The flag on a group head or a fiche: CEMAC for the region's institutions, the line's country otherwise. */
export const issuerZone = (o: Pick<Offer, "isin" | "issuer" | "title" | "country">): IssuerZone => resolveIssuer(o)?.zone ?? o.country;
