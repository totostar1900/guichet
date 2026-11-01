import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const fichiers = (d: string): string[] =>
  fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => {
    const p = `${d}/${e.name}`;
    return e.isDirectory() ? fichiers(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });

/**
 * « MES » POUR CE QUI EST AU CLIENT, « VOTRE » POUR CE QUE LA MAISON LUI DIT.
 * Décidé le 1er novembre 2026 (ETALON.md § 9).
 *
 * Un nom de rubrique, de page ou d'entrée de menu est un lieu que le client
 * possède : il se dit à la première personne — « Mes documents », « Mon compte »,
 * « Mes intentions ». Une phrase de la maison, une consigne de formulaire, un
 * texte contractuel parlent AU client : « Votre ordre est servi », « Votre limite »,
 * « Votre convention ». Le défaut relevé était le mélange dans une même liste,
 * « Mes documents » à côté de « Vos intentions ».
 */
const ANCIENS: [string, string][] = [
  ["Votre compte", "Mon compte"],
  ["Votre provision", "Ma provision"],
  ["Votre activité", "Mon activité"],
  ["Votre portefeuille", "Mon portefeuille"],
  ["Votre dossier", "Mon dossier"],
  ["Votre argent chez nous", "Mon argent chez nous"],
  ["Vos intentions", "Mes intentions"],
  ["Vos versements programmés", "Mes versements programmés"],
  ["Vos droits de garde", "Mes droits de garde"],
  ["Vos opérations", "Mes opérations"],
  ["Vos opérations et l'échéancier", "Mes opérations et l'échéancier"],
  ["Vos prélèvements", "Mes prélèvements"],
  ["Vos autorisations", "Mes autorisations"],
  ["Vos réclamations", "Mes réclamations"],
  ["Vos canaux", "Mes canaux"],
  ["Vos papiers", "Mes papiers"],
  ["Vos lignes", "Mes lignes"],
  ["Vos ordres en cours", "Mes ordres en cours"],
  ["Vos démarches", "Mes démarches"],
  ["Votre ordre", "Mon ordre"],
  ["Votre instruction", "Mon instruction"],
  ["Votre conseiller", "Mon conseiller"],
  ["Vos intentions au sondage", "Mes intentions au sondage"],
];

describe("les noms de rubriques et de pages sont à la première personne", () => {
  const sources = fichiers("src").filter((f) => !f.startsWith("src/test/"));

  it("n'écrit plus un nom de lieu du client à la deuxième personne", () => {
    const fautes: string[] = [];
    for (const f of sources) {
      const src = lire(f);
      for (const [vieux] of ANCIENS) {
        const motif = new RegExp(`["'\`]${vieux.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`);
        if (motif.test(src)) fautes.push(`${f} : « ${vieux} »`);
      }
    }
    expect(fautes, "ces libellés de lieu disent « vous » : ils se disent « mes / mon » (ETALON.md § 9)\n  " + fautes.join("\n  ")).toEqual([]);
  });

  it("dit « Mon compte › … » dans les renvois, comme l'entrée de menu qu'ils nomment", () => {
    const fautes = sources.filter((f) => /Votre compte ›/.test(lire(f)));
    expect(fautes, "un renvoi nomme encore « Votre compte » : le menu dit « Mon compte »").toEqual([]);
  });

  it("garde la voix de la maison dans ses phrases, ses consignes et ses textes contractuels", () => {
    /* NON-VACUITÉ, DANS LES DEUX SENS : la règle ne s'applique pas à tout. Sans cette clause,
       un remplacement global passerait pour la règle. */
    expect(lire("src/app/Dossier.tsx"), "la phrase de la maison a perdu sa voix").toMatch(/t\("Votre dossier est approuvé"\)/);
    expect(lire("src/app/moi/ordres/page.tsx"), "la ligne de formulaire a perdu sa voix").toMatch(/t\("Votre limite"\)/);
    expect(lire("src/app/ouvrir-un-compte/convention/page.tsx"), "le texte contractuel a perdu sa voix").toMatch(/titre=\{t\("Votre convention"\)\}/);
    expect(lire("src/components/accueil/GrilleInvestir.tsx"), "le catalogue des services parle au client").toMatch(/t\("Tous vos services"\)/);
  });

  it("emploie bien la première personne sur les lieux les plus visibles", () => {
    expect(lire("src/components/mobile/BarreDuHaut.tsx"), "le tiroir ne dit plus « Mon compte »").toMatch(/t\("Mon compte"\)/);
    expect(lire("src/app/moi/provision/page.tsx"), "la provision ne dit plus « Ma provision »").toMatch(/titre=\{t\("Ma provision"\)\}/);
    expect(lire("src/app/moi/ordres/page.tsx"), "les ordres ne disent plus « Mes intentions »").toMatch(/titre=\{t\("Mes intentions"\)\}/);
  });
});
