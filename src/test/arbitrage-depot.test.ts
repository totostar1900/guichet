import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * LES DEUX BORNES SE REFUSENT AU SERVEUR, ET PAS SEULEMENT À L'ÉCRAN.
 *
 * Le formulaire les marque « required » et c'est bien ; mais un formulaire est
 * une COMMODITÉ, pas une garantie. Cette action est appelée sans lui — par un
 * champ retiré à l'inspecteur, par un POST reconstruit, par la page du desk
 * demain. Si la règle ne vit que dans le navigateur, elle ne vit pas.
 *
 * ET IL Y A PIRE QU'UN REFUS MANQUANT. Avant le 26 octobre 2026, le contrôle de
 * la destination ne s'armait que sur « rachat » : une arrivée posée sur une
 * VENTE de ligne cotée était SILENCIEUSEMENT IGNORÉE. L'ordre partait seul, le
 * client croyait son arbitrage en place, et rien, nulle part, ne le
 * contredisait — ni message, ni journal, ni écran. C'est le défaut que la
 * dernière épreuve de cette feuille ferme.
 */
/* LE CLIENT DU JEU D'ESSAI, ET NON UN CLIENT NEUF. Un rachat et une vente se
   refusent à qui ne détient rien — « Vous détenez 0 parts » — donc une session
   inventée mesurerait ce garde-fou-là au lieu des bornes de l'arbitrage. */
const client: Session = { userId: "dev-client-g-nitcheu", role: "client", name: "G. Nitcheu", email: "arb@example.com", phone: "+237600000001", segment: "Personne physique · Yaoundé", tier: 1, provider: "dev", mfaEnrolled: true, mfaVerified: true, kycStatus: "approuve", conventionAccepted: true };

vi.mock("@/lib/auth", () => ({
  getSession: async () => client,
  requireSession: async () => client,
  requireDesk: async () => client,
  requireResponsable: async () => client,
  authMode: () => "dev",
}));
vi.mock("next/cache", () => FAUX_NEXT_CACHE);

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

/** Un rachat de parts, avec la preuve du numéro déjà faite. */
async function depot(champs: Record<string, string>) {
  const { submitIntent, sendPhoneProof, checkPhoneProof } = await import("@/app/offres/[id]/actions");
  const sent = await sendPhoneProof("6 87 67 67 68");
  if (sent.ok && sent.demoCode) await checkPhoneProof("6 87 67 67 68", sent.demoCode);
  const f = new FormData();
  f.set("offerId", "fcp-monetaire");
  f.set("type", "rachat");
  f.set("amount", "10");
  f.set("firstName", "Arbi");
  f.set("lastName", "Trage");
  f.set("contactPhone", "6 87 67 67 68");
  f.set("contactEmail", "arb@example.com");
  f.set("channel", "WhatsApp");
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return submitIntent(null, f);
}

/** Une date à portée de la fenêtre, lue au jour du test plutôt qu'écrite en dur. */
const dansTrenteJours = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

