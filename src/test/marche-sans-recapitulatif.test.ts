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
});
