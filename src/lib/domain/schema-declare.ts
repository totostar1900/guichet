/**
 * CE QUE LES MIGRATIONS DÉCLARENT, LU DANS LES MIGRATIONS.
 *
 * RELEVÉ LE 27 OCTOBRE 2026, et il a coûté. Sept migrations sont restées non
 * appliquées pendant des jours pendant que le code qui en dépendait tournait en
 * production, et les trois conséquences ne se lisaient pas au même endroit :
 *
 *   LES RELANCES criaient dans les journaux de Vercel — que personne n'ouvre
 *   tous les matins — et leur robot échouait depuis quatre jours.
 *
 *   L'ARBITRAGE ET LE SONDAGE ne criaient PAS. Leurs tables et leurs colonnes
 *   manquaient, les robots levaient au premier appel, l'enveloppe inscrivait
 *   l'échec, et la page Santé montrait des robots en bonne santé puisqu'ils
 *   avaient bien tourné. La borne qu'un client signe ne jouait pas, et rien
 *   nulle part ne disait pourquoi.
 *
 * Douze contrôles veillaient sur la donnée de marché ; aucun ne regardait la
 * base elle-même. La panne la plus confortable de la maison vivait dans l'outil
 * qui sert à les traquer.
 *
 * ─── POURQUOI LIRE LE SCHÉMA, ET NON LE REGISTRE DE SUPABASE ───────────────
 *
 * `supabase_migrations.schema_migrations` ne fait pas foi : les premières
 * migrations ont été passées à la main et n'y figurent pas, et les noms
 * enregistrés divergent de ceux du dépôt. Un contrôle qui le lirait annoncerait
 * cinquante migrations manquantes qui sont toutes en place. On vérifie donc ce
 * que les migrations DÉCLARENT contre ce que la base PORTE.
 *
 * ─── CE QU'ON NE LIT PAS, ET C'EST VOULU ───────────────────────────────────
 *
 * LES COLONNES DÉCLARÉES DANS UN CORPS DE « create table ». Elles viennent avec
 * leur table : si la table est là, elles sont là. Les analyser serait la part
 * la plus fragile du travail — cent quarante déclarations, des types composés,
 * des contraintes en ligne — pour une information qu'on a déjà. Ne restent donc
 * que les colonnes AJOUTÉES par un « alter table », qui sont précisément celles
 * qui manquaient (`switch_floor`, `switch_by`).
 *
 * LES POLITIQUES, LES FONCTIONS, LES COMMENTAIRES. Une politique absente ne
 * casse pas une lecture par le rôle de service, qui est celui du serveur ; une
 * fonction absente lève un message clair et nommé. Ce contrôle vise la panne
 * MUETTE, pas l'exhaustivité.
 *
 * ─── CE QU'IL NE SAIT PAS COMPRENDRE SE DIT ────────────────────────────────
 *
 * Un analyseur qui rate une déclaration rend un contrôle vide sans le dire, ce
 * qui serait exactement la panne qu'on ferme. Les lignes qui ressemblent à une
 * déclaration sans être comprises sont donc RENDUES, et un cliquet exige
 * qu'elles restent à zéro sur le dépôt.
 */

export interface SchemaDeclare {
  /** Les tables, sans leur schéma : « relances », « survey_lines ». */
  tables: string[];
  /** Les colonnes ajoutées après coup, « table.colonne ». */
  colonnes: string[];
  /** Les index nommés. */
  index: string[];
  /** Les valeurs d'énumération, « type.valeur ». */
  valeurs: string[];
  /** Ce qui ressemble à une déclaration et n'a pas été compris, avec sa ligne. */
  incompris: string[];
}

