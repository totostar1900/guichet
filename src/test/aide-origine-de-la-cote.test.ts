import { describe, expect, it } from "vitest";
import { AIDE } from "@/data/docs/aide";

/**
 * L'ORIGINE DE LA COTE SE DIT UNE FOIS, DANS L'AIDE (1er novembre 2026).
 *
 * Le 28 octobre, la maison a cessé de justifier dans chaque écran d'où vient sa donnée :
 * « une note unique le dit une fois pour toutes dans l'aide ». Cette note existe — « D'où
 * viennent les chiffres de Guichet ? » — et c'est elle qu'on a ENRICHIE, sur demande, au lieu
 * d'en écrire une seconde : « provenance.test » refuse deux réponses à la même question, qui
 * se contrediraient tôt ou tard. Cette épreuve garde qu'elle nomme la source de la cote, ce
 * qu'elle contient, ce qu'elle ne dit pas (le cours de l'instant) et d'où viennent les lignes
 * du Trésor, en français et en anglais.
 */
describe("l'aide : d'où viennent les chiffres de la cote", () => {
  const lignes = AIDE.chapters.flatMap((c) => c.blocks).flatMap((b) => ("rows" in b ? b.rows : []));
  const ligne = lignes.find((r) => r[0].fr.startsWith("D'où viennent les chiffres de Guichet"));
  it("a une seule réponse, dans l'aide", () => {
    expect(ligne, "la note « D'où viennent les chiffres de Guichet ? » a disparu").toBeDefined();
    expect(lignes.filter((r) => /^D'où viennent/.test(r[0].fr)).length, "deux réponses pour la même question").toBe(1);
  });
  it("nomme la source, ce qu'elle contient et ses limites, en français et en anglais", () => {
    const fr = ligne?.[1].fr ?? "";
    const en = ligne?.[1].en ?? "";
    for (const mot of [/Bulletin Officiel de la Cote/, /BVMAC/, /COSUMAF/, /BEAC/, /dernière séance publiée/, /tels qu'ils sont imprimés/, /demandez-la au desk/]) expect(fr, `le français ne dit plus ${mot.source}`).toMatch(mot);
    for (const mot of [/Official Quotation Bulletin/, /BVMAC/, /COSUMAF/, /BEAC/, /last published session/, /as printed/, /ask the desk/]) expect(en, `l'anglais ne dit plus ${mot.source}`).toMatch(mot);
  });
});
