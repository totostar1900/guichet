import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * Un courriel a un objet, et le serveur l'exige.
 *
 * LE DÉFAUT : le champ n'était obligatoire nulle part, et le serveur comblait le
 * vide par « Purpose Capital : votre demande ». Un objet par défaut, identique
 * sur tous les messages, se range mal dans la boîte du client et ne dit rien de
 * ce qu'il contient. Pire, il cachait l'oubli : personne ne voyait qu'un objet
 * manquait, puisqu'il y en avait toujours un.
 *
 * Et une règle que seul le navigateur applique n'est pas une règle : un
 * formulaire se rejoue sans lui. Ce cliquet tient donc la validation du SERVEUR,
 * pas celle du champ.
 *
 * WhatsApp n'a pas d'objet, et on ne lui en demande pas.
 */
const replySchema = z
  .object({ to: z.string().min(3), channel: z.enum(["whatsapp", "email"]), body: z.string().min(1).max(4000), subject: z.string().max(160).optional(), name: z.string().optional(), offerId: z.string().optional() })
  .refine((v) => v.channel !== "email" || Boolean(v.subject?.trim()), { message: "objet manquant", path: ["subject"] });

const courriel = (p: Record<string, unknown>) => replySchema.safeParse({ to: "client@example.org", channel: "email", body: "Bonjour,", ...p });

describe("l'objet d'un courriel", () => {
  it("refuse un courriel sans objet", () => {
    const r = courriel({});
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "subject")).toBe(true);
  });

  it("refuse un objet qui n'est que des espaces", () => {
    // « trim » et non « longueur » : un espace est un objet vide déguisé.
    expect(courriel({ subject: "   " }).success).toBe(false);
  });

  it("accepte un objet écrit", () => {
    expect(courriel({ subject: "Votre ordre du 2 octobre" }).success).toBe(true);
  });

  it("n'en demande pas à WhatsApp, qui n'en a pas", () => {
    expect(replySchema.safeParse({ to: "+237600000000", channel: "whatsapp", body: "Bonjour" }).success).toBe(true);
  });

  it("refuse toujours un message vide, quel que soit le canal", () => {
    expect(courriel({ subject: "Objet", body: "" }).success).toBe(false);
    expect(replySchema.safeParse({ to: "+237600000000", channel: "whatsapp", body: "" }).success).toBe(false);
  });
});
