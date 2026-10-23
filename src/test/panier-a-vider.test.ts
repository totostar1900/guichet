import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ordreSignable, retirableParLeClient } from "@/lib/domain/intent";
import type { Intent, IntentState } from "@/lib/domain/types";
import { SUJETS, TEXTE_PAR_DEFAUT } from "@/lib/domain/relance";

/**
 * LE PANIER QU'ON PEUT VIDER, ET CELUI QU'ON NE PEUT PAS.
 *
 * Une procédure laissée en route n'avait qu'une issue : la finir. Celui qui
 * ne voulait plus ne pouvait rien faire, donc il ne faisait rien, et son
 * ordre restait au carnet du desk jusqu'à devenir un manquement inscrit à sa
 * tenue (cinq jours ouvrés, « clientele »). Un panier qu'on ne peut pas vider
 * se garde plein.
 *
 * CE CLIQUET TIENT LA FRONTIÈRE, parce qu'elle est fine et qu'elle coûte des
 * deux côtés : trop étroite, le client doit téléphoner pour renoncer ; trop
 * large, on laisserait croire qu'on rattrape un ordre déjà parti au marché.
 */
const ordre = (p: Partial<Intent> = {}): Intent =>
  ({
    id: "i-1",
    ref: "PF-0001",
    offerId: "o-1",
    offerVersion: 1,
    clientId: "u-1",
    clientName: "Awa",
    clientSegment: "Personne physique · Douala",
    type: "souscription",
    amount: 100_000,
    channel: "Guichet",
    state: "recue" as IntentState,
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
    ...p,
  }) as Intent;

describe("vider son panier", () => {
  it("rend au client l'ordre confirmé qu'il n'a pas signé", () => {
    /* LE CAS QUI A MOTIVÉ LE CHANGEMENT, le 23 octobre 2026. C'est le panier
       abandonné le plus fréquent — le bulletin est prêt, le client va
       chercher son téléphone pour le code, et ne revient pas. La règle
       s'arrêtait à « reçue », au motif que le bordereau est édité dès la
       confirmation ; mais rien n'est transmis et rien n'est engagé au
       marché, et c'est la signature qui engage. */
    expect(retirableParLeClient(ordre({ state: "confirmee" }))).toBe(true);
    expect(retirableParLeClient(ordre({ state: "recue" }))).toBe(true);
    expect(retirableParLeClient(ordre({ state: "contre_proposee" }))).toBe(true);
  });

  it("ne le rend plus dès qu'il a signé", () => {
    for (const state of ["recue", "confirmee", "contre_proposee"] as IntentState[])
      expect(retirableParLeClient(ordre({ state, signedAt: "2026-10-02T10:00:00.000Z" })), state).toBe(false);
  });

  it("ne promet jamais de rattraper un ordre parti", () => {
    for (const state of ["transmise", "servie", "non_servie", "reglee", "annulee"] as IntentState[])
      expect(retirableParLeClient(ordre({ state })), state).toBe(false);
  });

  /* LA PROMESSE QUI TIENT TOUT LE RESTE : tout ce que la maison annonce comme
     « à signer » doit pouvoir se retirer. Un devoir qu'on ne peut ni finir ni
     quitter est une impasse, et c'est précisément ce que ce lot ferme. */
  it("laisse une sortie à TOUT ordre que la maison dit « à signer »", () => {
    const etats: IntentState[] = ["recue", "confirmee", "contre_proposee", "transmise", "servie", "non_servie", "reglee", "annulee"];
    const sans: string[] = [];
    for (const state of etats)
      for (const type of ["souscription", "rachat", "ferme", "achat", "vente", "appetit", "info"] as Intent["type"][]) {
        const i = ordre({ state, type, maxAmount: 1_000_000 });
        if (ordreSignable(i) && !retirableParLeClient(i)) sans.push(`${type} · ${state}`);
      }
    expect(sans, `ces ordres s'annoncent « à signer » sans pouvoir être retirés :\n  ${sans.join("\n  ")}`).toEqual([]);
  });
});

describe("les rappels disent les deux issues", () => {
  /* Un message qui ne sait dire que « signez » laisse sans réponse celui qui
     ne veut plus. Contre l'intuition, nommer la sortie fait RÉPONDRE
     davantage : un message dont on sait qu'il n'engage à rien s'ouvre sans
     crainte. */
  const AVEC_PANIER = ["signature", "contre_proposition", "mandat"] as const;

  it("nomme la sortie partout où il y a un panier à vider", () => {
    const muets = AVEC_PANIER.filter((s) => !/retir|supprim/i.test(TEXTE_PAR_DEFAUT[s].texte));
    expect(muets, `ces rappels n'offrent qu'une issue :\n  ${muets.join("\n  ")}`).toEqual([]);
  });

  it("ne la promet pas là où il n'y a rien à vider", () => {
    /* Une convention approuvée n'est pas un panier mais une offre que la
       maison a faite, et un dossier en examen n'est pas un achat. Leur
       promettre un retrait serait un bouton qui n'existe pas. */
    for (const s of SUJETS.filter((x) => !AVEC_PANIER.includes(x as (typeof AVEC_PANIER)[number])))
      expect(/retirez|supprimez/i.test(TEXTE_PAR_DEFAUT[s].texte), s).toBe(false);
  });
});

describe("la sourdine a quitté la pastille", () => {
  /* Elle a vécu une journée. Faire taire un rappel laissait le panier plein
     et l'ordre au carnet : une troisième issue qui n'en est pas une. Le
     bouton a changé de main, il n'a pas disparu — le desk l'a, pour le
     client qui téléphone. */
  it("le client n'a plus de bouton pour faire taire un rappel", () => {
    const panneau = readFileSync("src/components/mobile/AccountMenu.tsx", "utf8");
    expect(panneau).not.toMatch(/Ne plus me le rappeler/);
    expect(panneau).not.toMatch(/ecarterRappelAction/);
    // La seconde issue, elle, est bien là, et elle mène à une page.
    expect(panneau).toMatch(/a\.sortie/);
  });

  it("le desk l'a, et il exige un motif", () => {
    const actions = readFileSync("src/app/desk/referentiel/relances/actions.ts", "utf8");
    expect(actions).toMatch(/export async function taireRappelAction/);
    expect(actions).toMatch(/motif\.length < 4/);
  });
});
