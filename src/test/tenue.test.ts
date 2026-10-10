import { describe, expect, it } from "vitest";
import { CRANS, enDefaut, JOURS_POUR_REGLER, suiteDonnee, tenue, type SourcesTenue } from "@/lib/domain/tenue";
import { addBusinessDays } from "@/lib/finance";
import type { Intent, Notification, Offer } from "@/lib/domain/types";
import type { MandatPrelevement } from "@/lib/domain/mandat";

/**
 * LA TENUE JUGE, DONC ELLE DOIT ÊTRE JUSTE.
 *
 * Trois façons simples de punir quelqu'un à tort, et ce sont elles que ces
 * cas tiennent : compter en défaut un ordre servi la veille, reprocher un
 * appétit sur une ligne qui n'a jamais ouvert, et reprocher un silence à qui
 * n'a jamais été relancé. La troisième est la pire, parce que le manquement
 * est alors le nôtre.
 */
const MAINTENANT = new Date("2026-10-10T12:00:00.000Z");
const ilYA = (joursOuvres: number) => addBusinessDays(MAINTENANT, -joursOuvres).toISOString();

const offre = (p: Partial<Offer> & { id: string }): Offer =>
  ({
    kind: "PRIMAIRE",
    title: `Ligne ${p.id}`,
    status: "published",
    opensAt: "2026-09-01T08:00:00",
    deadlineAt: "2026-09-20T15:00:00",
    resultsAt: "2026-09-25T15:00:00",
    ...p,
  }) as unknown as Offer;

const ordre = (p: Partial<Intent> & { id: string; ref: string }): Intent =>
  ({
    offerId: "o1",
    offerVersion: 1,
    clientName: "Essai",
    clientSegment: "Personne physique",
    clientId: "u1",
    type: "ferme",
    amount: 1_000_000,
    channel: "E-mail",
    state: "reglee",
    contactEmail: "essai@exemple.cm",
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-10T09:00:00.000Z",
    ...p,
  }) as unknown as Intent;

const envoi = (offerId: string, status: Notification["status"] = "sent"): Notification =>
  ({ id: `n-${offerId}-${status}`, kind: "offer", channel: "E-mail", to: "essai@exemple.cm", body: "", status, offerId, createdAt: "2026-09-05T09:00:00.000Z" }) as unknown as Notification;

const sources = (p: Partial<SourcesTenue>): SourcesTenue => ({
  userId: "u1",
  intents: [],
  offers: [],
  notifications: [],
  mandats: [],
  servieLe: new Map(),
  ...p,
});

describe("un ordre servi n'est pas aussitôt en défaut", () => {
  it("laisse passer le délai de règlement", () => {
    /* Avant cinq jours ouvrés, un ordre servi non réglé est un virement en
       route, pas un manquement. C'est le défaut que la vue quantitative
       portait : elle appelait « jamais réglé » l'ordre de la veille. */
    expect(enDefaut(ilYA(1), "servie", MAINTENANT)).toBe(false);
    expect(enDefaut(ilYA(JOURS_POUR_REGLER), "servie", MAINTENANT)).toBe(false);
    expect(enDefaut(ilYA(JOURS_POUR_REGLER + 2), "servie", MAINTENANT)).toBe(true);
  });

  it("et ne juge que ce qui est resté en « servie »", () => {
    expect(enDefaut(ilYA(30), "reglee", MAINTENANT)).toBe(false);
    expect(enDefaut(ilYA(30), "non_servie", MAINTENANT)).toBe(false);
    expect(enDefaut(undefined, "servie", MAINTENANT)).toBe(false);
  });

  it("le porte au cran le plus grave, avec sa pièce et sa date", () => {
    const t = tenue(
      sources({
        intents: [ordre({ id: "i1", ref: "PF-0929-AAAA", state: "servie" })],
        servieLe: new Map([["i1", ilYA(8)]]),
      }),
      MAINTENANT,
    );
    expect(t.cran).toBe("en_defaut");
    expect(t.manquements[0]).toMatchObject({ clef: "ordre_non_regle", objet: "PF-0929-AAAA", gravite: "en_defaut" });
    expect(t.manquements[0].quand).toBe(ilYA(8).slice(0, 10));
  });
});

