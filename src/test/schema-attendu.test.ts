import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { RACINE } from "./racine";
import { SCHEMA_ATTENDU } from "@/lib/domain/schema-attendu";
import { compteDeLEcart, declarePar, ecartDeSchema, type SchemaVu } from "@/lib/domain/schema-declare";

/**
 * UNE MIGRATION OUBLIÉE NE SE VOYAIT NULLE PART.
 *
 * RELEVÉ LE 27 OCTOBRE 2026, et il a coûté quatre jours. Sept migrations
 * étaient restées non appliquées pendant que le code qui en dépendait tournait
 * en production, et les trois conséquences ne se lisaient pas au même endroit :
 *
 *   LES RELANCES criaient dans les journaux de Vercel, que personne n'ouvre
 *   tous les matins, et leur robot échouait depuis le 23 octobre.
 *
 *   L'ARBITRAGE ET LE SONDAGE ne criaient PAS. Leurs tables et leurs colonnes
 *   manquaient, les robots levaient au premier appel, l'enveloppe inscrivait
 *   l'échec, et la page Santé montrait des robots EN BONNE SANTÉ puisqu'ils
 *   avaient bien tourné. La borne qu'un client signe ne jouait pas, et rien
 *   nulle part ne disait pourquoi.
 *
 * Douze points de Santé veillaient sur la donnée de marché ; aucun ne regardait
 * la base. La panne la plus confortable de la maison vivait dans l'outil qui
 * sert à les traquer.
 */
/* Le schéma prêté au dépôt mémoire. Au niveau du module parce que
   « vi.doMock » n'est pas hissé : un objet ordinaire suffit, et « vi.hoisted »
   dans un describe serait exécuté avant tout le fichier. */
const schema: { vu: SchemaVu | undefined } = { vu: undefined };

const MIGRATIONS = `${RACINE}/supabase/migrations`;
const fichiers = () =>
  readdirSync(MIGRATIONS)
    .filter((x) => x.endsWith(".sql"))
    .sort()
    .map((nom) => ({ nom, sql: readFileSync(`${MIGRATIONS}/${nom}`, "utf8") }));

describe("le relevé figé et les migrations se répondent", () => {
  const lu = declarePar(fichiers());

  it("au caractère, dans les quatre genres", () => {
    /* Le relevé est écrit par « npm run schema:attendu » et commité, parce que
       le dossier des migrations n'entre pas dans le paquet déployé sur Vercel :
       le lire à l'exécution reviendrait à ne rien lire. Un relevé périmé
       annoncerait une base saine, ou crierait sur une colonne retirée exprès —
       les deux valent moins que pas de relevé du tout. */
    expect(SCHEMA_ATTENDU.tables, "relevé périmé : lancer « npm run schema:attendu »").toEqual(lu.tables);
    expect(SCHEMA_ATTENDU.colonnes).toEqual(lu.colonnes);
    expect(SCHEMA_ATTENDU.index).toEqual(lu.index);
    expect(SCHEMA_ATTENDU.valeurs).toEqual(lu.valeurs);
  });

  it("ne laisse aucune déclaration incomprise", () => {
    /* UN ANALYSEUR QUI RATE UNE DÉCLARATION REND UN CONTRÔLE VIDE SANS LE DIRE,
       ce qui serait exactement la panne qu'on ferme. Les lignes qui ressemblent
       à une déclaration sans être comprises sont rendues ; elles doivent rester
       à zéro, et une nouvelle forme au dépôt fait tomber ce cliquet plutôt que
       de disparaître du relevé. */
    expect(lu.incompris, "une déclaration n'est pas comprise : le relevé serait incomplet, et un contrôle incomplet ment").toEqual([]);
  });

  it("regarde bien quelque chose", () => {
    /* NON VACUITÉ. Un extracteur cassé rendrait quatre tableaux vides, le
       relevé figé les recopierait, le cliquet ci-dessus passerait au vert, et
       le point de Santé annoncerait « tout est en base » sur une base vide. */
    expect(fichiers().length).toBeGreaterThan(100);
    expect(lu.tables.length).toBeGreaterThan(50);
    expect(lu.colonnes.length).toBeGreaterThan(100);
    expect(lu.index.length).toBeGreaterThan(100);
    expect(lu.valeurs.length).toBeGreaterThan(80);
    // Et les objets dont l'absence a coûté les quatre jours sont bien dedans.
    expect(lu.tables).toContain("relances");
    expect(lu.tables).toContain("survey_lines");
    expect(lu.colonnes).toContain("intents.switch_by");
    expect(lu.valeurs).toContain("event_kind.avis_manque");
  });

  it("soustrait ce qu'une migration retire", () => {
    /* L'ORDRE COMPTE : 0115 supprime deux colonnes que des migrations
       antérieures avaient créées. Un relevé qui additionnerait les créations
       sans soustraire les suppressions annoncerait à jamais deux colonnes
       manquantes qui ont été retirées exprès — c'est à dire un rouge permanent
       sur une base correcte. */
    expect(lu.colonnes, "une colonne supprimée par une migration reste au relevé").not.toContain("direct_debit_mandates.max_amount");
    expect(lu.colonnes).not.toContain("debit_draws.retry_of");
    // Non vacuité : les deux tables sont bien suivies par ailleurs.
    expect(lu.tables).toContain("direct_debit_mandates");
    expect(lu.tables).toContain("debit_draws");
  });
});

