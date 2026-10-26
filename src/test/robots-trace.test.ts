import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RACINE } from "./racine";

/**
 * AUCUN ROBOT NE DÉCIDE SUR LE DOSSIER D'UN CLIENT SANS LAISSER DE TRACE.
 *
 * RELEVÉ À LA REVUE DES ROBOTS du 26 octobre 2026 : sur dix-sept robots, ZÉRO
 * n'appelait `audit()`. Quatre écrivaient de l'état métier — l'épargne crée un
 * ordre, le confirme et déplace de l'argent ; le bulletin retire une ligne de
 * la vente ; l'arbitrage annule l'ordre d'un client ; le sondage clôt son
 * attente — et chacune de ces quatre écritures est AUDITÉE quand c'est une main
 * qui la fait.
 *
 * LE MÊME ÉVÉNEMENT TRACÉ PAR UNE PORTE ET PAS PAR L'AUTRE : c'est la pire des
 * deux situations, parce que le registre paraît complet. Un desk qui filtre
 * « intent.transition » voit les annulations du desk et pas celles du robot, et
 * rien dans ce qu'il lit ne le lui dit.
 *
 * LE FIL DU DESK N'EST PAS UNE TRACE, et c'est l'erreur qui a laissé passer
 * ça : les quatre robots écrivaient une phrase au fil, ce qui donnait
 * l'impression du devoir fait. Le fil se purge, il ne se chaîne pas, et il ne
 * dit ni l'avant ni l'après. Ce n'est pas le registre qu'on ouvre quand un
 * client conteste.
 *
 * ─── CE QUE CE RELEVÉ VOIT, ET CE QU'IL NE VOIT PAS ────────────────────────
 *
 * Il lit les routes des robots ET les modules qu'elles importent au premier
 * niveau, parce que c'est là que vivaient trois des quatre écritures. Un
 * module importé au SECOND niveau lui échapperait : la limite est dite ici
 * plutôt que supposée, et un robot qui enterrerait son écriture deux étages
 * plus bas passerait au vert. C'est le prix d'un relevé de source, et il est
 * plus petit que celui de n'en avoir aucun.
 *
 * Il ne voit pas non plus une BRANCHE sans trace dans un fichier qui en porte
 * ailleurs — même limite que le relevé du desk, et même réponse : les épreuves
 * de comportement de chaque robot tiennent les branches.
 */

/**
 * Les écritures qui décident sur le dossier d'un client, et que la porte
 * humaine audite déjà.
 *
 * TROIS ÉCRITURES EN SONT ABSENTES, pour des raisons écrites :
 *
 *   `cloturerPreavis` — une occurrence de préavis est la comptabilité interne
 *   du robot, et son état suit le geste qui, lui, est audité. L'auditer à part
 *   ferait deux lignes pour une décision.
 *
 *   `purgerGestes` — le robot de la purge rend son compte dans le DÉTAIL de son
 *   tour, qui est inscrit par l'enveloppe : il est tracé par construction, et
 *   c'est le seul dont le compte rendu EST la trace.
 *
 *   `updateIntent` — le robot de l'épargne s'en sert pour confirmer et couvrir
 *   l'ordre qu'il vient de créer : c'est la même décision que `createIntent`,
 *   déjà nommée dans l'après de sa ligne.
 */
const DECISIONS = ["addCash", "createIntent", "setIntentState", "updateStandingOrder", "upsertOffer", "updateLigneSondee", "createLigneSondee"];

/** Les modules de `src/lib` qu'un fichier importe, résolus en chemins. */
function importes(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/from "@\/(lib\/[\w./-]+)"/g)) {
    for (const p of [`${RACINE}/src/${m[1]}.ts`, `${RACINE}/src/${m[1]}/index.ts`]) if (existsSync(p)) out.push(p);
  }
  return out;
}

