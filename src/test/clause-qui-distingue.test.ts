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

/**
 * LA FIN D'UNE TRANCHE SE CHERCHE DEPUIS SON DÉBUT.
 *
 * ─── Le second motif de vacuité, et il est silencieux aussi ────────────────
 *
 * Une épreuve découpe une région du source et lui refuse quelque chose :
 *
 *     const menu = carte.slice(carte.indexOf('role="menu"'), carte.indexOf("{confirme &&"));
 *     expect(menu).not.toContain("raisonNonRetrait");
 *
 * Le second « indexOf » part de ZÉRO. Il trouve donc la première occurrence
 * du FICHIER, et non la première après le début de la tranche. Tant que le
 * marqueur de fin vient après celui de début, tout va bien — c'est le cas de
 * naissance, et c'est pourquoi personne ne le voit. Le jour où on déplace un
 * bloc, où l'on ajoute un bouton au-dessus d'un autre, où l'on réordonne deux
 * fonctions d'un fichier d'actions, la fin passe AVANT le début : la tranche
 * sort VIDE, et tout ce qu'on lui refuse devient vrai pour rien.
 *
 * RELEVÉ LE 1er NOVEMBRE 2026, deux fois. Une tranche de « sondage-modele »
 * d'abord, en vérifiant la revue du marché à l'envers ; puis onze autres en
 * passant la suite entière à la sonde. Aucune n'était vide ce jour-là — elles
 * étaient justes par l'ordre des choses, pas par construction.
 *
 * ─── Pourquoi la règle suffit, alors qu'on ne peut pas mesurer le vide ─────
 *
 * On ne peut pas garder « la tranche n'est pas vide » : cela dépend du
 * contenu, qu'une épreuve statique ne lit pas. Mais la fin cherchée DEPUIS LE
 * DÉBUT change la nature de la panne. Marqueur introuvable après le début,
 * « indexOf » rend -1, et « slice(debut, -1) » va jusqu'à l'avant-dernier
 * caractère : la tranche devient énorme au lieu de disparaître. Ce qu'on lui
 * refuse a alors toutes les chances de s'y trouver, et la clause TOMBE.
 *
 * C'est tout ce qu'on demande à une garde : se tromper en rouge plutôt qu'en
 * vert. Un faux rouge se corrige le jour même ; un faux vert dort des mois.
 */
describe("une tranche de source cherche sa fin depuis son début", () => {
  /** Les tranches dont la fin part de zéro, avec leur ligne. */
  const finSansDebut = (source: string): number[] =>
    source
      .split("\n")
      .map((l, i) => ({ l, n: i + 1 }))
      /* Le début de la tranche n'est pas zéro — « slice(0, …) » n'a pas de
         début à propager — et la fin est un « indexOf » à UN SEUL argument.
         Le second argument, quand il est là, est soit un nombre, soit un
         autre « indexOf » : les deux portent une virgule hors des guillemets
         du motif, qu'on reconnaît à ce qu'elle suit une parenthèse fermante
         ou un mot. */
      .filter(({ l }) => {
        const m = /\.slice\(\s*(?!0\s*,)[^,]+,\s*[\w.]+\.indexOf\((.*)\)\s*\)/.exec(l);
        if (!m) return false;
        const args = m[1];
        /* « "x" » seul : pas de seconde borne. « "x", debut » ou
           « "x", y.indexOf(…) » : il y en a une. */
        return !/"\s*,|'\s*,|`\s*,/.test(args);
      })
      .map(({ n }) => n);

  it("ne laisse aucune tranche chercher sa fin depuis le début du texte", () => {
    const fautives: string[] = [];
    for (const f of epreuves()) {
      if (f === "clause-qui-distingue.test.ts") continue;
      for (const n of finSansDebut(readFileSync(join(ROOT, "src/test", f), "utf8"))) fautives.push(`${f}:${n}`);
    }
    expect(
      fautives,
      `ces tranches cherchent leur fin depuis le début du texte : le jour où le marqueur de fin passera avant celui de début, elles sortiront VIDES et tout ce qu'on leur refuse deviendra vrai pour rien. Passez le début en seconde borne — « s.indexOf("fin", debut) » :\n  ${fautives.join("\n  ")}`,
    ).toEqual([]);
  });

  it("et il voit bien une fin qui part de zéro", () => {
    /* NON VACUITÉ PAR LA FONCTION : quatre formes à refuser, quatre à
       laisser. Sans ce cas, le motif pourrait cesser de reconnaître quoi que
       ce soit et rendre « aucune tranche fautive ». */
    const refuse = [
      `const a = s.slice(s.indexOf("debut"), s.indexOf("fin"));`,
      `const b = x.slice(i, x.indexOf("fin"));`,
      `expect(s.slice(pose, s.indexOf("</header>"))).not.toContain("x");`,
      `const d = sb.slice(sb.indexOf("async a"), sb.indexOf("async b"));`,
    ];
    const laisse = [
      `const a = s.slice(s.indexOf("debut"), s.indexOf("fin", debut));`,
      `const b = css.slice(css.indexOf(".band {"), css.indexOf("\\n}", css.indexOf(".band {")));`,
      `const c = m.slice(0, m.indexOf("fin"));`,
      `const d = s.slice(i);`,
    ];
    expect(finSansDebut(refuse.join("\n")), "le relevé ne reconnaît plus une fin cherchée depuis zéro").toEqual([1, 2, 3, 4]);
    expect(finSansDebut(laisse.join("\n")), "le relevé refuse des tranches qui portent déjà leur borne : il rendra de faux rouges").toEqual([]);
  });
});

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
