import { readFileSync, readdirSync, statSync } from "node:fs";
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

/**
 * Un dossier, ou un fichier isolé.
 *
 * L'accueil public ne vit pas dans un dossier à lui : c'est « Accueil.tsx » à
 * la racine de src/app, à côté de vingt écrans qui traînent leur dette. Le
 * surveiller par son dossier allumerait toute l'application ; le surveiller
 * par son nom le garde propre sans exiger le reste.
 */
/**
 * TOUT src, depuis le 2 octobre 2026.
 *
 * La liste tenait quatre endroits, et src/app/desk/messages n'en faisait pas
 * partie : trois chaînes de la feuille de relecture y sont passées sans que
 * rien ne bronche. Le script compagnon ne les a pas vues non plus, pour une
 * autre raison, et les deux mailles laissaient donc passer au même endroit.
 *
 * Élargir a coûté huit traductions sur 667 fichiers : le reste du dépôt était
 * déjà propre. Une liste d'endroits surveillés est une dette qui ne se voit
 * pas ; « partout » n'en est pas une.
 */
const SURVEILLES = ["src"];

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
  /\b(il y a|aucun|aucune|ans|mois|jours|selon|depuis|vers|leur|leurs|cette|cet|ces|son|ses|nous|vous)\b/i.test(s) ||
  /* Troisième passe, ajoutée le 29 septembre 2026. « Ouvrir un compte-titres »
     n'a ni accent ni aucun des mots ci-dessus, et s'affichait en français sur
     l'écran anglais du nouvel accueil : c'était le bouton principal de la page.
     Ces articles et auxiliaires sont ce qui manquait, et aucun n'est un mot
     anglais, ce qui reste la seule condition pour qu'ils n'appellent pas à
     tort. */
  /\b(un|du|au|aux|et|ni|est|sont|ne|pas|votre|vos|notre|nos|mon|ma|mes)\b/i.test(s);

const fichiers = (cible: string): string[] => {
  const racine = path.join(process.cwd(), cible);
  if (!statSync(racine).isDirectory()) return [racine];
  const out: string[] = [];
  (function marche(d: string) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) marche(p);
      else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
  })(racine);
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

  it("lit vraiment des fichiers, et pas zéro", () => {
    /* LA MÊME PANNE, DE L'AUTRE CÔTÉ. Le script compagnon prenait ses cibles
       dans argv : lancé sans argument il lisait zéro fichier et annonçait
       « 0 clefs à traduire », ce qui ressemble trait pour trait à un succès.
       Un parcours qui ne trouve rien doit échouer ici plutôt que rassurer. */
    expect(SURVEILLES.flatMap(fichiers).length).toBeGreaterThan(400);
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
