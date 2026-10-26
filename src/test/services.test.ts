import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { attentesDuClient, compteDesEtats, servicesDuClient, type ContexteClient, RAISON, RAYONS } from "@/lib/domain/services";
import { fmt } from "@/lib/format";

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
  /* UN MARCHÉ SANS ÉMISSION NI RACHAT, qui est l'état ordinaire : ces deux
     services n'arrivent que quelques fois par an. C'est donc ce contexte-ci
     qui tient les comptes de dix services ci-dessous, et une épreuve à part
     montre les deux tuiles qui s'ajoutent le mois où il y en a. */
  souscriptionsOuvertes: 0,
  rachatsOuverts: 0,
  attentesSondees: 0,
  disponible: 0,
  moisDHistorique: 0,
};

const garni: ContexteClient = {
  lignes: 4,
  aSigner: 0,
  aRepondre: 0,
  partsDeFonds: { titre: "Fonds Obligataire CEMAC", parts: 84.312 },
  fondsOuverts: 9,
  souscriptionsOuvertes: 0,
  rachatsOuverts: 0,
  attentesSondees: 0,
  actions: { titre: "SEMC", n: 40 },
  disponible: 180_000,
  attendu: { montant: 90_000, retardJours: 28 },
  reinvestissement: { destination: "Fonds Obligataire CEMAC", plancher: 25_000 },
  epargne: { montant: 50_000, jour: 5, destination: "Fonds Obligataire CEMAC" },
  prochaineSeance: { pays: "Cameroun", quoi: "BTA 26 semaines", le: "2 octobre" },
  moisDHistorique: 14,
};

const parCle = (c: ContexteClient, f?: (n: number) => string) => new Map(servicesDuClient(c, f).map((s) => [s.cle, s]));

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
     *
     * LE SONDAGE EST SORTI DE CETTE RÈGLE le 26 octobre 2026, et le contraire
     * serait le défaut. Il disait « Commencez par une séance annoncée », ce
     * qui est l'INVERSE du service : le sondage sert précisément quand rien
     * n'est annoncé. La règle vaut pour les services qui demandent une
     * détention préalable — on n'arbitre pas sans ligne ; elle ne vaut pas
     * pour celui qui n'attend rien du tout.
     */
    const m = parCle(vide);
    expect(m.get("passage")!.etat).toBe("a_activer");
    expect(m.get("passage")!.phrase.key).toMatch(/^Commencez par/);
    expect(m.get("sondage")!.etat).toBe("a_activer");
    expect(m.get("sondage")!.phrase.key, "le sondage redemande une séance annoncée : c'est l'inverse de ce qu'il sert à faire").not.toMatch(/séance annoncée|Aucune séance|Commencez par/);
    /**
     * ET L'INVITATION EST DANS LA RAISON, depuis que la tuile n'a plus qu'une
     * phrase.
     *
     * La phrase disait « dites ce que vous prendriez », c'est-à-dire la raison
     * mot pour mot — relevé à l'écran sur /agir, les deux lignes l'une sous
     * l'autre. La phrase porte maintenant ce que personne ne devine, la
     * doctrine : il n'y a RIEN À ATTENDRE. Mais la tuile doit toujours inviter
     * au geste, et c'est cela qu'on tient — à l'endroit où il est désormais
     * écrit, pas à celui où il l'était.
     */
    expect(RAISON.sondage, "la tuile du sondage n'invite plus à dire ce qu'on prendrait").toMatch(/prendriez/);
    expect(m.get("sondage")!.phrase.key, "la phrase du sondage ne dit plus que rien n'a besoin d'être annoncé").toMatch(/annoncé/);
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
    expect(libres.map((x) => x.cle).sort()).toEqual(["cote", "fonds", "passage", "primaire", "sondage"]);
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
  /**
   * LES CHIFFRES PASSENT PAR LE FORMATEUR, ET CES DEUX ÉPREUVES ÉPINGLAIENT
   * LE CONTRAIRE.
   *
   * Elles vérifiaient `{ m: 50_000 }` — un NOMBRE —, c'est-à-dire exactement
   * ce qui sortait de travers à l'écran : `translate` interpole par
   * `String(v)`, donc « 50000 FCFA partent le 5 » sans séparateur de
   * milliers, et « Vous détenez 183.02 parts » avec un point décimal au
   * milieu d'une interface française. Vu le 26 octobre 2026 en conduisant la
   * page ; aucune épreuve ne pouvait le voir, puisqu'elles comparaient des
   * paramètres et jamais la chaîne rendue.
   *
   * Elles pinent maintenant la forme FORMATÉE, avec le vrai formateur de la
   * maison — celui qui sépare les milliers par une insécable fine.
   */
  it("parle des chiffres du client quand il en a, et les formate", () => {
    const m = parCle(garni, fmt);
    expect(m.get("epargne")!.phrase.params).toMatchObject({ m: fmt(50_000), j: 5 });
    expect(String(m.get("epargne")!.phrase.params!.m), "le montant sort sans ses séparateurs de milliers").toMatch(/50\s000/);
    expect(m.get("garde")!.phrase.params).toMatchObject({ n: 4 });
  });

  /**
   * ET AUCUN PARAMÈTRE DE MONTANT NE RESTE UN NOMBRE BRUT.
   *
   * Le cliquet ci-dessus tient trois phrases ; celui-ci tient la famille.
   * Les comptes entiers — quatre lignes, deux ordres, le jour du mois —
   * restent des nombres, et c'est juste : ils n'ont ni décimale ni millier.
   * Ce qui ne doit plus en être un, c'est tout ce qui se compte en FCFA ou
   * en parts.
   */
  it("ne laisse aucun montant sortir sans passer par le formateur", () => {
    const bruts: string[] = [];
    for (const sv of servicesDuClient(garni, fmt)) {
      for (const [k, v] of Object.entries(sv.phrase.params ?? {})) {
        if (typeof v === "number" && (k === "m" || !Number.isInteger(v))) bruts.push(`${sv.cle} · ${k} = ${v}`);
      }
    }
    expect(bruts, `ces chiffres sortiront tels quels, point décimal et milliers collés :\n  ${bruts.join("\n  ")}`).toEqual([]);
    /* Non vacuité : ce client porte bien des montants à formater. */
    expect(servicesDuClient(garni, fmt).some((sv) => typeof sv.phrase.params?.m === "string"), "aucun montant dans cette liste : l'épreuve ne garde rien").toBe(true);
  });

  /**
   * L'ARBITRAGE DIT CE QU'IL ÉPARGNE, ET NE REND PAS SON RELEVÉ AU CLIENT.
   *
   * La phrase disait « Vous détenez 183.02 parts de FCP Trésorerie Corridor,
   * rachetables ». Le nombre de parts ne décide de rien au moment où l'on
   * découvre un service ; et il sortait brut, point décimal compris. Elle dit
   * maintenant ce que le service évite — vendre, attendre le règlement,
   * racheter à une valeur inconnue — ce qu'aucune de ses trois voisines sur
   * la fiche ne dit : la raison d'être donne le pourquoi, les deux lignes de
   * la tuile le comment, les étapes l'ordre.
   */
  it("fait dire à l'arbitrage ce qu'il épargne, et non ce qu'on détient", () => {
    const sv = parCle(garni, fmt).get("passage")!;
    expect(sv.phrase.key, "l'arbitrage recompte les parts du client").not.toMatch(/parts?\b/);
    expect(sv.phrase.key, "il ne dit plus ce que le passage évite").toMatch(/attendre le règlement/);
    /* Il nomme toujours le fonds de départ : la phrase reste celle de CE
       client, c'est le chiffre inutile qui est parti, pas le contexte. */
    expect(sv.phrase.params).toMatchObject({ d: "Fonds Obligataire CEMAC" });
  });

  it("dit ce qui SE PASSERAIT pour un service jamais pris", () => {
    /* C'est la moitié du service : sans elle, la ligne redevient une brochure. */
    const dort = parCle({ ...garni, reinvestissement: undefined }, fmt).get("reinvestissement")!;
    expect(dort.etat).toBe("a_activer");
    expect(dort.phrase.params).toMatchObject({ m: fmt(180_000) });
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
    expect(seul.quoi.key).toMatch(/ne rapportent rien/);
    expect(attentesDuClient(garni, fmt)[0].quoi.key).toMatch(/réinvestissement/);
  });
});