describe("le dépôt d'un arbitrage", () => {
  it("refuse une arrivée sans plancher, et le dit en français", async () => {
    const res = await depot({ switchToOffer: "fcp-obligataire", switchBy: dansTrenteJours() });
    expect(res.ok, "un arbitrage sans plancher est passé").toBe(false);
    expect(!res.ok && res.error).toMatch(/plancher/i);
  });

  it("refuse une arrivée sans date limite", async () => {
    const res = await depot({ switchToOffer: "fcp-obligataire", switchFloor: "500000" });
    expect(res.ok, "un arbitrage sans date limite est passé").toBe(false);
    expect(!res.ok && res.error).toMatch(/date limite/i);
  });

  it("refuse une date déjà passée, qui armerait un arbitrage mort-né", async () => {
    const res = await depot({ switchToOffer: "fcp-obligataire", switchFloor: "500000", switchBy: "2020-01-01" });
    expect(res.ok).toBe(false);
    expect(!res.ok && res.error).toMatch(/passée/i);
  });

  it("refuse une arrivée que la doctrine n'admet pas, et nomme la raison", async () => {
    /* Une adjudication : son allocation n'est pas décidée par la maison et
       n'est connue que des jours plus tard. Le refus doit le DIRE — un trou
       nommé vaut mieux qu'une promesse plausible. */
    const res = await depot({ switchToOffer: "rca-ota-c-2028", switchFloor: "500000", switchBy: dansTrenteJours() });
    expect(res.ok).toBe(false);
    expect(!res.ok && res.error).toMatch(/adjudication|émission/i);
  });

  it("accepte l'arbitrage complet, et garde les deux bornes sur l'ordre", async () => {
    const { repo } = await import("@/lib/data");
    const limite = dansTrenteJours();
    const res = await depot({ switchToOffer: "fcp-obligataire", switchFloor: "500000", switchBy: limite });
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    if (!res.ok) return;
    const i = (await repo().listIntents()).find((x) => x.ref === res.ref)!;
    expect(i.switchToOfferId).toBe("fcp-obligataire");
    expect(i.switchFloor, "le plancher n'a pas été gardé : le desk n'aura rien à vérifier").toBe(500_000);
    expect(i.switchBy, "la date n'a pas été gardée : le robot n'aura rien à éteindre").toBe(limite);
  });

  /**
   * LE DÉFAUT MUET, ET C'EST LUI QUI JUSTIFIE TOUTE CETTE FEUILLE.
   *
   * Sur une VENTE de ligne cotée, l'ancien contrôle ne regardait rien :
   * « switchToOffer && type === "rachat" ». La destination tombait dans le
   * vide, l'ordre partait seul, et le client avait signé un arbitrage qui
   * n'existait nulle part. Aucun écran ne l'aurait dit, parce qu'il n'y avait
   * rien à dire : l'ordre était parfaitement valide.
   */
  it("arme aussi depuis une vente de ligne cotée, au lieu d'ignorer l'arrivée en silence", async () => {
    const { submitIntent, sendPhoneProof, checkPhoneProof } = await import("@/app/offres/[id]/actions");
    const { repo } = await import("@/lib/data");
    /* IL FAUT DÉTENIR POUR VENDRE : le jeu d'essai ne donne à ce client aucune
       action cotée, donc on lui en règle une ici. C'est la seule façon
       d'atteindre la branche « vente », qui est celle que la généralisation
       ouvre et que l'ancien code ignorait. */
    const achat = await repo().createIntent({ offerId: "mkt-bhc", type: "achat", amount: 100, channel: "E-mail", clientId: client.userId, clientName: client.name, clientSegment: client.segment });
    await repo().updateIntent(achat.id, { state: "reglee", servedUnits: 100 });
    const sent = await sendPhoneProof("6 87 67 67 68");
    if (sent.ok && sent.demoCode) await checkPhoneProof("6 87 67 67 68", sent.demoCode);
    const limite = dansTrenteJours();
    const f = new FormData();
    f.set("offerId", "mkt-bhc");
    f.set("type", "vente");
    f.set("amount", "10");
    f.set("firstName", "Arbi");
    f.set("lastName", "Trage");
    f.set("contactPhone", "6 87 67 67 68");
    f.set("contactEmail", "arb@example.com");
    f.set("channel", "WhatsApp");
    f.set("switchToOffer", "fcp-obligataire");
    f.set("switchFloor", "100000");
    f.set("switchBy", limite);
    const res = await submitIntent(null, f);
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    if (!res.ok) return;
    const i = (await repo().listIntents()).find((x) => x.ref === res.ref)!;
    expect(i.switchToOfferId, "l'arrivée posée sur une vente est de nouveau ignorée en silence").toBe("fcp-obligataire");
    expect(i.switchFloor).toBe(100_000);
    expect(i.switchBy).toBe(limite);
  });

  /* NON VACUITÉ : un ordre ordinaire, sans arrivée, ne doit rien se voir
     demander. Sans cette ligne, les quatre refus ci-dessus passeraient au vert
     sur une action qui refuserait TOUS les ordres. */
  it("et laisse passer un ordre ordinaire, qui ne porte aucune borne", async () => {
    const { repo } = await import("@/lib/data");
    const res = await depot({});
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    if (!res.ok) return;
    const i = (await repo().listIntents()).find((x) => x.ref === res.ref)!;
    expect(i.switchToOfferId).toBeUndefined();
    expect(i.switchFloor).toBeUndefined();
    expect(i.switchBy).toBeUndefined();
  });
});
