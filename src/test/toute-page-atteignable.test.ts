import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COLONNE_CLIENT, COLONNE_DESK, COLONNE_VISITEUR } from "@/lib/nav-colonne";

/**
 * AUCUNE PAGE NE NAÎT SANS CHEMIN.
 *
 * Mesuré le 19 octobre 2026 : vingt-quatre pages fixes n'étaient citées par
 * aucune barre, dont cinq du desk. On n'y arrivait qu'en tapant l'adresse, et
 * personne ne le savait, parce qu'une page inatteignable ne proteste pas. La
 * barre avait un budget de LARGEUR : les trente-huit onglets l'avaient
 * saturée, et les suivants sont restés dehors sans bruit.
 *
 * La colonne a un budget de LONGUEUR, donc la place existe. Restait à
 * empêcher que le trou se reforme : c'est le travail de cet essai.
 *
 * TROIS FAÇONS LÉGITIMES D'ÊTRE ATTEIGNABLE, et il n'y en a pas d'autre.
 *
 *   LA COLONNE LA CITE. C'est le cas normal.
 *
 *   UNE AUTRE PAGE Y MÈNE PAR UN LIEN. Une étape de parcours, une fiche
 *   ouverte depuis sa liste, un réglage ouvert depuis la page qu'il règle.
 *
 *   ELLE NE FAIT QUE REDIRIGER. « /agir », « /moi », « /moi/services » sont
 *   d'anciennes adresses parties dans des messages : elles existent pour
 *   rattraper un lien déjà donné, et leur donner une entrée de menu
 *   afficherait deux fois la même destination.
 *
 * Une route dynamique n'est pas jugée : elle s'ouvre depuis sa liste, et
 * c'est « ListNav » qui en répond.
 */
const ROOT = path.resolve(__dirname, "../..");
const APP = path.join(ROOT, "src/app");

/** Toutes les routes servies, telles que l'adresse les écrit. */
function routes(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "page.tsx") {
        const r = p.replace(APP, "").replace(/[\\/]page\.tsx$/, "").replace(/\\/g, "/").replace(/\/\([^)]*\)/g, "");
        out.push(r || "/");
      }
    }
  };
  walk(APP);
  return [...new Set(out)].sort();
}

/** Les fichiers source où un lien peut vivre. */
function sources(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory() && e.name !== "test") walk(p);
      else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
    }
  };
  walk(path.join(ROOT, "src"));
  return out;
}

/**
 * LES MAQUETTES, QUI SONT DES PROPOSITIONS ET NON DES PAGES.
 *
 * Une maquette vit à une adresse provisoire, qu'on ouvre sur son téléphone
 * pour décider d'une forme. Lui donner une entrée de menu la mettrait sous
 * les yeux des clients, ce qui est exactement ce qu'on ne veut pas : elle
 * n'envoie rien et ne tient aucune promesse.
 *
 * LA DISPENSE A UN PRIX, et c'est volontaire : chaque maquette est nommée
 * ici, avec la décision qu'elle attend. Une maquette dont la décision est
 * prise se démonte, et sa ligne part avec elle — l'épreuve d'à côté refuse
 * les dispenses qui ne visent plus rien.
 */
const MAQUETTES: Record<string, string> = {
  "/maquette/ordre": "proposée le 28 octobre 2026 : la forme généreuse du passage d'ordre, en attente d'arbitrage",
  "/maquette/adjudication": "proposée le 28 octobre 2026 : la même forme sur deux saisies, un montant et un taux, en attente d'arbitrage",
  "/maquette/epargne": "proposée le 28 octobre 2026 : la même forme sur une DATE, la seule des quatre saisies qui ne se tape pas",
};

const citeesParLaColonne = new Set([...COLONNE_DESK, ...COLONNE_CLIENT, ...COLONNE_VISITEUR].flatMap((g) => g.items.map((i) => i.href)));

