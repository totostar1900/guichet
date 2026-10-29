import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { lignesSuivies } from "@/lib/domain/suivies";
import type { Offer, Watch } from "@/lib/domain/types";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const veille = (offerId: string): Watch => ({ id: `w-${offerId}`, userId: "u1", offerId, createdAt: "2026-10-01T00:00:00Z" }) as Watch;
const offre = (id: string): Offer => ({ id, title: `Ligne ${id}` }) as Offer;

/**
 * LE COMPTE DE L'ACCUEIL ET LA LISTE DE LA PAGE, PAR LA MÊME FONCTION.
 *
 * Une veille porte un « offerId » qui peut ne plus désigner personne : une
 * offre retirée du catalogue, masquée, ou absente du jeu qu'on vient de lire.
 * La page des lignes suivies écartait déjà ces veilles-là, chez elle. Le jour
 * où l'accueil annonce quatre lignes et où la page en montre trois, personne
 * ne sait laquelle des deux ment.
 */
describe("les lignes suivies", () => {
  it("ne retient que les veilles dont la ligne existe encore", () => {
    const suivies = lignesSuivies([veille("a"), veille("disparue"), veille("b")], [offre("a"), offre("b")]);
    expect(suivies.map((o) => o.id)).toEqual(["a", "b"]);
  });

  it("garde l'ordre des veilles, et non celui du catalogue", () => {
    /* On retrouve ses lignes là où on les a posées. */
    const suivies = lignesSuivies([veille("b"), veille("a")], [offre("a"), offre("b")]);
    expect(suivies.map((o) => o.id)).toEqual(["b", "a"]);
  });

  it("ne rend rien quand rien n'est suivi", () => {
    expect(lignesSuivies([], [offre("a")])).toEqual([]);
  });

  /* LA SURFACE QUI LES MONTRE PASSE PAR LÀ, et c'est tout l'objet. Refaire
     le tri des veilles à la main rouvrirait un écart qui ne se voit que le
     jour où une offre disparaît du catalogue.

     ELLES ÉTAIENT DEUX JUSQU'AU 29 OCTOBRE 2026 : l'accueil en portait le
     compte dans une rubrique. Ce compte est parti — « ne plus annoncer le
     nombre de lignes ou de services dans les intitulés » — et l'accueil ne
     lit donc plus les veilles du tout. Il en reste une, et la règle vaut
     entière pour elle. */
  it("est la seule façon dont la page des lignes suivies les compte", () => {
    const f = "src/app/moi/suivies/page.tsx";
    expect(code(f), `${f} ne passe plus par « lignesSuivies »`).toContain("lignesSuivies(");
    expect(code(f), `${f} refait le tri des veilles à la main`).not.toMatch(/\.map\(\s*\(\s*w\s*\)\s*=>\s*\w+\.get\(\s*w\.offerId\s*\)/);
  });

  /* ET L'ACCUEIL N'EN DIT PLUS RIEN, ni la liste ni le nombre.
     LA LISTE, parce qu'elle se lisait trois lignes après « Vos lignes » et
     que les deux se confondaient — ce qu'on a, ce qu'on regarde.
     LE NOMBRE, parce qu'un intitulé n'annonce pas son inventaire. L'ancienne
     défense du compte — « un compte ne se confond avec rien » — répondait à
     la confusion, pas au ton, et c'est le ton qui était en cause. */
  it("ne remet sur la page d'arrivée ni la liste des titres suivis ni leur nombre", () => {
    const console = code("src/app/Console.tsx");
    expect(console, "l'accueil remonte les titres suivis un par un : ils se confondront avec les lignes détenues").not.toMatch(/suivies\.map\(/);
    expect(console, "le compte des lignes suivies est revenu dans la rubrique").not.toMatch(/suivies\.length/);
    expect(console, "l'accueil relit les veilles : elles ne servaient qu'à ce compte").not.toMatch(/listWatches|lignesSuivies\(/);
  });
});
