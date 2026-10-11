import { describe, expect, it } from "vitest";
import { attendEncore, couvre, jugementVivant, MOTIFS, MOTIFS_DE_JUGEMENT, motifSurUnePeriode, porteeDUnJugement, remarquesNonJugees, type JugementBulletin } from "@/lib/domain/jugement-bulletin";
import { classer } from "@/lib/market/remarques";

/**
 * « IL N'Y EST PAS » : LE DESK RÉPOND AU LECTEUR.
 *
 * Mesuré le 11 octobre 2026 : relire les 212 séances en attente ne rend rien,
 * 208 rendent exactement la même chose. Le seul levier du desk était donc un
 * bouton sans effet, et il n'avait aucun moyen de dire qu'il avait regardé.
 */
const INDICE = "Indice BVMAC ALL SHARE introuvable.";
const OBLIG = "Obligation CM0000020115 : ligne de cours non reconnue.";

const seance = (d: string, warnings: string[] = [], anomalies: string[] = [], equities = 6) => ({
  sessionDate: d,
  status: (warnings.length || anomalies.length ? "partiel" : "ok") as "ok" | "partiel" | "echec",
  counts: { equities, bonds: 10, funds: 20 },
  warnings,
  anomalies,
});

const jug = (p: Partial<JugementBulletin>): JugementBulletin => ({
  id: "j1", portee: "seance", motif: "absent_du_document", par: "u1", at: "2026-10-11T10:00:00Z", ...p,
});

describe("un jugement ne corrige rien", () => {
  it("il ne touche pas le statut du lecteur", () => {
    /* LA LECTURE DE LA MACHINE RESTE INTACTE. On ne fait pas passer une
       séance en « ok » parce qu'une personne a jugé : son verdict reste
       consultable tel quel, et c'est ce qui permet de la relire plus tard. */
    const b = seance("2023-03-03", [INDICE]);
    const j = [jug({ seance: "2023-03-03", cible: INDICE, motif: "pas_encore_publie" })];
    expect(attendEncore(b, j, classer)).toBe(false);
    expect(b.status, "le statut n'est pas réécrit").toBe("partiel");
  });

  it("et une séance sans remarque n'attend personne, jugement ou pas", () => {
    expect(attendEncore(seance("2026-10-09"), [], classer)).toBe(false);
  });
});

describe("la portée d'une séance vise la phrase", () => {
  it("mot pour mot, et pas un rang", () => {
    /* Une lecture n'a pas d'index stable : relire réordonne les remarques, et
       un jugement accroché au troisième rang se retrouverait sur une autre
       phrase. */
    const j = jug({ seance: "2023-03-03", cible: INDICE });
    expect(couvre(j, "2023-03-03", INDICE, classer)).toBe(true);
    expect(couvre(j, "2023-03-03", OBLIG, classer)).toBe(false);
    expect(couvre(j, "2023-03-08", INDICE, classer), "une autre séance").toBe(false);
  });

  it("si la remarque change, le jugement cesse de s'appliquer et elle revient", () => {
    /* Conséquence VOULUE : un jugement porte sur un énoncé précis. Une
       remarque reformulée par un lecteur corrigé est une autre affirmation,
       qui mérite un autre regard. */
    const j = [jug({ seance: "2023-03-03", cible: "Indice BVMAC introuvable." })];
    const b = seance("2023-03-03", [INDICE]);
    expect(remarquesNonJugees(b, j, classer)).toEqual([INDICE]);
    expect(attendEncore(b, j, classer)).toBe(true);
  });
});

