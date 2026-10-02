import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PREAVIS_DEFAUT, arretables, dueOnDuPreavis, montantAExecuter, pourquoiPasArreter, pourquoiPasExecuter, type Preavis } from "@/lib/domain/preavis";
import type { StandingOrder } from "@/lib/domain/standing";
import { localIso } from "@/lib/format";

/**
 * PRÉVENIR AVANT, ET LAISSER LE TEMPS DE DIRE NON.
 *
 * Le robot créait l'ordre PUIS prévenait, et l'envoi du message vivait dans un
 * try/catch vide : « un message qui ne part pas ne doit pas empêcher le
 * versement suivant ». Vrai pour le versement suivant, faux pour celui-là : la
 * maison engageait l'argent d'un client qui n'avait rien reçu, et personne ne le
 * savait. Une banque qui vous informe d'un prélèvement après l'avoir fait vous
 * informe ; elle ne vous laisse pas décider.
 *
 * Quatre propriétés portent ce chantier, et trois ne sautent pas aux yeux :
 *
 *   PAS D'EXÉCUTION SANS PRÉAVIS RÉELLEMENT PARTI. C'est la règle qui compte, et
 *   elle accepte son prix : un client au canal cassé n'a plus de versement,
 *   parce que l'inverse est d'engager son argent en silence.
 *
 *   AU PLUS LE MONTANT ANNONCÉ. Entre le préavis et l'exécution un coupon peut
 *   tomber, et exécuter plus romprait la promesse sur laquelle le client a
 *   choisi de ne rien dire.
 *
 *   UN VERSEMENT GARDE LE JOUR CHOISI PAR LE CLIENT. On l'annonce la veille ; le
 *   décaler d'un jour parce qu'on prévient serait lui prendre son choix pour lui
 *   rendre un service.
 */
const ordre = (o: Partial<StandingOrder>): StandingOrder =>
  ({ id: "s1", ref: "EP-001", userId: "u1", clientName: "Client", clientSegment: "x", offerId: "f1", amount: 100_000, source: "virement", minAmount: 0, dayOfMonth: 5, startsOn: "2026-01-01", state: "active", onBlocked: "passer", channel: "WhatsApp", createdAt: "", updatedAt: "", ...o }) as StandingOrder;
const annonce = (o: Partial<Preavis>): Preavis => ({ id: "p1", standingId: "s1", userId: "u1", dueOn: "2026-10-05", amount: 100_000, announcedAt: "2026-10-04T08:00:00.000Z", noticeSent: true, state: "annoncee", ...o });

describe("le délai de préavis", () => {
  it("est d'un jour par défaut, et non de zéro", () => {
    /* Zéro rétablirait l'ancien comportement sous un nouveau nom : annoncer et
       exécuter le même jour, c'est exécuter sans préavis. */
    expect(PREAVIS_DEFAUT.noticeDays).toBe(1);
  });
});

describe("le jour prévu de l'exécution", () => {
  it("pour un réinvestissement : le jour où l'argent est là, plus le délai", () => {
    // « Demain » n'est pas connaissable quand c'est l'argent arrivé qui déclenche.
    expect(dueOnDuPreavis(ordre({ source: "encaissements" }), "2026-10-03", PREAVIS_DEFAUT)).toBe("2026-10-04");
    expect(dueOnDuPreavis(ordre({ source: "encaissements" }), "2026-10-03", { noticeDays: 3 })).toBe("2026-10-06");
  });

  it("pour un versement : le jour que le client a choisi, annoncé la veille", () => {
    // Le 4, on annonce pour le 5 : le client garde son jour.
    expect(dueOnDuPreavis(ordre({ dayOfMonth: 5 }), "2026-10-04", PREAVIS_DEFAUT)).toBe("2026-10-05");
  });

  it("pour un versement en retard : le lendemain, parce qu'il faut bien prévenir", () => {
    /* Le robot n'a pas tourné le 5 ; il le découvre le 9. L'occurrence est datée
       du 10, et non du 9 : le rattrapage coûte un jour, qui est le prix de
       « jamais d'exécution non annoncée », et c'est petit devant un mois sauté. */
    expect(dueOnDuPreavis(ordre({ dayOfMonth: 5 }), "2026-10-09", PREAVIS_DEFAUT)).toBe("2026-10-10");
  });

  it("rien quand aucune occurrence n'est en vue", () => {
    expect(dueOnDuPreavis(ordre({ dayOfMonth: 20 }), "2026-10-03", PREAVIS_DEFAUT)).toBeNull();
  });

  it("rien quand le mois est déjà consommé", () => {
    expect(dueOnDuPreavis(ordre({ dayOfMonth: 5, lastRunOn: "2026-10-05" }), "2026-10-04", PREAVIS_DEFAUT)).toBeNull();
  });
});

