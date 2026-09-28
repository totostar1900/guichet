import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Une chaîne française sans traduction ressort en français.
 *
 * Le dictionnaire est indexé par le français : une clef absente n'échoue pas,
 * elle se rend telle quelle. Rien ne casse, rien n'avertit, et le mélange ne se
 * voit qu'à l'écran — dans une langue que le lecteur ne parle peut-être pas.
 * La page d'analyses en portait vingt-sept d'un coup, titres compris, sans
 * qu'aucun test ne bronche.
 *
 * Le contrôle porte sur les écrans qu'on a nettoyés et qu'on veut garder
 * propres. Il ne vise pas l'application entière : la plupart des pages ont leur
 * dette, et un cliquet qui échoue le jour où on l'écrit n'est jamais adopté.
 * Cette liste s'allonge quand un écran est mis à niveau.
 */

const SURVEILLES = ["src/app/desk/analyses", "src/components/market", "src/components/desk"];

/**
 * Une chaîne qui ressemble à du français : un accent, ou un mot-outil courant.
 *
 * « il y a 3 mois » n'a ni l'un ni l'autre, et le contrôle l'a laissée passer :
 * l'écran rendait « il y a 3 months », le traducteur découpant la phrase pour
 * traduire ce qu'il reconnaît. Les marqueurs ajoutés ne sont pas des mots
 * anglais, ce qui est la seule condition pour qu'ils n'appellent pas à tort.
 */
const duFrancais = (s: string) =>
  /[àâäéèêëîïôöùûüçœ]/i.test(s) ||
  /\b(le|la|les|des|une|qui|que|pour|dans|sur|avec|sans|plus|entre|chaque|tous|toutes)\b/i.test(s) ||
  /\b(il y a|aucun|aucune|ans|mois|jours|selon|depuis|vers|leur|leurs|cette|cet|ces|son|ses|nous|vous)\b/i.test(s);

const fichiers = (cible: string): string[] => {
  const out: string[] = [];
  (function marche(d: string) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) marche(p);
      else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
  })(path.join(process.cwd(), cible));
  return out;
};

describe("le français sans anglais", () => {
  /** Tout ce que les dictionnaires anglais savent traduire. */
  const connues = new Set<string>();
  const dossier = path.join(process.cwd(), "src/i18n");
  for (const f of readdirSync(dossier).filter((x) => /^en.*\.ts$/.test(x))) {
    /**
     * Une clef s'écrit avec ou sans guillemets, et c'est la même propriété :
     * « Méthodologie: » et « "Méthodologie": ». Ne lire que la forme entre
     * guillemets faisait passer pour non traduites des chaînes qui l'étaient.
     */
    const s = readFileSync(path.join(dossier, f), "utf8");
    for (const m of s.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)) {
      try {
        connues.add(JSON.parse(`"${m[1]}"`) as string);
      } catch {
        // Une clef illisible se signalera par le compilateur, pas ici.
      }
    }
    for (const m of s.matchAll(/^\s*([A-Za-zÀ-ÿ_$][\w$À-ÿ]*)\s*:/gm)) connues.add(m[1]);
  }

  it("connaît le dictionnaire de la maison", () => {
    // Sans lui, le test passerait au vert pour une mauvaise raison.
    expect(connues.size).toBeGreaterThan(1000);
  });

  it.each(SURVEILLES)("ne laisse aucune chaîne française sans traduction dans %s", (cible) => {
    const trous: string[] = [];
    for (const f of fichiers(cible)) {
      const s = readFileSync(f, "utf8");
      for (const m of s.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
        let clef: string;
        try {
          clef = JSON.parse(`"${m[1]}"`) as string;
        } catch {
          continue;
        }
        if (connues.has(clef) || !duFrancais(clef)) continue;
        trous.push(`${path.relative(process.cwd(), f)}:${s.slice(0, m.index).split("\n").length} · ${clef.slice(0, 70)}`);
      }
    }
    expect(trous, `ces chaînes ressortiraient en français dans la version anglaise :\n  ${trous.join("\n  ")}`).toEqual([]);
  });
});
