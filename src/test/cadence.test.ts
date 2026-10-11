import { describe, expect, it } from "vitest";
import { cadenceDe, formeDeLaCadence, JOURS_DU_COMPTE, MOIS_DE_CADENCE } from "@/lib/domain/cadence";
import type { ActionClient } from "@/lib/domain/journal-client";

/**
 * LA CADENCE : DOUZE BARRES, UN COMPTE, UN DERNIER GESTE.
 *
 * Les trois colonnes que la maquette du 10 octobre 2026 dessinait au
 * répertoire et qui n'avaient pas été construites. Relevé le 12 octobre en
 * comparant la maquette à l'écran : cent neuf barres dessinées sur les sept
 * planches, zéro construite.
 */
const MAINTENANT = new Date("2026-10-12T10:00:00.000Z");

const geste = (at: string, g = "ordre.depose"): ActionClient =>
  ({ id: at, at, userId: "u1", geste: g, genre: "ordre" }) as ActionClient;

describe("les douze mois", () => {
  it("le dernier seau est le mois courant, le premier onze mois avant", () => {
    const c = cadenceDe([geste("2026-10-02T09:00:00Z"), geste("2025-11-03T09:00:00Z")], MAINTENANT);
    expect(c.mois).toHaveLength(MOIS_DE_CADENCE);
    expect(c.mois.at(-1), "octobre 2026").toBe(1);
    expect(c.mois[0], "novembre 2025").toBe(1);
  });

  it("et ce qui est plus vieux que douze mois ne compte nulle part", () => {
    /* Sans ce garde, un client parti depuis deux ans aurait des barres : la
       colonne dirait « il bouge » d'un dossier mort. */
    const c = cadenceDe([geste("2024-06-01T09:00:00Z")], MAINTENANT);
    expect(c.mois.every((x) => x === 0)).toBe(true);
    expect(c.dernier?.jours, "il reste le dernier geste, avec son âge").toBeGreaterThan(400);
  });
});

describe("l'échelle est celle de la ligne, pas celle du tableau", () => {
  it("le plafond sort des douze mois du client lui-même", () => {
    /* UN PLAFOND COMMUN ÉCRASERAIT TOUT LE MONDE dès qu'un institutionnel
       passe quatre cents gestes dans un mois : on ne lirait plus que sa
       colonne. Chacun à son échelle, et « Actions 30 j » porte le niveau
       absolu que les barres ne disent pas. */
    const petit = cadenceDe([geste("2026-10-01T09:00:00Z"), geste("2026-09-01T09:00:00Z")], MAINTENANT);
    expect(petit.plafond).toBe(1);
    const gros = cadenceDe([...Array(40)].map((_, i) => geste(`2026-10-0${(i % 9) + 1}T09:00:00Z`)), MAINTENANT);
    expect(gros.plafond).toBeGreaterThan(1);
  });

  it("et un plafond nul n'existe pas : on ne divise jamais par zéro", () => {
    expect(cadenceDe([], MAINTENANT).plafond).toBe(1);
  });
});

describe("les trente jours et le dernier geste", () => {
  it("la fenêtre courte compte en jours, pas en mois civils", () => {
    /* Le 12 octobre, un geste du 20 septembre est dans les trente jours bien
       qu'il soit d'un autre mois : confondre les deux ferait sauter le compte
       au premier de chaque mois. */
    const c = cadenceDe([geste("2026-09-20T09:00:00Z"), geste("2026-08-20T09:00:00Z")], MAINTENANT);
    expect(JOURS_DU_COMPTE).toBe(30);
    expect(c.recents).toBe(1);
  });

  it("le dernier geste est le plus récent, quel que soit l'ordre reçu", () => {
    const c = cadenceDe([geste("2026-09-01T09:00:00Z"), geste("2026-10-10T09:00:00Z"), geste("2026-08-01T09:00:00Z")], MAINTENANT);
    expect(c.dernier?.at).toBe("2026-10-10T09:00:00Z");
    expect(c.dernier?.jours).toBe(2);
  });

  it("et un client sans geste n'en a pas", () => {
    expect(cadenceDe([], MAINTENANT).dernier).toBeUndefined();
  });
});

