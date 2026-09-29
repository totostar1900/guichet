import { describe, expect, it } from "vitest";
import { attentesDuClient, compteDesEtats, servicesDuClient, type ContexteClient } from "@/lib/domain/services";

/**
 * Un service se présente par son état, jamais par sa description.
 *
 * C'est la règle que ce module existe pour tenir, et elle se perd vite : il
 * suffit qu'une phrase cesse de parler des chiffres du client pour redevenir
 * une brochure. « Épargne programmée » ne se lit pas ; « 50 000 le 5 ·
 * prochain le 5 octobre » se lit.
 */

const vide: ContexteClient = {
  lignes: 0,
  fondsOuverts: 9,
  disponible: 0,
  moisDHistorique: 0,
  appariementExecutable: false,
};

const garni: ContexteClient = {
  lignes: 4,
  partsDeFonds: { titre: "Fonds Obligataire CEMAC", parts: 84.312 },
  fondsOuverts: 9,
  actions: { titre: "SEMC", n: 40 },
  disponible: 180_000,
  attendu: { montant: 90_000, retardJours: 28 },
  reinvestissement: { destination: "Fonds Obligataire CEMAC", plancher: 25_000, dernier: { montant: 120_000, le: "14 juin" } },
  epargne: { montant: 50_000, jour: 5, destination: "Fonds Obligataire CEMAC", prochain: "5 octobre" },
  garde: { periode: "2026-T3", du: 0 },
  prochaineSeance: { pays: "Cameroun", quoi: "BTA 26 semaines", le: "2 octobre" },
  moisDHistorique: 14,
  appariementExecutable: false,
};

const parCle = (c: ContexteClient) => new Map(servicesDuClient(c).map((s) => [s.cle, s]));

describe("les neuf services, quel que soit le client", () => {
  it("sont toujours neuf, et chacun une seule fois", () => {
    for (const c of [vide, garni]) {
      const v = servicesDuClient(c);
      expect(v).toHaveLength(9);
      expect(new Set(v.map((s) => s.cle)).size).toBe(9);
      expect(new Set(v.map((s) => s.n)).size).toBe(9);
    }
  });

  it("rangent ce qui tourne avant ce qui dort, et ce qui est fermé en dernier", () => {
    const etats = servicesDuClient(garni).map((s) => s.etat);
    const rang = { en_place: 0, a_activer: 1, indisponible: 2 } as const;
    expect(etats.every((e, i) => i === 0 || rang[etats[i - 1]] <= rang[e])).toBe(true);
  });

  it("portent tous une phrase, et jamais une phrase vide", () => {
    for (const s of servicesDuClient(garni)) expect(s.phrase.key.length).toBeGreaterThan(20);
  });

  it("disent toujours où le service vit", () => {
    for (const s of servicesDuClient(vide)) {
      expect(s.ou.length).toBeGreaterThan(2);
      expect(s.href.startsWith("/")).toBe(true);
    }
  });
});

describe("l'état suit la donnée du client", () => {
  it("met en place ce qui tourne réellement", () => {
    const m = parCle(garni);
    expect(m.get("reinvestissement")!.etat).toBe("en_place");
    expect(m.get("epargne")!.etat).toBe("en_place");
    expect(m.get("garde")!.etat).toBe("en_place");
  });

  it("propose d'activer ce qui est ouvert et jamais pris", () => {
    const m = parCle(garni);
    expect(m.get("passage")!.etat).toBe("a_activer");
    expect(m.get("sondage")!.etat).toBe("a_activer");
  });

  it("ferme ce qui n'a pas de prise, et dit pourquoi", () => {
    /* Un service grisé sans raison se lit comme une panne. */
    const m = parCle(vide);
    expect(m.get("passage")!.etat).toBe("indisponible");
    expect(m.get("passage")!.phrase.key).toMatch(/aucune part de fonds/);
    expect(m.get("sondage")!.etat).toBe("indisponible");
    expect(m.get("sondage")!.sinon?.key).toBeTruthy();
  });

  it("ferme l'appariement tant que la maison n'a pas tranché", () => {
    expect(parCle(garni).get("appariement")!.etat).toBe("indisponible");
    expect(parCle({ ...garni, appariementExecutable: true }).get("appariement")!.etat).toBe("en_place");
  });

  it("compte les trois états sans en perdre un", () => {
    const c = compteDesEtats(servicesDuClient(garni));
    expect(c.en_place + c.a_activer + c.indisponible).toBe(9);
    expect(c.en_place).toBe(3);
  });
});

describe("ce qu'une phrase dit, et ce qu'elle ne dit pas", () => {
  it("parle des chiffres du client quand il en a", () => {
    const m = parCle(garni);
    expect(m.get("epargne")!.phrase.params).toMatchObject({ m: 50_000, j: 5 });
    expect(m.get("passage")!.phrase.params).toMatchObject({ n: 84.312, d: "Fonds Obligataire CEMAC" });
    expect(m.get("garde")!.phrase.params).toMatchObject({ n: 4 });
  });

  it("dit ce qui SE PASSERAIT pour un service jamais pris", () => {
    /* C'est la moitié du service : sans elle, la ligne redevient une brochure. */
    const dort = parCle({ ...garni, reinvestissement: undefined }).get("reinvestissement")!;
    expect(dort.etat).toBe("a_activer");
    expect(dort.phrase.params).toMatchObject({ m: 180_000 });
    expect(dort.phrase.key).toMatch(/repartiraient/);
  });

  it("ne promet rien quand le client n'a rien", () => {
    const dort = parCle(vide).get("reinvestissement")!;
    expect(dort.phrase.params).toBeUndefined();
    expect(dort.phrase.key).toMatch(/Dès qu'un coupon arrivera/);
  });

  it("dit qu'une conservation n'a rien coûté plutôt que de se taire", () => {
    expect(parCle(garni).get("garde")!.sinon?.key).toMatch(/ne vous a rien coûté/);
    expect(parCle({ ...garni, garde: { periode: "2026-T3", du: 6301 } }).get("garde")!.sinon?.key).toMatch(/droits de garde/);
  });
});

describe("ce qui attend une décision aujourd'hui", () => {
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  it("n'en propose jamais plus de trois", () => {
    /* Une console qui propose huit décisions n'en propose aucune. */
    expect(attentesDuClient(garni, fmt).length).toBeLessThanOrEqual(3);
  });

  it("met l'argent arrivé devant la séance annoncée, et le retard en dernier", () => {
    expect(attentesDuClient(garni, fmt).map((a) => a.ton)).toEqual(["arrive", "annonce", "retard"]);
  });

  it("ne propose rien quand rien n'attend", () => {
    expect(attentesDuClient(vide, fmt)).toEqual([]);
  });

  it("change de phrase selon qu'un réinvestissement veille ou non", () => {
    const seul = attentesDuClient({ ...garni, reinvestissement: undefined }, fmt)[0];
    expect(seul.quoi.key).toMatch(/ils ne rapportent rien/);
    expect(attentesDuClient(garni, fmt)[0].quoi.key).toMatch(/prochain passage/);
  });
});
