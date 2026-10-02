import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accuseDeReception, fileDesAttendus, parFlux, pourquoiPasDeTemoignage, prioriteDuFlux, type Temoignage } from "@/lib/domain/temoignage";
import type { FluxSuivi } from "@/lib/domain/encaissement";

/**
 * LE CLIENT EST PARFOIS LE SEUL TÉMOIN.
 *
 * Deux populations, et une seule a un témoin côté maison. Pour un client dont
 * la maison a ouvert le sous-compte, le teneur de compte adresse l'avis de
 * paiement. Pour un client dont le compte-titres est tenu ailleurs, l'argent ne
 * passe pas par elle : il est la seule personne au monde qui sache si l'émetteur
 * a payé.
 *
 * L'écran lui disait pourtant « l'émetteur doit encore ces sommes, et le desk
 * les suit », avec ce commentaire dans le code : « aucun bouton, il n'y a rien à
 * replacer tant que rien n'est arrivé ». C'était vrai et incomplet : il n'y
 * avait rien à REPLACER, mais il y avait quelque chose à DIRE.
 *
 * Quatre propriétés se tiennent ici, et deux ne sautent pas aux yeux :
 *
 *   UN TÉMOIGNAGE NE CRÉDITE RIEN. « Reçu » ne fait pas entrer d'argent au
 *   journal ; laisser une déclaration créditer rouvrirait, à l'envers, la faute
 *   que ce lot entier corrige : une écriture sans preuve.
 *
 *   UN MONTANT CONTESTÉ PASSE DEVANT UN RETARD PLUS LONG. C'est le cas qui se
 *   serait constaté sans bruit, puisque l'opérateur qui confirme la somme
 *   attendue aurait l'air d'avoir raison.
 */
const flux = (o: Partial<FluxSuivi>): FluxSuivi =>
  ({ cle: "i1|2026-07-05|300000", intentId: "i1", titre: "OTA 6 %", date: "2026-07-05", amount: 300_000, label: "Coupon", etat: "attendu", retardJours: 10, ...o }) as FluxSuivi;
const dit = (o: Partial<Temoignage>): Temoignage => ({ id: "t1", userId: "u1", flowKey: "i1|2026-07-05|300000", said: "recu", at: "2026-10-03T08:00:00.000Z", ...o });

describe("ce que le témoignage change pour le desk", () => {
  it("muet sans déclaration", () => {
    expect(prioriteDuFlux(flux({}), undefined)).toBe("muet");
  });

  it("confirmé, nié, contesté", () => {
    expect(prioriteDuFlux(flux({}), dit({ said: "recu" }))).toBe("confirme");
    expect(prioriteDuFlux(flux({}), dit({ said: "rien" }))).toBe("nie");
    expect(prioriteDuFlux(flux({}), dit({ said: "autre", saidAmount: 280_000 }))).toBe("conteste");
  });

  it("indexe un seul témoignage par échéance", () => {
    const index = parFlux([dit({}), dit({ id: "t2", flowKey: "i2|2026-08-05|100000", said: "rien" })]);
    expect(index.size).toBe(2);
    expect(index.get("i2|2026-08-05|100000")!.said).toBe("rien");
  });
});

describe("la file des attendus", () => {
  const vieuxMuet = flux({ cle: "a", retardJours: 60 });
  const jeuneConteste = flux({ cle: "b", retardJours: 3 });
  const moyenNie = flux({ cle: "c", retardJours: 20 });
  const moyenConfirme = flux({ cle: "d", retardJours: 15 });

  it("met le montant contesté devant un retard six fois plus long", () => {
    /* Trois jours contre soixante : le premier a une personne qui attend une
       réponse, le second attend seulement un relevé. */
    const file = fileDesAttendus([vieuxMuet, jeuneConteste], [dit({ flowKey: "b", said: "autre", saidAmount: 280_000 })]);
    expect(file[0].flux.cle).toBe("b");
    expect(file[0].priorite).toBe("conteste");
    expect(file[1].priorite).toBe("muet");
  });

  it("range contesté, puis confirmé, puis nié, puis muet", () => {
    const file = fileDesAttendus(
      [vieuxMuet, jeuneConteste, moyenNie, moyenConfirme],
      [dit({ flowKey: "b", said: "autre", saidAmount: 1 }), dit({ id: "t3", flowKey: "c", said: "rien" }), dit({ id: "t4", flowKey: "d", said: "recu" })],
    );
    expect(file.map((x) => x.priorite)).toEqual(["conteste", "confirme", "nie", "muet"]);
  });

  it("à égalité de parole, le retard le plus long passe devant", () => {
    const file = fileDesAttendus([flux({ cle: "x", retardJours: 5 }), flux({ cle: "y", retardJours: 50 })], []);
    expect(file.map((x) => x.flux.cle)).toEqual(["y", "x"]);
  });

  it("attache son témoignage à chaque flux", () => {
    const file = fileDesAttendus([jeuneConteste], [dit({ flowKey: "b", said: "autre", saidAmount: 280_000 })]);
    expect(file[0].temoignage?.saidAmount).toBe(280_000);
  });
});

