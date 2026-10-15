import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { describe, expect, it } from "vitest";
import { Extraction } from "@/lib/intake/extract";
import { Lecture as LectureAdjudication } from "@/lib/market/auction-extract";
import { Lecture as LectureAvis } from "@/lib/market/notice-extract";

/**
 * Les schémas d'extraction tiennent sous la limite d'unions de l'API.
 *
 * LE DÉFAUT QUE CE CLIQUET EMPÊCHE DE REVENIR. Le 2026-10-01, le premier vrai
 * communiqué arrivé par courrier a rendu ceci, et les quatre suivants aussi :
 *
 *   Schemas contains too many parameters with union types (24 parameters with
 *   type arrays or anyOf). ... limit: 16 parameters with unions
 *
 * Chaque champ `.nullable()` devient une union dans le schéma JSON. L'extracteur
 * d'intake en avait vingt-quatre, donc il échouait à CHAQUE appel, avec un 400
 * que personne ne lisait : les pièces arrivaient dans « À valider » sans un
 * champ proposé, et ça ressemblait à un extracteur médiocre plutôt qu'à un
 * extracteur jamais appelé.
 *
 * `.optional()` dit la même chose sans union : le modèle omet le champ au lieu
 * de le mettre à null, et `nn()` ramène les deux au même undefined.
 *
 * Les trois schémas sont comptés, pas seulement le coupable. Les deux autres
 * étaient à douze et onze : sous la limite, mais près du bord, et c'est
 * exactement la situation où un champ ajouté sans y penser casse la lecture
 * d'un communiqué un lundi matin.
 */
const LIMITE = 16;

/** Un paramètre « union » : un `anyOf`, un `oneOf`, ou un `type` donné en liste. */
function compterUnions(noeud: unknown): number {
  if (!noeud || typeof noeud !== "object") return 0;
  if (Array.isArray(noeud)) return noeud.reduce((n: number, x) => n + compterUnions(x), 0);
  const o = noeud as Record<string, unknown>;
  const ici = Array.isArray(o.anyOf) || Array.isArray(o.oneOf) || Array.isArray(o.type) ? 1 : 0;
  return ici + Object.values(o).reduce((n: number, v) => n + compterUnions(v), 0);
}

/**
 * ET POURQUOI UN SCHEMA A DROIT A DOUZE UNIONS QUAND LES AUTRES EN ONT ZERO.
 *
 * L API pose TROIS limites qui tirent en sens contraire : au plus seize
 * parametres a type union, au plus vingt-quatre parametres facultatifs, et une
 * complexite totale bornee. Le lecteur d adjudications porte vingt-six champs
 * et ne peut en satisfaire que deux a la fois :
 *
 *   tout en « optional » : vingt-six facultatifs, refus en 400 ;
 *   les bornes repliees en listes d objets : « Schema is too complex » ;
 *   tout en « nullable » : douze unions, sous la limite de seize, et VINGT
 *   lectures reussies le 15 octobre 2026, dont celle qui a tranche l unite
 *   guineenne.
 *
 * Le plafond de ce schema est donc son compte mesure, pas zero. Les deux
 * autres restent a zero : ils ont la place, et rien ne justifie qu ils
 * s approchent du bord.
 */
const SCHEMAS = [
  { nom: "intake (communiqué, photo, courriel)", schema: Extraction, plafond: 0 },
  { nom: "adjudication (résultats BEAC)", schema: LectureAdjudication, plafond: 12 },
  { nom: "avis d'émission", schema: LectureAvis, plafond: 0 },
];

describe("les schémas d'extraction tiennent sous la limite de l'API", () => {
  for (const { nom, schema, plafond } of SCHEMAS) {
    it(`${nom} : au plus ${plafond} paramètre(s) à type union`, () => {
      const unions = compterUnions(zodOutputFormat(schema));
      /* DEUX ASSERTIONS, DEUX RAISONS. Seize est la règle de l'API, et la
         dépasser casse tout. Zéro est la marge que la maison se donne : les
         deux lecteurs de marché étaient à douze et onze, sous la limite donc
         ils marchaient, et c'est exactement la situation où un champ ajouté
         sans y penser casse la lecture d'un communiqué un lundi matin. Dire
         seulement « sous seize » laisserait un schéma remonter à quinze sans
         que personne ne s'en aperçoive. */
      expect(unions <= LIMITE ? "sous la limite" : `${nom} : ${unions} paramètres à type union, la limite de l'API est ${LIMITE}`).toBe("sous la limite");
      /* Le plafond est le compte MESURE, jamais un arrondi vers le haut :
         un schéma qui gagne une union doit le faire exprès. */
      expect(unions <= plafond ? "au plafond ou dessous" : `${nom} : ${unions} paramètre(s) à type union, le plafond de ce schéma est ${plafond}`).toBe("au plafond ou dessous");
    });
  }

  it("l'extracteur d'intake n'a plus un seul champ nullable", () => {
    // C'est `"null"` dans un `type` qui fabriquait les vingt-quatre unions.
    expect(JSON.stringify(zodOutputFormat(Extraction))).not.toContain('"null"');
  });

  it("optional retire l'union, pas l'information", () => {
    const format = JSON.stringify(zodOutputFormat(Extraction));
    for (const champ of ["kind", "issuer", "isin", "maturityOn", "deadlineAt", "settleOn", "title", "blurb", "confidence", "remarks"]) {
      expect(format).toContain(`"${champ}"`);
    }
  });
});
