import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { addBusinessDays } from "@/lib/finance";
import { JOURS_AVANT_RELANCE } from "@/lib/domain/standing";

/**
 * UNE ÉPARGNE PROGRAMMÉE SANS MANDAT : CE QU'ELLE PROMET, ET CE QUI SUIT.
 *
 * On programmait un versement mensuel sans jamais demander comment l'argent
 * arriverait. Le client repartait avec « versement programmé », et le robot
 * créait chaque mois un ordre en « confirmée » au montant annoncé, quel que
 * soit son solde. Le message lui disait alors que « le bulletin à signer et
 * l'appel de fonds suivent dans ce fil » : le bulletin était déjà signé à la
 * signature de l'instruction, et l'appel de fonds n'était produit nulle part,
 * parce que seule l'action du desk produit les pièces d'un passage en
 * confirmée. Il n'avait donc ni coordonnées ni référence à citer, et rien ne
 * comptait les versements jamais réglés.
 *
 * La convention interdit d'imposer un prélèvement (article 3) : les deux
 * chemins restent ouverts, et c'est le client qui en choisit un.
 */
const CRON = "src/app/api/cron/epargne/route.ts";
const lire = (f: string) => readFileSync(f, "utf8");

describe("le jour ouvré se compte dans les deux sens", () => {
  it("recule comme il avance", () => {
    /* « Il y a cinq jours ouvrés » est la même question que « dans cinq jours
       ouvrés » : deux fonctions pour un même calendrier finiraient par ne pas
       dire pareil. */
    const lundi = new Date("2026-10-12T12:00:00.000Z");
    expect(addBusinessDays(lundi, 5).toISOString().slice(0, 10)).toBe("2026-10-19");
    expect(addBusinessDays(lundi, -5).toISOString().slice(0, 10)).toBe("2026-10-05");
    // Le week-end ne compte pas : du lundi, un jour en arrière est vendredi.
    expect(addBusinessDays(lundi, -1).toISOString().slice(0, 10)).toBe("2026-10-09");
    expect(addBusinessDays(lundi, 0).toISOString().slice(0, 10)).toBe("2026-10-12");
  });

  it("et le délai de relance vit avec l'instruction, pas dans Santé", () => {
    expect(JOURS_AVANT_RELANCE).toBe(5);
    expect(lire("src/lib/health.ts")).toMatch(/addBusinessDays\(now, -JOURS_AVANT_RELANCE\)/);
  });
});

