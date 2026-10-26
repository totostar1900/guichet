import { describe, expect, it } from "vitest";
import { SEUIL_CLIENTS, SEUIL_MONTANT, UNITE_SONDEE, anneesDuTenor, cleDeGroupe, consensus, etatDeLAttente, gabarit, manquesDeLaLigne, motDuNiveau, mur, prete, rendementDeLaLigne } from "@/lib/domain/sondage";
import type { LigneSondee } from "@/lib/domain/types";

/**
 * LE SONDAGE D'AVANT SÉANCE : CE QUE LA PLACE PRENDRAIT.
 *
 * Trois rôles dans une seule forme — la maison sonde, un client répond, un
 * client pousse la sienne — et c'est le discriminant qui les sépare. Ce que ces
 * épreuves tiennent est d'abord la CONSOLIDATION, parce que c'est elle qui sort
 * de la maison : le chiffre qu'on porte à un Trésor. Une moyenne de travers ne
 * se voit sur aucun écran et coûte le crédit de la maison au premier appel.
 */
const l = (over: Partial<LigneSondee> & { id: string }): LigneSondee => ({
  ref: `SD-${over.id}`,
  origine: "client",
  instrument: "OTA",
  country: "Cameroun",
  tenor: "5 ans",
  montant: 10_000_000,
  state: "ouverte",
  createdAt: "2026-10-20T10:00:00",
  updatedAt: "2026-10-20T10:00:00",
  userId: `u-${over.id}`,
  clientName: `Client ${over.id}`,
  ...over,
});

const AUJ = "2026-10-26";

/**
 * LE NIVEAU D'UN SONDAGE EST TOUJOURS UN TAUX, et le contraire était le défaut.
 *
 * CE QUE LA CAPTURE A MONTRÉ, le 26 octobre 2026 : la première écriture lisait
 * une OTA en PRIX, comme le sondage d'une séance annoncée. Mais ici rien n'est
 * annoncé — il n'y a pas encore de coupon, donc pas de prix — et ce que le
 * client dit est « je prendrais à un coupon d'au moins 6,25 ». Lu comme un
 * prix, 6,25 passait dans une échelle qui range les grands nombres d'abord :
 * l'écran affichait « à 6,75 ou mieux, cinquante millions » alors que 6,75
 * satisfait TOUT LE MONDE. L'échelle était à l'envers, et elle avait l'air
 * juste — c'est la pire forme de faux.
 */
describe("le niveau d'un sondage", () => {
  it("se lit en taux sur les deux compartiments", () => {
    expect(UNITE_SONDEE).toBe("taux");
  });

  it("change de MOT sans changer de sens", () => {
    /* Un coupon et un taux précompté ne sont pas la même chose en droit, mais
       ils ont le même sens : plus ils descendent, mieux le Trésor est servi. */
    expect(motDuNiveau("OTA")).toBe("coupon");
    expect(motDuNiveau("BTA")).toBe("taux");
  });

  it("range l'échelle du MOINS cher pour le Trésor au plus cher", () => {
    const c = consensus([
        l({ id: "bas", userId: "u1", montant: 50_000_000, rate: 6.1 }),
        l({ id: "haut", userId: "u2", montant: 20_000_000, rate: 6.75 }),
      ]);
    const rows = c[0].echelle.rows;
    /* À 6,10 — le taux le plus bas, donc le meilleur pour le Trésor — seul
       celui qui l'accepte tient. À 6,75, les deux tiennent : celui qui voulait
       au moins 6,10 est servi au-delà de son attente. */
    expect(rows[0].limit).toBe(6.1);
    expect(rows[0].soft + rows[0].firm).toBe(50_000_000);
    expect(rows[1].limit).toBe(6.75);
    expect(rows[1].soft + rows[1].firm, "à 6,75 tout le monde est servi, et l'échelle doit le dire").toBe(70_000_000);
  });

  it("laisse le prix d'une OTA hors de la moyenne", () => {
    /* Mêler des 99 et des 6,5 dans le même quotient ne veut rien dire. Le prix
       reste au détail, que le desk lit avant de porter. */
    const c = consensus([l({ id: "a", montant: 10_000_000, rate: 6.5, pricePct: 99 })]);
    expect(c[0].niveau).toBe(6.5);
  });
});

