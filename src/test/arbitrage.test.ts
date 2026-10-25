import { describe, expect, it } from "vitest";
import { GESTES, arbitrageImpossible, arriveesPossibles, bornesManquantes, casDArbitrage, etatDArbitrage, joursEntre, peutPartir, produitDeLaVente, quantiteAchetable } from "@/lib/domain/arbitrage";
import type { Intent, Offer } from "@/lib/domain/types";

/**
 * UN ARBITRAGE ENGAGE LE CLIENT DEUX FOIS D'UN SEUL GESTE.
 *
 * Il sort d'une ligne et entre dans une autre sans repasser par la case départ,
 * ce qui veut dire que la destination n'est plus vérifiée par personne au
 * moment où elle sert : le desk exécute la vente, et l'achat part. D'où ces
 * cas, qui refusent tout ce qui n'est pas réellement atteignable, et refusent
 * de promettre un montant qu'on n'a pas.
 *
 * ET DEPUIS LE 26 OCTOBRE 2026 IL EST GÉNÉRALISÉ : il part d'une ligne cotée
 * comme d'un fonds, et il porte deux bornes obligatoires. Ces épreuves tiennent
 * les trois cas ensemble — simultané, conditionnel, refusé — parce que c'est
 * leur SÉPARATION qui protège : un refus transformé en « conditionnel » par
 * distraction promettrait exactement ce que le service existe pour empêcher.
 */

const base = (over: Partial<Offer> & { id: string }): Offer => ({
  kind: "FONDS",
  operation: "secondaire",
  country: "Cameroun",
  countryName: "Cameroun",
  issuer: "Corridor Asset Management",
  title: `FCP ${over.id}`,
  isin: `CM${over.id}`,
  status: "published",
  blurb: "",
  documents: [],
  opensAt: "2026-01-01T09:00:00",
  deadlineAt: "2099-12-31T17:00:00",
  settleOn: "2026-01-05",
  lastCouponOn: null,
  nominal: 0,
  commissionPct: 0,
  version: 1,
  fund: { nav: 10_500, navDate: "2026-09-20", manager: "CAM", depositary: "LCB", entryFeePct: 1, exitFeePct: 0.5, minAmount: 100_000, distributed: true } as Offer["fund"],
  ...over,
});

const fonds = base;
const cotee = (over: Partial<Offer> & { id: string }): Offer => base({ kind: "MARCHE", instrument: "action", fund: undefined, nominal: 10_000, title: `Action ${over.id}`, ...over });

const a = fonds({ id: "a", title: "FCP Monétaire" });
const b = fonds({ id: "b", title: "FCP Obligataire" });
const action = cotee({ id: "s", title: "SAFACAM" });

