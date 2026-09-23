import { describe, expect, it } from "vitest";
import { CANCEL_REASONS, packReason, reasonForClient, reasonForDesk, unpackReason } from "@/lib/domain/cancel-reasons";

/**
 * Clore un ordre sans suite dit pourquoi.
 *
 * Le motif est gardé une fois et lu deux fois : par le desk dans son journal,
 * par le client dans son message. Ce test tient les deux lectures ensemble, et
 * surtout la règle qui compte : aucun motif ne laisse le client sans phrase.
 */
describe("les motifs de clôture", () => {
  it("donnent tous une phrase au client, sauf « autre » qui exige la précision", () => {
    for (const r of CANCEL_REASONS) {
      if (r.needsNote) expect(r.toClient, `« ${r.key} » ne dicte pas de phrase : c'est l'opérateur qui l'écrit`).toBe("");
      else expect(r.toClient.length, `« ${r.key} » laisserait le client sans explication`).toBeGreaterThan(10);
    }
  });

  it("se relisent tels qu'ils ont été gardés", () => {
    expect(unpackReason(packReason("documents"))).toEqual({ key: "documents" });
    expect(unpackReason(packReason("autre", "le client a changé de banque"))).toEqual({ key: "autre", note: "le client a changé de banque" });
  });

  it("se disent autrement au desk et au client", () => {
    const stored = packReason("documents");
    expect(reasonForDesk(stored)).toBe("Documents non reçus");
    expect(reasonForClient(stored)).toMatch(/pièces de votre dossier/);
  });

  it("laissent la précision de l'opérateur l'emporter sur la phrase type", () => {
    // Elle est plus proche du cas : c'est pour cela qu'elle a été écrite.
    const stored = packReason("client", "vous nous avez demandé de suspendre");
    expect(reasonForClient(stored)).toBe("vous nous avez demandé de suspendre");
    expect(reasonForDesk(stored)).toBe("Demande du client · vous nous avez demandé de suspendre");
  });

  it("ne rendent rien quand il n'y a rien : un ordre ancien n'a pas de motif inventé", () => {
    expect(reasonForClient(undefined)).toBe("");
    expect(reasonForDesk(undefined)).toBe("");
  });
});
