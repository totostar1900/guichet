import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dernierMouvement, echangesDeLaSeance } from "@/lib/market/echanges";

/** Ce que « indexPageData » passe : séance → ce qui s'y est échangé. */
interface Echange {
  titles: number;
  amount: number;
  trades: number;
  shares: Record<string, { titles: number }>;
}

/**
 * QUAND LE COURS NE BOUGE PAS, IL RESTE DEUX CHOSES À DIRE.
 *
 * Mesuré sur la production le 5 octobre 2026 : l'indice bouge sur 70 des 271
 * séances lues, et sur 1 733 couples action-séance le cours ne change que dans
 * 79. Une page bâtie sur la variation du jour affiche donc des zéros trois
 * fois sur quatre. La date du dernier mouvement et ce qui s'est échangé sont
 * dans la base depuis le premier jour.
 */
describe("ce qui s'est échangé, et quand le cours a bougé", () => {
  /* Le seuil est celui de l'affichage : « 0,004 % » s'écrit « 0,00 % », donc
     le lecteur n'a rien vu bouger, et le dater serait lui mentir. */
  it("ne retient pas un mouvement que l'écran arrondit à zéro", () => {
    expect(dernierMouvement([{ sessionDate: "2026-09-10", variationPct: 1.2 }, { sessionDate: "2026-09-30", variationPct: 0.004 }])).toBe("2026-09-10");
  });

  it("donne la dernière séance qui a bougé, et non la dernière séance", () => {
    const q = [
      { sessionDate: "2026-07-15", variationPct: -2.5 },
      { sessionDate: "2026-09-30", variationPct: 0 },
      { sessionDate: "2026-10-01", variationPct: 0 },
    ];
    expect(dernierMouvement(q)).toBe("2026-07-15");
    expect(dernierMouvement([{ sessionDate: "2026-10-01", variationPct: 0 }])).toBeUndefined();
  });

  /* Le cas mesuré sur la BVMAC : SOCAP a vu 877 titres changer de mains le
     1er octobre, et son cours n'avait pas bougé depuis le 15 juillet. */
  it("compte une ligne servie même quand son cours n'a pas bougé", () => {
    const trading = new Map<string, Echange>([
      ["2026-10-01", { titles: 1371, amount: 53_567_500, trades: 8, shares: { BHC: { titles: 4 }, SOCAP: { titles: 877 }, SCGRE: { titles: 490 }, SEMC: { titles: 0 } } }],
    ]);
    const e = echangesDeLaSeance(trading, "2026-10-01", 7)!;
    expect(e.lignes).toBe(3);
    expect(e.cotees).toBe(7);
    expect(e.servies.map((x) => x.mnemo)).toEqual(["SOCAP", "SCGRE", "BHC"]);
  });

  it("donne au montant l'échelle du mois, séance comprise", () => {
    const trading = new Map<string, Echange>([
      ["2026-08-20", { titles: 10, amount: 9_000_000, trades: 1, shares: {} }],
      ["2026-09-15", { titles: 10, amount: 50_000_000, trades: 4, shares: {} }],
      ["2026-10-01", { titles: 1371, amount: 50_000_000, trades: 8, shares: { BHC: { titles: 4 } } }],
    ]);
    const e = echangesDeLaSeance(trading, "2026-10-01", 7)!;
    /* Le 20 août est hors fenêtre : sans cette borne, l'échelle serait celle
       de toute l'histoire lue, et la part de la séance tendrait vers zéro. */
    expect(e.fenetreSeances).toBe(2);
    expect(e.fenetreMontant).toBe(100_000_000);
    expect(e.part).toBe(50);
  });

  /* Zéro sur zéro s'afficherait « 0 % », qui est une affirmation. */
  it("ne donne aucune part quand rien ne s'est échangé", () => {
    const trading = new Map<string, Echange>([["2026-10-01", { titles: 0, amount: 0, trades: 0, shares: { BHC: { titles: 0 } } }]]);
    const e = echangesDeLaSeance(trading, "2026-10-01", 7)!;
    expect(e.lignes).toBe(0);
    expect(e.part).toBeUndefined();
  });

  /* La promesse de ce lot : deux lectures de plus, aucune requête de plus. */
  it("tire ses deux mesures de ce que la page tient déjà", () => {
    const page = readFileSync(join(process.cwd(), "src/app/marche/page.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(page).toContain("echangesDeLaSeance(");
    expect(page).toContain("dernierMouvement(");
    /* Les deux se calculent de « indexPageData », qui porte déjà le négoce :
       un aperçu qui aurait demandé une requête de plus aurait été écarté. */
    expect(page, "la page relit le marché pour ce qu'elle a en main").toMatch(/echangesDeLaSeance\(trading,/);
  });
});

/**
 * LA PORTE MONTRE, ELLE NE RECOPIE PAS.
 *
 * Audit du 5 octobre 2026 : les sept sociétés paraissaient sur quatre pages
 * avec quatre jeux de colonnes, et chaque page du marché portait sa famille
 * deux fois, soit treize liens pour sept pages. La porte montre maintenant
 * trois lignes et un chiffre de chaque page ; la liste vit à un seul endroit.
 */
describe("les aperçus de la porte du marché", () => {
  const page = readFileSync(join(process.cwd(), "src/app/marche/page.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("ne recopie plus la table des sept sociétés", () => {
    expect(page, "la liste des sociétés vit sur leur page").not.toContain("<table");
    expect(page, "trois lignes, pas cinq : au-delà on recopie la table").toContain("weights.slice(0, 3)");
  });

  /* La promesse du lot : ce que « indexPageData » porte déjà ne se redemande
     pas. Les actualités vivent ailleurs, d'où la seule requête ajoutée. */
  /**
   * ELLE NE LIT QUE DES SOURCES NOMMÉES, ET LA LISTE EST ICI.
   *
   * L'ancienne écriture interdisait le mot « repo() » dans ce fichier. Elle
   * visait juste — une porte qui gagne une requête à chaque idée finit par
   * coûter plus cher que les pages qu'elle ouvre — mais elle gardait un MOT
   * plutôt qu'une règle : la page appelait déjà « publishedNews » et
   * « loadCompanies », qui lisent le dépôt par un autre chemin.
   *
   * Elle garde donc la vraie règle : les sources sont comptées et nommées.
   * Une lecture de plus fait tomber ce cas, et celui qui l'ajoute doit
   * l'inscrire ici avec sa raison — ce qui est exactement le moment où l'on
   * se demande si elle vaut son prix.
   *
   * « listOffers » est entrée le 1er novembre 2026 avec la section qui
   * propose deux lignes à comparer : le catalogue ne se déduit d'aucune des
   * autres sources, et sans lui la section ne peut rien offrir.
   */
  it("ne lit que les sources nommées ici", () => {
    const attendues = ["indexPageData()", "loadCompanies()", "publishedNews()", "loadLessons()", "repo().listOffers()"];
    /* LE BON « Promise.all » : celui qui porte l'indice. La page en ouvre deux,
       et le premier ne tient que la langue — viser le premier venu, c'est lire
       « getT, getLang » et conclure que la page ne lit rien. */
    const debut = page.lastIndexOf("Promise.all([", page.indexOf("indexPageData()"));
    const bloc = page.slice(debut, page.indexOf("]);", debut));
    const lues = [...bloc.matchAll(/([A-Za-z.()]*\b(?:indexPageData|loadCompanies|publishedNews|loadLessons|listOffers)\(\))/g)].map((m) => m[1]);
    expect(lues.length, "le relevé ne voit plus les lectures de la page : son verdict ne prouve rien").toBeGreaterThanOrEqual(4);
    expect(lues.filter((x) => !attendues.includes(x)), "cette page a gagné une lecture : l'inscrire ici, avec ce qu'elle sert").toEqual([]);
    expect(page, "la dernière note se calcule des données en main").toContain("quarterNote(undefined, data)");
  });

  it("laisse la bande du pied au desk, qui n'a ni rail ni pastilles", () => {
    const strip = readFileSync(join(process.cwd(), "src/components/MarketStrip.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(strip).toContain('if (mode !== "desk") return null;');
  });
});