describe("la trace des robots", () => {
  const R = `${RACINE}/src/app/api/cron/`;
  const robots = readdirSync(R).filter((d) => existsSync(`${R}${d}/route.ts`));

  it("tout fichier de robot qui décide sur un dossier client laisse une ligne au registre", () => {
    const fautifs: string[] = [];
    const vus = new Set<string>();
    for (const d of robots) {
      const route = `${R}${d}/route.ts`;
      for (const f of [route, ...importes(readFileSync(route, "utf8"))]) {
        if (vus.has(f)) continue;
        vus.add(f);
        const s = readFileSync(f, "utf8");
        const ecrit = DECISIONS.filter((x) => new RegExp(`\\b(r|repo\\(\\))\\.${x}\\(`).test(s));
        /* « await audit( » et non « audit( » : `void 0 && audit(...)` satisfait
           une recherche de texte sans rien inscrire, et c'est exactement par là
           qu'un cliquet de source se fait avoir. */
        if (ecrit.length && !/await audit\(/.test(s)) fautifs.push(`${d} → ${f.slice(RACINE.length + 5)} : ${ecrit.join(", ")} sans trace`);
      }
    }
    expect(fautifs, "un robot décide sur le dossier d'un client et ne laisse rien au registre").toEqual([]);
  });

  it("et le relevé voit bien quelque chose", () => {
    /* NON VACUITÉ, en trois points. Sans eux, un `DECISIONS` vidé, un dossier
       de routes renommé ou un résolveur d'imports cassé passeraient au vert
       sans rien regarder — la panne la plus confortable d'un cliquet de
       source. */
    expect(robots.length).toBeGreaterThanOrEqual(16);
    expect(DECISIONS.length).toBeGreaterThanOrEqual(7);

    // Les quatre robots du relevé écrivent, et sont donc réellement examinés.
    const examines = new Map<string, string[]>();
    for (const d of robots) {
      const route = `${R}${d}/route.ts`;
      const fichiers = [route, ...importes(readFileSync(route, "utf8"))];
      const ecrivent = fichiers.filter((f) => DECISIONS.some((x) => new RegExp(`\\b(r|repo\\(\\))\\.${x}\\(`).test(readFileSync(f, "utf8"))));
      if (ecrivent.length) examines.set(d, ecrivent);
    }
    for (const d of ["epargne", "boc", "arbitrages", "sondage"]) expect([...examines.keys()], `${d} n'est plus vu comme écrivant : le relevé ne le regarde plus`).toContain(d);
    /* Et l'un d'eux écrit AILLEURS que dans sa route : c'est ce que la lecture
       des imports apporte, et sans cela elle pourrait être cassée sans que rien
       ne le dise. */
    expect(examines.get("arbitrages")!.some((f) => !f.endsWith("/route.ts")), "la lecture des imports ne rapporte plus rien").toBe(true);
  });

  it("chaque robot qui écrit nomme sa main, et ne la laisse pas à « système »", () => {
    /* « système » couvrirait aussi bien un webhook qu'un script de reprise. Et
       le danger est pire que le flou : `audit()` reprend la session quand il y
       en a une, donc une ligne sans acteur explicite porte l'e-mail de la
       personne connectée — le registre accuserait quelqu'un d'un geste qu'un
       robot a fait. */
    const fautifs: string[] = [];
    const vus = new Set<string>();
    for (const d of robots) {
      const route = `${R}${d}/route.ts`;
      for (const f of [route, ...importes(readFileSync(route, "utf8"))]) {
        if (vus.has(f)) continue;
        vus.add(f);
        const s = readFileSync(f, "utf8");
        if (!/await audit\(/.test(s)) continue;
        if (!/actor: ROBOT/.test(s)) fautifs.push(`${f.slice(RACINE.length + 5)} : inscrit sans nommer le robot`);
        if (!/const ROBOT = "robot /.test(s)) fautifs.push(`${f.slice(RACINE.length + 5)} : le nom du robot n'est pas déclaré`);
      }
    }
    expect(fautifs).toEqual([]);
    // Non vacuité : des fichiers de robot inscrivent bel et bien.
    expect([...vus].filter((f) => /await audit\(/.test(readFileSync(f, "utf8"))).length).toBeGreaterThanOrEqual(4);
  });
});
