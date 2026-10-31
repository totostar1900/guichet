import { describe, expect, it } from "vitest";
import { CATALOGUE, servicesDuClient, SOUS, type ContexteClient } from "@/lib/domain/services";
import { apercusDuService } from "@/lib/domain/apercus";
import { enSouscription, lignesDeLaCote, rachatsOuverts } from "@/lib/domain/listes";
import { enabledTypes } from "@/lib/registry";
import type { Offer } from "@/lib/domain/types";

/**
 * DEUX SERVICES QUI NE PARAISSENT QUE LORSQU'IL Y A DE QUOI, ET LES NOMS QUI
 * LES ACCOMPAGNENT.
 *
 * CE QUI A ÉTÉ TRANCHÉ LE 25 OCTOBRE 2026. Le dirigeant a proposé une découpe
 * des tuiles de Trade par INSTRUMENT — BTA, OTA, Stock, obligations cotées —
 * et elle a été écartée pour une raison mesurée dans le dépôt : une obligation
 * du Trésor vit dans les DEUX canaux, en OTA à une séance de la BEAC et en
 * ligne cotée au bulletin de la BVMAC. Deux tuiles la nommeraient toutes les
 * deux sans qu'aucune ait tort, et l'acheteur d'obligation cotée serait
 * envoyé aux adjudications, où il ne trouverait que du primaire.
 *
 * CE QUI A ÉTÉ RETENU À LA PLACE. L'en-tête nomme le CANAL, en un mot, parce
 * que c'est le canal seul qui décide où l'on atterrit ; la ligne du dessous
 * nomme la MARCHANDISE, sigles compris. Et deux choses qui n'avaient aucune
 * tuile en reçoivent une : les émissions à prix fixé, et les rachats du
 * Trésor. Elles n'arrivent que quelques fois par an, donc elles ne paraissent
 * que ces fois-là.
 *
 * CE QUE CES ÉPREUVES GARDENT. L'apparition et la DISPARITION — un service
 * qui ne saurait pas disparaître serait une tuile morte onze mois sur douze —,
 * le fait que les lignes du dessous nomment des instruments, et le fait
 * qu'aucun en-tête ne porte un sigle, ce qui est la conséquence directe de la
 * clientèle visée : particuliers et PME, et non trésoreries de banques.
 */
const MARCHE_VIDE: ContexteClient = {
  compteOuvert: true,
  lignes: 3,
  fondsOuverts: 2,
  souscriptionsOuvertes: 0,
  rachatsOuverts: 0,
  attentesSondees: 0,
  mandats: 0,
  disponible: 0,
  aSigner: 0,
  aRepondre: 0,
  moisDHistorique: 12,
};

const cles = (c: ContexteClient) => new Set(servicesDuClient(c).map((s) => s.cle));

/* Le strict nécessaire pour que les sélecteurs de la maison répondent. Les
   dates sont écrites en clair : un `deadlineAt` relatif à l'horloge rendrait
   ces épreuves vraies ou fausses selon l'heure où elles tournent. */
const LOIN = "2099-06-30T17:00:00";
const PASSE = "2020-01-31T17:00:00";
const emission = (id: string, deadlineAt = LOIN, extra: Partial<Offer> = {}): Offer =>
  ({ id, title: `Émission ${id}`, kind: "APE", status: "published", version: 1, issuer: "SONARA", opensAt: PASSE, deadlineAt, ...extra }) as unknown as Offer;
const rachat = (id: string, deadlineAt = LOIN, extra: Partial<Offer> = {}): Offer =>
  ({ id, title: `Rachat ${id}`, kind: "RACHAT", status: "published", version: 1, issuer: "Trésor du Cameroun", opensAt: PASSE, deadlineAt, ...extra }) as unknown as Offer;
const cotee = (id: string): Offer =>
  ({ id, title: `Cotée ${id}`, kind: "MARCHE", instrument: "action", status: "live", isin: `XX${id}`, version: 1, lastPrice: 48_500 }) as unknown as Offer;

