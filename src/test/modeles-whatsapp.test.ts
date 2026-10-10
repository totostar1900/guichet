import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parametreDeModele } from "@/lib/notify/providers";
import { LANGUES, lesSixCharges, lireLesModeles } from "../../scripts/modeles-whatsapp.mjs";

/** Les deux formes que le script rend, nommées une fois pour toutes. */
type Bouton = { type: string; text: string; url?: string };
type Modele = { nom: string; categorie: string; entete: Record<string, string>; corps: Record<string, string>; pied: Record<string, string>; boutons: Bouton[]; exemples: string[] };
type Composant = { type: string; text: string; format?: string; example?: { body_text: string[][] } };
type Charge = { name: string; language: string; category: string; components: Composant[] };

const lesModeles = (): Modele[] => lireLesModeles() as unknown as Modele[];
const lesCharges = (): Charge[] => lesSixCharges() as unknown as Charge[];
const parNom = (): Record<string, Modele> => Object.fromEntries(lesModeles().map((m) => [m.nom, m]));
const codes = (): string[] => (LANGUES as unknown as { code: string }[]).map((l) => l.code);

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

/**
 * LES SIX CHARGES, TELLES QU'ELLES PARTENT CHEZ META.
 *
 * Trois modèles, deux langues : six saisies à la main, et une virgule
 * déplacée ne se verrait pas. Le modèle serait approuvé tel qu'il a été tapé,
 * et c'est l'envoi qui échouerait ensuite. `scripts/modeles-whatsapp.mjs` lit
 * donc le document et bâtit les charges ; ce cliquet importe le même lecteur,
 * de sorte qu'une dérive du document se dit ici et non chez un examinateur
 * dans trois jours.
 */
describe("les charges soumises à Meta", () => {
  const charges = lesCharges();
  const modeles = parNom();

  it("sont six : trois modèles, deux langues", () => {
    expect(charges.map((c) => `${c.name} ${c.language}`)).toEqual([
      "guichet_prelevement fr",
      "guichet_prelevement en",
      "guichet_maj fr",
      "guichet_maj en",
      "guichet_offre fr",
      "guichet_offre en",
    ]);
    expect(codes()).toEqual(["fr", "en"]);
  });

  it("portent la catégorie assumée, et jamais allow_category_change", () => {
    /* Ce drapeau évite un refus en laissant Meta reclasser le modèle, donc
       changer son tarif, sans que personne ne l'ait décidé. Un refus se lit
       et se répond ; une requalification se découvre sur la facture. */
    expect(charges.filter((c) => c.category === "UTILITY")).toHaveLength(4);
    expect(charges.filter((c) => c.category === "MARKETING")).toHaveLength(2);
    for (const c of charges) expect(c).not.toHaveProperty("allow_category_change");
  });

  it("donnent un exemple par variable, ni plus ni moins", () => {
    // Un modèle sans exemple est refusé, et le motif ne nomme pas la colonne.
    for (const c of charges) {
      const body = c.components.find((x) => x.type === "BODY")!;
      const exemples = body.example!.body_text[0];
      expect(exemples, `${c.name} ${c.language}`).toHaveLength(variables(body.text).length);
      expect(exemples.every((x) => x.length > 0)).toBe(true);
    }
  });

  it("traduisent aussi l'en-tête et le pied, pas seulement le corps", () => {
    /* Meta examine le modèle entier. Un modèle soumis en anglais dont
       l'en-tête reste français est mi-traduit, et c'est le genre de détail
       qui fait revenir l'examinateur. */
    for (const [nom, m] of Object.entries(modeles)) {
      expect(m.entete.fr, nom).not.toBe(m.entete.en);
      expect(m.pied.fr, nom).not.toBe(m.pied.en);
    }
  });

  it("gardent un seul pied de page pour les trois, dans chaque langue", () => {
    // La mention de la maison ne varie pas selon le message ; trois copies dérivent.
    for (const code of codes()) {
      expect(new Set(Object.values(modeles).map((m) => m.pied[code])).size, code).toBe(1);
    }
  });

  it("tiennent les bornes d'en-tête et de pied dans les deux langues", () => {
    for (const c of charges) {
      for (const t of ["HEADER", "FOOTER"]) {
        const x = c.components.find((y) => y.type === t)!;
        expect(x.text.length, `${c.name} ${c.language} ${t}`).toBeLessThanOrEqual(60);
      }
    }
  });
});

describe("les boutons des modèles", () => {
  const modeles = parNom();

  it("sont ceux qu'on a décidés, et le marketing porte sa sortie", () => {
    expect(modeles.guichet_prelevement.boutons).toEqual([
      { type: "URL", text: "Voir mes prélèvements", url: "https://guichet.purposecapital.africa/moi/prelevements" },
    ]);
    expect(modeles.guichet_maj.boutons).toEqual([{ type: "URL", text: "Ouvrir le Guichet", url: "https://guichet.purposecapital.africa/" }]);
    /* Un modèle marketing sans sortie se fait signaler par les
       destinataires, ce qui abîme la qualité du numéro pour TOUS les envois,
       utilitaires compris. */
    expect(modeles.guichet_offre.boutons).toEqual([{ type: "QUICK_REPLY", text: "Stop" }]);
  });

  it("mènent à des adresses qui existent encore", () => {
    /* UN MODÈLE APPROUVÉ VIT DES ANNÉES, UNE ADRESSE NON. « Ouvrir le
       Guichet » pointait sur /moi, qui ne fait plus que rediriger depuis la
       refonte du 1er octobre 2026 ; personne ne l'avait vu, parce que rien ne
       relie un document à un dossier de routes. */
    for (const m of Object.values(modeles)) {
      for (const b of m.boutons) {
        if (b.type !== "URL") continue;
        const chemin = new URL(b.url!).pathname.replace(/^\/|\/$/g, "");
        const page = chemin ? `src/app/${chemin}/page.tsx` : "src/app/page.tsx";
        expect(() => readFileSync(page), `${b.url} : ${page} introuvable`).not.toThrow();
      }
    }
  });

  it("et STOP est vraiment honoré à l'entrée", () => {
    // Le bouton promet une sortie ; la promesse se tient dans le webhook.
    const w = readFileSync("src/app/api/whatsapp/webhook/route.ts", "utf8");
    expect(w).toMatch(/\["stop", "arret", "arrêt", "désabonner", "desabonner"\]\.includes/);
  });
});

describe("la langue, telle qu'elle est", () => {
  it("part sur « fr », et le document le dit", () => {
    /* Rien n'envoie encore l'anglais : le composeur écrit en français et
       personne ne passe de langue. La version anglaise est soumise quand
       même, parce qu'un modèle dont une seule langue existe fait échouer tout
       envoi dans l'autre. Si ce défaut devenait « en », les envois
       tomberaient en silence jusqu'à ce qu'un client s'en plaigne. */
    expect(readFileSync("src/lib/notify/providers.ts", "utf8")).toMatch(/lang = "fr"/);
    expect(doc()).toContain("Rien n'envoie encore la version anglaise");
  });
});

describe("le script qui soumet", () => {
  it("ne soumet rien quand on l'importe", () => {
    /* Ce cliquet l'importe pour son lecteur. Sans cette garde, lancer la
       suite de tests avec un jeton dans l'environnement soumettrait six
       modèles à Meta. */
    expect(readFileSync("scripts/modeles-whatsapp.mjs", "utf8")).toMatch(/import\.meta\.url === pathToFileURL\(process\.argv\[1\]\)\.href/);
  });
});
