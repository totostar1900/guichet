import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ancreDeReprise, etapesDuDossier } from "@/lib/kyc/checklist";
import { emptyClientFile } from "@/lib/domain/kyc";
import type { ClientFile } from "@/lib/domain/kyc";

const ROOT = path.resolve(__dirname, "../..");

/**
 * ON REPREND UN DOSSIER OÙ ON L'A LAISSÉ.
 *
 * « Reprendre mon dossier » ouvrait le HAUT du formulaire : un client qui
 * avait rempli son identité et déposé ses pièces retombait sur « 1 · Type de
 * client » et devait redescendre en cherchant lui-même ce qui manquait. Le
 * compte des étapes savait pourtant exactement laquelle — il s'affichait même
 * à côté du bouton, « 2 étapes sur 5 ».
 *
 * RIEN NE S'EFFACE, ET LA RÉCLAME RESTE : décision du 24 octobre 2026. Un
 * dossier au brouillon porte des photos de pièce d'identité, et les détruire
 * pour ranger un écran coûterait au client de tout refaire. Il attend donc
 * aussi longtemps qu'il faut.
 *
 * L'ANCRE QUI NE MÈNE NULLE PART EST LA PANNE MUETTE DE CE LOT : un « #pieces »
 * sans section « pieces » ne lève aucune erreur, ne casse aucun rendu, et
 * dépose simplement le lecteur en haut de la page — c'est-à-dire exactement
 * là où il était avant qu'on corrige quoi que ce soit.
 */
const dossier = (over: Partial<ClientFile> = {}): ClientFile => ({ id: "f1", ...emptyClientFile("u1", "physique", "Test", {}), ...over }) as ClientFile;

describe("la reprise d'un dossier", () => {
  it("désigne la première étape qui manque", () => {
    /* Un dossier vierge bute sur l'identité : le type de client est toujours
       fait, puisqu'il a une valeur par défaut. */
    expect(ancreDeReprise(dossier())).toBe("identite");

    const avecIdentite = dossier({ identity: { ...dossier().identity, name: "A", email: "a@b.c", idNumber: "X1" } });
    expect(ancreDeReprise(avecIdentite)).toBe("pieces");

    const avecPieces = dossier({
      identity: { ...dossier().identity, name: "A", email: "a@b.c", idNumber: "X1" },
      documents: [{ kind: "piece_identite_recto", fileKey: "k", fileName: "cni.jpg", mimeType: "image/jpeg", uploadedAt: "2026-10-01" }],
    });
    expect(ancreDeReprise(avecPieces)).toBe("fonds");
  });

  it("ne désigne rien quand il ne manque plus rien", () => {
    const complet = dossier({
      identity: { ...dossier().identity, name: "A", email: "a@b.c", idNumber: "X1" },
      documents: [{ kind: "piece_identite_recto", fileKey: "k", fileName: "cni.jpg", mimeType: "image/jpeg", uploadedAt: "2026-10-01" }],
      funds: { ...dossier().funds, source: "salaire" },
      profile: { ...dossier().profile, objectives: "retraite" },
      consents: { ...dossier().consents, dataAt: "2026-10-01" },
    });
    expect(etapesDuDossier(complet).every((e) => e.fait), "le dossier d'épreuve n'est pas complet").toBe(true);
    expect(ancreDeReprise(complet)).toBeUndefined();
  });

  /**
   * LE LIEN ET LA SECTION SE RÉPONDENT, et rien ne le dirait s'ils cessaient.
   * Chaque ancre nommée dans la table des étapes doit exister comme « id »
   * dans le formulaire ; sinon le navigateur ne trouve rien et laisse le
   * lecteur en haut de la page, sans un mot.
   */
  it("mène à une section qui existe", () => {
    const formulaire = ["src/app/ouvrir-un-compte/page.tsx", "src/app/ouvrir-un-compte/Sections.tsx"]
      .map((p) => fs.readFileSync(path.join(ROOT, p), "utf8"))
      .join("\n");
    const ancres = [...new Set(etapesDuDossier(dossier({ consents: { ...dossier().consents, conventionAt: "2026-10-01" } })).map((e) => e.ancre))];
    expect(ancres.length, "la table des étapes ne nomme plus d'ancre").toBeGreaterThan(4);
    const orphelines = ancres.filter((a) => !formulaire.includes(`id="${a}"`));
    expect(orphelines, `ces ancres ne mènent à aucune section :\n  ${orphelines.join("\n  ")}`).toEqual([]);
  });

  it("fait suivre l'ancre au bouton de reprise", () => {
    const s = fs.readFileSync(path.join(ROOT, "src/app/Dossier.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(s, "le bouton de reprise a cessé de lire l'étape où l'on s'est arrêté").toMatch(/ancreDeReprise\(file\)/);
  });
});
