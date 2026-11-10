import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SEED_OFFERS } from "@/data/seed";
import { chiffresDeLIntention, gestesProposables, NB_GESTES, rubriquesPresentes, seancesOuvertes, seancesPrevues, type FaitsDuDossier, type FaitsPourGestes } from "@/lib/domain/accueil";
import type { Offer } from "@/lib/domain/types";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * LA REFONTE DE L'ACCUEIL, 1ER NOVEMBRE 2026.
 *
 * Six demandes, sept décisions : le dossier ne montre que ce qui existe ; la
 * quatrième place d'« Investir » est faite de ce que la maison annonce ou de ce
 * que le client propose ; le dossier s'ouvre tuile par tuile, et « Vous pouvez
 * aussi » reste ouvert. Les règles de sélection vivent dans le domaine et se
 * jouent ici ; ce qui ne se joue que dans les composants est gardé par la
 * lecture du code, avec sa non-vacuité.
 */
const LE_JOUR = new Date("2026-11-01T09:00:00Z");
const base = SEED_OFFERS.find((o) => o.kind === "BTA" && !o.hidden && o.status === "published");
const jour = (n: number) => new Date(LE_JOUR.getTime() + n * 86_400_000).toISOString();
/** Une séance du dépôt, dont on déplace l'ouverture et la clôture. */
const seance = (id: string, ouvreDans: number, fermeDans: number): Offer => {
  if (!base) throw new Error("le dépôt n'a plus de bon du Trésor publié : le cas de référence a disparu");
  return { ...base, id, title: id, opensAt: jour(ouvreDans), deadlineAt: jour(fermeDans) };
};
const faits = (o: Partial<FaitsDuDossier> = {}): FaitsDuDossier => ({ intentions: 0, attentesSondees: 0, mandats: 0, versements: 0, avisDeGarde: 0, lignesSuivies: 0, operations: 0, documents: 0, ...o });
/** Un client qui n'a encore rien fait, compte ouvert : tous les gestes s'appliquent. */
const pourGestes = (o: Partial<FaitsPourGestes> = {}): FaitsPourGestes => ({ ...faits(), conventionOk: true, dossierAPoursuivre: false, profilRenseigne: false, appareilAjoute: false, couponsSansReinvestissement: false, ...o });

describe("les rubriques du dossier", () => {
  it("ne montrent rien à un client qui n'a rien", () => {
    expect(rubriquesPresentes(faits())).toEqual([]);
  });
  it("ne montrent que ce qui existe, une condition par rubrique", () => {
    const CAS: [Partial<FaitsDuDossier>, string][] = [
      [{ intentions: 1 }, "intentions"],
      [{ attentesSondees: 1 }, "sondage"],
      [{ mandats: 1 }, "prelevements"],
      [{ versements: 1 }, "versements"],
      [{ avisDeGarde: 1 }, "garde"],
      [{ lignesSuivies: 1 }, "suivies"],
      [{ operations: 1 }, "operations"],
      [{ documents: 1 }, "documents"],
    ];
    for (const [fait, cle] of CAS) expect(rubriquesPresentes(faits(fait)), `la rubrique « ${cle} » ne paraît plus, ou paraît sans rien`).toEqual([cle]);
  });
  it("ne se trompent pas de rubrique quand tout existe", () => {
    const tout = faits({ intentions: 2, attentesSondees: 1, mandats: 1, versements: 1, avisDeGarde: 1, lignesSuivies: 3, operations: 2, documents: 4 });
    expect(rubriquesPresentes(tout)).toHaveLength(8);
  });
});

