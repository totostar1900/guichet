import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  accepter,
  annuler,
  bloquer,
  convenirDesFrais,
  creerUneAnnonce,
  echouer,
  expirerLesAccords,
  fraisDeLaPartie,
  facialDe,
  facialDeLAccord,
  fraisPermis,
  HEURES_D_UN_ACCORD,
  mettreAJourLesAnnonces,
  peutEtreSigne,
  prixDansLEcart,
  proposer,
  publier,
  quantiteOfferte,
  refuser,
  regler,
  signer,
  valeurDeLAccord,
  vuePublique,
  type Accord,
  type Annonce,
  type FourchetteDeFrais,
} from "@/lib/domain/place-de-marche";

/* LA PLACE DE MARCHÉ DE GRÉ À GRÉ (28 novembre 2026) : annonces anonymes, propositions de prix, accord de principe sous 72 h, ventes partielles, frais dans une fourchette, règlement dans l'ordre. */
const T0 = "2026-12-01T09:00:00.000Z";
/* Un nominal de 1 000 000 FCFA par titre, pour que les sommes de l'exemple tiennent dans la fourchette. */
const NOMINAL = 1_000_000;
const FOURCHETTE: FourchetteDeFrais = { pctMin: 0.2, pctMax: 0.6, plancher: 5_000, plafond: 200_000 };

const annoncePubliee = (o: Partial<Annonce> = {}): Annonce => {
  const c = creerUneAnnonce({ id: "a1", sens: "vend", offerId: "ota-1", porteur: "p-vendeur", quantite: 100, nominal: NOMINAL, decoupage: true, prix: 96, unite: "pct", le: T0 });
  if (!c.ok) throw new Error(c.erreur);
  const p = publier(c.annonce, "desk-1", T0);
  if (!p.ok) throw new Error(p.erreur);
  return { ...p.annonce, ...o };
};
const accordPour = (a: Annonce, quantite = 40, existants: Accord[] = []): Accord => {
  const pr = proposer(a, existants, { id: "pr1", porteur: "p-acheteur", quantite, prix: 95, le: T0 });
  if (!pr.ok) throw new Error(pr.erreur);
  const ac = accepter(a, existants, pr.proposition, "x1", T0);
  if (!ac.ok) throw new Error(ac.erreur);
  return ac.accord;
};
const avecFrais = (x: Accord): Accord => {
  const valeur = valeurDeLAccord(x);
  const f = { montant: 100_000, par: "desk-1", le: T0, motif: "convenu par téléphone" };
  const a = convenirDesFrais(x, "vendeur", f, valeur, FOURCHETTE);
  if (!a.ok) throw new Error(a.erreur);
  const b = convenirDesFrais(a.accord, "acheteur", { ...f, montant: 90_000 }, valeur, FOURCHETTE);
  if (!b.ok) throw new Error(b.erreur);
  return b.accord;
};

describe("l'annonce et sa modération", () => {
  it("elle naît en attente du desk, et la quantité est un entier d'au moins un titre", () => {
    const c = creerUneAnnonce({ id: "a", sens: "vend", offerId: "o", porteur: "p", quantite: 10, nominal: NOMINAL, decoupage: true, prix: 96, unite: "pct", le: T0 });
    expect(c.ok && c.annonce.etat).toBe("en_moderation");
    expect(creerUneAnnonce({ id: "a", sens: "vend", offerId: "o", porteur: "p", quantite: 0, nominal: NOMINAL, decoupage: true, prix: 96, unite: "pct", le: T0 }).ok).toBe(false);
    expect(creerUneAnnonce({ id: "a", sens: "vend", offerId: "o", porteur: "p", quantite: 1.5, nominal: NOMINAL, decoupage: true, prix: 96, unite: "pct", le: T0 }).ok).toBe(false);
    expect(creerUneAnnonce({ id: "a", sens: "vend", offerId: "o", porteur: "p", quantite: 1, nominal: NOMINAL, decoupage: true, prix: 0, unite: "pct", le: T0 }).ok).toBe(false);
  });
  it("le desk publie (trente jours) ou refuse avec un motif obligatoire", () => {
    const a = annoncePubliee();
    expect(a.etat).toBe("publiee");
    expect(Date.parse(a.expireLe!) - Date.parse(T0)).toBe(30 * 86_400_000);
    const c = creerUneAnnonce({ id: "b", sens: "achete", offerId: "o", porteur: "p", quantite: 5, nominal: NOMINAL, decoupage: true, prix: 90, unite: "pct", le: T0 });
    if (!c.ok) throw new Error();
    expect(refuser(c.annonce, "desk", T0, " ").ok).toBe(false);
    const r = refuser(c.annonce, "desk", T0, "ligne non admise");
    expect(r.ok && r.annonce.moderation?.motif).toBe("ligne non admise");
    expect(publier(a, "desk", T0).ok).toBe(false);
  });
  it("la vue publique ne porte jamais le porteur", () => {
    const v = vuePublique(annoncePubliee(), []);
    expect(JSON.stringify(v)).not.toMatch(/p-vendeur|porteur/);
    expect(v.titresOfferts).toBe(100);
  });
});

