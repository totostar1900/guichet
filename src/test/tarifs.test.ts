import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { commissionDue, commissionOuverte, fourchetteDesDroits, GRATUITS, TARIFS_FERMES } from "@/lib/domain/tarifs";
import { PASSAGES } from "@/lib/documents/passages-catalog";

/**
 * L'ANNEXE TARIFAIRE, QUE LA CONVENTION CITAIT SANS QU'ELLE EXISTE.
 *
 * L'article 6 renvoie depuis le début à « l'annexe tarifaire remise par le
 * conseiller ». Elle n'avait jamais été écrite : un texte opposable pointait
 * vers un document absent, et ce genre de promesse ne se voit que le jour où
 * un client la réclame.
 *
 * Deux règles tiennent cette page, et ce sont celles du barème de garde parce
 * que c'est la même nature de chose : un prix est une décision de maison, et
 * un tarif posé par défaut serait un prélèvement décidé par le code.
 */
const PAGE = "src/app/moi/tarifs/page.tsx";

describe("le tarif est fermé tant que la maison n'a rien arrêté", () => {
  it("ne prend rien, et le plancher ne se déclenche pas tout seul", () => {
    /* Le piège exact du barème de garde : sans cette règle, zéro pour cent
       prélèverait le minimum, et c'est le prélèvement accidentel qu'on veut
       empêcher. */
    expect(commissionOuverte(TARIFS_FERMES)).toBe(false);
    expect(commissionDue(TARIFS_FERMES, 10_000_000)).toBe(0);
    expect(commissionDue({ ...TARIFS_FERMES, commissionMin: 5_000 }, 10_000_000)).toBe(0);
  });

  it("et quand elle a arrêté un prix, le plancher s'applique à ce qui est dû", () => {
    const ouvert = { ...TARIFS_FERMES, commissionPct: 0.5, commissionMin: 5_000 };
    expect(commissionDue(ouvert, 10_000_000)).toBe(50_000);
    expect(commissionDue(ouvert, 100_000)).toBe(5_000);
    // Un ordre sans montant ne doit rien, plancher ou pas.
    expect(commissionDue(ouvert, 0)).toBe(0);
  });
});

describe("la fourchette des droits d'entrée se lit des fonds", () => {
  it("se calcule, au lieu d'être écrite en dur", () => {
    /* « De 0 à 3 % selon le fonds » est vrai le jour où on l'écrit et faux le
       mois suivant : c'est la seule page du site où cet écart se paie en
       réclamation. */
    expect(fourchetteDesDroits([{ entryFeePct: 1 }, { entryFeePct: 3 }, { entryFeePct: 0 }])).toEqual({ min: 0, max: 3 });
    expect(fourchetteDesDroits([{ entryFeePct: 2 }])).toEqual({ min: 2, max: 2 });
  });

  it("se tait quand aucun fonds n'est ouvert, au lieu d'inventer une borne", () => {
    expect(fourchetteDesDroits([])).toBeUndefined();
    expect(fourchetteDesDroits([{}, {}])).toBeUndefined();
  });
});

describe("la page lit les réglages vivants", () => {
  const src = () => readFileSync(PAGE, "utf8");

  it("compose le barème de garde et le tarif plutôt que d'en garder une copie", () => {
    /* Recopier ici le barème ou les droits d'un fonds créerait deux vérités,
       et c'est toujours la plus ancienne qui finit par s'afficher. */
    expect(src()).toMatch(/loadTarifs\(\), loadBaremeGarde\(\)/);
    expect(src()).toMatch(/fourchetteDesDroits\(fonds\)/);
    expect(src()).toMatch(/baremeOuvert\(bareme\)/);
  });

  it("nomme ce qui ne se facture pas, et depuis une seule liste", () => {
    // Un service absent de la liste finit par être réclamé : la parole du client contre la nôtre.
    expect(src()).toMatch(/GRATUITS\.map/);
    expect(GRATUITS.length).toBeGreaterThan(4);
    for (const g of GRATUITS) expect(g.length, g).toBeGreaterThan(15);
  });

  it("dit aussi ce qui ne nous revient pas", () => {
    /* Les frais de gestion d'un fonds pèsent plus que tout le reste de la
       page, et une annexe qui les tait est une demi-vérité. */
    expect(src()).toMatch(/frais de gestion d'un fonds sont prélevés chaque année dans sa valeur liquidative/);
    expect(src()).toMatch(/La fiscalité dépend de l'instrument/);
  });
});

describe("la convention et l'annexe se répondent", () => {
  it("l'article 6 cite toujours une annexe, et elle existe maintenant", () => {
    /* Le jour où l'article cessera de la citer, ou la citera autrement, cette
       page doit être relue : c'est elle qu'il rend opposable. */
    const art = (PASSAGES.convention ?? []).find((p) => p.key === "art_tarifs");
    expect(art, "l'article des tarifs a disparu du catalogue").toBeTruthy();
    expect(art!.fr).toMatch(/annexe tarifaire/);
    expect(art!.fr).toMatch(/trente jours/);
    expect(readFileSync(PAGE, "utf8")).toMatch(/trente jours avant son application/);
  });
});
