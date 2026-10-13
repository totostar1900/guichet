import { describe, expect, it } from "vitest";
import { etatDesSeries, niveauDeSerie, SERIES, seriesAVoir } from "@/lib/domain/fraicheur";

/**
 * LE GARDE QUI SÉPARE « LE ROBOT A TOURNÉ » DE « LA DONNÉE EST ARRIVÉE ».
 *
 * Les cas tenus ici sont ceux qui ont coûté : une série cadencée qui se tait
 * sous un robot vert, et une source événementielle muette qu'il ne faut PAS
 * compter comme une panne de notre côté.
 */

const LE = new Date("2026-10-13T12:00:00Z");
const ilYA = (jours: number) => new Date(LE.getTime() - jours * 86_400_000).toISOString();
const vue = (cle: string, derniers: Record<string, string | undefined>, muets: string[] = []) =>
  etatDesSeries(derniers, new Set(muets), LE).find((v) => v.cle === cle)!;

describe("la fraîcheur d'une série", () => {
  it("DIT QUE LA PANNE EST DANS L'ÉCRITURE QUAND LE ROBOT TOURNE", () => {
    /* Le défaut de référence : l'encours n'arrive plus, et pourtant le robot
       du bulletin passe tous les soirs. C'est l'écriture qui est cassée, et
       la phrase doit le dire plutôt que de renvoyer vers l'ordonnanceur. */
    const v = vue("serie-encours", { "serie-encours": ilYA(10) });
    expect(v.etat).toBe("tarie");
    expect(v.robotMuet).toBe(false);
    expect(v.diagnostic).toContain("la panne est dans l'écriture");
    expect(niveauDeSerie(v)).toBe("crit");
  });

  it("RENVOIE D'ABORD AU ROBOT QUAND LUI AUSSI SE TAIT", () => {
    const v = vue("serie-encours", { "serie-encours": ilYA(10) }, ["boc"]);
    expect(v.diagnostic).toContain("c'est lui qu'il faut regarder d'abord");
    expect(v.diagnostic).not.toContain("la panne est dans l'écriture");
  });

  it("N'ACCUSE PERSONNE QUAND C'EST LA SOURCE QUI SE TAIT", () => {
    /* Le 13 octobre 2026, la BEAC n'avait rien publié depuis le 22 septembre,
       vérifié à la source. Ce n'est pas une panne de lecture, et le dire
       ainsi est tout l'intérêt du point : c'est une information de marché. */
    const v = vue("serie-adjudications", { "serie-adjudications": ilYA(26) });
    expect(v.etat).toBe("tarie");
    expect(v.diagnostic).toContain("BEAC n'a rien publié depuis 26 jour(s)");
    expect(v.diagnostic).toContain("ce n'est pas une panne de notre côté");
    /* Vue, mais sans réveiller personne : une série événementielle n'est
       jamais critique du seul fait de son silence. */
    expect(niveauDeSerie(v)).toBe("warn");
  });

  it("NE CRIE PAS SUR UNE SEMAINE CALME", () => {
    /* Le journal BEAC n'écrit que ce qui change : huit jours sans une ligne
       est le fonctionnement normal, pas une panne. Un seuil posé trop court
       ici ferait une alerte hebdomadaire, donc une alerte qu'on ne lit plus. */
    const v = vue("serie-calendrier-beac", { "serie-calendrier-beac": ilYA(8) });
    expect(v.etat).toBe("recoit");
    expect(v.diagnostic).toBe("");
  });

  it("TRAITE L'ABSENCE TOTALE COMME LE PIRE CAS, ET NON COMME UNE DONNÉE MANQUANTE", () => {
    const v = vue("serie-encours", {});
    expect(v.etat).toBe("vide");
    expect(niveauDeSerie(v)).toBe("crit");
  });

  it("NE REMONTE QUE CE QUI APPELLE QUELQU'UN", () => {
    const toutVa = Object.fromEntries(SERIES.map((s) => [s.cle, ilYA(0)]));
    expect(seriesAVoir(etatDesSeries(toutVa, new Set(), LE))).toHaveLength(0);
  });

  it("RANGE LE PLUS GRAVE EN PREMIER", () => {
    const vues = etatDesSeries(
      { "serie-cotations": ilYA(0), "serie-encours": ilYA(10) },
      new Set(),
      LE,
    );
    /* Une série sans écriture connue passe avant une série tarie, qui passe
       avant celles qui reçoivent. */
    expect(vues[0]?.etat).toBe("vide");
    expect(vues.at(-1)?.cle).toBe("serie-cotations");
  });

  it("DÉCLARE UNE NATURE ET UNE SOURCE POUR CHAQUE SÉRIE", () => {
    /* Sans nature, le garde confond un silence normal et une panne ; sans
       source, la phrase accuse le mauvais responsable. Les deux sont la
       raison d'être du module, donc aucune série ne peut s'en passer. */
    for (const s of SERIES) {
      expect(["cadencee", "evenementielle"]).toContain(s.nature);
      expect(s.source.length).toBeGreaterThan(0);
      expect(s.heures).toBeGreaterThan(0);
    }
  });
});
