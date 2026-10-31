import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

/**
 * UNE CLAUSE DE PRÉSENCE DOIT SAVOIR CE QU'ELLE A TROUVÉ.
 *
 * ─── Le défaut, et il s'est produit onze fois ──────────────────────────────
 *
 * Une épreuve lit un fichier et exige qu'un mot y soit :
 *
 *     expect(src).toContain("enAttenteDOuverture");
 *
 * Elle croit garder le garde-fou qui refuse de transmettre un ordre sur titre
 * sans sous-compte ouvert. Elle garde en réalité le MOT, et ce mot est écrit
 * deux fois : à la ligne d'import, et au « if » qui l'appelle. Retirez le
 * « if » — le garde-fou désarmé, tout ordre transmis au marché sans compte —
 * et la clause reste VERTE, parce que l'import survit. Un import ne fait rien.
 *
 * RELEVÉ LES 31 OCTOBRE ET 1er NOVEMBRE 2026. Deux clauses sont tombées dans
 * ce piège en vérifiant à l'envers la revue du marché ; cherché partout
 * ailleurs, le motif était ONZE FOIS dans la suite. Ce qu'elles laissaient
 * passer n'avait rien de cosmétique : le garde-fou ci-dessus, le refus d'une
 * personne hors dossier (c'est-à-dire la procuration par la porte de
 * service), une convention qui se ré-accepte, le compte rendu qui cesse de
 * dire au desk quels ordres dépassent le plafond signé, l'écran de signature
 * qui ne dit plus qu'une provision suffisante dispense du virement.
 *
 * ─── Ce que cette feuille tient ────────────────────────────────────────────
 *
 * LE JETON D'UNE CLAUSE DE PRÉSENCE NE PARAÎT QU'UNE FOIS DANS LE FICHIER
 * QU'ELLE LIT. Deux fois, la clause ne sait pas laquelle des deux elle a
 * trouvée — et c'est une propriété de la clause, pas une question de chance :
 * elle restera verte le jour où l'une des deux partira, quelle qu'elle soit.
 *
 * LA SORTIE N'EST PAS UNE TOLÉRANCE, C'EST UNE PRÉCISION. On ne dresse pas
 * la liste des duplications acceptables : on écrit la clause de façon qu'elle
 * désigne le geste. « toContain("MenuRecherche") » devient
 * « toMatch(/<MenuRecherche\b/) » ; « toContain("enAttenteDOuverture") »
 * devient « toMatch(/if \(enAttenteDOuverture\(/) ». C'est trois caractères
 * de plus et cela change ce que l'épreuve voit. Zéro se défend mieux qu'un
 * nombre : un nombre demande qu'on sache pourquoi il vaut celui-là.
 *
 * ─── Ce qu'elle NE voit pas, et il faut le dire ────────────────────────────
 *
 * ELLE NE LIT QUE DEUX FORMES : le sujet lié à la lecture d'un fichier entier
 * — « const src = lire("…") » — et la lecture écrite dans l'expect même.
 *
 * Hors de portée, et assumé :
 *
 *   LES TRANCHES. « const bloc = src.slice(…) » lit une PARTIE du fichier ;
 *   un jeton écrit deux fois dans le fichier peut n'y figurer qu'une. Les
 *   compter ferait de faux rouges, et un faux rouge finit désarmé. C'est
 *   l'autre motif de vacuité — une tranche qui ne couvre pas ce qu'elle
 *   annonce — et il se vérifie à la main, en mutant le geste.
 *
 *   LES VALEURS CALCULÉES. « expect(v.raison).toContain("…") » ne lit aucun
 *   fichier : c'est une épreuve de domaine, et le motif ne la concerne pas.
 *
 *   « toMatch ». Une expression régulière n'a pas de jeton à compter. C'est
 *   d'ailleurs la forme vers laquelle on corrige, et c'est voulu : elle
 *   oblige à écrire la syntaxe autour du mot.
 */

/** Ce qu'une clause de présence exige, et d'où. */
export interface ClauseDePresence {
  ligne: number;
  jeton: string;
  cible: string;
  /** Le nombre de fois que le jeton paraît dans le fichier lu. */
  n: number;
}

/**
 * Les clauses de présence d'une épreuve, résolues jusqu'au fichier qu'elles
 * lisent.
 *
 * `lire` est passé plutôt que pris du disque : c'est ce qui rend cette
 * fonction PURE, donc éprouvable sur un cas écrit à la main. Sans cela, sa
 * non-vacuité dépendrait de l'état du dépôt — et un relevé qui ne trouve
 * plus rien rend « aucune clause fautive », ce qui est exactement la panne
 * qu'il est censé décrire.
 */
