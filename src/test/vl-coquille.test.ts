import { describe, expect, it } from "vitest";
import { estUnMontantEnDate, jugerLaVl, montantDerriereLaDate, MOTIF_VL } from "@/lib/market/vl-coquille";
import type { FundNav } from "@/lib/domain/market";

/**
 * LA COQUILLE D'ANNÉE DE JANVIER, ET LES BORNES DE SA RÉPARATION.
 *
 * Mesuré le 12 octobre 2026 en rouvrant les 45 séances qui portent une VL
 * écartée : sur 89, 56 précédaient la création du fonds, 20 devançaient la
 * séance, 6 étaient trop anciennes, et ZÉRO portait une valeur fautive. Le
 * message disait pourtant « date ou valeur invraisemblable » dans les 89 cas.
 *
 * Le cas réel qui a tout ouvert, tel que la base le garde :
 *
 *   séance 2024-01-05 · FCP AB AVENIR · VL du 2023-01-05, création 2023-09-21
 *
 * La bourse a écrit l'année qui venait de finir. La VL tombe dans la fenêtre
 * des quatre cents jours, donc seule la règle de la création l'attrape.
 */
const vl = (p: Partial<FundNav>): FundNav =>
  ({ fundKey: "fcpabavenir", name: "FCP AB AVENIR", navDate: "2023-01-05", nav: 10_250, navOrigin: 10_000, inceptionDate: "2023-09-21", perfSinceInceptionPct: 2.5, bulletinNo: 2400, sessionDate: "2024-01-05", ...p }) as FundNav;

describe("ce qui passe sans rien demander", () => {
  it("une VL du jour de la séance", () => {
    const v = jugerLaVl(vl({ navDate: "2024-01-05", inceptionDate: "2023-09-21" }), "2024-01-05");
    expect(v.garde?.navDate).toBe("2024-01-05");
    expect(v.coquille).toBeUndefined();
    expect(v.motif).toBeUndefined();
  });

  it("une VL d'il y a trois jours : un fonds hebdomadaire ne publie pas tous les jours", () => {
    expect(jugerLaVl(vl({ navDate: "2024-01-02", inceptionDate: "2023-09-21" }), "2024-01-05").garde).toBeDefined();
  });

  it("et une VL qui devance la séance de deux jours : la table est arrêtée avant d'être imprimée", () => {
    expect(jugerLaVl(vl({ navDate: "2024-01-07", inceptionDate: "2023-09-21" }), "2024-01-05").garde).toBeDefined();
  });
});

describe("la coquille d'année se répare, et elle se dit", () => {
  it("le cas du 5 janvier 2024 : l'année suivante résout tout", () => {
    const v = jugerLaVl(vl({}), "2024-01-05");
    expect(v.garde?.navDate).toBe("2024-01-05");
    expect(v.coquille).toBe("2023-01-05");
    /* LA RÉPARATION SE DIT, sans quoi ce serait une donnée inventée. */
    expect(v.motif).toBeUndefined();
  });

  it("une VL légèrement ancienne garde son écart une fois l'année corrigée", () => {
    /* Séance du 8 janvier, VL du 5 : trois jours d'écart, ce qui est la vie
       normale d'un fonds hebdomadaire. L'année réparée, l'écart demeure. */
    const v = jugerLaVl(vl({ navDate: "2023-01-05" }), "2024-01-08");
    expect(v.garde?.navDate).toBe("2024-01-05");
    expect(v.coquille).toBe("2023-01-05");
  });

  it("la correction ne déplace jamais un 29 février", () => {
    /* « 2024-02-29 » + un an n'existe pas. Plutôt que de glisser au 1er mars
       sans le dire, on refuse la correction. */
    const v = jugerLaVl(vl({ navDate: "2024-02-29", inceptionDate: "2024-06-01", sessionDate: "2025-02-28" }), "2025-02-28");
    expect(v.garde).toBeUndefined();
    expect(v.motif).toBe("avant_creation");
  });
});