describe("les trois exclusions qui rendent le compte des appétits juste", () => {
  const appetit = (id: string, offerId: string) => ordre({ id, ref: `AP-${id}`, type: "appetit", offerId, state: "recue" });

  it("une ligne qui n'a jamais ouvert ne compte pas", () => {
    // Le client n'a pas eu l'occasion de tenir son appétit.
    const o = offre({ id: "o1", opensAt: "2026-12-01T08:00:00", deadlineAt: "2026-12-20T15:00:00" });
    const r = suiteDonnee("u1", [appetit("a1", "o1")], [o], [envoi("o1")], MAINTENANT);
    expect(r).toMatchObject({ ouverts: 0, sansSuite: [] });
  });

  it("un silence sans relance ne compte pas", () => {
    /* Le journal des envois prouve si on l'a prévenu ; s'il ne dit rien, le
       manquement est le nôtre, pas le sien. */
    const o = offre({ id: "o1" });
    expect(suiteDonnee("u1", [appetit("a1", "o1")], [o], [], MAINTENANT).ouverts).toBe(0);
    expect(suiteDonnee("u1", [appetit("a1", "o1")], [o], [envoi("o1", "failed")], MAINTENANT).ouverts).toBe(0);
    expect(suiteDonnee("u1", [appetit("a1", "o1")], [o], [envoi("o1")], MAINTENANT).ouverts).toBe(1);
  });

  it("une ligne retirée par la maison ne compte pas", () => {
    const o = offre({ id: "o1", status: "withdrawn" });
    expect(suiteDonnee("u1", [appetit("a1", "o1")], [o], [envoi("o1")], MAINTENANT).ouverts).toBe(0);
  });

  it("un appétit suivi d'un ordre ferme est tenu", () => {
    const o = offre({ id: "o1" });
    const ferme = ordre({ id: "i1", ref: "PF-0912-BBBB", offerId: "o1", createdAt: "2026-09-12T09:00:00.000Z" });
    const r = suiteDonnee("u1", [appetit("a1", "o1"), ferme], [o], [envoi("o1")], MAINTENANT);
    expect(r).toMatchObject({ ouverts: 1, suivis: 1, sansSuite: [] });
  });

  it("un ordre ferme ANTÉRIEUR à l'appétit ne le tient pas", () => {
    /* Sinon un client qui a acheté en janvier serait réputé avoir donné suite
       à un appétit déposé en septembre sur la même ligne. */
    const o = offre({ id: "o1" });
    const vieux = ordre({ id: "i0", ref: "PF-0101-ZZZZ", offerId: "o1", createdAt: "2026-01-05T09:00:00.000Z" });
    const r = suiteDonnee("u1", [vieux, appetit("a1", "o1")], [o], [envoi("o1")], MAINTENANT);
    expect(r.sansSuite).toHaveLength(1);
  });

  it("deux appétits sans suite font un signal, un seul n'en fait pas", () => {
    const o1 = offre({ id: "o1" });
    const o2 = offre({ id: "o2" });
    const un = tenue(sources({ intents: [appetit("a1", "o1")], offers: [o1], notifications: [envoi("o1")] }), MAINTENANT);
    expect(un.cran).toBe("impeccable");
    const deux = tenue(
      sources({ intents: [appetit("a1", "o1"), appetit("a2", "o2")], offers: [o1, o2], notifications: [envoi("o1"), envoi("o2")] }),
      MAINTENANT,
    );
    expect(deux.cran).toBe("a_surveiller");
    /* La phrase est une clef à trous, et ses valeurs vivent à côté : composée
       ici, elle ne se traduirait pas et le scanner de clefs ne la verrait
       même pas passer. */
    expect(deux.manquements[0].phrase).toBe("Appétits sans suite : {n} sur {total}");
    expect(deux.manquements[0].vars).toEqual({ n: "2", total: "2" });
  });
});

describe("les autres manquements", () => {
  const mandat = (rejects: number): MandatPrelevement => ({ id: "m1", ref: "MP-0001", userId: "u1", rejects } as unknown as MandatPrelevement);

  it("un prélèvement rejeté reste une correcte, deux font surveiller", () => {
    // Un rejet arrive à tout le monde ; deux disent autre chose.
    expect(tenue(sources({ mandats: [mandat(1)] }), MAINTENANT).cran).toBe("correcte");
    expect(tenue(sources({ mandats: [mandat(2)] }), MAINTENANT).cran).toBe("a_surveiller");
  });

  it("un versement programmé non réglé au-delà du délai se dit", () => {
    const v = ordre({ id: "v1", ref: "PF-0901-CCCC", state: "confirmee", standingId: "st1", createdAt: ilYA(9) } as Partial<Intent> & { id: string; ref: string });
    const t = tenue(sources({ intents: [v] }), MAINTENANT);
    expect(t.cran).toBe("a_surveiller");
    expect(t.manquements[0]).toMatchObject({ clef: "versement_en_retard", objet: "PF-0901-CCCC" });
  });

  it("un versement couvert par la provision ne compte pas", () => {
    const v = ordre({ id: "v1", ref: "PF-0901-CCCC", state: "confirmee", standingId: "st1", createdAt: ilYA(9), coveredAt: ilYA(8) } as Partial<Intent> & { id: string; ref: string });
    expect(tenue(sources({ intents: [v] }), MAINTENANT).cran).toBe("impeccable");
  });

  it("deux envois en échec disent qu'un canal ne répond plus", () => {
    const i = ordre({ id: "i1", ref: "PF-0001-DDDD" });
    const echec = { ...envoi("o1", "failed"), id: "n2" } as Notification;
    const t = tenue(sources({ intents: [i], notifications: [envoi("o1", "failed"), echec] }), MAINTENANT);
    expect(t.cran).toBe("correcte");
    expect(t.manquements[0].clef).toBe("canal_muet");
  });
});

