import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parametreDeModele } from "@/lib/notify/providers";

/**
 * LE MODÈLE SOUMIS À META ET L'ENVOI DOIVENT COMPTER PAREIL.
 *
 * Un modèle approuvé avec cinq variables et un envoi qui en passe quatre est
 * refusé à CHAQUE message, et le refus ne se lit que dans la réponse de l'API
 * de Meta : rien, dans l'application, ne dirait que les messages ne partent
 * plus. C'est une panne muette parfaite, et elle naîtrait d'une phrase
 * retouchée d'un côté sans l'autre.
 *
 * Ce cliquet lit les deux sources : le texte à soumettre
 * (`docs/modeles-whatsapp.md`), qui est ce qu'on recopie dans WhatsApp
 * Manager, et les tableaux de paramètres du code.
 */
const DOC = "docs/modeles-whatsapp.md";
const doc = () => readFileSync(DOC, "utf8");

/**
 * La section d'un modèle : de son titre de premier niveau au suivant.
 *
 * Le titre se reconnaît au NOM qu'il contient, et non à sa forme exacte : il
 * porte un numéro d'ordre, et un cliquet qui casserait parce qu'on a inséré
 * un modèle au milieu de la liste serait un cliquet qu'on finirait par
 * désarmer.
 */
function section(nom: string): string {
  const d = doc();
  const titres = [...d.matchAll(/^# .*$/gm)];
  const t = titres.findIndex((m) => m[0].includes(nom));
  expect(t, `section « ${nom} » introuvable dans ${DOC}`).toBeGreaterThanOrEqual(0);
  const debut = titres[t].index!;
  return d.slice(debut, titres[t + 1]?.index);
}

/** Le corps d'une langue, entre les barrières de code qui suivent son titre. */
function corps(nom: string, langue: string): string {
  const s = section(nom);
  const i = s.indexOf(`### Corps, version ${langue}`);
  expect(i, `« Corps, version ${langue} » introuvable sous ${nom}`).toBeGreaterThan(0);
  const debut = s.indexOf("```", i);
  return s.slice(debut + 3, s.indexOf("```", debut + 3)).trim();
}

const variables = (s: string) => [...new Set([...s.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);

/** Les trois modèles, et le nombre de paramètres que le code leur passe. */
const MODELES = [
  { nom: "guichet_prelevement", variables: 5 },
  { nom: "guichet_maj", variables: 2 },
  { nom: "guichet_offre", variables: 4 },
] as const;

describe.each(MODELES)("$nom", ({ nom, variables: attendues }) => {
  it("porte les mêmes variables en français et en anglais", () => {
    expect(variables(corps(nom, "française"))).toEqual(variables(corps(nom, "anglaise")));
  });

  it(`les numérote de 1 à ${attendues}, sans trou`, () => {
    expect(variables(corps(nom, "française"))).toEqual(Array.from({ length: attendues }, (_, i) => i + 1));
  });

  it("ne commence ni ne finit par une variable, et n'en colle jamais deux", () => {
    /* Trois règles de Meta, et chacune fait refuser le modèle à la
       soumission. Les vérifier ici évite un aller-retour de plusieurs jours
       avec un examinateur. */
    for (const langue of ["française", "anglaise"]) {
      const c = corps(nom, langue);
      expect(c.startsWith("{{"), `${nom} ${langue}`).toBe(false);
      expect(c.endsWith("}}"), `${nom} ${langue}`).toBe(false);
      expect(/\}\}[\s,.;:·-]*\{\{/.test(c), `${nom} ${langue}`).toBe(false);
    }
  });

  it("nomme la maison dans le texte fixe, jamais dans une variable", () => {
    // Meta refuse un modèle dont l'identité de l'expéditeur est variable.
    expect(corps(nom, "française")).toContain("Purpose Capital");
    expect(corps(nom, "anglaise")).toContain("Purpose Capital");
  });

  it("tient dans les bornes de Meta : corps sous 1024, pied sous 60", () => {
    expect(corps(nom, "française").length).toBeLessThan(1024);
    expect(corps(nom, "anglaise").length).toBeLessThan(1024);
    const s = section(nom);
    const i = s.indexOf("### Pied de page");
    const debut = s.indexOf("```", i);
    expect(s.slice(debut + 3, s.indexOf("```", debut + 3)).trim().length).toBeLessThanOrEqual(60);
  });
});

describe("le code passe exactement ce que les modèles attendent", () => {
  /* Les appels sont lus en toutes lettres plutôt que comptés : un paramètre
     peut contenir une virgule (« text.replace(/^.*\n/, "") »), et découper
     sur les virgules rendrait un compte faux qui passerait au vert. */
  const appels: [string, string, RegExp][] = [
    ["guichet_prelevement", "src/lib/notify/prelevement.ts", /params: \[fmtDate\(p\.dueOn\), fmt\(p\.amount\), m\.bankName, quoi, m\.ref\]/],
    ["guichet_maj · rejet", "src/lib/notify/prelevement.ts", /tmpl\("WA_TEMPLATE_UPDATE", "guichet_maj"\), params: \[m\.accountHolder, text\]/],
    ["guichet_maj · reçu", "src/lib/notify/compose.ts", /tmpl\("WA_TEMPLATE_UPDATE", "guichet_maj"\), params: \[i\.clientName, text\.replace/],
    ["guichet_maj · état", "src/lib/notify/compose.ts", /tmpl\("WA_TEMPLATE_UPDATE", "guichet_maj"\), params: \[i\.clientName, lines\[state\]\]/],
    ["guichet_offre · publication", "src/lib/notify/compose.ts", /tmpl\("WA_TEMPLATE_OFFER", "guichet_offre"\), params: \[o\.title, headline, fmtDateTime\(o\.deadlineAt\), link\(o\)\]/],
    ["guichet_offre · opportunité", "src/lib/notify/broadcast.ts", /tmpl\("WA_TEMPLATE_OFFER", "guichet_offre"\), params: \[o\.title, `.+`, s\.deadline, url\]/],
  ];
  for (const [quoi, fichier, motif] of appels) {
    it(`${quoi} n'a pas changé de forme`, () => {
      expect(motif.test(readFileSync(fichier, "utf8")), `${quoi} : relire ${DOC} avant de resoumettre`).toBe(true);
    });
  }

  it("et tous les noms passent par le même choix de variable", () => {
    /* « || » et non « ?? » : une variable posée VIDE sur Vercel arriverait
       comme un nom de modèle vide, et chaque envoi échouerait. Les deux
       écritures coexistaient, et la seconde était dans l'envoi de masse. */
    expect(readFileSync("src/lib/notify/compose.ts", "utf8")).toMatch(/export const tmpl = \(key: string, fallback: string\) => process\.env\[key\] \|\| fallback;/);
    for (const f of ["src/lib/notify/broadcast.ts", "src/lib/notify/prelevement.ts", "src/lib/notify/compose.ts"]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/process\.env\.WA_TEMPLATE_\w+ \?\?/);
    }
  });
});

describe("un paramètre part propre, parce que Meta refuse le reste", () => {
  it("met à plat les retours à la ligne, les tabulations et les espaces en file", () => {
    /* Nos textes sont écrits pour l'e-mail, en paragraphes : l'accusé de
       réception d'une intention passe trois retours à la ligne dans sa seule
       variable, et Meta refuse l'envoi en entier pour cette seule raison. */
    expect(parametreDeModele("Votre ordre est reçu.\n\nUn conseiller vous répond.")).toBe("Votre ordre est reçu. Un conseiller vous répond.");
    expect(parametreDeModele("a\tb    c")).toBe("a b c");
    expect(parametreDeModele("  bordé  ")).toBe("bordé");
  });

  it("borne la longueur plutôt que de laisser l'envoi échouer", () => {
    // Le texte entier part de toute façon par e-mail, et le modèle dit où lire la suite.
    const long = parametreDeModele("x".repeat(2000));
    expect(long.length).toBe(900);
    expect(long.endsWith("…")).toBe(true);
    expect(parametreDeModele("court")).toBe("court");
  });
});
