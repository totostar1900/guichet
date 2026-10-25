import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * LE TOUR DU ROBOT, DE BOUT EN BOUT, SUR LE DÉPÔT EN MÉMOIRE.
 *
 * Les règles du domaine sont déjà tenues par « relance.test.ts » ; ce qu'on
 * mesure ici est tout ce qui se passe AUTOUR d'elles, et que le domaine ne
 * peut pas voir : constater sans rouvrir ce qui existe, clore ce que le
 * client a fini, et ne pas avancer le compteur quand rien n'est parti.
 *
 * ON COMPTE PAR CLIENT, JAMAIS LE TOTAL DU TOUR. Le jeu d'essai porte ses
 * propres ordres en attente de signature, donc le tour envoie aussi pour
 * d'autres : un essai qui attendrait « un seul envoi » mesurerait la taille
 * du jeu d'essai plutôt que la règle.
 *
 * NOTIFY_DEMO FAIT RÉPONDRE LES CANAUX. Sans fournisseur, une notification
 * reste « skipped », donc aucun rappel ne partirait jamais et le tour
 * passerait au vert en ne faisant rien — exactement la panne muette que ce
 * genre d'essai doit fermer.
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
  process.env.NOTIFY_DEMO = "1";
});

describe("le tour des procédures laissées en route", () => {
  it("constate, rappelle cinq fois, puis se tait — et clôt quand c'est signé", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDesRelances } = await import("@/lib/relances/tour");
    const r = repo();
    const sien = async (id: string) => (await r.listRelances({ userId: id })).find((x) => x.sujet === "mandat");

    /* UN CONTACT QUI N'ATTEND RIEN D'AUTRE. Le jeu d'essai porte des ordres
       à signer, et la signature passe AVANT le mandat : prendre un client
       qui en a un mesurerait la règle de priorité au lieu de la cadence.
       Celle-ci a son propre essai, plus bas. */
    await tourDesRelances("2026-09-30");
    const occupes = new Set((await r.listRelances({ state: "en_cours" })).map((x) => x.userId));
    const qui = (await r.listContacts()).find((c) => c.phone && c.email && c.whatsappOptIn && !occupes.has(c.id))!;
    expect(qui, "le jeu d'essai doit porter un contact joignable et sans devoir").toBeTruthy();
    const m = await r.createMandat({ userId: qui.id, objet: "provision", bankName: "BGFI", bankAccount: "CM0000000001", accountHolder: qui.name, amount: 500_000 });

    // Le jour du constat, rien ne part : le premier rappel est au lendemain.
    await tourDesRelances("2026-10-01");
    expect((await sien(qui.id))?.envois).toBe(0);

    const t2 = await tourDesRelances("2026-10-02");
    expect((await sien(qui.id))?.envois).toBe(1);
    expect((await sien(qui.id))?.dernierOn).toBe("2026-10-02");
    // Rien n'est rouvert au second passage : le compteur ne repart pas de zéro.
    expect(t2.ouvertes).toBe(0);

    // Deux tours le même jour ne font pas deux messages.
    await tourDesRelances("2026-10-02");
    expect((await sien(qui.id))?.envois).toBe(1);

    // Cinq rappels au plus, puis la série s'épuise et reste épuisée.
    for (const j of ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"]) await tourDesRelances(j);
    expect((await sien(qui.id))?.envois).toBe(5);
    await tourDesRelances("2026-10-08");
    expect((await sien(qui.id))?.envois).toBe(5);

    /* LE DEVOIR DISPARAÎT, LA LIGNE SE CLÔT. Le mandat signé n'attend plus
       rien, et le robot doit s'en apercevoir sans qu'on le lui dise. */
    await r.updateMandat(m.id, { signedAt: new Date().toISOString(), signedMethod: "code" });
    const t9 = await tourDesRelances("2026-10-09");
    expect(t9.closes).toBeGreaterThanOrEqual(1);
    expect((await sien(qui.id))?.state).toBe("faite");
  });

  it("se tait pour de bon quand le client a écarté, et le devoir reste ouvert", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDesRelances } = await import("@/lib/relances/tour");
    const r = repo();

    /* Un contact que rien n'occupe encore : les essais de ce fichier
       partagent le même dépôt en mémoire, et reprendre celui du précédent
       hériterait de ses cinq rappels. */
    await tourDesRelances("2026-10-31");
    const occupes = new Set((await r.listRelances()).map((x) => x.userId));
    const qui = (await r.listContacts()).find((c) => c.phone && c.email && c.whatsappOptIn && !occupes.has(c.id))!;
    expect(qui, "le jeu d'essai doit porter un second contact joignable et libre").toBeTruthy();
    await r.createMandat({ userId: qui.id, objet: "provision", bankName: "BGFI", bankAccount: "GA0000000002", accountHolder: qui.name, amount: 300_000 });

    await tourDesRelances("2026-11-01");
    const avant = (await r.listRelances({ userId: qui.id })).find((x) => x.sujet === "mandat")!;
    await r.majRelance(avant.id, { state: "ecartee" });

    for (const j of ["2026-11-02", "2026-11-03", "2026-11-04"]) await tourDesRelances(j);
    const apres = (await r.listRelances({ userId: qui.id })).find((x) => x.sujet === "mandat")!;
    expect(apres.state).toBe("ecartee");
    expect(apres.envois).toBe(0);
    /* ET LE DEVOIR RESTE OUVERT : écarter un rappel n'annule rien. Le mandat
       est toujours là, non signé, visible dans l'espace du client. C'est la
       promesse que ce lot ne doit jamais casser. */
    expect((await r.listMandats(qui.id)).some((x) => !x.signedAt && x.state === "actif")).toBe(true);
  });

  /* UN SEUL MESSAGE PAR JOUR ET PAR CLIENT. La règle qui empêche un dossier
     chargé de produire quatre WhatsApp le même matin, mesurée ici bout à
     bout : le mandat ne parle pas tant que le bulletin attend. */
  it("ne laisse parler qu'un devoir par client, le plus bloquant", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDesRelances } = await import("@/lib/relances/tour");
    const r = repo();

    /* UN CLIENT NEUF, et non un du jeu d'essai : ouvrir un dossier crée son
       contact s'il n'en a pas, donc cet essai ne dépend d'aucune donnée
       livrée et ne se dispute pas les contacts avec les précédents. */
    const qui = { id: "u-deux-devoirs", name: "Marie Nkoa", email: "marie.nkoa@example.com" };

    /* Deux devoirs le même jour : une convention approuvée et non acceptée,
       et un mandat créé sans signature. */
    await r.createMandat({ userId: qui.id, objet: "provision", bankName: "BGFI", bankAccount: "TD0000000004", accountHolder: qui.name, amount: 200_000 });
    const quand = new Date().toISOString();
    await r.createClientFile({
      userId: qui.id,
      kind: "physique",
      status: "approuve",
      identity: { name: qui.name, email: qui.email },
      persons: [],
      documents: [],
      funds: { pep: false },
      profile: { category: "non_professionnel" },
      // Approuvé, et la convention jamais acceptée : le devoir qui bloque tout.
      consents: {},
      review: {},
      createdAt: quand,
      updatedAt: quand,
    });

    await tourDesRelances("2027-01-02");
    await tourDesRelances("2027-01-03");
    const siennes = await r.listRelances({ userId: qui.id });
    const conv = siennes.find((x) => x.sujet === "convention");
    const mand = siennes.find((x) => x.sujet === "mandat");
    expect(conv, "la convention doit être constatée").toBeTruthy();
    expect(mand, "le mandat doit être constaté").toBeTruthy();
    // La convention a parlé ; le mandat attend son tour, compteur intact.
    expect(conv!.envois).toBeGreaterThan(0);
    expect(mand!.envois).toBe(0);
  });

  it("ne consomme rien quand aucun canal ne répond", async () => {
    const { repo } = await import("@/lib/data");
    const { tourDesRelances } = await import("@/lib/relances/tour");
    const r = repo();

    /* Personne derrière cet identifiant : ni numéro ni adresse, donc aucun
       canal. Le cas réel est un contact sans coordonnées ; il se juge pareil,
       et celui-ci ne dépend pas du jeu d'essai. */
    const muet = "u-sans-canal";
    await r.createMandat({ userId: muet, objet: "provision", bankName: "BGFI", bankAccount: "CF0000000003", accountHolder: "Sans Canal", amount: 100_000 });

    await tourDesRelances("2026-12-01");
    await tourDesRelances("2026-12-02");
    const x = (await r.listRelances({ userId: muet })).find((q) => q.sujet === "mandat")!;
    /* Le compteur n'a pas bougé : un numéro cassé épuiserait sinon les cinq
       rappels en cinq silences, et le client serait réputé relancé cinq fois
       sans avoir rien reçu. */
    expect(x.envois).toBe(0);
    expect(x.state).toBe("en_cours");
  });
});