describe("le cran et ce qu'il promet", () => {
  it("sans manquement, impeccable", () => {
    expect(tenue(sources({}), MAINTENANT)).toEqual({ cran: "impeccable", manquements: [] });
  });

  it("le plus grave l'emporte, et les manquements se lisent du pire au moindre", () => {
    const o1 = offre({ id: "o1" });
    const o2 = offre({ id: "o2" });
    const t = tenue(
      sources({
        intents: [
          // Sur une troisième ligne : un ferme sur « o1 » tiendrait l'appétit « a1 ».
          ordre({ id: "i1", ref: "PF-A", state: "servie", offerId: "o3" }),
          ordre({ id: "a1", ref: "AP-1", type: "appetit", offerId: "o1", state: "recue" }),
          ordre({ id: "a2", ref: "AP-2", type: "appetit", offerId: "o2", state: "recue" }),
        ],
        offers: [o1, o2],
        notifications: [envoi("o1"), envoi("o2")],
        mandats: [{ id: "m1", ref: "MP-1", userId: "u1", rejects: 1 } as unknown as MandatPrelevement],
        servieLe: new Map([["i1", ilYA(9)]]),
      }),
      MAINTENANT,
    );
    expect(t.cran).toBe("en_defaut");
    expect(t.manquements.map((m) => m.gravite)).toEqual(["en_defaut", "a_surveiller", "correcte"]);
  });

  it("ne juge jamais un autre client que celui qu'on lui demande", () => {
    const autre = ordre({ id: "i9", ref: "PF-X", state: "servie", clientId: "u2" });
    expect(tenue(sources({ intents: [autre], servieLe: new Map([["i9", ilYA(30)]]) }), MAINTENANT).cran).toBe("impeccable");
  });

  it("les quatre crans existent, et dans cet ordre", () => {
    expect([...CRANS]).toEqual(["impeccable", "correcte", "a_surveiller", "en_defaut"]);
  });
});

/**
 * LES PHRASES DE LA TENUE SONT INVISIBLES AU SCANNER DE CLEFS.
 *
 * Elles passent par « t(m.phrase, m.vars) » : le scanner ne lit que les
 * littéraux, et un manquement ajouté sans sa traduction sortirait en français
 * dans la version anglaise sans que rien n'échoue. C'est le même angle mort
 * que celui du catalogue des gestes, et il se ferme de la même façon.
 */
describe("tout ce que la tenue affiche est traduit", () => {
  it("chaque phrase et chaque cran a son entrée anglaise", async () => {
    const { EN_JOURNAL } = await import("@/i18n/en-journal");
    const { CRAN_LABEL } = await import("@/lib/domain/tenue");
    const src = (await import("node:fs")).readFileSync("src/lib/domain/tenue.ts", "utf8");
    const manquantes: string[] = [];
    for (const v of Object.values(CRAN_LABEL)) if (!EN_JOURNAL[v]) manquantes.push(`cran · ${v}`);
    for (const m of src.matchAll(/phrase: (?:[^?\n]*\? )?"([^"]+)"(?: : "([^"]+)")?/g)) {
      for (const p of [m[1], m[2]]) if (p && !EN_JOURNAL[p]) manquantes.push(`phrase · ${p}`);
    }
    expect(manquantes, `sans traduction :\n  ${manquantes.join("\n  ")}`).toEqual([]);
  });

  it("et aucune phrase n'est composée dans le domaine", () => {
    // Une phrase bâtie avec un gabarit ne se traduit pas : clef à trous, et vars à côté.
    const src = (require("node:fs") as typeof import("node:fs")).readFileSync("src/lib/domain/tenue.ts", "utf8");
    expect(src).not.toMatch(/phrase: `/);
  });
});
