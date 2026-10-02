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
    expect(attentesDuClient({ ...vide, aSigner: 1 }, fmt)[0].chiffre).toBe("1 ordre");
    expect(attentesDuClient({ ...vide, aSigner: 3 }, fmt)[0].chiffre).toBe("3 ordres");
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