describe("ce qu'un lot de migrations déclare", () => {
  const un = (sql: string) => declarePar([{ nom: "essai.sql", sql }]);

  it("lit une table, et ne lit pas les colonnes de son corps", () => {
    /* VOULU : une colonne déclarée dans un corps vient avec sa table. Si la
       table est là, elle est là. Les analyser serait la part la plus fragile du
       travail — des types composés, des contraintes en ligne — pour une
       information qu'on a déjà. */
    const d = un(`create table if not exists public.essais (\n  id uuid primary key,\n  montant bigint not null\n);`);
    expect(d.tables).toEqual(["essais"]);
    expect(d.colonnes).toEqual([]);
    expect(d.incompris).toEqual([]);
  });

  it("lit une colonne ajoutée, sur la ligne de son « alter table » ou dix lignes plus bas", () => {
    // Les deux formes existent au dépôt ; en rater une ferait un relevé partiel.
    expect(un(`alter table intents add column if not exists switch_by date;`).colonnes).toEqual(["intents.switch_by"]);
    expect(un(`alter table public.notes_budget\n  add column if not exists references_pieces jsonb not null default '[]'::jsonb;`).colonnes).toEqual(["notes_budget.references_pieces"]);
  });

  it("lit une énumération étalée sur plusieurs lignes", () => {
    /* Une seule le fait au dépôt. Replier sa parenthèse coûte trois lignes et
       évite de tolérer un « incompris » permanent — or un relevé qui s'habitue
       à un reste ne remarque plus le deuxième. */
    const d = un(`create type public.genre as enum (\n  'un',\n  'deux'\n);`);
    expect(d.valeurs).toEqual(["genre.deux", "genre.un"]);
    expect(d.incompris).toEqual([]);
  });

  it("ne prend pas une déclaration écrite dans un commentaire", () => {
    // Plusieurs migrations citent « create table » dans une phrase : les
    // compter ferait chercher en base une table qui n'a jamais existé.
    const d = un(`-- create table fantome (id uuid);\ncreate table vraie (id uuid);`);
    expect(d.tables).toEqual(["vraie"]);
  });

  it("dit ce qu'il ne comprend pas plutôt que de le perdre", () => {
    const d = un(`create index on intents (switch_by);\nalter type genre rename value 'un' to 'deux';`);
    expect(d.incompris).toHaveLength(2);
    expect(d.incompris.join(" ")).toMatch(/index sans nom/);
    expect(d.incompris.join(" ")).toMatch(/alter type/i);
  });
});