describe("toute page est atteignable au clic", () => {
  const toutes = routes();
  const fixes = toutes.filter((r) => !r.includes("[") && !r.includes("(."));
  const textes = new Map(sources().map((f) => [f, fs.readFileSync(f, "utf8")]));

  /** Cette page ne fait-elle que rediriger ailleurs ? */
  const redirige = (r: string) => {
    const f = path.join(APP, r === "/" ? "" : r, "page.tsx");
    const src = textes.get(f);
    return Boolean(src && /\bredirect\(/.test(src) && !/export const dynamic|<[A-Z]/.test(src.replace(/import[^;]+;/g, "")));
  };

  /**
   * Une autre page la cite-t-elle ? La page elle-même ne compte pas.
   *
   * UNE ADRESSE PORTE PARFOIS UNE REQUÊTE, et chercher la chaîne exacte la
   * rate. « /connexion/mfa » s'atteint par un `redirect` vers
   * « /connexion/mfa?enrol=1&next=… » : la deuxième étape de la connexion
   * était comptée perdue alors qu'elle est le seul chemin servi.
   */
  const citeeAilleurs = (r: string) => {
    const dossier = path.join(APP, r === "/" ? "" : r);
    const motif = new RegExp(`["'\`]${r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[?#][^"'\`]*)?["'\`]`);
    for (const [f, src] of textes) {
      if (f.startsWith(dossier + path.sep) || f === path.join(dossier, "page.tsx")) continue;
      if (motif.test(src)) return true;
    }
    return false;
  };

  it("la colonne cite chaque page fixe, ou quelqu'un d'autre y mène", () => {
    const perdues = fixes.filter((r) => !citeesParLaColonne.has(r) && !redirige(r) && !citeeAilleurs(r) && !MAQUETTES[r]);
    expect(
      perdues,
      `ces pages existent et rien n'y mène : on n'y arrive qu'en tapant l'adresse.\n` +
        `Les ranger dans un groupe de « lib/nav-colonne », ou dire d'où on y entre.\n  ${perdues.join("\n  ")}`,
    ).toEqual([]);
  });

  it("ne garde aucune dispense de maquette qui ne vise plus de page", () => {
    /* Une maquette démontée dont la ligne reste ici rouvrirait le trou en
       silence pour la prochaine page qui prendrait son adresse. */
    const fantomes = Object.keys(MAQUETTES).filter((r) => !fixes.includes(r));
    expect(fantomes, `ces maquettes n'existent plus : leur dispense doit partir avec elles\n  ${fantomes.join("\n  ")}`).toEqual([]);
    const muettes = Object.entries(MAQUETTES).filter(([, r]) => r.trim().length < 20);
    expect(muettes.map(([r]) => r), "une dispense sans raison lisible n'est pas une décision").toEqual([]);
  });

  it("chaque adresse citée par la colonne est une page qui existe", () => {
    /* L'INVERSE COMPTE AUTANT. Un menu qui pointe sur une page retirée rend
       une erreur, et c'est le lecteur qui la découvre. */
    const servies = new Set(toutes);
    const mortes = [...citeesParLaColonne].filter((h) => !servies.has(h) && !toutes.some((r) => r.includes("[") && new RegExp(`^${r.replace(/\[[^\]]+\]/g, "[^/]+")}$`).test(h)));
    expect(mortes, `la colonne pointe sur des adresses que rien ne sert :\n  ${mortes.join("\n  ")}`).toEqual([]);
  });

  it("la colonne ne cite aucune page qui exige un paramètre, ni aucune qui ne fait que rediriger", () => {
    /**
     * UNE ADRESSE QUI EXISTE N'EST PAS UNE DESTINATION.
     *
     * « /desk/clients/activite » rend un 404 sans son « ?file= » : c'est la
     * fiche d'UN client, qu'on ouvre depuis son dossier. Je l'avais rangée
     * dans la colonne parce qu'aucune barre ne la citait, et l'entrée menait
     * droit à une page introuvable. L'essai précédent ne pouvait pas le voir :
     * le fichier de route existe bel et bien.
     *
     * Même chose pour une page qui ne fait que rediriger, comme
     * « /desk/courbe » vers les analyses : lui donner une entrée afficherait
     * deux fois la même destination.
     */
    const fautives: string[] = [];
    for (const h of citeesParLaColonne) {
      const f = path.join(APP, h === "/" ? "" : h, "page.tsx");
      const src = textes.get(f);
      if (!src) continue;
      const corps = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      /* « notFound() » gardé par l'absence d'un paramètre de requête. */
      if (/searchParams/.test(corps) && /if\s*\(!\s*sp?\.\w+\s*\)\s*notFound\(\)/.test(corps)) fautives.push(`${h} : exige un paramètre de requête`);
      else if (/\breturn\s+redirect\(|^\s*redirect\(/m.test(corps) && !/<[A-Z]/.test(corps)) fautives.push(`${h} : ne fait que rediriger`);
    }
    expect(fautives, `la colonne mène à des pages qui ne s'ouvrent pas seules :\n  ${fautives.join("\n  ")}`).toEqual([]);
  });

  it("le desk porte toutes ses pages, et la colonne a la place", () => {
    const pagesDesk = fixes.filter((r) => r.startsWith("/desk"));
    const citees = pagesDesk.filter((r) => citeesParLaColonne.has(r));
    /**
     * Le compte monte quand une page du desk naît avec son entrée ; il ne
     * redescend pas. Au 19 octobre 2026 : 42 sur 44.
     *
     * LES DEUX QUI MANQUENT NE SONT PAS DES DESTINATIONS, et l'essai
     * ci-dessus l'exige maintenant : « /desk/clients/activite » est la fiche
     * d'UN client et veut son « ?file= », « /desk/courbe » ne fait que
     * rediriger vers les analyses. Je les avais rangées dans la colonne parce
     * qu'aucune barre ne les citait, et la première y menait droit à un 404.
     */
    expect(citees.length, `${pagesDesk.length - citees.length} page(s) du desk hors de la colonne : ${pagesDesk.filter((r) => !citeesParLaColonne.has(r)).join(", ")}`).toBeGreaterThanOrEqual(42);
  });
});
