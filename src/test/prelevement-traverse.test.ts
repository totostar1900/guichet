import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { echeanceDuJour } from "@/lib/domain/prelevement";
import type { MandatPrelevement } from "@/lib/domain/mandat";

/**
 * CE QUE LA TRAVERSÉE DE L'ÉCRAN DU DESK A TROUVÉ, le 10 octobre 2026 — et ce
 * qu'il en reste depuis que la seconde présentation n'existe plus.
 *
 * La moitié desk des prélèvements avait ses règles sous cliquet et n'avait
 * jamais été parcourue. En la traversant pour de bon, deux trous :
 *
 *   1. UN TIRAGE QUI N'EST PAS D'UNE ÉCHÉANCE DU JOUR n'était jamais présenté.
 *      Le cas d'alors était la seconde présentation d'un rejet, quinze jours
 *      plus tard, un jour qui n'était celui d'aucun mandat : la page et
 *      l'action ne regardaient que les mandats du jour, la ligne
 *      n'apparaissait pas, « Préparer » refusait, « Remettre » comptait zéro,
 *      et le tirage restait « préparé » pour toujours.
 *
 *      LA SECONDE PRÉSENTATION EST PARTIE LE 25 OCTOBRE 2026 : un mois refusé
 *      est sauté, parce que représenter dans le mois coûte au client une
 *      seconde ponction d'incident pour le même mois. Le cas qui demeure est
 *      celui d'un tirage préparé dont le préavis n'est pas parti, qu'un canal
 *      réparé fait partir le lendemain — et c'est lui que ces épreuves gardent,
 *      puisque c'était le vrai service rendu.
 *
 *   2. UN TIRAGE ARRIVÉ APRÈS LE DÉPART DU FICHIER se comptait comme prêt sur
 *      un bouton désactivé, sans un mot. Le desk clique, et rien.
 */
const PAGE = "src/app/desk/prelevements/page.tsx";
const ACTIONS = "src/app/desk/prelevements/actions.ts";
const lire = (f: string) => readFileSync(f, "utf8");
/* LE CODE, PAS CE QU'ON EN DIT : un commentaire qui EXPLIQUE la disparition
   d'une phrase contient cette phrase, et une garde naïve s'y accroche. Relevé
   sur cette épreuve même, le 25 octobre 2026. */
const code = (f: string) =>
  lire(f)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const mandat = (p: Partial<MandatPrelevement> = {}): MandatPrelevement => ({
  id: "m1",
  ref: "MP-0001",
  userId: "u1",
  objet: "provision",
  bankName: "Banque d'essai",
  bankAccount: "CM21 00000 00000 00000000000 00",
  accountHolder: "Client d'essai",
  dayOfMonth: 10,
  amount: 50_000,
  state: "actif",
  signedAt: "2026-10-01T08:00:00.000Z",
  pendingCodeTries: 0,
  rejects: 0,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z",
  ...p,
});

describe("le calendrier ne connaît que les mandats, et c'est pour cela qu'il faut l'aider", () => {
  it("un mandat du 10 ne se présente pas le 25", () => {
    /* C'est juste, et c'était la cause du trou : un tirage qui existe déjà, à
       une date qu'aucun mandat ne porte, n'est pas une échéance du calendrier.
       La règle vaut toujours ; seul le cas qui la rencontrait a changé. */
    expect(echeanceDuJour([mandat()], [], "2026-10-10").aTirer).toHaveLength(1);
    expect(echeanceDuJour([mandat()], [], "2026-10-25").aTirer).toHaveLength(0);
  });
});

