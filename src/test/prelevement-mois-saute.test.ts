import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * UN MOIS REFUSÉ EST SAUTÉ, DEUX MOIS DE SUITE ARRÊTENT, ET CHAQUE ISSUE SE DIT.
 *
 * Les règles du prélèvement, arrêtées le 25 octobre 2026, jouées à travers
 * l'action du desk plutôt que lues dans son code. Trois d'entre elles ne se
 * voient nulle part ailleurs :
 *
 *   RIEN N'ENTRE AU CALENDRIER APRÈS UN REJET. Une seconde présentation s'y
 *   inscrivait quinze jours plus tard. C'est une seconde chance à l'intention
 *   du client, et une seconde ponction d'incident à ses frais s'il n'a toujours
 *   rien : il paie deux fois pour le même mois.
 *
 *   DEUX MOIS REFUSÉS DE SUITE ARRÊTENT, et le compteur repart de zéro au
 *   premier encaissement — deux rejets séparés de six mois de prélèvements
 *   réussis ne sont pas un acharnement.
 *
 *   CHAQUE ISSUE SE DIT AU CLIENT, y compris l'heureuse. L'encaissement était
 *   muet : le client recevait l'annonce cinq jours avant, puis plus rien, et
 *   « plus rien » ressemble trait pour trait à un prélèvement qui n'a pas
 *   abouti, le jour où il ouvre son relevé.
 */
const DESK = { userId: "d-essai", name: "Desk Essai", role: "responsable", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };
vi.mock("@/lib/auth", () => ({ requireDesk: async () => DESK, requireResponsable: async () => DESK, requireSession: async () => DESK, getSession: async () => DESK }));
vi.mock("@/lib/audit", () => ({ audit: async () => {} }));
vi.mock("next/cache", () => FAUX_NEXT_CACHE);

/** Ce que la maison a tenté de dire au client, par issue. */
const dits: { quoi: string; texte: string }[] = [];
vi.mock("@/lib/notify/prelevement", async (orig) => {
  const vrai = (await orig()) as Record<string, unknown>;
  return {
    ...vrai,
    envoyerPreavisDePrelevement: async () => ({ sent: true }),
    direLEncaissement: async (_m: unknown, p: { amount: number }) => {
      dits.push({ quoi: "encaissement", texte: String(p.amount) });
      return { sent: true };
    },
    direLeRejet: async (_m: unknown, p: { prochaine?: string }) => {
      dits.push({ quoi: "rejet", texte: p.prochaine ?? "arrêt" });
      return { sent: true };
    },
  };
});

const champs = (o: Record<string, string>): FormData => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
};