describe("la portée d'une période ferme une famille", () => {
  it("et c'est ce qui rend le geste praticable", () => {
    /* « Indice BVMAC introuvable » est identique sur 112 séances. Demander
       112 gestes aurait garanti que personne n'en fasse aucun. */
    const j = [jug({ portee: "periode", famille: "A", jusquau: "2023-12-11", motif: "pas_encore_publie" })];
    expect(attendEncore(seance("2023-03-03", [INDICE]), j, classer)).toBe(false);
    expect(attendEncore(seance("2023-12-20", [INDICE]), j, classer), "après la borne, c'est un vrai défaut").toBe(true);
  });

  it("elle ne ferme que sa propre famille", () => {
    const j = [jug({ portee: "periode", famille: "A", jusquau: "2023-12-11", motif: "pas_encore_publie" })];
    expect(attendEncore(seance("2023-03-03", [INDICE, OBLIG]), j, classer), "H reste").toBe(true);
    expect(remarquesNonJugees(seance("2023-03-03", [INDICE, OBLIG]), j, classer)).toEqual([OBLIG]);
  });

  it("un seul motif vaut pour une période", () => {
    /* Il affirme quelque chose sur l'HISTOIRE DE LA PLACE, qu'on peut tenir
       sans ouvrir un document. Les autres affirment quelque chose sur UN
       document, et personne ne lit 112 PDF. */
    expect(MOTIFS.filter(motifSurUnePeriode)).toEqual(["pas_encore_publie"]);
    expect(MOTIFS.length, "liste fermée : un motif libre redeviendrait une phrase").toBe(5);
  });

  it("et elle annonce ce qu'elle fermerait avant d'être prise", () => {
    const bulletins = [seance("2023-03-03", [INDICE]), seance("2023-03-08", [INDICE, OBLIG]), seance("2024-01-05", [INDICE])];
    const j = jug({ portee: "periode", famille: "A", jusquau: "2023-12-11", motif: "pas_encore_publie" });
    expect(porteeDUnJugement(j, bulletins, classer)).toEqual({ seances: 2, remarques: 2 });
  });
});

describe("retirer un jugement le masque, et rend ce qu'il fermait", () => {
  it("le domaine ne compte que les vivants", () => {
    const vif = jug({ seance: "2023-03-03", cible: INDICE });
    const mort = { ...vif, retireLe: "2026-10-12T08:00:00Z", retirePar: "u2" };
    expect(jugementVivant(vif)).toBe(true);
    expect(jugementVivant(mort)).toBe(false);
    expect(attendEncore(seance("2023-03-03", [INDICE]), [mort], classer), "la remarque revient").toBe(true);
  });
});

describe("le garde des séances sans aucun cours", () => {
  it("elles ne quittent pas la file sur un jugement de période", () => {
    /* Sans ce garde, un jugement de période fermerait au passage une séance
       entièrement vide, et c'est le genre de trou qu'on ne retrouve que des
       mois plus tard. Il faut qu'une personne ait dit quelque chose SUR ELLE. */
    const vide = seance("2023-01-04", [INDICE], [], 0);
    const periode = [jug({ portee: "periode", famille: "A", jusquau: "2023-12-11", motif: "pas_encore_publie" })];
    expect(attendEncore(vide, periode, classer)).toBe(true);
    const surElle = [...periode, jug({ id: "j2", seance: "2023-01-04", cible: INDICE, motif: "illisible_a_la_source" })];
    expect(attendEncore(vide, surElle, classer)).toBe(false);
  });
});

describe("chaque motif dit ce qu'il affirme", () => {
  it("sinon il serait choisi au hasard", () => {
    for (const m of MOTIFS) {
      expect(MOTIFS_DE_JUGEMENT[m].libelle.length, m).toBeGreaterThan(10);
      expect(MOTIFS_DE_JUGEMENT[m].dit.length, m).toBeGreaterThan(30);
    }
  });
});

describe("ce qu'aucun jugement ne peut fermer reste visible", () => {
  it("un statut signalé sans remarque à juger", () => {
    /* Le statut se calcule DEPUIS les remarques, donc « partiel » sans
       remarque ne devrait pas exister. S'il arrive quand même, personne ne
       peut fermer cette séance : la faire disparaître de la file la rendrait
       invisible pour toujours, et c'est la pire des deux erreurs. */
    const muette = { sessionDate: "2024-01-03", status: "partiel" as const, counts: { equities: 2, bonds: 10, funds: 20 }, warnings: [], anomalies: [] };
    expect(attendEncore(muette, [], classer)).toBe(true);
    const periode = [jug({ portee: "periode", famille: "A", jusquau: "2099-01-01", motif: "pas_encore_publie" })];
    expect(attendEncore(muette, periode, classer), "et aucun jugement ne l'emporte au passage").toBe(true);
  });
});
