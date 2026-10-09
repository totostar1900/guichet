import { describe, expect, it } from "vitest";
import { REJETS_AVANT_SUSPENSION, type MandatPrelevement } from "@/lib/domain/mandat";
import type { StandingOrder } from "@/lib/domain/standing";
import {
  AVANCE_SUR_LE_VERSEMENT,
  csvDeLaRemise,
  echeanceDuJour,
  JOURS_AVANT_SECONDE_PRESENTATION,
  JOURS_SANS_NOUVELLE,
  jourDeTirage,
  jourDuPreavis,
  MOTIFS,
  montantDuTirage,
  PREAVIS_JOURS,
  pourquoiPasRemettre,
  refDeLaRemise,
  sansNouvelle,
  suiteDuRejet,
  type MotifDeRejet,
} from "@/lib/domain/prelevement";

/**
 * L'EXÉCUTION DES MANDATS DE PRÉLÈVEMENT.
 *
 * Un virement qui n'arrive pas est un non-événement ; un prélèvement qui
 * échoue est un rejet, il coûte au client et répété il fait casser le mandat.
 * Ces cliquets tiennent les quatre règles qui en découlent, dont deux que rien
 * d'autre ne rattraperait : un tirage ne part pas sans préavis parti, et la
 * cause d'un rejet décide de la suite.
 */
const mandat = (p: Partial<MandatPrelevement> = {}): MandatPrelevement => ({
  id: "m1",
  ref: "MP-2610-TNFW",
  userId: "u1",
  objet: "provision",
  bankName: "Afriland",
  bankAccount: "100 12 345678 90",
  accountHolder: "NITCHEU GEORGES",
  maxAmount: 100_000,
  dayOfMonth: 15,
  amount: 50_000,
  state: "actif",
  signedAt: "2026-10-01T10:00:00.000Z",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  ...p,
});

const instruction = (p: Partial<StandingOrder> = {}): StandingOrder =>
  ({
    id: "s1",
    ref: "IP-2609-4F2",
    userId: "u1",
    clientName: "G. N.",
    clientSegment: "particulier",
    offerId: "o1",
    amount: 200_000,
    source: "virement",
    minAmount: 10_000,
    dayOfMonth: 20,
    startsOn: "2026-09-01",
    state: "active",
    onBlocked: "attendre",
    channel: "WhatsApp",
    ...p,
  }) as StandingOrder;

describe("le jour et le montant d'une échéance", () => {
  it("pour la provision, c'est le jour signé par le client", () => {
    expect(jourDeTirage(mandat())).toBe(15);
    expect(montantDuTirage(mandat())).toBe(50_000);
  });

  it("pour une épargne programmée, le tirage précède le versement", () => {
    /* Sans cette avance, le jour dit le solde est vide et on a prélevé pour
       rien : l'argent arrive le jour où l'instruction cherche à le placer. */
    const m = mandat({ objet: "instruction", standingId: "s1", dayOfMonth: undefined, amount: undefined });
    expect(jourDeTirage(m, instruction())).toBe(20 - AVANCE_SUR_LE_VERSEMENT);
    expect(montantDuTirage(m, instruction())).toBe(200_000);
  });

  it("et une instruction du début du mois ne déborde pas sur le mois d'avant", () => {
    // Borné au 1er : un tirage daté du 29 du mois précédent serait un autre mois.
    const m = mandat({ objet: "instruction", standingId: "s1", dayOfMonth: undefined });
    expect(jourDeTirage(m, instruction({ dayOfMonth: 3 }))).toBe(1);
  });
});

