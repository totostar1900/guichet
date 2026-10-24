import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * UN TITRE DE SECTION S'EFFACE AVEC CE QU'IL ANNONCE.
 *
 * La page d'arrivée est faite de pièces qui savent se taire : la bande des
 * attentes quand rien n'attend, les échéances quand rien ne ferme, le
 * classement quand rien n'a bougé, l'indice quand aucun bulletin ne le porte,
 * la sélection quand le desk n'a rien retenu. C'est la règle de niveau 3 de
 * la page, et chacune la tient — en rendant « null ».
 *
 * MAIS LE TITRE, LUI, EST ÉCRIT PAR LA PAGE. Le 24 octobre 2026, la section
 * du marché l'écrivait dans une « section » inconditionnelle : l'indice
 * rendait « null » et il restait « LE MARCHÉ · La place → » suivi de rien.
 * Mesuré sur le dépôt mémoire, qui n'a aucun bulletin — la série du BOC est
 * ingérée, jamais semée — donc c'était l'état de toute page d'arrivée en
 * développement, et personne ne l'avait vu.
 *
 * LA RÈGLE QUI EN SORT : une pièce qui peut se taire ne vit pas sous un titre
 * que la page écrit elle-même. Ou bien la section entière est conditionnée,
 * ou bien le titre appartient à la pièce — c'est ce que l'indice fait
 * désormais, avec sa propriété « entete ».
 */
const QUI_SE_TAISENT = [
  "src/components/CeQuiVousAttend.tsx",
  "src/components/CeQuiFermeBientot.tsx",
  "src/components/CeQuiPerforme.tsx",
  "src/components/IndexPulse.tsx",
  "src/components/SelectionDuDesk.tsx",
];

const nomDe = (f: string) => path.basename(f, ".tsx");

describe("les sections qui s'effacent", () => {
  it("rend bien « null » dans chacune des pièces surveillées", () => {
    /* Non vacuité : une liste de pièces qui ne se taisent plus garderait une
       règle sans objet, et passerait tous les jours. */
    const muettes = QUI_SE_TAISENT.filter((f) => /return null/.test(lire(f)));
    expect(muettes, "ces pièces ne savent plus se taire : la règle ne garde plus rien").toEqual(QUI_SE_TAISENT);
  });

  it("ne laisse aucun titre écrit par la page au-dessus d'une pièce qui peut se taire", () => {
    const src = code("src/app/Console.tsx");
    const fautifs: string[] = [];
    for (const f of QUI_SE_TAISENT) {
      const nom = nomDe(f);
      for (const m of src.matchAll(new RegExp(`<${nom}\\b`, "g"))) {
        const i = m.index ?? 0;
        const ouvre = src.lastIndexOf("<section", i);
        const ferme = src.lastIndexOf("</section>", i);
        /* Hors de toute section : la pièce est posée nue, elle emporte tout. */
        if (ouvre < 0 || ouvre < ferme) continue;
        /* Dans une section sans titre : rien ne survit à son silence. */
        if (!src.slice(ouvre, i).includes("styles.tete")) continue;
        /* Dans une section titrée, mais la section entière est conditionnée :
           elle disparaît avec sa pièce, titre compris. */
        if (/&&\s*\(\s*$/.test(src.slice(Math.max(0, ouvre - 160), ouvre))) continue;
        fautifs.push(`${nom} · ligne ${src.slice(0, i).split("\n").length}`);
      }
    }
    expect(fautifs, `ces pièces vivent sous un titre que la page écrit sans condition : le jour où elles se taisent, il reste un titre suivi de rien\n  ${fautifs.join("\n  ")}`).toEqual([]);
  });

  /* L'indice porte son titre lui-même, et c'est la forme que prend la règle
     quand la section n'a rien d'autre à montrer. */
  it("fait porter son titre à l'indice, là où la page en demande un", () => {
    expect(code("src/app/Console.tsx"), "la page a repris l'écriture du titre du marché").toMatch(/<IndexPulse[^/>]*entete=\{/);
    expect(code("src/components/IndexPulse.tsx"), "l'indice ne rend plus l'en-tête qu'on lui confie").toContain("entete.titre");
  });
});