describe("ce qu'on ne répare pas, et pourquoi", () => {
  it("UNE VL SEULEMENT TROP VIEILLE N'EST PAS RÉPARÉE : ce serait un pari", () => {
    /* Quatre cent vingt jours, et postérieure à la création : elle pourrait
       être une VL vraiment ancienne que la bourse réimprime. Seule une
       contradiction se répare, et celle-ci n'en est pas une. */
    const v = jugerLaVl(vl({ navDate: "2022-11-11", inceptionDate: "2020-01-01" }), "2024-01-05");
    expect(v.garde).toBeUndefined();
    expect(v.motif).toBe("vieille");
  });

  it("une VL qui devance la séance n'est pas réparée non plus", () => {
    /* Le cas KORI SERENITE : VL du 15 août sur une séance de mai. Reculer
       d'un an tomberait sur une date plausible et probablement fausse. */
    const v = jugerLaVl(vl({ navDate: "2026-08-15", inceptionDate: "2020-01-01", sessionDate: "2026-05-22" }), "2026-05-22");
    expect(v.garde).toBeUndefined();
    expect(v.motif).toBe("future");
  });

  it("et la correction qui ne résout pas tout est refusée", () => {
    /* L'année suivante lève bien la contradiction avec la création, mais la
       date devance alors la séance : on n'a pas trouvé la bonne lecture. */
    const v = jugerLaVl(vl({ navDate: "2023-06-01", inceptionDate: "2023-09-21", sessionDate: "2024-01-05" }), "2024-01-05");
    expect(v.garde).toBeUndefined();
    expect(v.motif).toBe("avant_creation");
  });
});

describe("chaque motif se nomme", () => {
  it("les quatre règles ont leur phrase, et aucune ne parle de valeur quand c'est une date", () => {
    expect(MOTIF_VL.avant_creation).toContain("création");
    expect(MOTIF_VL.future).toContain("postérieure");
    expect(MOTIF_VL.vieille).toContain("antérieure");
    expect(MOTIF_VL.valeur).toContain("montant");
  });

  it("une valeur nulle est bien nommée valeur", () => {
    expect(jugerLaVl(vl({ navDate: "2024-01-05", inceptionDate: "2023-09-21", nav: 0 }), "2024-01-05").motif).toBe("valeur");
  });
});

/**
 * LA MÊME COQUILLE, DANS L'AUTRE SENS, signalée par Georges le 13 octobre 2026.
 *
 * Le bulletin de mai 2024 imprime « 03/05/2025 » pour deux fonds : l'année a
 * été tapée une de trop. La date corrigée, le 3 mai 2024, est un vendredi, et
 * ces deux fonds sont valorisés chaque vendredi : leur série porte 04-12,
 * 04-19, un trou de deux vendredis, puis 05-10. La correction tombe dans le
 * trou, et les valeurs voisines l'encadrent.
 *
 * CE QUI SE TESTE ICI EST LA FENÊTRE, pas le décalage d'année, qui est de
 * l'arithmétique. Retirer un an « résout toutes les fautes » bien trop
 * facilement, puisque la borne générale tolère quatre cents jours de retard :
 * ce critère large acceptait seize des vingt cas de la base, dont DOUZE
 * fausses. Trente et un jours séparent le vrai du faux, et la mesure dit que
 * la séparation est franche : les quatre séances justes tombent à 5, 7, 10 et
 * 11 jours, les douze autres à 276 jours au moins.
 */
describe("la coquille d'année dans l'autre sens", () => {
  const futur = (p: Partial<FundNav>) => vl({ navDate: "2025-05-03", inceptionDate: "2022-01-01", ...p });

  it("répare les quatre séances de mai 2024, mesurées en base", () => {
    for (const [seance, recul] of [
      ["2024-05-08", 5],
      ["2024-05-10", 7],
      ["2024-05-13", 10],
      ["2024-05-14", 11],
    ] as const) {
      const v = jugerLaVl(futur({ sessionDate: seance }), seance);
      expect(v.garde?.navDate, `${seance} (${recul} jours)`).toBe("2024-05-03");
      expect(v.coquille).toBe("2025-05-03");
    }
  });

  it("refuse les douze autres, qui reculent de 276 jours ou plus", () => {
    /* Ecobank en février 2025, et Kori deux fois en 2026 : retirer un an rend
       une date plausible au sens large, et fausse au sens de la rangée. */
    for (const [seance, date] of [
      ["2025-02-07", "2025-05-05"],
      ["2025-02-14", "2025-05-05"],
      ["2026-05-18", "2026-08-15"],
      ["2026-05-22", "2026-08-15"],
    ] as const) {
      const v = jugerLaVl(futur({ navDate: date, sessionDate: seance }), seance);
      expect(v.garde, `${seance} · ${date}`).toBeUndefined();
      expect(v.motif).toBe("future");
    }
  });

  it("refuse quand retirer un an laisse la date dans le futur", () => {
    /* Kori, séance de mars 2026, VL annoncée en mars 2029 : moins un an
       donne 2028, toujours devant. Deux ans seraient une invention. */
    const v = jugerLaVl(futur({ navDate: "2029-03-13", sessionDate: "2026-03-16" }), "2026-03-16");
    expect(v.garde).toBeUndefined();
    expect(v.motif).toBe("future");
  });

  it("tient la borne exactement là où elle est posée", () => {
    /* Trente et un jours passent, trente-deux ne passent pas. Un seuil dont
       personne n'a vérifié les deux côtés est un seuil approximatif. */
    expect(jugerLaVl(futur({ navDate: "2025-04-10", sessionDate: "2024-05-11" }), "2024-05-11").garde?.navDate).toBe("2024-04-10");
    expect(jugerLaVl(futur({ navDate: "2025-04-10", sessionDate: "2024-05-12" }), "2024-05-12").garde).toBeUndefined();
  });

  it("ne touche pas au 29 février", () => {
    /* La même règle que pour le sens inverse : 2024-02-29 moins un an
       n'existe pas, et glisser au 1er mars déplacerait la date d'un jour à
       l'insu de tout le monde. */
    expect(jugerLaVl(futur({ navDate: "2028-02-29", sessionDate: "2027-02-20" }), "2027-02-20").garde).toBeUndefined();
  });
});

