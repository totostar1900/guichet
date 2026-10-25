import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { apercusDuService, APERCUS_PAR_TUILE, nomDeFonds } from "@/lib/domain/apercus";
import type { ContexteClient } from "@/lib/domain/services";
import type { Offer } from "@/lib/domain/types";
import { SECTION_NOTE } from "@/lib/domain/sections";
import { tauxActuariel } from "@/lib/domain/status";
import { rendementDuFonds } from "@/lib/domain/fund-perf";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/* Le strict nécessaire pour que les sélecteurs de la maison répondent. */
/* UNE ACTION QUI VERSE UN DIVIDENDE. Sans lui, `headlineYield` rend null pour
   une action, et l'épreuve ne peut pas distinguer « on refuse le dividende »
   de « il n'y en avait pas » : vérifié à l'envers le 25 octobre 2026, le
   cliquet restait muet quand on laissait repasser le rendement de dividende. */
const actionAvecDividende = (id: string, title: string): Offer =>
  ({ id, title, kind: "MARCHE", instrument: "action", status: "live", isin: `XX${id}`, version: 1, lastPrice: 90_000, dividendPerShare: 2_500, commissionPct: 0 }) as unknown as Offer;
const cotee = (id: string, title: string, extra: Partial<Offer> = {}): Offer =>
  ({ id, title, kind: "MARCHE", instrument: "action", status: "live", isin: `XX${id}`, version: 1, lastPrice: 48_500, ...extra }) as Offer;
/* LA PERFORMANCE PLUTÔT QUE LA VL : la tuile des fonds met en avant le
   rendement depuis le 25 octobre 2026, donc la coquille doit en porter un.
   La date d'origine vient avec : sans elle, l'annualisé n'a pas de durée. */
const fonds = (id: string, title: string, nav: number, perf1yPct: number | undefined = 4.2): Offer =>
  ({ id, title, kind: "FONDS", status: "live", version: 1, fund: { nav, navDate: "2026-10-23", manager: "CAM", distributed: true, inceptionDate: "2021-04-01", perfSinceInceptionPct: 18.4, perf1yPct } }) as unknown as Offer;
/* UNE SÉANCE QUI PORTE VRAIMENT UN TAUX. Les tuiles des séances montrent
   depuis le 25 octobre 2026 le taux actuariel d'une OTA et d'une BTA ;
   une coquille sans coupon ni échéance n'en a aucun, et retombe donc sur le
   contenu de repli — ce qui est juste, mais ne prouve rien du cas nominal. */
const ota = (id: string, deadlineAt: string): Offer =>
  ({ id, title: "OTA 6,25 % · 5 ans · Gabon", kind: "OTA", status: "published", version: 1, issuer: "Trésor", opensAt: "2026-10-01T09:00:00", deadlineAt,
     country: "Gabon", countryName: "République gabonaise", nominal: 10_000, couponRate: 6.25, maturityOn: "2031-11-04", settleOn: "2026-11-04", pricePct: 97.5 }) as unknown as Offer;
const bta = (id: string, deadlineAt: string): Offer =>
  ({ id, title: "BTA 13 semaines · Tchad", kind: "BTA", status: "published", version: 1, issuer: "Trésor", opensAt: "2026-10-01T09:00:00", deadlineAt,
     country: "Tchad", countryName: "République du Tchad", nominal: 10_000, precountRate: 5.1, maturityOn: "2027-01-28", settleOn: "2026-10-29" }) as unknown as Offer;

const CTX = { lignes: 0, fondsOuverts: 2, disponible: 0, aSigner: 0, aRepondre: 0, moisDHistorique: 0 } as ContexteClient;

/**
 * CE QUI ATTEND DERRIÈRE UNE TUILE DE TRADE.
 *
 * La maquette donnait deux lignes sous chaque tuile depuis le début, et le
 * code n'en avait aucune : les cinq tuiles portaient leur nom et la phrase du
 * service. Un client qui hésitait entre deux rayons devait ouvrir les deux.
 *
 * CE QUI A DÉCIDÉ : aucune lecture de plus. Les offres sont déjà en main sur
 * cette page et le contexte est en cache par requête. Un aperçu qui aurait
 * demandé une requête par tuile aurait été écarté comme le volet « la séance »
 * de la page d'arrivée — une dizaine de requêtes pour un ornement.
 */
