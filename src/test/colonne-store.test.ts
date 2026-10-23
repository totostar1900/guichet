import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * LA BOUCLE DE RENDU QUI A FERMÉ LE DESK, ET CE QUI L'EMPÊCHE DE REVENIR.
 *
 * Le 19 octobre 2026, la console du desk portait douze mille six cents
 * « Maximum update depth exceeded » et la page ne répondait plus à aucun clic.
 * Le symptôme s'est présenté comme « les liens du rail n'ouvrent pas les
 * pages ». Il n'avait rien à voir avec les liens : le routeur n'arrivait
 * jamais à poser la page suivante, parce que React redessinait sans fin.
 *
 * LE MÉCANISME, EN QUATRE TEMPS. La fonction d'écriture des pastilles était
 * créée dans le `useMemo` qui calcule les badges, donc elle changeait
 * d'identité à chaque changement d'état. L'effet qui déclare les pastilles en
 * dépend, donc il se rejouait. Son NETTOYAGE écrivait « rien », l'effet
 * réécrivait les chiffres, et l'on repartait.
 *
 * DEUX INVARIANTS LE TIENNENT FERMÉ, et cet essai garde les deux.
 *
 *   LA FONCTION D'ÉCRITURE NE CHANGE JAMAIS D'IDENTITÉ. « useCallback » avec
 *   une liste de dépendances VIDE : la forme fonctionnelle de `setState` lui
 *   permet de ne rien capturer.
 *
 *   UNE ÉCRITURE QUI NE CHANGE RIEN REND LE MÊME OBJET. React renonce alors
 *   au rendu, et une déclaration répétée ne coûte pas un tour.
 *
 * Un rendu statique ne joue pas les effets, donc la boucle elle-même ne se
 * rejoue pas ici : ce sont ses deux conditions d'existence qu'on surveille,
 * dans la source, là où elles se cassent.
 */
const ROOT = path.resolve(__dirname, "../..");
const SRC = fs.readFileSync(path.join(ROOT, "src/components/ColonneStore.tsx"), "utf8");

describe("le magasin de la colonne ne peut pas boucler", () => {
  it("la fonction d'écriture est mémoïsée sans dépendance", () => {
    /* « useCallback<…>((…) => {…}, []) » : on exige la liste vide, parce
       qu'une seule dépendance suffit à rouvrir la boucle. */
    expect(SRC, "« poserBadges » doit être créée par useCallback").toMatch(/const poserBadges = useCallback/);
    const apres = SRC.slice(SRC.indexOf("const poserBadges = useCallback"));
    const fin = apres.indexOf("}, []);");
    expect(fin, "« poserBadges » doit se fermer sur une liste de dépendances VIDE : « }, []); »").toBeGreaterThan(0);
  });

  it("elle n'est pas recréée dans le useMemo des badges", () => {
    /* C'est la faute d'origine : la fonction vivait dans le memo, donc elle
       renaissait à chaque changement d'état. */
    /* Le memo doit se contenter de la forme abrégée « poserBadges », qui LIT
       la fonction. « poserBadges: (…) => » la définirait, et c'est la faute
       d'origine. On lit la ligne du memo, pas une tranche de fichier : un
       découpage approximatif se trompe de cible et croit avoir prouvé. */
    const ligne = SRC.split("\n").find((l) => l.includes("badges:") && l.includes("poserBadges"));
    expect(ligne, "la valeur du contexte doit tenir sur une ligne reconnaissable").toBeTruthy();
    expect(ligne, "le useMemo ne doit que LIRE « poserBadges », jamais la définir").toMatch(/,\s*poserBadges\s*\}/);
  });

  it("une écriture identique rend le même objet, donc ne redessine pas", () => {
    expect(SRC, "sans ce renoncement, chaque rendu de page coûterait un tour de colonne").toMatch(/return p;/);
  });

  it("l'effet qui déclare les pastilles nettoie en partant", () => {
    /* Un compte qui survit à la page qui l'a produit ferait dire à la colonne
       « sept à valider » sur une page qui n'en sait plus rien. */
    expect(SRC).toMatch(/return \(\) => poserBadges\(cle, \{\}\);/);
  });
});

/**
 * UN MAGASIN SANS LECTEUR EST UN FIL COUPÉ, ET IL L'A ÉTÉ.
 *
 * `DeskNav` compte ce qui attend, page par page, et le déclare au magasin ; sa
 * documentation dit « elle les déclare donc au magasin, et la colonne les
 * lit ». La colonne ne les lisait pas : elle attendait une `prop` que
 * `layout.tsx` ne lui a jamais passée, et `useColonne` n'avait donc qu'un seul
 * appelant dans tout le dépôt — l'ÉCRIVAIN.
 *
 * TOUT S'ÉTEIGNAIT EN SILENCE : le bloc « En cours » ne paraissait jamais,
 * puisqu'il se tait faute de chiffre ; aucune pastille ne s'allumait dans le
 * rail, ni dans les favoris, ni dans les résultats de recherche ; et un groupe
 * replié annonçait toujours zéro alerte, donc ne disait jamais ce qu'il
 * cachait. Mesuré le 24 octobre 2026 : `/desk/a-valider` publiait 3,
 * `/desk/messages` 2, `/desk/clients` 1, et le rail n'en montrait aucun.
 *
 * Aucun rendu ne casse quand ce fil se recoupe. L'épreuve le tient donc par
 * les deux bouts : il existe un écrivain, et il existe un lecteur AILLEURS.
 */
describe("le magasin des pastilles a un lecteur", () => {
  const ROOT2 = path.resolve(__dirname, "../..");
  const lire = (p: string) => fs.readFileSync(path.join(ROOT2, p), "utf8");

  it("fait lire les pastilles à la colonne", () => {
    const colonne = lire("src/components/Colonne.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(colonne, "la colonne ne lit plus le magasin : le rail s'éteint sans que rien n'échoue").toMatch(/useColonne\(\)/);
    expect(colonne, "la colonne lit le magasin mais n'en tire pas les pastilles").toMatch(/badges:\s*duMagasin/);
  });

  it("garde au magasin un appelant qui n'est pas son écrivain", () => {
    const appelants = fs
      .readdirSync(path.join(ROOT2, "src/components"))
      .filter((f) => f.endsWith(".tsx") && f !== "ColonneStore.tsx")
      .filter((f) => /useColonne\(\)/.test(lire(`src/components/${f}`)));
    expect(appelants.length, "plus personne ne lit le magasin hors de l'écrivain").toBeGreaterThan(0);
  });
});
