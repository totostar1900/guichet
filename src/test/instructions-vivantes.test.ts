import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PARTS_MAX, cleEnMots, pourquoiPasDeCle, repartition, tranches } from "@/lib/domain/repartition";

/**
 * TROIS DEMANDES SUR LES INSTRUCTIONS PERMANENTES, ET UNE CONSÉQUENCE.
 *
 * Modifier une instruction active, masquer les arrêtées au lieu de les
 * supprimer, répartir sur plusieurs destinations selon une clé que LE CLIENT
 * écrit. Une clé choisie par la maison serait de la gestion, et la maison n'a
 * pas cet agrément.
 *
 * MODIFIER, C'EST REMPLACER. L'instruction a produit de vrais ordres, et ces
 * ordres la désignent par son identifiant : la modifier en place ferait mentir
 * le passé. L'ancienne garde ses termes, la nouvelle dit laquelle elle remplace.
 *
 * ET LA CONSÉQUENCE, qui n'était pas dans la demande et compte plus que le
 * reste. Depuis le préavis, une occurrence peut être annoncée quand le client
 * change ses termes : sans rien faire, le robot exécuterait demain les ANCIENS
 * termes sur une instruction qui n'existe plus.
 */

describe("la clé de répartition", () => {
  it("une instruction sans clé est une clé à une part", () => {
    /* Pas un cas particulier : le traiter ainsi évite deux chemins dans le
       robot, et c'est le genre de bifurcation où l'un des deux oublie une règle. */
    expect(repartition({ offerId: "f1" })).toEqual([{ offerId: "f1", pct: 100 }]);
    expect(repartition({ offerId: "f1", splits: [] })).toEqual([{ offerId: "f1", pct: 100 }]);
  });

  it("partage au franc près, le reste à la dernière part", () => {
    /* La somme des tranches doit faire EXACTEMENT le montant exécuté. Répartir
       le reste « au plus gros » ferait varier le résultat d'un mois à l'autre
       pour la même clé, ce qu'un client ne pourrait pas recalculer. */
    /* 100 000 à 33/33/34 tombe juste, donc ne mesurerait rien : il faut un
       montant que les pourcentages ne divisent pas. C'était le défaut de ce
       test avant de le voir mordre. */
    const l = tranches(10_001, [
      { offerId: "a", pct: 33 },
      { offerId: "b", pct: 33 },
      { offerId: "c", pct: 34 },
    ]);
    expect(l).toEqual([
      { offerId: "a", montant: 3_300 },
      { offerId: "b", montant: 3_300 },
      // 3 400 par le calcul, 3 401 avec le reste : c'est la dernière qui l'absorbe.
      { offerId: "c", montant: 3_401 },
    ]);
    expect(l.reduce((t, x) => t + x.montant, 0)).toBe(10_001);
  });

  it("la somme fait le montant même quand les pourcentages ne divisent pas", () => {
    const l = tranches(100_001, [
      { offerId: "a", pct: 60 },
      { offerId: "b", pct: 40 },
    ]);
    expect(l.reduce((t, x) => t + x.montant, 0)).toBe(100_001);
    // 60 % de 100 001 = 60 000,6 : la part plancher, et le reste à la dernière.
    expect(l[0].montant).toBe(60_000);
    expect(l[1].montant).toBe(40_001);
  });

  it("écarte une tranche nulle : un ordre de zéro franc n'est pas un ordre", () => {
    const l = tranches(100, [
      { offerId: "a", pct: 99 },
      { offerId: "b", pct: 1 },
    ]);
    expect(l).toEqual([
      { offerId: "a", montant: 99 },
      { offerId: "b", montant: 1 },
    ]);
    // Sur un montant minuscule, la part plancher tombe à zéro et disparaît.
    expect(tranches(1, [{ offerId: "a", pct: 50 }, { offerId: "b", pct: 50 }])).toEqual([{ offerId: "b", montant: 1 }]);
  });

  it("refuse une clé qui ne fait pas cent", () => {
    expect(pourquoiPasDeCle([{ offerId: "a", pct: 60 }, { offerId: "b", pct: 30 }])).toMatch(/90 %/);
    expect(pourquoiPasDeCle([{ offerId: "a", pct: 60 }, { offerId: "b", pct: 40 }])).toBeNull();
  });

  it("refuse une destination répétée", () => {
    /* Pas une faute de frappe innocente : une clé dont le client ne peut plus
       lire ce qu'elle fait. */
    expect(pourquoiPasDeCle([{ offerId: "a", pct: 60 }, { offerId: "a", pct: 40 }])).toMatch(/deux fois/i);
  });

  it("refuse une part à zéro ou à virgule", () => {
    // Une ligne que le client croit avoir posée et qui ne recevra rien.
    expect(pourquoiPasDeCle([{ offerId: "a", pct: 100 }, { offerId: "b", pct: 0 }])).toMatch(/au moins 1/i);
    expect(pourquoiPasDeCle([{ offerId: "a", pct: 99.5 }, { offerId: "b", pct: 0.5 }])).toMatch(/entier/i);
  });

  it("refuse une clé qui devient un portefeuille", () => {
    const trop = Array.from({ length: PARTS_MAX + 1 }, (_, i) => ({ offerId: `f${i}`, pct: i === 0 ? 100 - PARTS_MAX : 1 }));
    expect(pourquoiPasDeCle(trop)).toMatch(/portefeuille/i);
  });

  it("se dit en mots pour un avis", () => {
    expect(cleEnMots([{ offerId: "a", pct: 60 }, { offerId: "b", pct: 40 }], (id) => (id === "a" ? "FCP Trésorerie" : "FCP Obligations"))).toBe("60 % FCP Trésorerie · 40 % FCP Obligations");
  });
});

