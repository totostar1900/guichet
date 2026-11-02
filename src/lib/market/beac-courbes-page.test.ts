import { describe, expect, it } from "vitest";
import { cleDeFeuille, feuillesDeLaPage, planDuRamassage } from "./beac-courbes-page";

const PAGE = `
<a href="https://www.beac.int/wp-content/uploads/2016/10/Courbe-des-taux-de-rendement-des-titres-publics-Gabonais-sept-26.pdf">Courbe des taux de rendement des titres publics du Gabon - septembre 2026</a>
<a href="https://www.beac.int/wp-content/uploads/2016/10/Courbe-des-taux-de-rendement-des-titres-publics-Camerounais-sept-26.pdf">Courbe des taux de rendement des titres publics du Cameroun - septembre 2026</a>
<a href="https://www.beac.int/wp-content/uploads/2016/10/Courbe-des-taux-de-rendement-des-titres-publics-CEMAC-sept-26.pdf">Courbe des taux de rendement des titres publics de la CEMAC - septembre 2026</a>
<a href="https://www.beac.int/wp-content/uploads/2016/10/Courbe-des-taux-de-rendement-des-titres-publics-Congolais-juillet-26.pdf">Courbe des taux de rendement des titres publics du Congo - juillet 2026</a>
<a href="https://www.beac.int/wp-content/uploads/2016/10/CourbeTchad-2.pdf">Courbe des taux de rendement des titres publics tchadiens pour le mois de mai 2016</a>
<a href="https://www.beac.int/wp-content/uploads/2018/12/Note-méthodologique-20180001.pdf">Note méthodologique sur les taux de rendement</a>
<a href="https://www.beac.int/wp-content/uploads/2016/10/Courbe-des-taux-de-rendement-des-titres-publics-Gabonais-sept-26.pdf">doublon</a>
<a href="https://www.beac.int/autre.docx">Rien à voir</a>`;

describe("la page des courbes de la BEAC", () => {
  const feuilles = feuillesDeLaPage(PAGE);

  it("ne garde que les feuilles de courbes, une fois chacune, avec leur Trésor et leur mois", () => {
    expect(feuilles.map((f) => [f.pays, f.mois])).toEqual([
      ["Gabon", "2026-09"],
      ["Cameroun", "2026-09"],
      ["CEMAC", "2026-09"],
      ["Congo", "2026-07"],
      ["Tchad", "2016-05"],
    ]);
  });

  it("ne rend jamais la Centrafrique ni la Guinée équatoriale : la BEAC n'en publie pas", () => {
    expect(feuilles.some((f) => /Centrafrique|RCA|Guinée/.test(f.pays))).toBe(false);
  });

  it("ne ramasse que les feuilles de pays dont le mois manque, sans écraser l'existant", () => {
    const plan = planDuRamassage(feuilles, new Set([cleDeFeuille("Congo", "2026-07"), cleDeFeuille("Gabon", "2026-09")]));
    expect(plan.aLire.map((f) => cleDeFeuille(f.pays, f.mois!))).toEqual(["Cameroun|2026-09", "Tchad|2016-05"]);
    expect(plan.dejaEnBase.map((f) => f.pays)).toEqual(["Gabon", "Congo"]);
    expect(plan.deZone).toHaveLength(1);
    expect(plan.sansMois).toHaveLength(0);
  });

  it("montre sans la deviner une feuille dont le titre ne dit pas le mois", () => {
    const plan = planDuRamassage([{ pays: "Gabon", titre: "Courbe Gabon", url: "https://x/y.pdf" }], new Set());
    expect(plan.sansMois).toHaveLength(1);
    expect(plan.aLire).toHaveLength(0);
  });
});
