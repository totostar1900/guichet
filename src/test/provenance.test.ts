import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RACINE } from "./racine";

/**
 * LA MAISON NE SE JUSTIFIE PLUS DANS CHAQUE ÉCRAN.
 *
 * DEMANDÉ LE 28 OCTOBRE 2026 : « retirer les informations sur qui publie et
 * l'origine de la donnée partout dans l'application, et prévoir une note
 * d'information dans un lieu approprié ».
 *
 * CE QUI ENCOMBRAIT. Un tampon de prix disait « Clôture BVMAC · Bulletin
 * Officiel de la Cote n° 2625 du 27 oct. 2026 » ; deux tableaux de chiffres
 * portaient une colonne « Bulletin » ; la carte d'un émetteur citait sa
 * source et ses graphies ; la page de l'indice, celle du marché et celle des
 * sociétés nommaient le bulletin six fois. Le lecteur venait chercher un
 * cours ; on lui prouvait d'abord qu'on ne l'avait pas inventé.
 *
 * LA RÈGLE, ET SA LIMITE EXACTE :
 *
 *   SORT — qui publie le chiffre et dans quel document il a été lu : le nom
 *   du publicateur, le numéro du bulletin, « Source : … », « publiée par … ».
 *
 *   RESTE — la DATE du chiffre, qui n'est pas une provenance mais sa
 *   fraîcheur ; et le nom du marché quand il dit OÙ une ligne se traite
 *   (« cotée à la BVMAC », « adjudication BEAC »), qui est une propriété du
 *   titre et non l'origine de notre donnée. Les retirer ferait mentir la
 *   fiche sur ce qu'elle vend.
 *
 * LA NOTE UNIQUE vit dans l'aide du client, à l'endroit où l'on vient poser
 * la question, et la recherche y mène. Le desk, lui, garde tout : le numéro
 * d'un bulletin est ce avec quoi il rapproche ses lignes.
 */
