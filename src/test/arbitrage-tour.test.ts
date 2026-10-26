import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * LE ROBOT QUI REND LA MAIN, DE BOUT EN BOUT, SUR LE DÉPÔT EN MÉMOIRE.
 *
 * Les règles sont déjà tenues par « arbitrage.test.ts » ; ce qu'on mesure ici
 * est ce qui se passe AUTOUR d'elles, et que le domaine ne peut pas voir :
 * clore le bon ordre, ne pas toucher aux autres, écrire le motif que le client
 * lit, et ne rien faire deux fois.
 *
 * POURQUOI CE TOUR MÉRITE UNE ÉPREUVE À LUI. Son silence est la panne la plus
 * confortable de toute l'application : un robot d'expiration qui ne tourne pas
 * ne casse rien de visible. Les paires restent armées, et le client continue de
 * lire « armé, rien n'a bougé » — mot pour mot ce qu'il lirait si tout allait
 * bien. La date limite qu'il a signée serait alors un chiffre sur un
 * formulaire, et la protection une phrase.
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

describe("le tour des arbitrages armés", () => {
  it("éteint la paire dont la date est passée, et rend la position intacte en toutes lettres", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDesArbitrages } = await import("@/lib/arbitrage/tour");
    const r = repo();

    const arme = await r.createIntent({
      offerId: "fcp-monetaire",
      type: "rachat",
      amount: 10,
      channel: "E-mail",
      clientId: "u-essai-arbitrage",
      clientName: "Essai Arbitrage",
      clientSegment: "Personne physique",
      switchToOfferId: "fcp-obligataire",
      switchFloor: 400_000,
      switchBy: "2026-10-20",
    });
    expect(arme.switchBy, "le dépôt n'a pas gardé la borne : le tour n'aurait rien à éteindre").toBe("2026-10-20");

    const t = await tourDesArbitrages(new Date("2026-10-26T19:00:00Z"));
    expect(t.eteints, "la paire échue n'a pas été éteinte").toContain(arme.ref);
    expect(t.refus, "une expiration a échoué en silence").toEqual([]);

    const apres = (await r.listIntents()).find((x) => x.id === arme.id)!;
    expect(apres.state).toBe("annulee");
    /* LES MOTS SONT LA FONCTIONNALITÉ. Un client qui lit « échoué » conclut
       que la maison s'est trompée et n'en reposera jamais. */
    expect(apres.closedReason).toMatch(/position est intacte/);
    expect(apres.closedReason).toMatch(/protection qui a joué/);
    expect(apres.closedReason, "le motif tait la ligne d'arrivée, qui est la moitié de l'explication").toMatch(/FCP Obligations CEMAC/i);
    expect(apres.closedReason, "le motif tait le plancher signé").toMatch(/400\s?000/);
    expect(apres.closedReason, "le vocabulaire de l'échec n'a rien à faire dans ce motif").not.toMatch(/échou|raté|erreur/i);
  });

  it("ne touche pas à une paire dont la date est devant, ni à un ordre sans arbitrage", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDesArbitrages } = await import("@/lib/arbitrage/tour");
    const r = repo();

    const vivante = await r.createIntent({
      offerId: "fcp-monetaire",
      type: "rachat",
      amount: 10,
      channel: "E-mail",
      clientId: "u-essai-arbitrage-2",
      clientName: "Essai Arbitrage",
      clientSegment: "Personne physique",
      switchToOfferId: "fcp-obligataire",
      switchFloor: 400_000,
      switchBy: "2026-12-31",
    });
    const ordinaire = await r.createIntent({
      offerId: "fcp-monetaire",
      type: "rachat",
      amount: 5,
      channel: "E-mail",
      clientId: "u-essai-arbitrage-2",
      clientName: "Essai Arbitrage",
      clientSegment: "Personne physique",
    });

    const t = await tourDesArbitrages(new Date("2026-10-26T19:00:00Z"));
    expect(t.eteints).not.toContain(vivante.ref);
    expect(t.eteints).not.toContain(ordinaire.ref);
    const lues = await r.listIntents();
    expect(lues.find((x) => x.id === vivante.id)!.state).toBe("recue");
    expect(lues.find((x) => x.id === ordinaire.id)!.state).toBe("recue");
    /* NON VACUITÉ : le tour doit avoir REGARDÉ des paires. Un relevé qui n'en
       voit aucune rendrait « rien éteint » et passerait au vert en ne faisant
       rien — la panne que cette feuille existe pour fermer. */
    expect(t.vues, "le tour ne voit plus aucune paire armée : il est aveugle").toBeGreaterThan(0);
  });

  it("ne rejoue pas une paire déjà éteinte", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDesArbitrages } = await import("@/lib/arbitrage/tour");
    const r = repo();

    const arme = await r.createIntent({
      offerId: "fcp-monetaire",
      type: "rachat",
      amount: 10,
      channel: "E-mail",
      clientId: "u-essai-arbitrage-3",
      clientName: "Essai Arbitrage",
      clientSegment: "Personne physique",
      switchToOfferId: "fcp-obligataire",
      switchFloor: 400_000,
      switchBy: "2026-10-20",
    });
    const premier = await tourDesArbitrages(new Date("2026-10-26T19:00:00Z"));
    expect(premier.eteints).toContain(arme.ref);
    const second = await tourDesArbitrages(new Date("2026-10-27T19:00:00Z"));
    expect(second.eteints, "un ordre clos est reclos chaque soir : une ligne de journal par jour et par arbitrage passé").not.toContain(arme.ref);
  });

  /**
   * CE QUE LE ROBOT LAISSE AU REGISTRE.
   *
   * RELEVÉ À LA REVUE DES ROBOTS du 26 octobre 2026 : aucun des dix-sept robots
   * n'appelait `audit()`. Ici, le robot FERME L'ORDRE D'UN CLIENT, et le desk
   * qui fait la même chose à la main laisse « intent.transition » depuis
   * toujours. Le même événement tracé par une porte et pas par l'autre est la
   * pire des deux situations : le registre paraît complet, et la question
   * « pourquoi mon ordre a-t-il été annulé » n'a pas de réponse consignée.
   */
  it("inscrit l'extinction au registre, sous le nom de la porte humaine et au nom du robot", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDesArbitrages } = await import("@/lib/arbitrage/tour");
    const r = repo();

    const arme = await r.createIntent({
      offerId: "fcp-monetaire",
      type: "rachat",
      amount: 10,
      channel: "E-mail",
      clientId: "u-essai-arbitrage-4",
      clientName: "Essai Arbitrage",
      clientSegment: "Personne physique",
      switchToOfferId: "fcp-obligataire",
      switchFloor: 400_000,
      switchBy: "2026-10-20",
    });

    await tourDesArbitrages(new Date("2026-10-26T19:00:00Z"));

    const lignes = await r.listAudit({ entity: "intent", entityId: arme.id });
    expect(lignes, "l'extinction d'un ordre de client ne laisse rien au registre").toHaveLength(1);
    const [a] = lignes;
    /* LE MÊME NOM QUE LA PORTE HUMAINE : un desk qui cherche « qui a annulé cet
       ordre » filtre une action, pas deux. */
    expect(a.action).toBe("intent.transition");
    expect((a.before as { state: string }).state).toBe("recue");
    expect((a.after as { state: string }).state).toBe("annulee");
    // Le motif que le client lit voyage avec la ligne.
    expect((a.after as { closedReason: string }).closedReason).toMatch(/protection qui a joué/);
    /* LA MAIN EST CELLE DU ROBOT, et c'est l'assertion qui compte le plus ici :
       cette épreuve monte une session de desk, donc une ligne sans acteur
       explicite porterait « desk@example.com ». Le registre accuserait une
       personne d'un geste qu'elle n'a pas fait, ce qui est pire que l'absence
       de ligne. */
    expect(a.actor).toMatch(/robot/i);
    expect(a.actor).not.toContain("@");
    expect(a.reason).toContain(arme.ref);
  });

  it("n'inscrit rien quand rien n'expire", async () => {
    // Non vacuité : un robot qui inscrirait à chaque tour passerait l'épreuve ci-dessus.
    const { repo } = await import("@/lib/data");
    const { tourDesArbitrages } = await import("@/lib/arbitrage/tour");
    const r = repo();

    const vivante = await r.createIntent({
      offerId: "fcp-monetaire",
      type: "rachat",
      amount: 10,
      channel: "E-mail",
      clientId: "u-essai-arbitrage-5",
      clientName: "Essai Arbitrage",
      clientSegment: "Personne physique",
      switchToOfferId: "fcp-obligataire",
      switchFloor: 400_000,
      switchBy: "2026-12-31",
    });

    const t = await tourDesArbitrages(new Date("2026-10-26T19:00:00Z"));

    expect(await r.listAudit({ entity: "intent", entityId: vivante.id })).toHaveLength(0);
    // Et le tour a bien regardé : sinon « rien inscrit » ne dit rien.
    expect(t.vues).toBeGreaterThan(0);
  });
});
