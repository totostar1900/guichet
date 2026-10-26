import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * LE ROBOT DU SONDAGE, DE BOUT EN BOUT, SUR LE DÉPÔT EN MÉMOIRE.
 *
 * Les règles sont tenues par « sondage.test.ts ». Ce qu'on mesure ici est ce
 * qui se passe autour d'elles : clore la bonne attente, ne pas toucher aux
 * autres, écrire le motif que le client lit, et ne rien faire deux fois.
 *
 * ET L'ORDRE DES DEUX MOITIÉS, qui est la seule chose de ce tour qu'on ne peut
 * pas deviner : les clôtures passent AVANT la mesure du seuil. Deux cents
 * millions dont la moitié vient d'expirer ne sont pas deux cents millions, et
 * une maison qui porterait cela à un Trésor y perdrait le crédit qu'elle a mis
 * des mois à prendre.
 */
const desk: Session = { userId: "u-desk", role: "desk", name: "Desk Test", email: "desk@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };

vi.mock("@/lib/auth", () => ({
  getSession: async () => desk,
  requireSession: async () => desk,
  requireDesk: async () => desk,
  requireResponsable: async () => desk,
  authMode: () => "dev",
}));
vi.mock("next/cache", () => FAUX_NEXT_CACHE);

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

describe("le tour du sondage", () => {
  it("clôt l'attente dont la date est passée, et rend la main en toutes lettres", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDuSondage } = await import("@/lib/sondage/tour");
    const r = repo();

    const echue = await r.createLigneSondee({
      origine: "client",
      userId: "u-tour-1",
      clientName: "Essai Tour",
      instrument: "OTA",
      country: "Cameroun",
      tenor: "4 ans",
      montant: 10_000_000,
      seanceLe: "2026-10-01",
    });

    const t = await tourDuSondage(new Date("2026-10-26T06:40:00Z"));
    expect(t.closes, "l'attente échue n'a pas été close").toContain(echue.ref);
    expect(t.refus, "une clôture a échoué en silence").toEqual([]);

    const apres = (await r.listLignesSondees({ userId: "u-tour-1" })).find((x) => x.id === echue.id)!;
    expect(apres.state).toBe("close");
    /* LES MOTS SONT LA FONCTIONNALITÉ : rien n'engageait le client, et le
       motif doit le lui redire — sinon il lit un refus. */
    expect(apres.closedReason).toMatch(/Rien ne vous engageait/);
    expect(apres.closedReason, "le motif tait la date, qui est la raison").toMatch(/1 oct/);
    expect(apres.closedReason, "le vocabulaire de l'échec n'a rien à faire ici").not.toMatch(/échou|raté|erreur|refus/i);
  });

  it("ne touche pas à une attente dont la date est devant", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDuSondage } = await import("@/lib/sondage/tour");
    const r = repo();
    const vivante = await r.createLigneSondee({
      origine: "client",
      userId: "u-tour-2",
      clientName: "Essai Tour",
      instrument: "BTA",
      country: "Gabon",
      tenor: "26 semaines",
      montant: 5_000_000,
      seanceLe: "2099-01-01",
    });
    const t = await tourDuSondage(new Date("2026-10-26T06:40:00Z"));
    expect(t.closes).not.toContain(vivante.ref);
    expect((await r.listLignesSondees({ userId: "u-tour-2" })).find((x) => x.id === vivante.id)!.state).toBe("ouverte");
    /* NON VACUITÉ : le tour doit avoir REGARDÉ des attentes. Un relevé qui n'en
       voit aucune rend « rien clos » et passe au vert en ne faisant rien. */
    expect(t.vues, "le tour ne voit plus aucune attente : il est aveugle").toBeGreaterThan(0);
  });

  it("inscrit au journal ce qui franchit le seuil, et seulement cela", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDuSondage } = await import("@/lib/sondage/tour");
    const { SEUIL_CLIENTS, SEUIL_MONTANT } = await import("@/lib/domain/sondage");
    const r = repo();

    /* Le jeu d'essai porte déjà un consensus mûr : on en ajoute un SOUS le
       seuil et l'on vérifie qu'il n'est pas annoncé. */
    await r.createLigneSondee({ origine: "client", userId: "u-tour-3", clientName: "Petit", instrument: "OTA", country: "Tchad", tenor: "2 ans", montant: 1_000_000, dansJours: 90 });

    const t = await tourDuSondage(new Date("2026-10-26T06:40:00Z"));
    expect(t.mures.length, "aucune demande mûre : le jeu d'essai devait en porter une").toBeGreaterThan(0);
    for (const m of t.mures) {
      expect(m.montant, "une demande sous le seuil a été annoncée comme mûre").toBeGreaterThanOrEqual(SEUIL_MONTANT);
      expect(m.clients).toBeGreaterThanOrEqual(SEUIL_CLIENTS);
    }
    expect(t.mures.some((m) => m.ligne.includes("Tchad")), "la petite demande a été annoncée").toBe(false);
  });

  /**
   * L'ORDRE DES DEUX MOITIÉS, ET C'EST LE SEUL ENDROIT OÙ IL SE VOIT.
   *
   * Une demande mûre dont une part expire ce matin ne doit PAS être annoncée :
   * la maison porterait au Trésor des francs déjà partis ailleurs. Mesurer le
   * seuil avant de clore donnerait exactement cela, et personne ne le verrait
   * — le chiffre serait plausible.
   */
  it("mesure le seuil APRÈS les clôtures, et non avant", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDuSondage } = await import("@/lib/sondage/tour");
    const r = repo();

    const commun = { origine: "client" as const, instrument: "OTA" as const, country: "Congo" as const, tenor: "7 ans", montant: 60_000_000 };
    // Trois clients, cent quatre-vingts millions : mûr… si l'un d'eux ne partait pas.
    await r.createLigneSondee({ ...commun, userId: "u-ordre-1", clientName: "A", dansJours: 120 });
    await r.createLigneSondee({ ...commun, userId: "u-ordre-2", clientName: "B", dansJours: 120 });
    const echue = await r.createLigneSondee({ ...commun, userId: "u-ordre-3", clientName: "C", seanceLe: "2026-10-02" });

    const t = await tourDuSondage(new Date("2026-10-26T06:40:00Z"));
    expect(t.closes).toContain(echue.ref);
    const congo = t.mures.find((m) => m.ligne.includes("Congo"));
    expect(congo, "la demande congolaise a été portée avec un tiers déjà expiré").toBeFalsy();
  });

  it("ne reclôt pas chaque matin ce qui est déjà clos", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDuSondage } = await import("@/lib/sondage/tour");
    const r = repo();
    const echue = await r.createLigneSondee({ origine: "client", userId: "u-tour-4", clientName: "Essai", instrument: "OTA", country: "RCA", tenor: "3 ans", montant: 2_000_000, seanceLe: "2026-09-01" });
    const premier = await tourDuSondage(new Date("2026-10-26T06:40:00Z"));
    expect(premier.closes).toContain(echue.ref);
    const second = await tourDuSondage(new Date("2026-10-27T06:40:00Z"));
    expect(second.closes, "une attente close est reclose chaque matin : une ligne de journal par jour et par attente passée").not.toContain(echue.ref);
  });
});
