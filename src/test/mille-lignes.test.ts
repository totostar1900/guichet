import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PLAFOND_POSTGREST, jusqua, parLots } from "@/lib/data/supabase";

const ROOT = path.join(__dirname, "../..");
const DEPOT = "src/lib/data/supabase.ts";
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * MILLE LIGNES, ET PAS UNE DE PLUS — RELEVÉ LE 29 OCTOBRE 2026.
 *
 * PostgREST plafonne toute lecture à mille lignes et ne le dit pas : pas
 * d'erreur, pas d'avertissement, une réponse complète en apparence et le reste
 * manquant. C'est le pire genre de défaut, celui dont le silence ressemble au
 * succès.
 *
 * LA MAISON L'AVAIT DÉJÀ PAYÉ DEUX FOIS — « la dette adjugée aurait perdu un
 * septième de ses coupons », « une mesure d'encours sortie à 48 % » — et elle
 * avait refermé le piège QUATRE FOIS À LA MAIN, par quatre boucles identiques
 * recopiées sans jamais être nommées. Les lectures écrites depuis ne les ont
 * pas vues, et deux troncatures tournaient en production :
 *
 *   LE JOURNAL BEAC, 2 740 lignes, lu entier pour en tirer le dernier état de
 *   chaque adresse. Tronqué, il en perdait 353 sur 1 347 — reprises pour
 *   NEUVES à chaque tour, donc réécrites, ce qui poussait une adresse de plus
 *   dehors. 1 199 réécritures sans le moindre changement comptées en base,
 *   44 % de la table. Le défaut se nourrissait lui-même.
 *
 *   LE FIL DU DESK, 2 528 lignes, demandé à cinq mille par la page de
 *   reporting, son export CSV et deux analyses. Il en recevait mille : le
 *   desk comptait sur 40 % de son fil, et la page dont le métier est de
 *   compter se trompait depuis toujours.
 *
 * ET DOUZE APPELS DEMANDAIENT ENTRE MILLE ET VINGT MILLE LIGNES — dont les
 * deux exports CSV — sans qu'aucun pût être honoré.
 */
