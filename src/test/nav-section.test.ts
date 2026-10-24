import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isEspaceSection, isFundsSection, isMarcheSection, isTitresSection, isTradeSection, listForFiche, TITRES } from "@/lib/nav-section";

/**
 * La fiche d'un fonds appartient aux Fonds, pas aux Titres.
 *
 * Les deux barres lisaient « commence par /offres » et rallumaient donc la
 * première icône dès qu'on ouvrait un fonds. Le cliquet est ici pour que la
 * règle ne se reperde pas : une adresse tombe dans une section et une seule.
 *
 * S'y ajoute depuis le 29 septembre 2026 la règle de la racine. « / » n'est
 * plus la liste des titres : c'est l'accueil, qui présente ou qui accueille
 * selon la session. La liste vit à « /titres », et aucun onglet d'instrument
 * ne doit s'allumer sur la racine.
 */
describe("la section d'une adresse", () => {
  it("range la fiche d'un fonds avec les fonds", () => {
    expect(isFundsSection("/offres/fund-fcp-corridor-rendement")).toBe(true);
    expect(isTitresSection("/offres/fund-fcp-corridor-rendement")).toBe(false);
  });

  it("laisse les autres fiches aux titres, avec leur liste", () => {
    for (const p of ["/offres/boc-cm0000020388", "/offres/ota-2031", "/titres"]) {
      expect(isTitresSection(p)).toBe(true);
      expect(isFundsSection(p)).toBe(false);
    }
  });

  it("garde la liste des fonds avec les fonds", () => {
    expect(isFundsSection("/fonds")).toBe(true);
    expect(isTitresSection("/fonds")).toBe(false);
  });

  it("ne range une adresse que dans une section", () => {
    for (const p of ["/", "/titres", "/fonds", "/offres/fund-x", "/offres/autre", "/marche", "/info", "/moi"]) {
      expect(Number(isTitresSection(p)) + Number(isFundsSection(p)) + Number(isEspaceSection(p))).toBeLessThanOrEqual(1);
    }
  });

  it("remonte vers la bonne liste depuis une fiche", () => {
    expect(listForFiche("/offres/fund-fcp-ab-cash")).toBe("/fonds");
    expect(listForFiche("/offres/boc-cm0000020388")).toBe(TITRES);
  });
});

/**
 * La racine n'est plus un instrument.
 *
 * C'est la règle que ce cliquet garde : un visiteur qui arrive sur l'accueil
 * ne doit voir aucun onglet de marché allumé, sans quoi il se croit dans une
 * liste. Et la racine appartient à l'espace du client, parce qu'un client
 * connecté y trouve le sien.
 */
describe("la racine, depuis qu'elle est l'accueil", () => {
  it("n'appartient à aucune section d'instrument", () => {
    expect(isTitresSection("/")).toBe(false);
    expect(isFundsSection("/")).toBe(false);
  });

  it("appartient à l'espace du client, avec le siège Portefeuille", () => {
    expect(isEspaceSection("/")).toBe(true);
    expect(isEspaceSection("/moi")).toBe(true);
    expect(isEspaceSection("/moi/reinvestir")).toBe(true);
  });

  it("ne réclame ni la liste des titres ni celle des fonds", () => {
    /* Y allumer « Portefeuille » est juste ; y allumer « Titres » ferait croire
       à un catalogue. */
    expect(isEspaceSection("/titres")).toBe(false);
    expect(isEspaceSection("/fonds")).toBe(false);
  });
});

/**
 * LE SOMMAIRE D'UN SIÈGE APPARTIENT À SON SIÈGE.
 *
 * Chaque siège du dock mène à son sommaire. Deux de ces sommaires ne
 * figuraient dans aucune règle d'appartenance : relevé le 24 octobre 2026, sur
 * « /portefeuille » comme sur « /instruments », AUCUN des cinq onglets n'était
 * marqué courant. On touchait un siège, on arrivait à destination, et la seule
 * chose qui dit où l'on est restait éteinte.
 *
 * TROIS SIÈGES MARCHAIENT PAR CHANCE, pas par principe : « /trader »,
 * « /marche » et « /aide » sont à la fois le sommaire et la racine du préfixe
 * que leur règle nomme. Les deux autres ont un sommaire dont l'adresse ne
 * ressemble à rien de ce que le siège contient — « /portefeuille » ne commence
 * pas par « /moi », « /instruments » ni par « /titres » ni par « /fonds ».
 *
 * L'épreuve lit les adresses DANS le dock plutôt que de les recopier : une
 * liste recopiée passerait au vert le jour où le dock change d'adresse, ce qui
 * est exactement le jour où elle devrait tomber.
 */
describe("chaque siège s'allume sur son propre sommaire", () => {
  const dock = fs.readFileSync(path.join(process.cwd(), "src/components/mobile/MobileShell.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  /* Les deux règles qui vivent en clair dans le dock : un préfixe chacune. */
  const REGLES: { nom: string; prend: (p: string) => boolean }[] = [
    { nom: "isEspaceSection", prend: isEspaceSection },
    { nom: "isTradeSection", prend: isTradeSection },
    { nom: "isMarcheSection", prend: isMarcheSection },
    { nom: "aide", prend: (p) => p === "/aide" || p.startsWith("/info") },
  ];

  const sommaires = [...dock.matchAll(/\{\s*href:\s*"([^"]+)",\s*label:\s*t\(/g)].map((m) => m[1]);

  /* QUATRE SIÈGES DEPUIS LA FUSION DU 24 OCTOBRE 2026. « Portefeuille » et
     « Instruments » étaient justement les deux qui ne s'allumaient pas, faute
     d'avoir déclaré leur sommaire ici ; ils ont fermé plutôt qu'été réparés,
     parce que l'un résumait la racine et l'autre nommait deux fois ce que
     Trade mène. Le compte est un plancher : un siège de plus devra, lui
     aussi, dire à quelle règle il appartient. */
  it("lit bien les quatre sièges du dock", () => {
    expect(sommaires.length, `sièges trouvés : ${sommaires.join(", ")}`).toBeGreaterThanOrEqual(4);
    expect(sommaires, "la racine porte désormais le premier siège").toEqual(expect.arrayContaining(["/", "/trader"]));
  });

  it("ne laisse aucun sommaire sans siège", () => {
    const orphelins = sommaires.filter((h) => !REGLES.some((r) => r.prend(h)));
    expect(orphelins, `ces adresses n'allument aucun onglet :\n  ${orphelins.join("\n  ")}`).toEqual([]);
  });

  it("n'en fait pas réclamer un par deux sièges", () => {
    const partages = sommaires.map((h) => ({ h, par: REGLES.filter((r) => r.prend(h)).map((r) => r.nom) })).filter((x) => x.par.length > 1);
    expect(partages, `deux onglets s'allumeraient ensemble :\n  ${partages.map((x) => `${x.h} → ${x.par.join(" + ")}`).join("\n  ")}`).toEqual([]);
  });
});