describe("« Vous pouvez aussi »", () => {
  it("ne propose que des gestes que le client peut faire lui-même, les inachevés d'abord", () => {
    const tous = gestesProposables(pourGestes());
    expect(tous).toEqual(["intention", "versement", "appareil", "profil", "suivre"]);
    /* Les droits de garde et les documents ne se créent pas : ils ne sont jamais proposés. */
    for (const g of tous) expect(["garde", "documents"]).not.toContain(g);
  });
  it("met le dossier à poursuivre devant tout, et rien d'engageant sans convention", () => {
    const g = gestesProposables(pourGestes({ conventionOk: false, dossierAPoursuivre: true }));
    expect(g[0]).toBe("dossier");
    expect(g, "sans convention, on ne propose pas d'agir").not.toContain("intention");
    expect(g, "sans convention, on ne propose pas de programmer un versement").not.toContain("versement");
  });
  it("n'est jamais en dessous de deux lignes : les outils comblent quand tout est fait", () => {
    const fait = pourGestes({ intentions: 1, versements: 1, lignesSuivies: 1, attentesSondees: 1, profilRenseigne: true, appareilAjoute: true });
    expect(gestesProposables(fait)).toEqual(["simulateur", "comparer"]);
  });
  it("propose le réinvestissement des coupons attendus, et jamais plus de cinq gestes", () => {
    expect(gestesProposables(pourGestes({ couponsSansReinvestissement: true }))).toContain("reinvestir");
    expect(gestesProposables(pourGestes({ dossierAPoursuivre: true, couponsSansReinvestissement: true })), "la liste dépasse la borne").toHaveLength(NB_GESTES);
  });
});

describe("la quatrième place d'« Investir »", () => {
  it("compte comme prévue une séance annoncée qui n'a pas ouvert, la plus proche d'abord", () => {
    const prevues = seancesPrevues([seance("loin", 20, 27), seance("proche", 5, 12), seance("ouverte", -2, 4)], LE_JOUR);
    expect(prevues.map((o) => o.id)).toEqual(["proche", "loin"]);
  });
  it("n'a aucune séance prévue quand toutes sont ouvertes ou closes : la place revient à la proposition", () => {
    expect(seancesPrevues([seance("ouverte", -2, 4), seance("close", -20, -10)], LE_JOUR)).toEqual([]);
  });
  it("sépare les séances ouvertes des prévues, la clôture la plus proche en tête", () => {
    const ouvertes = seancesOuvertes([seance("b", -1, 9), seance("a", -1, 3), seance("prevue", 4, 11)], LE_JOUR);
    expect(ouvertes.map((o) => o.id)).toEqual(["a", "b"]);
  });
  it("borne les séances prévues au nombre demandé", () => {
    const six = [1, 2, 3, 4, 5, 6].map((n) => seance(`p${n}`, n, n + 7));
    expect(seancesPrevues(six, LE_JOUR, 3)).toHaveLength(3);
  });
});