describe("le robot demande l'argent, ou constate qu'il est là", () => {
  const src = () => lire(CRON);

  it("couvre sur la provision quand elle suffit, comme à la signature d'un ordre", () => {
    /* C'est le cas du client qui a donné un mandat : le prélèvement est arrivé
       cinq jours plus tôt, l'argent est là, et lui demander de virer serait
       lui réclamer deux fois. */
    expect(src()).toMatch(/const du = aCouvrirPour\(confirmed, dest\)/);
    expect(src()).toMatch(/coveredAt: new Date\(\)\.toISOString\(\), coveredAmount: du/);
  });

  it("et sinon produit l'appel de fonds, qui porte les coordonnées", () => {
    // La pièce que le message promettait depuis toujours sans la produire.
    expect(src()).toMatch(/generateForIntent\("fonds", intent\.id\)/);
    // Jamais pour un réinvestissement : l'argent vient du journal, pas du client.
    expect(src()).toMatch(/if \(s\.source !== "encaissements"\) \{\s*const du = aCouvrirPour/);
  });

  it("un appel de fonds qui ne sort pas se dit, et n'arrête pas le versement", () => {
    /* L'ordre existe, le client a été prévenu : avaler l'erreur laisserait un
       client sans coordonnées et personne au courant. */
    expect(src()).toMatch(/appel de fonds non produit/);
  });
});

describe("ce que le client lit", () => {
  const offre = { id: "o1", title: "FCP Trésorerie Corridor", kind: "FONDS" } as never;
  const base = { id: "i1", ref: "PF-1010-AAAA", type: "souscription", amount: 50_000, standingId: "st1" };

  it("un versement couvert ne lui demande rien", async () => {
    const { intentUpdated } = await import("@/lib/notify/compose");
    const m = intentUpdated({ ...base, coveredAt: "2026-10-10T08:00:00Z" } as never, offre, "confirmee");
    expect(m.text).toContain("couverts par votre provision");
    expect(m.text).toContain("Rien à faire");
    // Ni bulletin à signer : il a signé l'instruction une fois.
    expect(m.text).not.toContain("bulletin");
  });

  it("un versement à régler lui donne le montant et la référence à citer", async () => {
    const { intentUpdated } = await import("@/lib/notify/compose");
    const m = intentUpdated(base as never, offre, "confirmee");
    expect(m.text).toContain("PF-1010-AAAA");
    // « fmt » sépare les milliers par une espace fine insécable : on compare au blanc près.
    expect(m.text.replace(/\s/g, " ")).toContain("50 000");
    expect(m.text).toContain("appel de fonds");
    expect(m.text).not.toContain("bulletin");
  });
});

describe("la question posée à la signature de l'instruction", () => {
  it("le formulaire demande comment l'argent arrivera", () => {
    const form = lire("src/components/Standing.tsx");
    expect(form).toMatch(/name="reglement" value="virement"/);
    expect(form).toMatch(/name="reglement" value="prelevement"/);
  });

  it("et « prélevez-moi » mène au mandat, l'instruction déjà choisie", async () => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => undefined }));
    vi.doMock("@/lib/audit", () => ({ audit: async () => ({}) }));
    vi.doMock("@/lib/auth", () => ({ getSession: async () => ({ userId: "u1", name: "Essai", segment: "Personne physique" }) }));
    vi.doMock("@/lib/data", () => ({
      repo: () => ({
        getOffer: async () => ({ id: "f1", kind: "FONDS", title: "FCP Essai", status: "published", fund: { minAmount: 0, distributed: true }, opensAt: "2020-01-01T00:00:00", deadlineAt: "2099-12-31T00:00:00" }),
        getChannelStatus: async () => ({ email: "essai@exemple.cm" }),
        listStandingOrders: async () => [],
        createStandingOrder: async (x: Record<string, unknown>) => ({ ...x, id: "st-9", ref: "EP-0001" }),
        logEvent: async () => undefined,
      }),
    }));
    const { createStandingAction } = await import("@/app/moi/standing-actions");
    const form = new FormData();
    form.set("offerId", "f1");
    form.set("amount", "50 000");
    form.set("dayOfMonth", "5");
    form.set("reglement", "prelevement");
    const r = await createStandingAction(null, form);
    expect(r.ok).toBe(true);
    expect(r).toMatchObject({ versLeMandat: "/moi/prelevements?instruction=st-9" });
    expect(r.ok && r.message).toContain("reste à signer le mandat");
  });

  it("et « je vire moi-même » dit ce qu'il faudra faire chaque mois", async () => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => undefined }));
    vi.doMock("@/lib/audit", () => ({ audit: async () => ({}) }));
    vi.doMock("@/lib/auth", () => ({ getSession: async () => ({ userId: "u1", name: "Essai", segment: "Personne physique" }) }));
    vi.doMock("@/lib/data", () => ({
      repo: () => ({
        getOffer: async () => ({ id: "f1", kind: "FONDS", title: "FCP Essai", status: "published", fund: { minAmount: 0, distributed: true }, opensAt: "2020-01-01T00:00:00", deadlineAt: "2099-12-31T00:00:00" }),
        getChannelStatus: async () => ({ email: "essai@exemple.cm" }),
        listStandingOrders: async () => [],
        createStandingOrder: async (x: Record<string, unknown>) => ({ ...x, id: "st-9", ref: "EP-0001" }),
        logEvent: async () => undefined,
      }),
    }));
    const { createStandingAction } = await import("@/app/moi/standing-actions");
    const form = new FormData();
    form.set("offerId", "f1");
    form.set("amount", "50 000");
    form.set("dayOfMonth", "5");
    const r = await createStandingAction(null, form);
    expect(r.ok && r.versLeMandat).toBeUndefined();
    expect(r.ok && r.message).toContain("virez");
  });
});

/* Le point de Santé, exercé sur le magasin mémoire comme les autres. */
const { memoryRepository } = await import("@/lib/data/memory");
const { healthChecks } = await import("@/lib/health");
const trouve = async (now: Date) => (await healthChecks(now)).find((c) => c.key === "versements")!;

describe("un versement jamais réglé finit par se voir", () => {
  beforeEach(() => {
    delete (globalThis as { __guichetStore?: unknown }).__guichetStore;
  });

  const versement = async (patch: Record<string, unknown> = {}) => {
    const offre = (await memoryRepository.listOffers()).find((o) => o.kind === "FONDS")!;
    const i = await memoryRepository.createIntent({ offerId: offre.id, type: "souscription", amount: 50_000, channel: "E-mail", clientName: "Client d'essai", clientSegment: "Personne physique", clientId: "u1", standingId: "st1" });
    return memoryRepository.updateIntent(i.id, { state: "confirmee", ...patch });
  };

  it("se tait tant que le virement peut être en route", async () => {
    await versement();
    const c = await trouve(new Date());
    expect(c.level).toBe("ok");
    expect(c.value).toBe("0 / 1");
  });

  it("et le dit au-delà de cinq jours ouvrés, avec le plus ancien", async () => {
    await versement();
    const c = await trouve(addBusinessDays(new Date(), JOURS_AVANT_RELANCE + 2));
    expect(c.level).toBe("warn");
    expect(c.value).toBe("1 / 1");
    expect(c.detail).toContain("Client d'essai");
  });

  it("un versement couvert par la provision ne compte pas", async () => {
    /* Il n'attend rien du client : le compter ferait relancer quelqu'un qui a
       déjà payé, ce qui est la façon la plus sûre de faire ignorer un point. */
    await versement({ coveredAt: new Date().toISOString(), coveredAmount: 50_000 });
    const c = await trouve(addBusinessDays(new Date(), JOURS_AVANT_RELANCE + 2));
    expect(c.level).toBe("ok");
    expect(c.value).toBe("0 / 0");
  });
});