describe("mille lignes", () => {
  /* LE MOTIF EST NOMMÉ, ET IL N'Y EN A QU'UN. C'est la clause qui compte :
     quatre copies d'une même boucle ne s'appellent pas une règle, et c'est
     précisément parce qu'aucune ne portait de nom que les lectures suivantes
     ne les ont pas vues. */
  it("ne garde aucune pagination recopiée à la main", () => {
    const src = code(DEPOT);
    /* Le nom de la variable ne compte pas : les quatre boucles d'origine
       disaient « from + 999 », pas « de + 999 ». Une clause qui n'aurait
       gardé qu'un nom de variable se serait laissée contourner en le
       changeant. */
    expect(src, "une boucle de pagination a été réécrite à la main").not.toMatch(/\+= 1000|\+ 999/);
    expect(src, "le plafond est réécrit en clair au lieu d'être nommé").not.toMatch(/\.range\([^)]*\b1000\b/);
  });

  /**
   * AUCUNE LIMITE VARIABLE NE PASSE PLUS PAR « .limit() ».
   *
   * Une liste qui accepte un « limit » promet un nombre ; au-dessus de mille
   * elle n'en tenait rien. La règle est donc mécanique et sans exception :
   * un nombre qui vient du demandeur passe par « jusqua », qui pagine quand
   * il le faut. Un littéral reste permis — il est sous les yeux de qui
   * l'écrit, et on le lit en le comparant au plafond.
   */
  it("fait passer toute limite du demandeur par « jusqua »", () => {
    const src = code(DEPOT);
    const variables = [...src.matchAll(/\.limit\(([^)]*)\)/g)].map((m) => m[1].trim()).filter((v) => !/^\d+$/.test(v));
    expect(variables, `ces limites viennent du demandeur et ne sont pas paginées : ${variables.join(", ")}`).toEqual([]);
    // Non-vacuité : « jusqua » sert bien, et à plus d'un endroit.
    expect((src.match(/jusqua</g) ?? []).length, "« jusqua » n'est plus employé : la clause ci-dessus ne garde rien").toBeGreaterThanOrEqual(8);
  });

  /* ET LES LITTÉRAUX QUI RESTENT SONT SOUS LE PLAFOND. Un « .limit(5000) »
     écrit en clair serait une demande qui ne peut pas être tenue. */
  it("n'écrit aucune limite littérale au-dessus du plafond", () => {
    const src = code(DEPOT);
    const trop = [...src.matchAll(/\.limit\((\d+)\)/g)].map((m) => Number(m[1])).filter((n) => n > PLAFOND_POSTGREST);
    expect(trop, `ces limites dépassent le plafond et ne seront pas tenues : ${trop.join(", ")}`).toEqual([]);
  });

  /**
   * CHAQUE LECTURE PAR LOTS FINIT SUR LA CLÉ DE SA TABLE.
   *
   * Paginer, c'est remplacer une requête par plusieurs, et entre deux
   * requêtes Postgres est libre de départager comme il veut les lignes que le
   * tri laisse à égalité. Un journal trié sur le seul horodatage, avec deux
   * écritures à la même seconde de part et d'autre d'une frontière de lot,
   * rend une ligne deux fois et en perd une autre — aussi silencieusement que
   * le plafond qu'on vient de refermer. Un remède qui réinstalle le défaut
   * qu'il soigne n'en est pas un.
   *
   * LES CLÉS SE LISENT DANS LES MIGRATIONS, pas dans une liste tenue ici :
   * une table neuve apporte la sienne, et la clause la juge sans qu'on y
   * touche. Le relevé du 29 octobre 2026 a confronté cette lecture à la base
   * de production, clé par clé, sur les cinquante-huit tables : aucun écart.
   */
  it("fait finir chaque lecture par lots sur la clé primaire de sa table", () => {
    /* Les deux vues n'ont pas de clé primaire ; leur « distinct on » tient ce
       rôle, et c'est la seule exception, nommée pour qu'il n'en naisse pas
       d'autres en silence. */
    const VUES: Record<string, string[]> = { latest_quotes: ["isin"], latest_fund_navs: ["fund_key"] };

    const cles: Record<string, string[]> = { ...VUES };
    for (const f of fs.readdirSync(path.join(ROOT, "supabase/migrations")).sort()) {
      const sql = lire(`supabase/migrations/${f}`);
      for (const m of sql.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+)\s*\(/g)) {
        const t = m[1];
        const corps = sql.slice(m.index! + m[0].length, sql.indexOf("\n);", m.index!));
        const groupee = /^\s*primary key \(([^)]*)\)/m.exec(corps);
        const seule = /^\s*(\w+)\s+[^,\n]*\bprimary key\b/m.exec(corps);
        const pk = groupee ? groupee[1].split(",").map((c) => c.trim()) : seule ? [seule[1]] : null;
        if (pk && !cles[t]) cles[t] = pk;
      }
    }
    // Non-vacuité, premier volet : les clés ont bien été lues.
    expect(Object.keys(cles).length, "les clés primaires ne se lisent plus dans les migrations").toBeGreaterThanOrEqual(55);

    const src = code(DEPOT).split("\n");
    const lectures: { ligne: number; table: string; tris: string[] }[] = [];
    for (let i = 0; i < src.length; i++) {
      if (!/\b(parLots|jusqua)[<(]/.test(src[i])) continue;
      let bloc = "";
      let creux = 0;
      let ouvert = false;
      for (let j = i; j < Math.min(src.length, i + 20); j++) {
        bloc += src[j] + "\n";
        for (const c of src[j]) {
          if (c === "(") {
            creux += 1;
            ouvert = true;
          } else if (c === ")") creux -= 1;
        }
        i = j;
        if (ouvert && creux <= 0) break;
      }
      if (!bloc.includes(".range(")) continue;
      const table = /\.from\("([^"]+)"\)/.exec(bloc);
      lectures.push({ ligne: i + 1, table: table ? table[1] : "?", tris: [...bloc.matchAll(/\.order\("([^"]+)"/g)].map((m) => m[1]) });
    }
    // Non-vacuité, second volet : les lectures paginées ont bien été trouvées.
    expect(lectures.length, "plus aucune lecture par lots n'est repérée : la clause ne garde rien").toBeGreaterThanOrEqual(50);

    const nues = lectures.filter((l) => {
      const pk = cles[l.table];
      return !pk || pk.some((c) => !l.tris.includes(c));
    });
    expect(nues.map((l) => `${l.table} (ligne ${l.ligne}) trie sur [${l.tris.join(", ")}] et sa clé est [${(cles[l.table] ?? ["table inconnue"]).join(", ")}]`), "ces lectures par lots n'ont pas d'ordre total : deux lots peuvent rendre deux fois la même ligne et en perdre une autre").toEqual([]);
  });

  /* LES DEUX AIDES FONT CE QU'ELLES DISENT. Sans ces mesures, les clauses de
     forme ci-dessus garderaient un dispositif qui ne marche pas. */
  it("rend tout ce qu'on lui demande, au-dessus comme au-dessous du plafond", async () => {
    /**
     * LE FAUX DÉPÔT PORTE LE PLAFOND, SANS QUOI IL NE PROUVE RIEN.
     *
     * Première écriture : il honorait la plage demandée, quelle qu'elle soit.
     * Vérification inverse faite — en retirant la pagination de « jusqua »,
     * l'épreuve restait verte, parce que le faux rendait deux mille cinq
     * cents lignes d'un coup là où PostgREST en rend mille. Une épreuve qui
     * mesure le contournement d'un piège doit POSER le piège.
     */
    const faux = (total: number) => (de: number, a: number) => {
      const jusquOu = Math.min(a, de + PLAFOND_POSTGREST - 1, total - 1);
      const page = Array.from({ length: Math.max(0, jusquOu - de + 1) }, (_, i) => de + i);
      return Promise.resolve({ data: page, error: null });
    };
    // Sous le plafond : une seule requête, et tout arrive.
    expect(await jusqua("essai", 10, faux(10_000))).toHaveLength(10);
    // Au-dessus : les lots, et on s'arrête à ce qu'on a demandé.
    expect(await jusqua("essai", 2_500, faux(10_000))).toHaveLength(2_500);
    // Une table plus petite que la demande : on s'arrête à la table.
    expect(await jusqua("essai", 5_000, faux(1_200))).toHaveLength(1_200);
    // Pile le plafond : le cas qui trompe, parce qu'un lot plein ressemble à une fin.
    expect(await jusqua("essai", 3_000, faux(PLAFOND_POSTGREST))).toHaveLength(PLAFOND_POSTGREST);
    // Et « parLots » prend tout, sans borne.
    expect(await parLots("essai", faux(2_740))).toHaveLength(2_740);
    /* ZÉRO NE VA PAS LE DEMANDER. Un « .limit(0) » rendait une liste vide sans
       requête ; une plage de zéro à moins un n'est pas une plage. */
    let touches = 0;
    const compte = (de: number, a: number) => {
      touches += 1;
      return faux(10_000)(de, a);
    };
    expect(await jusqua("essai", 0, compte)).toEqual([]);
    expect(touches, "une demande de zéro ligne part quand même en base, sur une plage qui n'en est pas une").toBe(0);
  });

  /* L'ERREUR REMONTE, ELLE NE SE PERD PAS DANS LA BOUCLE. Une pagination qui
     avalerait l'erreur du deuxième lot rendrait une liste courte et muette —
     exactement le défaut qu'on referme. */
  it("laisse remonter l'erreur d'un lot", async () => {
    let tour = 0;
    const casse = (de: number, a: number) => {
      tour += 1;
      if (tour === 2) return Promise.resolve({ data: null, error: { message: "coupure au deuxième lot" } });
      return Promise.resolve({ data: Array.from({ length: a - de + 1 }, (_, i) => de + i), error: null });
    };
    await expect(parLots("essai", casse)).rejects.toThrow(/coupure au deuxième lot/);
  });
});
