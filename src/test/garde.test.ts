import { describe, expect, it } from "vitest";
import { BAREME_FERME, baremeOuvert, droitsDeGarde, joursGardes, positionGardee, trimestreDe, trimestrePrecedent, type BaremeGarde, type LigneGardee } from "@/lib/domain/garde";

/**
 * Les droits de garde, et le prélèvement qu'on ne veut pas voir arriver seul.
 *
 * Le risque de ce module n'est pas de mal calculer, il est de calculer quelque
 * chose alors que la maison n'a rien décidé. Le premier contrôle est donc que
 * le barème fermé ne prélève rien, par aucun chemin, pas même par son plancher.
 */

const T3: ReturnType<typeof trimestreDe> = { cle: "2026-T3", du: "2026-07-01", au: "2026-09-30" };

const ligne = (p: Partial<LigneGardee> = {}): LigneGardee => ({
  intentId: "i1",
  titre: "Cameroun 2030",
  nature: "PRIMAIRE",
  depuis: "2024-01-01",
  assiette: 10_000_000,
  origine: "nominal",
  ...p,
});

const OUVERT: BaremeGarde = { bps: 25, minimum: 5_000, franchise: 1_000_000, exonerees: ["FONDS"] };

describe("le barème fermé ne prélève rien", () => {
  it("ne doit rien, quelle que soit l'assiette", () => {
    const d = droitsDeGarde([ligne(), ligne({ intentId: "i2", assiette: 500_000_000 })], BAREME_FERME, T3);
    expect(d.du).toBe(0);
    expect(d.raison).toBe("barème fermé");
    expect(baremeOuvert(BAREME_FERME)).toBe(false);
  });

  it("ne déclenche pas son plancher", () => {
    /* Le piège : un barème à zéro point de base avec un minimum prélèverait le
       minimum. C'est exactement le prélèvement accidentel qu'on veut empêcher. */
    const d = droitsDeGarde([ligne()], { ...BAREME_FERME, minimum: 5_000 }, T3);
    expect(d.du).toBe(0);
    expect(d.plancherApplique).toBe(false);
  });
});

describe("l'assiette et le prorata", () => {
  it("compte les jours réellement gardés, bornes incluses", () => {
    expect(joursGardes(ligne(), T3)).toBe(92);
    expect(joursGardes(ligne({ depuis: "2026-09-30" }), T3)).toBe(1);
    expect(joursGardes(ligne({ jusqua: "2026-08-15" }), T3)).toBe(46);
    /* Entrée après la clôture, ou sortie avant l'ouverture : rien. */
    expect(joursGardes(ligne({ depuis: "2026-10-01" }), T3)).toBe(0);
    expect(joursGardes(ligne({ jusqua: "2026-06-30" }), T3)).toBe(0);
  });

  it("proratise ce qui est dû", () => {
    /* Dix millions à vingt-cinq points de base font 25 000 par an ; quatre-vingt
       douze jours en font un peu moins du quart. */
    const plein = droitsDeGarde([ligne()], OUVERT, T3);
    expect(Math.round(plein.brut)).toBe(6_301);
    expect(Math.round(plein.du)).toBe(6_301);
    const moitie = droitsDeGarde([ligne({ depuis: "2026-08-16" })], OUVERT, T3);
    expect(moitie.lignes[0].jours).toBe(46);
    expect(Math.round(moitie.brut)).toBe(3_151);
  });

  it("laisse le plancher effacer le prorata, et le dit", () => {
    /* Le prorata se lit sur le brut, jamais sur ce qui est dû : à ce barème,
       une demi-période tombe sous le plancher et le plancher la relève. Une
       facturation qui n'exposerait que le montant dû ferait croire que le
       prorata n'a pas fonctionné. */
    const moitie = droitsDeGarde([ligne({ depuis: "2026-08-16" })], OUVERT, T3);
    expect(moitie.brut).toBeLessThan(OUVERT.minimum);
    expect(moitie.du).toBe(OUVERT.minimum);
    expect(moitie.plancherApplique).toBe(true);
  });

  it("pondère l'assiette moyenne par les jours", () => {
    /* Une ligne entrée la veille de la clôture ne pèse pas comme une tenue tout
       le trimestre, et c'est cette moyenne que la franchise regarde. */
    const d = droitsDeGarde([ligne({ depuis: "2026-09-30", assiette: 92_000_000 })], OUVERT, T3);
    expect(Math.round(d.assietteMoyenne)).toBe(1_000_000);
  });
});

