import { beforeEach, describe, expect, it } from "vitest";
import type { FundNav } from "@/lib/domain/market";

/**
 * LES DEUX CONTRÔLES DE SANTÉ SUR LES FONDS, et pourquoi ils existent.
 *
 * Le 6 décembre 2026, en demandant pourquoi la fiche du 11 décembre 2023
 * comptait 31 OPCVM là où le bulletin en imprime 51, on a trouvé autre
 * chose : un fonds publié deux fois.
 *
 * Le bulletin a écrit UNE fois « FCP BGFI Bank ATLAS » et cent trente et une
 * fois « FCP BGFIBank ATLAS ». La clef se fabriquant du nom, une espace a
 * suffi à créer un second fonds, resté publié avec la valeur liquidative de
 * sa première séance : le client voyait le même fonds deux fois, dont une au
 * prix d'il y a trois ans.
 *
 * LE CONTRÔLE QUI AURAIT DÛ LE DIRE ÉTAIT VERT. Il comptait les VL en
 * retard et ne s'alarmait qu'au-delà de cinq, si bien qu'un fonds figé
 * depuis MILLE CENT CINQUANTE-HUIT jours comptait pour un. Un retard se
 * compte, un gel se nomme : ce ne sont pas les mêmes faits.
 */
const nav = (fundKey: string, navDate: string, frequency: FundNav["frequency"] = "quotidienne"): FundNav => ({
  fundKey,
  name: fundKey.toUpperCase(),
  manager: "ESSAI",
  depositary: "ESSAI",
  category: "O",
  frequency,
  navDate,
  nav: 10_000,
  navOrigin: 10_000,
  inceptionDate: "2020-01-01",
  perfSinceInceptionPct: 0,
  bulletinNo: 1,
  sessionDate: navDate,
});

const { memoryRepository } = await import("@/lib/data/memory");
const { healthChecks } = await import("@/lib/health");

/** Le jour de référence des essais : les retards se comptent à partir de lui. */
const AUJOURD_HUI = new Date("2026-10-06T12:00:00.000Z");
const trouve = (cs: Awaited<ReturnType<typeof healthChecks>>, key: string) => cs.find((c) => c.key === key)!;

beforeEach(async () => {
  /* LE MAGASIN MÉMOIRE VIT SUR globalThis et survit d'un cas à l'autre : sans
     cette remise à zéro, le fonds figé d'un essai rendait critique le contrôle
     de l'essai suivant, et deux assertions passaient pour la mauvaise raison.
     On le vide donc, ce qui ressème le jeu de référence. */
  delete (globalThis as { __guichetStore?: unknown }).__guichetStore;
  await memoryRepository.upsertFundNavs([nav("fcp-temoin", "2026-10-05")]);
});

describe("un fonds connu sous deux clefs", () => {
  it("est signalé, et les deux clefs sont nommées", async () => {
    await memoryRepository.upsertFundNavs([nav("fcp-bgfibank-atlas", "2026-10-05"), nav("fcp-bgfi-bank-atlas", "2026-10-05")]);
    const c = trouve(await healthChecks(AUJOURD_HUI), "fonds-doubles");
    expect(c.level).toBe("crit");
    expect(c.detail).toContain("fcp-bgfi-bank-atlas");
    expect(c.detail).toContain("fcp-bgfibank-atlas");
  });

  it("et deux fonds réellement différents ne sont pas confondus", async () => {
    await memoryRepository.upsertFundNavs([nav("fcp-asca-horizon", "2026-10-05"), nav("fcp-asca-patrimoine", "2026-10-05")]);
    expect(trouve(await healthChecks(AUJOURD_HUI), "fonds-doubles").level).toBe("ok");
  });
});

describe("une valeur liquidative figée", () => {
  it("passe en critique à elle seule, là où le compte la noyait", async () => {
    /* Une seule suffit : c'est le fait qui compte, pas le nombre. */
    await memoryRepository.upsertFundNavs([nav("fcp-gele", "2023-08-04")]);
    const c = trouve(await healthChecks(AUJOURD_HUI), "navs");
    expect(c.level).toBe("crit");
    expect(c.value).toContain("figée");
    expect(c.detail).toContain("FCP-GELE");
  });

  it("tandis qu'un retard de trois semaines reste un simple retard", async () => {
    await memoryRepository.upsertFundNavs([nav("fcp-en-retard", "2026-09-04")]);
    const c = trouve(await healthChecks(AUJOURD_HUI), "navs");
    expect(c.level).not.toBe("crit");
    expect(c.detail).toContain("FCP-EN-RETARD");
  });
});