describe("ce qui empêche un arbitrage", () => {
  it("laisse passer un fonds distribué qui n'est pas celui de départ", () => {
    expect(arbitrageImpossible(a, b)).toBeNull();
  });

  /* LA GÉNÉRALISATION, ET C'EST ELLE QUI EST NEUVE. L'ancien contrôle disait
     « un passage part d'un fonds » à qui voulait arbitrer une action : le
     service n'existait que pour un sixième des lignes qu'on détient. */
  it("laisse passer les quatre couples qui tiennent, dans les deux sens", () => {
    expect(arbitrageImpossible(a, b)).toBeNull();
    expect(arbitrageImpossible(a, action)).toBeNull();
    expect(arbitrageImpossible(action, a)).toBeNull();
    expect(arbitrageImpossible(action, cotee({ id: "t", title: "SOCAPALM" }))).toBeNull();
  });

  it("refuse une destination absente, ou la ligne de départ elle-même", () => {
    expect(arbitrageImpossible(a, undefined)).toMatch(/introuvable/);
    expect(arbitrageImpossible(a, a)).toMatch(/ligne de départ/);
  });

  /**
   * LE REFUS PAR CONSTRUCTION, ET IL DOIT RESTER UN REFUS.
   *
   * Une adjudication, une introduction, une émission : l'allocation n'est pas
   * décidée par la maison, et elle n'est connue que des jours plus tard — « une
   * soumission peut être servie à un autre prix, en partie, ou pas du tout ».
   * Appeler cela un arbitrage promettrait ce que le service existe pour
   * empêcher. C'est le point que le dirigeant a posé en premier.
   */
  it("refuse toute arrivée dont l'allocation n'est pas la nôtre", () => {
    for (const kind of ["OTA", "BTA", "ACTIONS", "APE"] as const) {
      expect(arbitrageImpossible(a, base({ id: "x", kind })), `${kind} est devenu une arrivée possible`).toMatch(/adjudication|émission/);
    }
  });

  it("refuse un départ qui n'est pas une ligne qu'on revend, et nomme le rachat du Trésor à part", () => {
    expect(arbitrageImpossible(base({ id: "r", kind: "RACHAT" }), a)).toMatch(/sortie, pas un départ/);
    expect(arbitrageImpossible(base({ id: "o", kind: "OTA" }), a)).toMatch(/part d'un fonds ou d'une ligne cotée/);
  });

  it("refuse un fonds que la maison ne distribue pas, et une ligne retirée", () => {
    expect(arbitrageImpossible(a, fonds({ id: "c", fund: { ...b.fund!, distributed: false } }))).toMatch(/pas encore distribué/);
    expect(arbitrageImpossible(a, { ...b, hidden: true })).toMatch(/plus proposée/);
    expect(arbitrageImpossible(a, { ...b, status: "withdrawn" })).toMatch(/plus proposée/);
  });
});

describe("le cas d'un couple", () => {
  it("ne dit « simultané » que de fonds à fonds", () => {
    expect(casDArbitrage(a, b).cas).toBe("simultane");
    expect(casDArbitrage(a, action).cas).toBe("conditionnel");
    expect(casDArbitrage(action, a).cas).toBe("conditionnel");
    expect(casDArbitrage(action, cotee({ id: "t" })).cas).toBe("conditionnel");
  });

  it("porte sa raison dans les trois cas, et pas seulement au refus", () => {
    /* Le coût de la contrainte doit être VISIBLE avant la signature, pas
       découvert après. Un verdict muet quand tout va bien laisserait la page
       sans rien à écrire au moment où elle doit écrire le plus. */
    for (const [d, arr] of [[a, b], [a, action], [a, base({ id: "x", kind: "OTA" })]] as const) {
      expect(casDArbitrage(d, arr).raison.length, "un verdict sans raison").toBeGreaterThan(40);
    }
  });

  it("dit pourquoi la paire conditionnelle est armée, et nomme le carnet", () => {
    expect(casDArbitrage(action, a).raison).toMatch(/carnet|armée/i);
  });
});

describe("les arrivées possibles", () => {
  it("ne garde que les destinations valables, par ordre de titre", () => {
    const hors = fonds({ id: "d", title: "FCP Caché", hidden: true });
    const ok = fonds({ id: "e", title: "FCP Actions" });
    expect(arriveesPossibles(a, [a, b, hors, ok]).map((x) => x.title)).toEqual(["FCP Actions", "FCP Obligataire"]);
  });

  it("écarte les adjudications de la liste, sans la vider", () => {
    const seance = base({ id: "ota", kind: "OTA", title: "OTA 6,25 %" });
    expect(arriveesPossibles(a, [b, seance, action]).map((x) => x.title)).toEqual(["FCP Obligataire", "SAFACAM"]);
  });

  it("ne renvoie rien quand il n'y a nulle part où aller", () => {
    expect(arriveesPossibles(a, [a])).toEqual([]);
  });
});

describe("le produit de la vente", () => {
  it("retourne le signe du règlement et arrondit au franc", () => {
    // « positionFor » compte ce que le client reçoit en négatif : c'est ce qu'il n'a pas à régler.
    expect(produitDeLaVente(-1_234_567.89)).toBe(1_234_567);
  });

  it("ne promet jamais un montant négatif", () => {
    expect(produitDeLaVente(0)).toBe(0);
    expect(produitDeLaVente(500)).toBe(0);
  });
});