describe("les propositions : un prix, une quantité, jamais de message", () => {
  it("nul ne répond à sa propre annonce", () => {
    expect(proposer(annoncePubliee(), [], { id: "p", porteur: "p-vendeur", quantite: 10, prix: 95, le: T0 }).ok).toBe(false);
  });
  it("la quantité est partielle permise, mais bornée par ce qui reste offert", () => {
    const a = annoncePubliee();
    expect(proposer(a, [], { id: "p", porteur: "x", quantite: 100, prix: 95, le: T0 }).ok).toBe(true);
    expect(proposer(a, [], { id: "p", porteur: "x", quantite: 101, prix: 95, le: T0 }).ok).toBe(false);
    const accord = accordPour(a, 40);
    expect(quantiteOfferte(a, [accord])).toBe(60);
    expect(proposer(a, [accord], { id: "p", porteur: "y", quantite: 61, prix: 95, le: T0 }).ok).toBe(false);
    expect(proposer(a, [accord], { id: "p", porteur: "y", quantite: 60, prix: 95, le: T0 }).ok).toBe(true);
  });
  it("une annonce expirée ou non publiée ne reçoit rien", () => {
    expect(proposer(annoncePubliee(), [], { id: "p", porteur: "x", quantite: 1, prix: 95, le: "2027-02-01T00:00:00.000Z" }).ok).toBe(false);
    expect(proposer(annoncePubliee({ etat: "en_moderation" }), [], { id: "p", porteur: "x", quantite: 1, prix: 95, le: T0 }).ok).toBe(false);
  });
  it("sans repère ni écart posé, le prix n'est pas encadré ; avec les deux, il l'est", () => {
    expect(prixDansLEcart(50, undefined, undefined)).toBe(true);
    expect(prixDansLEcart(50, 96, undefined)).toBe(true);
    expect(prixDansLEcart(50, undefined, 5)).toBe(true);
    expect(prixDansLEcart(94, 96, 5)).toBe(true);
    expect(prixDansLEcart(80, 96, 5)).toBe(false);
    expect(proposer(annoncePubliee(), [], { id: "p", porteur: "x", quantite: 1, prix: 80, le: T0 }, 96, 5).ok).toBe(false);
  });
});

describe("l'accord de principe : soixante-douze heures", () => {
  it("l'annonceur vendeur fait de l'annonceur le vendeur ; l'annonceur acheteur, l'acheteur", () => {
    const v = accordPour(annoncePubliee({ sens: "vend" }));
    expect([v.vendeur, v.acheteur]).toEqual(["p-vendeur", "p-acheteur"]);
    const a = annoncePubliee({ sens: "achete", porteur: "p-acheteur" });
    const pr = proposer(a, [], { id: "q", porteur: "p-vendeur", quantite: 10, prix: 95, le: T0 });
    if (!pr.ok) throw new Error();
    const ac = accepter(a, [], pr.proposition, "x2", T0);
    expect(ac.ok && [ac.accord.vendeur, ac.accord.acheteur]).toEqual(["p-vendeur", "p-acheteur"]);
  });
  it("il vit 72 heures, puis tombe, et la quantité retenue revient à l'annonce", () => {
    const a = annoncePubliee();
    const x = accordPour(a, 40);
    expect(HEURES_D_UN_ACCORD).toBe(72);
    expect(Date.parse(x.expireLe) - Date.parse(x.creeLe)).toBe(72 * 3_600_000);
    expect(expirerLesAccords([x], "2026-12-04T08:59:00.000Z")[0].etat).toBe("accord_de_principe");
    const apres = expirerLesAccords([x], "2026-12-04T09:01:00.000Z");
    expect(apres[0].etat).toBe("expire");
    expect(quantiteOfferte(a, apres)).toBe(100);
  });
  it("la valeur d'un accord : quantité × nominal × prix % pour une dette, quantité × prix pour une action", () => {
    expect(valeurDeLAccord({ quantite: 40, nominal: 10_000, prix: 95, unite: "pct" })).toBe(380_000);
    expect(valeurDeLAccord({ quantite: 20, nominal: 0, prix: 45_000, unite: "fcfa" })).toBe(900_000);
  });
});