describe("le gabarit que le client remplit", () => {
  it("ne demande ni prix ni coupon sur un bon, qui n'en a pas", () => {
    /* Un bon se vend précompté : son taux EST son niveau. Lui demander un
       prix en pourcentage du nominal serait demander un chiffre qui n'existe
       pas sur ce compartiment. */
    const cles = gabarit("BTA").map((c) => c.cle);
    expect(cles).not.toContain("pricePct");
    expect(cles).toContain("rate");
  });

  it("demande les deux sur une obligation", () => {
    const cles = gabarit("OTA").map((c) => c.cle);
    expect(cles).toContain("rate");
    expect(cles).toContain("pricePct");
  });

  it("demande partout le Trésor, la durée, le montant et la date", () => {
    for (const i of ["OTA", "BTA"] as const) {
      const cles = gabarit(i).map((c) => c.cle);
      for (const c of ["country", "tenor", "montant", "quand"]) expect(cles, `${i} ne demande plus « ${c} »`).toContain(c);
    }
    /* Non vacuité : chaque champ porte son aide. Un gabarit dont les aides
       sont vides se remplit au hasard, et c'est le desk qui paie le hasard. */
    for (const c of gabarit("OTA")) expect(c.aide.length, `${c.cle} sans aide`).toBeGreaterThan(20);
  });
});

describe("ce qui manque à une ligne", () => {
  const base = { instrument: "OTA" as const, country: "Cameroun" as const, tenor: "5 ans", montant: 10_000_000, dansJours: 21 };

  it("laisse passer une ligne complète", () => {
    expect(manquesDeLaLigne(base, AUJ)).toEqual([]);
  });

  it("exige le Trésor, la durée, le montant et le quand", () => {
    expect(manquesDeLaLigne({ ...base, country: undefined }, AUJ)[0]).toMatch(/Trésor/);
    expect(manquesDeLaLigne({ ...base, tenor: "" }, AUJ)[0]).toMatch(/durée/);
    expect(manquesDeLaLigne({ ...base, montant: 0 }, AUJ)[0]).toMatch(/francs/);
    expect(manquesDeLaLigne({ ...base, dansJours: undefined }, AUJ)[0]).toMatch(/à partir de quand/);
  });

  it("refuse une date passée, qui sonderait une séance d'hier", () => {
    expect(manquesDeLaLigne({ ...base, dansJours: undefined, seanceLe: "2026-10-25" }, AUJ)[0]).toMatch(/passée/);
  });

  /* LES BORNES ÉCARTENT LA FAUTE DE FRAPPE, pas la conviction de marché : un
     taux de 65 au lieu de 6,5, un prix de 9 au lieu de 90. Ce qui passe reste
     discutable, et c'est au desk d'en discuter. */
  it("écarte la faute de frappe sur le taux et sur le prix", () => {
    expect(manquesDeLaLigne({ ...base, rate: 65 }, AUJ)[0]).toMatch(/faute de frappe/);
    expect(manquesDeLaLigne({ ...base, pricePct: 9 }, AUJ)[0]).toMatch(/entre 50 et 150/);
    expect(manquesDeLaLigne({ ...base, rate: 6.5, pricePct: 99 }, AUJ)).toEqual([]);
  });

  it("refuse un prix sur un bon, qui se vend précompté", () => {
    expect(manquesDeLaLigne({ ...base, instrument: "BTA", tenor: "52 semaines", pricePct: 99 }, AUJ)[0]).toMatch(/précompté/);
  });
});

/**
 * LE JOUR OÙ UNE LIGNE DEVIENT PRÊTE, et il ne se choisit plus.
 *
 * LE DÉFAUT QUE CES CAS ONT TROUVÉ, et ils l'ont trouvé en étant écrits : la
 * fonction prenait « aujourd'hui » en argument, et les deux appelants lui
 * donnaient deux choses. Le robot du matin passait le jour de CRÉATION — juste.
 * La page du desk passait le jour COURANT, donc la date du consensus fuyait
 * d'un jour chaque matin : elle restait éternellement à « aujourd'hui + 21 », le
 * desk ne voyait jamais une date sur laquelle agir, et le robot fermait une
 * ligne que l'écran annonçait encore prête pour dans trois semaines. Les deux
 * étaient justes séparément et faux ensemble, et aucun écran ne l'aurait dit.
 *
 * LA BASE VIENT DONC DE LA LIGNE. Un appelant ne peut plus se tromper parce
 * qu'il n'a plus rien à choisir, et c'est la seule correction qui tienne.
 */
