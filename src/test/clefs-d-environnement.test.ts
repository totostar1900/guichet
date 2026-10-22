import { RACINE } from "./racine";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * .env.example NOMME TOUTES LES CLEFS QUE L'APPLICATION LIT.
 *
 * Mesuré le 22 octobre 2026, en préparant le travail depuis un autre
 * ordinateur : 13 clefs lues par `src/` manquaient à l'exemple. Sur un poste
 * neuf elles ne sont pas posées, la fonction se coupe, et rien ne le dit :
 * la lecture automatique des communiqués, le webhook du courrier entrant, le
 * modèle WhatsApp du prélèvement, le repli de la bibliothèque. C'est la
 * famille de défauts la plus chère de la maison, et elle se referme ici.
 *
 * L'INVERSE COMPTE AUSSI. Une clef listée mais lue nulle part fait croire à
 * un réglage qui n'agit plus.
 *
 * LE SCANNER A UN ANGLE MORT ET IL LE DIT. `process.env[variable]` ne se lit
 * pas au texte. Une première version avait déclaré WA_TEMPLATE_OFFER « lue
 * nulle part » alors qu'elle passe par `tmpl(clef, défaut)` ; le scanner suit
 * maintenant cette indirection, et signale toute autre lecture dynamique
 * plutôt que de se taire. Le contrôle échoue si une nouvelle apparaît.
 *
 * `scripts/` est hors sujet : ONLY, BASE, CHROME sont des boutons d'outil
 * passés en ligne de commande, pas de la configuration de déploiement.
 */
type Scan = { manquantes: string[]; orphelines: string[]; horsDeVue: string[] };

const mesurer = (): Scan => {
  const sortie = execFileSync(process.execPath, [`${RACINE}/scripts/clefs-d-environnement.mjs`], { encoding: "utf8" });
  const bloc = (titre: string): string[] =>
    sortie
      .split(new RegExp(`=== ${titre}[^\\n]*===\\n`))[1]
      ?.split(/\n=== /)[0]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("sur un poste") && !l.startsWith("elles font") && !l.startsWith("une lecture") && l !== "aucune")
      .map((l) => l.split(/\s+/)[0]) ?? [];
  return {
    manquantes: bloc("LUES PAR L APPLICATION, ABSENTES"),
    orphelines: bloc("LISTEES DANS .env.example, LUES NULLE PART"),
    horsDeVue: bloc("HORS DE VUE DU SCANNER"),
  };
};

describe("une clef lue par l'application est écrite dans .env.example", () => {
  const scan = mesurer();

  it("aucune clef lue sans être nommée dans l'exemple", () => {
    expect(
      scan.manquantes,
      `ces clefs ne seront pas posées sur un poste neuf, et la fonction se coupera sans le dire. Les ajouter à .env.example avec une ligne qui dit ce qu'on perd sans elles :\n  ${scan.manquantes.join("\n  ")}`,
    ).toEqual([]);
  });

  it("aucune clef nommée dans l'exemple sans être lue", () => {
    expect(
      scan.orphelines,
      `ces clefs font croire à un réglage qui n'agit plus :\n  ${scan.orphelines.join("\n  ")}`,
    ).toEqual([]);
  });

  it("le scanner voit tout ce qu'il prétend mesurer", () => {
    expect(
      scan.horsDeVue,
      `lecture dynamique de process.env que le scanner ne sait pas nommer. Soit l'écrire en littéral, soit apprendre l'indirection au scanner (voir tmpl) :\n  ${scan.horsDeVue.join("\n  ")}`,
    ).toEqual([]);
  });

  it("les quatre clefs sans lesquelles rien ne tourne sont dans l'exemple", () => {
    /* Le contrôle ci-dessus part du code ; celui-ci part du besoin, et tient
       même si un jour plus personne ne lit l'une d'elles directement. */
    const exemple = readFileSync(`${RACINE}/.env.example`, "utf8");
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "AUTH_SECRET"])
      expect(exemple, `${k} manque à .env.example`).toContain(`${k}=`);
  });
});
