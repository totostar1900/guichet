import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const lire = (p: string) => readFileSync(join(ROOT, p), "utf8");

/** Le source sans ses notes : un commentaire explique ce qu'on a retiré, il ne promet rien au client. */
const sansNotes = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * LA MAISON NE PROMET PAS DE DÉLAI DE RÉPONSE AU CLIENT.
 *
 * ─── La décision, et d'où elle vient ───────────────────────────────────────
 *
 * Tranchée par le dirigeant le 31 octobre 2026, en revoyant la page d'aide.
 * La bande « Toujours bloqué ? » promettait « dans l'heure ouvrée » ; la page
 * Contact, dans le même siège, disait « en journée, du lundi au vendredi » :
 * deux promesses pour une seule équipe, et l'on ne savait pas laquelle la
 * maison tenait. La réponse a été : aucune.
 *
 * Une promesse de délai est une dette. Elle ne se lit pas comme une
 * information, elle se lit comme un engagement — et le client qui a écrit à
 * quatorze heures dix et attend depuis une heure et demie relit la bande, pas
 * la page d'à côté. La maison ne la tient que tant que l'équipe tient : le
 * jour d'une absence, la phrase devient fausse sans qu'aucune épreuve ne le
 * sache.
 *
 * ─── Ce qu'on a trouvé en la cherchant ─────────────────────────────────────
 *
 * Deux promesses visibles, et cinq autres, de la même famille, sur des
 * surfaces où on ne les cherchait pas : le menu de contact du téléphone (trois
 * fois, dont « réponse sous un jour ouvré » sur l'e-mail), et le message
 * WhatsApp que reçoit le client après une intention — « Un conseiller vous
 * répond dans l'heure ». Ce dernier est le plus coûteux : il est envoyé, il
 * ne se corrige pas.
 *
 * ─── Ce que cette feuille garde, et ce qu'elle laisse ──────────────────────
 *
 * ELLE GARDE LES SURFACES DU CLIENT : les pages hors du desk, les composants
 * hors de la documentation, et les messages qu'on lui envoie.
 *
 * ELLE LAISSE LES HEURES D'OUVERTURE. « lundi à vendredi, 8 h à 17 h » à côté
 * du numéro dit quand quelqu'un décroche ; ce n'est pas un délai, et un
 * standard qui n'afficherait pas ses heures serait une autre sorte de
 * mensonge.
 *
 * LA RÉCLAMATION N'EST PAS UNE EXCEPTION, depuis le 31 octobre 2026. On l'avait
 * d'abord laissée passer : « accusé sous deux jours ouvrés, réponse sous
 * trente jours » étaient annoncés au client et repris dans la copie signée,
 * avec deux dates calculées « au plus tard le ». On avait écrit que la COSUMAF
 * les imposait ; rien dans le dépôt ne le disait, et la question a été posée au
 * dirigeant, qui a tranché : pas de délai précis, « un délai raisonnable ».
 * La page, le formulaire, la confirmation, le paragraphe « Engagement » du
 * document signé et ses deux dates sont réécrits ; le relevé couvre donc
 * maintenant aussi les modèles de documents, parce que ce que le client signe
 * est la surface la plus engageante de toutes.
 *
 * ELLE LAISSE LA DOCUMENTATION DU DESK. « Réponse dans l'heure » y décrit ce
 * que l'équipe se donne comme objectif, à l'usage des opérateurs ; ce n'est pas
 * une promesse faite à quelqu'un. Mais c'est une décision qui n'est pas la
 * nôtre de prendre ici, et elle est dite au rapport.
 */

/** Ce qui est exempté, nommé fichier par fichier, avec ce qui le justifie. */
const TOLEREES: Record<string, string> = {};

const VERBE = "(?:répon(?:d|s|dons|dent|dra|drons|se)|rappel(?:le|lons|ler|ons)?|accus(?:e|ons)|reviend(?:ra|rons))";
const DELAI = "(?:dans l'heure|heures? ouvrée?s?|jours? ouvrés?|en journée|le jour même|sous (?:un|deux|trois|quatre|cinq|\\d+) (?:jours?|heures?))";

/** Les phrases qui promettent un délai à celui qui écrit : un verbe de réponse et un délai, dans la même phrase. */
export function promessesDeDelai(texte: string): string[] {
  const out: string[] = [];
  for (const phrase of texte.split(/(?<=[.!?\n])\s|\\n/)) {
    if (new RegExp(`${VERBE}\\b[^.\\n]{0,70}${DELAI}|${DELAI}[^.\\n]{0,70}\\b${VERBE}`, "i").test(phrase)) out.push(phrase.trim().slice(0, 110));
  }
  return out;
}

/** Les fichiers de ce que le client lit ou reçoit. */
const surfaces = (): string[] => {
  const out: string[] = [];
  const marche = (d: string) => {
    for (const e of readdirSync(join(ROOT, d))) {
      const p = `${d}/${e}`;
      if (statSync(join(ROOT, p)).isDirectory()) {
        /* Le desk, la documentation, les traductions et les épreuves ne sont pas ce que le client lit. */
        if (["desk", "docs", "i18n", "test"].includes(e)) continue;
        marche(p);
      } else if (/\.tsx?$/.test(e)) out.push(p);
    }
  };
  /* « src/lib/documents » : les modèles que le client reçoit et signe — le paragraphe
     « Engagement » d'une réclamation y était écrit, avec ses délais. */
  for (const racine of ["src/app", "src/components", "src/lib/notify", "src/lib/documents"]) marche(racine);
  return out;
};

describe("la maison ne promet pas de délai de réponse", () => {
  it("n'en écrit aucun sur les surfaces du client", () => {
    const fautes: string[] = [];
    for (const f of surfaces()) {
      if (TOLEREES[f]) continue;
      for (const p of promessesDeDelai(sansNotes(lire(f)))) fautes.push(`${f} · « ${p} »`);
    }
    expect(fautes, `ces phrases promettent un délai de réponse au client — la maison n'en promet aucun :\n  ${fautes.join("\n  ")}`).toEqual([]);
  });

  it("et le relevé a bien lu les surfaces du client", () => {
    /* NON VACUITÉ PAR LE DÉPÔT. « Aucune promesse » est aussi ce que répond un
       relevé qui ne lit plus rien. Mesuré le 31 octobre 2026 : plus de 300
       fichiers sur ces trois racines. */
    const fichiers = surfaces();
    expect(fichiers.length, "le relevé ne voit presque plus de fichiers de surface").toBeGreaterThan(200);
    for (const f of ["src/app/moi/contact/ConseillerCard.tsx", "src/components/menu/Pieces.tsx", "src/lib/notify/compose.ts", "src/app/info/aide/AideBrowser.tsx", "src/lib/documents/passages-catalog.ts", "src/lib/documents/pdf/acts-templates.tsx"]) {
      expect(fichiers, `« ${f} » n'est plus lu : c'est un des endroits où la promesse se trouvait`).toContain(f);
    }
    /* Et les exemptions désignent des fichiers qui existent : une permission
       qui ne vise plus rien est une permission oubliée. */
    for (const f of Object.keys(TOLEREES)) expect(() => lire(f), f).not.toThrow();
  });

  it("dit « un délai raisonnable » à la réclamation, et nulle part un délai précis ni une date limite", () => {
    /* LA DÉCISION TIENT DANS TROIS FICHIERS, et chacun a son défaut propre.
       Le texte de la page et du formulaire : un compte de jours. Le paragraphe
       du document signé : des variables « délai » qu'on remplissait de
       « deux jours ouvrés » et « trente jours ». Le PDF : deux dates calculées
       « au plus tard le », que le client signe. Retirer l'un laisse les deux
       autres promettre. */
    const form = sansNotes(lire("src/app/moi/reclamation/ComplaintForm.tsx"));
    expect(form, "le formulaire ne dit plus « un délai raisonnable »").toMatch(/dans un délai raisonnable/);
    expect(lire("src/app/moi/reclamation/page.tsx"), "la page de réclamation ne dit plus « un délai raisonnable »").toMatch(/répond dans un délai raisonnable/);
    expect(form, "la confirmation annonce de nouveau une date limite au client").not.toMatch(/au plus tard le|fmtDate\(dep\./);

    const catalogue = sansNotes(lire("src/lib/documents/passages-catalog.ts"));
    const debut = catalogue.indexOf('P("engagement"');
    const engagement = catalogue.slice(debut, catalogue.indexOf('P("recours"', debut));
    expect(engagement.length, "le paragraphe « Engagement » n'a pas été relu : la clause ne garde plus rien").toBeGreaterThan(100);
    expect(engagement, "le paragraphe signé ne dit plus « un délai raisonnable »").toMatch(/dans un délai raisonnable/);
    expect(engagement, "le paragraphe signé a de nouveau des variables de délai : on les remplira d'un compte de jours").not.toMatch(/delai_/);

    const pdf = sansNotes(lire("src/lib/documents/pdf/acts-templates.tsx"));
    expect(pdf, "la copie signée porte de nouveau une date limite de réponse").not.toMatch(/au plus tard le|answerBy|ackBy/);
  });

  it("n'a plus de date limite de réponse, ni au desk ni dans les envois", () => {
    /* Le desk garde l'accusé de réception (cible interne) ; la réponse n'a plus de date. */
    for (const f of ["src/lib/documents/generate.ts", "src/app/moi/reclamation/actions.ts", "src/app/desk/clients/acts-actions.ts"]) {
      expect(sansNotes(lire(f)), `${f} recalcule ou affiche de nouveau une date de réponse`).not.toMatch(/answerBy|réponse avant le/);
    }
  });

  it("et le relevé voit bien une promesse, et laisse une heure d'ouverture", () => {
    /* La fonction est PURE : cinq formes à refuser, quatre à laisser. */
    expect(promessesDeDelai("un conseiller répond dans l'heure ouvrée")).toHaveLength(1);
    expect(promessesDeDelai("réponse sous un jour ouvré")).toHaveLength(1);
    expect(promessesDeDelai("le desk répond en journée, du lundi au vendredi")).toHaveLength(1);
    expect(promessesDeDelai("Un conseiller vous répond dans l'heure.")).toHaveLength(1);
    expect(promessesDeDelai("nous le rappelons dans l'heure")).toHaveLength(1);
    expect(promessesDeDelai("lundi à vendredi, 8 h à 17 h"), "une heure d'ouverture est prise pour une promesse").toEqual([]);
    expect(promessesDeDelai("un conseiller répond sur WhatsApp, ou au 06 00"), "une réponse sans délai est refusée").toEqual([]);
    expect(promessesDeDelai("le solde part sous 72 heures ouvrables si vous le demandez"), "un retour de fonds est pris pour une réponse").toEqual([]);
    expect(promessesDeDelai("le desk est joignable du lundi au vendredi")).toEqual([]);
  });
});