describe("le jour où une ligne devient prête", () => {
  const jour = (over: Partial<LigneSondee>) => prete(l({ id: "x", ...over }));

  it("prend la date quand elle est fixée", () => {
    expect(jour({ seanceLe: "2026-11-18" })).toBe("2026-11-18");
  });

  it("compte le délai depuis la création de la ligne, jamais depuis aujourd'hui", () => {
    expect(jour({ dansJours: 21, createdAt: "2026-10-20T10:00:00" })).toBe("2026-11-10");
    /* La même ligne, relue un mois plus tard, rend LE MÊME JOUR. C'est la
       propriété qui manquait, et c'est elle qui fait que le robot et l'écran
       parlent de la même date. */
    expect(jour({ dansJours: 21, createdAt: "2026-10-20T23:59:00" })).toBe("2026-11-10");
    expect(jour({ dansJours: 21, createdAt: "2026-10-26T10:00:00" })).toBe("2026-11-16");
  });

  it("ne rend rien quand ni l'un ni l'autre n'est dit", () => {
    expect(jour({ dansJours: undefined })).toBeUndefined();
  });
});

describe("le consensus porté au Trésor", () => {
  const question = l({ id: "q", origine: "desk", userId: undefined, clientName: undefined, montant: 500_000_000, rate: 6.25 });

  it("ne compte pas la question de la maison dans sa propre demande", () => {
    /* Une ligne sondée est une QUESTION. La compter avec les réponses
       ajouterait à la demande de la place le montant que la maison cherchait
       à placer : elle se répondrait à elle-même, et porterait au Trésor un
       demi-milliard qui n'existe pas. */
    const c = consensus([question, l({ id: "a", repondA: "q", montant: 100_000_000 })]);
    expect(c).toHaveLength(1);
    expect(c[0].montant).toBe(100_000_000);
    expect(c[0].clients).toBe(1);
  });

  it("pondère le niveau par les montants, et non par les avis", () => {
    /* Dix clients à un million et un à cent millions ne pèsent pas pareil
       devant un Trésor. Une moyenne simple donnerait 6,50 ; la pondérée donne
       6,05, et c'est celle-là qu'on peut tenir. */
    const c = consensus([question, l({ id: "a", repondA: "q", montant: 100_000_000, rate: 7 }), l({ id: "b", repondA: "q", montant: 1_000_000, rate: 6 })]);
    expect(c[0].niveau).toBeCloseTo((7 * 100_000_000 + 6 * 1_000_000) / 101_000_000, 6);
    expect(c[0].niveau, "la moyenne est redevenue simple : le petit porteur pèse autant que l'institutionnel").not.toBeCloseTo(6.5, 2);
  });

  it("prend la date du PLUS TARD, pour que personne ne manque", () => {
    /* Le mot « au plus tôt » surprend, la raison non : une séance tenue avant
       le plus tardif des « à partir de » le trouverait sans fonds. Il serait
       compté dans la demande portée au Trésor, et absent le jour venu. */
    const c = consensus([question, l({ id: "a", repondA: "q", dansJours: 14 }), l({ id: "b", repondA: "q", dansJours: 45 })]);
    expect(c[0].auPlusTot).toBe("2026-12-04");
  });

  it("range les lignes poussées par compartiment, Trésor et durée", () => {
    const c = consensus([l({ id: "a", montant: 30_000_000 }), l({ id: "b", montant: 20_000_000 }), l({ id: "c", country: "Gabon", montant: 90_000_000 })]);
    expect(c).toHaveLength(2);
    expect(c[0].montant, "le plus gros groupe doit venir en tête") .toBe(90_000_000);
    expect(c.find((x) => x.country === "Cameroun")!.montant).toBe(50_000_000);
  });

  /* ON NE GROUPE PAS LES DURÉES VOISINES, et c'est délibéré : « 5 ans » et
     « 6 ans » sont deux lignes pour un Trésor, et les réunir proposerait une
     ligne à 5,5 ans que personne n'a demandée. */
  it("ne réunit pas deux durées voisines", () => {
    const c = consensus([l({ id: "a", tenor: "5 ans" }), l({ id: "b", tenor: "6 ans" })]);
    expect(c).toHaveLength(2);
  });

  it("réunit les mêmes durées écrites différemment", () => {
    expect(cleDeGroupe({ instrument: "OTA", country: "Cameroun", tenor: " 5 ANS " })).toBe(cleDeGroupe({ instrument: "OTA", country: "Cameroun", tenor: "5 ans" }));
  });

  it("écarte ce qui est clos", () => {
    const c = consensus([question, l({ id: "a", repondA: "q", montant: 100_000_000 }), l({ id: "b", repondA: "q", montant: 80_000_000, state: "close" })]);
    expect(c[0].montant).toBe(100_000_000);
  });

  it("dresse l'échelle, qui dit où la demande s'arrête", () => {
    /* La moyenne pondérée laisse croire que tout tient au même niveau.
       L'échelle dit la vérité, et c'est elle que le Trésor achète. */
    const c = consensus([question, l({ id: "a", repondA: "q", montant: 250_000_000, rate: 6.1 }), l({ id: "b", repondA: "q", montant: 120_000_000, rate: 6.4 })]);
    const rows = c[0].echelle.rows;
    expect(rows[0].limit).toBe(6.1);
    expect(rows[0].soft + rows[0].firm, "à 6,10, seul celui qui s'en contente tient").toBe(250_000_000);
    expect(rows[1].soft + rows[1].firm, "à 6,40, les deux tiennent").toBe(370_000_000);
  });

  it("compte un client une seule fois, même s'il a posé deux lignes", () => {
    const c = consensus([l({ id: "a", userId: "u-x", montant: 10_000_000 }), l({ id: "b", userId: "u-x", montant: 20_000_000 })]);
    expect(c[0].clients).toBe(1);
    expect(c[0].montant).toBe(30_000_000);
  });
});