export function clausesDePresence(source: string, lire: (chemin: string) => string | null): ClauseDePresence[] {
  /* LES LIAISONS : « const src = lire("chemin") », sous les quelques noms que
     les épreuves de cette maison donnent à leur lecteur de fichier. */
  const liaisons = new Map<string, string>();
  for (const m of source.matchAll(/const\s+(\w+)\s*=\s*(?:lire|code|texte|source|lit)\(\s*"([^"]+)"/g)) liaisons.set(m[1], m[2]);
  for (const m of source.matchAll(/const\s+(\w+)\s*=\s*readFileSync\(\s*(?:join\([^,]+,\s*)?"([^"]+)"/g)) liaisons.set(m[1], m[2]);

  const out: ClauseDePresence[] = [];
  const compter = (cible: string, jeton: string, ligne: number) => {
    const contenu = lire(cible);
    if (contenu == null) return;
    /* UN JETON TROP COURT n'apprend rien : « ok », « id » paraissent partout
       et le relevé ne ferait que du bruit. */
    if (jeton.length < 4) return;
    out.push({ ligne, jeton, cible, n: contenu.split(jeton).length - 1 });
  };

  source.split("\n").forEach((l, i) => {
    /* LE SUJET LIÉ : expect(src, "…").toContain("…") */
    const lie = /expect\(\s*(\w+)\s*(?:,[^)]*)?\)\s*\.toContain\("((?:[^"\\]|\\.)+)"\)/.exec(l);
    if (lie && liaisons.has(lie[1])) compter(liaisons.get(lie[1])!, dechapper(lie[2]), i + 1);
    /* LA LECTURE ÉCRITE DANS L'EXPECT : expect(lire("…")).toContain("…") */
    const direct = /expect\(\s*(?:lire|code|texte|readFileSync)\(\s*"([^"]+)"[^)]*\)\s*(?:,[^)]*)?\)\s*\.toContain\("((?:[^"\\]|\\.)+)"\)/.exec(l);
    if (direct) compter(direct[1], dechapper(direct[2]), i + 1);
  });
  return out;
}

/** Le jeton tel que le fichier le porte : l'épreuve l'écrit échappé. */
const dechapper = (s: string) => s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

const epreuves = () => readdirSync(join(ROOT, "src/test")).filter((f) => f.endsWith(".test.ts"));
const lireDuDepot = (chemin: string): string | null => {
  try {
    return readFileSync(join(ROOT, chemin), "utf8");
  } catch {
    return null;
  }
};

describe("une clause de présence sait ce qu'elle a trouvé", () => {
  it("n'exige jamais un jeton que son fichier écrit deux fois", () => {
    const fautives: string[] = [];
    for (const f of epreuves()) {
      /* La feuille ne se lit pas elle-même : elle écrit ses propres exemples
         de clauses fautives, et s'attraperait. Un relevé qui s'attrape
         lui-même est rouge pour toujours, donc il finit désarmé. */
      if (f === "clause-qui-distingue.test.ts") continue;
      for (const c of clausesDePresence(readFileSync(join(ROOT, "src/test", f), "utf8"), lireDuDepot)) {
        if (c.n > 1) fautives.push(`${f}:${c.ligne} · « ${c.jeton.slice(0, 44)} » paraît ${c.n}× dans ${c.cible}`);
      }
    }
    expect(
      fautives,
      `ces clauses ne savent pas laquelle des occurrences elles ont trouvée ; elles resteront vertes le jour où l'une partira. Écrivez la syntaxe autour du mot — « toMatch(/if \\(monGarde\\(/) » plutôt que « toContain("monGarde") » :\n  ${fautives.join("\n  ")}`,
    ).toEqual([]);
  });

  it("et le relevé a bien regardé la suite", () => {
    /* NON VACUITÉ PAR LE DÉPÔT. « Aucune clause fautive » est aussi ce que
       répond un relevé qui ne résout plus aucune liaison — un nom de lecteur
       renommé, une forme d'expect reformatée. Mesuré le 1er novembre 2026 :
       330 fichiers d'épreuves, 121 clauses de présence résolues. */
    let clauses = 0;
    let fichiers = 0;
    for (const f of epreuves()) {
      if (f === "clause-qui-distingue.test.ts") continue;
      fichiers++;
      clauses += clausesDePresence(readFileSync(join(ROOT, "src/test", f), "utf8"), lireDuDepot).length;
    }
    expect(fichiers, "le relevé ne voit presque plus d'épreuves").toBeGreaterThan(300);
    expect(clauses, "le relevé ne résout plus les clauses de présence : son zéro ne prouve rien").toBeGreaterThan(80);
  });

  it("et il voit bien une clause qui ne distingue pas", () => {
    /* NON VACUITÉ PAR LA FONCTION, et c'est la seule qui ne dépende pas de
       l'état du dépôt : on lui donne une épreuve écrite à la main, avec les
       deux formes qu'elle sait lire et les trois qu'elle doit laisser. */
    const garde = `
      const src = lire("un/fichier.ts");
      const bloc = src.slice(2);
      it("…", () => {
        expect(src).toContain("monGarde");
        expect(src, "un message").toContain("uneSeuleFois");
        expect(lire("un/fichier.ts")).toContain("monGarde");
        expect(src).toContain("ok");
        expect(bloc).toContain("monGarde");
        expect(v.raison).toContain("monGarde");
        expect(src).toMatch(/monGarde/);
      });
    `;
    const faux = (chemin: string) => (chemin === "un/fichier.ts" ? 'import { monGarde } from "x";\nif (monGarde(a)) {}\nconst uneSeuleFois = 1;\nconst ok = 2;' : null);
    const vu = clausesDePresence(garde, faux);
    expect(
      vu.map((c) => `${c.jeton}×${c.n}`),
      "le relevé ne lit plus les deux formes, ou il s'est mis à lire celles qu'il doit laisser",
    ).toEqual(["monGarde×2", "uneSeuleFois×1", "monGarde×2"]);
    /* Et ce qu'il laisse, il le laisse pour une raison écrite plus haut : une
       tranche, une valeur calculée, un jeton trop court, une expression
       régulière. Quatre absences, et chacune est nommée. */
    expect(vu.length, "le relevé s'est mis à compter des tranches ou des valeurs calculées : il rendra de faux rouges").toBe(3);
  });
});