describe("pourquoi une occurrence ne s'exécute pas", () => {
  it("elle n'a pas été annoncée", () => {
    expect(pourquoiPasExecuter(undefined, "2026-10-05")).toBe("pas_annonce");
  });

  it("le préavis n'est pas parti", () => {
    /* La règle qui compte, et son prix assumé : un client au canal cassé n'a
       plus de versement, parce que l'inverse est d'engager son argent en
       silence. */
    expect(pourquoiPasExecuter(annonce({ noticeSent: false }), "2026-10-05")).toBe("pas_parti");
  });

  it("le client l'a arrêtée", () => {
    expect(pourquoiPasExecuter(annonce({ state: "arretee" }), "2026-10-05")).toBe("arrete");
  });

  it("son jour n'est pas venu", () => {
    expect(pourquoiPasExecuter(annonce({ dueOn: "2026-10-06" }), "2026-10-05")).toBe("trop_tot");
  });

  it("elle est déjà partie", () => {
    expect(pourquoiPasExecuter(annonce({ state: "executee" }), "2026-10-05")).toBe("deja");
  });

  it("rien, quand le jour est venu et que le préavis est parti", () => {
    expect(pourquoiPasExecuter(annonce({}), "2026-10-05")).toBeNull();
    // Et un jour passé s'exécute aussi : le robot rattrape.
    expect(pourquoiPasExecuter(annonce({ dueOn: "2026-10-01" }), "2026-10-05")).toBeNull();
  });
});

describe("le montant à exécuter", () => {
  it("n'excède jamais ce qui a été annoncé", () => {
    /* Un coupon tombé entre le préavis et l'exécution ne grossit pas l'ordre :
       le surplus aura son propre préavis demain. */
    expect(montantAExecuter(100_000, 180_000, 0)).toBe(100_000);
  });

  it("descend quand l'argent a baissé", () => {
    // Le client a pu réclamer son disponible entre-temps.
    expect(montantAExecuter(100_000, 60_000, 0)).toBe(60_000);
  });

  it("ne descend pas sous le plancher du client", () => {
    expect(montantAExecuter(100_000, 40_000, 50_000)).toBe(0);
    expect(montantAExecuter(100_000, 60_000, 50_000)).toBe(60_000);
  });

  it("rien si rien n'est disponible", () => {
    expect(montantAExecuter(100_000, 0, 0)).toBe(0);
  });
});