/**
 * LA CONVERSION EN TITRES, ET LE DÉFAUT QU'ELLE FERME.
 *
 * Une souscription de fonds se libelle en francs ; un achat au carnet se
 * libelle en TITRES. La seconde jambe était « souscription » en dur avec le
 * produit en francs dans « amount » : vers une ligne cotée, cela passait un
 * ordre de 4 200 000 TITRES. Les deux sont des nombres, donc aucune épreuve de
 * type ne l'aurait dit.
 */
describe("la quantité qu'un produit achète", () => {
  it("prend le plus grand nombre de titres que le produit couvre", () => {
    expect(quantiteAchetable(1_000_000, (n) => n * 9_500)).toBe(105);
    expect(quantiteAchetable(9_500, (n) => n * 9_500)).toBe(1);
  });

  it("rend zéro quand le produit n'achète pas un titre entier", () => {
    expect(quantiteAchetable(9_499, (n) => n * 9_500)).toBe(0);
    expect(quantiteAchetable(0, (n) => n * 9_500)).toBe(0);
  });

  it("descend plutôt que de dépasser, si le coût cesse d'être linéaire", () => {
    /* Un coût par palier — un droit fixe au-delà d'un seuil — ferait dépasser
       la division seule. Un titre de trop est un ordre que la provision ne
       couvre pas, donc on descend. */
    const coutDe = (n: number) => n * 1_000 + (n > 50 ? 100_000 : 0);
    expect(quantiteAchetable(100_000, coutDe)).toBe(50);
  });

  it("ne boucle pas sur un coût nul ou absurde", () => {
    expect(quantiteAchetable(1_000, () => 0)).toBe(0);
    expect(quantiteAchetable(1_000, () => -5)).toBe(0);
  });
});

describe("les deux bornes", () => {
  const today = "2026-10-26";

  it("exige les deux dès qu'il y a une arrivée", () => {
    expect(bornesManquantes({}, today)).toHaveLength(2);
    expect(bornesManquantes({ plancher: 500_000 }, today)).toHaveLength(1);
    expect(bornesManquantes({ dateLimite: "2026-11-30" }, today)).toHaveLength(1);
    expect(bornesManquantes({ plancher: 500_000, dateLimite: "2026-11-30" }, today)).toEqual([]);
  });

  it("refuse un plancher nul ou négatif, qui ne borne rien", () => {
    expect(bornesManquantes({ plancher: 0, dateLimite: "2026-11-30" }, today)[0]).toMatch(/plancher/);
    expect(bornesManquantes({ plancher: -1, dateLimite: "2026-11-30" }, today)[0]).toMatch(/plancher/);
  });

  it("refuse une date passée, qui arme un arbitrage déjà mort", () => {
    expect(bornesManquantes({ plancher: 1, dateLimite: "2026-10-25" }, today)[0]).toMatch(/passée/);
    expect(bornesManquantes({ plancher: 1, dateLimite: today }, today)[0]).toMatch(/passée/);
  });

  it("refuse une date si lointaine qu'elle ne borne plus", () => {
    /* Quatre-vingt-dix jours : au-delà, l'obligation serait tenue dans la
       lettre et vide dans le fait — « optionnel » réécrit en chiffres. */
    expect(bornesManquantes({ plancher: 1, dateLimite: "2027-10-26" }, today)[0]).toMatch(/90 jours/);
    expect(bornesManquantes({ plancher: 1, dateLimite: "2027-01-24" }, today)).toEqual([]);
  });

  it("compte les jours en dates, pas en instants", () => {
    expect(joursEntre("2026-10-26", "2027-01-24")).toBe(90);
    expect(joursEntre("2026-10-26T23:00:00", "2026-10-27T01:00:00")).toBe(1);
  });
});

