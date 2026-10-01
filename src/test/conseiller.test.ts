import { describe, expect, it } from "vitest";
import { COMPANY } from "@/lib/config";
import { conseillerDe, initialesDe, lienWhatsApp } from "@/lib/domain/conseiller";
import type { StaffMember } from "@/lib/domain/types";

/**
 * Le conseiller affiché, et le repli qui n'est pas un cas dégradé.
 *
 * Le cliquet tient la règle qui se perdrait sans lui : un conseiller rattaché
 * mais SANS NUMÉRO ne s'affiche pas. La carte mène par WhatsApp, donc annoncer
 * une personne qu'on ne peut pas joindre sur ce canal est pire que d'annoncer
 * le desk, qui répond. Le rattachement reste en base, l'écran ne promet rien
 * qu'il ne tienne.
 */
const membre = (p: Partial<StaffMember>): StaffMember => ({ id: "s-1", name: "Awa Ndongo", role: "desk", ...p });

describe("qui répond au client", () => {
  it("nomme la personne quand elle est joignable", () => {
    const c = conseillerDe(membre({ phone: "+237 6 90 11 22 33", email: "awa@purposecapital.africa" }));
    expect(c.nomme).toBe(true);
    expect(c.nom).toBe("Awa Ndongo");
    expect(c.initiales).toBe("AN");
    expect(c.telephone).toBe("+237 6 90 11 22 33");
  });

  it("retombe sur la maison quand le conseiller n'a pas de numéro", () => {
    const c = conseillerDe(membre({ email: "awa@purposecapital.africa" }));
    expect(c.nomme).toBe(false);
    expect(c.nom).toBe(COMPANY.name);
    expect(c.telephone).toBe(COMPANY.phone);
    // Pas d'initiales : la maison porte une figure, pas un avatar.
    expect(c.initiales).toBeUndefined();
  });

  it("retombe sur la maison quand personne n'est rattaché", () => {
    const c = conseillerDe(undefined);
    expect(c.nomme).toBe(false);
    expect(c.nom).toBe(COMPANY.name);
  });

  it("ne garde que deux initiales, et traite le trait d'union comme une espace", () => {
    expect(initialesDe("Jean-Paul Mba Ndong")).toBe("JP");
    expect(initialesDe("Awa")).toBe("A");
  });

  it("réduit le numéro à ses chiffres dans le lien", () => {
    // « +237 6 87 67 67 67 » tel quel ne résout pas : wa.me veut des chiffres.
    const url = lienWhatsApp("+237 6 87 67 67 67", "Bonjour");
    expect(url).toBe("https://wa.me/237687676767?text=Bonjour");
  });

  it("encode le texte, accents et points médians compris", () => {
    const url = lienWhatsApp("+237600000000", "Compte PC-04821 · dernière intention");
    expect(url).toContain("%C2%B7");
    expect(url).toContain("derni%C3%A8re");
  });
});
