import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Tous les .tsx de src, le même parcours que les autres cliquets de source. */
function fichiersTsx(racine = "src"): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".tsx")) out.push(p);
    }
  };
  walk(racine);
  return out;
}

/**
 * UN <title> NE PREND QU'UN SEUL ENFANT.
 *
 * React refuse un tableau d'enfants dans un <title> : le navigateur l'affiche
 * sans broncher, le serveur rend « <title></title> » VIDE. Les deux rendus
 * diffèrent donc, et l'échec d'hydratation régénère la page entière : plus un
 * bouton qui réponde le temps que React la reconstruise.
 *
 * Mesuré le 8 octobre 2026 sur /indice : soixante-quatorze infobulles de points
 * vides côté serveur, pleines côté client. Le défaut a d'abord été pris pour une
 * affaire de fuseau horaire, puis de langue ; les deux étaient de vrais défauts,
 * aucun des deux n'était celui-là.
 *
 * Le motif qui trompe est le plus naturel à écrire :
 *     <title>{a} · {b}</title>        trois enfants, vide au serveur
 *     <title>{`${a} · ${b}`}</title>  un seul, correct partout
 */
describe("les infobulles SVG n'ont qu'un enfant", () => {
  it("aucun <title> composé de plusieurs morceaux", () => {
    const fautifs: string[] = [];
    for (const f of fichiersTsx()) {
      // Les commentaires parlent du motif : on ne scanne que le code.
      const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of src.matchAll(/<title>([\s\S]*?)<\/title>/g)) {
        const dedans = m[1].trim();
        // Un seul enfant : soit « {…} » qui couvre tout, soit du texte nu.
        const unSeulBloc = /^\{[\s\S]*\}$/.test(dedans) ? equilibre(dedans) : !dedans.includes("{");
        if (!unSeulBloc) fautifs.push(`${f.replace(/\\/g, "/")} : <title>${dedans.slice(0, 70)}…`);
      }
    }
    expect(fautifs, "écrivez une seule chaîne : <title>{`${a} · ${b}`}</title>").toEqual([]);
  });
});

/** « {a} · {b} » s'ouvre et se referme deux fois : ce n'est pas un bloc unique. */
function equilibre(s: string): boolean {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") n++;
    else if (s[i] === "}") {
      n--;
      if (n === 0 && i !== s.length - 1) return false;
    }
  }
  return n === 0;
}
