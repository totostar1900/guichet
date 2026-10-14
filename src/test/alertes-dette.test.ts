import { describe, expect, it } from "vitest";
import { alertes, alerteDesSources, alerteDesTrous, alerteDuService, SEUIL_SERVICE_ATTENTION, SEUIL_SERVICE_GRAVE } from "@/lib/market/alertes-dette";
import type { SerieVue } from "@/lib/domain/fraicheur";
import type { Trimestre } from "@/lib/market/mur-echeances";

/**
 * UNE ALERTE N'EST PAS UN CHIFFRE QUI DÉPASSE, C'EST UNE PHRASE QUI DIT QUOI
 * FAIRE. Trois familles de défaut, et non trois seuils sur le même chiffre :
 * un fait du calendrier, une panne invisible, une faute déjà commise.
 */
const q = (p: Partial<Trimestre> = {}): Trimestre => ({
  clef: "2027-T1", annee: 2027, trimestre: 1, debut: "2027-01-01",
  capital: 0, coupon: 0, capitalMesure: 0, lignes: 3,
  parPorte: { cote: { capital: 0, coupon: 0 }, adjuge: { capital: 0, coupon: 0 } },
  ...p,
});
const serie = (p: Partial<SerieVue> & { cle: string }): SerieVue =>
  ({ quoi: "Une série", robot: "boc", nature: "cadencee", heures: 96, etat: "recoit", robotMuet: false, diagnostic: "", ...p }) as SerieVue;

describe("le service qui vient", () => {
  it("MONTE D'UN CRAN AUX SEUILS ÉCRITS, qui se discutent parce qu'ils sont ici", () => {
    expect(alerteDuService([q({ capital: 10e9 })])?.niveau).toBe("info");
    expect(alerteDuService([q({ capital: SEUIL_SERVICE_ATTENTION })])?.niveau).toBe("attention");
    expect(alerteDuService([q({ capital: SEUIL_SERVICE_GRAVE })])?.niveau).toBe("grave");
  });

  it("SÉPARE LE CAPITAL DU COUPON DANS SA PHRASE, et dit la part adjugée", () => {
    /* La part adjugée est celle dont nous ne voyons pas toutes les séances :
       c'est précisément ce qui doit accompagner le chiffre. */
    const a = alerteDuService([q({ capital: 300e9, coupon: 50e9, parPorte: { cote: { capital: 50e9, coupon: 0 }, adjuge: { capital: 250e9, coupon: 50e9 } } })]);
    expect(a?.titre).toContain("350");
    expect(a?.dit).toContain("300");
    expect(a?.dit).toContain("50");
    expect(a?.dit).toContain("86 %");
  });

  it("ne crie pas sur un trimestre vide", () => {
    expect(alerteDuService([q()])).toBeUndefined();
    expect(alerteDuService([])).toBeUndefined();
  });
});

describe("une source qui se tait", () => {
  it("NE DIT RIEN QUAND TOUT REÇOIT", () => {
    expect(alerteDesSources([serie({ cle: "serie-encours" })])).toBeUndefined();
  });

  it("IGNORE LES SÉRIES QUI NE SONT PAS DE LA DETTE", () => {
    /* Une alerte sur la dette qui se déclenche pour les cotations d'actions
       apprend à ne plus la lire. */
    expect(alerteDesSources([serie({ cle: "serie-cotations", etat: "tarie", diagnostic: "silence" })])).toBeUndefined();
  });

  it("passe au grave quand une série n'a JAMAIS rien reçu", () => {
    const a = alerteDesSources([serie({ cle: "serie-adjudications", etat: "vide", diagnostic: "rien n'est jamais arrivé" })]);
    expect(a?.niveau).toBe("grave");
    expect(a?.dit).toContain("rien n'est jamais arrivé");
  });

  it("compte les séries muettes plutôt que d'en nommer une seule", () => {
    const a = alerteDesSources([
      serie({ cle: "serie-encours", etat: "tarie", depuis: 200, diagnostic: "a." }),
      serie({ cle: "serie-avis-emission", etat: "tarie", depuis: 900, diagnostic: "b." }),
    ]);
    expect(a?.titre).toContain("2 séries");
    /* Chaque diagnostic porte le nom de sa serie : « a. b. » ne disait pas
       laquelle se taisait depuis neuf cents heures. */
    expect(a?.dit).toBe("Une série : a. · Une série : b.");
  });
});

describe("un trou dans la série", () => {
  it("DIT LA PART ET CE QU'ELLE FAUSSE", () => {
    /* Une ligne absente fait baisser le total exactement comme un
       remboursement : c'est ça qu'il faut écrire, pas « 784 ». */
    const a = alerteDesTrous(784, 18_497, 518);
    expect(a?.titre).toContain("784");
    expect(a?.dit).toContain("4.2 %");
    expect(a?.dit).toContain("remboursement");
  });

  it("se tait quand la série est entière", () => {
    expect(alerteDesTrous(0, 18_497, 0)).toBeUndefined();
  });
});

describe("les trois ensemble", () => {
  it("RANGENT LE PLUS GRAVE EN TÊTE", () => {
    const a = alertes({
      mur: [q({ capital: 10e9 })],
      series: [serie({ cle: "serie-encours", etat: "vide", diagnostic: "x" })],
      manquants: 784, attendus: 18_497, seances: 518,
    });
    expect(a.map((x) => x.niveau)).toEqual(["grave", "attention", "info"]);
    expect(a[0].clef).toBe("sources");
  });

  it("n'en rend aucune quand il n'y a rien à dire", () => {
    expect(alertes({ mur: [q()], series: [serie({ cle: "serie-encours" })], manquants: 0, attendus: 0, seances: 0 })).toEqual([]);
  });
});

describe("plusieurs séries muettes", () => {
  it("NE RÉPÈTE PAS QUATRE FOIS LA MÊME PHRASE : elle nomme les séries", () => {
    /* Vu à l'écran : « la série n'a jamais rien reçu » répété mot pour mot
       quatre fois. Quatre fois la même phrase n'est pas quatre informations. */
    const a = alerteDesSources([
      serie({ cle: "serie-encours", quoi: "Encours", etat: "vide", diagnostic: "jamais rien reçu." }),
      serie({ cle: "serie-adjudications", quoi: "Adjudications", etat: "vide", diagnostic: "jamais rien reçu." }),
    ]);
    expect(a?.dit).toBe("Encours, Adjudications : jamais rien reçu.");
  });

  it("garde chaque diagnostic quand ils diffèrent vraiment", () => {
    const a = alerteDesSources([
      serie({ cle: "serie-encours", quoi: "Encours", etat: "tarie", diagnostic: "rien depuis 9 jours." }),
      serie({ cle: "serie-adjudications", quoi: "Adjudications", etat: "vide", diagnostic: "jamais rien reçu." }),
    ]);
    expect(a?.dit).toBe("Encours : rien depuis 9 jours. · Adjudications : jamais rien reçu.");
  });

  it("une seule série garde sa phrase nue", () => {
    expect(alerteDesSources([serie({ cle: "serie-encours", quoi: "Encours", etat: "tarie", diagnostic: "rien depuis 9 jours." })])?.dit).toBe("rien depuis 9 jours.");
  });
});