describe("les deux services intermittents", () => {
  it("ne paraissent pas quand le marché n'en porte aucun", () => {
    const vus = cles(MARCHE_VIDE);
    expect(vus.has("souscription"), "une tuile « En souscription » paraît sans émission ouverte").toBe(false);
    expect(vus.has("rachat"), "une tuile « Rachats du Trésor » paraît sans rachat ouvert").toBe(false);
    /* Non vacuité : les dix autres sont bien là. Sans cette ligne, la même
       épreuve passerait sur un catalogue entièrement muet. */
    expect(vus.size, "ce ne sont pas deux absences dans une liste vide").toBe(9);
  });

  it("paraissent dès qu'il y en a un, et chacun pour son compte", () => {
    expect(cles({ ...MARCHE_VIDE, souscriptionsOuvertes: 1 }).has("souscription")).toBe(true);
    expect(cles({ ...MARCHE_VIDE, souscriptionsOuvertes: 1 }).has("rachat"), "un rachat paraît parce qu'une émission est ouverte").toBe(false);
    expect(cles({ ...MARCHE_VIDE, rachatsOuverts: 1 }).has("rachat")).toBe(true);
    expect(cles({ ...MARCHE_VIDE, rachatsOuverts: 1 }).has("souscription"), "une émission paraît parce qu'un rachat est ouvert").toBe(false);
    expect(cles({ ...MARCHE_VIDE, souscriptionsOuvertes: 2, rachatsOuverts: 3 }).size).toBe(11);
  });

  /* LE SINGULIER EST ÉCRIT À PART, et cette épreuve est la seule chose qui
     l'empêche de redevenir « 1 émissions ». Le français et l'anglais ne
     coupent pas le pluriel au même endroit, donc rien ne peut le calculer
     depuis le nombre seul au moment de l'affichage. */
  it("disent combien il y en a, au singulier comme au pluriel", () => {
    const une = servicesDuClient({ ...MARCHE_VIDE, souscriptionsOuvertes: 1 }).find((s) => s.cle === "souscription")!;
    expect(une.phrase.key).toContain("Une émission");
    expect(une.phrase.params, "une phrase au singulier porte un trou qu'elle ne remplit pas").toBeUndefined();
    const deux = servicesDuClient({ ...MARCHE_VIDE, souscriptionsOuvertes: 4 }).find((s) => s.cle === "souscription")!;
    expect(deux.phrase.params).toEqual({ n: 4 });
    const seul = servicesDuClient({ ...MARCHE_VIDE, rachatsOuverts: 1 }).find((s) => s.cle === "rachat")!;
    expect(seul.phrase.key).toContain("une ligne");
    expect(servicesDuClient({ ...MARCHE_VIDE, rachatsOuverts: 2 }).find((s) => s.cle === "rachat")!.phrase.params).toEqual({ n: 2 });
  });

  /**
   * LES DEUX COMPTES VIENNENT DES SÉLECTEURS DES PAGES QU'ILS OUVRENT.
   *
   * Une tuile qui compterait autrement que sa destination promet une ligne que
   * la page ne montre pas — le défaut que `listes.ts` nomme en tête de
   * fichier, et qu'il a déjà coûté trois fois.
   *
   * ET ILS LISENT L'ÉTAT, PAS SEULEMENT LA DATE : une fenêtre de souscription
   * close hier n'est pas une occasion, et une tuile qui mènerait à une page où
   * l'on ne peut plus rien est pire que pas de tuile.
   */
  it("comptent ce que la page montre, et écartent ce qui est clôturé", () => {
    const ouverts = [emission("e1"), rachat("r1"), cotee("a1")];
    expect(enSouscription(ouverts).map((o) => o.id)).toEqual(["e1"]);
    expect(rachatsOuverts(ouverts).map((o) => o.id)).toEqual(["r1"]);

    const clos = [emission("e2", PASSE), rachat("r2", PASSE)];
    expect(enSouscription(clos), "une fenêtre close reste comptée comme une occasion").toEqual([]);
    expect(rachatsOuverts(clos), "un rachat dont la date limite est passée reste compté").toEqual([]);

    /* Et ce que le desk retire ne compte pas davantage. */
    expect(enSouscription([emission("e3", LOIN, { hidden: true })]), "une ligne masquée par le desk est comptée").toEqual([]);
    expect(rachatsOuverts([rachat("r3", LOIN, { hidden: true })]), "un rachat masqué par le desk est compté").toEqual([]);
  });

  /**
   * L'APERÇU DE LA COTE NE MONTRE PLUS CE QUI EST EN SOUSCRIPTION.
   *
   * `lignesDeLaCote` les contient à bon droit : elles paraissent bien sur
   * `/titres`. Mais la ligne sous l'en-tête de cette tuile dit « à un cours »,
   * et une émission en souscription n'en a pas — elle a un prix fixé par
   * l'émetteur. L'aperçu démentait donc sa propre tuile, et montrait deux fois
   * la même ligne dès que « En souscription » paraissait à côté.
   */
  it("ne font pas dire à la cote ce qui n'a pas de cours", () => {
    const toutes = [emission("e1"), cotee("a1"), cotee("a2")];
    /* Non vacuité d'abord : le sélecteur de la page, lui, la porte bien. */
    expect(lignesDeLaCote(toutes).map((o) => o.id), "l'émission n'est plus sur la page de la cote : l'épreuve ne garde plus rien").toContain("e1");
    expect(apercusDuService("cote", toutes, MARCHE_VIDE).map((a) => a.nom), "une émission à prix fixé remonte dans l'aperçu de la cote").toEqual(["Cotée a1", "Cotée a2"]);
    expect(apercusDuService("souscription", toutes, MARCHE_VIDE).map((a) => a.nom)).toEqual(["Émission e1"]);
  });

  /* LE RACHAT N'A PAS D'APERÇU, pour la raison exacte de « primaire » : il est
     une séance annoncée au sens de `seancesAnnoncees`, donc « Ce qui ferme
     bientôt » le porte déjà en tête de la même racine, avec le temps qui
     reste. Deux listes de la même chose sur un écran divergent toujours. */
  it("laissent la bande annoncer le rachat, et ne le redisent pas", () => {
    expect(apercusDuService("rachat", [rachat("r1")], MARCHE_VIDE)).toEqual([]);
  });
});