describe("ce que le client peut encore arrêter", () => {
  it("les occurrences annoncées et non échues, du plus proche au plus lointain", () => {
    const l = arretables([annonce({ id: "a", dueOn: "2026-10-09" }), annonce({ id: "b", dueOn: "2026-10-06" }), annonce({ id: "c", dueOn: "2026-10-01" }), annonce({ id: "d", state: "executee", dueOn: "2026-10-07" })], "2026-10-05");
    expect(l.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("un bouton qui ne mentirait pas : le jour passé n'est plus arrêtable", () => {
    /* Ou le robot l'a exécutée, ou il va le faire au prochain tour : laisser
       croire qu'on l'arrête serait un bouton qui mente. */
    expect(pourquoiPasArreter(annonce({ dueOn: "2026-10-01" }), "2026-10-05")).toMatch(/jour est passé/i);
    expect(pourquoiPasArreter(annonce({ state: "executee" }), "2026-10-05")).toMatch(/déjà partie/i);
    expect(pourquoiPasArreter(annonce({ state: "arretee" }), "2026-10-05")).toMatch(/déjà arrêtée/i);
    expect(pourquoiPasArreter(undefined, "2026-10-05")).toMatch(/n'existe plus/i);
    expect(pourquoiPasArreter(annonce({}), "2026-10-05")).toBeNull();
  });
});

/* ───────── Le robot, bout à bout ───────── */

const envoi = vi.hoisted(() => ({ sent: true as boolean, error: undefined as string | undefined }));
vi.mock("@/lib/notify/preavis", () => ({ envoyerPreavis: async () => ({ sent: envoi.sent, error: envoi.error }) }));
vi.mock("@/lib/notify/dispatch", () => ({ notifyIntentUpdated: async () => {} }));
vi.mock("@/lib/reference", () => ({ loadRegistry: async () => {}, REF: { policy: "policy" } }));

const appel = () => new Request("http://localhost/api/cron/epargne") as never;
/* Le robot date en heure locale (localIso) : dater les attentes en UTC fait
   échouer le test une heure par nuit, ce qui est le genre de rouge qu'on finit
   par ignorer. */
const demain = (n = 1) => localIso(new Date(Date.now() + n * 86_400_000));
const aujourdHui = () => localIso(new Date());

let rang = 0;
const sien = () => {
  rang += 1;
  return `u-preavis-${rang}`;
};

async function instruction(userId: string) {
  const { repo } = await import("@/lib/data");
  const r = repo();
  const fonds = (await r.listOffers()).find((o) => o.kind === "FONDS" && !o.hidden)!;
  const s = await r.createStandingOrder({
    userId,
    clientName: "Client Préavis",
    clientSegment: "Personne physique",
    offerId: fonds.id,
    amount: 0,
    source: "encaissements",
    minAmount: 10_000,
    dayOfMonth: 1,
    startsOn: "2026-01-01",
    onBlocked: "passer",
    channel: "WhatsApp",
    contactEmail: "c@exemple.com",
  } as never);
  return { r, s, fonds };
}

describe("le robot, bout à bout", () => {
  beforeEach(() => {
    vi.resetModules();
    envoi.sent = true;
    envoi.error = undefined;
  });

  it("annonce et n'exécute rien au premier tour", async () => {
    const u = sien();
    const { r, s } = await instruction(u);
    await r.addCash({ userId: u, amount: 272_500, kind: "coupon", label: "Coupon" });
    const avant = (await r.listIntents()).filter((i) => i.standingId === s.id).length;

    const { GET } = await import("@/app/api/cron/epargne/route");
    await GET(appel());

    const [p] = await r.listPreavis({ standingId: s.id });
    expect(p).toBeTruthy();
    expect(p.dueOn).toBe(demain());
    expect(p.amount).toBe(272_500);
    expect(p.noticeSent).toBe(true);
    // Le point du chantier : rien n'est parti.
    expect((await r.listIntents()).filter((i) => i.standingId === s.id).length).toBe(avant);
  });

  it("n'annonce pas deux fois la même occurrence", async () => {
    const u = sien();
    const { r, s } = await instruction(u);
    await r.addCash({ userId: u, amount: 272_500, kind: "coupon", label: "Coupon" });
    const { GET } = await import("@/app/api/cron/epargne/route");
    await GET(appel());
    await GET(appel());
    expect(await r.listPreavis({ standingId: s.id })).toHaveLength(1);
  });

  it("n'ouvre jamais deux occurrences à la fois sur la même instruction", async () => {
    /* « isDue » reste vrai jusqu'à l'exécution : sans cette garde, un délai de
       plusieurs jours ferait naître une seconde occurrence du même versement le
       lendemain, et « ne double jamais » tomberait. Pour un réinvestissement
       dont le préavis a échoué, ce serait engager deux fois le même argent. */
    const u = sien();
    const { r, s } = await instruction(u);
    await r.addCash({ userId: u, amount: 100_000, kind: "coupon", label: "Coupon" });
    const p = await r.annoncerPreavis({ standingId: s.id, userId: u, dueOn: demain(3), amount: 100_000 });
    await r.cloturerPreavis(p.id, { noticeSent: false, noticeError: "canal cassé" });

    const { GET } = await import("@/app/api/cron/epargne/route");
    await GET(appel());

    expect(await r.listPreavis({ standingId: s.id })).toHaveLength(1);
  });

  it("replace deux coupons du même mois, un par tour", async () => {
    // La garde ci-dessus ne doit pas avoir coûté cette propriété : rien ne
    // justifierait de faire attendre le second coupon jusqu'au mois suivant.
    const u = sien();
    const { r, s } = await instruction(u);
    await r.addCash({ userId: u, amount: 100_000, kind: "coupon", label: "Coupon" });
    const p1 = await r.annoncerPreavis({ standingId: s.id, userId: u, dueOn: aujourdHui(), amount: 100_000 });
    await r.cloturerPreavis(p1.id, { noticeSent: true });

    const { GET } = await import("@/app/api/cron/epargne/route");
    // Premier tour : le premier coupon part, et le second arrive ensuite.
    await GET(appel());
    await r.addCash({ userId: u, amount: 80_000, kind: "coupon", label: "Coupon" });
    // Deuxième tour : il s'annonce, puisque plus rien n'est ouvert.
    await GET(appel());
    const ouvertes = (await r.listPreavis({ standingId: s.id })).filter((x) => x.state === "annoncee");
    expect(ouvertes).toHaveLength(1);
    expect(ouvertes[0].amount).toBe(80_000);
    expect((await r.listIntents()).filter((i) => i.standingId === s.id)).toHaveLength(1);
  });

  it("exécute l'occurrence dont le jour est venu, au plus pour le montant annoncé", async () => {
    const u = sien();
    const { r, s } = await instruction(u);
    await r.addCash({ userId: u, amount: 100_000, kind: "coupon", label: "Coupon" });
    const p = await r.annoncerPreavis({ standingId: s.id, userId: u, dueOn: aujourdHui(), amount: 100_000 });
    await r.cloturerPreavis(p.id, { noticeSent: true });
    // Un coupon de plus tombe après le préavis : il ne doit pas grossir l'ordre.
    await r.addCash({ userId: u, amount: 80_000, kind: "coupon", label: "Coupon" });

    const { GET } = await import("@/app/api/cron/epargne/route");
    await GET(appel());

    const siens = (await r.listIntents()).filter((i) => i.standingId === s.id);
    expect(siens).toHaveLength(1);
    expect(siens[0].amount).toBe(100_000);
    const ferme = (await r.listPreavis({ standingId: s.id })).find((x) => x.id === p.id)!;
    expect(ferme.state).toBe("executee");
    expect(ferme.paidAmount).toBe(100_000);
  });

  it("n'exécute rien quand le préavis n'est pas parti", async () => {
    /* La règle qui compte. Elle accepte son prix : ce client n'aura pas son
       versement tant que son canal est cassé, et le journal le dit. */
    const u = sien();
    const { r, s } = await instruction(u);
    await r.addCash({ userId: u, amount: 100_000, kind: "coupon", label: "Coupon" });
    const p = await r.annoncerPreavis({ standingId: s.id, userId: u, dueOn: aujourdHui(), amount: 100_000 });
    await r.cloturerPreavis(p.id, { noticeSent: false, noticeError: "aucun canal joignable" });

    const { GET } = await import("@/app/api/cron/epargne/route");
    await GET(appel());

    expect((await r.listIntents()).filter((i) => i.standingId === s.id)).toHaveLength(0);
    expect((await r.listPreavis({ standingId: s.id })).find((x) => x.id === p.id)!.state).toBe("annoncee");
  });

  it("n'exécute rien que le client a arrêté, et l'instruction reste active", async () => {
    const u = sien();
    const { r, s } = await instruction(u);
    await r.addCash({ userId: u, amount: 100_000, kind: "coupon", label: "Coupon" });
    const p = await r.annoncerPreavis({ standingId: s.id, userId: u, dueOn: aujourdHui(), amount: 100_000 });
    await r.cloturerPreavis(p.id, { noticeSent: true });
    await r.cloturerPreavis(p.id, { state: "arretee", stopReason: "pas ce mois-ci" });

    const { GET } = await import("@/app/api/cron/epargne/route");
    await GET(appel());

    expect((await r.listIntents()).filter((i) => i.standingId === s.id)).toHaveLength(0);
    // Dire non à une occurrence n'est pas arrêter l'instruction.
    expect((await r.listStandingOrders(u)).find((x) => x.id === s.id)!.state).toBe("active");
  });

  it("marque le préavis non parti, et ne le tait pas", async () => {
    envoi.sent = false;
    envoi.error = "aucun canal joignable";
    const u = sien();
    const { r, s } = await instruction(u);
    await r.addCash({ userId: u, amount: 272_500, kind: "coupon", label: "Coupon" });

    const { GET } = await import("@/app/api/cron/epargne/route");
    const res = await GET(appel());
    const compte = await (res as Response).json();

    const [p] = await r.listPreavis({ standingId: s.id });
    expect(p.noticeSent).toBe(false);
    expect(p.noticeError).toMatch(/joignable/);
    // Le tour le compte : « muets » est le chiffre qui dit la panne.
    expect(compte.muets).toBeGreaterThan(0);
  });
});

describe("l'arrêt par le client", () => {
  it("refuse une occurrence qui n'est pas la sienne", async () => {
    /* L'action ne lit que les occurrences du client connecté : une clef devinée
       ne désigne alors rien, et la question de l'appartenance ne se pose pas
       deux fois. */
    const source = readFileSync("C:/dev/guichet/src/app/arret-actions.ts", "utf8");
    expect(source).toMatch(/listPreavis\(\{ userId: s\.userId \}\)/);
  });
});

describe("la base porte les mêmes règles", () => {
  it("une occurrence par instruction et par jour, et une exécution chiffrée", () => {
    const sql = readFileSync("C:/dev/guichet/supabase/migrations/0063_preavis.sql", "utf8");
    expect(sql).toMatch(/create unique index[^;]*standing_runs_une_par_occurrence/);
    expect(sql).toMatch(/standing_runs_execution_chiffree/);
    expect(sql).toMatch(/notice_sent\s+boolean not null default false/);
  });

  it("le try/catch vide a disparu du robot", () => {
    /* C'est lui qui cachait la panne : « un message qui ne part pas ne doit pas
       empêcher le versement suivant », avec un bloc vide. Le préavis, lui, est
       rendu et décide. */
    const cron = readFileSync("C:/dev/guichet/src/app/api/cron/epargne/route.ts", "utf8");
    expect(cron).not.toMatch(/un message qui ne part pas/i);
    expect(cron).toMatch(/pourquoiPasExecuter/);
    expect(cron).toMatch(/envoyerPreavis/);
  });
});