describe("ce qui peut partir aujourd'hui", () => {
  it("laisse partir au-dessus du plancher et avant la date", () => {
    expect(peutPartir({ plancher: 500_000, dateLimite: "2026-11-30" }, 600_000, "2026-10-26").ok).toBe(true);
    expect(peutPartir({ plancher: 500_000, dateLimite: "2026-11-30" }, 500_000, "2026-10-26").ok).toBe(true);
  });

  it("retient sous le plancher, et le dit avec les deux chiffres", () => {
    const v = peutPartir({ plancher: 500_000, dateLimite: "2026-11-30" }, 499_999, "2026-10-26");
    expect(v.ok).toBe(false);
    expect(v.raison).toMatch(/499999/);
    expect(v.raison).toMatch(/500000/);
  });

  it("retient après la date limite", () => {
    expect(peutPartir({ plancher: 1, dateLimite: "2026-11-30" }, 10, "2026-12-01").ok).toBe(false);
    // Le jour même compte encore : la borne est « au-delà », pas « à partir de ».
    expect(peutPartir({ plancher: 1, dateLimite: "2026-11-30" }, 10, "2026-11-30").ok).toBe(true);
  });
});

/**
 * UN ARBITRAGE QUI EXPIRE SANS RIEN FAIRE N'EST PAS UNE PANNE.
 *
 * C'est la protection qui a joué. Si la page le dit autrement, le client lit
 * « ça n'a pas marché » et n'en reposera jamais — et le service le mieux
 * construit ne sert personne. D'où une épreuve sur les MOTS, qui sont ici la
 * fonctionnalité.
 */
describe("l'état dit au client", () => {
  const i = (over: Partial<Intent>): Pick<Intent, "state" | "switchToOfferId" | "switchBy"> => ({ state: "recue", switchToOfferId: "b", switchBy: "2026-11-30", ...over });

  it("ne dit rien d'un ordre ordinaire", () => {
    expect(etatDArbitrage(i({ switchToOfferId: undefined }), "2026-10-26")).toBeNull();
  });

  it("dit « armé, rien n'a bougé » tant que rien n'est parti", () => {
    const v = etatDArbitrage(i({}), "2026-10-26")!;
    expect(v.etat).toBe("arme");
    expect(v.phrase).toMatch(/Rien n'a bougé/);
    expect(v.phrase, "la phrase ne nomme plus le plancher, qui est la moitié de la promesse").toMatch(/plancher/);
  });

  it("dit l'expiration comme un succès, et nomme la position intacte", () => {
    const v = etatDArbitrage(i({ state: "annulee" }), "2026-12-01")!;
    expect(v.etat).toBe("expire");
    expect(v.phrase).toMatch(/intacte/);
    expect(v.phrase, "un arbitrage expiré doit se lire comme la protection qui a joué").toMatch(/protection qui a joué/);
    expect(v.phrase, "le mot de l'échec n'a rien à faire ici").not.toMatch(/échou|raté|erreur/i);
  });

  it("sépare l'expiration d'une clôture anticipée", () => {
    expect(etatDArbitrage(i({ state: "annulee" }), "2026-10-26")!.etat).toBe("sans_suite");
  });

  it("dit que les deux jambes sont parties", () => {
    expect(etatDArbitrage(i({ state: "servie" }), "2026-10-26")!.etat).toBe("parti");
    expect(etatDArbitrage(i({ state: "reglee" }), "2026-10-26")!.etat).toBe("parti");
  });
});

describe("les trois gestes", () => {
  it("nomment aussi les deux voies non protégées", () => {
    /* Deux des trois existaient déjà et n'étaient pas nommés. Un client qui
       prend la voie non protégée doit SAVOIR qu'il la prend : c'est la seule
       façon pour que la voie protégée veuille dire quelque chose. */
    expect(GESTES.map((g) => g.cle)).toEqual(["arbitrage", "vendre", "acheter"]);
    for (const g of GESTES) {
      expect(g.garanti.length, `${g.cle} ne dit pas ce qu'il garantit`).toBeGreaterThan(20);
      expect(g.risque.length, `${g.cle} ne dit pas ce qu'il coûte`).toBeGreaterThan(20);
    }
  });
});
