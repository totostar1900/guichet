import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { apercusDuService, APERCUS_PAR_TUILE } from "@/lib/domain/apercus";
import type { ContexteClient } from "@/lib/domain/services";
import type { Offer } from "@/lib/domain/types";
import { echeancesProches } from "@/lib/domain/echeances";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/* Le strict nécessaire pour que les sélecteurs de la maison répondent. */
const cotee = (id: string, title: string, extra: Partial<Offer> = {}): Offer =>
  ({ id, title, kind: "MARCHE", instrument: "action", status: "live", isin: `XX${id}`, version: 1, lastPrice: 48_500, ...extra }) as Offer;
const fonds = (id: string, title: string, nav: number): Offer =>
  ({ id, title, kind: "FONDS", status: "live", version: 1, fund: { nav, navDate: "2026-10-23", manager: "CAM", distributed: true } }) as unknown as Offer;
const seance = (id: string, title: string, deadlineAt: string): Offer =>
  ({ id, title, kind: "OTA", status: "published", version: 1, issuer: "Trésor", deadlineAt, countryName: "Cameroun" }) as unknown as Offer;

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
    const vl = apercusDuService("fonds", offers, CTX);
    expect(vl.map((a) => a.dit.key), "la valeur liquidative n'est plus dite").toEqual(["VL {n} FCFA", "VL {n} FCFA"]);
    const part = apercusDuService("passage", offers, { ...CTX, partsDeFonds: { titre: "FCP Trésorerie", parts: 190 } });
    expect(part, "la part détenue ne paraît plus sous « Passage »").toEqual([{ nom: "FCP Trésorerie", dit: { key: "{n} parts", params: { n: "190" } } }]);
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
    expect(apercusDuService("passage", [], CTX), "sans part détenue, le passage annonce quelque chose").toEqual([]);
    expect(apercusDuService("sondage", [cotee("a1", "SEMC")], CTX), "« se dire preneur » n'est pas un catalogue").toEqual([]);
    expect(apercusDuService("epargne", [cotee("a1", "SEMC")], CTX), "les rayons en bandes ont pris un aperçu").toEqual([]);
  });

  /**
   * LE REFUS, ET IL EST LE CŒUR DE CETTE ÉPREUVE.
   *
   * « Adjudications et émissions » n'a PAS d'aperçu, et ce n'est pas un oubli :
   * ses deux lignes seraient les deux prochaines séances, exactement celles que
   * « Ce qui ferme bientôt » pose en tête de la même racine. Deux listes de la
   * même chose sur un écran divergent toujours.
   *
   * Une épreuve qui ne garderait que ce qui EXISTE laisserait quelqu'un
   * « compléter » la série de bonne foi, et personne ne saurait pourquoi c'est
   * faux.
   */
  it("refuse l'aperçu des adjudications, parce que la page le montre déjà", () => {
    const offers = [seance("s1", "BTA Cameroun 26 semaines", new Date(Date.now() + 5 * 86_400_000).toISOString()), seance("s2", "OTA Gabon", new Date(Date.now() + 12 * 86_400_000).toISOString())];
    expect(apercusDuService("primaire", offers, CTX), "« primaire » a reçu un aperçu : il répète la bande « Ce qui ferme bientôt » de la même page").toEqual([]);
    /* Non vacuité : les séances existent bien et la bande, elle, les montre. */
    expect(echeancesProches(offers).length, "ces séances ne sont pas dans la fenêtre : le refus ci-dessus ne garde rien").toBe(2);
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
