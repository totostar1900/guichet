import { beforeAll, describe, expect, it } from "vitest";
import { buildPerformanceParts } from "@/lib/performance-report";
import { cleDuFlux } from "@/lib/domain/encaissement";
import type { CashEntry } from "@/lib/domain/cash";
import type { Intent, Offer } from "@/lib/domain/types";

/**
 * UN COUPON ÉCHU N'EST PAS DE L'ARGENT REVENU.
 *
 * Le rapport ajoutait au « revenu » chaque coupon dont la date était passée. La
 * page le disait au client, honnêtement : « ces flux sont comptés à leur date
 * d'échéance, l'application ne constate pas l'encaissement ». Ce n'était donc
 * pas un mensonge caché mais une approximation déclarée, et avec la pièce au
 * journal elle n'a plus de raison d'être.
 *
 * Trois choses se mesurent ici, et les deux dernières sont le vrai gain. Un
 * coupon payé en retard pesait DEUX FOIS faux dans un taux pondéré par les
 * montants : par son montant, qui n'était pas celui reçu, et par sa date, qui
 * était celle de l'échéance. Lire le mouvement réel corrige les deux.
 *
 * LES MESURES PORTENT SUR LA LIGNE, et non sur le total du portefeuille, parce
 * qu'une obligation du primaire gardée jusqu'au terme n'a pas de cours : le
 * total en francs la tient à part, à dessein, et un total qui la compterait à
 * zéro afficherait une perte que personne n'a subie. Le compte des échéances
 * non constatées, lui, porte bien sur toutes les lignes : c'est un fait sur les
 * titres du client, pas sur une valorisation, et c'est vérifié ci-dessous.
 *
 * L'échéancier n'est pas recopié ici : il est relu des positions, pour qu'un
 * changement du calcul des coupons fasse échouer ce test au lieu de le laisser
 * mesurer une ligne qui n'existe plus.
 */
const NOW = new Date("2027-01-05T10:00:00Z");

let ordre: Intent;
let offre: Offer;
let echus: { date: string; amount: number; label: string }[];

beforeAll(async () => {
  const { repo } = await import("@/lib/data");
  const { positionsFrom } = await import("@/lib/positions");
  const r = repo();
  const offers = await r.listOffers();
  const base = offers.find((o) => o.kind === "OTA" && o.couponRate != null)!;
  offre = await r.upsertOffer({
    ...base,
    id: "ota-rendement",
    title: "OTA rendement 6 % 2023-2028",
    isin: "CM0000RDT001",
    status: "published",
    opensAt: "2023-09-01T08:00:00.000Z",
    deadlineAt: "2023-09-15T16:00:00.000Z",
    settleOn: "2023-09-20",
    maturityOn: "2028-09-20",
    couponRate: 6,
    hidden: false,
    version: 1,
  } as typeof base);
  const i = await r.createIntent({ offerId: offre.id, type: "ferme", amount: 5_000_000, channel: "WhatsApp", clientName: "Client Rendement", clientSegment: "Personne physique", clientId: "u-rdt" });
  ordre = (await r.updateIntent(i.id, { state: "reglee" }))!;
  echus = positionsFrom([ordre], [offre], NOW)[0].echus;
  // Trois coupons de 300 000 derrière nous au 5 janvier 2027 : 2024, 2025, 2026.
  expect(echus.length).toBe(3);
  expect(echus[0].amount).toBe(300_000);
});

/** Le mouvement qui atteste un encaissement : montant réel, date de valeur, pièce. */
const constate = (f: { date: string; amount: number; label: string }, recu: { amount: number; valueOn: string }): CashEntry => ({
  id: `c-${f.date}`,
  userId: "u-rdt",
  at: `${recu.valueOn}T12:00:00.000Z`,
  amount: recu.amount,
  kind: "coupon",
  label: `${f.label} · ${offre.title} · échéance du ${f.date}`,
  flowKey: cleDuFlux(ordre.id, f),
  evidence: "avis teneur de compte n° 4471",
  expected: f.amount,
});

const rapport = (cash: CashEntry[]) => {
  const { perf, mouvements } = buildPerformanceParts([ordre], [offre], cash, NOW);
  const ligne = perf.lines.find((l) => l.offerId === offre.id)!;
  return { perf, ligne, mouvements };
};

describe("le rendement ne compte que ce qui est arrivé", () => {
  it("sans aucun encaissement constaté, rien n'est compté comme revenu", () => {
    const { ligne } = rapport([]);
    expect(ligne.returned).toBe(0);
    expect(ligne.attendus).toBe(3);
  });

  it("un coupon constaté compte, au montant reçu et non au montant dû", () => {
    const { ligne } = rapport([constate(echus[0], { amount: 280_000, valueOn: "2024-09-24" })]);
    // Reçu 280 000, pas les 300 000 dus : c'est le reçu qui compte.
    expect(ligne.returned).toBe(280_000);
    expect(ligne.attendus).toBe(2);
  });

  it("le flux entre à sa date de valeur, pas à celle de l'échéance", () => {
    const { mouvements } = rapport([constate(echus[0], { amount: 300_000, valueOn: "2024-10-11" })]);
    const coupon = mouvements.find((m) => m.amount === 300_000);
    expect(coupon).toBeTruthy();
    // Un coupon payé trois semaines après son échéance ne pèse pas pareil dans
    // un taux pondéré par les montants : la date de valeur est la vraie.
    expect(coupon!.date).toBe("2024-10-11");
    expect(coupon!.date).not.toBe(echus[0].date);
  });

  it("les trois coupons constatés comptent, et plus rien n'est attendu", () => {
    const { ligne } = rapport(echus.map((f) => constate(f, { amount: f.amount, valueOn: f.date })));
    expect(ligne.returned).toBe(900_000);
    expect(ligne.attendus).toBe(0);
  });

  it("un mouvement sans clef de flux ne rapproche rien", () => {
    // Une provision, un règlement, des frais : ils ne répondent d'aucune
    // échéance, et les compter comme un coupon reçu serait pire que l'ancien
    // défaut, parce que ce serait du double emploi.
    const provision: CashEntry = { id: "c-prov", userId: "u-rdt", at: "2026-10-02T12:00:00.000Z", amount: 300_000, kind: "provision", label: "Virement du client" };
    const { ligne } = rapport([provision]);
    expect(ligne.returned).toBe(0);
    expect(ligne.attendus).toBe(3);
  });

  it("le rendement se corrige de lui-même quand le desk constate", () => {
    // Rien n'est stocké : le jour où un encaissement en retard est porté au
    // journal, le rendement du client change à la lecture suivante, sans qu'on
    // ait à retoucher un chiffre nulle part.
    const avant = rapport([]).ligne;
    const apres = rapport([constate(echus[2], { amount: 300_000, valueOn: "2026-09-22" })]).ligne;
    expect(avant.returned).toBe(0);
    expect(apres.returned).toBe(300_000);
    expect(apres.gain).toBeGreaterThan(avant.gain);
    expect(apres.attendus).toBeLessThan(avant.attendus);
  });

  it("l'avertissement atteint le client qui ne détient que du primaire", () => {
    /* Le total en francs tient cette ligne à part, faute de cours. Le compte des
       échéances non constatées, lui, doit l'atteindre quand même : c'est le cas
       le plus courant, et le compter sur les seules lignes valorisées laissait
       ces clients sans aucun avis. */
    const { perf, ligne } = rapport([]);
    expect(ligne.valuable).toBe(false);
    expect(perf.unvalued).toBe(1);
    expect(perf.returned).toBe(0);
    expect(perf.attendus).toBe(3);
  });
});
