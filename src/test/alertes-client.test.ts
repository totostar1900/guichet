import { describe, expect, it } from "vitest";
import { alertesDe, banquePuisArgent, banquesPartagees, clefsPartagees, FENETRE_ENCHAINEMENT_H } from "@/lib/domain/alertes-client";
import type { ActionClient } from "@/lib/domain/journal-client";
import type { ClientFile } from "@/lib/domain/kyc";
import type { TrustedDevice } from "@/lib/domain/types";

/**
 * UNE ALERTE NAÎT D'UN ENCHAÎNEMENT, PAS D'UN SCORE.
 *
 * La phrase que la maquette du 10 octobre 2026 porte sous la section
 * « Alertes » de la fiche client. Un score élevé n'alerte de rien : il dit un
 * état. Ce qui appelle le regard d'une personne, ce sont deux faits qui se
 * suivent, et une alerte doit nommer les deux ET leur écart dans le temps.
 */
const nomDe = (id: string) => ({ "u-2": "Pharma Mfoundi SA", "u-3": "L. N." })[id] ?? id;
const phraseDe = (g: string) => ({ "securite.banque.changee": "a modifié son compte bancaire", "mandat.signe": "a signé un mandat" })[g] ?? g;

const geste = (at: string, g: string): ActionClient => ({ id: at + g, at, userId: "u-1", geste: g, genre: "securite" }) as ActionClient;
const appareil = (userId: string, credentialId: string, name = "Chrome sur Windows"): TrustedDevice =>
  ({ id: `${userId}-${credentialId}`, userId, kind: "passkey", name, credentialId, failures: 0, createdAt: "2026-10-08T13:58:00Z" }) as TrustedDevice;
const dossier = (userId: string, compte?: string): ClientFile => ({ id: `f-${userId}`, userId, funds: compte ? { bankAccount: compte, pep: false } : { pep: false } }) as unknown as ClientFile;

describe("la même clef sur deux comptes", () => {
  it("se dit, et nomme l'autre compte", () => {
    const a = clefsPartagees("u-1", [appareil("u-1", "CRED-A"), appareil("u-3", "CRED-A")], nomDe);
    expect(a).toHaveLength(1);
    expect(a[0].detail).toContain("L. N.");
    expect(a[0].avec).toBe("u-3");
  });

  it("deux clefs différentes ne sont pas un partage", () => {
    expect(clefsPartagees("u-1", [appareil("u-1", "CRED-A"), appareil("u-3", "CRED-B")], nomDe)).toEqual([]);
  });

  it("et un appareil sans clef ne prouve rien", () => {
    /* Un code sur un appareil ne porte pas d'identifiant partageable : sans
       credentialId il n'y a pas de clef, donc pas de partage à constater. */
    const sansClef = { ...appareil("u-1", ""), credentialId: undefined } as TrustedDevice;
    expect(clefsPartagees("u-1", [sansClef, appareil("u-3", "CRED-A")], nomDe)).toEqual([]);
  });
});

describe("le même compte bancaire sur deux dossiers", () => {
  it("se dit, et ne montre que les quatre derniers chiffres", () => {
    /* Un numéro de compte entier n'a aucune raison de paraître dans une
       alerte : quatre chiffres suffisent à le reconnaître. */
    const a = banquesPartagees("u-1", [dossier("u-1", "CM21 1000 4412"), dossier("u-2", "CM21 1000 4412")], nomDe);
    expect(a).toHaveLength(1);
    expect(a[0].detail).toContain("4412");
    expect(a[0].detail, "jamais le numéro entier").not.toContain("CM21");
    expect(a[0].detail).toContain("Pharma Mfoundi SA");
  });

  it("les espaces ne font pas deux comptes différents", () => {
    expect(banquesPartagees("u-1", [dossier("u-1", "CM2110004412"), dossier("u-2", "CM21 1000 4412")], nomDe)).toHaveLength(1);
  });

  it("et un dossier sans banque n'alerte de rien", () => {
    expect(banquesPartagees("u-1", [dossier("u-1"), dossier("u-2", "CM21 1000 4412")], nomDe)).toEqual([]);
  });
});

describe("un changement de banque suivi de près d'un geste d'argent", () => {
  it("l'enchaînement est le fait, et l'écart se dit en minutes", () => {
    const a = banquePuisArgent([geste("2026-10-08T14:06:00Z", "securite.banque.changee"), geste("2026-10-08T14:46:00Z", "mandat.signe")], phraseDe);
    expect(a).toHaveLength(1);
    expect(a[0].detail).toContain("40 minute(s)");
    expect(a[0].detail, "les deux gestes sont nommés").toContain("a modifié son compte bancaire");
    expect(a[0].detail).toContain("a signé un mandat");
  });

  it("au-delà de la fenêtre, ce sont deux gestes étrangers", () => {
    /* Changer de banque est ordinaire ; demander un mouvement dans l'heure
       qui suit l'est moins. Trois jours plus tard, ce n'est plus un
       enchaînement, et le dire serait crier au loup. */
    expect(FENETRE_ENCHAINEMENT_H).toBe(2);
    expect(banquePuisArgent([geste("2026-10-08T14:06:00Z", "securite.banque.changee"), geste("2026-10-11T09:00:00Z", "mandat.signe")], phraseDe)).toEqual([]);
  });

  it("un geste d'argent AVANT le changement n'est pas l'enchaînement", () => {
    /* L'ordre compte : c'est le changement QUI PRÉCÈDE le mouvement qui
       inquiète, l'inverse est une journée ordinaire. */
    expect(banquePuisArgent([geste("2026-10-08T10:00:00Z", "mandat.signe"), geste("2026-10-08T14:06:00Z", "securite.banque.changee")], phraseDe)).toEqual([]);
  });

  it("et une consultation n'est pas un geste d'argent", () => {
    expect(banquePuisArgent([geste("2026-10-08T14:06:00Z", "securite.banque.changee"), geste("2026-10-08T14:10:00Z", "vu.fiche")], phraseDe)).toEqual([]);
  });
});

describe("toutes les alertes ensemble", () => {
  it("la plus grave d'abord, parce qu'on lit la première", () => {
    const a = alertesDe({
      userId: "u-1",
      gestes: [geste("2026-10-08T14:06:00Z", "securite.banque.changee"), geste("2026-10-08T14:46:00Z", "mandat.signe")],
      appareils: [appareil("u-1", "CRED-A"), appareil("u-3", "CRED-A")],
      dossiers: [dossier("u-1", "CM21 1000 4412"), dossier("u-2", "CM21 1000 4412")],
      nomDe,
      phraseDe,
    });
    expect(a.map((x) => x.genre)).toEqual(["banque_puis_argent", "banque_partagee", "clef_partagee"]);
  });

  it("un client ordinaire n'a aucune alerte", () => {
    /* Une section d'alertes qui en trouve toujours une ne sert plus à rien. */
    expect(alertesDe({ userId: "u-1", gestes: [geste("2026-10-08T14:06:00Z", "vu.fiche")], appareils: [appareil("u-1", "CRED-A")], dossiers: [dossier("u-1", "CM21 1000 9999")], nomDe, phraseDe })).toEqual([]);
  });
});
