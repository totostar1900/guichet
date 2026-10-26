import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * QUAND L'ARGENT DU CLIENT BOUGE, LE CLIENT L'APPREND.
 *
 * CE QUE LA REVUE DES PAGES CLIENT A TROUVÉ, le 26 octobre 2026 : cinq gestes
 * du desk déplaçaient de l'argent sur le compte d'un client sans qu'un mot ne
 * parte. Il l'apprenait EN REVENANT — l'accueil montre la position, l'avis
 * dort dans ses pièces — et « plus rien » ressemble trait pour trait à « rien
 * n'est arrivé ».
 *
 * DEUX DE CES SILENCES DÉMENTAIENT UNE PROMESSE ÉCRITE :
 *
 *   LE ROBOT DES COUPONS annonce l'échéance et finit par « nous vous le
 *   confirmons par un avis dès qu'il est constaté ». Le geste qui le constate
 *   n'envoyait rien.
 *
 *   LE MOTIF D'UN REFUS est obligatoire au formulaire ET en base — « c'est
 *   l'argent du client que la maison garde, et il lira ce motif » — et il
 *   attendait que le client revienne le lire.
 *
 * CES ÉPREUVES LISENT CE QUI PART, pas le code : un envoi peut être appelé et
 * ne rien dire d'utile. On vérifie le montant, de quoi reconnaître la ligne, et
 * ce que le message NE DIT PAS.
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
});

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
/* Le client du jeu d'essai qui a un contact : sans canal, on ne mesurerait que
   le cas d'échec, et c'est le cas de succès qui manquait. */
const CLIENT = "dev-client-g-nitcheu";
const dits = async (motif: RegExp) => {
  const { repo } = await import("@/lib/data");
  return (await repo().listNotifications(300)).filter((n) => motif.test(n.body)).map((n) => n.body);
};

