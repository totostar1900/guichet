import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * LES MAQUETTES NE SE REDESSINENT PAS CHACUNE.
 *
 * DEMANDÉ LE 28 OCTOBRE 2026, à la quatrième maquette : « harmoniser — on ne
 * veut pas une présentation entièrement nouvelle à chaque fois, mais rester
 * dans une approche très semblable ». La demande est tenue par une pièce
 * commune, « src/app/maquette/commun.tsx », qui écrit une fois le bandeau,
 * l'en-tête, la boîte de saisie, le pied et le récapitulatif.
 *
 * SEULEMENT, UNE PIÈCE COMMUNE NE TIENT QUE TANT QU'ON S'EN SERT. Rien
 * n'empêche la cinquième maquette de recopier le pied « juste pour cette
 * fois » : elle se ressemblerait le jour de sa naissance et divergerait à la
 * première retouche — c'est exactement ce qui s'était passé avec les trois
 * premières, qui partageaient une feuille de style et redessinaient leur JSX.
 * On ne s'en aperçoit jamais d'un coup : on s'en aperçoit six mois plus tard,
 * devant deux écrans qui ne se ressemblent plus et dont personne ne sait
 * lequel fait foi.
 *
 * LA RÈGLE EST DONC MÉCANIQUE : les classes qui ONT une pièce dans le kit ne
 * se citent que dans le kit. Les autres — « carte », « recap », « second »,
 * la bascule, le reçu — restent libres : ce sont des styles qu'une maquette
 * compose, et les interdire reviendrait à interdire d'avoir une question à
 * soi, ce qui est l'autre moitié de la demande.
 */
const DOSSIER = path.join(process.cwd(), "src/app/maquette");
const KIT = path.join(DOSSIER, "commun.tsx");

/** Les classes que le kit dessine lui-même, et la pièce qui s'en charge. */
const TENUES_PAR_LE_KIT: Record<string, string> = {
  bandeau: "Bandeau",
  tete: "Tete",
  marche: "Tete",
  titre: "Tete",
  isin: "Tete",
  champLabel: "Champ",
  equiv: "Champ",
  /* « saisie » et « unite » sont désormais dessinées par DEUX pièces du kit —
     « Boite » pour un chiffre seul, « Paire » pour deux qui se répondent. La
     règle ne change pas : une maquette ne les dessine pas elle-même. */
  saisie: "Boite ou Paire",
  unite: "Boite ou Paire",
  lienDePaire: "Paire",
  equivVide: "Attente",
  equivCourt: "Trop",
  pied: "Pied",
  action: "Pied",
  coordonnees: "Recap",
};

/** Les fichiers d'une maquette : tout le dossier, sauf le kit et les pages. */
function maquettes(): string[] {
  const out: string[] = [];
  const marche = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) marche(p);
      else if (e.name.endsWith(".tsx") && p !== KIT && e.name !== "page.tsx") out.push(p);
    }
  };
  marche(DOSSIER);
  return out;
}

const court = (f: string) => path.relative(process.cwd(), f);