/**
 * LA TUILE DU SONDAGE SAIT CE QUE LE CLIENT A DÉJÀ DIT.
 *
 * RELEVÉ À LA REVUE À 360° du 26 octobre 2026 : elle était la seule des treize à
 * être aveugle. Trois attentes vivantes ou zéro, elle disait la même phrase —
 * « rien n'a besoin d'être annoncé » — et le client qui venait de pousser sa
 * ligne lisait une invitation à faire ce qu'il venait de faire. Les douze
 * autres services savent où en est celui qui les regarde.
 */
describe("la tuile du sondage suit l'état du client", () => {
  const tuile = (c: ContexteClient) => servicesDuClient(c, fmt).find((s) => s.cle === "sondage")!;

  it("invite quand il n'a rien dit, et rend compte quand il a dit", () => {
    const rien = tuile({ ...vide, attentesSondees: 0 });
    expect(rien.etat, "un client sans attente ne voit plus une tuile à activer").toBe("a_activer");
    expect(rien.phrase.key, "la doctrine a quitté la tuile : rien n'a besoin d'être annoncé").toMatch(/annoncé/);

    const deux = tuile({ ...vide, attentesSondees: 2 });
    expect(deux.etat, "un client qui a deux attentes au desk voit encore un service à activer").toBe("en_place");
    expect(deux.phrase.key, "la tuile ne dit pas combien d'intentions sont au desk").toMatch(/\{n\} intention/);
    expect(deux.phrase.params?.n, "le compte n'est pas celui du client").toBe("2");
    /* ET ELLE N'INVITE PLUS À FAIRE CE QU'IL VIENT DE FAIRE. */
    expect(deux.phrase.key, "la tuile redit « rien n'a besoin d'être annoncé » à qui a déjà parlé").not.toMatch(/annoncé/);
  });

  it("ne compte pas ce qui est clos", () => {
    /* Le contexte ne porte que les attentes VIVANTES — une attente close a été
       portée ou sa date est passée, et la compter ferait dire à la tuile qu'il a
       quelque chose au desk alors qu'il n'y a plus rien. La règle vit dans
       « contexte-client », et c'est elle qu'on nomme ici pour qu'on la trouve. */
    const src = readFileSync(join(__dirname, "../lib/domain/contexte-client.ts"), "utf8");
    expect(src, "le contexte compte de nouveau les attentes closes").toMatch(/attentesSondees: sondees\.filter\(\(x\) => x\.state !== "close"\)\.length/);
  });
});
