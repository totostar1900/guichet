import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { orderChecks, resteApres } from "@/lib/domain/checks";
import type { Intent, Offer } from "@/lib/domain/types";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * LA CESSION EST UNE SORTIE — RELEVÉ LE 29 OCTOBRE 2026.
 *
 * Le guichet connaît trois sorties : l'ordre de vente en bourse, le rachat de
 * parts d'un fonds, et la CESSION, c'est-à-dire le rachat d'un titre par le
 * Trésor. La maison a une règle qui les nomme, « sensDeLIntention », et dont
 * le commentaire dit déjà que trois endroits se l'étaient réécrite à la main.
 *
 * TROIS AUTRES SE L'ÉTAIENT RÉÉCRITE, et les trois oubliaient la cession :
 *
 *   LE PORTEFEUILLE. Une cession réglée ne retranchait rien. Le client cédait
 *   trois cents titres au Trésor, l'argent arrivait, et son portefeuille
 *   continuait d'afficher les trois cents titres — avec les coupons à venir
 *   qui ne viendraient jamais. Un chiffre trop haut ne se plaint pas.
 *
 *   LE PLAFOND. La vente et le rachat de parts refusaient de dépasser la
 *   position ; la cession, qui porte pourtant le mot, n'avait aucun plafond.
 *
 *   LE CONTEXTE DE LA PAGE. Il ne lisait la position que sur une ligne cotée
 *   et sur un fonds, donc sur un rachat du Trésor le formulaire n'avait ni
 *   plafond, ni « tout céder », ni ce qui resterait.
 */
