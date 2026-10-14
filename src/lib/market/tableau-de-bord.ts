import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { avecReplisSansReflexion } from "@/lib/reflexion";
import { z } from "zod";

/**
 * LIRE LE TABLEAU DE BORD HEBDOMADAIRE DU MARCHÉ DES TITRES PUBLICS.
 *
 * CE QUE CETTE PIÈCE CHANGE, et c'est la plus grosse trouvaille de la
 * semaine : la BEAC publie, par sa Cellule de règlement et de conservation
 * des titres, le LIVRE DES MOUVEMENTS des six Trésors. Une ligne par
 * opération, avec le code d'émission, le type d'acte, le montant EN FRANCS,
 * la date d'opération et la date de règlement.
 *
 * L'encours adjugé était jusqu'ici reconstitué à partir des 252 communiqués
 * de résultats, ce qui laissait trois trous que cette pièce comble d'un coup :
 *
 *   un tiers des séances annoncées n'ont jamais publié de résultat, donc leur
 *   émission manquait au stock ;
 *
 *   les remboursements étaient SUPPOSÉS in fine faute de les connaître, ce
 *   qui surévaluait toute obligation amortissable ;
 *
 *   le coût annuel de la dette adjugée ne se calculait pas du tout, et il est
 *   ici la simple somme des paiements d'intérêts.
 *
 * ET LE TITRE DIT « OPÉRATIONS PRÉVUES » : la pièce regarde devant, donc elle
 * est aussi le calendrier à court terme, que la page des annonces ne donnait
 * plus depuis le 22 septembre.
 *
 * LES MONTANTS SONT EN FRANCS, ET IL FAUT LE DIRE PARCE QUE C'EST L'INVERSE
 * DES COMMUNIQUÉS. Les résultats d'adjudication s'impriment en millions, et
 * deux défauts d'unité en sont venus (le Tchad mille fois trop grand, la
 * Guinée équatoriale mille fois trop petite). Ici la colonne s'intitule
 * « MONTANTS EN FCFA » et porte « 2 750 000 000 ». On ne convertit rien, et
 * le garde d'échelle le vérifie.
 *
 * La machine propose, personne n'arrête encore : ces lignes ne sont pas
 * confirmées, et `confirmed_by` reste vide tant qu'un humain ne les a pas
 * relues. C'est la même règle que pour les communiqués de résultats.
 */

/**
 * CE QUE CHAQUE MONTANT VEUT DIRE, ET POURQUOI ILS NE SE VALENT PAS.
 *
 * Le titre de la pièce le dit et il faut le prendre au mot : « opérations
 * PRÉVUES pour la semaine du … ». C'est un programme, pas un relevé, et les
 * cinq colonnes ne sont donc pas de même nature.
 *
 * MESURÉ LE 14 OCTOBRE 2026 CONTRE NOS 249 COMMUNIQUÉS DE RÉSULTATS, qui sont
 * une source indépendante sur les mêmes séances :
 *
 *   ÉMISSION ET ABONDEMENT : sur 134 couples de même date, le montant du
 *   tableau égale 80 fois le montant ANNONCÉ et 34 fois seulement le montant
 *   SERVI. C'est donc une intention de lever, un majorant. L'employer dans un
 *   encours le gonflerait de tout ce que les Trésors n'ont pas obtenu.
 *
 *   REMBOURSEMENT : sur 33 codes de bons vus des deux côtés, le remboursement
 *   égale 24 fois au franc près ce que nos communiqués portent, le dépasse
 *   9 fois, et NE LUI EST JAMAIS INFÉRIEUR. Zéro en dessous sur trente-trois
 *   n'est pas du bruit : c'est la signature de l'abondement, la ligne ayant
 *   été rouverte dans une séance que nous n'avons pas. Le remboursement est
 *   donc EXACT, et il mesure le principal entier de la ligne, abondements
 *   compris. Sur ces trente-trois codes, nos séances sous-estiment le
 *   principal de 315 à 424 milliards, soit un tiers.
 *
 *   PAIEMENT D'INTÉRÊTS : un coupon est contractuel, connu d'avance au
 *   centime. Rien ne le dément dans les 275 paiements lus.
 *
 * D'OÙ LA RÈGLE : ce qui est DÛ se lit sur le tableau de bord, ce qui a été
 * OBTENU se lit sur le communiqué de résultats. Les confondre est la seule
 * façon de se tromper avec deux sources justes.
 */
export const MONTANT_SELON_OPERATION = {
  emission: "annonce",
  abondement: "annonce",
  remboursement: "exact",
  paiement_interets: "exact",
  rachat: "annonce",
  autre: "inconnu",
} as const;

