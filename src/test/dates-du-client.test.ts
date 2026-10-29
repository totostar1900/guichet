import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const SRC = path.join(ROOT, "src");

const sources = (): { chemin: string; texte: string }[] => {
  const out: { chemin: string; texte: string }[] = [];
  const descendre = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) descendre(p);
      else if (/\.tsx?$/.test(e.name)) out.push({ chemin: path.relative(ROOT, p), texte: fs.readFileSync(p, "utf8") });
    }
  };
  descendre(SRC);
  return out;
};

const DATES = /\bfmt(Date|DateTime|Day|Time|When)\b/;
const estClient = (s: string) => /^\s*"use client";/m.test(s.slice(0, 400));
/** Les imports de « @/lib/format », quelle que soit leur place dans le fichier. */
const importsDeFormat = (s: string) => [...s.matchAll(/import\s+\{([^}]*)\}\s+from\s+"@\/lib\/format";/g)].map((m) => m[1]);

/**
 * UN COMPOSANT CLIENT NE LIT PAS LA LANGUE DANS UN MODULE — RELEVÉ LE 30 OCTOBRE 2026.
 *
 * « fmtDate » et ses sœurs interrogent une variable de module. Il y a DEUX
 * graphes à l'exécution : celui du serveur, où « i18n/server.ts » branche la
 * variable sur la requête en cours, et celui du client, que personne ne
 * branche — « i18n/client.tsx » garde « setFormatLang » derrière « typeof
 * window », et ce garde est juste, sans quoi deux requêtes de langues
 * différentes se la disputeraient au rendu serveur.
 *
 * Donc un composant CLIENT écrivait ses dates en français au rendu serveur,
 * quelle que soit la langue du lecteur, puis en anglais une fois hydraté.
 * React jetait le sous-arbre : « Hydration failed because the server rendered
 * text didn't match the client. As a result this tree will be regenerated on
 * the client. » Mesuré sur cinq pages — /info/simulateur, /titres,
 * /desk/titres, /fonds et « Ouvrir un compte », où l'on pouvait lire :
 *
 *     « Data consent given on jeu. 29 oct. 23 h 29. »
 *
 * UN SEUL COMPOSANT, DEUX SOURCES DE VÉRITÉ : le dictionnaire savait l'anglais
 * — il voyage par le contexte React — et la date ne le savait pas.
 *
 * Le contexte connaît la langue des deux côtés. « useDates » la lui demande,
 * et c'est par là que passent les 133 dates des composants clients.
 */
describe("les dates d'un composant client viennent du contexte", () => {
  it("ne laisse aucun fichier « use client » importer un formateur de date nu", () => {
    const fautifs = sources()
      .filter((f) => estClient(f.texte))
      .filter((f) => importsDeFormat(f.texte).some((liste) => DATES.test(liste)))
      .map((f) => f.chemin);
    expect(
      fautifs,
      `ces fichiers clients lisent la langue des dates dans un module que leur graphe ne branche pas — ils doivent passer par « useDates() » :\n  ${fautifs.join("\n  ")}`,
    ).toEqual([]);
  });

  /* NON-VACUITÉ : le crochet existe, et il sert. Sans ces deux lignes, la
     clause ci-dessus resterait verte le jour où plus aucun composant client
     n'afficherait de date — ou le jour où « useDates » disparaîtrait. */
  it("fait passer les composants clients par le crochet", () => {
    const client = fs.readFileSync(path.join(SRC, "i18n/client.tsx"), "utf8");
    expect(client, "« useDates » n'est plus exporté par le contexte").toMatch(/export const useDates\b/);
    expect(client, "« useDates » ne lit plus la langue du contexte").toMatch(/formatsDeLaLangue\(useLang\(\)\)/);
    const porteurs = sources().filter((f) => estClient(f.texte) && /\buseDates\(\)/.test(f.texte));
    expect(porteurs.length, "plus aucun composant client ne demande ses dates au contexte").toBeGreaterThanOrEqual(30);
  });

  /**
   * LE RÉSUMÉ D'UNE LIGNE DATE AUSSI, et il est appelé des deux côtés.
   *
   * « summarize » n'est pas un composant : le cliquet d'au-dessus ne le voit
   * pas. Il écrivait pourtant la clôture de la table des titres, et son seul
   * appelant client — « OfferBrowser » — la recevait en français sous un
   * en-tête « Closed ». Un appelant client doit donc lui passer ses dates.
   */
  it("fait passer ses dates au résumé quand c'est un composant client qui le demande", () => {
    const nus = sources()
      .filter((f) => estClient(f.texte))
      .flatMap((f) =>
        [...f.texte.matchAll(/\bsummarize\(([^;]{0,160}?)\)[.,;\s)]/g)]
          .filter((m) => !m[1].includes("dates"))
          .map((m) => `${f.chemin} : summarize(${m[1].trim().slice(0, 60)})`),
      );
    expect(nus, `ces appels clients laissent le résumé deviner la langue :\n  ${nus.join("\n  ")}`).toEqual([]);
    // Non-vacuité : un composant client appelle bien ce résumé.
    const porteurs = sources().filter((f) => estClient(f.texte) && /summarize\([^;]*dates/.test(f.texte));
    expect(porteurs.length, "plus aucun composant client ne passe ses dates au résumé").toBeGreaterThanOrEqual(1);
  });

  /**
   * ET PERSONNE NE COMPOSE UNE HEURE À LA MAIN.
   *
   * La table des titres écrivait « fmtTime(iso).replace(":", " h ") » : le
   * séparateur français, en dur, sous toutes les langues. Il sort de
   * « fmtHeure », qui suit le lecteur comme le reste de la date.
   */
  it("ne laisse personne refaire le séparateur de l'heure", () => {
    /* Sans les commentaires : celui de « format.ts » CITE la ligne fautive
       pour dire d'où elle vient, et une citation n'est pas un défaut. */
    const sansCommentaire = (s: string) =>
      s
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
    const fautifs = sources()
      .filter((f) => !f.chemin.startsWith("src/test/"))
      .filter((f) => /\.replace\((["'`]):\1,\s*["'`] h ["'`]\)/.test(sansCommentaire(f.texte)))
      .map((f) => f.chemin);
    expect(fautifs, `ces fichiers posent le « h » français à la main au lieu de « fmtHeure » :\n  ${fautifs.join("\n  ")}`).toEqual([]);
    const format = fs.readFileSync(path.join(SRC, "lib/format.ts"), "utf8");
    expect(format, "« fmtHeure » n'est plus dans le jeu des formateurs").toMatch(/fmtHeure: \(iso\) =>/);
  });

  /**
   * ET LE SERVEUR GARDE SA LECTURE PAR REQUÊTE : les fonctions nues restent
   * exportées pour lui, et elles passent toutes par le même jeu.
   */
  it("laisse au serveur ses formateurs, branchés sur la requête", () => {
    const format = fs.readFileSync(path.join(SRC, "lib/format.ts"), "utf8");
    expect(format, "« formatsDeLaLangue » ne rend plus les dates d'une langue donnée").toMatch(/export const formatsDeLaLangue = \(lang: LangueDesDates\)/);
    for (const f of ["fmtDate", "fmtDateTime", "fmtDay", "fmtTime", "fmtWhen"]) {
      expect(format, `« ${f} » ne passe plus par le jeu du lecteur`).toMatch(new RegExp(`export const ${f} = [^;]*duLecteur\\(\\)`));
    }
  });
});
