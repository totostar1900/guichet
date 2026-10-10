import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOC_LABEL } from "@/lib/documents/registry";
import { CONVENTION_CHANGE } from "@/data/legal";
import { PASSAGES } from "@/lib/documents/passages-catalog";

/**
 * LE TITULAIRE EST SEUL À DONNER SES ORDRES.
 *
 * Règle de la maison, arrêtée le 10 octobre 2026. Le produit l'honorait déjà
 * sans le dire : aucun mandataire n'a jamais pu se connecter. Mais il offrait
 * une procuration de papier, un acte réglementaire que rien à l'écran ne
 * faisait vivre, et un acte que le produit n'honore pas est une promesse
 * qu'il ne tiendra pas le jour où on l'invoque.
 *
 * Ce cliquet tient la règle, parce qu'une procuration se réintroduit tout
 * naturellement : il suffit qu'un écran demande « qui peut passer ordre ».
 *
 * À NE PAS CONFONDRE avec le mandat de PRÉLÈVEMENT, qui reste et qui n'a
 * rien à voir : il autorise la maison à tirer sur le compte en banque du
 * client, il ne donne de pouvoir à personne sur ses titres.
 */

const fichiers = (dir: string, out: string[] = []): string[] => {
  for (const nom of readdirSync(dir)) {
    const p = join(dir, nom);
    if (statSync(p).isDirectory()) fichiers(p, out);
    else if (/\.(ts|tsx)$/.test(nom) && !/\.test\.ts$/.test(nom)) out.push(p);
  }
  return out;
};

describe("la procuration n'existe plus", () => {
  it("aucun document « mandat » : il n'y a plus que celui du prélèvement", () => {
    expect(Object.keys(DOC_LABEL)).not.toContain("mandat");
    expect(Object.keys(DOC_LABEL)).toContain("prelevement");
  });

  it("aucune famille de passages « mandat » dans le catalogue", () => {
    expect(Object.keys(PASSAGES)).not.toContain("mandat");
  });

  it("l'article 9 de la convention dit qui donne les ordres, et exclut le tiers", () => {
    const art9 = (PASSAGES.convention ?? []).find((p) => p.key === "art_procurations");
    expect(art9, "l'article 9 doit exister").toBeTruthy();
    expect(art9!.fr).toContain("n'accepte aucune procuration");
    expect(art9!.fr).toContain("un donneur d'ordres");
    // Une personne morale n'a pas d'autres mains que son représentant : sans
    // cette phrase, aucune société ne pourrait plus passer un ordre.
    expect(art9!.fr).toContain("représentant légal");
    // Le décès reste réglé ici, et par l'article, pas par une procuration.
    expect(art9!.fr).toContain("ayants droit");
  });

  it("et le client qui reprend la convention l'apprend", () => {
    expect(CONVENTION_CHANGE.quoi).toContain("procuration");
  });

  it("aucun rôle « mandataire » dans un dossier", () => {
    /* Ce qui reste n'est pas un tiers à qui le client délègue : c'est le
       titulaire lui-même quand il n'est pas une personne physique. */
    const kyc = readFileSync("src/lib/domain/kyc.ts", "utf8");
    expect(kyc).toContain('role: "representant" | "cotitulaire" | "beneficiaire_effectif"');
    expect(kyc).not.toContain("export interface Mandate");
  });

  it("et aucun écran ne demande qui d'autre peut passer ordre", () => {
    /* Deux familles sont permises, et elles sont nommées une par une.
       Celles qui ÉNONCENT la règle ou racontent son retrait, et celles qui
       portent le mot du DROIT : « indivision de mandataires » est le nom
       reçu d'une forme de groupement, et le « PV désignant les mandataires »
       est l'acte du groupe, pas un acte de chez nous. Les désignés d'une
       indivision sont des cotitulaires, jamais des tiers à qui l'on délègue. */
    const permis = new Set([
      "src/lib/kyc/checklist.ts",
      // Le jeu d essai porte une tontine : « indivision de mandataires » est le
      // nom de la forme, et « pv_mandataires » celui de l acte du groupe.
      "src/lib/data/memory.ts",
      "src/data/docs/fonctionnement.ts",
      "src/data/docs/aide.ts",
      "src/data/docs/relation.ts",
      "src/data/docs/clientele.ts",
      "src/app/ouvrir-un-compte/Sections.tsx",
      "src/app/ouvrir-un-compte/page.tsx",
      "src/lib/domain/kyc.ts",
      "src/lib/desk/registre-data.ts",
      "src/app/desk/clients/acts-actions.ts",
      "src/i18n/en-rest.ts",
      "src/i18n/en-templates.ts",
      "src/test/un-seul-donneur-d-ordres.test.ts",
    ]);
    const coupables: string[] = [];
    for (const f of fichiers("src")) {
      const rel = f.split("\\").join("/");
      if (permis.has(rel)) continue;
      if (/mandataire/i.test(readFileSync(f, "utf8"))) coupables.push(rel);
    }
    expect(coupables, `« mandataire » reparaît ici :\n  ${coupables.join("\n  ")}`).toEqual([]);
  });
});