const MOTS: [RegExp, string][] = [
  [/[Bb]ulletin [Oo]fficiel/, "nomme le bulletin officiel"],
  [/BOC n°/, "affiche un numéro de bulletin"],
  /* LA COLONNE « Bulletin » DES TABLEAUX DE CHIFFRES, qui disait de quel
     document chaque ligne était tirée. Le motif vise l'étiquette seule :
     le bulletin de souscription que le client SIGNE est une pièce, pas une
     source, et il se nomme ailleurs autrement. */
  [/t\("Bulletin"\)/, "garde une colonne « Bulletin »"],
  [/Espace émetteurs/, "cite l'espace émetteurs"],
  /* LE MOTIF NE VISE QUE LE PUBLICATEUR DE NOS CHIFFRES. « la performance
     publiée par un fonds » oppose le rendement du client à celui d'un porteur
     type : ce n'est pas une provenance, et un motif trop large la condamnait. */
  [/publiée[s]? par (la |le |l')?(BVMAC|BEAC|société de gestion|dépositaire|bourse)/i, "dit qui publie le chiffre"],
  [/communiquées par/, "dit qui communique le chiffre"],
  [/t\("Source"\)|Source : /, "porte une ligne « Source »"],
  [/déposés par .{0,40}auprès de/, "dit où les documents sont déposés"],
];

/**
 * UNE NOTE PUBLIÉE N'EST PAS UN ÉCRAN : ELLE CITE SES SOURCES.
 *
 * Arrêté le 28 octobre 2026, après avoir retiré la ligne « Source » de la note
 * trimestrielle sur l'indice et l'avoir signalé comme un point de jugement.
 * La règle qui en sort tient en deux phrases :
 *
 *   UN ÉCRAN QUI MONTRE UN CHIFFRE ne justifie pas d'où il vient : le lecteur
 *   vient chercher un cours, pas une preuve.
 *
 *   UNE NOTE QU'ON PUBLIE cite ses sources, parce qu'elle est un travail
 *   d'analyse qu'un tiers doit pouvoir refaire. C'est l'usage, et le retirer
 *   n'allègerait rien : une note se lit d'un bout à l'autre, une fois.
 */
const NOTES_PUBLIEES = ["/indice/note/"];

/** Les sources du client : le desk garde sa provenance, elle lui sert à rapprocher. */
function surfacesDuClient(dir: string): string[] {
  if (dir.endsWith("/desk") || NOTES_PUBLIEES.some((n) => dir.includes(n))) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = `${dir}/${e.name}`;
    return e.isDirectory() ? surfacesDuClient(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/* Les commentaires expliquent le défaut retiré et citent donc ses mots : sans
   ce nettoyage, le relevé se prendrait à son propre récit. C'est arrivé trois
   fois dans cette maison. */
const sansNotes = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("la provenance des chiffres", () => {
  const fichiers = [...surfacesDuClient(`${RACINE}/src/app`), ...surfacesDuClient(`${RACINE}/src/components`)];

  it("ne se lit plus dans les écrans du client", () => {
    expect(fichiers.length, "aucun fichier balayé : le relevé ne mesure rien").toBeGreaterThan(200);
    const fautifs: string[] = [];
    for (const f of fichiers) {
      const src = sansNotes(readFileSync(f, "utf8"));
      for (const [motif, dit] of MOTS) if (motif.test(src)) fautifs.push(`${f.slice(RACINE.length + 1)} ${dit}`);
    }
    expect(fautifs, `ces écrans justifient encore d'où vient leur donnée :\n${fautifs.join("\n")}`).toEqual([]);
  });

  it("mais la question a sa réponse, une fois, dans l'aide du client", () => {
    /* UNE RÈGLE QUI RETIRE SANS REMPLACER EST UN APPAUVRISSEMENT. Le lecteur
       qui veut savoir d'où viennent les chiffres doit le trouver quelque part,
       et ce quelque part doit être celui où il pose ses questions. */
    const aide = readFileSync(`${RACINE}/src/data/docs/aide.ts`, "utf8");
    expect(aide, "la note sur la provenance a disparu de l'aide").toMatch(/D'où viennent les chiffres de Guichet \?/);
    expect(aide, "la note ne dit plus où le lecteur peut obtenir l'origine d'un chiffre précis").toMatch(/demandez-la au desk/);
    /* UNE SEULE RÉPONSE, ET C'EST LA LEÇON DU JOUR : l'aide en portait déjà
       une, « D'où viennent les cours et les valeurs liquidatives ? », dans le
       chapitre de l'entretien. Deux réponses au même endroit du même sujet se
       contredisent tôt ou tard, et le lecteur ne sait pas laquelle fait foi. */
    expect(aide.match(/D'où viennent/g)?.length ?? 0, "deux réponses pour une même question").toBe(1);
  });

  it("laisse la date du chiffre, qui n'est pas une provenance", () => {
    /* SANS ELLE, LE LECTEUR NE SAIT PLUS DE QUAND DATE LE COURS QU'IL REGARDE,
       et c'est la seule chose dont il a besoin pour décider. Le tampon de la
       fiche est l'endroit où cela se joue. */
    const fiche = sansNotes(readFileSync(`${RACINE}/src/app/offres/[id]/FicheReading.tsx`, "utf8"));
    expect(fiche, "le tampon ne porte plus la date de la séance").toMatch(/Clôture du \$\{fmtDate\(quotes\[0\]\.sessionDate\)\}/);
    expect(fiche, "la VL ne porte plus sa date").toMatch(/VL du \$\{fmtDate\(o\.fund\.navDate\)\}/);
  });
});

describe("les notes publiées, elles, citent leurs sources", () => {
  /* L'AUTRE MOITIÉ DE LA RÈGLE, et sans elle la première se lirait comme un
     effacement. Une note trimestrielle est un travail d'analyse : qui veut la
     refaire doit savoir sur quoi elle est bâtie. L'exemption accordée plus
     haut serait un trou si rien ne vérifiait qu'elle sert à quelque chose. */
  const note = () => readFileSync(`${RACINE}/src/app/indice/note/[trimestre]/page.tsx`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("la note trimestrielle sur l'indice dit d'où viennent ses chiffres", () => {
    expect(note(), "la note ne porte plus de ligne « Source »").toMatch(/<b>\{t\("Source"\)\}<\/b>/);
    expect(note(), "la source nommée a disparu de la note").toMatch(/Bulletin officiel de la cote de la BVMAC/);
    expect(note(), "la méthode ne dit plus sur quel document les poids sont calculés").toMatch(/page des capitalisations du même bulletin/);
  });
});
