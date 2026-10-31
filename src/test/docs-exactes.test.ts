import { execSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GESTES } from "@/lib/domain/journal-client";
import { MESURES } from "@/lib/domain/mesure";
import { MOTIFS_D_ECART } from "@/lib/domain/registre-ecartes";
import { CAUSES_DE_RETRAIT } from "@/lib/domain/acces-nomme";

/**
 * LA DOCUMENTATION DU DESK DIT-ELLE ENCORE VRAI ?
 *
 * Une page de doctrine ne casse rien quand elle ment : elle se lit, on la
 * croit, et on agit dessus. C'est la pire sorte de panne muette, parce
 * qu'elle ne laisse aucune trace jusqu'au jour où quelqu'un applique une
 * règle qui n'existe plus.
 *
 * Ce cliquet tient les affirmations VÉRIFIABLES : les comptes, les listes
 * fermées, les liens. Le reste est affaire de relecture humaine, et la date
 * `checkedOn` de chaque page est là pour cela.
 */
const DOCS_DIR = "src/data/docs";
const pages = readdirSync(DOCS_DIR).filter((f) => f.endsWith(".ts") && !["index.ts", "types.ts"].includes(f));
const texte = (f: string) => readFileSync(`${DOCS_DIR}/${f}`, "utf8");
const tout = pages.map(texte).join("\n");

const EN_LETTRES: Record<number, string> = {
  2: "deux",
  3: "trois",
  4: "quatre",
  5: "cinq",
  6: "six",
  7: "sept",
  8: "huit",
  9: "neuf",
  10: "dix",
  13: "treize",
  14: "quatorze",
  15: "quinze",
  16: "seize",
  24: "vingt-quatre",
  40: "quarante",
  41: "quarante et un",
  42: "quarante-deux",
  43: "quarante-trois",
  44: "quarante-quatre",
  88: "quatre-vingt-huit",
  89: "quatre-vingt-neuf",
  90: "quatre-vingt-dix",
  91: "quatre-vingt-onze",
  92: "quatre-vingt-douze",
  93: "quatre-vingt-treize",
  94: "quatre-vingt-quatorze",
  95: "quatre-vingt-quinze",
  96: "quatre-vingt-seize",
  97: "quatre-vingt-dix-sept",
  98: "quatre-vingt-dix-huit",
  99: "quatre-vingt-dix-neuf",
  100: "cent",
};

describe("les chiffres que la documentation annonce", () => {
  it("le catalogue des gestes", () => {
    /* « les quarante gestes du catalogue » : le jour où on en ajoute un, ce
       cas tombe, et c'est exactement ce qu'on veut. */
    const n = Object.keys(GESTES).length;
    expect(tout, `le catalogue porte ${n} gestes : la doctrine doit dire « ${EN_LETTRES[n] ?? n} gestes du catalogue »`).toContain(`${EN_LETTRES[n] ?? n} gestes du catalogue`);
  });

  it("le nombre de migrations", () => {
    const n = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).length;
    const dernier = Number(readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort().at(-1)!.slice(0, 4));
    /* On annonce le NUMÉRO de la dernière, pas le compte des fichiers : une
       migration retirée du dépôt ne doit pas faire mentir la page. */
    expect(n, "une migration manque dans la suite, ou un numéro est doublé").toBeLessThanOrEqual(dernier);
    expect(texte("technique.ts").toLowerCase(), `la dernière migration porte le numéro ${dernier}`).toContain(`${EN_LETTRES[dernier] ?? dernier} migrations sql`);
  });

  it("les tâches planifiées, et chacune dans le tableau", () => {
    /* La page en annonçait sept quand vercel.json en portait treize, et six
       manquaient au tableau. Un tableau dérive sans bruit : chaque tâche
       ajoutée s'écrit dans vercel.json et nulle part ailleurs. */
    const crons = (JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: { path: string }[] }).crons;
    const page = texte("technique.ts");
    expect(page.toLowerCase(), `vercel.json porte ${crons.length} tâches`).toContain(`${EN_LETTRES[crons.length] ?? crons.length} tâches`);
    const absentes = crons.map((c) => c.path).filter((p) => !page.includes(`"${p}"`));
    expect(absentes, `tâches absentes du tableau :\n  ${absentes.join("\n  ")}`).toEqual([]);
  });

  it("les crans d'une mesure", () => {
    // « aucune » n'est pas un cran : l'écran en liste trois.
    const crans = MESURES.filter((m) => m !== "aucune").length;
    expect(crans).toBe(3);
    /* Les trois crans se nomment dans le tableau de la page : si on en
       ajoute un quatrième, il devra y paraître aussi. */
    const page = texte("clientele.ts");
    for (const cran of ["Prépaiement exigé", "Fermeture seule", "Compte suspendu"]) expect(page, cran).toContain(cran);
  });

  it("les motifs du registre, et les causes d'un retrait d'accès", () => {
    const tus = Object.values(MOTIFS_D_ECART).filter((v) => v.conformite).length;
    expect(texte("clientele.ts"), `${tus} motifs sur ${Object.keys(MOTIFS_D_ECART).length} ne se disent pas`).toContain("quatre des six sont des motifs de conformité");
    const muettes = Object.values(CAUSES_DE_RETRAIT).filter((v) => v.conformite).length;
    expect(muettes, "une seule cause de retrait est muette").toBe(1);
  });
});

