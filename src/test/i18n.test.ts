import { describe, expect, it } from "vitest";
import { translate } from "@/i18n/core";
import { EN_ALL } from "@/i18n/core";

describe("translate", () => {
  it("exact, template and segment fallbacks", () => {
    expect(translate("fr", "Voir la fiche")).toBe("Voir la fiche");
    expect(translate("en", "Voir la fiche")).toBe("View details");
    expect(translate("en", "si servi à 94 %")).toBe("if served at 94 %");
    expect(translate("en", "actuariel · si servi à 93 %")).toBe("yield to maturity · if served at 93 %");
    expect(translate("en", "Trésor public de la République du Congo · abondement")).toBe("Public Treasury of the Republic of Congo · tap");
    expect(translate("en", "Étape {n} sur 5", { n: 2 })).toBe("Step 2 of 5");
    expect(translate("en", "0 ordres à confirmer ou transmettre")).toBe("0 orders to confirm or transmit");
    expect(translate("en", "texte inconnu")).toBe("texte inconnu");
  });
  it("reads French date tokens in English inside data strings", () => {
    expect(translate("en", "Rachat OTA 6 ans · éch. 4 déc. 2026")).toBe("OTA 6-year buyback · mat. 4 Dec 2026");
    expect(translate("en", "OTA 6,25 % · 16 sept. 2028")).toBe("OTA 6,25 % · 16 Sep 2028");
    expect(translate("en", "Prise ferme reçue le lun. 14 sept. 2026")).toBe("Prise ferme reçue le Mon 14 Sep 2026");
  });
});

/**
 * Une clef à trous est une expression régulière : « {n} » y devient « (.+?) ».
 * Écrite sans assez de lettres fixes, elle attrape des phrases qui ne lui
 * ressemblent en rien. « T{n} {y} » compilait en ^T(.+?) (.+?)$ et traduisait
 * « Trésor public de la République du Congo » en « Qrésor public… ».
 *
 * Le dictionnaire porte 466 clefs à trous et aucune ne descend sous deux
 * lettres fixes : ce plancher est donc tenable, et il suffisait à écarter
 * celle-là. Les six clefs les plus courtes sont comptées à part, pour qu'elles
 * puissent diminuer sans jamais se multiplier.
 */
describe("les clefs à trous", () => {
  const templates = Object.keys(EN_ALL).filter((k) => k.includes("{"));
  const literal = (k: string) => k.replace(/\{\w+\}/g, "").trim().length;

  it("gardent au moins deux lettres fixes", () => {
    const thin = templates.filter((k) => literal(k) < 2);
    expect(thin, "trop courte pour ne pas attraper autre chose : l'allonger, ou composer la chaîne en code").toEqual([]);
  });

  it("ne multiplient pas les clefs les plus courtes", () => {
    const short = templates.filter((k) => literal(k) <= 3);
    // le compte du 23 septembre 2026 : il peut descendre, pas monter
    expect(short.length, `clefs à trous très courtes : ${short.join(" · ")}`).toBeLessThanOrEqual(6);
  });
});
