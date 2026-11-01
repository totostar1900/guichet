import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SEED_OFFERS } from "@/data/seed";
import { gestesProposables, NB_GESTES, rubriquesPresentes, seancesOuvertes, seancesPrevues, type FaitsDuDossier, type FaitsPourGestes } from "@/lib/domain/accueil";
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

  it("posent la proposition du client toujours, et les prochaines séances seulement s'il y en a", () => {
    expect(grille, "les prochaines adjudications ne dépendent plus de leur existence").toMatch(/prevues\.length > 0 && \(/);
    expect(grille, "la proposition du client mène au sondage").toMatch(/href="\/sondage" className=\{`\$\{styles\.tuile\} \$\{styles\.proposer\}`\}/);
    /* NON-VACUITÉ : la proposition n'est PAS sous la même condition que les prochaines séances, sinon elle disparaîtrait avec elles. */
    const apres = grille.slice(grille.indexOf("prevues.length > 0 && ("));
    expect(apres.indexOf('href="/sondage"'), "la proposition n'est plus rendue après la tuile conditionnelle").toBeGreaterThan(apres.indexOf("</Link>\n              )}"));
  });
  it("mènent à tout le catalogue par un bouton sous les entrées, et plus par une tuile du bas", () => {
    expect(grille, "le bouton « Tous vos services » a disparu").toMatch(/<Link href="\/trader" className=\{styles\.tous\}>/);
    expect(accueil, "la tuile « Vos services » est revenue au bas de la page").not.toMatch(/Vos services/);
  });
  it("n'annoncent le nombre de lignes dans aucune entrée d'« Investir »", () => {
    expect(grille, "une entrée d'« Investir » annonce de nouveau son inventaire").not.toMatch(/"\{n\} (lignes|fonds|séances)"|\.length\}/);
  });
  it("montrent d'office les rubriques qui ont de l'information, sans rien à déplier", () => {
    expect(dossier, "le dossier est redevenu un composant client : ses tuiles se déplieraient").not.toMatch(/"use client"|aria-expanded|useState/);
    /* LES TROIS EN PLEINE LARGEUR, DANS CET ORDRE : intentions, sondage, lignes suivies — puis la grille des petites. */
    const i = dossier.indexOf('href="/moi/ordres"');
    const sond = dossier.indexOf('href="/sondage" nom=', i);
    const suiv = dossier.indexOf('href="/moi/suivies"', sond);
    const grille = dossier.indexOf("className={styles.grille}", suiv);
    expect(i, "les intentions ne sont plus la première rubrique pleine largeur").toBeGreaterThan(0);
    expect(sond, "le sondage ne vient plus après les intentions").toBeGreaterThan(i);
    expect(suiv, "les lignes suivies ne viennent plus après le sondage").toBeGreaterThan(sond);
    expect(grille, "les petites tuiles ne viennent plus après les trois pleines").toBeGreaterThan(suiv);
  });
  it("laisse « Vous pouvez aussi » ouvert, sans chevron ni bouton qui le replie", () => {
    expect(dossier, "« Vous pouvez aussi » est redevenu repliable").not.toMatch(/<details\b/);
    const pied = dossier.slice(dossier.indexOf("className={styles.aussi}"));
    expect(pied, "le pied n'est plus rendu").not.toBe("");
    expect(pied, "le pied porte un bouton : il se replierait").not.toMatch(/<button\b/);
  });
  it("montre pour une ligne suivie le chiffre qui compte et ce qui presse, trois lignes au plus", () => {
    expect(dossier, "les lignes suivies ne montrent plus que trois lignes").toMatch(/\.slice\(0, 3\);\n/);
    expect(dossier, "ce qui presse (la clôture) ne se lit plus sur une ligne suivie").toMatch(/q \? t\("ferme \{q\}"/);
  });
  it("posent la carte de l'indice comme un lien entier, sans titre ni chevron", () => {
    const carte = code("src/components/IndexPulse.tsx");
    expect(accueil, "la carte n'est plus un lien sur la page d'arrivée").toMatch(/<IndexPulse compact pied=\{\{ href: "\/marche", mot: t\("La place"\) \}\} \/>/);
    expect(carte, "la carte n'enveloppe plus sa surface dans le lien").toMatch(/<Link href=\{pied\.href\} className=\{styles\.carteLien\}>/);
    expect(carte, "deux ancres imbriquées : les liens internes doivent se taire quand la carte est un lien").toMatch(/liens && !pied && \(/);
  });
});