describe("les composants de l'Accueil", () => {
  const grille = code("src/components/accueil/GrilleInvestir.tsx");
  const dossier = code("src/components/accueil/DossierAccueil.tsx");
  const accueil = code("src/app/Console.tsx");

  it("ne posent le bloc des adjudications que s'il y a du contenu : les séances ouvertes, sinon les annoncées, sinon rien", () => {
    expect(grille, "les séances annoncées ne se prennent plus qu'à défaut d'ouvertes").toMatch(/const prevues = ouvertes\.length \? \[\] : seancesPrevues\(offres, now, NB_CARTES_PAR_BLOC\);/);
    expect(grille, "le bloc des adjudications ne lit plus ouvertes puis prévues").toMatch(/\(ouvertes\.length \? ouvertes : prevues\)\.map\(/);
    expect(code("src/components/accueil/BlocDeLignes.tsx"), "un bloc sans ligne doit se taire, pas dire « rien »").toMatch(/if \(!lignes\.length\) return null;/);
    /* L'INVITATION À PROPOSER PASSE DANS « VOUS POUVEZ AUSSI » quand le bloc se tait : plus de tuile « Proposer » dans Investir. */
    expect(grille, "la tuile « Proposer une adjudication » est revenue dans Investir").not.toContain('href="/sondage"');
    expect(dossier, "le dossier ne dit plus au domaine qu'aucune adjudication n'est affichée").toMatch(/sansAdjudication: seancesOuvertes\(offers, now\)\.length === 0 && seancesPrevues\(offers, now, 1\)\.length === 0/);
  });
  it("mènent à tout le catalogue par un bouton sous les entrées, et plus par une tuile du bas", () => {
    expect(grille, "le bouton « Tous vos services » a disparu").toMatch(/<Link href="\/activite#services" className=\{styles\.tous\}>/);
    expect(accueil, "la tuile « Vos services » est revenue au bas de la page").not.toMatch(/Vos services/);
  });
  it("n'annoncent le nombre de lignes dans aucune entrée d'« Investir »", () => {
    expect(grille, "une entrée d'« Investir » annonce de nouveau son inventaire").not.toMatch(/"\{n\} (lignes|fonds|séances)"|\.length\}/);
  });
  it("montrent d'office les rubriques qui ont de l'information, sans rien à déplier", () => {
    expect(dossier, "le dossier est redevenu un composant client : ses tuiles se déplieraient").not.toMatch(/"use client"|aria-expanded|useState/);
    /* LES TROIS BLOCS DE CONTENU, DANS CET ORDRE : intentions, sondage, lignes suivies — puis « Mon espace », puis « Vous pouvez aussi ». Chacun est un bloc à plat (titre au-dessus de la carte). */
    const i = dossier.indexOf('titre="Mes intentions" href="/moi/ordres"');
    const sond = dossier.indexOf('titre="Mes intentions au sondage" href="/sondage"', i);
    const suiv = dossier.indexOf('titre="Mes lignes suivies" href="/moi/suivies"', sond);
    const espace = dossier.indexOf('titre="Mon espace"', suiv);
    const aussi = dossier.indexOf('titre="Vous pouvez aussi"', espace);
    expect(i, "les intentions ne sont plus le premier bloc").toBeGreaterThan(0);
    expect(sond, "le sondage ne vient plus après les intentions").toBeGreaterThan(i);
    expect(suiv, "les lignes suivies ne viennent plus après le sondage").toBeGreaterThan(sond);
    expect(espace, "« Mon espace » ne vient plus après les trois blocs de contenu").toBeGreaterThan(suiv);
    expect(aussi, "« Vous pouvez aussi » ne vient plus en dernier").toBeGreaterThan(espace);
  });
  it("laisse « Vous pouvez aussi » ouvert, sans chevron ni bouton qui le replie", () => {
    expect(dossier, "« Vous pouvez aussi » est redevenu repliable").not.toMatch(/<details\b/);
    const pied = dossier.slice(dossier.indexOf('titre="Vous pouvez aussi"'));
    expect(pied, "le pied n'est plus rendu").not.toBe("");
    expect(pied, "le pied porte un bouton : il se replierait").not.toMatch(/<button\b/);
  });
  it("montre pour une ligne suivie le chiffre qui compte et ce qui presse, trois lignes au plus", () => {
    expect(dossier, "les lignes suivies ne montrent plus que trois lignes").toMatch(/\.slice\(0, 3\);\n/);
    expect(dossier, "ce qui presse (la clôture) ne se lit plus sur une ligne suivie").toMatch(/q \? t\("ferme \{q\}"/);
  });
  it("posent l'indice avec son titre à plat et sa carte entière en lien, sans le nom ni la pastille dans la carte", () => {
    const carte = code("src/components/IndexPulse.tsx");
    expect(accueil, "l'indice n'a plus son titre à plat sur la page d'arrivée").toMatch(/<IndexPulse compact aPlat=\{\{ titre: "BVMAC Index", href: "\/marche", mot: "La place" \}\} \/>/);
    expect(carte, "le titre à plat n'est plus rendu au-dessus de la carte").toMatch(/\{aPlat && <TitreDeBloc id="indice-bvmac" titre=\{aPlat\.titre\}/);
    expect(carte, "la carte n'enveloppe plus sa surface dans le lien").toMatch(/<Link href=\{pied\.href\} className=\{styles\.carteLien\}>/);
    expect(carte, "deux ancres imbriquées : les liens internes doivent se taire quand la carte est un lien").toMatch(/liens && !pied && !aPlat && \(/);
    expect(carte, "la carte répète encore le nom de l'indice").toMatch(/\{!aPlat && <small>BVMAC All Share<\/small>\}/);
    expect(carte, "la pastille « indice de prix » est revenue dans la carte de l'Accueil").toMatch(/\{!aPlat && \(\s*<div className=\{styles\.coin\}>[\s\S]*?<span className=\{styles\.tag\}/);
  });
});

describe("les chiffres de « Mes intentions »", () => {
  it("dit le montant en FCFA d'une souscription, d'une prise ferme et d'un appétit", () => {
    for (const type of ["souscription", "ferme", "appetit"] as const) expect(chiffresDeLIntention({ type, amount: 5_000_000, state: "recue" }, "OTA").montant, type).toEqual({ valeur: 5_000_000, unite: "FCFA" });
  });
  it("dit des parts pour le rachat d'un fonds, et se tait quand l'unité est ambiguë", () => {
    expect(chiffresDeLIntention({ type: "rachat", amount: 61, state: "recue" }, "FONDS").montant).toEqual({ valeur: 61, unite: "parts" });
    /* Un achat ou une vente sur la cote peut porter une quantité autant qu'un montant : on ne dit pas le chiffre. */
    for (const type of ["achat", "vente", "cession"] as const) expect(chiffresDeLIntention({ type, amount: 100, state: "recue" }, "MARCHE").montant, type).toBeUndefined();
    expect(chiffresDeLIntention({ type: "rachat", amount: 61, state: "recue" }, "OTA").montant, "un rachat hors fonds n'a pas des parts").toBeUndefined();
  });
  it("ne dit pas de montant nul ou absent", () => {
    expect(chiffresDeLIntention({ type: "souscription", amount: 0, state: "recue" }, "FONDS").montant).toBeUndefined();
    expect(chiffresDeLIntention({ type: "souscription", amount: null, state: "recue" }, "FONDS").montant).toBeUndefined();
  });
  it("ne dit la part servie qu'une fois la séance rendue", () => {
    expect(chiffresDeLIntention({ type: "ferme", amount: 1, allocationPct: 60, state: "servie" }, "OTA").serviPct).toBe(60);
    expect(chiffresDeLIntention({ type: "ferme", amount: 1, allocationPct: 60, state: "reglee" }, "OTA").serviPct).toBe(60);
    expect(chiffresDeLIntention({ type: "ferme", amount: 1, allocationPct: 60, state: "confirmee" }, "OTA").serviPct, "une intention pas encore servie ne dit pas de part").toBeUndefined();
  });
});

describe("l'Accueil sans phrase de vide ni titre de dossier", () => {
  const accueil = () => code("src/app/Console.tsx");
  it("n'a plus la phrase « Vous ne tenez encore aucune ligne… », et son chapitre disparaît avec elle", () => {
    expect(accueil(), "la phrase du client sans ligne est revenue").not.toMatch(/Vous ne tenez encore aucune ligne/);
    expect(accueil(), "le relevé n'est plus conditionné : un chapitre vide laisserait 88 px").toMatch(/\{aDuReleve && \(\s*<div className="pile">/);
    expect(accueil(), "la condition du relevé ne regarde plus les lignes, la courbe et les familles").toMatch(/const aDuReleve = positions\.length > 0 \|\| Boolean\(trace\) \|\| familles\.length > 0;/);
  });
  it("n'a plus le titre « Mon dossier » au-dessus de ses tuiles", () => {
    expect(code("src/components/accueil/DossierAccueil.tsx"), "le titre « Mon dossier » est revenu au-dessus du dossier").not.toMatch(/className="eyebrow">\{t\("Mon dossier"\)\}/);
  });
  it("montre les chiffres de l'intention : type et montant à gauche, état et part servie à droite", () => {
    const d = code("src/components/accueil/DossierAccueil.tsx");
    expect(d, "les intentions n'appellent plus « chiffresDeLIntention »").toMatch(/chiffresDeLIntention\(i, offre\(i\.offerId\)\?\.kind \?\? ""\)/);
    expect(d, "la part servie ne s'affiche plus").toMatch(/t\("servi à \{n\} %"/);
  });
});
