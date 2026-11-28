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

/* L'ÉTAPE 2 : fourchette, frais, signature par le code du compte, blocage, règlement. */
import { accordsDuDesk, convenirLesFrais, fourchette, mesAccords, passageDuDesk, poserLaFourchette, signerMonAccord } from "@/lib/place-donnees";
import { poserCodeDuCompte } from "@/lib/auth/devices";

const direction = { ...desk, userId: "dir-1", role: "responsable", name: "Direction", email: "dir@exemple.test" } as Session;

describe("de l'accord de principe au règlement", () => {
  it("frais dans la fourchette, dérogation de la direction hors fourchette, signature par code, blocage, règlement", async () => {
    const o = await uneLigne();
    const vendeur = moi("u-v2");
    const acheteur = moi("u-a2");
    /* le vendeur détient des titres : un ordre réglé est hors de portée du test, on dépose donc l'annonce côté acheteur */
    const depot = await deposerUneAnnonce(acheteur, { sens: "achete", offerId: o.id, facial: o.nominal * 20, decoupage: true, prix: 95 });
    if (!depot.ok) throw new Error(depot.erreur);
    await modererUneAnnonce(desk, depot.id, "publier");
    const rep = await repondre(vendeur, depot.id, { facial: o.nominal * 20, prix: 95 });
    if (!rep.ok) throw new Error(rep.erreur);
    const acc = await accepterUneProposition(acheteur, depot.id, rep.id);
    if (!acc.ok) throw new Error(acc.erreur);

    expect((await fourchette()).posee).toBe(false);
    expect((await poserLaFourchette(desk, { pctMin: 0.2, pctMax: 1, plancher: 10_000, plafond: 5_000_000 })).ok).toBe(false);
    expect((await poserLaFourchette(direction, { pctMin: 0.2, pctMax: 1, plancher: 10_000, plafond: 5_000_000 })).ok).toBe(true);

    const [mien] = await mesAccords("u-a2");
    expect(mien).toMatchObject({ role: "acheteur", peutSigner: false });
    const [vu] = (await accordsDuDesk()).filter((x) => x.id === acc.id);
    const milieu = Math.round((vu.permis.min + vu.permis.max) / 2);

    /* un opérateur ne sort pas de la fourchette ; la direction le peut, avec le motif de sa dérogation */
    expect((await convenirLesFrais(desk, acc.id, "vendeur", { montant: vu.permis.max + 1, motif: "négocié" })).ok).toBe(false);
    expect((await convenirLesFrais(direction, acc.id, "vendeur", { montant: vu.permis.max + 1, motif: "négocié", derogation: "gros volume" })).ok).toBe(true);
    expect((await convenirLesFrais(desk, acc.id, "acheteur", { montant: milieu, motif: "accord par téléphone" })).ok).toBe(true);

    /* la vue d'un participant ne porte que ses frais, jamais ceux de l'autre ni une identité */
    const vueAcheteur = (await mesAccords("u-a2"))[0];
    const vueVendeur = (await mesAccords("u-v2"))[0];
    expect(vueAcheteur.mesFrais).toBe(milieu);
    expect(vueVendeur.mesFrais).toBe(vu.permis.max + 1);
    expect(JSON.stringify([vueAcheteur, vueVendeur])).not.toMatch(/u-a2|u-v2|exemple\.test|derogation|gros volume/);

    /* signature : le code du compte, bon ou faux */
    await poserCodeDuCompte(vendeur, "482906");
    await poserCodeDuCompte(acheteur, "135790");
    expect((await signerMonAccord(vendeur, acc.id, "000000")).ok).toBe(false);
    expect((await signerMonAccord(vendeur, acc.id, "482906")).ok).toBe(true);
    expect((await signerMonAccord(vendeur, acc.id, "482906")).ok).toBe(false);
    expect((await passageDuDesk(desk, acc.id, "regler")).ok).toBe(false);
    expect((await signerMonAccord(acheteur, acc.id, "135790")).ok).toBe(true);

    /* blocage des deux côtés, puis seulement le règlement */
    expect((await passageDuDesk(desk, acc.id, "bloquer_fonds")).ok).toBe(true);
    expect((await passageDuDesk(desk, acc.id, "regler")).ok).toBe(false);
    expect((await passageDuDesk(desk, acc.id, "bloquer_titres")).ok).toBe(true);
    expect((await passageDuDesk(desk, acc.id, "regler")).ok).toBe(true);
    expect((await mesAccords("u-a2"))[0]).toMatchObject({ etat: "regle", fondsBloques: true, titresBloques: true });
  });
});
