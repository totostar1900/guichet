import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

/**
 * LE GLISSEMENT D'UNE PAGE À L'AUTRE, ET SES DEUX CONDITIONS.
 *
 * Il ne se jouait presque nulle part. Mesuré au navigateur le 24 octobre
 * 2026, en espionnant `document.startViewTransition` et en relevant les
 * animations qui tournent : sur « /moi/documents → /moi/textes », sur
 * « /societes → /indice », sur « /info → /info/aide », AUCUNE. Neuf pages sur
 * cinquante-cinq portaient l'enveloppe.
 *
 * IL EN FAUT DEUX, ET LES DEUX MANQUAIENT :
 *
 *   1. LES DEUX PAGES PORTENT L'ENVELOPPE. La documentation de ce Next est
 *      formelle — « wrap every participating page », et dans `page.tsx`, pas
 *      dans un `layout` : une mise en page persiste d'une navigation à
 *      l'autre, donc l'entrée et la sortie n'y partent jamais. Un `template`
 *      a été essayé, qui aurait tenu en un fichier : mesuré, il joue sur
 *      certaines routes et pas sur d'autres. On suit donc la documentation.
 *
 *   2. LE LIEN DÉCLARE SA DIRECTION. Sans `transitionTypes`, « default:
 *      none » s'applique et rien ne bouge, même entre deux pages enveloppées.
 *      C'est voulu : un retour système ou un rafraîchissement ne sont pas des
 *      gestes de profondeur.
 *
 * Rien ne casse quand l'une des deux s'en va — la page se remplace d'un coup,
 * comme avant. C'est exactement le genre de perte que personne ne remarque,
 * et c'est pourquoi elle se grave.
 */
const pagesDuGuichet = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "desk") continue; // la console ne glisse pas : elle se consulte
        walk(p);
      } else if (e.name === "page.tsx") out.push(p);
    }
  };
  walk(path.join(ROOT, "src/app"));
  return out;
};

describe("le glissement entre pages", () => {
  it("enveloppe chaque page qui rend quelque chose", () => {
    const nues: string[] = [];
    for (const p of pagesDuGuichet()) {
      const s = fs.readFileSync(p, "utf8");
      /* Une page qui ne fait que rediriger n'a rien à animer : elle ne rend
         aucun écran, elle en désigne un autre. */
      if (!/return \(/.test(s) && /redirect\(/.test(s)) continue;
      /* UNE COQUILLE PARTAGÉE COMPTE, à condition qu'elle enveloppe vraiment :
         les quatre rayons des papiers rendent « <Rayon> », qui pose l'en-tête
         commun ET l'enveloppe. Exiger le mot « Glissement » dans chaque page
         pousserait à recopier l'en-tête quatre fois pour satisfaire une
         épreuve — ce qui est l'inverse de ce qu'elle protège. La coquille est
         donc admise, et vérifiée elle-même plus bas. */
      if (!s.includes("<Glissement>") && !/<Rayon\b/.test(s)) nues.push(path.relative(ROOT, p));
    }
    expect(nues, `ces pages ne glisseront jamais, et rien ne le signalera :\n  ${nues.join("\n  ")}`).toEqual([]);
  });

  it("fait envelopper par la coquille des rayons", () => {
    /* Sans cela l'exception ci-dessus deviendrait un trou : quatre pages
       dispensées d'enveloppe par une coquille qui n'en pose plus. */
    const coquille = fs.readFileSync(path.join(ROOT, "src/app/moi/documents/Rayon.tsx"), "utf8");
    expect(coquille, "la coquille des rayons n'enveloppe plus rien").toContain("<Glissement>");
  });

  it("ne met jamais l'enveloppe dans une mise en page", () => {
    /* Une mise en page persiste : l'entrée et la sortie n'y partiraient
       jamais, et le glissement serait mort sans qu'aucun rendu ne change. */
    const fautifs: string[] = [];
    for (const nom of ["src/app/layout.tsx", "src/app/desk/layout.tsx"]) {
      const s = fs.readFileSync(path.join(ROOT, nom), "utf8");
      if (s.includes("<Glissement>")) fautifs.push(nom);
    }
    expect(fautifs, "l'enveloppe est dans une mise en page : elle ne jouera jamais").toEqual([]);
  });

  /**
   * ENTRE DEUX PAGES D'UNE MÊME SECTION, la direction ne se devine pas : on ne
   * descend ni ne remonte, on se déplace de côté. Le seul ordre qui existe est
   * celui des pastilles qu'on a sous les yeux, et c'est lui que le rail lit.
   */
  it("fait déclarer au rail du marché la direction de chaque pastille", () => {
    const s = fs.readFileSync(path.join(ROOT, "src/components/mobile/MarketChips.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(s, "le rail ne compare plus sa place à celle de la pastille").toMatch(/i > ici \? LienAvant : LienRetour/);
  });
});