describe("la franchise et le plancher, dans cet ordre", () => {
  it("ne facture pas un portefeuille sous la franchise", () => {
    const d = droitsDeGarde([ligne({ assiette: 400_000 })], OUVERT, T3);
    expect(d.du).toBe(0);
    expect(d.raison).toBe("sous la franchise");
  });

  it("ne lui applique pas non plus le plancher", () => {
    /* L'ordre des règles n'est pas indifférent : inverser les deux ferait payer
       le plancher à celui qu'on a décidé de ne pas facturer. */
    expect(droitsDeGarde([ligne({ assiette: 400_000 })], OUVERT, T3).plancherApplique).toBe(false);
  });

  it("relève au plancher ce qui est dû mais dérisoire", () => {
    const d = droitsDeGarde([ligne({ assiette: 1_200_000 })], OUVERT, T3);
    expect(d.brut).toBeLessThan(OUVERT.minimum);
    expect(d.du).toBe(OUVERT.minimum);
    expect(d.plancherApplique).toBe(true);
  });
});

describe("les exonérations", () => {
  it("ne facture pas un fonds, qui porte déjà ses frais dans sa valeur liquidative", () => {
    const d = droitsDeGarde([ligne({ nature: "FONDS", assiette: 50_000_000 })], OUVERT, T3);
    expect(d.du).toBe(0);
    expect(d.raison).toBe("aucune ligne gardée");
  });

  it("le fait paraître à l'avis plutôt que de l'en retirer", () => {
    /* Une ligne absente de l'avis se lit comme un oubli ; une ligne à zéro avec
       sa raison se lit comme une décision. */
    const d = droitsDeGarde([ligne({ nature: "FONDS" }), ligne({ intentId: "i2" })], OUVERT, T3);
    expect(d.lignes).toHaveLength(2);
    expect(d.lignes.find((l) => l.nature === "FONDS")).toMatchObject({ exoneree: true, brut: 0 });
  });
});

describe("ce qu'une position devient aux yeux de la garde", () => {
  const pos = (over: Record<string, unknown> = {}) =>
    positionGardee({
      intent: { id: "i1", createdAt: "2026-02-10T09:00:00Z" },
      offer: { title: "Cameroun 2030", kind: "OTA", settleOn: "2026-02-14", maturityOn: "2030-02-14" },
      nominalAmount: 10_000_000,
      ...over,
    } as Parameters<typeof positionGardee>[0]);

  it("compte la garde à partir du règlement, pas de la commande", () => {
    /* La maison ne garde rien tant que le titre n'est pas livré. */
    expect(pos().depuis).toBe("2026-02-14");
  });

  it("retombe sur la date de l'ordre quand le règlement manque", () => {
    /* Elle est antérieure, donc jamais à l'avantage de la maison. */
    expect(pos({ offer: { title: "X", kind: "FONDS" } }).depuis).toBe("2026-02-10");
  });

  it("arrête la garde à l'échéance", () => {
    expect(pos().jusqua).toBe("2030-02-14");
    expect(pos({ offer: { title: "X", kind: "FONDS", settleOn: "2026-02-14" } }).jusqua).toBeUndefined();
  });

  it("dit d'où vient son assiette, un nominal n'étant pas un prix", () => {
    expect(pos()).toMatchObject({ assiette: 10_000_000, origine: "nominal" });
    expect(pos({ marketValue: 9_400_000 })).toMatchObject({ assiette: 9_400_000, origine: "cours" });
  });

  it("laisse un cours à zéro être un cours", () => {
    /* Une ligne radiée vaut zéro, ce qui n'est pas la même chose que ne pas
       avoir de cours : facturer son nominal serait facturer ce qu'elle valait. */
    expect(pos({ marketValue: 0 })).toMatchObject({ assiette: 0, origine: "cours" });
  });
});

describe("les périodes", () => {
  it("nomme le trimestre civil qui contient une date", () => {
    expect(trimestreDe("2026-09-29")).toEqual({ cle: "2026-T3", du: "2026-07-01", au: "2026-09-30" });
    expect(trimestreDe("2026-01-01").cle).toBe("2026-T1");
    expect(trimestreDe("2026-12-31")).toEqual({ cle: "2026-T4", du: "2026-10-01", au: "2026-12-31" });
  });

  it("facture une période close, jamais celle qui court", () => {
    expect(trimestrePrecedent("2026-09-29").cle).toBe("2026-T2");
    /* Et le passage d'année se fait sans trou. */
    expect(trimestrePrecedent("2026-01-15").cle).toBe("2025-T4");
  });

  it("compte février comme il est", () => {
    const t1 = trimestreDe("2024-02-01");
    expect(joursGardes(ligne({ depuis: "2020-01-01" }), t1)).toBe(91);
  });
});
