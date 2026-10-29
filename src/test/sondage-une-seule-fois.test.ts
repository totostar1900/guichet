import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { consensus, mur, DOCTRINE_UNE_SEULE_FOIS } from "@/lib/domain/sondage";
import type { Country, LigneSondee } from "@/lib/domain/types";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/**
 * LE CODE, PAS CE QU'ON EN DIT — ET CETTE ÉPREUVE L'A APPRIS À SES DÉPENS.
 *
 * Sa première écriture cherchait les mots de famille depuis le début de
 * « consensus » JUSQU'À LA FIN DU FICHIER, où vit la doctrine. Vérification
 * inverse faite : en posant « familleId » dans le modèle sans toucher au
 * calcul, elle restait verte — parce que le mot « sœurs », écrit dans le
 * commentaire de la doctrine, suffisait à la satisfaire. Elle se lisait
 * elle-même et se déclarait contente.
 */
const code = (p: string) =>
  lire(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
/** Le corps d'une fonction exportée, jusqu'à la déclaration suivante. */
const corpsDe = (src: string, nom: string) => {
  const deb = src.indexOf(`export function ${nom}`);
  if (deb < 0) return "";
  const suite = [...src.matchAll(/^export (?:function|const|interface|type) /gm)].map((m) => m.index ?? -1).filter((i) => i > deb);
  return src.slice(deb, suite.length ? suite[0] : undefined);
};

/**
 * LE MONTANT D'UN CLIENT SE COMPTE UNE SEULE FOIS.
 *
 * ARBITRÉ LE 29 OCTOBRE 2026. La doctrine vit dans « domain/sondage », près
 * du consensus qu'elle lie ; cette épreuve monte la garde devant elle.
 *
 * CE QU'ELLE GARDE N'EST PAS ENCORE ÉCRIT, ET C'EST TOUT SON INTÉRÊT. Le
 * geste qui crée des lignes sœurs — choisir plusieurs Trésors et plusieurs
 * durées d'un coup — n'existe que dans une maquette. Le jour où il entrera
 * dans le modèle, celui-ci gagnera un lien entre les lignes d'une même
 * proposition, et c'est CE JOUR-LÀ qu'il faut relire la doctrine : après,
 * le consensus aura déjà compté six fois cinquante millions, et rien ne
 * l'aura dit.
 *
 * UNE ÉPREUVE QUI ATTEND N'EST PAS UNE ÉPREUVE VIDE : elle affirme un fait
 * vrai aujourd'hui — le modèle n'a aucun lien de famille — et elle tombe
 * exactement quand ce fait cesse d'être vrai. C'est un fil tendu en travers
 * d'une porte, pas un contrôle qui passerait au vert sans rien regarder.
 */
const ligne = (id: string, country: string, tenor: string, montant: number, userId: string): LigneSondee => ({
  id,
  ref: id,
  origine: "client",
  userId,
  instrument: "OTA",
  country: country as Country,
  tenor,
  montant,
  dansJours: 30,
  state: "ouverte",
  createdAt: "2026-10-29T00:00:00Z",
  updatedAt: "2026-10-29T00:00:00Z",
});

/** Les mots par lesquels un lien de famille arriverait dans le modèle. */
const MOTS_DE_FAMILLE = /famille|alternative|soeur|sœur|fratrie|propositionId|lotId/i;

describe("le montant d'un client se compte une seule fois", () => {
  it("écrit sa doctrine là où le calcul se fait", () => {
    /* La règle doit être lisible par qui touche au consensus, et non rangée
       dans un document que personne n'ouvre en codant. */
    const src = lire("src/lib/domain/sondage.ts");
    expect(DOCTRINE_UNE_SEULE_FOIS.length, "la doctrine a perdu son énoncé").toBeGreaterThan(60);
    expect(src, "la doctrine ne dit plus ce qu'elle exige du modèle").toMatch(/part FERME|sœurs/);
  });

  it("mesure ce que six lignes sœurs produisent aujourd'hui", () => {
    /* LE CHIFFRE QUI JUSTIFIE LA RÈGLE, recalculé à chaque passage plutôt
       que recopié dans un commentaire : six groupes à cinquante millions
       pour cinquante millions engagés. */
    const soeurs = ["Cameroun", "Gabon"].flatMap((p, i) => ["2 ans", "5 ans", "7 ans"].map((d, j) => ligne(`s${i}${j}`, p, d, 50_000_000, "client-1")));
    const g = consensus(soeurs);
    expect(g.length, "le regroupement a changé : la doctrine parle de six groupes").toBe(6);
    expect(
      g.reduce((s, c) => s + c.montant, 0),
      "la somme des groupes n'est plus six fois le montant : relire la doctrine, son chiffre a bougé",
    ).toBe(300_000_000);
    /* ET LE MUR N'EST PAS LE DANGER : il exige cent millions ET trois
       clients. Le dire ici empêche de « corriger » la doctrine en touchant
       au seuil, qui n'y est pour rien. */
    expect(g.some(mur), "un seul client franchit le mur : ce n'était pas le cas, et la doctrine repose là-dessus").toBe(false);
  });

  it("tombe le jour où une ligne connaîtra ses sœurs", () => {
    /**
     * LE FIL TENDU EN TRAVERS DE LA PORTE.
     *
     * Tant que « LigneSondee » n'a aucun champ de famille, le consensus ne
     * PEUT pas compter deux fois le même argent : il ne sait pas que deux
     * lignes vont ensemble. Le jour où ce champ arrive, il le saura — et il
     * devra alors rendre la part ferme, sans quoi il promettra six fois
     * cinquante millions.
     *
     * CETTE ÉPREUVE TOMBE À CE MOMENT PRÉCIS, avec la marche à suivre. Elle
     * ne cherche pas à deviner le nom du champ : elle surveille un champ de
     * lemmes — famille, alternative, sœur — et c'est assez, parce qu'un lien
     * entre des lignes d'une même proposition ne se nommera pas autrement.
     */
    const types = lire("src/lib/domain/types.ts");
    const deb = types.indexOf("export interface LigneSondee");
    const bloc = types.slice(deb, types.indexOf("}", deb));
    expect(deb, "« LigneSondee » est introuvable : l'épreuve ne garde plus rien").toBeGreaterThan(0);

    const lien = bloc.match(MOTS_DE_FAMILLE);
    if (!lien) return; // Le geste n'existe pas encore : rien à vérifier.

    /* Il existe. La doctrine devient exigible, ici et maintenant — et c'est
       le CALCUL qui doit la connaître, pas le commentaire qui l'explique. */
    const calcul = corpsDe(code("src/lib/domain/sondage.ts"), "consensus");
    expect(calcul.length, "le corps de « consensus » est introuvable : l'épreuve ne garde plus rien").toBeGreaterThan(200);
    expect(
      MOTS_DE_FAMILLE.test(calcul),
      `« LigneSondee » porte désormais « ${lien[0]} » : des lignes sœurs peuvent exister, et le consensus ne les connaît pas.\n` +
        `Il compte donc le montant de chaque sœur dans son groupe, soit six fois cinquante millions pour cinquante millions engagés.\n` +
        `Lire la doctrine « DOCTRINE_UNE_SEULE_FOIS » dans « domain/sondage » : le groupe garde son montant possible, et rend EN PLUS la part ferme, sur laquelle le mur se juge.`,
    ).toBe(true);
  });
});
