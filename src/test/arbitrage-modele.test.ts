import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ROBOTS } from "@/lib/domain/robots";

/**
 * LES TROIS MOITIÉS D'UNE MÊME RÈGLE, ET IL EN FAUT TROIS.
 *
 * « Les deux bornes sont obligatoires » se tient à trois endroits qui ne se
 * voient pas l'un l'autre :
 *
 *   1. LE DOMAINE la vérifie — `bornesManquantes` — et l'action du client
 *      l'appelle. C'est ce qu'un client rencontre.
 *   2. LA BASE la contraint. Trois chemins écrivent dans « intents » : l'action
 *      du client, le desk, les robots. Une règle tenue par un seul d'entre eux
 *      n'est pas tenue, et c'est la base qui tient les trois.
 *   3. LE ROBOT lui donne son EFFET. Sans lui, la date est un chiffre sur un
 *      formulaire : rien ne l'éteint, et le client lit « armé » pour toujours.
 *
 * CHACUNE PEUT PARTIR SEULE, ET SON DÉPART EST MUET. Retirer la contrainte SQL
 * ne casse aucun écran. Retirer le robot ne casse rien non plus — les paires
 * restent simplement armées, ce qui ressemble exactement à une maison qui
 * attend le bon jour. Cette feuille tient les trois ensemble parce qu'aucune
 * des trois ne se défend toute seule.
 */
const ROOT = resolve(__dirname, "../..");
const lire = (f: string) => readFileSync(join(ROOT, f), "utf8");

describe("le modèle de l'arbitrage", () => {
  it("porte les deux bornes dans le type ET dans une migration", () => {
    /* CLAUDE.md : « le modèle de données vit dans types.ts ET dans
       supabase/migrations — modifier les deux ensemble ». Une colonne absente
       de la base rend `undefined` à la lecture et perd l'écriture en silence :
       l'ordre part, l'arbitrage est armé à l'écran, et rien ne le borne. */
    /* DEUX FORMES, ET IL FAUT LES DEUX. Le modèle vit en « Intent » — ce
       qu'on relit — et en « NewIntentInput » — ce qu'on écrit. Une borne
       présente dans la première et absente de la seconde se perd à l'écriture
       sans que rien ne tombe : l'ordre part, l'écran affiche un arbitrage, et
       la colonne est vide. Vérifié en COMPTANT, parce qu'un `toMatch` sur le
       fichier entier est vert dès qu'une des deux formes la porte — relevé le
       26 octobre 2026 en vérifiant cette épreuve à l'envers. */
    const types = lire("src/lib/domain/types.ts");
    expect([...types.matchAll(/switchFloor\?: number;/g)].length, "« switchFloor » manque à l'une des deux formes du modèle : l'écriture ou la lecture le perdra").toBe(2);
    expect([...types.matchAll(/switchBy\?: string;/g)].length, "« switchBy » manque à l'une des deux formes du modèle").toBe(2);

    const migrations = readdirSync(join(ROOT, "supabase/migrations")).filter((f) => f.endsWith(".sql"));
    const sql = migrations.map((f) => lire(`supabase/migrations/${f}`)).join("\n");
    expect(sql, "aucune migration n'ajoute la colonne du plancher").toMatch(/add column if not exists switch_floor/);
    expect(sql, "aucune migration n'ajoute la colonne de la date").toMatch(/add column if not exists switch_by/);
  });

  it("rend les deux bornes obligatoires EN BASE, et pas seulement dans le code", () => {
    const sql = readdirSync(join(ROOT, "supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .map((f) => lire(`supabase/migrations/${f}`))
      .join("\n");
    /* La contrainte dit la règle entière : une ligne qui porte une arrivée
       porte les deux bornes, et le plancher est strictement positif — un
       plancher à zéro ne borne rien, et serait « facultatif » réécrit en
       chiffres. */
    /* LES COMMENTAIRES SONT RETIRÉS AVANT DE CHERCHER. Mettre « -- » devant
       la première ligne d'un `alter table` laisse la clause `check` intacte à
       la ligne suivante : l'épreuve restait verte sur une contrainte
       désarmée. Relevé en la vérifiant à l'envers le 26 octobre 2026. */
    const vif = sql.replace(/^\s*--.*$/gm, "");
    const check = /alter table intents add constraint intents_arbitrage_borne\s+check \(switch_to_offer is null or \(switch_floor is not null and switch_floor > 0 and switch_by is not null\)\)/;
    expect(vif, "la base n'impose plus les deux bornes : le desk et les robots peuvent écrire une paire sans fin").toMatch(check);
    /* Et les ordres d'avant doivent avoir été repris AVANT la contrainte,
       sinon la migration échoue sur une base vivante — ce qui ne se voit pas
       ici, où elle n'est jamais jouée. */
    const m = lire(`supabase/migrations/${readdirSync(join(ROOT, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort().reverse().find((f) => lire(`supabase/migrations/${f}`).includes("switch_floor"))!}`);
    expect(m.indexOf("update intents"), "la reprise des ordres d'avant a disparu").toBeGreaterThan(-1);
    expect(m.indexOf("update intents"), "la contrainte est posée AVANT la reprise : la migration échouera sur une base vivante").toBeLessThan(m.indexOf("add constraint intents_arbitrage_borne"));
  });

  it("donne au robot d'expiration une cadence et une tâche planifiée", () => {
    const robot = ROBOTS.find((r) => r.cle === "arbitrages");
    expect(robot, "le robot des arbitrages a quitté le tableau : son silence ne se verra plus depuis la page Santé").toBeTruthy();
    const crons = (JSON.parse(lire("vercel.json")) as { crons: { path: string; schedule: string }[] }).crons;
    const tache = crons.find((c) => c.path === "/api/cron/arbitrages");
    expect(tache, "la tâche planifiée a disparu de vercel.json : plus rien ne déclenche l'expiration").toBeTruthy();
    expect(tache!.schedule, "le tableau des robots et vercel.json ne disent plus la même cadence").toBe(robot!.cron);
    /* APRÈS LA SÉANCE, ET NON LE MATIN. Une paire dont la date tombe
       aujourd'hui doit avoir eu sa dernière chance avant qu'on l'éteigne, et
       cette chance est la séance du jour. L'éteindre à l'aube la priverait
       d'un jour entier que le client avait signé. */
    const heure = Number(robot!.cron.split(" ")[1]);
    expect(heure, "le robot passe avant la clôture de la séance : il éteindrait des paires qui avaient encore leur journée").toBeGreaterThanOrEqual(18);
  });

  it("et le robot clôt vraiment, avec le motif que le client lit", () => {
    /* Non vacuité des trois lignes ci-dessus : un robot inscrit au tableau et
       branché à une tâche peut parfaitement ne rien faire. Celui-ci doit
       clore, et le faire avec un motif — un ordre clos sans motif laisse le
       client devant « Annulée » et rien d'autre. */
    const tour = lire("src/lib/arbitrage/tour.ts");
    expect(tour, "le tour ne clôt plus rien").toMatch(/setIntentState\(i\.id, "annulee", motif\)/);
    expect(tour, "le motif ne dit plus que la position est intacte").toMatch(/position est intacte/);
    expect(tour, "le motif ne dit plus que c'est la protection qui a joué").toMatch(/protection qui a joué/);
  });
});
