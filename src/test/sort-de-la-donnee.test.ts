import { describe, expect, it } from "vitest";
import { FAMILLES, SORT, type SortDeLaDonnee } from "@/lib/market/remarques";

/**
 * LE SECOND AXE D'UNE REMARQUE : CE QU'EST DEVENUE LA DONNÉE.
 *
 * Le genre dit la GRAVITÉ, le sort dit le DEVENIR, et les confondre a coûté
 * deux fois. La famille N, « saut de valeur au-delà du seuil », était rangée
 * en anomalie, le cran qui annonce qu'une séance manque de matière. Or sa
 * valeur est lue, écrite en base et seulement signalée : le desk rouvrait une
 * séance entière pour un fonds qui avait bougé de douze pour cent.
 *
 * Et « combien de notre base avons-nous retouché » n'avait pas de réponse,
 * faute d'un champ qui distingue une valeur réparée d'une valeur refusée.
 */
describe("le sort de la donnée", () => {
  it("chaque famille en porte un, et il est connu", () => {
    for (const f of FAMILLES) {
      expect(f.sort, `famille ${f.code} sans sort`).toBeTruthy();
      expect(Object.keys(SORT), `famille ${f.code} : sort inconnu « ${f.sort} »`).toContain(f.sort);
    }
  });

  it("une anomalie ne peut pas annoncer une donnée écrite", () => {
    /* LA RÈGLE QUI TIENT LES DEUX AXES D'ACCORD, et c'est elle qui a fait
       bouger N et Q. Une anomalie dit « cette séance manque de matière ».
       Un sort « corrigée » ou « telle quelle » dit « la valeur est en base ».
       Les deux ensemble sont une contradiction, et c'est exactement celle qui
       envoyait le desk rouvrir des séances complètes pour rien. */
    const contradictoires = FAMILLES.filter((f) => f.genre === "anomalie" && SORT[f.sort].ecrite).map((f) => `${f.code} · ${f.libelle}`);
    expect(contradictoires, "une anomalie dont la donnée est pourtant écrite").toEqual([]);
  });

  it("les six sorts servent tous, sinon le barème ment sur sa finesse", () => {
    const utilises = new Set(FAMILLES.map((f) => f.sort));
    const orphelins = (Object.keys(SORT) as SortDeLaDonnee[]).filter((s) => !utilises.has(s));
    expect(orphelins, "un sort déclaré que personne ne porte").toEqual([]);
  });

  it("le compte du jour, gravé par sort", () => {
    /* Il peut bouger, mais à la main et dans le diff : le barème est ce sur
       quoi le rapport au fournisseur s'articule, et un déplacement silencieux
       d'une famille changerait un chiffre qu'on envoie à un tiers. */
    const parSort: Record<string, number> = {};
    for (const f of FAMILLES) parSort[f.sort] = (parSort[f.sort] ?? 0) + 1;
    expect(parSort).toEqual({ absente: 2, sans_objet: 6, perdue: 8, ecartee: 4, telle_quelle: 3, corrigee: 2 });
  });

  it("une donnée corrigée porte toujours sa valeur d'origine", () => {
    /* LA RÈGLE DE GOUVERNANCE, écrite ici parce qu'elle n'a pas d'autre
       gardien. Dès qu'on répare, une part de la base n'est plus ce que la
       bourse a imprimé, et un régulateur, un client ou le fournisseur
       demanderont « qu'avez-vous changé ». Toute famille « corrigée » doit
       donc montrer la valeur d'ORIGINE dans son message, sans quoi la
       retouche est irréversible et le compte impossible.
       Ce test garde l'intention ; le format du message, lui, se vérifie sur
       les phrases réelles dans remarques.test.ts. */
    for (const f of FAMILLES.filter((x) => x.sort === "corrigee")) {
      expect(f.libelle.toLowerCase(), `famille ${f.code} : un libellé qui ne dit pas la correction`).toMatch(/corrig|convertie/);
    }
  });
});