describe("ce qu'on détient", () => {
  /* LE DÉFAUT LUI-MÊME, MESURÉ SUR DES POSITIONS. Le reste de ce fichier
     garde des règles ; celle-ci garde le CHIFFRE, parce que c'est lui que le
     client lisait faux. */
  it("retranche du portefeuille une cession réglée", async () => {
    const { repo } = await import("@/lib/data");
    const { positionsFrom } = await import("@/lib/positions");
    const r = repo();
    const offers = await r.listOffers();
    const ligne = offers.find((o) => o.kind === "OTA" && o.nominal > 0)!;
    // Le Trésor rachète une ligne qu'il a émise : le rachat porte donc l'ISIN
    // de cette ligne, et c'est par l'ISIN que les positions se recoupent.
    const rachat: Offer = { ...ligne, id: "t-rachat-essai", kind: "RACHAT", title: "Rachat d'essai" };
    const base = {
      clientId: "t-client-essai",
      clientName: "Essai",
      clientSegment: "Personne physique",
      channel: "E-mail" as const,
      state: "reglee" as const,
      createdAt: "2026-01-02T09:00:00",
      updatedAt: "2026-01-02T09:00:00",
      offerVersion: ligne.version,
    };
    const achat: Intent = { ...base, id: "t-achat", ref: "T-1", offerId: ligne.id, type: "ferme", amount: ligne.nominal * 300 };
    const cede: Intent = { ...base, id: "t-cede", ref: "T-2", offerId: rachat.id, type: "cession", amount: 100, createdAt: "2026-06-02T09:00:00", updatedAt: "2026-06-02T09:00:00" };

    const avant = positionsFrom([achat], [ligne, rachat]).reduce((s, p) => s + p.units, 0);
    const apres = positionsFrom([achat, cede], [ligne, rachat]).reduce((s, p) => s + p.units, 0);
    // Non-vacuité : sans détention de départ, la soustraction ne prouverait rien.
    expect(avant, "la prise ferme d'essai ne produit aucune position").toBeGreaterThan(0);
    expect(apres, "une cession réglée ne retranche toujours rien du portefeuille").toBe(avant - 100);
  });

  /* LA RÈGLE PLUTÔT QUE SA COPIE. Le portefeuille écrivait sa propre liste de
     types ; elle se tait quand elle se trompe, et elle s'était trompée. */
  it("lit le sens d'une intention au lieu de réécrire la liste des sorties", () => {
    const src = code("src/lib/positions.ts");
    expect(src, "le portefeuille s'est réécrit la liste des sorties").toMatch(/sensDeLIntention\(i\.type\) === "reduit"/);
    expect(src, "le portefeuille s'est réécrit la liste des entrées").toMatch(/sensDeLIntention\(i\.type\) === "augmente"/);
    expect(src, "une liste de types écrite à la main est revenue").not.toMatch(/i\.type === "vente"/);
  });

  /* LE PLAFOND DE LA CESSION, posé sur le domaine et non sur l'écran. */
  it("refuse de céder au Trésor plus qu'on ne détient", async () => {
    const { repo } = await import("@/lib/data");
    const offers = await repo().listOffers();
    const ligne = offers.find((o) => o.kind === "OTA" && o.nominal > 0)!;
    const rachat: Offer = { ...ligne, id: "t-rachat-essai-2", kind: "RACHAT" };
    const trop = orderChecks(rachat, "cession", 400, null, { held: 300 }).find((c) => c.key === "held");
    const juste = orderChecks(rachat, "cession", 300, null, { held: 300 }).find((c) => c.key === "held");
    expect(trop?.level, "céder plus qu'on ne détient passe encore").toBe("block");
    expect(juste, "céder exactement ce qu'on détient est refusé à tort").toBeUndefined();
    // Sans position lue, on ne refuse rien : le silence vaut mieux qu'un plafond inventé.
    expect(orderChecks(rachat, "cession", 400, null, {}).find((c) => c.key === "held"), "un plafond est inventé sans position lue").toBeUndefined();
  });

  /* CE QUI RESTERA, et son silence. */
  it("dit ce qu'il restera, et se tait quand il ne le sait pas", async () => {
    const { repo } = await import("@/lib/data");
    const offers = await repo().listOffers();
    const cotee = offers.find((o) => o.kind === "MARCHE")!;
    const fonds = offers.find((o) => o.kind === "FONDS")!;

    expect(resteApres(cotee, "vente", 120, 12), "la vente ne dit pas ce qui restera").toMatchObject({ reste: 108 });
    expect(resteApres(fonds, "rachat", 10.5, 0.5)?.mot, "le fonds ne compte pas en parts").toBe("parts");
    expect(resteApres(cotee, "vente", 120, 119)?.mot, "le dernier titre reste au pluriel").toMatch(/^(titre|action)$/);

    // Les quatre silences : une entrée, une position inconnue, un champ vide,
    // et un montant au-delà du plafond — où la phrase annoncerait un négatif.
    expect(resteApres(cotee, "achat", 120, 12), "une entrée annonce ce qui restera").toBeUndefined();
    expect(resteApres(cotee, "vente", 0, 12), "une position inconnue est comptée comme zéro").toBeUndefined();
    expect(resteApres(cotee, "vente", 120, 0), "un champ vide annonce déjà un reste").toBeUndefined();
    expect(resteApres(cotee, "vente", 120, 200), "au-delà du plafond, un reste négatif est annoncé").toBeUndefined();
  });

  /**
   * UN RACHAT DU TRÉSOR OUVERT, SUR UNE LIGNE QUE LE CLIENT DÉTIENT.
   *
   * Pendant toute la conversion du parcours de cession, cette branche s'est
   * vérifiée par le domaine et PAS À L'ÉCRAN : le jeu d'essai portait deux
   * rachats, tous deux clos depuis six semaines, dont les ISIN ne visaient
   * aucune ligne détenue. La seule sortie dont la question s'appelle
   * « cession » n'était donc visible nulle part, et c'est exactement ce qu'un
   * jeu de démonstration est censé empêcher.
   *
   * CE QU'IL A RÉVÉLÉ LE JOUR OÙ IL EST DEVENU VISIBLE : « Vous détenez 500
   * ACTIONS » sur un rachat d'obligations, à deux lignes de « il vous restera
   * 300 TITRES ». L'épreuve du mot d'unité, plus haut, est née de là.
   */
  it("garde un rachat ouvert sur une ligne que le client de démonstration détient", async () => {
    const { repo } = await import("@/lib/data");
    const { positionsFrom } = await import("@/lib/positions");
    const { displayStatus, isActionable } = await import("@/lib/domain/status");
    const r = repo();
    const [offers, intents] = await Promise.all([r.listOffers(), r.listIntents()]);
    const rachats = offers.filter((o) => o.kind === "RACHAT" && !o.hidden && isActionable(displayStatus(o)));
    expect(rachats.length, "plus aucun rachat du Trésor n'est ouvert : la branche « cession » redevient invisible").toBeGreaterThan(0);
    // Et il faut qu'il vise une ligne DÉTENUE, sans quoi il ne montre rien de
    // plus : ni plafond, ni « tout céder », ni ce qui resterait.
    const tenues = new Set(positionsFrom(intents, offers).map((p) => p.offer.isin));
    const utiles = rachats.filter((o) => tenues.has(o.isin));
    expect(utiles.length, "aucun rachat ouvert ne vise une ligne détenue : le plafond et « tout céder » ne paraissent nulle part").toBeGreaterThan(0);
  });

  /* LE CONTEXTE DE LA PAGE. Sans cette lecture, les deux règles ci-dessus
     n'ont rien à juger : le formulaire reçoit zéro et se tait poliment. */
  it("lit la position du client sur un rachat du Trésor", () => {
    const src = code("src/app/offres/[id]/intent-context.ts");
    const ligne = src.split("\n").find((l) => l.includes("const wantsHeld"));
    expect(ligne, "la ligne qui décide de lire la position a disparu").toBeTruthy();
    expect(ligne!, "le rachat du Trésor ne lit pas ce que le client détient").toMatch(/RACHAT/);
  });

  /**
   * LE MOT DE L'UNITÉ VIENT DU DOMAINE, ET D'UN SEUL ENDROIT.
   *
   * Relevé le 29 octobre 2026, le jour où un rachat du Trésor est enfin
   * devenu visible dans le jeu d'essai : la ligne « Vous détenez » écrivait
   * sa propre liste — « parts, sinon titres si obligation, sinon actions » —
   * et « instrument » n'existe que sur une ligne cotée. Sur un rachat
   * d'obligations elle disait donc « vous détenez 500 ACTIONS », à deux
   * lignes de « il vous restera 300 TITRES ». Deux mots pour une même chose,
   * sur un même écran, dont un faux.
   *
   * « counterUnit » répond déjà pour les trois sorties, et « resteApres » le
   * lit : c'était la seule des deux lignes à s'être écrit sa règle.
   */
  it("prend le mot de l'unité au domaine, et nulle part ailleurs", async () => {
    const { counterUnit } = await import("@/lib/domain/counter");
    const { repo } = await import("@/lib/data");
    const offers = await repo().listOffers();
    const ligne = offers.find((o) => o.kind === "OTA" && o.nominal > 0)!;
    expect(counterUnit({ ...ligne, kind: "RACHAT" } as Offer), "un rachat du Trésor ne compte plus en titres").toBe("titres");
    const src = code("src/components/IntentForm.tsx");
    expect(src, "la ligne de détention s'est réécrit la liste des unités").not.toMatch(/"Vous détenez"\)\}[^}]*instrument === "obligation"/);
    expect((src.match(/\{t\(counterUnit\(offer\)\)\}/g) ?? []).length, "une des deux lignes de détention a repris sa propre liste").toBe(2);
  });

  /* L'ÉCRAN : « tout céder » et le plafond ne servent que si le formulaire
     passe la position au domaine, et il l'écrivait aussi à la main. */
  it("passe la position au domaine pour chacune des trois sorties", () => {
    const src = code("src/components/IntentForm.tsx");
    expect(src, "le formulaire s'est réécrit la liste des sorties").toMatch(/sensDeLIntention\(type\) === "reduit"/);
    expect(src, "« tout céder » a disparu du rachat du Trésor").toMatch(/tout céder/);
  });
});