describe("les aperçus des tuiles de Trade", () => {
  it("dit la cote, les fonds et la part détenue", () => {
    const offers = [cotee("a1", "SEMC · action"), cotee("a2", "BHC · action"), fonds("f1", "FCP Trésorerie", 10_412), fonds("f2", "FCP Obligataire", 12_980)];
    const cote = apercusDuService("cote", offers, CTX);
    expect(cote.map((a) => a.nom), "la cote ne remonte plus dans l'aperçu").toEqual(["SEMC · action", "BHC · action"]);

    /**
     * UNE ACTION NE MONTRE PAS UN TAUX, ET C'EST TOUT LE SUJET.
     *
     * `headlineYield` rend un chiffre pour les deux familles, mais pas le même
     * genre de chiffre : pour une obligation, le taux de rendement interne
     * calculé sur les flux réels ; pour une action, le dividende rapporté au
     * cours. Les deux paraissaient sous le même mot — « rendement » — sur la
     * même tuile, à 2,8 % et 6,9 %, et rien ne disait que les comparer n'a
     * aucun sens. Le dirigeant a tranché : seulement les taux actuariels.
     *
     * CETTE ÉPREUVE A ÉTÉ ÉCRITE PARCE QU'ELLE MANQUAIT. Vérifiée à l'envers
     * le jour même : en laissant `tauxActuariel` répondre pour tout le monde,
     * AUCUN cliquet ne tombait — les actions des coquilles ne versaient pas de
     * dividende, donc leur rendement était nul de toute façon. Il fallait une
     * action qui en verse un pour que le défaut ait quelque chose à montrer.
     */
    const avecDividende = apercusDuService("cote", [actionAvecDividende("d1", "BGFI Holding")], CTX);
    expect(avecDividende[0].dit.key, "le rendement de dividende est repassé pour un taux actuariel").toBe("{m} FCFA");
    /* L'espace des milliers est une insécable fine (U+202F) et non une espace
       ordinaire : on épingle le nombre, pas sa ponctuation. */
    expect(String(avecDividende[0].dit.params?.m), "le cours n'est plus celui de la ligne").toMatch(/^90\s?000$/);
    /* Non vacuité : une obligation, elle, montre bien son taux. */
    expect(tauxActuariel(actionAvecDividende("d2", "BGFI")), "une action rend un taux actuariel : la règle ne garde plus rien").toBeNull();
    expect(tauxActuariel(ota("o9", "2026-12-01T12:00:00")), "une obligation ne rend plus de taux : la comparaison est vide").not.toBeNull();
    /**
     * LE RENDEMENT, ET JAMAIS LA VALEUR LIQUIDATIVE — 25 octobre 2026.
     *
     * Cette épreuve pinait l'inverse jusqu'à ce matin : « VL {n} FCFA ».
     * La décision du dirigeant l'a retournée, et elle se défend : entre
     * « VL 10 820 » et « VL 12 430 », rien ne dit lequel des deux fonds a
     * mieux travaillé, alors que c'est exactement la question qu'on se pose
     * en comparant deux tuiles. La VL n'est pas supprimée, elle est à sa
     * place — sur la fiche du fonds, où elle répond à « à quel prix j'entre ».
     *
     * LE CLIQUET TIENT LES DEUX MOITIÉS : un rendement paraît, et la VL ne
     * reparaît pas. Sans la seconde, on pourrait « enrichir » la ligne d'un
     * rappel de VL et défaire la décision sans que rien ne tombe.
     */
    /**
     * LES DEUX MEILLEURS, ET NON LES DEUX PREMIERS — 25 octobre 2026.
     *
     * Vérifiée à l'envers le jour même : en retirant le tri, cette épreuve
     * restait MUETTE, parce que ses trois fonds portaient la même
     * performance. Un classement ne se garde qu'avec des valeurs distinctes,
     * et dans l'ordre inverse de celui du catalogue.
     */
    /* Les noms sortent abrégés : « FCP » dit la forme juridique, que la tuile
       annonce déjà en s'appelant « Fonds ». */
    const classes = [fonds("f1", "FCP Modeste", 10_000, 2.1), fonds("f2", "FCP Milieu", 10_000, 6.3), fonds("f3", "FCP Tête", 10_000, 11.8)];
    const rang = apercusDuService("fonds", classes, CTX);
    expect(rang.map((a) => a.nom), "les fonds ne sont plus classés par performance").toEqual(["Tête", "Milieu"]);

    const perf = apercusDuService("fonds", offers, CTX);
    expect(perf.map((a) => a.dit.params?.r), "le rendement n'est plus mis en avant").toEqual(["+4,2 %", "+4,2 %"]);
    /* LA PÉRIODE EST DANS LA CLEF, PAS DANS UN PARAMÈTRE : un paramètre ne
       passe pas par le dictionnaire, et « sur 12 mois » serait sorti en
       français au milieu d'une page anglaise sans que rien ne le dise. */
    /* UNE SEULE UNITÉ SUR LA TUILE : « sur 12 mois » à côté de « par an » se
       lisait comme deux périodes différentes alors que c'est la même. Les
       trois mesures sont des taux ANNUELS ; ce qu'elles comparent diffère, et
       cette nuance-là reste écrite en toutes lettres sur la fiche du fonds,
       que la forme longue sert. Le cliquet tient les deux formes séparées. */
    expect(perf.map((a) => a.dit.key)).toEqual(["{r} / an", "{r} / an"]);
    const troisFormes = [
      rendementDuFonds({ inceptionDate: "2021-04-01", perfSinceInceptionPct: 18.4, perf1yPct: 4.2 }, new Date("2026-10-25")),
      rendementDuFonds({ inceptionDate: "2021-04-01", perfSinceInceptionPct: 18.4 }, new Date("2026-10-25")),
      rendementDuFonds({ inceptionDate: "2026-09-01", perfSinceInceptionPct: 1, variationPct: 0.4 }, new Date("2026-10-25")),
    ];
    expect(troisFormes.map((x) => x?.cleCourte), "les trois mesures ne disent plus la même unité sur une tuile").toEqual(["{r} / an", "{r} / an", "{r} / an"]);
    expect(new Set(troisFormes.map((x) => x?.cle)).size, "les formes longues se sont confondues : la nuance des fiches est perdue").toBe(3);
    expect(JSON.stringify(perf), "la valeur liquidative est revenue sur la tuile").not.toMatch(/VL|10 412|12 980/);
    /* Et sans historique, une absence dite plutôt qu'un zéro : « 0,0 % » se
       lirait comme une contre-performance. */
    /* « undefined » en argument déclencherait la valeur par défaut : le fonds
       sans douze mois d'historique se construit donc à la main. */
    const sansDouzeMois = { ...(fonds("f3", "FCP Nouveau", 10_000) as unknown as { fund: Record<string, unknown> }).fund, perf1yPct: undefined };
    const jeune = apercusDuService("fonds", [{ id: "f3", title: "FCP Nouveau", kind: "FONDS", status: "live", version: 1, fund: sansDouzeMois } as unknown as Offer], CTX, new Date("2026-10-25"));
    /* Sur la tuile les trois mesures disent « / an » ; c'est la forme LONGUE
       qui garde la nuance, et c'est elle qu'on vérifie ici. */
    expect(jeune[0].dit.key, "la tuile ne dit plus la même unité pour les trois mesures").toBe("{r} / an");
    expect(rendementDuFonds({ inceptionDate: "2021-04-01", perfSinceInceptionPct: 18.4 }, new Date("2026-10-25"))?.cle,
      "sans douze mois d'historique, l'annualisé ne prend plus le relais").toBe("{r} par an depuis l'origine");
    /* LA TUILE PREND LA FORME COURTE, et la longue reste pour les fiches.
       Mesuré à l'écran : « +1,4 % par an depuis l'origine » occupe deux
       lignes dans la colonne d'une tuile, là où cette case est celle d'un
       nombre. Les deux formes doivent donc rester DEUX : les unifier, dans un
       sens comme dans l'autre, casse l'un des deux écrans. */
    expect(rendementDuFonds({ inceptionDate: "2021-04-01", perfSinceInceptionPct: 18.4 }, new Date("2026-10-25"))).toMatchObject({
      cle: "{r} par an depuis l'origine",
      cleCourte: "{r} / an",
    });
    /**
     * L'ARBITRAGE EXPLIQUE, IL NE COMPTE PLUS DES PARTS.
     *
     * Il affichait « Trésorerie Corridor · 183 parts » — ce qu'on peut
     * déplacer. Décision du dirigeant le 26 octobre 2026, et elle tient au
     * service : le nombre de parts ne décide de RIEN ici. Un client qui
     * détient une ligne sait qu'il la détient ; ce qu'il ignore, c'est ce que
     * l'arbitrage lui épargne — sortir d'un fonds sans savoir à quel prix il
     * entrera dans l'autre. Les deux lignes disent donc la mécanique.
     *
     * LA MOITIÉ QUI REFUSE : plus aucun compte de parts, quel que soit ce que
     * le client détient. Sans elle, on « enrichirait » la tuile d'un rappel
     * de la position et on défer­ait la décision sans que rien ne tombe.
     */
    const avecPart = apercusDuService("passage", offers, { ...CTX, partsDeFonds: { titre: "FCP Trésorerie", parts: 190 } });
    const sansPart = apercusDuService("passage", offers, CTX);
    expect(avecPart, "l'arbitrage ne dit plus la même chose selon ce qu'on détient").toEqual(sansPart);
    expect(avecPart.map((a) => a.nom)).toEqual(["Rachat et souscription", "Les deux valeurs"]);
    expect(avecPart.every((a) => a.prose), "l'explication est revenue dans la case d'un chiffre").toBe(true);
    expect(JSON.stringify(avecPart), "un compte de parts est revenu sur la tuile d'arbitrage").not.toMatch(/parts?\b|190/);
  });

  /* DEUX AU PLUS : trois lignes sous une tuile en font une liste, et la racine
     redeviendrait la page de catalogue qu'elle sert à éviter. */
  it("s'arrête à deux lignes, quelle que soit la taille du catalogue", () => {
    const beaucoup = Array.from({ length: 9 }, (_, i) => cotee(`c${i}`, `Ligne ${i}`));
    expect(apercusDuService("cote", beaucoup, CTX).length).toBe(APERCUS_PAR_TUILE);
    expect(APERCUS_PAR_TUILE, "deux lignes, pas davantage").toBe(2);
  });

  /* UN APERÇU VIDE NE SE REMPLACE PAS PAR UNE PHRASE D'EXCUSE : la règle du
     niveau 3 de la page d'arrivée, appliquée à l'intérieur d'une tuile. */
  it("ne rend rien plutôt qu'une excuse, et rien du tout aux services qui n'en ont pas", () => {
    expect(apercusDuService("cote", [], CTX), "une cote vide invente une ligne").toEqual([]);
    /* L'arbitrage, lui, dit toujours la même chose : ce n'est pas un état du
       client mais la mécanique du service. Il est donc hors de cette règle. */
    /* LE SONDAGE N'EST PLUS MUET, et la règle n'a pas changé pour autant.
       « Un aperçu vide ne se remplace pas par une phrase d'excuse » visait
       « aucune séance en ce moment », qui prend la place sans rien apprendre.
       Ces deux lignes-là apprennent, et à celui qui en a besoin : le client
       qui ouvre la page un jour sans séance est celui qui ne sait pas encore
       ce qu'est un sondage. Ce qu'elles ne font PAS : annoncer une séance. */
    const muet = apercusDuService("sondage", [cotee("a1", "SEMC")], CTX);
    expect(muet.map((a) => a.nom), "le repli du sondage a changé sans qu'on le dise").toEqual(["Dites votre taux", "Avant la clôture"]);
    expect(JSON.stringify(muet), "le repli annonce une séance là où il n'y en a aucune").not.toMatch(/séance|taux de|%/);
    expect(apercusDuService("epargne", [cotee("a1", "SEMC")], CTX), "les rayons en bandes ont pris un aperçu").toEqual([]);
  });

  /**
   * CE QU'ON TROUVE À UNE SÉANCE, ET NON QUAND ELLE FERME — ET C'EST LE CŒUR
   * DE CETTE ÉPREUVE.
   *
   * ELLE DISAIT « AUCUN APERÇU » JUSQU'AU 25 OCTOBRE 2026, et son
   * raisonnement reste vrai à la lettre : les deux prochaines CLÔTURES sont
   * déjà posées en tête de la même racine par « Ce qui ferme bientôt », et
   * deux listes de la même chose divergent toujours.
   *
   * CE QUI A CHANGÉ : le dirigeant veut deux lignes sous chaque service
   * partout où c'est possible. Le refus portait sur UNE donnée — le délai —
   * et non sur l'idée même d'un aperçu. La tuile porte donc ce que la bande
   * ne dit pas et que rien d'autre n'écrit : sa COMPOSITION, qui répond à
   * « qu'est-ce que j'y trouve » plutôt qu'à « quand est-ce que ça ferme ».
   *
   * LE CLIQUET A DONC DEUX MOITIÉS, et la seconde est l'ancienne : des
   * lignes paraissent, et aucune ne redit un délai. Sans elle, quelqu'un
   * « complèterait » la série de bonne foi avec les deux prochaines
   * échéances, et personne ne saurait pourquoi c'est faux.
   */
  /**
   * UNE OTA ET UNE BTA, AVEC LEUR TAUX — ET JAMAIS UN DÉLAI.
   *
   * CETTE ÉPREUVE A DÉJÀ CHANGÉ DEUX FOIS DANS LA JOURNÉE, et les deux fois
   * la moitié qui refuse est restée. Elle disait d'abord « aucun aperçu »,
   * parce que les deux prochaines CLÔTURES sont déjà en tête de la même
   * racine. Puis « la composition », qui répondait à « qu'est-ce que j'y
   * trouve ». Elle dit maintenant le TAUX, sur demande du dirigeant : c'est
   * la seule chose sur laquelle on décide d'ouvrir la page, et la
   * composition ne la donnait pas.
   *
   * LA MOITIÉ QUI REFUSE NE BOUGE PAS : aucune de ces lignes ne redit un
   * délai. Sans elle, quelqu'un « complèterait » la série avec les deux
   * prochaines échéances, et personne ne saurait pourquoi c'est faux.
   */
  it("dit le taux d'une OTA et d'une BTA, et jamais leur délai", () => {
    const demain = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const vus = apercusDuService("primaire", [bta("b1", demain), ota("o1", demain)], CTX);
    /* LE NOM EST COMPACT — famille et pays — et le pays est celui d'usage,
       non la forme officielle : « République du Tchad » reprenait à lui seul
       toute la largeur que la compacité venait gagner. */
    expect(vus.map((a) => a.nom), "les deux familles ne sont plus nommées, ou plus dans cet ordre").toEqual(["OTA · Gabon", "BTA · Tchad"]);
    expect(vus.map((a) => a.dit.key)).toEqual(["{r} / an", "{r} / an"]);
    expect(vus.map((a) => a.dit.params?.r), "le taux affiché n'est plus celui que le domaine calcule").toEqual(["6,86 %", "5,24 %"]);
    expect(JSON.stringify(vus), "un délai est revenu sur la tuile, à côté de la bande qui le dit déjà").not.toMatch(/jour|clôture|dans \{|demain/i);
  });

  /**
   * ET DU CONTENU QUAND IL N'Y A AUCUNE SÉANCE, plutôt qu'une tuile nue.
   *
   * Entre deux séances, la tuile sortait avec son en-tête et rien d'autre, à
   * côté de tuiles pleines. Les deux lignes de repli ne sont pas une excuse :
   * elles disent ce qu'est une OTA et ce qu'est une BTA, c'est-à-dire
   * exactement ce que cherche celui qui ouvre la page un jour creux.
   *
   * ELLES SONT DES ABRÉGÉS DES NOTES DE SECTION, et cette épreuve le tient :
   * une définition écrite deux fois finit par se contredire.
   */
  it("met du contenu quand aucune séance n'est ouverte", () => {
    const close = new Date(Date.now() - 5 * 86_400_000).toISOString();
    const vus = apercusDuService("primaire", [ota("o1", close), bta("b1", close)], CTX);
    expect(vus.map((a) => a.nom)).toEqual(["Obligations du Trésor", "Bons du Trésor"]);
    /* Non vacuité : les mêmes séances OUVERTES donnent bien des taux. */
    const ouvert = new Date(Date.now() + 5 * 86_400_000).toISOString();
    expect(apercusDuService("primaire", [ota("o2", ouvert)], CTX)[0].dit.key, "le cas nominal ne rend plus de taux : le repli ci-dessus ne prouve rien").toBe("{r} / an");
    /* Et le repli ne contredit pas la note de section d'où il vient. */
    expect(SECTION_NOTE.obligations_tresor, "la note des OTA ne parle plus de coupon ni de durée : le repli a dérivé").toMatch(/coupon.*durée/i);
    expect(SECTION_NOTE.bons_tresor, "la note des BTA ne parle plus de précompte : le repli a dérivé").toMatch(/[Pp]récompt/);
    expect(vus[0].dit.key).toMatch(/coupon.*durée/);
    expect(vus[1].dit.key).toMatch(/précompt/);
    /* ET ELLES SE DISENT COMME DES PHRASES, pas comme des montants. La case de
       droite est celle d'un nombre — grasse, alignée à droite, au corps de
       lecture — et « un coupon, une durée » y criait sur deux hauteurs. Le
       drapeau est la seule chose qui tienne le contenu et sa forme ensemble. */
    expect(vus.every((a) => a.prose), "le repli est revenu dans la case d'un chiffre").toBe(true);
    const muet = apercusDuService("sondage", [], CTX);
    expect(muet.every((a) => a.prose), "le repli du sondage est revenu dans la case d'un chiffre").toBe(true);
    /* Non vacuité : une vraie ligne, elle, n'est PAS de la prose. */
    const ouverte = apercusDuService("primaire", [ota("o3", new Date(Date.now() + 5 * 86_400_000).toISOString())], CTX);
    expect(ouverte[0].prose, "un taux est devenu de la prose : les deux allures ne se distinguent plus").toBeUndefined();
  });

  /**
   * L'ABRÉGÉ D'UN NOM DE FONDS RETIRE DES MOTS, ET JAMAIS LA CATÉGORIE.
   *
   * « FCP Harvest Actions CEMAC » fait cent cinquante pixels : avec son
   * chiffre, la ligne passait sur deux hauteurs quoi qu'on fasse. Partent la
   * forme juridique — que la tuile annonce en s'appelant « Fonds » — et la
   * zone, qui est la seule qu'on distribue.
   *
   * CE QUI NE PART PAS : « Actions », « Obligataire », « Trésorerie ». Ces
   * mots disent le RISQUE, et une performance sans sa catégorie se compare à
   * tort : seize pour cent sur un fonds d'actions et sept sur un obligataire
   * ne se lisent pas de la même façon. Les retirer donnerait la ligne unique
   * que le dirigeant demande ; le prix serait un chiffre qu'on peut mal lire,
   * et ce n'est pas un bon échange.
   *
   * CETTE ÉPREUVE EXISTE PARCE QU'ELLE MANQUAIT : vérifié à l'envers le jour
   * même, en coupant le nom à son premier mot, AUCUN cliquet ne tombait.
   */
  it("abrège les noms de fonds sans toucher à leur catégorie", () => {
    expect(nomDeFonds("FCP Harvest Actions CEMAC"), "la forme juridique ou la zone ne partent plus").toBe("Harvest Actions");
    expect(nomDeFonds("FCP Trésorerie Corridor")).toBe("Trésorerie Corridor");
    expect(nomDeFonds("SICAV Contacturer Obligataire - parts A"), "la catégorie de parts ne part plus").toBe("Contacturer Obligataire");
    /* Un nom qui ne porte aucun de ces mots sort entier. */
    expect(nomDeFonds("Corridor Équilibre")).toBe("Corridor Équilibre");
  });

  /**
   * LE REPLI PARLE AU POSITIF, ET IL S'EFFACE D'UN CRAN.
   *
   * DEUX DEMANDES DU MÊME SOIR, et la même raison derrière. Une tuile qu'on
   * lit un jour creux est une invitation, pas un avertissement : « ce n'est
   * pas un ordre » disait vrai à l'envers, « sans engagement » dit la même
   * chose et donne envie d'entrer. Et le contenu doit se lire par celui qui
   * le cherche sans arrêter celui qui balaie la page : il prend donc l'encre
   * tertiaire, celle des sous-titres, et non celle d'une donnée.
   *
   * LA NÉGATION EST CE QUI SE MESURE, et c'est le plus grossier des deux
   * signes — mais c'est celui qui s'est produit. Un cliquet qui demanderait
   * « de l'enthousiasme » ne garderait rien.
   */
  it("parle au positif dans ses lignes de repli", () => {
    const replis = [...apercusDuService("primaire", [], CTX), ...apercusDuService("sondage", [], CTX)];
    expect(replis.length, "il n'y a plus de repli à mesurer").toBe(4);
    const negatifs = replis.flatMap((a) => [a.nom, a.dit.key]).filter((x) => /\bn'|\bne |\bpas\b|aucun|jamais|rien/i.test(x));
    expect(negatifs, `une ligne de repli dit ce qui N'EST PAS, là où elle doit dire ce qui est :\n  ${negatifs.join("\n  ")}`).toEqual([]);
    /* Non vacuité : la mesure attrape bien une négation quand il y en a une. */
    expect(/\bn'|\bne |\bpas\b/i.test("ce n'est pas un ordre"), "le filtre des négations ne détecte plus rien").toBe(true);

    /* ET L'ENCRE S'EFFACE : la feuille pose « --ink-3 » sur les deux moitiés
       de la ligne, comme les sous-titres de la maison. */
    const css = lire("src/app/trader/Parcours.module.css");
    const bloc = css.slice(css.indexOf(".prose em,"));
    expect(bloc.slice(0, 120), "le repli ne s'efface plus : il se lit comme une donnée du client").toMatch(/color:\s*var\(--ink-3\)/);
  });

  /* LES DEUX ÉCRANS RENDENT LA MÊME DONNÉE, et c'est l'invariant que
     « Parcours.tsx » déclare en tête. Un aperçu posé sur la tuile et oublié
     dans la fiche rouvrirait l'écart que les phrases des tuiles ont déjà
     coûté une fois. */
  it("pose le même aperçu sur les deux écrans, depuis un seul calcul", () => {
    const page = code("src/app/trader/page.tsx");
    expect((page.match(/apercusDuService\(/g) ?? []).length, "la page ne calcule plus les aperçus une seule fois").toBe(1);
    expect(page, "l'écran large ne reçoit plus les aperçus").toMatch(/<Rayons[^>]*apercus=\{apercus\}/);
    expect(page, "le téléphone ne reçoit plus les aperçus").toMatch(/<Parcours[^>]*apercus=\{apercus\}/);
    expect(code("src/app/trader/Fiche.tsx"), "la fiche ne rend plus l'aperçu qu'on lui confie").toContain("apercus.map");
    expect(code("src/app/trader/Parcours.tsx"), "la tuile ne rend plus l'aperçu").toContain("a.dit.key");
  });

  /* ET AUCUNE LECTURE DE PLUS : c'est la condition qui a permis de les écrire.
     Le domaine ne connaît pas le dépôt ; s'il l'appelait, chaque tuile
     coûterait une requête. */
  it("ne lit rien : il reçoit tout de la page", () => {
    const src = code("src/lib/domain/apercus.ts");
    expect(src, "les aperçus lisent le dépôt : une requête par tuile").not.toContain("repo(");
    expect(src, "les aperçus sont devenus asynchrones : ils attendent quelque chose").not.toContain("await ");
  });
});
