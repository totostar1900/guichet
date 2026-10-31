import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* Le code, pas ce qu'on en dit : ces fichiers citent dans leurs commentaires
   ce qui en est parti, pour expliquer pourquoi. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * LA PORTE DU MARCHÉ NE REDIT PAS SA FAMILLE EN PIED.
 *
 * Relevé du 24 octobre 2026, au téléphone à 390 px : la famille du marché
 * s'écrivait TROIS fois sur une page de 1 363 px —
 *
 *   y   60  les pastilles du rail, sept entrées ;
 *   y  115–659  le sommaire en bandes, les six autres ;
 *   y 1175  le récapitulatif du pied, trois de plus.
 *
 * « Comparer deux lignes » y figurait deux fois au mot près. Sur grand écran,
 * la colonne tient la famille et le pied en reprenait trois.
 *
 * C'est la leçon que « MarketStrip » avait déjà tirée pour le client — une
 * bande de pied qui répète la famille est du bruit une fois les pastilles
 * posées —, restée à moitié appliquée. Son autre moitié tient : UN LIEN DANS
 * UNE PHRASE PORTE SA RAISON, et c'est à ce titre que « Ce que le bulletin
 * publie » reste, seul, contre la phrase qui dit pourquoi on le suivrait.
 */
describe("la porte du marché", () => {
  it("ne repose pas un récapitulatif de sa propre famille en pied", () => {
    const src = code("src/app/marche/page.tsx");
    const pied = src.slice(src.indexOf("styles.source"));
    const liens = [...pied.matchAll(/<Link\b[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    expect(liens.length, `le pied porte de nouveau ${liens.length} liens : ${liens.join(", ")}`).toBeLessThanOrEqual(1);
    /* Les deux qui étaient écrits au mot près ailleurs sur la page. */
    for (const double of ["/info/indice-bvmac", "/comparer"]) {
      expect(pied, `« ${double} » est revenu au pied, alors que le rail et le sommaire y mènent déjà`).not.toContain(double);
    }
  });

  /* ELLE REND « null » HORS DU DESK, depuis le 5 octobre 2026. Trois pages du
     client la montaient quand même, sans « mode » : elles ne rendaient donc
     rien, et le lecteur du code croyait y voir une bande. Un composant qu'on
     monte là où il ne rend jamais rien est une description fausse de la
     page. */
  it("ne monte pas la bande du desk là où elle ne rend rien", () => {
    const fautifs: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".tsx")) {
          for (const m of code(path.relative(ROOT, p)).matchAll(/<MarketStrip\b[^>]*\/>/g)) {
            if (!m[0].includes("mode=")) fautifs.push(`${path.relative(ROOT, p)} · ${m[0]}`);
          }
        }
      }
    };
    walk(path.join(ROOT, "src/app"));
    expect(fautifs, `ces montages rendent « null » : la bande n'existe qu'au desk\n  ${fautifs.join("\n  ")}`).toEqual([]);
    /* Non vacuité : la bande est bien encore montée quelque part. */
    expect(lire("src/app/indice/IndiceBody.tsx"), "la bande du desk n'est plus montée nulle part").toContain("<MarketStrip");
  });
  /* ET ELLE NE LA REDIT PLUS EN TÊTE NON PLUS.
     Le même relevé comptait trois écritures de la famille. Le pied est parti
     le premier, puis les deux autres se sont retrouvées face à face : les
     pastilles du rail à y 60, puis le sommaire du téléphone à y 115-659 —
     sept pastilles courtes dont la plus inutile marque la page où l'on se
     tient, puis six rubriques nommées et expliquées, le tout AVANT le titre
     de la page, sur l'écran le plus étroit.

     LES DEUX SONT PARTIES ENSEMBLE, le 1er novembre 2026, et c'est la seule
     façon de ne pas rouvrir le trou que cette épreuve nommait. L'ancienne
     écriture tenait le rail SILENCIEUX sur la porte parce que le sommaire y
     était, et elle disait le risque mot pour mot : « retirer le sommaire sans
     rendre le rail laisserait le téléphone sans aucune entrée vers la
     famille ». C'est exactement ce qui est arrivé à la première écriture de
     ce travail : les six entrées sont devenues des sections qui portent un
     chiffre, et un jour sans bulletin, sans ligne et sans dépêche — l'état du
     dépôt mémoire — quatre d'entre elles ne rendaient rien.

     UN BOUTON FLOTTANT LES PORTE MAINTENANT, sur les six pages ET sur la
     porte, en trente-quatre pixels au lieu de sept cents. Ce que cette
     épreuve garde n'a pas changé de nature : la famille ne s'écrit pas deux
     fois avant le titre, et elle ne disparaît pas non plus. */
  it("porte la famille une seule fois, et jamais avant le titre", () => {
    const page = code("src/app/marche/page.tsx");
    expect(page, "le sommaire des six entrées est revenu avant le titre, au téléphone").not.toContain("<Rubriques");
    /* ET IL N'EST PAS REVENU SOUS UN AUTRE NOM : la table des pages du marché
       n'a rien à faire dans le corps de cette page, qui montre des sections. */
    expect(page, "la page récrit la table de la famille : c'est le sommaire qui revient").not.toContain("MARKET_PAGES");

    const fab = code("src/components/mobile/MarketFab.tsx");
    /* LA LECTURE DE LA TABLE, ET NON SON NOM : vérifié à l'envers le jour
       même où cette clause a été écrite, le mot reste sur la ligne d'import
       quand la feuille cesse de lire la table, et le bouton ouvrirait alors
       une liste vide. */
    expect(fab, "le bouton des pages du marché ne lit plus la table de la famille").toMatch(/MARKET_PAGES\.filter\(/);
    /* IL NE SE TAIT NULLE PART DANS LA FAMILLE, porte comprise. Une garde
       « ici === \"marche\" » rouvrirait le trou décrit ci-dessus. */
    expect(fab, "le bouton se tait sur la porte : un jour creux, la famille n'a plus d'entrée au téléphone").not.toMatch(/ici === "marche"/);
    expect(fab, "le bouton ne s'efface plus hors de la famille : il paraîtrait sur tout le site").toMatch(/if \(!monte \|\| !ici\) return null;/);
  });

  /* La prémisse de l'épreuve au-dessus : « /marche » est bien ce que la
     famille appelle sa porte. Si la clef changeait, le rail reparaîtrait. */
  it("reconnaît la porte de la famille sous ce nom", async () => {
    const { currentMarketPage } = await import("@/lib/market/pages");
    expect(currentMarketPage("/marche")).toBe("marche");
    expect(currentMarketPage("/societes"), "une page de lecture doit garder son rail").toBe("societes");
  });
});