/**
 * LES NOMS, ET LA DÉCISION SUR LA CLIENTÈLE QU'ILS PORTENT.
 *
 * Les sigles du marché — OTA, BTA, OPCVM, BVMAC — sont le vocabulaire
 * quotidien d'une trésorerie de banque, et un examen pour un particulier ou
 * une PME, qui sont la clientèle de la maison. Ils vivent donc dans la ligne
 * du dessous, où ils servent de repère à qui les connaît sans barrer la route
 * à qui les ignore, et jamais dans l'en-tête, qui est ce qu'on lit avant de
 * décider où cliquer.
 */
describe("les en-têtes de service et leur ligne", () => {
  const SIGLE = /\b[A-Z]{2,6}\b/;

  it("ne portent aucun sigle dans l'en-tête", () => {
    const fautifs = CATALOGUE.filter((c) => SIGLE.test(c.nom)).map((c) => `${c.cle} : « ${c.nom} »`);
    expect(fautifs, `un en-tête demande de connaître un sigle avant de cliquer :\n  ${fautifs.join("\n  ")}`).toEqual([]);
  });

  it("mais les nomment dans la ligne du dessous, sinon la règle ci-dessus ne garde rien", () => {
    /* Non vacuité. Sans cette seconde moitié, la première passerait sur un
       catalogue qui aurait chassé les sigles de PARTOUT — ce qui est l'erreur
       inverse, et la plus coûteuse : le client ne saurait plus qu'une séance
       du Trésor sert des OTA et des BTA, qui est la question qu'il se pose. */
    const avecSigle = CATALOGUE.filter((c) => SIGLE.test(SOUS[c.cle] ?? "")).map((c) => c.cle);
    expect(avecSigle, "plus aucune ligne ne nomme un instrument : les sigles ont disparu des deux côtés").toContain("primaire");
    expect(SOUS.primaire).toMatch(/OTA/);
    expect(SOUS.primaire).toMatch(/BTA/);
  });

  /**
   * AUCUN EN-TÊTE NE PORTE LE NOM D'UNE FAMILLE D'INSTRUMENT, et c'est la
   * découpe refusée le 25 octobre 2026, écrite de façon à tomber.
   *
   * Le cliquet du sigle, plus haut, arrête « BTA » et « OTA ». Il n'arrête pas
   * l'autre moitié de la proposition — « Actions », « Obligations cotées »,
   * « Stock » — qui n'est pas en capitales. Celui-ci la lit au REGISTRE DES
   * TYPES, où le desk nomme lui-même les huit familles : ajouter une famille
   * au Référentiel protège aussitôt les en-têtes contre son nom, sans que
   * personne ait à y penser.
   *
   * Et il tombe sur l'histoire réelle de ce fichier : l'en-tête de `/titres`
   * s'appelait « Actions » jusqu'à ce matin, alors que la page porte aussi les
   * obligations cotées. Le pluriel est donc neutralisé, sans quoi « Actions »
   * passerait devant « Action ».
   */
  it("ne portent pas le nom d'une famille d'instrument", () => {
    const nu = (s: string) => s.toLowerCase().replace(/s$/, "");
    const familles = new Set(enabledTypes().flatMap((t) => [nu(t.short), nu(t.label)]));
    const fautifs = CATALOGUE.filter((c) => familles.has(nu(c.nom))).map((c) => `${c.cle} : « ${c.nom} »`);
    expect(fautifs, `un en-tête nomme un instrument, là où il doit nommer le canal :\n  ${fautifs.join("\n  ")}`).toEqual([]);
    /* Non vacuité : le registre répond bien, et il nomme bien ce qu'on croit. */
    expect(familles.has("action"), "le registre ne nomme plus les actions : ce cliquet ne garde plus rien").toBe(true);
    expect(familles.has("ota"), "le registre ne nomme plus les OTA").toBe(true);
  });
});