/**
 * LES PAGES QU'UNE MAIN VIENT DE TOUCHER, LUES DANS L'ARBRE.
 *
 * `git status --porcelain` rend une ligne par fichier : deux caractères
 * d'état, une espace, le chemin. Un renommage s'écrit « ancien -> nouveau »,
 * et c'est le nouveau qui compte ; un chemin à caractères spéciaux arrive
 * entre guillemets. Une page supprimée y figure aussi, et elle n'a plus de
 * date à vérifier — l'appelant l'écarte.
 *
 * C'EST UNE FONCTION PURE, et elle l'est pour une seule raison : quand
 * l'arbre est propre, la clause qui s'en sert ne regarde rien et passe. Sa
 * non-vacuité ne peut donc pas venir de l'arbre ; elle vient d'ici, où l'on
 * peut lui donner un relevé et vérifier qu'elle y voit ce qu'il faut.
 */
export const pagesTouchees = (porcelain: string, dossier = DOCS_DIR): string[] =>
  porcelain
    .split("\n")
    .filter((l) => l.length > 3)
    .map((l) => l.slice(3))
    .map((c) => (c.includes(" -> ") ? c.slice(c.indexOf(" -> ") + 4) : c))
    .map((c) => c.replace(/^"|"$/g, ""))
    .filter((c) => c.startsWith(`${dossier}/`) && c.endsWith(".ts"))
    .map((c) => c.slice(dossier.length + 1))
    .filter((f) => !["index.ts", "types.ts"].includes(f));

