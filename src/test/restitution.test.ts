import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLOSED, OUVERTE, cashPosition, toRestore, mayHold, type CashEntry } from "@/lib/domain/cash";
import { demandeOuverte, ecartDeDemande, pourquoiPasDeDemande, reclamable } from "@/lib/domain/restitution";
import type { CashPayout } from "@/lib/domain/cash";
import type { Intent } from "@/lib/domain/types";

/**
 * LE SOLDE RESTE, ET NE REPART QUE SUR DEMANDE.
 *
 * Le module des espèces portait l'ancienne règle, et son raisonnement partait
 * d'une prémisse fausse : « un franc qui dort ressemble à un dépôt, et la maison
 * n'a pas d'agrément pour en recevoir ». L'argent du client passe déjà par les
 * comptes de la maison, dans les deux sens. Deux réponses de la maison, le
 * 2 octobre 2026, ont remplacé la question : cet argent APPARTIENT AU CLIENT, et
 * il peut rester AUSSI LONGTEMPS QUE LE CLIENT LE SOUHAITE.
 *
 * La seconde moitié est celle qui coûte du code. Sans délai, rien ne repart de
 * soi-même, et ouvrir la politique sans donner au client un moyen de demander
 * aurait créé un trou pire que l'ancienne règle : l'argent s'accumule et la
 * seule sortie est un opérateur qui le remarque.
 *
 * Quatre choses sont tenues ici, et la dernière est celle qu'on oublie : le
 * montant payé n'est pas le montant demandé, parce que le solde bouge entre les
 * deux.
 */
const NOW = new Date("2026-10-03T12:00:00Z");

const entry = (o: Partial<CashEntry>): CashEntry => ({ id: "c1", userId: "u1", at: "2026-09-10T08:00:00.000Z", amount: 100_000, kind: "coupon", label: "Coupon", ...o });
const intent = (id: string, state: Intent["state"]): Intent => ({ id, state } as unknown as Intent);
const payout = (o: Partial<CashPayout>): CashPayout => ({ id: "p1", userId: "u1", askedAt: "2026-10-01T08:00:00.000Z", askedAmount: 272_500, state: "demandee", ...o });

describe("la règle des espèces en vigueur", () => {
  const dormant = [entry({ kind: "coupon", amount: 272_500 })];

  it("garde le solde : rien ne repart de soi-même", () => {
    expect(OUVERTE.holdIdle).toBe(true);
    // « null » n'est pas un zéro : c'est l'absence de délai, donc l'absence de retour.
    expect(OUVERTE.graceDays).toBeNull();
    expect(toRestore(dormant, [], OUVERTE, NOW)).toBe(0);
    // Et c'est le défaut : une lecture manquée ne renvoie pas l'argent d'un
    // client qui a demandé à le garder.
    expect(toRestore(dormant, [], undefined, NOW)).toBe(0);
  });

  it("accepte un virement qui n'attend aucune opération", () => {
    expect(mayHold({ kind: "provision" }, OUVERTE)).toBe(true);
    expect(mayHold({ kind: "provision" }, undefined)).toBe(true);
  });

  it("la politique fermée reste disponible, et renvoie tout", () => {
    // Un responsable peut refermer : la règle d'avant n'est pas effacée, elle
    // n'est plus le défaut.
    expect(CLOSED.holdIdle).toBe(false);
    expect(toRestore(dormant, [], CLOSED, NOW)).toBe(272_500);
    expect(mayHold({ kind: "provision" }, CLOSED)).toBe(false);
  });

  it("un délai écrit par un responsable fonctionne encore", () => {
    const avecDelai = { holdIdle: true, graceDays: 30 };
    expect(toRestore(dormant, [], avecDelai, NOW)).toBe(0);
    expect(toRestore(dormant, [], avecDelai, new Date("2026-11-25T12:00:00Z"))).toBe(272_500);
  });
});

describe("ce qu'un client peut réclamer", () => {
  it("son disponible, et non l'argent qu'une opération vivante attend", () => {
    const e = [entry({ kind: "coupon", amount: 272_500 }), entry({ id: "c2", kind: "provision", amount: 1_000_000, intentId: "i1", dueBy: "2026-12-31" })];
    const intents = [intent("i1", "recue")];
    expect(cashPosition(e, intents, NOW).balance).toBe(1_272_500);
    // Le million attend le règlement d'un ordre : le réclamer laisserait cet
    // ordre sans provision.
    expect(reclamable(e, intents, NOW)).toBe(272_500);
  });

  it("rien quand tout est affecté", () => {
    const e = [entry({ kind: "provision", amount: 1_000_000, intentId: "i1", dueBy: "2026-12-31" })];
    expect(reclamable(e, [intent("i1", "recue")], NOW)).toBe(0);
  });
});

