import { describe, expect, it } from "vitest";
import { repo } from "@/lib/data";
import type { Session } from "@/lib/auth/types";
import { accepterUneProposition, annoncesAModerer, annoncesPubliees, deposerUneAnnonce, ligneAdmise, modererUneAnnonce, placeOuverte, propositionsRecues, repondre, unitePourLaLigne } from "@/lib/place-donnees";

/* LA PLACE DE MARCHÉ, DE BOUT EN BOUT SUR LE DÉPÔT EN MÉMOIRE (28 novembre 2026) : déposer, modérer, publier, répondre, accepter ; l'anonymat tient. */
const moi = (userId: string): Session => ({ userId, role: "client", name: `Nom ${userId}`, email: `${userId}@exemple.test`, segment: "Personne physique", tier: 2, provider: "dev" }) as Session;
const desk = { userId: "desk-1", role: "desk", name: "Desk", email: "desk@exemple.test", segment: "Desk", tier: 2, provider: "dev" } as Session;

async function uneLigne() {
  const o = (await repo().listOffers()).find(ligneAdmise);
  if (!o) throw new Error("aucune ligne admise dans la démonstration");
  return o;
}

describe("la place, de bout en bout", () => {
  it("l'interrupteur est ouvert en démonstration", () => {
    expect(placeOuverte()).toBe(true);
  });
  it("une vente exige les titres ; un facial qui n'est pas un multiple du nominal est refusé", async () => {
    const o = await uneLigne();
    const vente = await deposerUneAnnonce(moi("u-sans-titres"), { sens: "vend", offerId: o.id, facial: o.nominal * 5, decoupage: true, prix: 96 });
    expect(vente.ok).toBe(false);
    const bancal = await deposerUneAnnonce(moi("u-a"), { sens: "achete", offerId: o.id, facial: o.nominal * 5 + 1, decoupage: true, prix: 96 });
    expect(!bancal.ok && bancal.erreur).toMatch(/multiple du nominal/);
  });
  it("déposer, modérer, publier, répondre, accepter : l'accord naît, et l'identité ne sort jamais", async () => {
    const o = await uneLigne();
    const depot = await deposerUneAnnonce(moi("u-acheteur"), { sens: "achete", offerId: o.id, facial: o.nominal * 100, decoupage: true, prix: 94 });
    if (!depot.ok) throw new Error(depot.erreur);
    expect((await annoncesAModerer()).some((a) => a.id === depot.id)).toBe(true);
    expect((await annoncesPubliees("u-vendeur")).some((a) => a.id === depot.id)).toBe(false);
    const sans = await modererUneAnnonce(desk, depot.id, "refuser", "");
    expect(sans.ok).toBe(false);
    expect((await modererUneAnnonce(desk, depot.id, "publier")).ok).toBe(true);
    const vues = await annoncesPubliees("u-vendeur");
    const v = vues.find((a) => a.id === depot.id)!;
    expect(v).toMatchObject({ facial: o.nominal * 100, titres: 100, decoupage: true, mienne: false });
    expect(JSON.stringify(vues)).not.toMatch(/u-acheteur|exemple\.test|Nom u-/);
    const moi2 = await repondre(moi("u-acheteur"), depot.id, { facial: o.nominal * 10, prix: 94 });
    expect(moi2.ok).toBe(false);
    const rep = await repondre(moi("u-vendeur"), depot.id, { facial: o.nominal * 40, prix: 93 });
    if (!rep.ok) throw new Error(rep.erreur);
    const recues = await propositionsRecues(moi("u-acheteur"), depot.id);
    expect(recues?.liste).toHaveLength(1);
    expect(recues?.liste[0]).toMatchObject({ titres: 40, facial: o.nominal * 40, prix: 93 });
    expect(JSON.stringify(recues?.liste)).not.toMatch(/u-vendeur/);
    expect(await propositionsRecues(moi("u-vendeur"), depot.id)).toBeNull();
    const acc = await accepterUneProposition(moi("u-acheteur"), depot.id, rep.id);
    expect(acc.ok).toBe(true);
    const apres = (await annoncesPubliees("u-vendeur")).find((a) => a.id === depot.id)!;
    expect(apres).toMatchObject({ titresOfferts: 60, facialOffert: o.nominal * 60 });
  });
  it("sans découpage, il faut prendre la totalité", async () => {
    const o = await uneLigne();
    const depot = await deposerUneAnnonce(moi("u-ferme"), { sens: "achete", offerId: o.id, facial: o.nominal * 50, decoupage: false, prix: 90 });
    if (!depot.ok) throw new Error(depot.erreur);
    await modererUneAnnonce(desk, depot.id, "publier");
    const part = await repondre(moi("u-autre"), depot.id, { facial: o.nominal * 10, prix: 90 });
    expect(part.ok).toBe(true);
    const toutes = await repondre(moi("u-autre2"), depot.id, { prix: 90 });
    expect(toutes.ok).toBe(true);
  });
  it("l'unité du prix : pourcentage pour la dette, francs pour une action", async () => {
    const o = await uneLigne();
    expect(unitePourLaLigne({ ...o, kind: "OTA" })).toBe("pct");
    expect(unitePourLaLigne({ ...o, kind: "MARCHE", instrument: "action" })).toBe("fcfa");
  });
});
