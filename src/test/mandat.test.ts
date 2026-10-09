import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JOUR_MAX, JOUR_MIN, mandatVivant, tirageAutorise, verifierLeMandat, type MandatPrelevement } from "@/lib/domain/mandat";

/**
 * LE MANDAT DE PRÉLÈVEMENT : la maison tire, au lieu que le client pousse.
 *
 * Tout le reste de la plateforme va dans un sens : le client signe, puis il
 * vire. Le prélèvement inverse la direction, sur une autorisation donnée une
 * fois. Il rend l'épargne programmée autonome, qui sans lui demande au client
 * de penser à l'alimenter, et il supprime la référence recopiée, puisque
 * c'est la maison qui émet l'opération.
 *
 * Deux décisions du dirigeant, le 9 octobre 2026, et ces tests les gardent :
 * UN MANDAT PAR USAGE, et CALENDRIER SEULEMENT.
 */
const base: MandatPrelevement = {
  id: "m1",
  ref: "MP-2610-ABCD",
  userId: "u1",
  objet: "provision",
  bankName: "Afriland",
  bankAccount: "CM21 10005 00001 12345678901 23",
  accountHolder: "Georges Nitcheu",
  maxAmount: 60_000,
  amount: 50_000,
  dayOfMonth: 5,
  state: "actif",
  createdAt: "2026-10-09T08:00:00Z",
  updatedAt: "2026-10-09T08:00:00Z",
};

describe("ce qu'un mandat doit porter", () => {
  it("un mandat sans plafond n'en est pas un", () => {
    expect(verifierLeMandat({ ...base, maxAmount: 0 })).toContain("plafond");
  });

  it("le montant prélevé ne dépasse jamais le plafond signé", () => {
    /* C'est le même objet que le plafond « au plus » d'un ordre, et la même
       phrase de la convention : la maison ne vous engage jamais au-delà. */
    expect(verifierLeMandat({ ...base, amount: 70_000 })).toContain("dépasser le plafond");
  });

  it("le jour va de 1 à 28, parce que tous les mois les ont", () => {
    expect(verifierLeMandat({ ...base, dayOfMonth: 31 })).toContain("entre 1 et 28");
    expect(verifierLeMandat({ ...base, dayOfMonth: JOUR_MIN })).toBeUndefined();
    expect(verifierLeMandat({ ...base, dayOfMonth: JOUR_MAX })).toBeUndefined();
  });

  it("le compte à débiter est nommé, et c'est le client", () => {
    expect(verifierLeMandat({ ...base, accountHolder: "" })).toContain("titulaire");
    expect(verifierLeMandat({ ...base, bankAccount: "" })).toContain("RIB");
  });

  it("un mandat qui alimente une instruction dit laquelle", () => {
    expect(verifierLeMandat({ ...base, objet: "instruction", standingId: undefined })).toContain("laquelle");
    expect(verifierLeMandat({ ...base, objet: "instruction", standingId: "so-1" })).toBeUndefined();
  });
});

describe("ce qu'un mandat autorise, et quand", () => {
  const signe = { ...base, signedAt: "2026-10-09T09:00:00Z" };

  it("rien tant qu'il n'est pas signé : une ligne en base n'autorise pas un débit", () => {
    expect(mandatVivant(base)).toBe(false);
    expect(tirageAutorise(base, 50_000)).toBe(false);
  });

  it("jamais au-delà du plafond, et c'est la seule règle au moment de tirer", () => {
    expect(tirageAutorise(signe, 50_000)).toBe(true);
    expect(tirageAutorise(signe, 60_000)).toBe(true);
    expect(tirageAutorise(signe, 60_001)).toBe(false);
  });

  it("ni suspendu, ni révoqué", () => {
    for (const state of ["suspendu", "revoque"] as const) expect(tirageAutorise({ ...signe, state }, 50_000)).toBe(false);
  });
});

describe("les deux décisions de la maison, tenues par le code", () => {
  it("un mandat par usage : un second sur le même objet se refuse", () => {
    const src = readFileSync("src/app/moi/prelevements/actions.ts", "utf8");
    expect(src).toContain("Vous avez déjà un mandat pour cela");
    expect(src).toContain("préléveraient deux fois".replace("préléveraient", "prélèveraient"));
  });

  it("calendrier seulement : aucune action ne déclenche un tirage à la demande", () => {
    const src = readFileSync("src/app/moi/prelevements/actions.ts", "utf8");
    expect(src).not.toMatch(/tirerAction|prelever(Maintenant|Action)/);
  });

  it("révoquer ne supprime pas : une contestation porte sur un tirage passé", () => {
    const src = readFileSync("src/app/moi/prelevements/actions.ts", "utf8");
    expect(src).toContain('state: "revoque"');
    expect(src).not.toMatch(/deleteMandat|removeMandat/);
  });

  it("l'exemplaire se produit à la signature, comme la convention et l'ordre", () => {
    const src = readFileSync("src/app/moi/prelevements/actions.ts", "utf8");
    const sign = src.indexOf("export async function signerMandatAction");
    expect(src.indexOf("generateMandat")).toBeGreaterThan(sign);
  });
});
