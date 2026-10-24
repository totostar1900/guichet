import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* Le code, pas ce qu'on en dit : ces fichiers parlent longuement du pied
   réglementaire pour expliquer où il est passé. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** Les quatre sièges du dock : ce qu'un client connecté atteint d'un toucher. */
const SIEGES = ["src/app/page.tsx", "src/app/trader/page.tsx", "src/app/marche/page.tsx", "src/app/aide/page.tsx"];

/**
 * L'AGRÉMENT RESTE ATTEIGNABLE, MÊME SANS PIED DE PAGE.
 *
 * Le pied réglementaire — agrément COSUMAF, adresse du siège, convention de
 * rendement, risque de perte en capital — fermait chaque écran d'un client
 * connecté. Cent treize pixels qu'on lit une fois puis plus jamais : il a été
 * retiré pour eux, et ne paraît plus qu'à qui n'est pas encore entré.
 *
 * LA JUSTIFICATION DE CE RETRAIT TIENT À UNE CONDITION, et c'est elle qu'on
 * garde ici : les mentions « ne disparaissent pas pour autant, elles vivent
 * dans /info/mentions ». Encore faut-il qu'un client y arrive. La page
 * d'aide, qui est un siège du dock, les nomme ; sa propre note disait
 * pourtant, jusqu'au 24 octobre 2026, que « elles vivent au pied de chaque
 * page » — un fait devenu faux, et sur lequel on pouvait de bonne foi
 * supprimer cette ligne-là.
 *
 * L'épreuve lie donc les deux : tant que le pied est réservé au visiteur, au
 * moins un siège du dock doit nommer la page.
 */
describe("les mentions restent atteignables", () => {
  it("ne montre le pied réglementaire qu'à qui n'est pas entré", () => {
    /* Si cette condition tombait, le pied reparaîtrait sur chaque écran et
       l'épreuve suivante n'aurait plus d'objet — c'est pourquoi on la lit. */
    expect(code("src/app/layout.tsx"), "le pied réglementaire n'est plus réservé au visiteur").toMatch(/!onDeskHost && !session/);
  });

  it("fait nommer la page par au moins un siège du dock", () => {
    const porteurs = SIEGES.filter((f) => code(f).includes("/info/mentions"));
    expect(
      porteurs,
      "aucun siège du dock ne mène aux mentions, et le pied qui les portait ne paraît plus à un client : l'agrément COSUMAF n'est plus nommé nulle part sur son chemin",
    ).not.toEqual([]);
  });

  it("garde la page elle-même", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/info/mentions/page.tsx")), "la page des mentions a disparu").toBe(true);
  });
});
