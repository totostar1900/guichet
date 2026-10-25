import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { apercusDuService, APERCUS_PAR_TUILE } from "@/lib/domain/apercus";
import type { ContexteClient } from "@/lib/domain/services";
import type { Offer } from "@/lib/domain/types";
import { echeancesProches } from "@/lib/domain/echeances";
import { rendementDuFonds } from "@/lib/domain/fund-perf";

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
/* LA PERFORMANCE PLUTÔT QUE LA VL : la tuile des fonds met en avant le
   rendement depuis le 25 octobre 2026, donc la coquille doit en porter un.
   La date d'origine vient avec : sans elle, l'annualisé n'a pas de durée. */
const fonds = (id: string, title: string, nav: number, perf1yPct: number | undefined = 4.2): Offer =>
  ({ id, title, kind: "FONDS", status: "live", version: 1, fund: { nav, navDate: "2026-10-23", manager: "CAM", distributed: true, inceptionDate: "2021-04-01", perfSinceInceptionPct: 18.4, perf1yPct } }) as unknown as Offer;
/* « opensAt » n'est pas décoratif : `displayStatus` le parse sans le
   vérifier, et une séance sans date d'ouverture faisait tomber le calcul
   dès qu'un appelant le lisait. La vraie offre en porte toujours une. */
const seance = (id: string, title: string, deadlineAt: string): Offer =>
  ({ id, title, kind: "OTA", status: "published", version: 1, issuer: "Trésor", opensAt: "2026-10-01T09:00:00", deadlineAt, countryName: "Cameroun" }) as unknown as Offer;

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
    const perf = apercusDuService("fonds", offers, CTX);
    expect(perf.map((a) => a.dit.params?.r), "le rendement n'est plus mis en avant").toEqual(["+4,2 %", "+4,2 %"]);
    /* LA PÉRIODE EST DANS LA CLEF, PAS DANS UN PARAMÈTRE : un paramètre ne
       passe pas par le dictionnaire, et « sur 12 mois » serait sorti en
       français au milieu d'une page anglaise sans que rien ne le dise. */
    expect(perf.map((a) => a.dit.key)).toEqual(["{r} sur 12 mois", "{r} sur 12 mois"]);
    expect(JSON.stringify(perf), "la valeur liquidative est revenue sur la tuile").not.toMatch(/VL|10 412|12 980/);
    /* Et sans historique, une absence dite plutôt qu'un zéro : « 0,0 % » se
       lirait comme une contre-performance. */
    /* « undefined » en argument déclencherait la valeur par défaut : le fonds
       sans douze mois d'historique se construit donc à la main. */
    const sansDouzeMois = { ...(fonds("f3", "FCP Nouveau", 10_000) as unknown as { fund: Record<string, unknown> }).fund, perf1yPct: undefined };
    const jeune = apercusDuService("fonds", [{ id: "f3", title: "FCP Nouveau", kind: "FONDS", status: "live", version: 1, fund: sansDouzeMois } as unknown as Offer], CTX, new Date("2026-10-25"));
    expect(jeune[0].dit.key, "sans douze mois d'historique, l'annualisé ne prend pas le relais").toBe("{r} par an");
    /* LA TUILE PREND LA FORME COURTE, et la longue reste pour les fiches.
       Mesuré à l'écran : « +1,4 % par an depuis l'origine » occupe deux
       lignes dans la colonne d'une tuile, là où cette case est celle d'un
       nombre. Les deux formes doivent donc rester DEUX : les unifier, dans un
       sens comme dans l'autre, casse l'un des deux écrans. */
    expect(rendementDuFonds({ inceptionDate: "2021-04-01", perfSinceInceptionPct: 18.4 }, new Date("2026-10-25"))).toMatchObject({
      cle: "{r} par an depuis l'origine",
      cleCourte: "{r} par an",
    });
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
  it("dit la composition des séances, et jamais leur délai", () => {
    const offers = [seance("s1", "BTA Cameroun 26 semaines", new Date(Date.now() + 5 * 86_400_000).toISOString()), seance("s2", "OTA Gabon", new Date(Date.now() + 12 * 86_400_000).toISOString())];
    const vus = apercusDuService("primaire", offers, CTX);
    expect(vus.map((a) => a.nom), "la composition des séances n'est plus dite").toEqual(["Obligations du Trésor"]);
    expect(vus.map((a) => a.dit.key)).toEqual(["{n} séances"]);
    /* Non vacuité : les séances existent, et la bande, elle, les montre bien. */
    expect(echeancesProches(offers).length, "ces séances ne sont pas dans la fenêtre : le cliquet ne garde plus rien").toBe(2);
    /* ET AUCUN DÉLAI : ni le compte à rebours, ni « dans n jours », ni une date. */
    expect(JSON.stringify(vus), "un délai est revenu sur la tuile des adjudications, à côté de la bande qui le dit déjà").not.toMatch(/jour|clôture|dans \{|demain/i);
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
