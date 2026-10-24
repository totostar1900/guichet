import { describe, expect, it } from "vitest";
import { SEED_OFFERS } from "@/data/seed";
import { echeancesProches, joursAvant, JOURS_FENETRE, JOURS_URGENT, presse, urgenceDe } from "@/lib/domain/echeances";
import type { Offer } from "@/lib/domain/types";

/**
 * CE QUI FERME BIENTÔT, ET SURTOUT CE QUI NE FERME PAS.
 *
 * La première version de cette liste comptait aussi les fonds, en lisant leur
 * « deadlineAt » comme une fenêtre de souscription. Le relevé du dépôt l'a
 * démentie : les deux FCP portent « 2099-12-31 », une sentinelle qui veut
 * dire « toujours ouvert ». Un fonds ne ferme pas. La garde la plus utile de
 * ce fichier est donc celle qui vérifie qu'ils n'y reviennent pas — c'est une
 * erreur qu'on ne voit pas, puisqu'elle ne se manifesterait qu'en 2099.
 */
const LE_JOUR = new Date("2026-10-24T09:00:00Z");

/** Une offre du dépôt, avec sa clôture déplacée : l'objet reste valide et
    traverse les mêmes filtres que la page du calendrier. */
const seance = (dansNJours: number): Offer => {
  const base = SEED_OFFERS.find((o) => o.kind === "BTA" && !o.hidden && o.status === "published");
  if (!base) throw new Error("le dépôt n'a plus de bon du Trésor publié : le cas de référence a disparu");
  const d = new Date(LE_JOUR.getTime() + dansNJours * 86_400_000);
  return { ...base, id: `essai-${dansNJours}`, deadlineAt: d.toISOString() };
};

/** La même offre, mais qui fermerait dans trois jours. */
const dansTroisJours = (o: Offer): Offer => ({ ...o, deadlineAt: new Date(LE_JOUR.getTime() + 3 * 86_400_000).toISOString() });

describe("les échéances proches", () => {
  it("compte les jours comme le rappel quotidien les compte", () => {
    /* Le même nombre que « watch.rappelMessage », qui partage désormais la
       fonction : sans cela le message dit « dans 5 jours » quand la page dit
       « dans 6 ». */
    expect(joursAvant(new Date(LE_JOUR.getTime() + 3 * 86_400_000).toISOString(), LE_JOUR)).toBe(3);
  });

  it("donne trois tons sur deux seuils", () => {
    expect(urgenceDe(0)).toBe("urgent");
    expect(urgenceDe(JOURS_URGENT)).toBe("urgent");
    expect(urgenceDe(JOURS_URGENT + 1)).toBe("bientot");
    expect(urgenceDe(JOURS_FENETRE)).toBe("calme");
  });

  it("retient une séance qui ferme dans la fenêtre", () => {
    const e = echeancesProches([seance(3)], LE_JOUR);
    expect(e).toHaveLength(1);
    expect(e[0].jours).toBe(3);
    expect(e[0].urgence).toBe("urgent");
    expect(e[0].href).toBe("/offres/essai-3");
  });

  it("écarte ce qui est déjà fermé", () => {
    expect(echeancesProches([seance(-1)], LE_JOUR)).toEqual([]);
  });

  it("écarte ce qui ferme au-delà de la fenêtre", () => {
    expect(echeancesProches([seance(JOURS_FENETRE + 1)], LE_JOUR)).toEqual([]);
    expect(echeancesProches([seance(JOURS_FENETRE)], LE_JOUR)).toHaveLength(1);
  });

  /* LES DEUX CAS SUIVANTS DATENT LEUR OFFRE DANS LA FENÊTRE, ET C'EST TOUT
     LEUR INTÉRÊT. Écrits sur les fonds du dépôt tels quels, ils passaient
     sans rien éprouver : « 2099-12-31 » tombe hors fenêtre, donc le filtre
     des dates les écartait avant que celui des segments ait son mot à dire.
     Une garde qui passe pour la mauvaise raison ne garde rien. Avec une
     clôture à trois jours, seule l'appartenance décide. */
  it("n'annonce jamais la clôture d'un fonds, même datée dans la fenêtre", () => {
    const fonds = SEED_OFFERS.filter((o) => o.kind === "FONDS");
    expect(fonds.length, "le dépôt n'a plus de fonds : le cas de référence a disparu").toBeGreaterThan(0);
    expect(echeancesProches(fonds.map(dansTroisJours), LE_JOUR)).toEqual([]);
  });

  it("n'annonce jamais la clôture d'une ligne cotée, même datée dans la fenêtre", () => {
    /* Une ligne de la cote se traite tant qu'elle est cotée : sa date ne dit
       rien qu'on puisse attendre. */
    const cotees = SEED_OFFERS.filter((o) => o.kind === "MARCHE");
    expect(cotees.length, "le dépôt n'a plus de ligne cotée : le cas de référence a disparu").toBeGreaterThan(0);
    expect(echeancesProches(cotees.map(dansTroisJours), LE_JOUR)).toEqual([]);
  });

  it("range de la plus proche à la plus lointaine", () => {
    const e = echeancesProches([seance(20), seance(2), seance(9)], LE_JOUR);
    expect(e.map((x) => x.jours)).toEqual([2, 9, 20]);
    expect(e.map((x) => x.urgence)).toEqual(["urgent", "bientot", "calme"]);
  });

  it("ne presse que sous le seuil qui fait remonter la section", () => {
    expect(presse(echeancesProches([seance(JOURS_URGENT)], LE_JOUR))).toBe(true);
    expect(presse(echeancesProches([seance(JOURS_URGENT + 1)], LE_JOUR))).toBe(false);
    expect(presse([])).toBe(false);
  });
});
