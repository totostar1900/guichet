import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const ACTION = "src/app/sondage/actions.ts";
const FORM = "src/app/sondage/Formulaires.tsx";

/**
 * UN GESTE, PLUSIEURS SŒURS — RELEVÉ LE 29 OCTOBRE 2026.
 *
 * Le client qui prendrait du camerounais OU du gabonais, à deux, cinq OU sept
 * ans, devait remplir six fois le même formulaire — ou n'en remplir qu'un et
 * taire le reste. Le desk ne voyait alors qu'un sixième de ce que la place
 * accepterait, et c'est exactement ce qu'un sondage sert à savoir.
 *
 * LE GESTE A UNE CONSÉQUENCE SUR LE MODÈLE, et elle est tout l'objet de la
 * doctrine : six lignes nées d'un geste sont des ALTERNATIVES. Les créer sans
 * les lier reviendrait à compter six fois cinquante millions. Les épreuves
 * ci-dessous gardent le chemin complet : l'écran qui propose plusieurs, le
 * serveur qui les lie, et la borne qui empêche qu'un clic en produise
 * quarante-huit.
 */
describe("un geste, plusieurs sœurs", () => {
  /* LE SERVEUR LIT DES LISTES, et c'est la clause la plus fragile : un
     « Object.fromEntries » sur un FormData ne garde que la DERNIÈRE valeur de
     chaque nom. Un formulaire qui enverrait six pays n'en ferait arriver qu'un,
     en silence, et la proposition serait amputée sans que rien ne le dise. */
  it("lit tous les Trésors et toutes les durées envoyés", () => {
    const src = code(ACTION);
    expect(src, "le serveur ne lit plus qu'un Trésor : « fromEntries » ne garde que le dernier").toMatch(/form\.getAll\("country"\)/);
    expect(src, "le serveur ne lit plus qu'une durée").toMatch(/form\.getAll\("tenor"\)/);
    expect(src, "les doublons ne sont plus écartés : deux fois le même Trésor ferait deux lignes identiques").toMatch(/new Set\(form\.getAll\("country"\)/);
  });

  /* LE LIEN DE FAMILLE N'EST POSÉ QUE S'IL Y A UNE FAMILLE. Une ligne seule
     qui porterait un identifiant ne serait liée à personne, et le consensus la
     croirait partagée : elle cesserait d'être ferme sans raison. */
  it("ne pose un lien de famille que sur une vraie fratrie", () => {
    const src = code(ACTION);
    expect(src, "le lien de famille n'est plus conditionné au nombre de lignes").toMatch(/pays\.length \* durees\.length > 1 \? randomUUID\(\) : undefined/);
    expect(src, "les lignes ne partagent plus leur famille").toMatch(/familleId \}\)\)/);
  });

  /* LA BORNE. Six Trésors par huit durées font quarante-huit lignes d'un clic ;
     le desk ne lirait plus une proposition mais une liste, et la page du client
     non plus. */
  it("refuse qu'un seul clic produise une liste", () => {
    const src = code(ACTION);
    expect(src, "la borne du nombre de sœurs a disparu").toMatch(/MAX_SOEURS/);
    expect(lire(ACTION), "la borne n'est plus un nombre nommé").toMatch(/const MAX_SOEURS = \d+;/);
  });

  /* LE FIL DU DESK DOIT DIRE « ALTERNATIVES ». Six lignes affichées comme six
     demandes donneraient à lire trois cents millions là où le client en engage
     cinquante — et c'est le desk qui porte ce chiffre au Trésor. */
  it("dit au desk que ce sont des alternatives", () => {
    /* LA CLAUSE VISE LE FIL, ET RIEN D'AUTRE. Écrite d'abord sur le mot
       « alternatives » n'importe où dans le fichier, elle ne tombait pas quand
       on le retirait du fil : le message rendu au client porte le même mot, et
       il suffisait à la satisfaire. Vérification inverse faite. */
    const src = code(ACTION);
    const deb = src.indexOf("logEvent");
    expect(deb, "le fil du desk n'est plus écrit du tout").toBeGreaterThan(0);
    const fil = src.slice(deb, deb + 700);
    expect(fil, "le fil du desk présente une fratrie comme des demandes séparées").toMatch(/alternatives/);
    expect(fil, "le fil ne dit plus que le montant ne se compte qu'une fois").toMatch(/ne se compte qu'une fois/);
  });

  /* L'ÉCRAN : des jetons qui s'ajoutent, et ce qu'ils produisent, écrit. */
  it("propose plusieurs choix et montre ce qu'ils produisent", () => {
    const src = code(FORM);
    expect(src, "les jetons à choix multiple ont disparu").toMatch(/styles\.jetonOn/);
    expect(src, "les champs cachés qui portent les choix ont disparu").toMatch(/name="country" value=\{p\}/);
    expect(src, "le nombre de lignes produites ne se lit plus").toMatch(/lignesProduites\.length > 1/);
    // Et la phrase qui dit ce qu'elles NE font pas : s'additionner.
    expect(src, "l'écran ne dit plus que ce sont des alternatives").toMatch(/Ce sont des alternatives/);
  });

  /* CHANGER DE COMPARTIMENT CHANGE LA LISTE DES DURÉES. Une durée d'obligation
     retenue puis laissée sur un bon ne paraîtrait plus cochée tout en partant
     quand même : un champ caché ne se voit pas. */
  it("n'envoie pas une durée que le compartiment ne propose plus", () => {
    const src = code(FORM);
    expect(src, "les durées envoyées ne sont plus filtrées par le compartiment").toMatch(/tenorsValides = tenors\.filter/);
    expect(src, "les champs cachés portent de nouveau les durées non filtrées").toMatch(/tenorsValides\.map\(\(d\) => \(\s*<input/);
  });

  /* LA BASE PORTE LE LIEN, et les deux dépôts le rendent. Sans cela, la
     famille vivrait en mémoire et disparaîtrait au premier rechargement. */
  it("fait vivre le lien jusqu'à la base", () => {
    const migration = lire("supabase/migrations/0121_lignes_soeurs.sql");
    expect(migration, "la colonne de famille a disparu de la migration").toMatch(/add column if not exists famille_id/);
    expect(migration, "le desk peut de nouveau porter une famille").toMatch(/famille_id is null or origine = 'client'/);
    const sb = lire("src/lib/data/supabase.ts");
    expect(sb, "le dépôt ne lit plus la famille").toMatch(/familleId: u\(r\.famille_id\)/);
    expect(sb, "le dépôt n'écrit plus la famille").toMatch(/famille_id: input\.familleId \?\? null/);
    expect(lire("src/lib/domain/schema-attendu.ts"), "le relevé du schéma ignore la colonne : relancer « npm run schema:attendu »").toMatch(/"survey_lines\.famille_id"/);
  });
});
