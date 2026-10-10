import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * LE GARDE AVEC SON PLAFOND, DE BOUT EN BOUT.
 *
 * Le domaine est tenu ailleurs (plafond-par-ordre.test.ts) ; ici on prend la
 * porte elle-même : une session de cotitulaire plafonnée, un ordre au-dessus,
 * et la phrase que le client lira. C'est la soudure qui compte, parce que
 * c'est elle qui rend la règle du PV réelle plutôt qu'affichée.
 */
let session: Session;

vi.mock("@/lib/auth", () => ({ getSession: async () => session, requireSession: async () => session, authMode: () => "dev" }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const base: Session = {
  userId: "c-tontine",
  role: "client",
  name: "Tontine Essos Solidarité",
  segment: "Groupement · Yaoundé",
  tier: 2,
  kycStatus: "approuve",
  conventionAccepted: true,
  provider: "dev",
  mfaEnrolled: false,
  mfaVerified: false,
  agissant: { accesId: "a1", nom: "Esther Mballa", role: "cotitulaire" },
};

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

describe("le plafond arrête un ordre au-dessus, en disant par où passer", () => {
  it("au-delà, l'ordre ne passe pas tout seul", async () => {
    const { garde } = await import("@/lib/garde");
    session = { ...base, plafondParOrdre: 5_000_000, plafondSource: "compte" };
    const v = await garde("ordre.deposer", { type: "ferme", montant: 7_000_000, couvert: true });
    expect(v.ok).toBe(false);
    /* fr-FR sépare les milliers par une espace insécable fine : comparer sur
       des espaces ordinaires échouerait sur un texte pourtant juste. */
    expect(v.raison?.replace(/\s/g, " ")).toContain("5 000 000");
    // Rien n'est refusé : un chemin plus lent est imposé, ce qui est le but.
    expect(v.raison).toContain("un conseiller le prend avec vous");
  });

  it("en dessous, il passe", async () => {
    const { garde } = await import("@/lib/garde");
    session = { ...base, plafondParOrdre: 5_000_000, plafondSource: "compte" };
    expect((await garde("ordre.deposer", { type: "ferme", montant: 4_999_999, couvert: true })).ok).toBe(true);
  });

  it("et vendre n'est jamais borné, quel que soit le montant", async () => {
    /* Borner une cession enfermerait le groupe dans son compte : le plafond
       mesure ce qu'on engage, pas ce qu'on récupère. */
    const { garde } = await import("@/lib/garde");
    session = { ...base, plafondParOrdre: 5_000_000, plafondSource: "compte" };
    expect((await garde("ordre.deposer", { type: "vente", montant: 900_000_000, couvert: true })).ok).toBe(true);
  });

  it("la phrase dit d'où vient le plafond", async () => {
    const { garde } = await import("@/lib/garde");
    session = { ...base, plafondParOrdre: 2_000_000, plafondSource: "personne" };
    const v = await garde("ordre.deposer", { type: "souscription", montant: 3_000_000, couvert: true });
    expect(v.raison).toContain("qui vous est fixé");
  });

  it("sans plafond, le garde ne dit rien de plus", async () => {
    const { garde } = await import("@/lib/garde");
    session = { ...base };
    expect((await garde("ordre.deposer", { type: "ferme", montant: 900_000_000, couvert: true })).ok).toBe(true);
  });

  it("et une mesure passe AVANT le plafond, parce que c'est elle qui l'arrêtera de toute façon", async () => {
    /* Un compte suspendu dont l'ordre dépasse aussi doit s'entendre dire
       qu'il est suspendu : lui parler du plafond l'enverrait corriger un
       montant qui ne changerait rien. */
    const { repo } = await import("@/lib/data");
    await repo().setMesure("c-tontine", { mesure: "suspendu", par: "Georges", le: new Date().toISOString() });
    const { garde } = await import("@/lib/garde");
    session = { ...base, plafondParOrdre: 5_000_000, plafondSource: "compte" };
    const v = await garde("ordre.deposer", { type: "ferme", montant: 7_000_000, couvert: true });
    expect(v.ok).toBe(false);
    expect(v.raison).toContain("suspendu");
    await repo().setMesure("c-tontine", { mesure: "aucune" });
  });
});
