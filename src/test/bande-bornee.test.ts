import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { attentesDuClient } from "@/lib/domain/services";
import type { ContexteClient } from "@/lib/domain/services";

/**
 * LA BANDE DES DEVOIRS SE BORNE, ET NE CACHE RIEN.
 *
 * Mesuré le 24 octobre 2026 à 390 px, sur le compte de démonstration et ses
 * DEUX attentes : la bande fait 239 px d'un écran de 844, et l'en-tête du
 * siège avec elle en fait 425 — la moitié de l'écran avant la première ligne
 * de ce qu'on était venu chercher. À deux, le sommaire reste visible.
 *
 * Mais la liste peut en porter NEUF, et une cinquième ligne pousse la page du
 * siège sous la ligne de flottaison. C'est le genre de défaut qui n'arrive
 * jamais au développeur — son compte de démonstration en a deux — et toujours
 * au client qui va mal : celui dont la convention, les pièces, le bulletin et
 * la contre-proposition attendent en même temps.
 *
 * LA RÈGLE : deux sur un siège, toutes sur la page d'arrivée, et une ligne
 * qui nomme le reste et y mène. Ne rien cacher n'oblige pas à tout montrer au
 * même endroit ; cela oblige à dire qu'il y a autre chose, et où.
 */
const SRC = join(process.cwd(), "src");
const lire = (p: string) => readFileSync(join(SRC, p), "utf8");
const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

describe("la bande se borne", () => {
  const bande = lire("components/CeQuiVousAttend.tsx");
  const corps = sansCommentaires(bande.slice(bande.indexOf("export async function CeQuiVousAttend")));

  it("ne montre que les deux premières, sauf quand la page les a pour sujet", () => {
    expect(corps, "la bande ne se borne plus").toContain("attentes.slice(0, 2)");
    expect(corps, "la borne ne se lève plus pour la page d'arrivée").toMatch(/tout \? attentes :/);
  });

  it("nomme le reste et y mène", () => {
    expect(corps, "le reste n'est plus compté").toContain("attentes.length - montrees.length");
    expect(corps, "le reste ne mène plus à la liste entière").toContain('href="/#a-decider"');
    /* L'ancre est posée par la bande elle-même : le lien et sa cible ne
       peuvent pas diverger. */
    expect(corps, "l'ancre de la bande a changé de nom").toContain('id="a-decider"');
  });

  /**
   * LA PAGE D'ARRIVÉE LES PORTE TOUTES, et c'est la seule. Si un siège se
   * mettait à passer « tout », la borne ne protégerait plus rien ; si la page
   * d'arrivée cessait de le passer, le lien « et {n} autres » mènerait à une
   * liste bornée, c'est-à-dire à rien.
   */
  it("distingue la page d'arrivée des deux sièges", () => {
    expect(sansCommentaires(lire("app/Console.tsx")), "la page d'arrivée ne porte plus la liste entière").toMatch(/<CeQuiVousAttend userId=\{session\.userId\} tout \/>/);
    for (const p of ["app/portefeuille/page.tsx", "app/trader/page.tsx"]) {
      expect(sansCommentaires(lire(p)), `${p} : un siège porte la file d'attente entière`).not.toContain("tout");
    }
  });

  /**
   * L'ORDRE VIENT DU DOMAINE, et couper à deux ne vaut que s'il va du plus
   * bloquant au moins. Le dossier passe devant tout — tant que la convention
   * n'est pas acceptée, rien ne se souscrit — puis ce qui est signé, puis ce
   * qui dort, puis ce qui s'annonce.
   */
  it("garde les deux qui bloquent le plus", () => {
    const ctx = {
      dossier: "convention",
      aSigner: 1,
      aRepondre: 1,
      disponible: 500_000,
      lignes: 0,
      compteOuvert: true,
    } as unknown as ContexteClient;
    const cles = attentesDuClient(ctx, (n) => String(n)).map((a) => a.cle);
    expect(cles.slice(0, 2), "la convention et la signature ne passent plus devant").toEqual(["convention", "signer"]);
    expect(cles.length, "le compte d'essai ne porte plus assez d'attentes pour que la borne se voie").toBeGreaterThan(2);
  });

  /**
   * SANS MARGE À ELLE. Ses trois pages sont des colonnes à écart déclaré, et
   * la marge s'ajoutait à l'écart : 64 px de vide sous la bande contre 32
   * partout ailleurs sur la même page.
   */
  it("ne pose pas sa propre marge dans une mise en page à écart", () => {
    expect(lire("components/CeQuiVousAttend.module.css")).not.toMatch(/\.bande \{[^}]*margin-bottom/);
  });
});
