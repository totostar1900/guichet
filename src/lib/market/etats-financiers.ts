import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { avecReplisSansReflexion } from "@/lib/reflexion";
import { z } from "zod";

/**
 * LES COMPTES D'UN ÉMETTEUR, LUS DANS SES ÉTATS FINANCIERS.
 *
 * CE QUE CELA DÉBLOQUE, ET POURQUOI C'EST LA SEULE VOIE. Le ratio cours sur
 * bénéfice est la mesure la plus demandée d'une cote, et la colonne du
 * bénéfice par action du bulletin officiel est VIDE sur les 4 995 lignes
 * d'actions. Le résultat net n'existe nulle part ailleurs que dans ces
 * cinquante pièces, dont trente-huit sont des scans.
 *
 * ON NE DEMANDE QUE SIX CHIFFRES, et c'est délibéré. Un état financier OHADA
 * fait quarante pages ; en réclamer le contenu rendrait des champs que
 * personne ne vérifie et coûterait dix fois plus. Ces six-là suffisent au
 * P/E, au rendement des capitaux propres et à la croissance des bénéfices, et
 * chacun se vérifie à l'œil sur la pièce.
 *
 * DEUX RÉFÉRENTIELS COEXISTENT, ET ILS NE DISENT PAS LA MÊME CHOSE. Plusieurs
 * émetteurs déposent leurs comptes en OHADA ET en IFRS pour le même exercice,
 * avec deux résultats nets différents. On lit ce que la pièce porte et on le
 * nomme ; c'est la page qui choisira, pas le lecteur.
 *
 * LE PIÈGE DE L'UNITÉ, ET IL EST ANNONCÉ. Les états OHADA se présentent
 * souvent « en milliers de FCFA » et parfois « en millions ». Un résultat net
 * lu sans son unité est faux d'un facteur mille, et c'est exactement l'erreur
 * qui a coûté trente mille milliards au Tchad. Le modèle rend donc l'unité
 * telle qu'elle est imprimée, séparément du chiffre.
 */

const MODEL = process.env.AUCTION_READ_MODEL || "claude-opus-5";

const Unite = z.enum(["unite", "millier", "million", "milliard"]);

const Lecture = z.object({
  exercice: z
    .number()
    .nullable()
    .describe("L'année de l'exercice clos que ces comptes arrêtent, telle qu'imprimée. « Exercice clos le 31 décembre 2023 » se rend 2023."),
  referentiel: z.enum(["OHADA", "IFRS", "autre"]).describe("Le référentiel comptable annoncé par la pièce."),
  /**
   * L'UNITÉ EST UN CHAMP, PAS UNE CONVENTION. Elle est imprimée en tête de
   * tableau, « en milliers de FCFA », et l'oublier fausse tout d'un facteur
   * mille sans que rien ne le signale.
   */
  unite: Unite.describe("L'unité dans laquelle les tableaux sont présentés, telle qu'imprimée en tête : « en milliers de FCFA » se rend millier."),
  resultatNet: z
    .number()
    .nullable()
    .describe("Le RÉSULTAT NET de l'exercice, dans l'unité ci-dessus, signe compris. En OHADA c'est la ligne « XI RESULTAT NET » du compte de résultat. Une perte est négative."),
  capitauxPropres: z.number().nullable().describe("Le TOTAL DES CAPITAUX PROPRES au bilan, dans la même unité. En OHADA, la ligne « CP TOTAL CAPITAUX PROPRES ET RESSOURCES ASSIMILEES »."),
  chiffreAffaires: z.number().nullable().describe("Le chiffre d'affaires de l'exercice, dans la même unité. Pour une banque, le produit net bancaire."),
  nombreActions: z.number().nullable().describe("Le nombre d'actions composant le capital, EN UNITÉS et jamais en milliers. Souvent dans les notes ou en tête du bilan. Absent le plus souvent : rendre null."),
  resultatParAction: z.number().nullable().describe("Le résultat par action, en francs par action, s'il est IMPRIMÉ. Ne jamais le calculer soi-même : s'il n'est pas écrit, rendre null."),
  /** L'exercice précédent, que tout état financier rappelle en colonne N-1. */
  resultatNetPrecedent: z.number().nullable().describe("Le résultat net de l'exercice PRÉCÉDENT, tel que la colonne de comparaison l'imprime, dans la même unité."),
  remarques: z.array(z.string()).describe("Ce qui empêche de lire une ligne, ou ce qui paraît contradictoire. Vide si tout est net."),
});

export type LectureDesComptes = z.infer<typeof Lecture>;

