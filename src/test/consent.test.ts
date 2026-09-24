import { describe, expect, it } from "vitest";
import { consented, isPromotional, mayReceive } from "@/lib/notify/consent";
import type { Contact, NotifyKind } from "@/lib/domain/types";

/**
 * Qui peut recevoir quoi.
 *
 * WhatsApp avait sa case depuis le premier jour et l'e-mail n'en avait pas :
 * une diffusion partait donc à toute adresse connue, y compris celle de
 * quelqu'un qui s'était connecté une fois par curiosité. C'est cette asymétrie
 * que ce fichier garde fermée.
 *
 * L'autre moitié compte autant : un accusé de réception ou un avis d'opéré ne
 * se refuse pas. Couper le service au nom d'une case à cocher reviendrait à
 * laisser un client sans nouvelles de son propre argent.
 */
const who = (over: Partial<Contact> = {}): Contact => ({ id: "c1", name: "Awa Mbarga", segment: "Personne physique · Douala", phone: "+237600000000", email: "awa@exemple.com", whatsappOptIn: false, emailOptIn: false, ...over });

const SERVICE: NotifyKind[] = ["intent_received", "intent_update", "document", "results"];
const PROMO: NotifyKind[] = ["offer_published", "opportunity", "digest"];

describe("le consentement", () => {
  it("sépare ce qui part de nous de ce qui découle d'un ordre", () => {
    for (const k of PROMO) expect(isPromotional(k), k).toBe(true);
    for (const k of SERVICE) expect(isPromotional(k), k).toBe(false);
  });

  it("laisse passer le service sans rien demander", () => {
    const muet = who();
    for (const k of SERVICE) {
      expect(mayReceive(muet, k, "email"), k).toBe(true);
      expect(mayReceive(muet, k, "whatsapp"), k).toBe(true);
    }
  });

  it("retient le promotionnel tant que le client n'a pas dit oui", () => {
    const muet = who();
    for (const k of PROMO) {
      expect(mayReceive(muet, k, "email"), k).toBe(false);
      expect(mayReceive(muet, k, "whatsapp"), k).toBe(false);
    }
  });

  it("consent canal par canal, sans déborder sur l'autre", () => {
    const parMail = who({ emailOptIn: true });
    expect(mayReceive(parMail, "opportunity", "email")).toBe(true);
    expect(mayReceive(parMail, "opportunity", "whatsapp")).toBe(false);

    const parWhatsapp = who({ whatsappOptIn: true });
    expect(mayReceive(parWhatsapp, "opportunity", "whatsapp")).toBe(true);
    expect(mayReceive(parWhatsapp, "opportunity", "email")).toBe(false);
  });

  it("traite « suivre une ligne » comme la demande qu'elle est", () => {
    // Le client a demandé à être prévenu sur cette ligne : le lui refuser au nom
    // d'une case générale reviendrait à ne pas répondre à une question posée.
    expect(mayReceive(who(), "watch", "email")).toBe(true);
  });

  it("tient le push pour consenti par l'abonnement lui-même", () => {
    // S'abonner depuis son téléphone est le oui ; se désabonner est le retirer.
    expect(consented(who(), "push")).toBe(true);
  });
});
