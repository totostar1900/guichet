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

describe("la date « vérifié le »", () => {
  it("ne précède jamais le dernier mot écrit dans la page", () => {
    /* ELLE DIT « QUELQU'UN A RELU CETTE PAGE », et c'est la seule promesse
       que le lecteur ne peut pas vérifier lui-même. Une page modifiée après
       sa date de relecture annonce donc une vérification qui n'a pas porté
       sur ce qu'elle contient. On ne peut pas prouver la relecture ; on peut
       prouver qu'une main est passée après elle, et c'est déjà beaucoup. */
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
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
