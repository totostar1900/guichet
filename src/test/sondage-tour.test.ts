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

  /**
   * CE QUE LE ROBOT LAISSE, ET CE QUE LE CLIENT APPREND.
   *
   * RELEVÉ À LA REVUE DES ROBOTS du 26 octobre 2026. Deux manques, et ils ont
   * la même forme.
   *
   * LE REGISTRE : le desk qui clôt une attente à la main laisse
   * « sondage.statut » ; le robot ne laissait rien.
   *
   * LE CLIENT : le motif ÉTAIT DÉJÀ ÉCRIT POUR LUI — « Vous étiez prêt à partir
   * du… » — rangé en base, à la deuxième personne, et personne ne le lui
   * envoyait. Il attendait qu'il revienne le chercher. Rien n'était engagé,
   * c'est vrai ; mais une attente qui se ferme en silence est une attente qui
   * continue dans sa tête.
   */
  it("inscrit la clôture au registre, sous le nom de la porte humaine et au nom du robot", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDuSondage } = await import("@/lib/sondage/tour");
    const r = repo();

    const echue = await r.createLigneSondee({
      origine: "client",
      userId: "u-tour-registre",
      clientName: "Essai Registre",
      instrument: "OTA",
      country: "Cameroun",
      tenor: "5 ans",
      montant: 3_000_000,
      seanceLe: "2026-09-15",
    });

    await tourDuSondage(new Date("2026-10-26T06:40:00Z"));

    const lignes = await r.listAudit({ entity: "sondage", entityId: echue.id });
    expect(lignes, "la clôture d'une attente de client ne laisse rien au registre").toHaveLength(1);
    const [a] = lignes;
    expect(a.action).toBe("sondage.statut");
    expect((a.before as { state: string }).state).toBe("ouverte");
    expect((a.after as { state: string }).state).toBe("close");
    expect((a.after as { closedReason: string }).closedReason).toMatch(/Rien ne vous engageait/);
    /* LA MAIN EST CELLE DU ROBOT. Cette épreuve monte une session de desk :
       sans acteur explicite, le registre porterait « desk@example.com » et
       accuserait une personne d'un geste qu'elle n'a pas fait — pire que
       l'absence de ligne. */
    expect(a.actor).toMatch(/robot/i);
    expect(a.actor).not.toContain("@");
    expect(a.reason).toContain(echue.ref);
  });

  it("n'inscrit rien quand rien n'expire", async () => {
    // Non vacuité : un robot qui inscrirait à chaque tour passerait l'épreuve ci-dessus.
    const { repo } = await import("@/lib/data");
    const { tourDuSondage } = await import("@/lib/sondage/tour");
    const r = repo();

    const vivante = await r.createLigneSondee({
      origine: "client",
      userId: "u-tour-vivante",
      clientName: "Essai",
      instrument: "BTA",
      country: "Gabon",
      tenor: "13 semaines",
      montant: 4_000_000,
      seanceLe: "2099-01-01",
    });

    const t = await tourDuSondage(new Date("2026-10-26T06:40:00Z"));

    expect(await r.listAudit({ entity: "sondage", entityId: vivante.id })).toHaveLength(0);
    expect(t.vues).toBeGreaterThan(0);
  });

  it("dit la clôture au client, et se plaint au desk quand le message ne part pas", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDuSondage } = await import("@/lib/sondage/tour");
    const r = repo();

    /* CE QUI FAIT ÉCHOUER L'ENVOI ICI N'EST PAS LE SUJET, et il faut le dire :
       aucun fournisseur n'est posé en épreuve, donc TOUT envoi ressort
       « skipped ». Le sujet est ce qui se passe ensuite — l'écriture tient, et
       le desk l'apprend nommément. Qui est joignable et comment se juge au
       niveau du résolveur, et c'est « destinataire.test.ts » qui le tient. */
    const echue = await r.createLigneSondee({
      origine: "client",
      userId: "u-tour-injoignable",
      clientName: "Sans Canal",
      instrument: "OTA",
      country: "Tchad",
      tenor: "6 ans",
      montant: 7_000_000,
      seanceLe: "2026-09-20",
    });

    const t = await tourDuSondage(new Date("2026-10-26T06:40:00Z"));

    // L'ÉCRITURE PASSE D'ABORD : une attente dont la date est passée se ferme, canal ou pas.
    expect(t.closes).toContain(echue.ref);
    expect((await r.listLignesSondees({ userId: "u-tour-injoignable" })).find((x) => x.id === echue.id)!.state).toBe("close");
    const fil = (await r.listEvents(100)).map((e) => e.html).join("\n");
    expect(fil, "la clôture non annoncée est passée sous silence").toMatch(/clôture non annoncée au client/i);
    expect(fil).toContain(echue.ref);
  });

  it("ne cherche personne à prévenir pour une question de la maison", async () => {
    /* NON VACUITÉ DE L'ÉPREUVE CI-DESSUS, et une règle à part entière : une
       question posée par le desk n'a pas de destinataire, et se plaindre d'un
       canal injoignable sur chacune ferait un fil que personne ne lit. */
    const { repo } = await import("@/lib/data");
    const { tourDuSondage } = await import("@/lib/sondage/tour");
    const r = repo();

    const sienne = await r.createLigneSondee({
      origine: "desk",
      clientName: undefined,
      instrument: "OTA",
      country: "Congo",
      tenor: "9 ans",
      montant: 50_000_000,
      seanceLe: "2026-09-25",
    } as never);

    const t = await tourDuSondage(new Date("2026-10-26T06:40:00Z"));

    expect(t.closes).toContain(sienne.ref);
    const plaintes = (await r.listEvents(100)).filter((e) => /clôture non annoncée/i.test(e.html) && e.html.includes(sienne.ref));
    expect(plaintes, "la maison se plaint de ne pas avoir pu se prévenir elle-même").toEqual([]);
  });

  /**
   * LA FENÊTRE GOUVERNE QUAND IL Y EN A UNE — RELEVÉ LE 30 OCTOBRE 2026.
   *
   * Une ligne ne portait qu'un DÉBUT, et le robot la fermait le lendemain :
   * « prêt à partir du 18 novembre » devenait clos le 19. C'était la seule
   * lecture possible d'une date seule. Elle contredit maintenant ce que le
   * client écrit — « valable jusqu'au 31 décembre » veut dire qu'il reste
   * preneur six semaines de plus — et sans cette clause, le robot le
   * démentirait chaque soir sans que personne le voie.
   */
  it("laisse vivre une attente dont le début est passé mais la fenêtre ouverte", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDuSondage } = await import("@/lib/sondage/tour");
    const r = repo();

    const ouverte = await r.createLigneSondee({
      origine: "client",
      userId: "u-tour-fenetre",
      clientName: "Essai Fenêtre",
      instrument: "OTA",
      country: "Gabon",
      tenor: "5 ans",
      montant: 20_000_000,
      seanceLe: "2026-10-01",
      jusquA: "2026-12-31",
    });
    const fermee = await r.createLigneSondee({
      origine: "client",
      userId: "u-tour-fenetre",
      clientName: "Essai Fenêtre",
      instrument: "OTA",
      country: "Tchad",
      tenor: "5 ans",
      montant: 20_000_000,
      seanceLe: "2026-10-01",
      jusquA: "2026-10-20",
    });

    const t = await tourDuSondage(new Date("2026-10-26T06:40:00Z"));

    expect(t.closes, "une attente dont la fenêtre court encore a été close par son début").not.toContain(ouverte.ref);
    expect(t.closes, "une attente dont la fenêtre est fermée court toujours").toContain(fermee.ref);

    const apres = (await r.listLignesSondees({ userId: "u-tour-fenetre" })).find((x) => x.id === fermee.id)!;
    /* LE MOTIF DIT LA FIN, ET NON LE DÉBUT : écrit « vous étiez prêt à partir
       du 1er octobre », il nommerait une date que le client a lui-même
       dépassée exprès, et le motif passerait pour une erreur. */
    expect(apres.closedReason, "le motif nomme le début au lieu de la fin").toMatch(/valable jusqu'au/i);
    expect(apres.closedReason, "la fin n'est pas nommée").toMatch(/20 oct/);
    expect(apres.closedReason, "le vocabulaire de l'échec n'a rien à faire ici").not.toMatch(/échou|raté|erreur|refus/i);
  });
});
