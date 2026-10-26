import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * CE QUE LE CLIENT DÉPOSE, ET CE QUE LE DESK EN FAIT.
 *
 * Les règles du gabarit sont tenues par « sondage.test.ts » ; ce qu'on mesure
 * ici est ce que les deux actions en font vraiment — le serveur refuse-t-il les
 * mêmes manques que le formulaire, une réponse hérite-t-elle de sa question,
 * une clôture emporte-t-elle les réponses.
 *
 * LE FORMULAIRE EST UNE COMMODITÉ, PAS UNE GARANTIE : ces actions s'appellent
 * sans lui, par un champ retiré à l'inspecteur ou un POST reconstruit. Une
 * règle qui ne vit que dans le navigateur ne vit pas.
 */
const client: Session = { userId: "u-sondeur", role: "client", name: "Son Deur", email: "s@example.com", segment: "Personne physique · Douala", tier: 1, provider: "dev", mfaEnrolled: true, mfaVerified: true, kycStatus: "approuve", conventionAccepted: true };
const desk: Session = { userId: "u-desk", role: "desk", name: "Desk Test", email: "desk@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };
let courant: Session = client;

vi.mock("@/lib/auth", () => ({
  getSession: async () => courant,
  requireSession: async () => courant,
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

const LIGNE = { instrument: "OTA", country: "Cameroun", tenor: "5 ans", montant: "50 000 000", dansJours: "30" };

describe("le dépôt d'une attente par le client", () => {
  it("accepte une ligne complète et la garde telle quelle", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const res = await deposerLaLigne(null, form({ ...LIGNE, rate: "6,5", pricePct: "99" }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    if (!res.ok) return;
    const l = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.ref === res.ref)!;
    expect(l.origine).toBe("client");
    expect(l.montant, "le montant groupé n'a pas été lu").toBe(50_000_000);
    expect(l.rate, "la virgule décimale n'a pas été lue").toBe(6.5);
    expect(l.pricePct).toBe(99);
    expect(l.clientName).toBe(client.name);
    expect(l.state).toBe("ouverte");
  });

  it("refuse ce que le gabarit refuse, avec les mêmes mots", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const sans = async (champ: string) => {
      const f = form(LIGNE);
      f.delete(champ);
      return deposerLaLigne(null, f);
    };
    expect((await sans("tenor")).ok, "une ligne sans durée est passée").toBe(false);
    expect((await sans("montant")).ok, "une ligne sans montant est passée").toBe(false);
    expect((await sans("dansJours")).ok, "une ligne sans « à partir de quand » est passée").toBe(false);
    const r = await deposerLaLigne(null, form({ ...LIGNE, rate: "65" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/faute de frappe/);
  });

  it("refuse un Trésor hors de la zone", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const r = await deposerLaLigne(null, form({ ...LIGNE, country: "France" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/zone/);
  });

  /* UN BON N'A PAS DE PRIX, et l'action le laisse tomber plutôt que de refuser
     l'ordre : le client qui change de compartiment après avoir rempli le prix
     ne doit pas voir son dépôt refusé pour un champ que l'écran venait de
     cacher. C'est la contrainte de la base qui l'exige, et elle est tenue. */
  it("laisse tomber le prix sur un bon au lieu de refuser le dépôt", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const res = await deposerLaLigne(null, form({ ...LIGNE, instrument: "BTA", tenor: "52 semaines", rate: "5,5", pricePct: "99" }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    if (!res.ok) return;
    const l = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.ref === res.ref)!;
    expect(l.pricePct, "un prix a été gardé sur un bon : la base le refusera").toBeUndefined();
    expect(l.rate).toBe(5.5);
  });

  /**
   * UNE RÉPONSE HÉRITE DE SA QUESTION, et c'est tout l'intérêt d'y répondre.
   *
   * Le client y dit « combien » et « quand » ; le Trésor, la durée et le
   * compartiment viennent de la question. Sans cet héritage, un formulaire
   * trafiqué produirait une réponse qui ne répond pas à ce qu'on a demandé, et
   * la consolidation la compterait quand même — sous l'en-tête de la question.
   */
  it("fait hériter une réponse des caractéristiques de sa question", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    const question = (await r.listLignesSondees({ origine: "desk" })).find((q) => q.state !== "close")!;
    expect(question, "le jeu d'essai doit porter une question ouverte").toBeTruthy();

    // On ment sur le pays et la durée : la question doit gagner.
    const res = await deposerLaLigne(null, form({ repondA: question.id, instrument: "BTA", country: "Tchad", tenor: "99 ans", montant: "20 000 000", dansJours: "15" }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    if (!res.ok) return;
    const l = (await r.listLignesSondees({ userId: client.userId })).find((x) => x.ref === res.ref)!;
    expect(l.repondA).toBe(question.id);
    expect(l.country, "la réponse a imposé son propre Trésor à la question").toBe(question.country);
    expect(l.tenor, "la réponse a imposé sa propre durée").toBe(question.tenor);
    expect(l.instrument, "la réponse a imposé son propre compartiment").toBe(question.instrument);
    expect(l.montant).toBe(20_000_000);
  });

  /* DEUX RÉPONSES À LA MÊME QUESTION COMPTERAIENT DEUX FOIS dans le consensus
     porté au Trésor, et le client qui corrige son montant croirait l'avoir
     remplacé. La seconde remplace donc la première. */
  it("remplace la réponse précédente au lieu de l'additionner", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    const question = (await r.listLignesSondees({ origine: "desk" })).find((q) => q.state !== "close")!;
    courant = { ...client, userId: "u-double" };
    await deposerLaLigne(null, form({ repondA: question.id, instrument: "OTA", montant: "10 000 000", dansJours: "10" }));
    await deposerLaLigne(null, form({ repondA: question.id, instrument: "OTA", montant: "40 000 000", dansJours: "10" }));
    const siennes = (await r.listLignesSondees({ userId: "u-double" })).filter((x) => x.repondA === question.id);
    courant = client;
    expect(siennes.filter((x) => x.state !== "close"), "deux réponses vivantes du même client sur la même question").toHaveLength(1);
    expect(siennes.find((x) => x.state !== "close")!.montant).toBe(40_000_000);
    expect(siennes.find((x) => x.state === "close")!.closedReason).toMatch(/Remplacée/);
  });

  it("laisse le client retirer la sienne, et seulement la sienne", async () => {
    const { deposerLaLigne, retirerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const res = await deposerLaLigne(null, form(LIGNE));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const r = repo();
    const mienne = (await r.listLignesSondees({ userId: client.userId })).find((x) => x.ref === res.ref)!;
    expect((await retirerLaLigne(mienne.id)).ok).toBe(true);
    expect((await r.listLignesSondees({ userId: client.userId })).find((x) => x.id === mienne.id)!.state).toBe("close");

    /* CELLE D'UN AUTRE NE SE RETIRE PAS. Sans ce refus, l'identifiant d'une
       attente — qui paraît dans l'URL d'aucune page mais traverse un
       formulaire — suffirait à retirer la demande d'un concurrent. */
    const autre = (await r.listLignesSondees({ origine: "desk" }))[0];
    expect((await retirerLaLigne(autre.id)).ok, "une attente qui n'est pas la sienne s'est retirée").toBe(false);
  });
});

describe("ce que le desk en fait", () => {
  it("pose une question, qui paraît sans nom de client", async () => {
    const { poserLaQuestion } = await import("@/app/desk/sondage/actions");
    const { repo } = await import("@/lib/data");
    const res = await poserLaQuestion(null, form({ instrument: "BTA", country: "Tchad", tenor: "13 semaines", rate: "5", montant: "300 000 000", dansJours: "20" }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    const q = (await repo().listLignesSondees({ origine: "desk" })).find((x) => x.tenor === "13 semaines")!;
    expect(q.userId, "une question du desk porte un client : elle paraîtrait comme l'attente de quelqu'un").toBeUndefined();
    expect(q.montant).toBe(300_000_000);
  });

  /**
   * LA CLÔTURE EMPORTE LES RÉPONSES, et le motif suit.
   *
   * Une réponse à une question close n'attend plus rien ; la laisser ouverte la
   * ferait compter dans un consensus sans en-tête. Et une attente qui disparaît
   * sans un mot est une attente qu'on ne redonnera pas : le client lit le motif
   * sur sa page.
   */
  it("clôt une question avec ses réponses, et chacune porte le motif", async () => {
    const { poserLaQuestion, statuerSurLaLigne } = await import("@/app/desk/sondage/actions");
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    await poserLaQuestion(null, form({ instrument: "OTA", country: "Guinée éq.", tenor: "8 ans", montant: "200 000 000", dansJours: "40" }));
    const q = (await r.listLignesSondees({ origine: "desk" })).find((x) => x.tenor === "8 ans")!;
    courant = { ...client, userId: "u-clos" };
    const rep = await deposerLaLigne(null, form({ repondA: q.id, instrument: "OTA", montant: "15 000 000", dansJours: "12" }));
    courant = client;
    expect(rep.ok).toBe(true);

    const res = await statuerSurLaLigne(null, form({ id: q.id, etat: "close", motif: "Le Trésor a confirmé qu'il n'émettra pas sur cette durée." }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    const toutes = await r.listLignesSondees();
    expect(toutes.find((x) => x.id === q.id)!.state).toBe("close");
    const suite = toutes.find((x) => x.repondA === q.id)!;
    expect(suite.state, "la réponse est restée ouverte sous une question close").toBe("close");
    expect(suite.closedReason, "la réponse a été close sans un mot au client").toBeTruthy();
  });

  it("constate « portée au Trésor » sur la question et ses réponses", async () => {
    const { poserLaQuestion, statuerSurLaLigne } = await import("@/app/desk/sondage/actions");
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    await poserLaQuestion(null, form({ instrument: "OTA", country: "Gabon", tenor: "9 ans", montant: "200 000 000", dansJours: "40" }));
    const q = (await r.listLignesSondees({ origine: "desk" })).find((x) => x.tenor === "9 ans")!;
    courant = { ...client, userId: "u-portee" };
    await deposerLaLigne(null, form({ repondA: q.id, instrument: "OTA", montant: "15 000 000", dansJours: "12" }));
    courant = client;
    await statuerSurLaLigne(null, form({ id: q.id, etat: "consolidee" }));
    const toutes = await r.listLignesSondees();
    expect(toutes.find((x) => x.id === q.id)!.state).toBe("consolidee");
    expect(toutes.find((x) => x.repondA === q.id)!.state).toBe("consolidee");
  });

  it("refuse un état qu'il ne connaît pas", async () => {
    const { statuerSurLaLigne } = await import("@/app/desk/sondage/actions");
    const { repo } = await import("@/lib/data");
    const q = (await repo().listLignesSondees({ origine: "desk" }))[0];
    const res = await statuerSurLaLigne(null, form({ id: q.id, etat: "ouverte" }));
    expect(res.ok).toBe(false);
  });
});