describe("le sort d'un prélèvement, joué par l'action du desk", () => {
  beforeEach(() => {
    vi.resetModules();
    dits.length = 0;
  });

  it("saute le mois sur un premier rejet : aucun tirage n'entre au calendrier, et le client est prévenu de la date", async () => {
    const { repo } = await import("@/lib/data");
    const { direLeSort } = await import("@/app/desk/prelevements/actions");
    const r = repo();

    const m = await r.createMandat({ userId: "u-saut", objet: "provision", bankName: "Banque d'essai", bankAccount: "CM21 00000 00000 00000000000 01", accountHolder: "Client Sauté", amount: 50_000, dayOfMonth: 15 });
    await r.updateMandat(m.id, { signedAt: "2026-10-01T08:00:00.000Z" });
    const t = await r.creerTirage({ mandatId: m.id, userId: "u-saut", dueOn: "2026-10-15", amount: 50_000 });
    await r.updateTirage(t.id, { state: "remis", announcedAt: "2026-10-10", noticeSent: true, handedAt: "2026-10-15T09:00:00.000Z" });

    const avant = (await r.listTirages()).filter((x) => x.mandatId === m.id).length;
    const res = await direLeSort(null, champs({ id: t.id, sort: "rejete", motif: "provision_insuffisante" }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);

    /* RIEN N'A ÉTÉ AJOUTÉ : c'est tout le changement. */
    const apres = (await r.listTirages()).filter((x) => x.mandatId === m.id);
    expect(apres.length, "une seconde présentation est entrée au calendrier").toBe(avant);
    expect(apres[0].state).toBe("rejete");

    /* Le mandat vit encore : le mois est sauté, pas le mandat. */
    const m2 = (await r.listMandats("u-saut"))[0];
    expect(m2.state, "le mandat s'est arrêté dès le premier mois refusé").toBe("actif");
    expect(m2.rejects).toBe(1);

    /* Et le client a reçu la DATE de la prochaine échéance, pas la promesse
       d'une seconde tentative. */
    expect(dits).toHaveLength(1);
    expect(dits[0].quoi).toBe("rejet");
    expect(dits[0].texte, "le client n'apprend pas quand on revient").toBe("2026-11-15");
    expect(res.ok && res.message).toMatch(/sauté/);
  });

  it("arrête au second mois refusé de suite", async () => {
    const { repo } = await import("@/lib/data");
    const { direLeSort } = await import("@/app/desk/prelevements/actions");
    const r = repo();

    const m = await r.createMandat({ userId: "u-arret", objet: "provision", bankName: "Banque d'essai", bankAccount: "CM21 00000 00000 00000000000 02", accountHolder: "Client Arrêté", amount: 50_000, dayOfMonth: 15 });
    await r.updateMandat(m.id, { signedAt: "2026-10-01T08:00:00.000Z", rejects: 1 });
    const t = await r.creerTirage({ mandatId: m.id, userId: "u-arret", dueOn: "2026-11-15", amount: 50_000 });
    await r.updateTirage(t.id, { state: "remis", announcedAt: "2026-11-10", noticeSent: true, handedAt: "2026-11-15T09:00:00.000Z" });

    const res = await direLeSort(null, champs({ id: t.id, sort: "rejete", motif: "provision_insuffisante" }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    const m2 = (await r.listMandats("u-arret"))[0];
    expect(m2.state, "deux mois refusés de suite et le prélèvement continue").toBe("suspendu");
    expect(m2.rejects).toBe(2);
    expect(dits[0].texte, "le client reçoit encore une date de reprise alors que tout est arrêté").toBe("arrêt");
    expect(res.ok && res.message).toMatch(/arrêté/i);
  });

  it("arrête dès le premier mois quand la cause ne se répare pas, sans attendre le second", async () => {
    const { repo } = await import("@/lib/data");
    const { direLeSort } = await import("@/app/desk/prelevements/actions");
    const r = repo();

    const m = await r.createMandat({ userId: "u-clos", objet: "provision", bankName: "Banque d'essai", bankAccount: "CM21 00000 00000 00000000000 03", accountHolder: "Compte Clos", amount: 50_000, dayOfMonth: 15 });
    await r.updateMandat(m.id, { signedAt: "2026-10-01T08:00:00.000Z" });
    const t = await r.creerTirage({ mandatId: m.id, userId: "u-clos", dueOn: "2026-10-15", amount: 50_000 });
    await r.updateTirage(t.id, { state: "remis", announcedAt: "2026-10-10", noticeSent: true, handedAt: "2026-10-15T09:00:00.000Z" });

    await direLeSort(null, champs({ id: t.id, sort: "rejete", motif: "compte_clos" }));
    expect((await r.listMandats("u-clos"))[0].state).toBe("suspendu");
  });

  it("dit l'encaissement au client, et remet le compteur des mois refusés à zéro", async () => {
    const { repo } = await import("@/lib/data");
    const { direLeSort } = await import("@/app/desk/prelevements/actions");
    const r = repo();

    const m = await r.createMandat({ userId: "u-ok", objet: "provision", bankName: "Banque d'essai", bankAccount: "CM21 00000 00000 00000000000 04", accountHolder: "Client Payé", amount: 50_000, dayOfMonth: 15 });
    await r.updateMandat(m.id, { signedAt: "2026-10-01T08:00:00.000Z", rejects: 1 });
    const t = await r.creerTirage({ mandatId: m.id, userId: "u-ok", dueOn: "2026-10-15", amount: 50_000 });
    await r.updateTirage(t.id, { state: "remis", announcedAt: "2026-10-10", noticeSent: true, handedAt: "2026-10-15T09:00:00.000Z" });

    const res = await direLeSort(null, champs({ id: t.id, sort: "encaisse" }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);

    /* L'ARGENT ENTRE AU JOURNAL, comme un virement reçu : il n'y a qu'une façon
       pour l'argent d'entrer chez un client. */
    const espèces = await r.listCash("u-ok");
    expect(espèces.some((x) => x.amount === 50_000 && x.kind === "provision")).toBe(true);

    /* ET IL SE DIT. C'était la seule issue muette. */
    expect(dits, "l'encaissement ne se dit toujours pas au client").toHaveLength(1);
    expect(dits[0].quoi).toBe("encaissement");
    expect(res.ok && res.message).toMatch(/prévenu/);

    expect((await r.listMandats("u-ok"))[0].rejects, "le compteur ne repart pas de zéro : deux rejets séparés par un encaissement arrêteraient le mandat").toBe(0);
  });
});