describe("pourquoi une demande est impossible", () => {
  it("rien à réclamer", () => {
    expect(pourquoiPasDeDemande(0, [], OUVERTE)).toBe("rien");
  });

  it("une demande court déjà", () => {
    expect(pourquoiPasDeDemande(272_500, [payout({})], OUVERTE)).toBe("deja");
    // Une demande fermée ne bloque plus : le client peut redemander.
    expect(pourquoiPasDeDemande(272_500, [payout({ state: "refusee", closedReason: "RIB à confirmer" })], OUVERTE)).toBeNull();
  });

  it("la politique est fermée, donc les soldes repartent seuls", () => {
    expect(pourquoiPasDeDemande(272_500, [], CLOSED)).toBe("ferme");
  });

  it("rien n'empêche quand il y a un solde et pas de demande", () => {
    expect(pourquoiPasDeDemande(272_500, [], OUVERTE)).toBeNull();
    expect(demandeOuverte([payout({ state: "payee", paidAmount: 272_500 })])).toBeUndefined();
  });
});

describe("l'écart entre ce qui est demandé et ce qui est payé", () => {
  it("se voit, parce que le solde bouge entre les deux", () => {
    // Un coupon tombé après la demande : le client reçoit plus qu'il n'a demandé.
    expect(ecartDeDemande({ askedAmount: 272_500, paidAmount: 452_500 })).toBe(180_000);
    // Un ordre réglé après la demande : il reçoit moins.
    expect(ecartDeDemande({ askedAmount: 272_500, paidAmount: 180_000 })).toBe(-92_500);
    expect(ecartDeDemande({ askedAmount: 272_500, paidAmount: 272_500 })).toBe(0);
    // Une demande non payée n'a pas d'écart : elle n'a pas de montant payé.
    expect(ecartDeDemande({ askedAmount: 272_500 })).toBe(0);
  });
});

/* Le dépôt en mémoire vit sur globalThis et survit à resetModules : avec un
   client partagé, un test trouverait la demande laissée ouverte par le
   précédent et passerait sur une ligne qui n'est pas la sienne. */
const qui = vi.hoisted(() => ({ id: "u-rest-0" }));
let rang = 0;
const sien = () => {
  rang += 1;
  qui.id = `u-rest-${rang}`;
  return qui.id;
};