describe("ce que le client apprend quand son argent bouge", () => {
  it("dit la provision reçue, et nomme l'ordre qu'elle sert", async () => {
    const { recordProvision } = await import("@/app/desk/intentions/[id]/cash-actions");
    const res = await recordProvision(null, form({ intentId: "i-003", amount: "3 000 000" }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    const envoyes = await dits(/provision/i);
    expect(envoyes.length, "une provision est reçue et le client n'apprend rien : « mon virement est-il arrivé ? » reste sans réponse").toBeGreaterThan(0);
    expect(envoyes[0], "le message ne dit pas le montant reçu").toMatch(/3\s?000\s?000/);
    expect(envoyes[0], "le message ne nomme pas l'ordre : le client ne sait pas à quoi son argent est affecté").toMatch(/PF-1018-003/);
    /* CE QU'IL NE DOIT PAS DIRE : une provision reçue n'est pas un titre
       acheté, et promettre l'un pour l'autre ferait attendre une ligne qui
       n'existe pas encore. */
    expect(envoyes[0], "le message promet des titres pour un virement reçu").not.toMatch(/servi|titres vous sont|vous recevrez des titres/i);
  });

  it("dit le versement parti, avec l'écart si le disponible a bougé", async () => {
    const { repo } = await import("@/lib/data");
    const r = repo();
    /* Un disponible, et une demande ouverte dessus : c'est l'état dans lequel
       le desk trouve une demande de versement. */
    await r.addCash({ userId: CLIENT, amount: 400_000, kind: "coupon", label: "Coupon", createdBy: "test" });
    const demande = await r.askPayout({ userId: CLIENT, askedAmount: 300_000 });
    const { payerRestitution } = await import("@/app/desk/encaissements/payout-actions");
    const res = await payerRestitution(null, form({ payoutId: demande.id }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    const envoyes = await dits(/virés sur votre compte bancaire/);
    expect(envoyes.length, "l'argent est parti et le client n'apprend rien — alors que l'avis de versement, lui, est fabriqué").toBeGreaterThan(0);
    /* L'ÉCART EST DIT : le disponible bouge entre la demande et le virement, et
       un client qui a demandé 300 000 et en reçoit plus doit lire pourquoi ici
       plutôt que le deviner. */
    expect(envoyes[0], "le message ne dit pas ce qui a été demandé quand le montant diffère").toMatch(/demandé/);
    expect(envoyes[0], "le message ne renvoie pas à l'avis, qui est pourtant produit").toMatch(/avis de versement/);
  });

  it("dit le refus, et porte son motif", async () => {
    const { repo } = await import("@/lib/data");
    const r = repo();
    const demande = await r.askPayout({ userId: CLIENT, askedAmount: 90_000 });
    const { refuserRestitution } = await import("@/app/desk/encaissements/payout-actions");
    const res = await refuserRestitution(null, form({ payoutId: demande.id, reason: "Votre RIB ne correspond pas au titulaire du compte." }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    const envoyes = await dits(/n'a pas été exécutée/);
    expect(envoyes.length, "un refus de verser part sans un mot : le client attend un virement sans savoir pourquoi").toBeGreaterThan(0);
    expect(envoyes[0], "le motif n'est pas dans le message, alors qu'il est obligatoire en base").toMatch(/RIB ne correspond pas/);
    /* ET IL DIT QUE L'ARGENT RESTE : un refus sans cette phrase se lit comme
       une perte. */
    expect(envoyes[0], "le message ne dit pas que l'argent reste au client").toMatch(/reste sur votre compte/);
    expect(envoyes[0], "le message ne dit pas qu'il peut redemander").toMatch(/redemander/);
  });

  it("dit le crédit constaté, qui est la confirmation promise par le robot des coupons", async () => {
    const { porterAuJournal } = await import("@/app/desk/encaissements/actions");
    const res = await porterAuJournal(
      null,
      form({
        userId: CLIENT,
        flowKey: "test-coupon-2026-11-02",
        amount: "250000",
        expected: "250000",
        evidence: "Relevé BGFI ligne 42",
        valueOn: "2026-10-20",
        label: "Coupon",
        date: "2026-11-02",
        titre: "OTA RCA 6,25 % 2028",
      }),
    );
    expect(res.ok, res.ok ? "" : ("error" in res ? res.error : "")).toBe(true);
    const envoyes = await dits(/constaté sur votre compte/);
    expect(envoyes.length, "le robot promet « nous vous le confirmons dès qu'il est constaté » et rien ne part").toBeGreaterThan(0);
    /* DE QUOI RECONNAÎTRE LA LIGNE SUR UN RELEVÉ : le montant, la date de
       valeur, et le titre. C'est la leçon de l'encaissement d'un prélèvement. */
    expect(envoyes[0], "le message ne dit pas le montant").toMatch(/250\s?000/);
    expect(envoyes[0], "le message ne dit pas la date de valeur").toMatch(/20 oct/);
    expect(envoyes[0], "le message ne dit pas sur quelle ligne").toMatch(/OTA RCA/);
  });

  it("dit la reprise d'un prélèvement, parce que l'arrêt avait été annoncé", async () => {
    /* L'ASYMÉTRIE QUI NE TENAIT PAS : le rejet dit « votre prélèvement est
       ARRÊTÉ : nous ne présenterons plus rien tant que nous n'aurons pas repris
       les choses avec vous ». Le desk le réactivait en silence, et le client —
       qui avait lu l'arrêt noir sur blanc — découvrait un débit sur son relevé.
       C'est le même principe que le préavis : reprendre sans le dire, c'est
       reprendre sans préavis. */
    const { repo } = await import("@/lib/data");
    const r = repo();
    const m = await r.createMandat({
      userId: CLIENT,
      objet: "provision",
      amount: 50_000,
      dayOfMonth: 5,
      accountHolder: "G. Nitcheu",
      bankName: "Afriland First Bank",
      bankAccount: "10005 00001 12345678901 76",
    });
    await r.updateMandat(m.id, { state: "suspendu", signedAt: new Date().toISOString() });
    const { reactiverLeMandat } = await import("@/app/desk/prelevements/actions");
    const res = await reactiverLeMandat(null, form({ id: m.id }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    const envoyes = await dits(/est repris/);
    expect(envoyes.length, "le prélèvement reprend en silence après un arrêt annoncé").toBeGreaterThan(0);
    expect(envoyes[0], "le message ne nomme pas le mandat repris").toContain(m.ref);
    expect(envoyes[0], "le message ne dit pas que chaque échéance sera annoncée").toMatch(/annoncée cinq jours avant/);
  });

  it("dit les droits de garde prélevés, et cite l'avis qui les détaille", async () => {
    /**
     * LE SEUL MESSAGE DE CE LOT QUI ANNONCE UN DÉBIT.
     *
     * « Un frais qu'on ne voit qu'en ligne est un frais qu'on subit ; celui
     * qu'on peut citer dans une réclamation est un frais qu'on vérifie » — c'est
     * écrit au-dessus de la fabrication de l'avis, et c'était vrai à moitié : le
     * papier était fabriqué, numéroté, déposé dans les pièces du client, et
     * personne ne lui disait qu'il existait.
     *
     * LE MESSAGE EST ÉPROUVÉ ICI, ET SON CÂBLAGE PAR LA SOURCE, plus bas : le
     * geste est dormant — le barème est fermé à zéro par décision de la
     * maison — et le conduire demanderait d'ouvrir le barème ET de bâtir un
     * historique de positions sur un trimestre. Le jour où le barème s'ouvrira,
     * cette épreuve-là vaudra d'être écrite.
     */
    const { direLesDroitsDeGarde } = await import("@/lib/notify/espece");
    const envoi = await direLesDroitsDeGarde(CLIENT, { montant: 12_500, periode: "2026-T3", ref: "AG-2026T3-0007" });
    expect(envoi.sent || envoi.error, "rien n'a été tenté").toBeTruthy();
    const envoyes = await dits(/droits de garde/i);
    expect(envoyes.length, "le client est prélevé et n'apprend rien").toBeGreaterThan(0);
    expect(envoyes[0], "le message ne dit pas le montant prélevé").toMatch(/12\s?500/);
    expect(envoyes[0], "le message ne dit pas la période : un frais sans période ne se vérifie pas").toContain("2026-T3");
    expect(envoyes[0], "le message ne cite pas l'avis, que le client citera s'il conteste").toContain("AG-2026T3-0007");
    expect(envoyes[0], "le message ne dit pas que le détail du calcul existe").toMatch(/ligne par ligne/);
  });

  it("ne prélève pas en silence, et ne dit rien quand rien n'est dû", async () => {
    /* LE CÂBLAGE, PAR LA SOURCE. Deux choses, et la seconde compte autant : le
       message part, et il NE PART PAS quand le barème fermé ne doit rien —
       annoncer un prélèvement de zéro franc apprendrait à ne plus lire ces
       messages-là. */
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(__dirname, "../app/desk/garde/actions.ts"), "utf8");
    expect(src, "l'émission d'un avis de garde ne prévient plus le client du prélèvement").toMatch(/direLesDroitsDeGarde\(c\.clientId/);
    expect(src, "le message part même quand rien n'est dû").toMatch(/if \(d\.du > 0\) \{[\s\S]{0,400}direLesDroitsDeGarde/);
    expect(src, "le desk ne saura pas que le client n'a pas été joint").toMatch(/client non prévenu<\/b> du prélèvement/);
  });

  it("ne laisse pas un canal injoignable défaire une écriture d'espèces", async () => {
    /* LA RÈGLE DES CINQ : l'argent est parti, et un message qui ne part pas se
       voit au fil du desk, nommément. Faire reculer une écriture parce qu'un
       canal est muet serait le pire des deux maux. Le client sans contact est
       celui qui le prouve. */
    const { repo } = await import("@/lib/data");
    const r = repo();
    const sansCanal = "u-sans-canal";
    await r.addCash({ userId: sansCanal, amount: 70_000, kind: "coupon", label: "Coupon", createdBy: "test" });
    const demande = await r.askPayout({ userId: sansCanal, askedAmount: 70_000 });
    const { payerRestitution } = await import("@/app/desk/encaissements/payout-actions");
    const res = await payerRestitution(null, form({ payoutId: demande.id }));
    expect(res.ok, "le versement a été refusé parce que le client est injoignable").toBe(true);
    const paye = (await r.listPayouts()).find((p) => p.id === demande.id);
    expect(paye?.state, "le versement n'a pas été écrit").toBe("payee");
    const fil = (await r.listEvents(60)).map((e) => e.html);
    expect(fil.some((h) => /client non prévenu/.test(h)), "le desk ne sait pas que le client n'a pas été joint").toBe(true);
  });
});