describe("ce qui empêche un témoignage", () => {
  const aujourdHui = "2026-10-03";

  it("« autre » sans montant n'est pas un témoignage", () => {
    // Le chiffre est tout ce qui le distingue de « reçu ».
    expect(pourquoiPasDeTemoignage({ said: "autre", aujourdHui })).toMatch(/somme/i);
    expect(pourquoiPasDeTemoignage({ said: "autre", saidAmount: 0, aujourdHui })).toMatch(/somme/i);
    expect(pourquoiPasDeTemoignage({ said: "autre", saidAmount: 280_000, aujourdHui })).toBeNull();
  });

  it("une date de crédit dans l'avenir", () => {
    expect(pourquoiPasDeTemoignage({ said: "recu", saidOn: "2026-12-01", aujourdHui })).toMatch(/avenir/i);
    expect(pourquoiPasDeTemoignage({ said: "recu", saidOn: aujourdHui, aujourdHui })).toBeNull();
  });

  it("« rien reçu » n'a pas besoin de date", () => {
    expect(pourquoiPasDeTemoignage({ said: "rien", aujourdHui })).toBeNull();
  });

  it("une réponse inconnue", () => {
    expect(pourquoiPasDeTemoignage({ said: "peut-etre" as never, aujourdHui })).toMatch(/ce que vous avez vu/i);
  });
});

describe("ce que la maison répond", () => {
  it("promet d'aller voir, jamais le crédit", () => {
    /* Promettre l'encaissement referait, à l'envers, la faute que tout ce lot
       corrige : affirmer un fait qu'on ne connaît pas. */
    for (const said of ["recu", "rien", "autre"] as const) {
      const r = accuseDeReception(said);
      expect(r).not.toMatch(/sera crédité|est crédité|vous sera versé/i);
      expect(r.length).toBeGreaterThan(20);
    }
    expect(accuseDeReception("rien")).toMatch(/relance/i);
    expect(accuseDeReception("autre")).toMatch(/perdrait/i);
  });
});

vi.mock("@/lib/auth", () => ({ requireSession: async () => ({ userId: "u-temoin", name: "Client Témoin", role: "client" }) }));
vi.mock("@/lib/audit", () => ({ audit: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const champs = (o: Record<string, string>): FormData => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
};

describe("le geste, bout à bout", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("enregistre ce que le client dit, et ne crédite rien", async () => {
    const { direLeFlux } = await import("@/components/temoignage-actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    const avant = (await r.listCash("u-temoin").catch(() => [])).length;

    const res = await direLeFlux(null, champs({ flowKey: "i9|2026-07-05|300000", said: "recu", saidOn: "2026-07-08" }));
    expect(res.ok).toBe(true);

    const [t] = await r.listTemoignages({ userId: "u-temoin" });
    expect(t.said).toBe("recu");
    expect(t.saidOn).toBe("2026-07-08");
    // Le point à tenir : un témoignage ne fait entrer aucun argent au journal.
    expect((await r.listCash("u-temoin").catch(() => [])).length).toBe(avant);
  });

  it("une nouvelle déclaration remplace l'ancienne", async () => {
    /* Une déclaration n'est pas un mouvement : quelqu'un qui relit son relevé et
       découvre que le virement était bien là doit pouvoir se reprendre, sans
       qu'on lui demande de « passer une déclaration inverse ». */
    const { direLeFlux } = await import("@/components/temoignage-actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    const cle = "i8|2026-09-05|500000";
    await direLeFlux(null, champs({ flowKey: cle, said: "rien" }));
    await direLeFlux(null, champs({ flowKey: cle, said: "recu", saidOn: "2026-09-12" }));
    const siens = (await r.listTemoignages({ userId: "u-temoin" })).filter((x) => x.flowKey === cle);
    expect(siens).toHaveLength(1);
    expect(siens[0].said).toBe("recu");
  });

  it("refuse « autre » sans montant", async () => {
    const { direLeFlux } = await import("@/components/temoignage-actions");
    const res = await direLeFlux(null, champs({ flowKey: "i7|2026-07-05|300000", said: "autre" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/somme/i);
  });

  it("refuse sans échéance", async () => {
    const { direLeFlux } = await import("@/components/temoignage-actions");
    const res = await direLeFlux(null, champs({ said: "recu" }));
    expect(res.ok).toBe(false);
  });
});

describe("la base et l'écran portent la même règle", () => {
  it("une seule déclaration vivante par échéance, et « autre » porte son chiffre", () => {
    const sql = readFileSync("C:/dev/guichet/supabase/migrations/0062_le_client_temoigne.sql", "utf8");
    expect(sql).toMatch(/create unique index[^;]*flow_reports_une_par_flux/);
    expect(sql).toMatch(/flow_reports_autre_chiffre/);
    // Elle se modifie, là où client_cash l'interdit, et le fichier dit pourquoi.
    expect(sql).not.toMatch(/flow_reports_immutable/);
  });

  it("le rappel n'invite à témoigner que le jour même", () => {
    /* Trois jours avant, le crédit n'a pas encore pu arriver : inviter alors
       ferait répondre « rien reçu » à tout le monde et noierait le signal. */
    const cron = readFileSync("C:/dev/guichet/src/app/api/cron/coupons/route.ts", "utf8");
    expect(cron).toMatch(/u\.inDays === 0 \? " Si votre compte-titres est tenu ailleurs/);
  });
});