describe("la page montre les tirages du jour, pas seulement les mandats du jour", () => {
  it("elle ajoute les tirages déjà préparés pour ce jour-là", () => {
    const src = lire(PAGE);
    expect(src).toMatch(/const repasses = duJour\.filter\(\(x\) => x\.state === "prepare"/);
    /* Le serveur nomme le cas, le client écrit la phrase : une phrase bâtie
       dans la page sortirait en français dans la version anglaise, et le
       scanner de clefs ne la verrait pas (deuxième angle mort). */
    expect(src).toMatch(/repasse: "prepare"/);
    expect(lire("src/app/desk/prelevements/Echeance.tsx")).toMatch(/t\("tirage déjà préparé"\)/);
    /* ET LA SECONDE PRÉSENTATION NE REVIENT PAS : ni le cas, ni sa phrase.
       Une ligne « seconde présentation, après un rejet » sur un écran où plus
       rien ne se représente est pire qu'absente. */
    expect(code("src/app/desk/prelevements/Echeance.tsx"), "la phrase de la seconde présentation est revenue").not.toMatch(/seconde présentation/);
    expect(code(ACTIONS) + code(PAGE), "le tirage porte de nouveau un lien vers celui qu'il rejoue").not.toMatch(/retryOf/);
  });

  it("et elle s'ouvre d'elle-même sur un jour qui n'a qu'une seconde présentation", () => {
    // Sans cela il fallait connaître la date et la taper dans l'adresse.
    expect(lire(PAGE)).toMatch(/const attend = tirages\.some\(\(x\) => x\.dueOn === d && x\.state === "prepare"\)/);
  });

  it("un tirage arrivé après le départ du fichier sort du compte, et se dit", () => {
    const src = lire(PAGE);
    expect(src).toMatch(/const arrivesApres = partie \? prets\.filter\(\(x\) => x\.remiseId !== partie\.id\) : \[\]/);
    expect(src).toMatch(/const remettable = prets\.length - arrivesApres\.length/);
    expect(lire("src/app/desk/prelevements/Echeance.tsx")).toMatch(/arrivés après son départ/);
  });
});

/**
 * PRÉPARER REPART DES SEULS MANDATS DU JOUR, et c'est redevenu juste.
 *
 * L'action avait été élargie pour rattraper les secondes présentations, qui
 * tombaient un jour sans mandat. Elles n'existent plus : toute échéance est
 * celle d'un mandat, et un tirage déjà préparé se retrouve par le sien. Ce qui
 * devait survivre à ce retour en arrière, c'est le RENVOI D'UN PRÉAVIS qui
 * n'est pas parti — le lendemain d'un canal réparé.
 */
describe("préparer annonce l'échéance, et renvoie ce qui n'est pas parti", () => {
  it("repart des mandats du jour, et retrouve le tirage déjà préparé", () => {
    const src = lire(ACTIONS);
    expect(src, "l'action élargit encore la liste pour des présentations qui n'existent plus").not.toMatch(/const aAnnoncer = \[/);
    expect(src).toMatch(/for \(const \{ mandat, amount \} of aTirer\)/);
    expect(src).toMatch(/if \(!aTirer\.length\) return \{ ok: false/);
    /* LE RENVOI DU PRÉAVIS RESTE : sans lui, un canal cassé le jour de
       l'échéance condamne le mois entier sans que personne ne le sache. */
    expect(src, "un préavis non parti ne se renvoie plus").toMatch(/if \(t\.state !== "prepare" \|\| t\.noticeSent\) continue;/);
    expect(src, "le tirage déjà préparé ne se retrouve plus par son mandat").toMatch(/const parMandat = new Map\(deja\.map/);
  });
});

describe("le mode démonstration des envois", () => {
  it("n'existe que derrière une variable, et ne change rien sans elle", () => {
    /* Sans fournisseur, un préavis ne part pas, et la remise reste bloquée :
       l'écran n'était pas parcourable en local, et c'est ainsi qu'il est resté
       des semaines sans que personne ne le voie fonctionner. */
    const src = lire("src/lib/notify/dispatch.ts");
    expect(src).toMatch(/process\.env\.NOTIFY_DEMO === "1"/);
    expect(src).toMatch(/providerId: `demo-\$\{t\.channel\}`/);
    // La ligne « skipped » reste la réponse normale quand la variable n'est pas posée.
    expect(src).toMatch(/if \(!configured\) return r\.updateNotification\(row\.id, \{ status: "skipped"/);
  });
});