describe("l'écart entre le dépôt et la base", () => {
  const vu = (v: Partial<SchemaVu>): SchemaVu => ({ tables: [], colonnes: [], index: [], valeurs: [], ...v });

  it("ne regarde que dans un sens", () => {
    /* L'INVERSE EST NORMAL ET ABONDANT : les tables de Supabase, celles d'avant
       le suivi des migrations, tout ce qu'un outil ajoute à côté. Le crier
       ferait un rouge permanent, et un rouge permanent ne se lit plus. */
    const e = ecartDeSchema({ tables: ["a"], colonnes: [], index: [], valeurs: [], incompris: [] }, vu({ tables: ["a", "auth_users", "pg_stat_statements"] }));
    expect(compteDeLEcart(e)).toBe(0);
  });

  it("nomme ce qui manque, dans les quatre genres", () => {
    const e = ecartDeSchema(
      { tables: ["relances"], colonnes: ["intents.switch_by"], index: ["intents_switch_by_idx"], valeurs: ["event_kind.avis_manque"], incompris: [] },
      vu({ tables: ["intents"], colonnes: ["intents.id"], index: [], valeurs: ["event_kind.system"] }),
    );
    expect(e.tables).toEqual(["relances"]);
    expect(e.colonnes).toEqual(["intents.switch_by"]);
    expect(e.index).toEqual(["intents_switch_by_idx"]);
    expect(e.valeurs).toEqual(["event_kind.avis_manque"]);
    expect(compteDeLEcart(e)).toBe(4);
  });

  it("ne compte pas deux fois les colonnes d'une table absente", () => {
    /* La table manquante dit déjà tout : nommer ses douze colonnes à côté
       noierait le point sous sa propre conséquence, et « 13 objets manquants »
       se lit moins bien que « 1 table ». */
    const e = ecartDeSchema(
      { tables: ["survey_lines"], colonnes: ["survey_lines.montant", "survey_lines.state", "intents.switch_by"], index: [], valeurs: [], incompris: [] },
      vu({ tables: ["intents"], colonnes: ["intents.id"] }),
    );
    expect(e.tables).toEqual(["survey_lines"]);
    expect(e.colonnes, "les colonnes d'une table absente sont comptées à part").toEqual(["intents.switch_by"]);
    expect(compteDeLEcart(e)).toBe(2);
  });

  it("se moque de la casse", () => {
    // Postgres range les noms en minuscules ; le dépôt peut les écrire autrement.
    const e = ecartDeSchema({ tables: ["Relances"], colonnes: [], index: [], valeurs: [], incompris: [] }, vu({ tables: ["relances"] }));
    expect(compteDeLEcart(e)).toBe(0);
  });

  it("ne rend rien quand on ne lui déclare rien", () => {
    // Non vacuité : un comparateur qui crierait toujours passerait les épreuves ci-dessus.
    expect(compteDeLEcart(ecartDeSchema({ tables: [], colonnes: [], index: [], valeurs: [], incompris: [] }, vu({})))).toBe(0);
  });
});

describe("la fonction qui lit le schéma vit au dépôt", () => {
  it("elle est déclarée par une migration, et ne rend que des noms", () => {
    /* Le modèle vit dans « types.ts » ET dans les migrations ; une fonction que
       le code appelle et que la base n'a pas rend « undefined », donc le point
       se tait — c'est juste, mais il faut que la migration existe pour qu'il
       parle un jour. */
    const sql = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(`${MIGRATIONS}/${f}`, "utf8"))
      .join("\n");
    expect(sql).toMatch(/create or replace function objets_du_schema\(\)/);
    expect(sql).toMatch(/returns table \(genre text, nom text\)/);
    /* ELLE NE SORT PAS DE « public » : les schémas de Supabase ne sont pas
       décrits par nos migrations, et les rendre ferait comparer ce que le dépôt
       ne déclare pas. */
    expect(sql).toMatch(/grant execute on function objets_du_schema\(\) to service_role/);
    expect(sql).toMatch(/revoke all on function objets_du_schema\(\) from public/);
  });
});