describe("les maquettes restent dans la même approche", () => {
  const fichiers = maquettes();
  const kit = fs.readFileSync(KIT, "utf8");

  it("il y a bien des maquettes à éprouver, et un kit qui les sert", () => {
    /* SANS CETTE LIGNE, L'ÉPREUVE PASSERAIT À VIDE le jour où le dossier
       serait renommé : zéro fichier, zéro faute, zéro alerte. */
    expect(fichiers.length, "aucune maquette trouvée : l'épreuve ne mesure plus rien").toBeGreaterThanOrEqual(4);
    expect(fs.existsSync(KIT), "le kit commun a disparu : les maquettes n'ont plus rien à partager").toBe(true);
  });

  it("chaque classe surveillée est vraiment dessinée par le kit", () => {
    /* UNE RÈGLE QUI VISE UNE CLASSE MORTE ne protège rien et se lit comme si
       elle protégeait quelque chose. */
    const absentes = Object.entries(TENUES_PAR_LE_KIT).filter(([c]) => !kit.includes(`styles.${c}`));
    expect(
      absentes.map(([c, piece]) => `${c} (annoncée tenue par ${piece})`),
      "ces classes ne sont plus citées par le kit : la règle ne vise plus rien",
    ).toEqual([]);
  });

  it("aucune maquette ne redessine une pièce du kit", () => {
    const fautes: string[] = [];
    for (const f of fichiers) {
      const src = fs.readFileSync(f, "utf8");
      for (const [classe, piece] of Object.entries(TENUES_PAR_LE_KIT)) {
        if (new RegExp(`styles\\.${classe}\\b`).test(src)) fautes.push(`${court(f)} dessine « ${classe} » à la main : c'est le rôle de <${piece}>`);
      }
    }
    expect(
      fautes,
      `une maquette qui recopie une pièce commune s'en détache à la première retouche.\n` + `Passer par la pièce de « src/app/maquette/commun.tsx » :\n  ${fautes.join("\n  ")}`,
    ).toEqual([]);
  });

  it("chaque maquette prend son en-tête et son pied au kit", () => {
    /* L'INVERSE COMPTE AUTANT : ne pas redessiner le pied, c'est facile
       quand on n'a pas de pied du tout. Une maquette qui pose une question
       s'ouvre par le bandeau et l'en-tête communs, et se ferme par le pied
       commun — sinon elle n'est plus dans l'approche, elle est à côté. */
    const manquants = fichiers.filter((f) => {
      const src = fs.readFileSync(f, "utf8");
      return !/from "\.\.?\/\.\.?\/commun"|from "\.\.\/commun"/.test(src) || !/<Bandeau\b/.test(src) || !/<Tete\b/.test(src) || !/<Pied\b/.test(src);
    });
    expect(
      manquants.map(court),
      "ces maquettes n'empruntent pas le bandeau, l'en-tête ou le pied communs :\n  " + manquants.map(court).join("\n  "),
    ).toEqual([]);
  });

  it("le kit pose la fine insécable devant les signes doubles, et le fait lui-même", async () => {
    /* MESURÉ SUR LA CAPTURE DU 28 OCTOBRE : « Combien voulez-vous verser
       chaque mois ? » renvoyait le point d'interrogation seul à la ligne.
       La règle vaut pour la fonction ET pour son emploi : une fine qui
       existe mais que le libellé n'appelle pas ne se voit nulle part. */
    const { fine } = await import("../app/maquette/commun");
    expect(fine("Combien voulez-vous verser chaque mois ?")).toBe("Combien voulez-vous verser chaque mois ?");
    expect(fine("Quel jour du mois ?")).toBe("Quel jour du mois ?");
    expect(fine("Règlement : T+3")).toBe("Règlement : T+3");
    /* Et elle ne touche pas ce qui n'a pas d'espace devant : un ISIN, une
       URL, un « 1:2 » gardent leur forme. */
    expect(fine("GA0000010074 ratio 1:2")).toBe("GA0000010074 ratio 1:2");

    const champ = kit.slice(kit.indexOf("export function Champ"));
    const poses = (champ.match(/fine\(question\)/g) ?? []).length;
    /* « question={question} » est un passage de main, pas un affichage :
       c'est « Boite » qui confie sa question à « Champ ». Seul un
       « {question} » AFFICHÉ, donc non précédé d'un « = », est la faute. */
    const bruts = (champ.match(/(?<!=)\{question\}/g) ?? []).length;
    expect(poses, "le libellé du champ n'appelle plus la fine : elle ne s'applique à rien").toBeGreaterThanOrEqual(2);
    expect(bruts, "une branche du libellé affiche encore la question brute : le signe double y coupera").toBe(0);
  });

  it("chaque maquette pose une question qui lui est propre", () => {
    /* ET L'AUTRE MOITIÉ DE LA DEMANDE : harmoniser n'est pas répéter. Une
       maquette qui n'apporte rien que les autres n'aient déjà est une page
       de plus à relire pour rien — elle doit porter sa raison d'être écrite,
       puisque c'est elle qu'on arbitre. */
    const muettes = fichiers.filter((f) => {
      const tete = fs.readFileSync(f, "utf8").split("export function")[0];
      return tete.trim().length < 400;
    });
    expect(muettes.map(court), "ces maquettes n'écrivent pas ce qu'elles proposent de neuf :\n  " + muettes.map(court).join("\n  ")).toEqual([]);
  });
});
