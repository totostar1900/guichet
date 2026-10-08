import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { attentesDuClient, type ContexteClient } from "@/lib/domain/services";

/**
 * Ce qui attend le client : ce qui y entre, et dans quel ordre.
 *
 * DEUX DEVOIRS MANQUAIENT. La liste portait l'argent qui dort, la séance
 * annoncée et le flux en retard, c'est-à-dire trois occasions. Les deux seules
 * choses qui bloquent un ordre DÉJÀ ENGAGÉ n'y étaient pas : signer un
 * bulletin, et répondre à une contre-proposition.
 *
 * LE COMPTE MENTAIT. La fonction coupait à trois, et le compteur de la barre
 * comptait la liste coupée : cinq attentes s'affichaient « 3 ». Elle rend tout
 * maintenant, et c'est l'écran qui coupe.
 *
 * L'ORDRE EST LA RÈGLE, pas une préférence : un devoir précède une occasion.
 * Aucune séance annoncée ne vaut qu'on laisse en plan un ordre qui attend sa
 * signature.
 */
const fmt = (n: number) => String(n);

const vide: ContexteClient = {
  lignes: 0,
  fondsOuverts: 9,
  disponible: 0,
  aSigner: 0,
  aRepondre: 0,
  moisDHistorique: 0,
  appariementExecutable: false,
};

const cles = (c: ContexteClient) => attentesDuClient(c, fmt).map((a) => a.cle);

describe("ce qui entre dans la liste", () => {
  it("ne rend rien quand rien n'attend : la bande disparaît", () => {
    // C'est ce qui permet à l'écran de ne pas afficher « rien à décider ».
    expect(attentesDuClient(vide, fmt)).toEqual([]);
  });

  it("porte un bulletin à signer, qui n'y était pas", () => {
    expect(cles({ ...vide, aSigner: 1 })).toEqual(["signer"]);
  });

  it("porte une contre-proposition à trancher, qui n'y était pas non plus", () => {
    expect(cles({ ...vide, aRepondre: 2 })).toEqual(["repondre"]);
  });

  it("accorde le mot au nombre", () => {
    expect(attentesDuClient({ ...vide, aSigner: 1 }, fmt)[0].chiffre).toEqual({ key: "1 ordre" });
    // Le mot passe par le dictionnaire : trois rangées ont montré « 1 ordre » en français dans une page anglaise.
    expect(attentesDuClient({ ...vide, aSigner: 3 }, fmt)[0].chiffre).toEqual({ key: "{n} ordres", params: { n: 3 } });
  });
});

describe("l'ordre, qui est une règle", () => {
  it("met les devoirs avant les occasions", () => {
    /* Un ordre confirmé attend une signature : aucune séance annoncée ne vaut
       qu'on le laisse en plan. */
    const c: ContexteClient = { ...vide, aSigner: 1, aRepondre: 1, disponible: 500_000, prochaineSeance: { pays: "Cameroun", quoi: "BTA 26 sem.", le: "9 octobre" } };
    expect(cles(c)).toEqual(["signer", "repondre", "disponible", "seance"]);
  });

  it("met l'argent déjà arrivé avant l'occasion qui n'est qu'annoncée", () => {
    const c: ContexteClient = { ...vide, disponible: 500_000, prochaineSeance: { pays: "Cameroun", quoi: "BTA", le: "9 octobre" } };
    expect(cles(c)).toEqual(["disponible", "seance"]);
  });
});

/**
 * LE DOSSIER, TROISIÈME DEVOIR, ET LE PLUS COÛTEUX DES TROIS.
 *
 * Mesuré le 8 octobre 2026 sur la base de production : un dossier approuvé, la
 * convention jamais acceptée, un code envoyé puis périmé, et pas une ligne de
 * l'application pour nommer le geste. La convention ferme `peutOPCVM`, donc
 * toute souscription, donc tout bulletin à signer : c'était la seule attente
 * qui bloquait les autres, et la seule qui ne se comptait pas.
 */
describe("le dossier d'ouverture", () => {
  it("passe devant tout, parce qu'il ferme tout", () => {
    const c: ContexteClient = { ...vide, dossier: "convention", aSigner: 1, disponible: 500_000 };
    expect(cles(c)).toEqual(["convention", "signer", "disponible"]);
  });

  it("mène à la page du dossier, et nomme le geste", () => {
    const a = attentesDuClient({ ...vide, dossier: "convention" }, fmt)[0];
    expect(a.href).toBe("/ouvrir-un-compte");
    expect(a.geste).toBe("Accepter ma convention");
    // Le ton du retard : ce qui bloque se dit comme ce qui bloque.
    expect(a.ton).toBe("retard");
  });

  it("dit l'autre état où le desk rend la main", () => {
    const a = attentesDuClient({ ...vide, dossier: "complements" }, fmt)[0];
    expect(a.cle).toBe("complements");
    expect(a.href).toBe("/ouvrir-un-compte");
  });

  it("ne dit rien quand personne n'attend", () => {
    /* Le brouillon n'est pas un devoir : c'est une invitation, et une liste de
       devoirs qui contient une invitation ne veut plus rien dire. L'absence de
       champ est le cas d'un compte ouvert comme d'un dossier jamais commencé. */
    expect(cles(vide)).toEqual([]);
  });
});

