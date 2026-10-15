import { describe, expect, it } from "vitest";
import { canonique, codesDeLAdresse, distance, nettoyer, reparerParLaForme } from "@/lib/market/code-crct";

/**
 * LE CODE D UNE LIGNE DU CRCT.
 *
 * Depuis que la clef d'une séance est (pays, date, code), un code mal lu ne
 * fait plus une ligne de travers : il fait une SÉANCE DE PLUS. Les cas
 * ci-dessous sont tous recopiés de la base le 16 octobre 2026.
 */
describe("la forme d'un code", () => {
  it("reconnaît les deux familles, et le suffixe de marché", () => {
    expect(canonique("CM1200000840")).toBe(true);
    expect(canonique("CM2J00000014")).toBe(true);
    expect(canonique("GA1200001210/NM1")).toBe(true);
  });

  it("REFUSE CE QU'UNE LECTURE A INVENTÉ", () => {
    /* « CM2100000028 » a un chiffre là où la série porte une lettre : c'est
       ainsi qu'on sait laquelle de deux lectures s'est trompée. */
    expect(canonique("CM2100000028")).toBe(false);
    expect(canonique("GAZK00000041")).toBe(false);
    expect(canonique("CM2J000000063")).toBe(false);
    expect(canonique("CM2B0000053")).toBe(false);
  });
});

describe("le champ débarrassé de ce qu'il a avalé", () => {
  it("recolle un code coupé par une espace", () => {
    expect(nettoyer("TD 1200000875")).toBe("TD1200000875");
    expect(nettoyer("CF 1200000377")).toBe("CF1200000377");
  });

  it("enlève la ponctuation d'une lecture de scan", () => {
    expect(nettoyer("CM21.00000028")).toBe("CM2100000028");
  });

  it("GARDE LA BARRE DU SUFFIXE DE MARCHÉ, qui n'est pas de la ponctuation", () => {
    /* L'enlever collait « MN » au code et rendait quatorze caractères
       illisibles. */
    expect(nettoyer("CM1100001146/MN BTA-13 23-JUIL-2025")).toBe("CM1100001146/MN");
  });

  it("s'arrête quand la boîte imprimée déborde du code", () => {
    expect(nettoyer("GA1100001161 BTA-13 24-JUIL-2020")).toBe("GA1100001161");
  });

  it("NE COMPLÈTE NI NE TRONQUE", () => {
    /* Un premier jet raccourcissait par la droite : « CM2J000000063 »
       devenait « CM2J00000006 », qui ne correspond à rien. */
    expect(nettoyer("CM2J000000063")).toBe("CM2J000000063");
    expect(nettoyer("GA110000292")).toBe("GA110000292");
  });
});

describe("la réparation par la forme, quand une seule correction y mène", () => {
  it("enlève le caractère doublé du remplissage", () => {
    expect(reparerParLaForme("CG13000000045").code).toBe("CG1300000045");
    expect(reparerParLaForme("CM2J000000089").code).toBe("CM2J00000089");
    expect(reparerParLaForme("TD2J000000785").code).toBe("TD2J00000785");
  });

  it("corrige les confusions d'une lecture de scan", () => {
    expect(reparerParLaForme("GAZK00000041").code).toBe("GA2K00000041");
    expect(reparerParLaForme("GA1300000S7S").code).toBe("GA1300000575");
  });

  it("N'EFFACE QUE DANS UNE SUITE DE CARACTÈRES IDENTIQUES", () => {
    /* Sans cette borne, « CG13000000045 » rendait aussi « CG1300000005 » et
       « CG1300000004 », obtenus en jetant le 4 ou le 5, et l'unicité qui sert
       de preuve disparaissait. */
    expect(reparerParLaForme("CG13000000045").candidats).toEqual(["CG1300000045"]);
  });

  it("NE CHOISIT PAS QUAND DEUX CORRECTIONS MÈNENT À LA FORME", () => {
    /* « CG11000001078 » peut perdre un 1 ou un 0 : les deux donnent un code
       valable, et aucun ne mérite d'être préféré. */
    const r = reparerParLaForme("CG11000001078");
    expect(r.code).toBeNull();
    expect(r.candidats.sort()).toEqual(["CG1000001078", "CG1100001078"]);
  });

  it("ne touche pas à un code qui a déjà la forme", () => {
    expect(reparerParLaForme("CM1200000840").code).toBeNull();
  });
});

describe("le code que l'adresse de la pièce porte", () => {
  it("LIT LE TÉMOIN QUE LA BEAC PUBLIE AVEC SA PIÈCE", () => {
    /* Le nom du fichier porte le code de la ligne : c'est un second témoin,
       de la même main que le document. */
    expect(codesDeLAdresse("https://www.beac.int/wp-content/uploads/2016/11/Communiqué-des-résultats-BTA-13S-220726_GA1100002292.pdf")).toContain("GA1100002292");
  });

  it("ne retient que ce qui a la forme d'un code", () => {
    expect(codesDeLAdresse("https://www.beac.int/wp-content/uploads/2020/08/Resultat-BTA-GE-26-08-2020.pdf")).toEqual([]);
  });
});

describe("la distance entre deux écritures d'un code", () => {
  it("compte les insertions, suppressions et échanges", () => {
    expect(distance("CM2J00000063", "CM2J000000063")).toBe(1);
    expect(distance("CM2L00000028", "CM2100000028")).toBe(1);
    expect(distance("GA2J00000341", "GA2J00000325")).toBe(2);
  });
});
