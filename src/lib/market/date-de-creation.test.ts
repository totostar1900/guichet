import { describe, expect, it } from "vitest";
import type { FundNav } from "@/lib/domain/market";
import type { Offer } from "@/lib/domain/types";
import { dateDeCreation, offerFromNav } from "./boc";

/**
 * UNE DATE DE CRÉATION NE RECULE PAS DANS LE TEMPS, ELLE N'AVANCE PAS.
 *
 * Le défaut, mesuré sur la production le 4 octobre 2026 : à partir du
 * bulletin n° 2551 (séance du 10 juillet 2026), cinq fonds d'Africa Bright
 * ont vu leur date de création passer à LA DATE DE CE BULLETIN. Les
 * quarante-cinq bulletins précédents donnaient les vraies : 2021-08-19,
 * 2023-09-18, 2021-08-19, 2022-03-25, 2022-08-11. Nos propres VL pour ces
 * fonds remontent au 29 août 2025.
 *
 * L'écran disait alors, sur la même carte : « FCP Cap Obligations · +27,39 %
 * depuis l'origine · depuis le 10 juil. 2026 », plus une performance sur
 * douze mois — soit un fonds obligataire de dix semaines ayant gagné
 * vingt-sept pour cent et vécu un an. Les chiffres étaient justes ; la date
 * les rendait absurdes. Annualisé, cela donnait +228 % par an quand les
 * quarante-cinq fonds de la cote tiennent entre 7,8 et 15,7 %.
 *
 * La règle est celle d'un fait passé : on garde la plus ancienne date jamais
 * publiée pour ce fonds. Elle vient du même bulletin, elle est sourcée, et
 * c'est la seule qui s'accorde avec les performances.
 */
const nav = (p: Partial<FundNav> = {}): FundNav => ({
  fundKey: "fcp-cap-obligations",
  name: "FCP CAP OBLIGATIONS",
  manager: "AFRICA BRIGHT ASSET MANAGEMENT",
  depositary: "BGFIBANK CAMEROUN",
  category: "O",
  frequency: "hebdomadaire",
  navDate: "2026-09-25",
  nav: 12_739,
  navOrigin: 10_000,
  inceptionDate: "2022-03-25",
  perfSinceInceptionPct: 27.39,
  bulletinNo: 2607,
  sessionDate: "2026-09-25",
  ...p,
});

describe("la date de création d'un fonds", () => {
  it("garde la plus ancienne publiée, et ignore celle qui avance", () => {
    expect(dateDeCreation("2026-07-10", "2022-03-25"), "la date du bulletin a remplacé la vraie").toBe("2022-03-25");
    // Une date plus ancienne qui arrive corrige, elle : c'est un fait qu'on apprend.
    expect(dateDeCreation("2021-08-19", "2022-03-25"), "une date plus ancienne doit corriger").toBe("2021-08-19");
    // Le premier bulletin n'a rien à comparer.
    expect(dateDeCreation("2022-03-25", undefined)).toBe("2022-03-25");
  });

  it("tient d'un bulletin à l'autre, sur la fiche entière", () => {
    const premier = offerFromNav(nav(), 2339);
    expect(premier.fund?.inceptionDate).toBe("2022-03-25");
    /* Le bulletin 2551 répète sa propre date de séance dans la colonne. La
       fiche ne doit pas la prendre, ni dans « fund », ni dans « opensAt »,
       qui est la même naissance vue par la liste des offres. */
    const apres = offerFromNav(nav({ inceptionDate: "2026-07-10", bulletinNo: 2551, navDate: "2026-07-10", sessionDate: "2026-07-10" }), 2551, premier);
    expect(apres.fund?.inceptionDate, "la date du bulletin a repris le dessus").toBe("2022-03-25");
    /* « opensAt » n'est PAS éprouvé ici, et il faut le dire plutôt que
       d'écrire une ligne qui ne peut pas tomber : il n'est posé qu'à la
       première ingestion, quand il n'y a rien à comparer et que la date
       réconciliée vaut forcément la date publiée. Vérifié par sabotage le
       4 octobre 2026 : le remplacer par la valeur brute ne fait tomber
       aucune épreuve, parce que les deux sont alors la même. */
  });

  it("ne sait pas rattraper un fonds dont le PREMIER bulletin porte la mauvaise date", () => {
    /* LA LIMITE, ÉCRITE PLUTÔT QUE TUE. La règle compare à ce qu'on sait
       déjà ; un fonds découvert après le 10 juillet 2026 n'a rien derrière
       lui, et sa date fausse serait gardée. Aucun des quarante-cinq fonds de
       la cote n'est dans ce cas — les cinq touchés étaient tous connus depuis
       le bulletin 2339 — mais le jour où il s'en présentera un, c'est la
       cohérence avec les VL qui le dira, pas cette fonction. */
    const neuf = offerFromNav(nav({ fundKey: "fcp-inconnu", inceptionDate: "2026-07-10", sessionDate: "2026-07-10" }), 2551);
    expect(neuf.fund?.inceptionDate).toBe("2026-07-10");
  });

  it("n'empêche pas une correction vers le passé", () => {
    /* Si le bulletin publie demain une date ANTÉRIEURE, c'est une
       information, pas une erreur : la fiche la prend. */
    const avant = offerFromNav(nav({ inceptionDate: "2022-03-25" }), 2339);
    const corrige = offerFromNav(nav({ inceptionDate: "2021-08-19" }), 2560, avant);
    expect(corrige.fund?.inceptionDate).toBe("2021-08-19");
  });
});