/**
 * LE POINT DE SANTÉ, DE BOUT EN BOUT.
 *
 * Le dépôt mémoire rend « undefined » : la question n'a pas de sens sans base,
 * et le point se tait. On lui fait donc rendre un schéma pour mesurer les deux
 * cas qui comptent — tout est là, et il manque quelque chose.
 */
describe("le point « Schéma » de la page Santé", () => {
  it("se tait quand il n'a pas pu regarder", async () => {
    /* DEUX CAS, et ils se ressemblent : le dépôt mémoire, qui n'a pas de
       schéma, et une base où la fonction « objets_du_schema » n'est pas encore
       posée — c'est à dire exactement la situation que ce point existe pour
       voir. Annoncer « cinquante-huit tables manquantes » ferait un rouge
       permanent sur chaque machine de développement, et un rouge permanent ne
       se lit plus. */
    const { memoryRepository } = await import("@/lib/data/memory");
    expect(await memoryRepository.objetsDuSchema()).toBeUndefined();
    const { healthChecks } = await import("@/lib/health");
    const points = await healthChecks(new Date("2026-10-27T12:00:00.000Z"));
    expect(points.find((p) => p.key === "schema"), "le point parle alors qu'il n'a rien pu lire").toBeUndefined();
    // Non vacuité : les autres points sont bien là, donc la page a tourné.
    expect(points.length).toBeGreaterThan(8);
  });

  it("passe au vert quand la base porte tout ce que le dépôt déclare", async () => {
    schema.vu = { ...SCHEMA_ATTENDU, tables: [...SCHEMA_ATTENDU.tables, "une_table_de_supabase"] };
    const points = await avecSchema();
    const p = points.find((x) => x.key === "schema")!;
    expect(p, "le point a disparu").toBeTruthy();
    expect(p.level).toBe("ok");
    /* ET LE SURPLUS NE LE FAIT PAS CRIER : la base porte toujours plus que le
       dépôt, et le dire ferait un rouge permanent. */
    expect(p.detail).toMatch(/tout ce que le dépôt déclare est en base/);
  });

  it("passe au rouge et nomme ce qui manque", async () => {
    /* ROUGE ET NON ORANGE : le passage du soir envoie les rouges au desk par
       courriel, et c'est précisément ce qui aurait dû arriver le 23 octobre au
       lieu de quatre matins de silence. */
    schema.vu = {
      tables: SCHEMA_ATTENDU.tables.filter((t) => t !== "survey_lines" && t !== "relances"),
      colonnes: SCHEMA_ATTENDU.colonnes.filter((c) => c !== "intents.switch_by"),
      index: SCHEMA_ATTENDU.index,
      valeurs: SCHEMA_ATTENDU.valeurs,
    };
    const p = (await avecSchema()).find((x) => x.key === "schema")!;
    expect(p.level).toBe("crit");
    /* L'ÉCART EST NOMMÉ, et c'est la moitié du service : « une migration
       manque » envoie chercher laquelle, « survey_lines » dit quoi passer. */
    expect(p.detail).toContain("survey_lines");
    expect(p.detail).toContain("relances");
    expect(p.detail).toContain("intents.switch_by");
    expect(p.detail).toMatch(/les passer dans l'ordre/);
    expect(p.value).toMatch(/3 objet\(s\) manquant\(s\)/);
  });

  /** Le dépôt mémoire, avec un schéma prêté : c'est la seule pièce qui manque. */
  async function avecSchema() {
    vi.resetModules();
    vi.doMock("@/lib/data", async (vrai) => {
      const m = (await vrai()) as { repo: () => Record<string, unknown> };
      return { ...m, repo: () => ({ ...m.repo(), objetsDuSchema: async () => schema.vu }) };
    });
    const { healthChecks } = await import("@/lib/health");
    const points = await healthChecks(new Date("2026-10-27T12:00:00.000Z"));
    vi.doUnmock("@/lib/data");
    vi.resetModules();
    return points;
  }
});
