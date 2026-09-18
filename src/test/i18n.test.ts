import { describe, expect, it } from "vitest";
import { translate } from "@/i18n/core";

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
