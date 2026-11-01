import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SEED_OFFERS } from "@/data/seed";
import { gestesProposables, rubriquesPresentes, seancesOuvertes, seancesPrevues, type FaitsDuDossier } from "@/lib/domain/accueil";
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
  it("ne propose que des gestes que le client peut faire lui-même", () => {
    const tous = gestesProposables(faits(), true);
    expect(tous).toEqual(["intention", "versement", "suivre", "prelevement"]);
    /* Les droits de garde et les documents ne se créent pas : ils ne sont jamais proposés. */
    for (const g of tous) expect(["garde", "documents"]).not.toContain(g);
  });
  it("ne propose pas ce que le client a déjà fait", () => {
    expect(gestesProposables(faits({ intentions: 1, versements: 1, lignesSuivies: 1, mandats: 1 }), true)).toEqual([]);
  });
  it("ne propose pas d'agir sans convention : seul suivre une ligne reste ouvert", () => {
    expect(gestesProposables(faits(), false)).toEqual(["suivre"]);
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
  const dossier = code("src/components/accueil/TuilesDossier.tsx");
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
  it("ouvrent une seule tuile du dossier à la fois, repliée au chargement", () => {
    expect(dossier, "l'état d'ouverture n'est plus une seule clé").toMatch(/useState<string \| null>\(null\)/);
    expect(dossier, "la tuile ne dit plus si elle est ouverte à qui lit l'écran").toMatch(/aria-expanded=\{est\}/);
  });
  it("laissent « Vous pouvez aussi » ouvert, sans chevron ni bouton qui le replie", () => {
    expect(dossier, "« Vous pouvez aussi » est redevenu repliable").not.toMatch(/<details\b/);
    const pied = dossier.slice(dossier.indexOf("className={styles.aussi}"));
    expect(pied, "le pied n'est plus rendu").not.toBe("");
    expect(pied, "le pied porte un bouton : il se replierait").not.toMatch(/<button\b/);
  });
  it("posent la carte de l'indice comme un lien entier, sans titre ni chevron", () => {
    const carte = code("src/components/IndexPulse.tsx");
    expect(accueil, "la carte n'est plus un lien sur la page d'arrivée").toMatch(/<IndexPulse compact pied=\{\{ href: "\/marche", mot: t\("La place"\) \}\} \/>/);
    expect(carte, "la carte n'enveloppe plus sa surface dans le lien").toMatch(/<Link href=\{pied\.href\} className=\{styles\.carteLien\}>/);
    expect(carte, "deux ancres imbriquées : les liens internes doivent se taire quand la carte est un lien").toMatch(/liens && !pied && \(/);
  });
});