vi.mock("@/lib/auth", () => ({ requireDesk: async () => ({ name: "Desk Test", role: "desk" }), requireSession: async () => ({ userId: qui.id, name: "Client Test", role: "client" }) }));
vi.mock("@/lib/audit", () => ({ audit: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

describe("les deux gestes, bout à bout", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("le client demande, le desk verse le disponible du jour, et l'écart est dit", async () => {
    const { repo } = await import("@/lib/data");
    const { demanderRestitution } = await import("@/app/trader/restitution-actions");
    const { payerRestitution } = await import("@/app/desk/encaissements/payout-actions");
    const r = repo();
    const u = sien();

    await r.addCash({ userId: u, amount: 272_500, kind: "coupon", label: "Coupon" });
    const demande = await demanderRestitution(null, new FormData());
    expect(demande.ok).toBe(true);

    /* Un coupon tombe APRÈS la demande : c'est le cas que « payer le montant
       demandé » traiterait mal, en laissant 180 000 derrière lui. */
    await r.addCash({ userId: u, amount: 180_000, kind: "coupon", label: "Coupon" });

    const ouverte = (await r.listPayouts({ state: "demandee" })).find((p) => p.userId === u)!;
    expect(ouverte.askedAmount).toBe(272_500);

    const f = new FormData();
    f.append("payoutId", ouverte.id);
    const paye = await payerRestitution(null, f);
    expect(paye.ok).toBe(true);
    if (paye.ok) expect(paye.message).toMatch(/bougé/i);

    const ferme = (await r.listPayouts({ userId: u })).find((p) => p.id === ouverte.id)!;
    expect(ferme.state).toBe("payee");
    expect(ferme.paidAmount).toBe(452_500);
    expect(ferme.cashEntry).toBeTruthy();
    // Et le solde est à zéro : la restitution est un mouvement, pas une mention.
    expect(await r.listCash(u).then((e) => e.filter((x) => x.kind === "restitution").length)).toBe(1);
  });

  it("deux demandes ouvertes à la fois sont impossibles", async () => {
    const { repo } = await import("@/lib/data");
    const { demanderRestitution } = await import("@/app/trader/restitution-actions");
    const r = repo();
    const u = sien();
    await r.addCash({ userId: u, amount: 500_000, kind: "coupon", label: "Coupon" });
    expect((await demanderRestitution(null, new FormData())).ok).toBe(true);
    const deux = await demanderRestitution(null, new FormData());
    expect(deux.ok).toBe(false);
    if (!deux.ok) expect(deux.error).toMatch(/déjà en cours/i);
  });

  it("le dépôt refuse aussi, sous la garde de l'action", async () => {
    /* Deux couches, et il faut les deux. L'action regarde avant d'écrire, ce qui
       donne un message clair ; le dépôt refuse quand même, ce qui protège d'un
       chemin qui oublierait de regarder. En base c'est un index d'unicité
       partiel ; en mémoire, la même règle à la main, sans quoi un test passerait
       sur un comportement que la production refuse. */
    const { repo } = await import("@/lib/data");
    const r = repo();
    const u = sien();
    await r.askPayout({ userId: u, askedAmount: 100_000 });
    await expect(r.askPayout({ userId: u, askedAmount: 100_000 })).rejects.toThrow(/deja ouverte/i);
  });

  it("une demande déjà fermée ne se referme pas deux fois", async () => {
    // Deux opérateurs sur la même ligne : le second ne doit pas écraser la
    // réponse du premier, ni virer une seconde fois.
    const { repo } = await import("@/lib/data");
    const r = repo();
    const u = sien();
    const p = await r.askPayout({ userId: u, askedAmount: 100_000 });
    await r.closePayout(p.id, { state: "refusee", closedBy: "Desk Test", closedReason: "RIB à confirmer" });
    await expect(r.closePayout(p.id, { state: "payee", closedBy: "Autre", paidAmount: 100_000 })).rejects.toThrow(/deja fermee/i);
  });

  it("un refus sans motif n'est pas une réponse", async () => {
    const { repo } = await import("@/lib/data");
    const { demanderRestitution } = await import("@/app/trader/restitution-actions");
    const { refuserRestitution } = await import("@/app/desk/encaissements/payout-actions");
    const r = repo();
    const u = sien();
    await r.addCash({ userId: u, amount: 300_000, kind: "coupon", label: "Coupon" });
    await demanderRestitution(null, new FormData());
    const ouverte = (await r.listPayouts({ state: "demandee" })).find((p) => p.userId === u)!;

    const vide = new FormData();
    vide.append("payoutId", ouverte.id);
    const sansMotif = await refuserRestitution(null, vide);
    expect(sansMotif.ok).toBe(false);
    if (!sansMotif.ok) expect(sansMotif.error).toMatch(/pourquoi/i);

    const avec = new FormData();
    avec.append("payoutId", ouverte.id);
    avec.append("reason", "RIB à confirmer avant tout virement");
    expect((await refuserRestitution(null, avec)).ok).toBe(true);
    const ferme = (await r.listPayouts({ userId: u })).find((p) => p.id === ouverte.id)!;
    expect(ferme.state).toBe("refusee");
    // Le motif est gardé parce que le client le lira sur sa console.
    expect(ferme.closedReason).toMatch(/RIB/);
  });
});

describe("la base porte les mêmes règles que le code", () => {
  it("une seule demande ouverte, un refus motivé, un paiement chiffré", () => {
    const sql = readFileSync("C:/dev/guichet/supabase/migrations/0060_demande_de_restitution.sql", "utf8");
    expect(sql).toMatch(/create unique index[^;]*cash_payouts_une_ouverte[^;]*where state = 'demandee'/);
    expect(sql).toMatch(/cash_payouts_refus_motive/);
    expect(sql).toMatch(/cash_payouts_paiement_chiffre/);
  });

  it("la politique vit dans le référentiel, avec les trois autres", () => {
    const policy = readFileSync("C:/dev/guichet/src/lib/policy.ts", "utf8");
    expect(policy).toMatch(/CASH_POLICY_KEY = "especes"/);
    // Son défaut est l'inverse des trois autres, et le fichier dit pourquoi.
    expect(policy).toMatch(/loadCashPolicy[\s\S]{0,320}return OUVERTE;/);
  });
});
