import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { avecReplisSansReflexion } from "@/lib/reflexion";
import { z } from "zod";
import { horsEchelle } from "./tableau-de-bord";

/**
 * LE RAPPORT HEBDOMADAIRE : LE RÉALISÉ, LÀ OÙ LE TABLEAU DE BORD DONNE LE PRÉVU.
 *
 * Quatre-vingt-sept rapports dormaient sur le disque sans que personne les
 * ouvre, rangés parmi trois cent cinquante-cinq « autres communiqués ». Ils
 * sont publiés par la même cellule que le tableau de bord, une semaine après
 * lui, et portent les DEUX colonnes :
 *
 *   montants mis en adjudication / à rembourser / intérêts à payer   le prévu
 *   montants levés / remboursés / intérêts payés                     le réalisé
 *
 * plus, pour chaque émission, ce qu'un communiqué de résultats porte : taux de
 * participation des SVT, taux de souscription, taux ou prix moyen pondéré,
 * marginal, minimum et maximum, et les observations (« l'émission a été
 * déclarée infructueuse »).
 *
 * CE QUE CELA RÈGLE. Nous avons 249 communiqués de résultats sur les 536
 * levées que le livre des mouvements montre, et j'ai dit à Georges que les
 * 454 manquantes n'existaient nulle part : c'était faux. Elles sont ici, sous
 * une autre forme, sur une page que le robot ne lisait pas.
 *
 * UNE COLONNE POUR DEUX UNITÉS, ET C'EST LA SOURCE QUI LE VEUT : « taux ou
 * prix » moyen, marginal, minimum, maximum. Un bon s'adjuge à un taux, une
 * obligation à un prix, et le rapport les met dans la même colonne comme le
 * faisait notre table avant qu'on la sépare. On rend donc le nombre tel quel
 * et l'instrument dit comment le lire : convertir à la lecture ferait perdre
 * ce que la pièce imprime.
 */

const MODEL = process.env.AUCTION_READ_MODEL || "claude-opus-5";

const PAYS = ["Cameroun", "Centrafrique", "Congo", "Gabon", "Guinée éq.", "Tchad"] as const;
const Operation = z.enum(["emission", "abondement", "remboursement", "paiement_interets", "rachat", "autre"]);

const Ligne = z.object({
  pays: z.enum(PAYS).describe("Colonne TRESORS PUBLICS. « CENTRAFRIQUE » se rend « Centrafrique », « GUINEE EQUATORIALE » se rend « Guinée éq. »."),
  instrument: z.enum(["BTA", "OTA"]).nullable().describe("Colonne INSTRUMENTS."),
  tenor: z.string().nullable().describe("La durée telle qu'écrite : « 5 ans », « 26 semaines »."),
  codeEnchere: z.string().describe("La cellule CODES ENCHERES entière, telle qu'imprimée."),
  codeEmission: z.string().nullable().describe("Le code seul, au début de la cellule : « CM2B00000202 »."),
  couponRate: z.number().nullable().describe("Le taux imprimé dans la cellule du code, en pour cent. Absent pour un bon."),
  maturityOn: z.string().nullable().describe("L'échéance imprimée dans la cellule du code, en AAAA-MM-JJ."),
  operation: Operation.describe(
    "TYPES D'OPERATIONS. « EMISSION PAR ADJUDICATION » se rend emission ; « ABONDEMENT » abondement ; « REMBOURSEMENTS » remboursement ; « PAIEMENT D'INTERETS » paiement_interets ; « RACHAT PAR ADJUDICATION » rachat ; tout autre libellé, autre.",
  ),
  montantPrevu: z.number().nullable().describe("Colonne MONTANTS MIS EN ADJUDICATION / A REMBOURSER / INTERETS A PAYER, en francs."),
  montantRealise: z.number().nullable().describe("Colonne MONTANTS LEVES / REMBOURSES / INTERETS PAYES, en francs. Un tiret se rend null, pas zéro."),
  tauxParticipation: z.number().nullable().describe("TAUX DE PARTICIPATION DES SVT, en pour cent : « 22,7273% » se rend 22.7273."),
  tauxSouscription: z.number().nullable().describe("TAUX DE SOUSCRIPTION, en pour cent."),
  tauxPrixMoyen: z.number().nullable().describe("TAUX OU PRIX MOYEN PONDERE, tel quel : un taux pour un bon, un prix pour une obligation."),
  tauxPrixMarginal: z.number().nullable().describe("TAUX OU PRIX MARGINAL, tel quel."),
  tauxPrixMin: z.number().nullable().describe("TAUX OU PRIX MINIMUM, tel quel."),
  tauxPrixMax: z.number().nullable().describe("TAUX OU PRIX MAXIMUM, tel quel."),
  observations: z.string().nullable().describe("La colonne OBSERVATIONS, par exemple « l'émission a été déclarée infructueuse »."),
});

const Lecture = z.object({
  semaineDu: z.string().nullable().describe("Le premier jour de la semaine annoncée dans le titre, en AAAA-MM-JJ."),
  semaineAu: z.string().nullable().describe("Le dernier jour de la semaine annoncée, en AAAA-MM-JJ."),
  lignes: z.array(Ligne).describe("Toutes les lignes du tableau, dans l'ordre, sur TOUTES les pages."),
  remarques: z.array(z.string()).describe("Ce qui empêche de lire une cellule, ou ce qui paraît contradictoire. Vide si tout est net."),
});

