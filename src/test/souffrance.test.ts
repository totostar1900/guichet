import { describe, expect, it } from "vitest";
import type { EventLog, Intent, Offer } from "@/lib/domain/types";
import { derniereTransition, souffranceDe, SOUFFRANCE_DEFAUT } from "@/lib/domain/souffrance";

/**
 * CE QUI REMET LE COMPTEUR À ZÉRO, ET CE QUI NE LE REMET PAS.
 *
 * Toute la mesure tient là-dessus. Le journal d'un ordre porte des
 * transitions d'état mais aussi des messages préparés et des documents
 * générés, et ceux-là ne font pas avancer l'ordre. Les compter remettrait le
 * compteur à zéro sans que rien n'ait bougé, et un ordre dormant depuis un
 * mois paraîtrait frais parce qu'on lui a préparé une relance le dernier
 * jour. C'est exactement le cas de OA-0930, en base, dont les deux dernières
 * lignes sont des messages préparés.
 */

const LE_JOUR = new Date("2026-10-18T12:00:00Z");

const ordre = (p: Partial<Intent> = {}): Intent =>
  ({ id: "i1", ref: "OA-0930-THT3", offerId: "o1", offerVersion: 1, clientName: "Toto", clientSegment: "part", type: "achat", channel: "E-mail", state: "recue", createdAt: "2026-09-30T09:00:00Z", ...p }) as Intent;

const offre = (p: Partial<Offer> = {}): Offer =>
  ({ id: "o1", kind: "OTA", country: "Gabon", title: "OTA", status: "published", nominal: 10_000, commissionPct: 0, settleOn: "2026-11-02", deadlineAt: "2026-11-30T12:00:00Z", ...p }) as Offer;

const evt = (at: string, html: string, intentId = "i1"): EventLog => ({ id: at, at, kind: "intent", html, intentId });

describe("derniereTransition", () => {
  it("retient une phrase qui nomme un état", () => {
    const e = derniereTransition("i1", [evt("2026-10-01T10:00:00Z", "IN-1 (Toto) — Confirmée · FCP")]);
    expect(e?.at).toBe("2026-10-01T10:00:00Z");
  });

  it("ignore un message préparé ou un document généré", () => {
    const j = [
      evt("2026-09-30T09:00:00Z", "OA-0930 (Toto) — Confirmée · OTA"),
      evt("2026-10-17T09:00:00Z", "Message préparé · « Relance : sans réponse » ouvert dans WhatsApp"),
      evt("2026-10-17T10:00:00Z", "Bulletin d'ordre de souscription PC-BUL-261008-XQY4 généré"),
    ];
    expect(derniereTransition("i1", j)?.at).toBe("2026-09-30T09:00:00Z");
  });

  it("ne confond pas les ordres entre eux", () => {
    const j = [evt("2026-10-15T09:00:00Z", "IN-2 — Transmise ·", "i2")];
    expect(derniereTransition("i1", j)).toBeUndefined();
  });
});

describe("souffranceDe", () => {
  it("compte l'âge depuis la transition, pas depuis la réception", () => {
    /* Reçu le 30 septembre, confirmé le 16 octobre : il a attendu deux jours,
       pas dix-huit. C'est la distinction qui a fait rater la première mesure. */
    const s = souffranceDe(ordre({ state: "confirmee" }), offre(), [evt("2026-10-16T09:00:00Z", "OA — Confirmée · OTA")], SOUFFRANCE_DEFAUT, LE_JOUR);
    expect(s!.jours).toBe(2);
    expect(s!.depuisUneTransition).toBe(true);
  });

  it("retombe sur la réception quand le journal ne dit rien, et le déclare", () => {
    const s = souffranceDe(ordre(), offre(), [], SOUFFRANCE_DEFAUT, LE_JOUR);
    expect(s!.jours).toBe(18);
    expect(s!.depuisUneTransition).toBe(false);
  });

  it("met en souffrance au-delà du délai de maison", () => {
    expect(souffranceDe(ordre(), offre(), [], { jours: 7, avantCloture: 3 }, LE_JOUR)!.pression).toBe("en-souffrance");
    expect(souffranceDe(ordre(), offre(), [], { jours: 30, avantCloture: 3 }, LE_JOUR)!.pression).toBe("calme");
  });

  it("la clôture prime, et même sur un ordre tout frais", () => {
    /* Ce qui presse n'est pas que nous ayons tardé, c'est que la porte se
       ferme : un ordre d'hier sur une ligne qui clôt demain passe devant un
       ordre de trois semaines sur une ligne de mars. */
    const frais = ordre({ createdAt: "2026-10-17T09:00:00Z" });
    const s = souffranceDe(frais, offre({ deadlineAt: "2026-10-19T12:00:00Z" }), [], SOUFFRANCE_DEFAUT, LE_JOUR);
    expect(s!.pression).toBe("cloture-proche");
    expect(s!.avantCloture).toBe(1);
  });

  it("ne donne pas de clôture à un fonds ni au secondaire : ils se traitent en continu", () => {
    for (const kind of ["FONDS", "MARCHE"] as const) {
      const s = souffranceDe(ordre(), offre({ kind, deadlineAt: "2026-10-19T12:00:00Z" }), [], SOUFFRANCE_DEFAUT, LE_JOUR);
      expect(s!.avantCloture).toBeUndefined();
      expect(s!.pression).toBe("en-souffrance");
    }
  });

  it("ignore une date sentinelle lointaine, qui n'est pas une clôture", () => {
    const s = souffranceDe(ordre(), offre({ deadlineAt: "2099-12-31T12:00:00Z" }), [], SOUFFRANCE_DEFAUT, LE_JOUR);
    expect(s!.avantCloture).toBeUndefined();
  });

  it("ne compte rien pour un ordre clos : il n'attend plus", () => {
    for (const state of ["servie", "non_servie", "reglee", "annulee"] as const) {
      expect(souffranceDe(ordre({ state }), offre(), [], SOUFFRANCE_DEFAUT, LE_JOUR)).toBeUndefined();
    }
  });

  it("remonte la dernière ligne du journal, même si elle ne nomme pas d'état", () => {
    const s = souffranceDe(ordre(), offre(), [evt("2026-09-30T10:00:00Z", "OA-0930 : <b>en attente d'ouverture de compte</b> (Toto, niveau 1)")], SOUFFRANCE_DEFAUT, LE_JOUR);
    expect(s!.dernierMot).toContain("en attente d'ouverture de compte");
    expect(s!.dernierMot).not.toContain("<b>");
  });
});
