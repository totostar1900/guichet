import { describe, expect, it } from "vitest";
import { aUneCloture, SANS_CLOTURE } from "@/lib/domain/status";
import type { Offer } from "@/lib/domain/types";

/**
 * La sentinelle « pas de clôture », et le compte à rebours de 26 755 jours.
 *
 * Une ligne cotée et un fonds se traitent en continu : ils portent une date si
 * lointaine qu'elle ne peut être une échéance. Le carnet du desk prenait le
 * minimum des échéances sans l'écarter, et annonçait « Prochaine clôture dans
 * 26755 j 4 h · jeu. 31 déc. 17 h 00 ». Le calcul était juste, la question
 * était fausse.
 *
 * Cinq endroits réécrivaient la règle en listant les genres concernés ; ce
 * prédicat ne liste rien, et ce test tient les deux bouts : la sentinelle est
 * écartée, une vraie clôture est gardée.
 */
const ligne = (deadlineAt: string, kind: Offer["kind"] = "OTA"): Offer => ({ id: "x", kind, title: "t", issuer: "i", country: "CM", countryName: "Cameroun", deadlineAt, settleOn: "2026-10-10", status: "published", operation: "emission" } as unknown as Offer);

describe("la sentinelle sans clôture", () => {
  it("écarte une ligne qui ne ferme jamais", () => {
    expect(aUneCloture(ligne(SANS_CLOTURE, "MARCHE"))).toBe(false);
    expect(aUneCloture(ligne(SANS_CLOTURE, "FONDS"))).toBe(false);
  });

  it("garde une vraie clôture, même lointaine", () => {
    expect(aUneCloture(ligne("2026-10-08T12:00:00"))).toBe(true);
    // Une adjudication annoncée à cinq ans reste une clôture : le prédicat ne
    // juge pas de la distance, il reconnaît la sentinelle et elle seule.
    expect(aUneCloture(ligne("2031-06-30T17:00:00"))).toBe(true);
  });

  it("garde la sentinelle en un seul endroit", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const racine = path.resolve(__dirname, "../..");
    const boc = fs.readFileSync(path.join(racine, "src/lib/market/boc.ts"), "utf8");
    // Le fichier qui fabrique ces lignes nomme la sentinelle ; s'il la réécrit
    // en clair, la prochaine main ne saura pas que c'en est une.
    expect(boc, "boc.ts réécrit la date au lieu de nommer SANS_CLOTURE").not.toMatch(/deadlineAt:\s*"2099-/);
    expect(boc).toMatch(/deadlineAt:\s*SANS_CLOTURE/);
  });
});