describe("la date « vérifié le »", () => {
  /**
   * ELLE SUIT LE JOUR OÙ L'ON ÉCRIT, ET NON LE JOUR OÙ L'ON POUSSE.
   *
   * CE QUI MANQUAIT, et qui a coûté deux envois de suite. La clause du
   * dessous compare la date de relecture à la DATE DU COMMIT du fichier :
   * tant que rien n'est commis, elle ne voit rien. Elle ne peut donc tomber
   * qu'au premier `npm test` APRÈS le push — c'est-à-dire sur l'envoi
   * suivant, chez quelqu'un qui n'a pas touché à la page et qui découvre un
   * rouge dont il n'est pas l'auteur. Le 30 octobre 2026 c'était
   * `technique.ts`, le 31 `fonctionnement.ts`.
   *
   * CELLE-CI LIT L'ARBRE. Une page modifiée, mise en scène ou neuve est une
   * page qu'une main vient de toucher : sa relecture ne peut pas dater
   * d'avant aujourd'hui, puisque c'est aujourd'hui qu'on l'écrit. Le rouge
   * tombe alors chez l'auteur, avant le commit, pendant qu'il a encore le
   * fichier sous les yeux.
   *
   * ELLE NE REMPLACE PAS L'AUTRE. Celle-ci garde la fenêtre avant le commit,
   * l'autre garde l'histoire : un rebase, une fusion, un envoi passé sans
   * épreuves laissent des pages datées de la veille, et seule la date du
   * commit les désigne encore.
   */
  it("suit le jour où l'on écrit, et non le jour où l'on pousse", () => {
    let porcelain = "";
    try {
      porcelain = execSync("git status --porcelain -- src/data/docs", { encoding: "utf8" });
    } catch {
      return; // hors d'un dépôt : le cas ne juge rien
    }
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const muettes: string[] = [];
    for (const f of pagesTouchees(porcelain)) {
      if (!existsSync(`${DOCS_DIR}/${f}`)) continue; // supprimée : plus rien à dater
      const vu = texte(f).match(/checkedOn: "(\d{4}-\d{2}-\d{2})"/)?.[1];
      if (vu && vu < aujourdHui) muettes.push(`${f} : touchée aujourd'hui, relue le ${vu}`);
    }
    expect(muettes, `ces pages changent sans être relues ; portez leur « checkedOn » au ${aujourdHui}, dans le même commit :\n  ${muettes.join("\n  ")}`).toEqual([]);
  });

  it("et le relevé de l'arbre voit bien ce qu'il doit voir", () => {
    /* NON VACUITÉ, et elle ne peut pas venir de l'arbre : quand il est
       propre, la clause du dessus ne regarde rien et passe — ce qui est son
       état normal. On donne donc au relevé un `git status` écrit à la main,
       avec les quatre formes qu'il rend. */
    const releve = [
      " M src/data/docs/technique.ts", // modifiée, pas mise en scène
      "M  src/data/docs/aide.ts", // mise en scène
      "?? src/data/docs/neuve.ts", // neuve
      "R  src/data/docs/vieux.ts -> src/data/docs/renommee.ts", // renommée
      " D src/data/docs/partie.ts", // supprimée : rendue, l'appelant l'écarte
      " M src/data/docs/index.ts", // le sommaire n'est pas une page
      " M src/data/docs/types.ts", // le type non plus
      " M src/app/trader/page.tsx", // hors du dossier
      /* ET UN « .ts » HORS DU DOSSIER, qui est le seul cas où le filtre du
         dossier travaille vraiment. Sans cette ligne, on pouvait retirer le
         « startsWith » sans que rien ne tombe : les deux autres intrus sont
         écartés par leur extension, « .tsx » et « .md ». Relevé en vérifiant
         ce cliquet à l'envers, le 31 octobre 2026. */
      " M src/lib/domain/briefs.ts",
      " M src/data/docs/notes.md", // pas une page TypeScript
      "",
    ].join("\n");
    expect(pagesTouchees(releve), "le relevé de l'arbre ne voit plus les pages qu'une main a touchées").toEqual([
      "technique.ts",
      "aide.ts",
      "neuve.ts",
      "renommee.ts",
      "partie.ts",
    ]);
    /* Et un arbre propre ne désigne personne : sans cela, la clause du dessus
       accuserait tout le dépôt le jour où le relevé rend n'importe quoi. */
    expect(pagesTouchees(""), "un arbre propre désigne des pages : la clause accuserait sans raison").toEqual([]);
  });

  it("ne précède jamais le dernier mot écrit dans la page", () => {
    /* ELLE DIT « QUELQU'UN A RELU CETTE PAGE », et c'est la seule promesse
       que le lecteur ne peut pas vérifier lui-même. Une page modifiée après
       sa date de relecture annonce donc une vérification qui n'a pas porté
       sur ce qu'elle contient. On ne peut pas prouver la relecture ; on peut
       prouver qu'une main est passée après elle, et c'est déjà beaucoup. */
    const retard: string[] = [];
    for (const f of pages) {
      const vu = texte(f).match(/checkedOn: "(\d{4}-\d{2}-\d{2})"/)?.[1];
      if (!vu) continue;
      let dernier = "";
      try {
        dernier = execSync(`git log -1 --format=%cs -- "${DOCS_DIR}/${f}"`, { encoding: "utf8" }).trim();
      } catch {
        continue; // hors d'un dépôt : le cas ne juge rien
      }
      if (dernier && dernier > vu) retard.push(`${f} : relue le ${vu}, modifiée le ${dernier}`);
    }
    expect(retard, `ces pages ont changé après leur relecture :\n  ${retard.join("\n  ")}`).toEqual([]);
  });
});

describe("les liens de la documentation", () => {
  it("mènent tous quelque part", () => {
    const slugs = new Set(pages.map((f) => texte(f).match(/slug: "([^"]+)"/)?.[1]).filter(Boolean));
    const morts: string[] = [];
    for (const f of pages) {
      for (const m of texte(f).matchAll(/href: "(\/[^"]*)"/g)) {
        const sans = m[1].split("#")[0].split("?")[0];
        if (sans.startsWith("/desk/docs/")) {
          const slug = sans.slice("/desk/docs/".length);
          if (slug && !slugs.has(slug)) morts.push(`${f} → ${m[1]} (page inconnue)`);
          continue;
        }
        let dir = "src/app";
        let ok = true;
        for (const seg of sans.split("/").filter(Boolean)) {
          if (existsSync(`${dir}/${seg}`)) dir = `${dir}/${seg}`;
          else {
            const dyn = existsSync(dir) ? readdirSync(dir).find((d) => d.startsWith("[")) : undefined;
            if (dyn) dir = `${dir}/${dyn}`;
            else {
              ok = false;
              break;
            }
          }
        }
        if (ok && !existsSync(`${dir}/page.tsx`) && !existsSync(`${dir}/route.ts`)) ok = false;
        if (!ok) morts.push(`${f} → ${m[1]}`);
      }
    }
    expect(morts, `liens morts :\n  ${morts.join("\n  ")}`).toEqual([]);
  });
});