/** Ce montant peut-il entrer dans un total sans le fausser ? */
export const montantFiable = (operation: keyof typeof MONTANT_SELON_OPERATION): boolean => MONTANT_SELON_OPERATION[operation] === "exact";

const MODEL = process.env.AUCTION_READ_MODEL || "claude-opus-5";

/** Les six Trésors, écrits comme le reste de la maison les écrit. */
const PAYS = ["Cameroun", "Centrafrique", "Congo", "Gabon", "Guinée éq.", "Tchad"] as const;

const Operation = z.enum(["emission", "abondement", "remboursement", "paiement_interets", "rachat", "autre"]);

const Ligne = z.object({
  pays: z.enum(PAYS).describe("Le Trésor émetteur, première colonne. « GUINEE EQUATORIALE » se rend « Guinée éq. », « CENTRAFRIQUE » se rend « Centrafrique »."),
  instrument: z.enum(["BTA", "OTA"]).nullable().describe("Colonne INSTRUMENTS : BTA pour un bon, OTA pour une obligation."),
  tenor: z.string().nullable().describe("La durée telle qu'écrite : « 5 ans », « 26 semaines »."),
  codeEnchere: z.string().describe("La cellule CODES ENCHERES entière, telle qu'imprimée, par exemple « CM2B00000053 OTA 5 ANS 5,50% 26-FEVR-2026 »."),
  codeEmission: z.string().nullable().describe("Le code seul, au début de la cellule : « CM2B00000053 »."),
  couponRate: z.number().nullable().describe("Le taux imprimé dans la cellule du code, en pour cent : 5,50 se rend 5.5. Absent pour un bon."),
  maturityOn: z.string().nullable().describe("L'échéance imprimée dans la cellule du code, en AAAA-MM-JJ. « 26-FEVR-2026 » se rend « 2026-02-26 »."),
  operation: Operation.describe(
    "TYPES D'OPERATIONS. « EMISSION PAR ADJUDICATION » se rend emission ; « ABONDEMENT » abondement ; « REMBOURSEMENTS » remboursement ; « PAIEMENT D'INTERETS » paiement_interets ; « RACHAT » rachat ; tout autre libellé, autre.",
  ),
  montant: z.number().nullable().describe("MONTANTS EN FCFA, en francs, tel qu'imprimé : « 2 750 000 000 » se rend 2750000000. Ne jamais convertir."),
  operationOn: z.string().nullable().describe("DATES D'OPERATIONS, en AAAA-MM-JJ."),
  settleOn: z.string().nullable().describe("DATES DE REGLEMENT, en AAAA-MM-JJ."),
  observations: z.string().nullable().describe("La colonne OBSERVATIONS, quand elle porte quelque chose."),
});

const Lecture = z.object({
  semaineDu: z.string().nullable().describe("Le premier jour de la semaine annoncée dans le titre, en AAAA-MM-JJ."),
  semaineAu: z.string().nullable().describe("Le dernier jour de la semaine annoncée, en AAAA-MM-JJ."),
  lignes: z.array(Ligne).describe("Toutes les lignes du tableau, dans l'ordre, sur TOUTES les pages. Ne jamais en omettre."),
  remarques: z.array(z.string()).describe("Ce qui empêche de lire une cellule, ou ce qui paraît contradictoire dans la pièce. Vide si tout est net."),
});

export type LigneDeBord = z.infer<typeof Ligne>;
export type LectureDeBord = z.infer<typeof Lecture>;

const SYSTEM = `Tu lis le TABLEAU DE BORD HEBDOMADAIRE DES OPERATIONS DU MARCHE DES VALEURS DU TRESOR DE LA CEMAC, publié par la BEAC.

C'est un scan. Le tableau a huit colonnes : TRESORS EMETTEURS, INSTRUMENTS, CODES ENCHERES, TYPES D'OPERATIONS, MONTANTS EN FCFA, DATES D'OPERATIONS, DATES DE REGLEMENT, OBSERVATIONS. Il continue souvent sur une deuxième page, avec le même en-tête.

TROIS RÈGLES, ET ELLES COMPTENT PLUS QUE LA VITESSE.

La colonne du pays est FUSIONNÉE sur plusieurs lignes : une cellule « CAMEROUN » qui couvre six lignes veut dire que ces six lignes sont camerounaises. Reporte le pays sur chacune.

Les montants sont EN FRANCS, pas en millions. « 2 750 000 000 » vaut deux milliards sept cent cinquante millions. Ne convertis jamais, ne divise jamais.

Si une cellule est illisible, rends null et dis-le dans remarques. N'invente aucun chiffre, ne déduis aucune valeur d'une ligne voisine : une donnée manquante vaut mieux qu'une donnée inventée.

Rends TOUTES les lignes de TOUTES les pages.`;

