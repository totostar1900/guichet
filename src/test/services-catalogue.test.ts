import { describe, expect, it } from "vitest";
import { CATALOGUE, ETAPES, RAISON, RAYONS, servicesDuClient, SOUS, type ContexteClient } from "@/lib/domain/services";
import { EN_ALL } from "@/i18n/core";
import { MARKET_PAGES } from "@/lib/market/pages";

/**
 * LE CATALOGUE DIT CE QUI EXISTE, `servicesDuClient` DIT CE QU'UN CLIENT VOIT.
 *
 * La seconde liste dépend de tout : du dossier, des lignes détenues, d'un
 * mandat signé, d'un coupon qui dort. La première n'a pas de client sous les
 * yeux — c'est ce que la recherche indexe, et ce qu'un lecteur tape dans un
 * champ avant de savoir ce que la maison propose.
 *
 * DEUX LISTES DE LA MÊME CHOSE DIVERGENT, et la maison l'a déjà payé trois
 * fois cette semaine : un sommaire qui citait cinq pages quand le rail en
 * citait sept, un siège qui portait ses rubriques à la main, un rail du marché
 * invisible à toute largeur. Cette épreuve monte donc un client qui a TOUT —
 * un dossier approuvé, une convention acceptée, des lignes, un mandat, des
 * liquidités — et compare clef pour clef, nom pour nom, porte pour porte.
 *
 * ELLE TIENT AUSSI LES DEUX TABLES VOISINES : une raison d'être et des étapes
 * par service, sans quoi la page de « Trade » montre un service muet et la
 * recherche une entrée sans phrase.
 */
/**
 * ELLE EST TYPÉE, ET ELLE NE L'ÉTAIT PAS — 25 octobre 2026.
 *
 * Elle passait par `as unknown as ContexteClient`, et le détour n'était pas
 * gratuit : il portait quatre champs qui n'existent pas dans le type
 * (`fonds`, `peutOPCVM`, `prelevement`), un `dossier: "ok"` qui n'est pas une
 * de ses trois valeurs, et un `mandatASigner: false` là où le type veut un
 * objet. Le cast les acceptait tous en silence.
 *
 * CE QUE ÇA A COÛTÉ LE JOUR MÊME. Deux champs obligatoires sont entrés dans
 * `ContexteClient` pour les deux services intermittents ; le compilateur a
 * désigné les trois autres coquilles de la maison et s'est TU sur celle-ci,
 * qui est pourtant la seule dont le métier est de voir tous les services. Le
 * cliquet est alors tombé à l'exécution, ce qui est la bonne fin — mais il
 * aurait pu ne pas tomber : il suffisait que les deux services nouveaux ne
 * fussent pas conditionnels pour que la coquille mente sans conséquence
 * visible, jusqu'au jour où un troisième champ compte vraiment.
 *
 * UN CLIENT QUI A TOUT SUPPOSE AUSSI UN MARCHÉ QUI OFFRE TOUT : les deux
 * comptes sont donc à un, sans quoi cette liste ne verrait jamais les deux
 * tuiles qui n'arrivent que quelques fois par an.
 */
const CLIENT_QUI_A_TOUT: ContexteClient = {
  compteOuvert: true,
  lignes: 3,
  fondsOuverts: 2,
  souscriptionsOuvertes: 1,
  rachatsOuverts: 1,
  /* « Qui a tout » a aussi dit quelque chose au sondage : c'est le client dont
     les treize tuiles doivent paraître dans leur état le plus plein. */
  attentesSondees: 2,
  /* Et il a un mandat vivant : sa rubrique doit avoir une porte. */
  mandats: 1,
  disponible: 250_000,
  aSigner: 0,
  aRepondre: 0,
  moisDHistorique: 14,
};