const SYSTEM = `Tu lis les ÉTATS FINANCIERS ANNUELS d'une société cotée à la BVMAC, en zone CEMAC.

C'est souvent un scan de plusieurs dizaines de pages : page de garde, rapport du commissaire aux comptes, bilan, compte de résultat, tableau des flux, puis des notes. Tu ne cherches que six chiffres, dans le BILAN et le COMPTE DE RÉSULTAT.

CINQ RÈGLES, ET ELLES COMPTENT PLUS QUE LA VITESSE.

L'UNITÉ EST IMPRIMÉE EN TÊTE DE TABLEAU et elle décide de tout. « en milliers de FCFA », « en millions de FCFA » : rends-la telle quelle dans le champ unite, et rends les chiffres SANS la convertir. Un résultat net rendu sans son unité est faux d'un facteur mille.

LA COLONNE DE L'EXERCICE EST LA PREMIÈRE, celle de l'exercice précédent la seconde. Un état financier les met côte à côte ; prendre la mauvaise colonne donne les comptes de l'an dernier avec la date de cette année.

EN OHADA, LE RÉSULTAT NET EST LA LIGNE « XI » du compte de résultat, parfois écrite « RESULTAT NET DE L'EXERCICE ». Les capitaux propres sont la ligne « CP » du passif. En IFRS, « Résultat net de l'exercice » et « Total des capitaux propres ».

UNE PERTE EST NÉGATIVE. Elle s'imprime souvent entre parenthèses ou avec un signe moins devant : rends un nombre négatif.

N'INVENTE RIEN. Si une ligne n'est pas lisible, rends null et dis-le dans remarques. Ne calcule jamais un résultat par action que la pièce n'imprime pas.`;

/**
 * LES BORNES D'UN COMPTE, PRISES SUR LA COTE ELLE-MÊME.
 *
 * La plus grosse société cotée capitalise 1 311 milliards et la plus petite
 * dix. Un résultat net de mille milliards ou de dix francs n'est donc pas un
 * résultat, c'est une unité mal lue ou une colonne prise de travers. Le garde
 * est volontairement large : il n'attrape que l'absurde.
 */
export function invraisemblances(l: LectureDesComptes): string[] {
  const out: string[] = [];
  const facteur = { unite: 1, millier: 1e3, million: 1e6, milliard: 1e9 }[l.unite];
  const enFrancs = (v: number | null) => (v == null ? null : v * facteur);
  const rn = enFrancs(l.resultatNet);
  const cp = enFrancs(l.capitauxPropres);
  if (rn != null && Math.abs(rn) > 2e12) out.push(`résultat net de ${(rn / 1e9).toFixed(0)} milliards : au-delà de deux mille, c'est une unité mal lue.`);
  if (rn != null && rn !== 0 && Math.abs(rn) < 1e5) out.push(`résultat net de ${rn} francs : en deçà de cent mille, c'est une unité mal lue.`);
  if (cp != null && cp < 0) out.push(`capitaux propres négatifs de ${(cp / 1e9).toFixed(1)} milliards : vérifier, c'est possible mais rare.`);
  if (cp != null && rn != null && cp !== 0 && Math.abs(rn) > Math.abs(cp) * 2) {
    out.push(`un résultat net de ${(rn / 1e9).toFixed(1)} milliards pour ${(cp / 1e9).toFixed(1)} de capitaux propres : les deux colonnes ont pu être échangées.`);
  }
  /* UN RESULTAT NET AU-DESSUS DU CHIFFRE D AFFAIRES N EST PAS IMPOSSIBLE,
     IL EST RARE. Une holding encaisse des dividendes que sa ligne « chiffre
     d affaires » ne porte pas : BGFI rend 59,5 milliards de resultat pour
     30,3 de produits, et c est le compte social, pas le consolide. La
     remarque le dit plutot que de choisir a la place du lecteur. */
  const ca = enFrancs(l.chiffreAffaires);
  if (rn != null && ca != null && ca > 0 && rn > ca) {
    out.push(`resultat net de ${(rn / 1e9).toFixed(1)} milliards pour ${(ca / 1e9).toFixed(1)} de produits : comptes sociaux d une holding, ou ligne mal prise.`);
  }
  if (l.exercice != null && (l.exercice < 2010 || l.exercice > new Date().getFullYear())) out.push(`exercice ${l.exercice} : hors de la période où cette cote existe.`);
  return out;
}

/** Le montant en francs, une fois l'unité appliquée. */
export const enFrancs = (v: number | null | undefined, unite: LectureDesComptes["unite"]): number | undefined =>
  v == null ? undefined : v * { unite: 1, millier: 1e3, million: 1e6, milliard: 1e9 }[unite];

/**
 * ON REND AUSSI LES JETONS CONSOMMÉS, parce qu'un coût se mesure et ne se
 * suppose pas. Quarante-huit états financiers de quarante pages ne se lancent
 * pas sans avoir chiffré les trois premiers.
 */
export async function lireLesComptes(pdfBase64: string, modele?: string): Promise<LectureDesComptes & { modele: string; jetons: { entree: number; sortie: number } }> {
  const client = new Anthropic();
  const choisi = modele ?? MODEL;
  const requete = (reflechi: boolean) => ({
    model: choisi,
    max_tokens: 4000,
    ...(reflechi ? { thinking: { type: "adaptive" as const } } : {}),
    system: SYSTEM,
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: pdfBase64 } },
          { type: "text" as const, text: "Rends les six chiffres du bilan et du compte de résultat." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(Lecture) },
  });

  const response = await avecReplisSansReflexion((reflechi) => client.messages.parse(requete(reflechi)));
  if (response.stop_reason === "refusal") throw new Error("Lecture refusée par le modèle.");
  const out = response.parsed_output;
  if (!out) throw new Error("Réponse de lecture illisible.");
  return { ...out, remarques: [...out.remarques, ...invraisemblances(out)], modele: choisi, jetons: { entree: response.usage.input_tokens, sortie: response.usage.output_tokens } };
}