describe("la forme se dit en une phrase", () => {
  it("parce que douze barres sont muettes pour un lecteur d'écran", () => {
    /* La maquette portait cette phrase sur chaque série. Elle n'est pas un
       ornement : c'est le seul contenu de la colonne pour qui ne voit pas. */
    expect(formeDeLaCadence(cadenceDe([], MAINTENANT))).toBe("aucun geste sur douze mois");
  });

  it("une hausse se dit, une baisse aussi", () => {
    /* UNE TENDANCE DEMANDE PLUS DE DEUX MOIS ACTIFS, sinon c'est un épisode :
       ces deux cas en avaient deux, et le garde du « seul coup » les a
       attrapés à juste titre. Ils portent désormais de vraies séries. */
    const monte = cadenceDe([geste("2026-02-01T09:00:00Z"), geste("2026-03-01T09:00:00Z"), geste("2026-08-01T09:00:00Z"), geste("2026-09-01T09:00:00Z"), geste("2026-09-02T09:00:00Z"), geste("2026-10-01T09:00:00Z"), geste("2026-10-02T09:00:00Z")], MAINTENANT);
    expect(formeDeLaCadence(monte)).toContain("en hausse");
    const baisse = cadenceDe([geste("2025-11-01T09:00:00Z"), geste("2025-11-02T09:00:00Z"), geste("2025-12-01T09:00:00Z"), geste("2025-12-02T09:00:00Z"), geste("2026-01-01T09:00:00Z"), geste("2026-05-01T09:00:00Z"), geste("2026-10-01T09:00:00Z")], MAINTENANT);
    expect(formeDeLaCadence(baisse)).toContain("en baisse");
  });

  it("et un écart faible reste stable, sinon trois gestes feraient une tendance", () => {
    const stable = cadenceDe([geste("2025-11-01T09:00:00Z"), geste("2026-03-01T09:00:00Z"), geste("2026-06-01T09:00:00Z"), geste("2026-10-01T09:00:00Z")], MAINTENANT);
    expect(formeDeLaCadence(stable)).toContain("stable");
  });

  it("la régularité se nomme, elle ne se devine pas", () => {
    const partout = cadenceDe([...Array(12)].map((_, i) => geste(new Date(Date.UTC(2025, 10 + i, 15)).toISOString())), MAINTENANT);
    expect(partout.moisActifs).toBe(12);
    expect(formeDeLaCadence(partout)).toContain("tous les mois");
    /* Trois mois actifs : au-dessus du garde du « seul coup », donc la
       régularité se nomme. Un seul mois tombe dans l'autre branche, qui le dit
       autrement et mieux. */
    const rare = cadenceDe([geste("2026-10-01T09:00:00Z"), geste("2026-06-01T09:00:00Z"), geste("2026-02-01T09:00:00Z")], MAINTENANT);
    expect(formeDeLaCadence(rare)).toContain("seulement 3 mois sur douze");
  });
});

describe("un seul coup n'est pas une tendance", () => {
  it("deux mois actifs au plus se nomment pour ce qu'ils sont", () => {
    /* Neuf gestes dans un seul mois, posé dans le dernier tiers, sortaient
       « en hausse » : la phrase promettait un mouvement là où il n'y a qu'un
       épisode. Vu à l'écran sur le jeu d'essai, pas déduit. */
    const unCoup = cadenceDe([...Array(9)].map((_, i) => geste(`2026-07-0${i + 1}T09:00:00Z`)), MAINTENANT);
    expect(unCoup.moisActifs).toBe(1);
    const phrase = formeDeLaCadence(unCoup);
    expect(phrase).toContain("d'un seul coup");
    expect(phrase, "et surtout pas une tendance").not.toContain("hausse");
  });
});
