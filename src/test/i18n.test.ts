import { readFileSync } from "node:fs";
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
    // Le prix sous un chiffre de tête : la chaîne est bâtie avec le montant dedans, donc elle passe par une clef à trous.
    expect(translate("en", "au prix de 80 000")).toBe("at 80 000");
    expect(translate("en", "au prix de 80 000 FCFA")).toBe("at 80 000 FCFA");
    expect(translate("en", "au cours 38 500 FCFA")).toBe("at 38 500 FCFA");
    expect(translate("en", "au cours 97,25 %")).toBe("at 97,25 %");
    // Les voisines ne doivent pas être avalées : la clef exacte et la clef plus longue gagnent.
    expect(translate("en", "au cours de bourse")).toBe("at the market price");
    expect(translate("en", "au prix de votre choix")).toBe("at the price of your choice");
    expect(translate("en", "au cours de 97,25 %")).toBe("at a price of 97,25 %");
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

/**
 * LA LANGUE SUIT LA PERSONNE, PAS SEULEMENT LE NAVIGATEUR.
 *
 * Le choix était écrit au compte depuis le 6 octobre 2026
 * (`ClientPrefs.lang`, posé par display-actions) avec, en toutes lettres,
 * « gardée au compte pour qu'elle suive ailleurs ». Personne ne la relisait :
 * `getLang` s'arrêtait au cookie puis à l'en-tête du navigateur. Mesuré le
 * 8 octobre : le même client lisait le français sur un appareil et l'anglais
 * sur l'autre. Une préférence qu'on écrit sans jamais la relire est une panne
 * muette de plus.
 */
describe("d'où vient la langue", () => {
  it("getLang consulte le compte entre le cookie et le navigateur", () => {
    const src = readFileSync("src/i18n/server.ts", "utf8");
    expect(src).toContain("langueDuCompte");
    expect(src).toContain("getPrefs");
    // L'ordre : cookie de cet appareil, puis compte, puis accept-language.
    const i = src.indexOf("isLang(c) ? c");
    const j = src.indexOf("await langueDuCompte()");
    const k = src.indexOf("accept.split");
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    expect(k).toBeGreaterThan(j);
  });

  it("et le choix se garde au compte quand on le change", () => {
    const src = readFileSync("src/lib/display-actions.ts", "utf8");
    expect(src).toContain("lang: d.lang");
  });
});
