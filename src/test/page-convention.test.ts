import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PASSAGES } from "@/lib/documents/passages-catalog";
import { CONVENTION_CHANGE, CONVENTION_VERSION } from "@/data/legal";
import { EN_ALL } from "@/i18n/core";

/**
 * LA CONVENTION A SA PAGE, ET C'EST SON SEUL DOMICILE.
 *
 * Elle vivait comme une section du dossier d'ouverture : huit puces, un lien
 * vers le texte, et la signature, au milieu d'un écran qui parlait aussi
 * d'identité, de pièces et de profil. « Un mélange des genres », dit le
 * 9 octobre 2026. Ces vérifications tiennent la séparation : le dossier garde
 * une carte, la page garde le contrat.
 */
const PAGE = "src/app/ouvrir-un-compte/convention/page.tsx";
const SIGNER = "src/app/ouvrir-un-compte/convention/Signer.tsx";
const CARTE = "src/app/ouvrir-un-compte/Sections.tsx";
const ACTIONS = "src/app/ouvrir-un-compte/actions.ts";
const lire = (f: string) => readFileSync(f, "utf8");

describe("la signature n'a qu'un domicile", () => {
  it("la page de la convention porte le bloc de signature", () => {
    expect(lire(PAGE)).toMatch(/<Signer /);
    expect(lire(SIGNER)).toMatch(/sendConventionCodeAction/);
    expect(lire(SIGNER)).toMatch(/verifyConventionCodeAction/);
  });

  it("et le dossier d'ouverture ne la porte plus : il n'a qu'une carte et sa porte", () => {
    /* Deux écrans qui signent la même convention, c'est deux codes en vol et
       un client qui ne sait plus lequel il tape. */
    const carte = lire(CARTE);
    expect(carte).not.toMatch(/sendConventionCodeAction|verifyConventionCodeAction/);
    expect(carte).toMatch(/href="\/ouvrir-un-compte\/convention"/);
  });

  it("les deux écrans se rafraîchissent, parce que revalidatePath ne descend pas dans les routes filles", () => {
    /* Sans cette ligne, le code parti et l'acceptation reçue ne se voyaient
       pas là où on les fait : la famille des pannes muettes. */
    expect(lire(ACTIONS)).toMatch(/revalidatePath\(`\$\{PATH\}\/convention`\)/);
    expect(lire(ACTIONS)).toMatch(/revaliderLaConvention\(\);/);
  });
});

describe("ce que la page montre vient d'une seule source", () => {
  it("le texte complet se lit du registre, et non d'une copie dans la page", () => {
    /* Recopier les articles ici aurait créé deux textes : celui qu'on lit et
       celui qu'on signe. C'est toujours le plus ancien qui finit à l'écran. */
    const page = lire(PAGE);
    expect(page).toMatch(/resolvePassages\("convention", lang\)/);
    expect(page).toMatch(/passage\("convention", d\.key, text, vars\)/);
    expect(page).not.toMatch(/Article 1/);
  });

  it("la balance dit les deux côtés, et le prix renvoie à l'annexe", () => {
    const page = lire(PAGE);
    expect(page).toMatch(/Ce que vous nous donnez/);
    expect(page).toMatch(/Ce que nous vous devons/);
    // L'article 6 renvoie à une annexe tarifaire : elle est à un clic d'ici.
    expect(page).toMatch(/href: "\/moi\/tarifs"/);
  });

  it("les dates se formatent côté serveur et descendent en chaînes", () => {
    /* La langue vit dans deux graphes de modules qui s'ignorent : une date
       rendue dans un composant client sort parfois dans l'autre langue. */
    expect(lire(PAGE)).toMatch(/fmtDateTime\(file\.review\.reviewedAt\)/);
    expect(lire(SIGNER)).not.toMatch(/fmtDateTime/);
  });
});

/**
 * LES TROIS ANGLES MORTS DU SCANNER DE CLEFS, TENUS À LA MAIN.
 *
 * Le scanner ne lit qu'un appel littéral au traducteur. Les intitulés passent
 * par t(variable), la phrase de la reprise vient d'un module de données, et
 * les états de la carte sont écrits dans un ternaire. Trois endroits où
 * l'anglais serait resté français sans que rien ne le dise.
 */
describe("ce que le scanner ne voit pas est traduit quand même", () => {
  it("les dix intitulés d'articles ont leur anglais", () => {
    const labels = (PASSAGES.convention ?? []).map((d) => d.label);
    expect(labels.length).toBe(10);
    for (const l of labels) expect(EN_ALL[l], l).toBeTruthy();
  });

  it("la phrase de la reprise aussi, et elle suit la version en vigueur", () => {
    /* Une version levée sans que la phrase change dirait au client que le
       texte a changé, sans dire quoi : c'est ce qu'on vient de réparer. */
    expect(CONVENTION_CHANGE.version).toBe(CONVENTION_VERSION);
    expect(EN_ALL[CONVENTION_CHANGE.quoi]).toBeTruthy();
    expect(["donne", "devons"]).toContain(CONVENTION_CHANGE.cote);
  });

  it("et les quatre états de la carte", () => {
    const etats = [
      "Elle est acceptée : votre exemplaire daté est dans vos documents, et vous pouvez la relire quand vous voulez.",
      "Le texte a changé sur un point qui vous engage. Sa page dit lequel, puis vous la reprenez par un code à usage unique.",
      "Dernière étape : elle se lit et se signe sur sa page, par un code à usage unique.",
      "Rien ne se signe avant l'approbation de votre dossier. Vous pouvez la lire dès maintenant, sur sa page.",
    ];
    const carte = lire(CARTE);
    for (const e of etats) {
      expect(carte, e).toContain(e);
      expect(EN_ALL[e], e).toBeTruthy();
    }
  });
});