export type LigneDeRapport = z.infer<typeof Ligne>;
export type LectureDeRapport = z.infer<typeof Lecture>;

const SYSTEM = `Tu lis le RAPPORT HEBDOMADAIRE DES OPERATIONS DU MARCHE DES VALEURS DU TRESOR DE LA CEMAC, publié par la BEAC.

C'est un scan. Le tableau a douze colonnes : TRESORS PUBLICS, INSTRUMENTS, CODES ENCHERES, TYPES D'OPERATIONS, MONTANTS MIS EN ADJUDICATION / A REMBOURSER / INTERETS A PAYER, MONTANTS LEVES / REMBOURSES / INTERETS PAYES, TAUX DE PARTICIPATION DES SVT, TAUX DE SOUSCRIPTION, TAUX OU PRIX MOYEN PONDERE, TAUX OU PRIX MARGINAL, TAUX OU PRIX MINIMUM, TAUX OU PRIX MAXIMUM, OBSERVATIONS. Il continue souvent sur plusieurs pages, avec le même en-tête.

QUATRE RÈGLES, ET ELLES COMPTENT PLUS QUE LA VITESSE.

La colonne du pays est FUSIONNÉE sur plusieurs lignes : une cellule « CONGO » qui couvre huit lignes veut dire que ces huit lignes sont congolaises. Reporte le pays sur chacune.

LES DEUX COLONNES DE MONTANTS NE SE CONFONDENT PAS. La première est ce qui était prévu, la seconde ce qui a eu lieu. Elles diffèrent souvent : 15 000 000 000 mis en adjudication pour 10 000 000 000 levés.

Les montants sont EN FRANCS. Ne convertis jamais, ne divise jamais.

Un tiret « - » dans une cellule veut dire que la colonne ne s'applique pas : rends null, jamais zéro. Un paiement d'intérêts n'a ni taux de souscription ni prix marginal.

Si une cellule est illisible, rends null et dis-le dans remarques. N'invente aucun chiffre. Rends TOUTES les lignes de TOUTES les pages.`;

/**
 * LE GARDE QUI VIENT DE LA PIÈCE ELLE-MÊME.
 *
 * Un taux de souscription est le rapport des soumissions au montant annoncé :
 * il peut dépasser cent, et il le fait souvent, mais pas mille. Un taux de
 * participation est une part de réseau, donc borné à cent. Les deux sont
 * imprimés, donc vérifiables sans rien supposer.
 */
export function invraisemblances(l: LigneDeRapport): string[] {
  const out: string[] = [];
  const h = horsEchelle({ ...l, montant: l.montantRealise ?? l.montantPrevu } as never);
  if (h) out.push(h);
  if (l.tauxParticipation != null && (l.tauxParticipation < 0 || l.tauxParticipation > 100)) {
    out.push(`taux de participation de ${l.tauxParticipation} % : une part de réseau ne dépasse pas cent.`);
  }
  if (l.tauxSouscription != null && (l.tauxSouscription < 0 || l.tauxSouscription > 1000)) {
    out.push(`taux de souscription de ${l.tauxSouscription} % : au-delà de mille, c'est une cellule mal lue.`);
  }
  /* LE REALISE NE DEPASSE PAS LE PREVU, SAUF ABONDEMENT. Un Trésor sert au
     plus ce qu'il a annoncé ; au-delà, c'est que les deux colonnes ont été
     échangées, ce qui ne se voit pas autrement. */
  if (l.operation === "emission" && l.montantPrevu != null && l.montantRealise != null && l.montantRealise > l.montantPrevu * 1.001) {
    out.push(`${(l.montantRealise / 1e9).toFixed(1)} Mds levés pour ${(l.montantPrevu / 1e9).toFixed(1)} annoncés : les deux colonnes ont pu être échangées.`);
  }
  return out;
}

/**
 * ON REND AUSSI LES JETONS CONSOMMES, parce qu un coût se mesure et ne se
 * suppose pas. Comparer deux modèles sur la même pièce sans compter ce que
 * chacun consomme, c est comparer une qualité sans son prix.
 */
export async function lireRapportHebdomadaire(pdfBase64: string, modele?: string): Promise<LectureDeRapport & { modele: string; jetons: { entree: number; sortie: number } }> {
  const client = new Anthropic();
  const choisi = modele ?? MODEL;
  const requete = (reflechi: boolean) => ({
    model: choisi,
    max_tokens: 20000,
    ...(reflechi ? { thinking: { type: "adaptive" as const } } : {}),
    system: SYSTEM,
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: pdfBase64 } },
          { type: "text" as const, text: "Lis toutes les lignes de ce rapport." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(Lecture) },
  });

  const response = await avecReplisSansReflexion((reflechi) => client.messages.parse(requete(reflechi)));
  if (response.stop_reason === "refusal") throw new Error("Lecture refusée par le modèle.");
  const out = response.parsed_output;
  if (!out) throw new Error("Réponse de lecture illisible.");

  const remarques = [...out.remarques];
  for (const l of out.lignes) for (const x of invraisemblances(l)) remarques.push(`${l.pays} ${l.codeEnchere} : ${x}`);
  return { ...out, remarques, modele: choisi, jetons: { entree: response.usage.input_tokens, sortie: response.usage.output_tokens } };
}