describe("on parle en facial, et le découpage est un choix de l'annonceur", () => {
  it("le facial est le nominal total ; la vue publique le dit d'abord, avec le nombre de titres à côté", () => {
    expect(facialDe(50_000, 10_000)).toBe(500_000_000);
    const a = annoncePubliee({ quantite: 50_000, nominal: 10_000 });
    const v = vuePublique(a, []);
    expect(v).toMatchObject({ facial: 500_000_000, facialOffert: 500_000_000, titres: 50_000, titresOfferts: 50_000, decoupage: true });
  });
  it("le facial offert baisse de ce que retient un accord", () => {
    const a = annoncePubliee({ quantite: 50_000, nominal: 10_000 });
    const x = accordPour(a, 20_000);
    expect(facialDeLAccord(x)).toBe(200_000_000);
    expect(vuePublique(a, [x])).toMatchObject({ facialOffert: 300_000_000, titresOfferts: 30_000 });
  });
  it("découpage permis : une partie du facial s'échange ; non permis : tout ou rien", () => {
    const permis = annoncePubliee({ quantite: 100, decoupage: true });
    expect(proposer(permis, [], { id: "p", porteur: "x", quantite: 40, prix: 95, le: T0 }).ok).toBe(true);
    const ferme = annoncePubliee({ quantite: 100, decoupage: false });
    const refus = proposer(ferme, [], { id: "p", porteur: "x", quantite: 40, prix: 95, le: T0 });
    expect(refus.ok).toBe(false);
    expect(!refus.ok && refus.erreur).toMatch(/découpage n'est pas permis.*100 titre/);
    expect(proposer(ferme, [], { id: "p", porteur: "x", quantite: 100, prix: 95, le: T0 }).ok).toBe(true);
  });
  it("sans découpage, la totalité encore offerte est exigée même après un accord éteint", () => {
    const ferme = annoncePubliee({ quantite: 100, decoupage: false });
    const x = accordPour({ ...ferme, decoupage: true }, 100);
    expect(proposer(ferme, [{ ...x, etat: "expire" }], { id: "p", porteur: "y", quantite: 100, prix: 95, le: T0 }).ok).toBe(true);
  });
  it("le nominal est obligatoire", () => {
    expect(creerUneAnnonce({ id: "a", sens: "vend", offerId: "o", porteur: "p", quantite: 1, nominal: 0, decoupage: true, prix: 96, unite: "pct", le: T0 }).ok).toBe(false);
  });
});

describe("les frais, convenus par partie, dans la fourchette de la direction", () => {
  const x = () => accordPour(annoncePubliee(), 40);
  const valeur = 38_000_000;
  it("la fourchette tient compte du plancher et du plafond", () => {
    expect(fraisPermis(valeur, FOURCHETTE)).toEqual({ min: 76_000, max: 200_000 });
    expect(fraisPermis(100_000, FOURCHETTE)).toEqual({ min: 5_000, max: 5_000 });
    expect(fraisPermis(500_000_000, FOURCHETTE)).toEqual({ min: 200_000, max: 200_000 });
  });
  it("dans la fourchette, le motif suffit ; hors fourchette, la dérogation de la direction est nécessaire", () => {
    const f = { montant: 100_000, par: "desk-1", le: T0, motif: "convenu" };
    expect(convenirDesFrais(x(), "vendeur", f, valeur, FOURCHETTE).ok).toBe(true);
    expect(convenirDesFrais(x(), "vendeur", { ...f, montant: 2_000 }, valeur, FOURCHETTE).ok).toBe(false);
    expect(convenirDesFrais(x(), "vendeur", { ...f, montant: 300_000 }, valeur, FOURCHETTE).ok).toBe(false);
    const d = { par: "direction", le: T0, motif: "gros volume" };
    expect(convenirDesFrais(x(), "vendeur", { ...f, montant: 300_000, derogation: d }, valeur, FOURCHETTE).ok).toBe(true);
    expect(convenirDesFrais(x(), "vendeur", { ...f, montant: 300_000, derogation: { ...d, motif: "" } }, valeur, FOURCHETTE).ok).toBe(false);
  });
  it("un motif est toujours obligatoire", () => {
    expect(convenirDesFrais(x(), "vendeur", { montant: 100_000, par: "desk", le: T0, motif: "" }, valeur, FOURCHETTE).ok).toBe(false);
  });
  it("chaque partie ne lit que ses frais", () => {
    const a = avecFrais(x());
    expect(fraisDeLaPartie(a, "vendeur")).toBe(100_000);
    expect(fraisDeLaPartie(a, "acheteur")).toBe(90_000);
  });
});

describe("la signature et le règlement, dans l'ordre", () => {
  it("on ne signe pas sans les frais des deux parties, ni après les 72 heures", () => {
    const sans = accordPour(annoncePubliee());
    expect(peutEtreSigne(sans)).toBe(false);
    expect(signer(sans, "vendeur", T0).ok).toBe(false);
    const x = avecFrais(sans);
    expect(peutEtreSigne(x)).toBe(true);
    expect(signer(x, "vendeur", "2026-12-05T00:00:00.000Z").ok).toBe(false);
  });
  it("avec les deux signatures l'accord est signé ; une partie ne signe pas deux fois", () => {
    const x = avecFrais(accordPour(annoncePubliee()));
    const v = signer(x, "vendeur", T0);
    if (!v.ok) throw new Error(v.erreur);
    expect(v.accord.etat).toBe("accord_de_principe");
    expect(signer(v.accord, "vendeur", T0).ok).toBe(false);
    const a = signer(v.accord, "acheteur", T0);
    expect(a.ok && a.accord.etat).toBe("signe");
  });
  const signe = (): Accord => {
    const x = avecFrais(accordPour(annoncePubliee()));
    const v = signer(x, "vendeur", T0);
    const a = v.ok ? signer(v.accord, "acheteur", T0) : v;
    if (!a.ok) throw new Error(a.erreur);
    return a.accord;
  };
  it("rien n'est bloqué avant les deux signatures ; l'échange attend les fonds ET les titres", () => {
    const avant = avecFrais(accordPour(annoncePubliee()));
    expect(bloquer(avant, "fonds", T0).ok).toBe(false);
    const s = signe();
    expect(regler(s, T0).ok).toBe(false);
    const f = bloquer(s, "fonds", T0);
    if (!f.ok) throw new Error();
    expect(f.accord.etat).toBe("signe");
    expect(regler(f.accord, T0).ok).toBe(false);
    const t = bloquer(f.accord, "titres", T0);
    if (!t.ok) throw new Error();
    expect(t.accord.etat).toBe("bloque");
    const r = regler(t.accord, T0);
    expect(r.ok && r.accord.etat).toBe("regle");
  });
  it("un échec débloque tout ; un accord de principe seul peut être annulé, un contrat non", () => {
    const s = signe();
    const f = bloquer(s, "fonds", T0);
    if (!f.ok) throw new Error();
    const e = echouer(f.accord);
    expect(e.ok && [e.accord.etat, e.accord.bloque]).toEqual(["echec", {}]);
    expect(annuler(s).ok).toBe(false);
    expect(annuler(accordPour(annoncePubliee())).ok).toBe(true);
  });
});

describe("la vie de l'annonce", () => {
  it("elle est conclue quand tout est réglé, expirée après sa durée sans accord vivant", () => {
    const a = annoncePubliee({ quantite: 40 });
    const x = avecFrais(accordPour(a, 40));
    const s = signer(x, "vendeur", T0);
    const s2 = s.ok ? signer(s.accord, "acheteur", T0) : s;
    if (!s2.ok) throw new Error();
    const b1 = bloquer(s2.accord, "fonds", T0);
    const b2 = b1.ok ? bloquer(b1.accord, "titres", T0) : b1;
    const r = b2.ok ? regler(b2.accord, T0) : b2;
    if (!r.ok) throw new Error();
    expect(mettreAJourLesAnnonces([a], [r.accord], T0)[0].etat).toBe("conclue");
    expect(mettreAJourLesAnnonces([annoncePubliee()], [], "2027-02-01T00:00:00.000Z")[0].etat).toBe("expiree");
    const vivant = accordPour(annoncePubliee(), 10);
    expect(mettreAJourLesAnnonces([annoncePubliee()], [vivant], "2027-02-01T00:00:00.000Z")[0].etat).toBe("publiee");
  });
});

describe("le domaine ne dépend de rien", () => {
  it("aucune importation : il se lit du serveur comme du navigateur", () => {
    const d = readFileSync("src/lib/domain/place-de-marche.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(d).not.toMatch(/^import /m);
  });
});
