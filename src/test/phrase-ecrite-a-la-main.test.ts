import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

/**
 * UNE PHRASE ÉCRITE À LA MAIN NE SE TIENT PAS SUR UNE LIGNE.
 *
 * TROUVÉ LE 29 OCTOBRE 2026, en vérifiant tout autre chose. Sur « La
 * sélection du desk », le MOTIF — la seule chose de la bande qu'un calcul ne
 * produit pas, écrite par une personne du desk — portait
 * « white-space: nowrap ». Mesuré au navigateur à 390 px : la phrase
 * réclamait 551 px pour 390 disponibles, et le parent la coupait net, sans
 * ellipse et sans aucun signe qu'il en manquait. Le lecteur recevait
 * « Retenue pour sa durée : cinq ans, entre les bons à treize semaines ( »
 * et croyait avoir tout lu.
 *
 * COMMENT C'EST ARRIVÉ, ET POURQUOI ÇA REVIENDRA SI RIEN NE LE RETIENT : le
 * « nowrap » a du sens pour les VOISINS du motif. Un taux coupé en deux
 * lignes — « 7,00 » puis « % » — est illisible, une échéance aussi. Ces
 * valeurs tiennent en huit caractères. Le motif en fait quatre-vingts. La
 * règle a été recopiée d'une cellule à sa voisine sans que la longueur soit
 * regardée, et c'est le genre de copie qu'on refait sans y penser.
 *
 * CE QUE L'ÉPREUVE GARDE N'EST DONC PAS UNE DÉCLARATION MAIS UNE
 * DISTINCTION : ce qui porte une VALEUR courte peut refuser la coupure ; ce
 * qui porte une PHRASE doit l'accepter. Une phrase tronquée en silence est
 * pire qu'une phrase absente — on ne sait pas qu'on a perdu quelque chose.
 */
const CLASSES_DE_PHRASE: Record<string, string[]> = {
  "src/components/SelectionDuDesk.module.css": ["motif"],
};

/** Le corps d'une règle « .classe { … } », sans ce qui la commente. */
function corps(css: string, classe: string): string | null {
  const sansCommentaires = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const m = sansCommentaires.match(new RegExp(`\\.${classe}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : null;
}

describe("une phrase écrite à la main se lit en entier", () => {
  it("vise des règles qui existent", () => {
    /* UNE ÉPREUVE QUI VISE UNE CLASSE RENOMMÉE ne protège plus rien et se lit
       comme si elle protégeait quelque chose. */
    const fantomes: string[] = [];
    for (const [f, classes] of Object.entries(CLASSES_DE_PHRASE)) {
      const css = lire(f);
      for (const c of classes) if (corps(css, c) === null) fantomes.push(`${f} : .${c}`);
    }
    expect(fantomes, "ces règles n'existent plus : l'épreuve ne garde rien\n  " + fantomes.join("\n  ")).toEqual([]);
    expect(Object.keys(CLASSES_DE_PHRASE).length, "plus aucune phrase surveillée").toBeGreaterThan(0);
  });

  it("ne tient aucune phrase sur une seule ligne", () => {
    const fautes: string[] = [];
    for (const [f, classes] of Object.entries(CLASSES_DE_PHRASE)) {
      const css = lire(f);
      for (const c of classes) {
        const regle = corps(css, c) ?? "";
        if (/white-space\s*:\s*nowrap/.test(regle)) fautes.push(`${f} : .${c} tient sa phrase sur une ligne`);
        /* « text-overflow: ellipsis » dirait au moins qu'il en manque, mais
           il ne rend pas la phrase pour autant : une citation du desk se lit
           ou ne se publie pas. */
        if (/text-overflow\s*:\s*ellipsis/.test(regle)) fautes.push(`${f} : .${c} abrège sa phrase au lieu de la rendre`);
      }
    }
    expect(fautes, "une phrase écrite par une personne est coupée par la mise en page :\n  " + fautes.join("\n  ")).toEqual([]);
  });

  it("laisse les valeurs courtes refuser la coupure", () => {
    /* L'AUTRE MOITIÉ, sans quoi la prochaine lecture retirerait « nowrap »
       partout et couperait « 7,00 » de son « % ». Le chiffre et l'échéance
       de cette même bande le gardent, et c'est voulu. */
    const css = lire("src/components/SelectionDuDesk.module.css");
    for (const c of ["chiffre", "quand"]) {
      expect(corps(css, c) ?? "", `.${c} accepte maintenant la coupure : une valeur courte se lit d'un bloc`).toMatch(/white-space\s*:\s*nowrap/);
    }
  });
});