/** Le modèle demandé, quand il est écrit d'une forme qu'on accepte. */
export const modeleDemande = (v: string | null | undefined): string | undefined =>
  v && /^claude-[a-z0-9.-]{3,60}$/.test(v) ? v : undefined;

/**
 * LE GARDE D'ÉCHELLE, parce qu'un montant lu de travers passe inaperçu.
 *
 * Une opération d'un Trésor de la zone pèse entre un million et deux cents
 * milliards. En dessous, on a perdu les groupes de milliers ; au-dessus, on en
 * a gagné. Les deux se sont produits sur les communiqués de résultats, et il
 * n'y a aucune raison que le scan d'un tableau soit plus docile.
 */
export const PLANCHER = 1_000_000;
export const PLAFOND = 200_000_000_000;

export function horsEchelle(l: LigneDeBord): string | undefined {
  if (l.montant == null) return undefined;
  if (l.montant < PLANCHER) return `${l.montant.toLocaleString("fr-FR")} F : trop petit pour une opération d'un Trésor, les groupes de milliers ont dû se perdre.`;
  if (l.montant > PLAFOND) return `${(l.montant / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mds : trop grand pour une opération, un groupe de milliers a dû s'ajouter.`;
  return undefined;
}

export async function lireTableauDeBord(pdfBase64: string, modele?: string): Promise<LectureDeBord & { modele: string }> {
  const client = new Anthropic();
  const choisi = modele ?? MODEL;
  const requete = (reflechi: boolean) => ({
    model: choisi,
    max_tokens: 16000,
    ...(reflechi ? { thinking: { type: "adaptive" as const } } : {}),
    system: SYSTEM,
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: pdfBase64 } },
          { type: "text" as const, text: "Lis toutes les lignes de ce tableau de bord." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(Lecture) },
  });

  const response = await avecReplisSansReflexion((reflechi) => client.messages.parse(requete(reflechi)));
  if (response.stop_reason === "refusal") throw new Error("Lecture refusée par le modèle.");
  const out = response.parsed_output;
  if (!out) throw new Error("Réponse de lecture illisible.");

  /* Les remarques d'échelle rejoignent celles du modèle : une seule liste, et
     elle se lit avant d'écrire quoi que ce soit en base. */
  const remarques = [...out.remarques];
  for (const l of out.lignes) {
    const h = horsEchelle(l);
    if (h) remarques.push(`${l.pays} ${l.codeEnchere} : ${h}`);
  }
  return { ...recadrerLaSemaine(out, remarques), remarques, modele: choisi };
}

/**
 * LA SEMAINE DÉCLARÉE DOIT CONTENIR LES OPÉRATIONS, SINON CE SONT LES
 * OPÉRATIONS QUI FONT FOI.
 *
 * Mesuré le 14 octobre 2026 sur la campagne des 81 pièces : une lecture a
 * rendu « semaine du 12 au 16 JANVIER 2024 » pour un tableau dont les
 * vingt-deux opérations tombent toutes du 12 au 16 FÉVRIER, et dont le titre
 * dit février. Le mois de l'en-tête a été mal lu, les jours étant les mêmes.
 *
 * L'erreur est bénigne en soi, la semaine n'étant qu'une étiquette, et c'est
 * précisément pourquoi elle est dangereuse : elle a empêché de rattacher les
 * lignes à leur pièce, et une ligne sans sa pièce ne se défend pas. Les dates
 * d'opération, elles, sont la donnée même, lues cellule par cellule et
 * recoupées par les dates de règlement.
 */
function recadrerLaSemaine(out: LectureDeBord, remarques: string[]): LectureDeBord {
  const dates = out.lignes.map((l) => l.operationOn).filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (!dates.length || !out.semaineDu || !out.semaineAu) return out;
  const [debut, fin] = [dates[0], dates[dates.length - 1]];
  /* Un chevauchement suffit : une opération peut se régler la semaine suivante,
     et une semaine peut porter un paiement de la veille. C'est l'absence totale
     de recouvrement qui dénonce une étiquette fausse. */
  if (debut <= out.semaineAu && fin >= out.semaineDu) return out;
  remarques.push(
    `Semaine déclarée « ${out.semaineDu} au ${out.semaineAu} » alors que les ${out.lignes.length} opérations tombent du ${debut} au ${fin} : l'étiquette a été recadrée sur les dates, qui sont la donnée.`,
  );
  return { ...out, semaineDu: debut, semaineAu: fin };
}