vi.mock("@/lib/auth", () => ({ getSession: async () => ({ userId: qui.id, name: "Client Modif", segment: "Personne physique", email: "c@exemple.com", role: "client" }) }));
vi.mock("@/lib/audit", () => ({ audit: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const qui = vi.hoisted(() => ({ id: "u-modif-0" }));
let rang = 0;
const sien = () => {
  rang += 1;
  qui.id = `u-modif-${rang}`;
  return qui.id;
};

const champs = (o: Record<string, string | string[]>): FormData => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
};

async function uneInstruction(userId: string) {
  const { repo } = await import("@/lib/data");
  const r = repo();
  const fonds = (await r.listOffers()).filter((o) => o.kind === "FONDS" && !o.hidden);
  const s = await r.createStandingOrder({
    userId,
    clientName: "Client Modif",
    clientSegment: "Personne physique",
    offerId: fonds[0].id,
    amount: 300_000,
    dayOfMonth: 5,
    startsOn: "2026-01-01",
    onBlocked: "passer",
    channel: "E-mail",
    contactEmail: "c@exemple.com",
  } as never);
  return { r, s, fonds };
}

describe("modifier, c'est remplacer", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("l'ancienne garde ses termes, la nouvelle dit laquelle elle remplace", async () => {
    const u = sien();
    const { r, s } = await uneInstruction(u);
    const { modifierStandingAction } = await import("@/app/moi/modifier-actions");

    const res = await modifierStandingAction(null, champs({ id: s.id, amount: "400 000", dayOfMonth: "12" }));
    expect(res.ok).toBe(true);

    const toutes = await r.listStandingOrders(u);
    const ancienne = toutes.find((x) => x.id === s.id)!;
    const neuve = toutes.find((x) => x.supersedes === s.id)!;
    // Le passé ne mente pas : l'ancienne dit toujours 50 000 le 5.
    expect(ancienne.state).toBe("remplacee");
    expect(ancienne.amount).toBe(300_000);
    expect(ancienne.dayOfMonth).toBe(5);
    expect(neuve.state).toBe("active");
    expect(neuve.amount).toBe(400_000);
    expect(neuve.dayOfMonth).toBe(12);
    // Une seule court : deux actives se prélèveraient deux fois le même mois.
    expect(toutes.filter((x) => x.state === "active")).toHaveLength(1);
  });

  it("périme l'occurrence déjà annoncée", async () => {
    /* LE POINT QUI N'ÉTAIT PAS DANS LA DEMANDE. Sans cela, le robot exécuterait
       demain les anciens termes sur une instruction qui n'existe plus. */
    const u = sien();
    const { r, s } = await uneInstruction(u);
    const annonce = await r.annoncerPreavis({ standingId: s.id, userId: u, dueOn: "2099-01-01", amount: 300_000 });
    await r.cloturerPreavis(annonce.id, { noticeSent: true });

    const { modifierStandingAction } = await import("@/app/moi/modifier-actions");
    const res = await modifierStandingAction(null, champs({ id: s.id, amount: "400 000" }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.message).toMatch(/n'aura pas lieu/i);

    expect((await r.listPreavis({ standingId: s.id })).find((x) => x.id === annonce.id)!.state).toBe("perimee");
  });

  it("écrit la clé de répartition du client", async () => {
    const u = sien();
    const { r, s, fonds } = await uneInstruction(u);
    if (fonds.length < 2) return; // le jeu de données n'a qu'un fonds ouvert
    const { modifierStandingAction } = await import("@/app/moi/modifier-actions");

    const res = await modifierStandingAction(
      null,
      champs({ id: s.id, amount: "400 000", splitOffer: [fonds[0].id, fonds[1].id], splitPct: ["60", "40"] }),
    );
    expect(res.ok).toBe(true);
    const neuve = (await r.listStandingOrders(u)).find((x) => x.supersedes === s.id)!;
    expect(neuve.splits).toEqual([
      { offerId: fonds[0].id, pct: 60 },
      { offerId: fonds[1].id, pct: 40 },
    ]);
  });

  it("refuse une clé dont une tranche tombe sous le minimum de sa destination", async () => {
    /* Trouvé en écrivant ce test : 200 000 partagés 60/40 font 120 000 et
       80 000, et un fonds qui exige 100 000 refuse la seconde. Chaque tranche se
       relit donc contre SA destination, et une seule qui bloque bloque toute
       l'occurrence : exécuter la clé en partie changerait la répartition que le
       client a écrite sans qu'il l'ait dit. */
    const u = sien();
    const { r, s, fonds } = await uneInstruction(u);
    if (fonds.length < 2) return;
    const { modifierStandingAction } = await import("@/app/moi/modifier-actions");
    const res = await modifierStandingAction(null, champs({ id: s.id, amount: "200 000", splitOffer: [fonds[0].id, fonds[1].id], splitPct: ["60", "40"] }));
    expect(res.ok).toBe(false);
    // Le message nomme la destination fautive, sans quoi le client cherche.
    if (!res.ok) expect(res.error).toContain(fonds[1].title);
    expect((await r.listStandingOrders(u)).find((x) => x.id === s.id)!.state).toBe("active");
  });

  it("refuse une clé qui ne fait pas cent, et ne touche à rien", async () => {
    const u = sien();
    const { r, s, fonds } = await uneInstruction(u);
    if (fonds.length < 2) return;
    const { modifierStandingAction } = await import("@/app/moi/modifier-actions");
    const res = await modifierStandingAction(null, champs({ id: s.id, splitOffer: [fonds[0].id, fonds[1].id], splitPct: ["60", "30"] }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/100 %/);
    // Rien n'a bougé : un refus ne laisse pas l'instruction à moitié remplacée.
    expect((await r.listStandingOrders(u)).find((x) => x.id === s.id)!.state).toBe("active");
  });

  it("refuse de modifier une instruction qui ne court plus", async () => {
    const u = sien();
    const { r, s } = await uneInstruction(u);
    await r.updateStandingOrder(s.id, { state: "annulee", stopReason: "arrêtée" });
    const { modifierStandingAction } = await import("@/app/moi/modifier-actions");
    const res = await modifierStandingAction(null, champs({ id: s.id, amount: "400 000" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/ne court plus/i);
  });

  it("ne modifie pas l'instruction d'un autre", async () => {
    const autre = sien();
    const { s } = await uneInstruction(autre);
    sien(); // la session change d'identité
    const { modifierStandingAction } = await import("@/app/moi/modifier-actions");
    const res = await modifierStandingAction(null, champs({ id: s.id, amount: "400 000" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/introuvable/i);
  });
});

vi.mock("@/lib/notify/preavis", () => ({ envoyerPreavis: async () => ({ sent: true }) }));
vi.mock("@/lib/notify/dispatch", () => ({ notifyIntentUpdated: async () => {} }));
vi.mock("@/lib/reference", () => ({ loadRegistry: async () => {}, REF: { policy: "policy" } }));

describe("le robot exécute la clé, tranche par tranche", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("produit un ordre par destination, et la somme fait le montant", async () => {
    const u = sien();
    const { repo } = await import("@/lib/data");
    const r = repo();
    const fonds = (await r.listOffers()).filter((o) => o.kind === "FONDS" && !o.hidden);
    if (fonds.length < 2) return;

    const s = await r.createStandingOrder({
      userId: u,
      clientName: "Client Clé",
      clientSegment: "Personne physique",
      offerId: fonds[0].id,
      amount: 0,
      source: "encaissements",
      minAmount: 10_000,
      dayOfMonth: 1,
      startsOn: "2026-01-01",
      onBlocked: "passer",
      channel: "E-mail",
      contactEmail: "c@exemple.com",
      splits: [
        { offerId: fonds[0].id, pct: 60 },
        { offerId: fonds[1].id, pct: 40 },
      ],
    } as never);

    await r.addCash({ userId: u, amount: 500_001, kind: "coupon", label: "Coupon" });
    const aujourdHui = new Date().toLocaleDateString("sv-SE");
    const p = await r.annoncerPreavis({ standingId: s.id, userId: u, dueOn: aujourdHui, amount: 500_001 });
    await r.cloturerPreavis(p.id, { noticeSent: true });

    const { GET } = await import("@/app/api/cron/epargne/route");
    await GET(new Request("http://localhost/api/cron/epargne") as never);

    const siens = (await r.listIntents()).filter((i) => i.standingId === s.id);
    expect(siens).toHaveLength(2);
    // Le reste d'arrondi va à la dernière part : la somme fait exactement le montant.
    expect(siens.reduce((t, i) => t + (i.amount ?? 0), 0)).toBe(500_001);
    expect(new Set(siens.map((i) => i.offerId))).toEqual(new Set([fonds[0].id, fonds[1].id]));
    // Et l'occurrence garde la liste des ordres qu'elle a produits.
    const ferme = (await r.listPreavis({ standingId: s.id })).find((x) => x.id === p.id)!;
    expect(ferme.state).toBe("executee");
    expect(ferme.intents).toHaveLength(2);
    expect(ferme.paidAmount).toBe(500_001);
    // La poche est vidée du total, pas d'une tranche.
    const { cashPosition } = await import("@/lib/domain/cash");
    expect(cashPosition(await r.listCash(u), await r.listIntents()).idle).toBe(0);
  });
});

describe("une instruction arrêtée ne se supprime pas", () => {
  it("aucun dépôt n'offre de la détruire", () => {
    /* Elles portent la trace d'ordres réellement exécutés : un client qui
       voudrait « faire le ménage » couperait le lien entre son argent et la
       raison pour laquelle il est parti. Elles se masquent, ce qui répond au
       besoin sans couper la piste. */
    const fautifs: string[] = [];
    for (const f of ["lib/data/repository.ts", "lib/data/supabase.ts", "lib/data/memory.ts"]) {
      const s = readFileSync(path.join("C:/dev/guichet/src", f), "utf8");
      if (/deleteStandingOrder|removeStandingOrder|supprimerStanding/.test(s)) fautifs.push(f);
    }
    expect(fautifs).toEqual([]);
  });

  it("aucune action du client ne la détruit", () => {
    const dossier = "C:/dev/guichet/src/app/moi";
    const fautifs = readdirSync(dossier)
      .filter((f) => f.endsWith(".ts"))
      .filter((f) => /\.delete\(\)|from\("standing_orders"\)\s*\.delete/.test(readFileSync(path.join(dossier, f), "utf8")));
    expect(fautifs).toEqual([]);
  });
});

describe("la base porte les mêmes règles", () => {
  it("la lignée, la clé, et l'état « remplacee »", () => {
    const sql = readFileSync("C:/dev/guichet/supabase/migrations/0064_instructions_vivantes.sql", "utf8");
    expect(sql).toMatch(/add column if not exists supersedes uuid/);
    expect(sql).toMatch(/add column if not exists splits jsonb/);
    expect(sql).toMatch(/'remplacee'/);
    // Les ordres d'une occurrence qui partage : plusieurs, donc une liste.
    expect(sql).toMatch(/standing_runs add column if not exists intents jsonb/);
  });

  it("les deux dépôts portent la clé et la lignée", () => {
    // C'est là que des champs se perdent en silence, et on l'a déjà payé.
    for (const f of ["lib/data/supabase.ts", "lib/data/memory.ts"]) {
      const s = readFileSync(path.join("C:/dev/guichet/src", f), "utf8");
      expect(s, f).toMatch(/remplacerStandingOrder/);
    }
    const sup = readFileSync("C:/dev/guichet/src/lib/data/supabase.ts", "utf8");
    expect(sup).toMatch(/splits: r\.splits \?\? undefined/);
    expect(sup).toMatch(/supersedes: r\.supersedes \?\? undefined/);
    expect(sup).toMatch(/splits: input\.splits\?\.length \? input\.splits : null/);
  });
});