/**
 * OÙ LA LISTE SE LIT, ET POURQUOI C'EST LA PREMIÈRE PAGE.
 *
 * Elle a vécu trois mois sur « Agir » seulement, au motif qu'un geste se range
 * au siège du geste. La leçon du 8 octobre : un geste bien rangé reste
 * invisible s'il faut déjà savoir qu'il existe pour aller le chercher. La page
 * d'arrivée d'un client connecté la porte donc, et les occasions du desk
 * viennent dessous, dans cet ordre.
 */
describe("où la liste se lit", () => {
  const lire = (p: string) => readFileSync(p, "utf8");

  it("la page d'arrivée porte les devoirs, puis les occasions", () => {
    const src = lire("src/app/Console.tsx");
    const attend = src.indexOf("<CeQuiVousAttend");
    const offres = src.indexOf("<SelectionDuDesk");
    const valeur = src.indexOf("styles.valeur");
    expect(attend).toBeGreaterThan(0);
    expect(offres).toBeGreaterThan(attend);
    expect(valeur).toBeGreaterThan(offres);
  });

  it("un seul assemblage sert la bande et les services", () => {
    // La page « Agir » en refaisait un deuxième, et lui seul remplissait
    // compteOuvert : la bande supposait donc partout le compte ouvert.
    const src = lire("src/app/trader/page.tsx");
    expect(src).toContain("contexteDuClient(s.userId)");
    expect(src).not.toContain("const ctx: ContexteClient = {");
  });

  /**
   * LE COMPTEUR DOIT ÊTRE RENDU PAR UN COMPOSANT QUE LE CLIENT VOIT.
   *
   * Il a vécu trois jours sur le « ⋮ » APRÈS que ce bouton eut cessé
   * d'exister pour les clients connectés (AppMenu : `if (signedIn && !desk)
   * return null`). La couche entière restait en place : le layout appelait
   * compterAttentes à chaque page, passait le nombre de main en main, et la
   * pastille se rendait dans une branche morte. Rien n'échouait, rien ne se
   * voyait. Le compteur vit maintenant sur l'initiale, qui est la seule porte
   * du client depuis le 5 octobre 2026.
   */
  it("la pastille est rendue là où le client connecté regarde, et elle mène quelque part", () => {
    const menu = lire("src/components/AppMenu.tsx");
    // Le « ⋮ » n'existe pas pour un client connecté : il ne doit donc plus rien compter.
    expect(menu).toContain("if (signedIn && !desk) return null");
    expect(menu).not.toContain("aDecider");
    const compte = lire("src/components/mobile/AccountMenu.tsx");
    // Un lien, pas un ornement : une attente y va tout droit, plusieurs ouvrent la bande.
    expect(compte).toContain("styles.alerte");
    expect(compte).toContain('attentes.length === 1 ? attentes[0].href : "/#a-decider"');
    const layout = lire("src/app/layout.tsx");
    expect(layout).toContain("attentes={deskUi ? [] : attentes}");
  });

  it("l'assemblage lit le dossier, et ne suppose plus le compte ouvert", () => {
    const src = lire("src/lib/domain/contexte-client.ts");
    expect(src).toContain("getClientFileByUser");
    expect(src).toContain("dossier:");
    expect(src).toContain("compteOuvert:");
  });
});

/**
 * LE BOUTON QUI NE MÈNE NULLE PART, ET LE DEVOIR QUI N'EN EST PAS UN.
 *
 * Mesuré en production le 8 octobre 2026, sur le compte qui se plaignait de
 * ne pas pouvoir signer. Deux défauts se superposaient :
 *
 * 1. Une QUESTION posée au desk (type « info »), que le desk avait prise en
 *    main, portait l'état « confirmée ». Le compte des bulletins à signer ne
 *    regardait que l'état : la bande annonçait « 1 ordre · le bulletin est
 *    prêt » pour une question.
 * 2. Son bouton « Signer » menait à « / ». C'était juste tant que la bande
 *    vivait sur Agir ; depuis qu'elle est sur la page d'arrivée, il renvoyait
 *    à la page qu'on avait déjà sous les yeux. Rien ne s'ouvrait, et c'était
 *    exactement ce qui était écrit.
 */
describe("signer mène à l'ordre à signer", () => {
  it("une seule attente : le bouton va droit à l'ordre", () => {
    const a = attentesDuClient({ ...vide, aSigner: 1, ouSigner: "i-42" }, fmt)[0];
    expect(a.href).toBe("/moi/ordres/i-42");
  });

  it("plusieurs : il va à leur liste, jamais à la page où l'on est", () => {
    const a = attentesDuClient({ ...vide, aSigner: 3 }, fmt)[0];
    expect(a.href).toBe("/moi#ordres-en-cours");
    expect(a.href).not.toBe("/");
  });

  it("aucune attente ne renvoie plus à la racine", () => {
    const c: ContexteClient = { ...vide, aSigner: 1, aRepondre: 1, dossier: "convention", disponible: 500_000 };
    for (const a of attentesDuClient(c, fmt)) expect(a.href).not.toBe("/");
  });
});

describe("le compte ne se plafonne plus", () => {
  it("rend les cinq, là où il en rendait trois", () => {
    /* LE DÉFAUT MESURÉ : la fonction coupait à trois et le compteur comptait la
       liste coupée. Cinq attentes s'affichaient « 3 », et les deux dernières
       n'existaient pour personne. */
    const c: ContexteClient = {
      ...vide,
      aSigner: 1,
      aRepondre: 1,
      disponible: 500_000,
      prochaineSeance: { pays: "Cameroun", quoi: "BTA", le: "9 octobre" },
      attendu: { montant: 120_000, retardJours: 4 },
    };
    expect(attentesDuClient(c, fmt)).toHaveLength(5);
  });
});