/** Le schéma est retiré du nom : la base ne porte que « public ». */
const nu = (s: string): string => s.replace(/^public\./i, "").replace(/"/g, "").toLowerCase();

/**
 * Lit une suite de migrations, DANS L'ORDRE, et rend ce qu'elles laissent.
 *
 * L'ordre compte parce qu'une migration peut défaire ce qu'une précédente a
 * posé : 0115 supprime deux colonnes que 0074 avait créées. Un relevé qui
 * additionnerait les créations sans soustraire les suppressions annoncerait à
 * jamais deux colonnes manquantes qui ont été retirées exprès.
 */
export function declarePar(fichiers: { nom: string; sql: string }[]): SchemaDeclare {
  const tables = new Set<string>();
  const colonnes = new Set<string>();
  const index = new Set<string>();
  const valeurs = new Set<string>();
  const incompris: string[] = [];

  for (const f of fichiers) {
    /* Les commentaires partent d'abord : plusieurs portent des mots comme
       « create table » dans une phrase, et les compter ferait chercher en base
       une table qui n'a jamais existé. */
    const sansCommentaires = f.sql
      .split("\n")
      .map((l) => l.replace(/--.*$/, ""))
      .join("\n");
    /* UNE ÉNUMÉRATION PEUT S'ÉTALER, et une seule le fait au dépôt. Replier sa
       parenthèse sur une ligne coûte trois lignes ici et évite de tolérer un
       « incompris » permanent — or un relevé qui s'habitue à un reste ne
       remarque plus le deuxième. */
    const sql = sansCommentaires.replace(/(create\s+type\s+[\w."]+\s+as\s+enum\s*\()([^)]*)\)/gi, (_m, tete: string, corps: string) => `${tete}${corps.replace(/\s*\n\s*/g, " ")})`);
    /** La dernière table nommée par un « alter table » : un « add column » peut vivre dix lignes plus bas. */
    let courante: string | undefined;

    for (const brute of sql.split("\n")) {
      const l = brute.trim();
      if (!l) continue;

      const table = /^create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)/i.exec(l);
      if (table) {
        tables.add(nu(table[1]));
        continue;
      }

      const alter = /^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w."]+)/i.exec(l);
      if (alter) courante = nu(alter[1]);

      /* « add column » et « drop column » se lisent sur la même ligne que leur
         « alter table » ou dix lignes plus bas : les deux formes existent au
         dépôt, et les chercher partout sur la ligne les prend toutes les deux. */
      for (const m of l.matchAll(/\badd\s+column\s+(?:if\s+not\s+exists\s+)?([\w"]+)/gi)) {
        if (courante) colonnes.add(`${courante}.${nu(m[1])}`);
        else incompris.push(`${f.nom} : « add column » sans table · ${l.slice(0, 80)}`);
      }
      for (const m of l.matchAll(/\bdrop\s+column\s+(?:if\s+exists\s+)?([\w"]+)/gi)) {
        if (courante) colonnes.delete(`${courante}.${nu(m[1])}`);
        else incompris.push(`${f.nom} : « drop column » sans table · ${l.slice(0, 80)}`);
      }

      /* LA FORME SANS NOM SE TESTE D'ABORD, et l'ordre n'est pas un détail :
         « create index on intents (...) » passait l'expression nommée, qui
         capturait « on » comme nom d'index. Le relevé portait alors un index
         fantôme que la base n'aurait jamais — un rouge permanent — et la ligne
         ne se disait pas incomprise. Trouvé par l'épreuve. */
      if (/^create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?on\b/i.test(l)) {
        incompris.push(`${f.nom} : index sans nom · ${l.slice(0, 80)}`);
        continue;
      }
      const idx = /^create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?([\w."]+)/i.exec(l);
      if (idx) {
        index.add(nu(idx[1]));
        continue;
      }

      /* Un type énuméré et ses valeurs : la liste tient sur une ligne au dépôt,
         et une liste étalée sur plusieurs se dirait « incomprise » plutôt que
         de se perdre. */
      const enumere = /^create\s+type\s+([\w."]+)\s+as\s+enum\s*\(([^)]*)\)?/i.exec(l);
      if (enumere) {
        const t = nu(enumere[1]);
        const brutes = [...enumere[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
        if (!brutes.length || !/\)/.test(l)) incompris.push(`${f.nom} : énumération « ${t} » sur plusieurs lignes · ${l.slice(0, 80)}`);
        for (const v of brutes) valeurs.add(`${t}.${v}`);
        continue;
      }
      const ajout = /^alter\s+type\s+([\w."]+)\s+add\s+value\s+(?:if\s+not\s+exists\s+)?'([^']+)'/i.exec(l);
      if (ajout) {
        valeurs.add(`${nu(ajout[1])}.${ajout[2]}`);
        continue;
      }
      if (/^alter\s+type\b/i.test(l) && !ajout) incompris.push(`${f.nom} : « alter type » non compris · ${l.slice(0, 80)}`);

      /* Une table ou un index qui disparaît : aucun au dépôt aujourd'hui, et
         s'il en venait un, il doit sortir du relevé plutôt que d'y rester. */
      const dropTable = /^drop\s+table\s+(?:if\s+exists\s+)?([\w."]+)/i.exec(l);
      if (dropTable) tables.delete(nu(dropTable[1]));
      const dropIndex = /^drop\s+index\s+(?:if\s+exists\s+)?([\w."]+)/i.exec(l);
      if (dropIndex) index.delete(nu(dropIndex[1]));
    }
  }

  const trie = (s: Set<string>) => [...s].sort();
  return { tables: trie(tables), colonnes: trie(colonnes), index: trie(index), valeurs: trie(valeurs), incompris };
}

/** Ce que la base porte réellement, rendu par la fonction `objets_du_schema`. */
export interface SchemaVu {
  tables: string[];
  colonnes: string[];
  index: string[];
  valeurs: string[];
}

export interface EcartDeSchema {
  tables: string[];
  colonnes: string[];
  index: string[];
  valeurs: string[];
}

/**
 * Ce que les migrations déclarent et que la base ne porte pas.
 *
 * DANS CE SENS SEULEMENT. L'inverse — la base porte plus que le dépôt — est
 * normal et abondant : les tables de Supabase, celles d'avant le suivi des
 * migrations, et tout ce qu'un outil ajoute à côté. Le crier ferait un point
 * rouge permanent, et un point rouge permanent ne se lit plus.
 */
export function ecartDeSchema(declare: SchemaDeclare, vu: SchemaVu): EcartDeSchema {
  const manque = (attendus: string[], presents: string[]): string[] => {
    const la = new Set(presents.map((x) => x.toLowerCase()));
    return attendus.filter((x) => !la.has(x.toLowerCase()));
  };
  return {
    tables: manque(declare.tables, vu.tables),
    /* Une colonne d'une table absente ne se compte pas deux fois : la table
       manquante dit déjà tout, et nommer ses douze colonnes à côté noierait le
       point sous sa propre conséquence. */
    colonnes: manque(declare.colonnes, vu.colonnes).filter((c) => !manque(declare.tables, vu.tables).includes(c.split(".")[0])),
    index: manque(declare.index, vu.index),
    valeurs: manque(declare.valeurs, vu.valeurs),
  };
}

/** Combien d'objets manquent, tous genres confondus. */
export const compteDeLEcart = (e: EcartDeSchema): number => e.tables.length + e.colonnes.length + e.index.length + e.valeurs.length;