describe("le seuil au-delà duquel on porte", () => {
  const groupe = (montant: number, clients: number) =>
    consensus(Array.from({ length: clients }, (_, i) => l({ id: `c${i}`, userId: `u${i}`, montant: Math.ceil(montant / clients) })))[0];

  it("demande à la fois le montant ET les clients", () => {
    /* Cent millions d'un seul client ne sont pas une demande de la place,
       c'est un ordre, et il a sa propre porte. Trois clients à un million ne
       sont pas une ligne. */
    expect(mur(groupe(SEUIL_MONTANT, SEUIL_CLIENTS))).toBe(true);
    expect(mur(groupe(SEUIL_MONTANT, SEUIL_CLIENTS - 1)), "un client de moins suffit à porter").toBe(false);
    expect(mur(groupe(SEUIL_MONTANT - 3, SEUIL_CLIENTS)), "sous le montant, on porte quand même").toBe(false);
  });
});

/**
 * LES MOTS DE L'ATTENTE, ET C'EST LE PIÈGE DE CET ÉCRAN.
 *
 * Le client qui a dit « je prendrais cent millions » attend ensuite une séance,
 * et la maison ne peut lui en promettre aucune : ce n'est pas elle qui adjuge.
 * Chaque phrase dit donc ce qui s'est PASSÉ, jamais ce qui va se passer.
 */
