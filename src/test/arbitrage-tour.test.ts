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

  /**
   * CE QUE LE CLIENT APPREND, ET CE QUE LE DESK APPREND QU'IL N'A PAS APPRIS.
   *
   * RELEVÉ À LA REVUE DES ROBOTS du 26 octobre 2026. Le message portait tout le
   * sens de ce tour et vivait sur une ligne à deux silences :
   * `if (offer) await notifyIntentUpdated(...).catch(() => {})`.
   *
   * POURQUOI C'EST LE MESSAGE QUI COMPTE ICI. L'extinction n'est pas un fait
   * visible : le client lisait « armé, rien n'a bougé » et lit ensuite « clos,
   * rien n'a bougé ». Sans le mot, la seule différence entre la protection qui
   * a joué et une maison qui a oublié son ordre est une ligne d'état qu'il faut
   * aller chercher.
   *
   * ET LE PANNEAU « ENVOIS EN ÉCHEC » NE LE RATTRAPAIT PAS : il lit les lignes
   * du registre des notifications, et dans les deux cas de ce silence — pas
   * d'offre, pas de contact — AUCUNE ligne n'est créée. Il n'y avait rien à
   * voir nulle part.
   */
  it("prévient le client de l'extinction", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDesArbitrages } = await import("@/lib/arbitrage/tour");
    const r = repo();

    /* NOTIFY_DEMO est le mode que la maison a posé pour cela : sans
       fournisseur, tout envoi ressort « skipped », et aucun chemin heureux ne
       serait parcourable en épreuve. */
    process.env.NOTIFY_DEMO = "1";
    try {
      const arme = await r.createIntent({
        offerId: "fcp-monetaire",
        type: "rachat",
        amount: 10,
        channel: "E-mail",
        contactEmail: "client@exemple.com",
        clientId: "u-essai-arbitrage-6",
        clientName: "Essai Arbitrage",
        clientSegment: "Personne physique",
        switchToOfferId: "fcp-obligataire",
        switchFloor: 400_000,
        switchBy: "2026-10-20",
      });

      const t = await tourDesArbitrages(new Date("2026-10-26T19:00:00Z"));

      expect(t.eteints).toContain(arme.ref);
      expect(t.muets, "le client n'a pas été prévenu, et le tour le passe sous silence").toEqual([]);
      const avis = (await r.listNotifications(200)).filter((n) => n.intentId === arme.id);
      expect(avis.length, "aucun avis n'a été composé pour cette extinction").toBeGreaterThan(0);
      expect(avis.some((n) => n.status === "sent")).toBe(true);
    } finally {
      delete process.env.NOTIFY_DEMO;
    }
  });

  it("dit nommément l'extinction d'un client qu'aucun canal ne joint, et ne la défait pas", async () => {
    /* LE PREMIER DES DEUX CHEMINS, et le plus grave : aucun contact sur
       l'ordre. `notifyIntentUpdated` rendait `void` sur un `if (!c) return`,
       donc AUCUNE ligne n'entre au registre des notifications — le panneau
       « Envois en échec » de la page Santé, qui lit ces lignes, ne rattrapait
       rien. Il n'y avait rien à voir nulle part. */
    const { repo } = await import("@/lib/data");
    const { tourDesArbitrages } = await import("@/lib/arbitrage/tour");
    const r = repo();

    const arme = await r.createIntent({
      offerId: "fcp-monetaire",
      type: "rachat",
      amount: 10,
      channel: "E-mail",
      clientId: "u-essai-arbitrage-7-sans-canal",
      clientName: "Essai Sans Canal",
      clientSegment: "Personne physique",
      switchToOfferId: "fcp-obligataire",
      switchFloor: 400_000,
      switchBy: "2026-10-20",
    });

    const t = await tourDesArbitrages(new Date("2026-10-26T19:00:00Z"));

    /* L'EXTINCTION A LIEU, et elle est inscrite : il ne manque que le mot. Une
       borne que le client a signée doit jouer à la date dite, même si son canal
       est cassé — le laisser armé serait lui retirer la protection pour
       laquelle il a écrit cette date. */
    expect(t.eteints).toContain(arme.ref);
    expect((await r.listIntents()).find((x) => x.id === arme.id)!.state).toBe("annulee");
    expect(await r.listAudit({ entity: "intent", entityId: arme.id })).toHaveLength(1);
    /* ET CE N'EST PAS UN « REFUS » : un refus est une paire qu'on n'a pas su
       clore, que le tour suivant réessaie. Les confondre ferait chercher au
       desk une clôture à refaire là où il n'y a qu'un téléphone à décrocher. */
    expect(t.refus.map((x) => x.ref)).not.toContain(arme.ref);
    expect(t.muets.map((x) => x.ref)).toContain(arme.ref);
    expect(t.muets.find((x) => x.ref === arme.ref)!.raison).toMatch(/contact/i);
    const fil = (await r.listEvents(100)).map((e) => e.html).join("\n");
    expect(fil, "l'extinction non annoncée est passée sous silence").toMatch(/extinction non annoncée au client/i);
    expect(fil).toContain(arme.ref);
    // Et c'est bien le trou sans ligne d'envoi : sinon le panneau des échecs suffirait.
    expect((await r.listNotifications(200)).filter((n) => n.intentId === arme.id), "une ligne d'envoi existe : l'épreuve ne mesure plus le trou qu'elle nomme").toEqual([]);
  });

  it("dit aussi l'extinction que le fournisseur a refusée, avec le canal et son motif", async () => {
    /* LE SECOND CHEMIN : le contact est là, le message est composé, et le canal
       n'aboutit pas. C'est l'état par défaut en épreuve — aucun fournisseur
       n'est posé, donc tout ressort « skipped » — et c'est ce que
       `.catch(() => {})` avalait avec le reste. Ici une ligne ENTRE au
       registre des notifications, et la raison doit la nommer : « e-mail :
       skipped » se répare autrement qu'un client sans coordonnées. */
    const { repo } = await import("@/lib/data");
    const { tourDesArbitrages } = await import("@/lib/arbitrage/tour");
    const r = repo();

    const arme = await r.createIntent({
      offerId: "fcp-monetaire",
      type: "rachat",
      amount: 10,
      channel: "E-mail",
      contactEmail: "refuse@exemple.com",
      clientId: "u-essai-arbitrage-8",
      clientName: "Essai Refusé",
      clientSegment: "Personne physique",
      switchToOfferId: "fcp-obligataire",
      switchFloor: 400_000,
      switchBy: "2026-10-20",
    });

    const t = await tourDesArbitrages(new Date("2026-10-26T19:00:00Z"));

    expect(t.eteints).toContain(arme.ref);
    expect(t.muets.map((x) => x.ref)).toContain(arme.ref);
    const raison = t.muets.find((x) => x.ref === arme.ref)!.raison;
    expect(raison, "la raison ne nomme pas le canal : « non annoncé » sans canal ne se répare pas").toMatch(/email|e-mail/i);
    expect(raison).not.toMatch(/aucun contact/i);
    // La ligne existe bel et bien : les deux chemins sont distincts, et le relevé le voit.
    expect((await r.listNotifications(200)).filter((n) => n.intentId === arme.id).length).toBeGreaterThan(0);
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
