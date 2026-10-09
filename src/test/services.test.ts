import { describe, expect, it } from "vitest";
import { attentesDuClient, compteDesEtats, servicesDuClient, type ContexteClient, RAYONS } from "@/lib/domain/services";

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
  aSigner: 0,
  aRepondre: 0,
  fondsOuverts: 9,
  disponible: 0,
  moisDHistorique: 0,
};

const garni: ContexteClient = {
  lignes: 4,
  aSigner: 0,
  aRepondre: 0,
  partsDeFonds: { titre: "Fonds Obligataire CEMAC", parts: 84.312 },
  fondsOuverts: 9,
  actions: { titre: "SEMC", n: 40 },
  disponible: 180_000,
  attendu: { montant: 90_000, retardJours: 28 },
  reinvestissement: { destination: "Fonds Obligataire CEMAC", plancher: 25_000 },
  epargne: { montant: 50_000, jour: 5, destination: "Fonds Obligataire CEMAC" },
  prochaineSeance: { pays: "Cameroun", quoi: "BTA 26 semaines", le: "2 octobre" },
  moisDHistorique: 14,
};

const parCle = (c: ContexteClient) => new Map(servicesDuClient(c).map((s) => [s.cle, s]));

describe("les services de la vitrine, quel que soit le client", () => {
  it("tiennent dans les trois rayons, chacun une seule fois", () => {
    for (const c of [vide, garni]) {
      const v = servicesDuClient(c);
      expect(v).toHaveLength(10);
      expect(new Set(v.map((s) => s.cle)).size).toBe(10);
      /* Aucun rayon vide : un rayon sans ligne est un rayon mal nommé, et
         « Tenir » n'en aurait eu qu'une avant que la provision n'y entre. */
      for (const r of RAYONS) expect(v.filter((x) => x.rayon === r.cle).length, r.cle).toBeGreaterThan(0);
    }
  });

  it("les rangent par rayon, dans l'ordre de la vitrine", () => {
    /* Placer, puis Programmer, puis Tenir : où va mon argent, comment le
       faire sans y penser, comment le garder. */
    const vus = servicesDuClient(garni).map((s) => RAYONS.findIndex((r) => r.cle === s.rayon));
    expect(vus).toEqual([...vus].sort((a, b) => a - b));
  });

  it("rangent ce qui tourne avant ce qui dort, DANS chaque rayon", () => {
    /* Le rayon trie d'abord : l'état ne se compare donc qu'entre voisins de
       rayon. Comparé sur toute la liste, il dirait qu'un service en place de
       « Tenir » doit passer devant un service à activer de « Placer », ce qui
       défait les rayons. */
    const rang = { en_place: 0, a_activer: 1 } as const;
    for (const r of RAYONS) {
      const etats = servicesDuClient(garni).filter((s) => s.rayon === r.cle).map((s) => rang[s.etat]);
      expect(etats, r.cle).toEqual([...etats].sort((a, b) => a - b));
    }
  });

  it("portent tous une phrase, et jamais une phrase vide", () => {
    for (const s of servicesDuClient(garni)) expect(s.phrase.key.length).toBeGreaterThan(20);
  });

  /* Le lieu écrit (« Portefeuille › Espèces ») est parti le 5 octobre 2026 :
     il tenait une seconde ligne sous chacun des neuf. Le lien, lui, reste la
     seule chose qui mène quelque part, et un service sans destination est une
     impasse qui ne se voit pas. */
  it("mènent tous quelque part", () => {
    for (const s of servicesDuClient(vide)) expect(s.href.startsWith("/")).toBe(true);
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

  it("dit par quoi commencer, et ne ferme rien", () => {
    /**
     * Un service qui s'annonçait indisponible fermait une porte que rien ne
     * ferme : il demande seulement qu'on ait commencé par autre chose, et
     * c'est cela qu'il dit. « Commencez » est donc la forme attendue, et
     * l'état reste « à activer » : il n'y a plus d'état fermé.
     */
    const m = parCle(vide);
    expect(m.get("passage")!.etat).toBe("a_activer");
    expect(m.get("passage")!.phrase.key).toMatch(/^Commencez par/);
    expect(m.get("sondage")!.etat).toBe("a_activer");
    expect(m.get("sondage")!.phrase.key).toMatch(/^Commencez par/);
  });

  /* L'APPARIEMENT A QUITTÉ LA VITRINE le 9 octobre 2026, et ce cliquet le
     garde dehors. La plateforme recueille les ordres et les transmet à la
     BVMAC, qui seule décide de l'exécution : aucun rapprochement fait ici ne
     produit une transaction. Le nommer en vitrine promettait une exécution
     que la maison ne peut pas donner. Ce qu'il est vraiment, une lecture de
     notre propre carnet, reste au desk. */
  it("ne propose pas l'appariement, que la maison n'exécute pas", () => {
    expect(parCle(garni).has("appariement")).toBe(false);
    expect(parCle(vide).has("appariement")).toBe(false);
  });

  it("compte les deux états sans en perdre un", () => {
    const c = compteDesEtats(servicesDuClient(garni));
    expect(c.en_place + c.a_activer).toBe(10);
    expect(c.en_place).toBe(4);
  });

  /**
   * LA PORTE AVANT LE SERVICE. Sans compte-titres ouvert, aucun des neuf ne
   * commence par lui-même : tous proposent l'ouverture, qui est l'étape
   * commune. Aucun n'est éteint pour autant.
   */
  /**
   * LA PORTE NE SE MET QUE DEVANT CE QU'ELLE FERME.
   *
   * Quatre services sont le compte, ou s'écrivent dessus : conservation,
   * réinvestissement, épargne, appariement. Les cinq autres commencent par
   * regarder, et envoyer quelqu'un ouvrir un compte parce qu'il a touché le
   * catalogue des fonds serait une fin de non-recevoir déguisée.
   */
  it("ne propose l'ouverture du compte que là où elle est la première étape", () => {
    const sans = servicesDuClient({ ...garni, compteOuvert: false });
    expect(sans.length).toBe(10);
    const surLeCompte = sans.filter((x) => x.href === "/ouvrir-un-compte");
    expect(surLeCompte.map((x) => x.cle).sort()).toEqual(["epargne", "garde", "prelevement", "provision", "reinvestissement"]);
    expect([...new Set(surLeCompte.map((x) => x.geste.key))]).toEqual(["Ouvrir un compte-titres"]);
    expect(surLeCompte.every((x) => x.porte)).toBe(true);
    /* Les cinq autres gardent leur chemin : regarder ne demande rien. */
    const libres = sans.filter((x) => x.href !== "/ouvrir-un-compte");
    expect(libres.map((x) => x.cle).sort()).toEqual(["actions", "fonds", "passage", "primaire", "sondage"]);
    expect(libres.some((x) => x.porte)).toBe(false);
    /* Et les états restent lisibles : on ne perd pas ce qui tourne déjà. */
    expect(sans.filter((x) => x.etat === "en_place").length).toBe(4);
  });

  it("laisse chaque service nommer son geste quand le compte est ouvert", () => {
    const avec = servicesDuClient(garni);
    expect(avec.every((x) => x.geste.key.length > 0)).toBe(true);
    expect(new Set(avec.map((x) => x.href)).size, "chaque service mène quelque part, et pas tous au même endroit").toBeGreaterThan(3);
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

  /* « L'avis du T3 ne vous a rien coûté » était une sous-phrase de la fiche du
     service, et les sous-phrases sont parties le 5 octobre 2026. Le chiffre des
     droits de garde se lit sur l'avis lui-même, qui est le document qui le
     porte ; cette page n'en gardait qu'un écho. */
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