describe("le montant rendu en date", () => {
  /**
   * L'INVERSE DU DÉFAUT DE LA VERSION 10, et Georges l'a vu dans le classeur.
   * Un numéro de série imprimé là où une date est attendue se corrigeait
   * depuis des jours ; une date imprimée là où un MONTANT est attendu passait
   * pour une valeur liquidative trop ancienne, ce qui est un diagnostic faux
   * et qui désigne le mauvais responsable.
   */
  const LES_SEPT: [string, number, number][] = [
    // date lue, montant déduit, VL réelle portée par la série du fonds
    ["1927-07-17", 10_060, 10_060.33],
    ["1936-01-10", 13_159, 13_159.79],
    ["1934-07-25", 12_625, 12_625.52],
    ["1932-06-16", 11_856, 11_856.64],
    ["1934-07-22", 12_622, 12_622.81],
    ["1930-11-19", 11_281, 11_281.15],
  ];

  it("REND LE MONTANT QUE LA SÉRIE DU FONDS CONFIRME, À MOINS D'UN FRANC", () => {
    /* La preuve ne vient pas de la variation imprimée, qui est calculée par
       la bourse SUR LA CELLULE CORROMPUE et donc empoisonnée, mais de la
       série du fonds, qui ne lui doit rien. */
    for (const [date, attendu, vlReelle] of LES_SEPT) {
      expect(montantDerriereLaDate(date), date).toBe(attendu);
      const ecart = attendu - vlReelle;
      expect(ecart, `${date} : l'écart doit être négatif`).toBeLessThan(0);
      expect(Math.abs(ecart), `${date} : l'écart doit rester sous le franc`).toBeLessThan(1);
    }
  });

  it("TRONQUE, IL N'ARRONDIT PAS, et c'est ce qui dit ce qu'on perd", () => {
    /* Sept sur sept l'écart est négatif : le rendu en date prend la partie
       entière. On sait donc exactement ce que la reconstruction coûte, ce
       qui est la condition pour oser l'écrire dans un rapport. */
    for (const [date, attendu, vlReelle] of LES_SEPT) {
      expect(montantDerriereLaDate(date), date).toBe(Math.floor(vlReelle));
      expect(attendu).toBe(Math.floor(vlReelle));
    }
  });

  it("RECONNAÎT UNE CELLULE QUI N'EST PAS UNE DATE, ET SEULEMENT CELLE-LÀ", () => {
    expect(estUnMontantEnDate("1936-01-10")).toBe(true);
    expect(estUnMontantEnDate("1999-12-31")).toBe(true);
    /* Aucune VL de ce marché n'existe avant 2000 : la borne ne discute avec
       personne. Une date de 2023 reste une date, si vieille soit-elle. */
    expect(estUnMontantEnDate("2000-01-01")).toBe(false);
    expect(estUnMontantEnDate("2023-04-14")).toBe(false);
  });

  it("NE RÉPARE PAS L'ANNÉE D'UNE CELLULE QUI N'EST PAS UNE DATE", () => {
    /* LE GARDE QUI COMPTE. Ajouter une année à un montant produirait une
       date plausible à partir de rien, ce qui est exactement la valeur
       inventée que la maison refuse. Le motif passe donc AVANT les deux
       réparations de coquille. */
    const v = jugerLaVl(
      { fundKey: "f", name: "FCP AB CASH", navDate: "1936-01-10", nav: 13_159, inceptionDate: "2020-01-01" } as never,
      "2026-07-10",
    );
    expect(v.garde).toBeUndefined();
    expect(v.motif).toBe("montant_en_date");
    expect(v.montantDeduit).toBe(13_159);
  });
});