describe("l'échéance du jour, et ce qu'elle écarte", () => {
  const le15 = "2026-10-15";

  it("retient le mandat signé, actif, dont le jour tombe", () => {
    const { aTirer, ecartes } = echeanceDuJour([mandat()], [], le15);
    expect(aTirer.map((x) => x.amount)).toEqual([50_000]);
    expect(ecartes).toEqual([]);
  });

  it("ignore en silence ce qui ne tombe pas ce jour-là, et un mandat non signé", () => {
    expect(echeanceDuJour([mandat({ dayOfMonth: 7 })], [], le15).aTirer).toEqual([]);
    expect(echeanceDuJour([mandat({ dayOfMonth: 7 })], [], le15).ecartes).toEqual([]);
    expect(echeanceDuJour([mandat({ signedAt: undefined })], [], le15).aTirer).toEqual([]);
  });

  it("écarte un mandat suspendu EN LE DISANT, et ne le laisse pas disparaître", () => {
    /* LA PANNE MUETTE DE CE LOT : un mandat qui ne tire plus est silencieux par
       nature. Le client croit son épargne alimentée, le desk voit une liste
       plus courte sans savoir qu'elle l'est, et le mois passe. */
    const { aTirer, ecartes } = echeanceDuJour([mandat({ state: "suspendu", rejects: 2 })], [], le15);
    expect(aTirer).toEqual([]);
    expect(ecartes).toHaveLength(1);
    expect(ecartes[0].raison).toMatch(/Suspendu après 2 rejet/);
  });

  it("écarte une échéance au-dessus du plafond, et dit d'appeler plutôt que de rogner", () => {
    const { aTirer, ecartes } = echeanceDuJour([mandat({ amount: 150_000, maxAmount: 100_000 })], [], le15);
    expect(aTirer).toEqual([]);
    expect(ecartes[0].raison).toMatch(/appelez le client/);
    expect(ecartes[0].montant).toBe(150_000);
  });

  it("écarte un mandat dont l'instruction n'est plus active", () => {
    const m = mandat({ objet: "instruction", standingId: "s1", dayOfMonth: undefined, amount: undefined });
    const s = instruction({ state: "terminee", dayOfMonth: 20 });
    const { aTirer, ecartes } = echeanceDuJour([m], [s], le15);
    expect(aTirer).toEqual([]);
    expect(ecartes[0].raison).toMatch(/n'est plus active/);
  });

  it("signale une révocation récente une fois, puis se tait", () => {
    const recent = mandat({ state: "revoque", revokedAt: "2026-10-12T09:00:00.000Z" });
    const vieux = mandat({ state: "revoque", revokedAt: "2026-05-02T09:00:00.000Z" });
    expect(echeanceDuJour([recent], [], le15).ecartes).toHaveLength(1);
    expect(echeanceDuJour([vieux], [], le15).ecartes).toEqual([]);
  });
});

describe("rien ne part sans préavis parti", () => {
  const base = { state: "prepare" as const, announcedAt: "2026-10-10T08:00:00.000Z", noticeSent: true, dueOn: "2026-10-15" };

  it("laisse partir un tirage annoncé, dont le préavis est parti, le jour venu", () => {
    expect(pourquoiPasRemettre(base, "2026-10-15")).toBeNull();
  });

  it("retient un tirage dont le préavis a échoué", () => {
    /* Le risque assumé : un client au canal cassé n'est pas prélevé. L'inverse
       est de débiter quelqu'un qui n'a pas été prévenu, et c'est pire. */
    expect(pourquoiPasRemettre({ ...base, noticeSent: false }, "2026-10-15")).toBe("pas_parti");
    expect(pourquoiPasRemettre({ ...base, announcedAt: undefined }, "2026-10-15")).toBe("pas_annonce");
  });

  it("ne présente pas avant l'échéance, ni deux fois", () => {
    expect(pourquoiPasRemettre(base, "2026-10-14")).toBe("trop_tot");
    expect(pourquoiPasRemettre({ ...base, state: "remis" }, "2026-10-15")).toBe("deja_remis");
    expect(pourquoiPasRemettre({ ...base, state: "abandonne" }, "2026-10-15")).toBe("abandonne");
  });

  it("annonce cinq jours avant, pas la veille", () => {
    // Un versement se refuse en un jour ; un prélèvement demande d'avoir les fonds.
    expect(PREAVIS_JOURS).toBe(5);
    expect(jourDuPreavis("2026-10-15")).toBe("2026-10-10");
  });
});

describe("la troisième issue, celle qui n'en est pas une", () => {
  const remis = { state: "remis" as const, handedAt: "2026-10-15T09:00:00.000Z" };

  it("se calcule et ne se range pas", () => {
    expect(sansNouvelle(remis, new Date("2026-10-20T09:00:00Z"))).toBe(false);
    expect(sansNouvelle(remis, new Date("2026-10-26T09:00:00Z"))).toBe(true);
    expect(JOURS_SANS_NOUVELLE).toBe(10);
  });

  it("ne qualifie que ce qui est remis et sans sort", () => {
    expect(sansNouvelle({ state: "encaisse", handedAt: remis.handedAt }, new Date("2026-12-01T00:00:00Z"))).toBe(false);
    expect(sansNouvelle({ state: "rejete", handedAt: remis.handedAt }, new Date("2026-12-01T00:00:00Z"))).toBe(false);
    expect(sansNouvelle({ state: "prepare", handedAt: undefined }, new Date("2026-12-01T00:00:00Z"))).toBe(false);
  });
});

describe("la cause d'un rejet décide de la suite, pas le compte", () => {
  it("représente une provision insuffisante, une fois, quinze jours plus tard", () => {
    const r = suiteDuRejet("provision_insuffisante", 1, "2026-10-15");
    expect(r).toEqual({ suite: "represente", le: "2026-10-30" });
    expect(JOURS_AVANT_SECONDE_PRESENTATION).toBe(15);
  });

  it("suspend au second rejet consécutif de cette même cause", () => {
    expect(suiteDuRejet("provision_insuffisante", REJETS_AVANT_SUSPENSION, "2026-10-15").suite).toBe("suspend");
  });

  it("suspend DÈS LE PREMIER rejet pour toute cause qui ne se rejoue pas", () => {
    /* Compter les rejets sans lire leur cause ferait représenter sur un compte
       clos : harceler la banque d'un client pour une faute qui est la nôtre. */
    for (const m of ["compte_clos", "opposition", "coordonnees_erronees", "mandat_inconnu", "autre"] as MotifDeRejet[]) {
      expect(suiteDuRejet(m, 0, "2026-10-15").suite, m).toBe("suspend");
    }
  });

  it("et chaque cause dit au client la suite, pas la panne", () => {
    for (const [k, m] of Object.entries(MOTIFS)) {
      expect(m.auClient.length, k).toBeGreaterThan(40);
      expect(m.libelle.length, k).toBeGreaterThan(3);
    }
    expect(Object.values(MOTIFS).filter((m) => m.rejouable)).toHaveLength(1);
  });
});

describe("le fichier remis à la banque", () => {
  const lignes = [
    { ref: "TP-0001", mandatRef: "MP-2610-TNFW", dueOn: "2026-10-15", titulaire: "NITCHEU GEORGES", banque: "Afriland", compte: "100 12 345678 90", amount: 50_000, libelle: "Provision" },
    { ref: "TP-0002", mandatRef: "MP-2610-QKDR", dueOn: "2026-10-15", titulaire: 'ABENA "MC"', banque: "BGFI; agence 1", compte: "100 98 765432 10", amount: 200_000, libelle: "Épargne" },
  ];

  it("nomme la remise par le mois et le jour de son échéance", () => {
    expect(refDeLaRemise("2026-10-15")).toBe("RP-2610-15");
  });

  it("porte un en-tête, une ligne par tirage et un total", () => {
    const csv = csvDeLaRemise("RP-2610-15", lignes);
    const l = csv.split("\r\n").filter(Boolean);
    expect(l).toHaveLength(4);
    expect(l[0]).toMatch(/^﻿Remise;/);
    expect(l[1]).toContain("MP-2610-TNFW");
    expect(l[3]).toContain("250000");
    expect(l[3]).toContain("2 prelevement(s)");
  });

  it("échappe le point-virgule et le guillemet, qui cassent une colonne en silence", () => {
    /* Une agence écrite « BGFI; agence 1 » décalerait toutes les colonnes
       suivantes d'un cran, et le montant d'un client se lirait sur la ligne
       d'un autre. */
    const csv = csvDeLaRemise("RP-2610-15", lignes);
    expect(csv).toContain('"BGFI; agence 1"');
    expect(csv).toContain('"ABENA ""MC"""');
  });

  it("commence par un BOM, parce qu'il s'ouvre dans l'Excel d'une banque", () => {
    expect(csvDeLaRemise("RP-2610-15", lignes).charCodeAt(0)).toBe(0xfeff);
  });
});

/**
 * LE DÉPÔT TIENT LES DEUX UNICITÉS, et c'est lui qui les tient.
 *
 * Les deux contraintes de la migration 0076 ne sont pas des précautions : une
 * seconde remise pour le même jour, ou un second tirage pour le même mandat à
 * la même échéance, c'est un double prélèvement chez un client. Un double
 * prélèvement ressemble à deux opérations normales et personne ne le voit
 * passer ; c'est à la base de le refuser, pas à un écran.
 *
 * En base c'est une contrainte, en mémoire c'est un garde écrit à la main, et
 * ce cliquet vérifie le second : sans lui, l'essai à blanc laisserait passer
 * ce que la production refuse, et on apprendrait la règle en production.
 */
describe("le dépôt refuse le double prélèvement", () => {
  it("une seule remise par échéance, un seul tirage par mandat et par échéance", async () => {
    const { repo } = await import("@/lib/data");
    const r = repo();
    const dueOn = "2027-03-15";
    await r.creerRemise({ ref: refDeLaRemise(dueOn), dueOn, createdBy: "essai" });
    await expect(r.creerRemise({ ref: refDeLaRemise(dueOn), dueOn })).rejects.toThrow();

    const t1 = await r.creerTirage({ mandatId: "m-essai", userId: "u-essai", dueOn, amount: 50_000 });
    await expect(r.creerTirage({ mandatId: "m-essai", userId: "u-essai", dueOn, amount: 50_000 })).rejects.toThrow();

    /* La seconde présentation d'un rejet porte une AUTRE date : elle passe, et
       c'est ce qui distingue un rattrapage d'un doublon. */
    const t2 = await r.creerTirage({ mandatId: "m-essai", userId: "u-essai", dueOn: "2027-03-30", amount: 50_000, retryOf: t1.id });
    expect(t2.retryOf).toBe(t1.id);
    expect(t2.ref).not.toBe(t1.ref);
    expect(t1.state).toBe("prepare");
    expect(t1.noticeSent).toBe(false);
  });
});