describe("l'état dit au client", () => {
  it("distingue une réponse d'une ligne poussée", () => {
    expect(etatDeLAttente({ state: "ouverte", origine: "client", repondA: "q" }).phrase).toMatch(/renseignement/);
    expect(etatDeLAttente({ state: "ouverte", origine: "client" }).phrase).toMatch(/attend d'autres clients/);
  });

  it("ne promet aucune séance, dans aucun des quatre états", () => {
    for (const state of ["ouverte", "consolidee", "close"] as const) {
      const v = etatDeLAttente({ state, origine: "client" });
      expect(v.phrase, `« ${state} » promet une séance`).not.toMatch(/sera émise|aura lieu|vous recevrez des titres/i);
      expect(v.phrase.length, `« ${state} » sans phrase`).toBeGreaterThan(40);
      expect(v.mot.length, `« ${state} » sans mot`).toBeGreaterThan(2);
    }
  });

  it("dit la clôture sans le vocabulaire de l'échec", () => {
    const v = etatDeLAttente({ state: "close", origine: "client" });
    expect(v.phrase).toMatch(/rien ne l'était|rien n'en reste engagé/);
    expect(v.phrase).not.toMatch(/échou|raté|erreur|refus/i);
  });

  it("dit « portée » comme un fait, et annonce le rappel", () => {
    const v = etatDeLAttente({ state: "consolidee", origine: "client" });
    expect(v.phrase).toMatch(/porte au Trésor/);
    expect(v.phrase, "le client ne sait pas qu'on le rappellera").toMatch(/rappellera/);
  });
});

/**
 * LE RENDEMENT ACTUARIEL, ET LES QUATRE SILENCES QUI L'ENTOURENT.
 *
 * « Ajouter le rendement actuariel à l'OTA. » C'est le chiffre qui COMPARE : un
 * coupon de 6,25 % acheté à 97 ne rend pas 6,25 %, et deux lignes de coupons
 * différents ne se comparent que par là.
 *
 * CE QUI SE TIENT ICI N'EST PAS LA FORMULE — elle est à `finance.bondCalc`, et
 * c'est la règle de la maison — mais TOUT CE QUI L'ENTOURE : l'absence de
 * rendement là où il n'y en a pas. Un rendement faux est pire qu'un rendement
 * absent, parce qu'il se compare quand même, et qu'il a l'air juste.
 */
describe("le rendement actuariel d'une ligne sondée", () => {
  const ota = { instrument: "OTA" as const, tenor: "5 ans", createdAt: "2026-10-19T09:00:00", dansJours: 21 };

  it("vaut exactement le coupon au pair, et le dépasse sous le pair", () => {
    /* L'ANCRE : au pair, une ligne neuve rend exactement son coupon. C'est ce
       qui prouve que l'échéancier construit ici est le bon — un stub mal posé,
       une échéance décalée d'un an, et ce nombre ne tomberait pas rond. */
    expect(rendementDeLaLigne({ ...ota, rate: 6.25, pricePct: 100 })).toBeCloseTo(6.25, 6);
    /* Et sous le pair il monte : 6,25 % payé 97 sur cinq ans rend près de 7 %. */
    expect(rendementDeLaLigne({ ...ota, rate: 6.25, pricePct: 97 })).toBeCloseTo(6.98, 2);
    /* Au-dessus du pair il descend — la monotonie est la seule chose que le
       lecteur vérifie d'instinct, et c'est celle qu'il faut tenir. */
    expect(rendementDeLaLigne({ ...ota, rate: 6.25, pricePct: 103 })!).toBeLessThan(6.25);
  });

  it("n'en rend aucun quand il n'y en a pas", () => {
    /**
     * UN BON SE VEND PRÉCOMPTÉ : son taux EST son rendement, et un second
     * chiffre ferait lire deux vérités pour une.
     *
     * LA DURÉE EST « 1 an », ET C'EST TOUT LE TEST. Vérifiée à l'envers le
     * 26 octobre 2026 : écrite avec « 52 semaines », cette ligne restait verte
     * même le compartiment retiré de la fonction — elle tombait sur la durée
     * illisible, pas sur le compartiment, et ne tenait donc rien. Or un bon à
     * un an se dit « 1 an » aussi souvent que « 52 semaines », et c'est
     * exactement là que la règle porte : sans elle, ce bon recevrait le
     * rendement actuariel d'une obligation à coupon, calculé sur un coupon
     * qu'il ne verse pas.
     */
    expect(rendementDeLaLigne({ ...ota, instrument: "BTA" as never, tenor: "1 an", rate: 5.5, pricePct: 99 }), "un bon porte un rendement en plus de son taux").toBeUndefined();
    expect(anneesDuTenor("1 an"), "« 1 an » doit être une durée lisible, sinon la ligne ci-dessus ne tient rien").toBe(1);
    /* SANS PRIX, le rendement serait le coupon : du bruit. */
    expect(rendementDeLaLigne({ ...ota, rate: 6.25 }), "un rendement paraît sans prix, donc égal au coupon").toBeUndefined();
    /* SANS COUPON, il n'y a pas d'échéancier. */
    expect(rendementDeLaLigne({ ...ota, pricePct: 97 }), "un rendement paraît sans coupon").toBeUndefined();
    /* SANS DURÉE LISIBLE NI DATE DE DÉPART, non plus : la durée est un texte
       libre, et on n'invente pas une échéance. */
    expect(rendementDeLaLigne({ ...ota, tenor: "moyen terme", rate: 6.25, pricePct: 97 }), "une durée illisible donne quand même un rendement").toBeUndefined();
    expect(rendementDeLaLigne({ instrument: "OTA", tenor: "5 ans", createdAt: "2026-10-19T09:00:00", rate: 6.25, pricePct: 97 }), "un rendement paraît sans date de départ").toBeUndefined();
  });

  it("lit la durée que son auteur a tapée, et refuse ce qu'il n'a pas écrit", () => {
    expect(anneesDuTenor("5 ans")).toBe(5);
    expect(anneesDuTenor("5ans"), "« 5ans » sans espace est la même durée").toBe(5);
    expect(anneesDuTenor("2 ANS"), "les capitales sont la même durée").toBe(2);
    expect(anneesDuTenor("10 ans")).toBe(10);
    /* CE QUI N'EST PAS UNE DURÉE EN ANNÉES NE DOIT PAS EN DEVENIR UNE : un bon
       se dit en semaines, et « 0 ans » ou « 40 ans » sont des fautes de frappe
       qui donneraient un échéancier absurde — et un rendement avec. */
    for (const faux of ["52 semaines", "13 semaines", "moyen terme", "0 ans", "40 ans", ""]) {
      expect(anneesDuTenor(faux), `« ${faux} » passe pour une durée en années`).toBeUndefined();
    }
  });
});