describe("le catalogue des services", () => {
  const vus = servicesDuClient(CLIENT_QUI_A_TOUT);

  it("monte bien un client, et pas une coquille", () => {
    // Une épreuve qui compare deux listes vides passe toujours.
    expect(vus.length).toBeGreaterThan(5);
    expect(CATALOGUE.length).toBeGreaterThan(5);
  });

  it("nomme exactement les services qu'un client voit", () => {
    const duCode = [...new Set(vus.map((s) => s.cle))].sort();
    const duCatalogue = [...new Set(CATALOGUE.map((s) => s.cle))].sort();
    expect(duCatalogue, "le catalogue et les services rendus ne nomment plus les mêmes clefs").toEqual(duCode);
  });

  it("leur donne le même nom et la même porte", () => {
    const écarts: string[] = [];
    for (const s of vus) {
      const c = CATALOGUE.find((x) => x.cle === s.cle);
      if (!c) continue;
      if (c.nom !== s.nom) écarts.push(`${s.cle} : « ${c.nom} » au catalogue, « ${s.nom} » à l'écran`);
      if (c.href !== s.href) écarts.push(`${s.cle} : ${c.href} au catalogue, ${s.href} à l'écran`);
      if (c.rayon !== s.rayon) écarts.push(`${s.cle} : rayon ${c.rayon} au catalogue, ${s.rayon} à l'écran`);
    }
    expect(écarts, `le catalogue a dérivé :\n  ${écarts.join("\n  ")}`).toEqual([]);
  });

  it("donne à chacun sa raison d'être et ses étapes", () => {
    const sansRaison = CATALOGUE.filter((c) => !RAISON[c.cle]).map((c) => c.cle);
    const sansEtapes = CATALOGUE.filter((c) => !ETAPES[c.cle]?.length).map((c) => c.cle);
    expect(sansRaison, "ces services sortiraient muets dans la recherche").toEqual([]);
    expect(sansEtapes, "ces services n'auraient rien à montrer sur la page Trade").toEqual([]);
  });

  /**
   * LA LIGNE FIXE EXISTE POUR TOUS, ET ELLE EST TRADUITE — comme le nom.
   *
   * Les deux voyagent par « t(variable) », et le scanner des chaînes sans
   * anglais ne lit que les appels littéraux : son en-tête nomme ce trou comme
   * l'un de ses quatre angles morts. Pour ces vingt chaînes-là, c'est donc ce
   * cliquet qui tient — sans lui, un service renommé sortirait en français au
   * milieu d'une page anglaise, et rien ne le dirait.
   */
  it("donne à chacun une ligne fixe, et les deux passent par le dictionnaire", () => {
    const sansLigne = CATALOGUE.filter((c) => !SOUS[c.cle]?.trim()).map((c) => c.cle);
    expect(sansLigne, "ces services n'ont rien à écrire sous leur en-tête").toEqual([]);
    /* Six mots, pas une phrase : ce qui tient sous un titre doublé de taille.
       La raison d'être, elle, explique et peut être longue. */
    const tropLongues = CATALOGUE.filter((c) => SOUS[c.cle].length > 60).map((c) => `${c.cle} (${SOUS[c.cle].length})`);
    expect(tropLongues, "une ligne fixe trop longue redevient une phrase, et l'en-tête ne peut plus grossir").toEqual([]);

    const manquantes = CATALOGUE.flatMap((c) => [c.nom, SOUS[c.cle]]).filter((x) => !(x in EN_ALL));
    expect(manquantes, `ces chaînes sortiraient en français dans la version anglaise :\n  ${manquantes.join("\n  ")}`).toEqual([]);
  });

  /**
   * UN NOM DE SERVICE TIENT DANS UNE COLONNE DE TUILE.
   *
   * L'en-tête est passé à 20,2 px le 25 octobre 2026, et « Réinvestissement »
   * faisait alors 188 px dans une colonne de 175 : le mot sortait par-dessus la
   * bordure. Coupé par la CSS, il donnait « Réinvestissem / ent », qui se lit
   * comme une faute de frappe. La seule réponse qui tienne est un nom court —
   * c'est d'ailleurs ce qui a rendu l'en-tête doublé possible.
   *
   * La borne porte sur le PLUS LONG MOT, et non sur le nom entier : « Épargne
   * programmée » tient sur deux lignes sans rien couper, « Réinvestissement »
   * n'en a qu'une et ne peut pas. Quatorze caractères est la mesure prise à
   * l'écran sur une colonne de 175 px ; quinze laisse un cheveu.
   */
  it("ne laisse aucun nom porter un mot plus large que sa colonne", () => {
    const trop = CATALOGUE.map((c) => ({ cle: c.cle, mot: c.nom.split(/[\s'’]/).reduce((a, b) => (b.length > a.length ? b : a), "") }))
      .filter((x) => x.mot.length > 15)
      .map((x) => `${x.cle} : « ${x.mot} » (${x.mot.length})`);
    expect(trop, "ce mot débordera de sa tuile, et la CSS le coupera sans césure").toEqual([]);
  });

  it("range chacun dans un rayon qui existe", () => {
    const rayons = new Set(RAYONS.map((r) => r.cle));
    expect(CATALOGUE.filter((c) => !rayons.has(c.rayon)).map((c) => c.cle), "un rayon inconnu range le service nulle part").toEqual([]);
  });

  /**
   * AUCUN GESTE NE DÉPOSE LE CLIENT SUR UNE PAGE QUI SE LIT.
   *
   * La maison tient deux familles de pages et le dit partout : « /marche » et
   * les siennes se LISENT — l'indice, les sociétés, les notes, les avis — et
   * les services se FONT. « Acheter et vendre en bourse » menait pourtant à
   * « /marche » : un verbe à l'impératif qui ouvre une page d'étude, à deux
   * crans de « /titres », la liste où l'achat se passe.
   *
   * La garde se lit sur les deux tables plutôt que sur une liste d'adresses
   * écrite à la main : ajouter une page de lecture au marché la protège
   * aussitôt, sans que personne ait à y penser.
   */
  it("ne fait mener aucun service à une page du marché", () => {
    const lecture = new Set(MARKET_PAGES.map((p) => p.href));
    const égarés = CATALOGUE.filter((c) => lecture.has(c.href)).map((c) => `${c.cle} → ${c.href}`);
    expect(égarés, "un service dont le verbe est un geste ne mène pas à une page qui se lit").toEqual([]);
  });
});
