import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { echeanceDuJour } from "@/lib/domain/prelevement";
import type { MandatPrelevement } from "@/lib/domain/mandat";

/**
 * CE QUE LA PREMIÈRE TRAVERSÉE DE L'ÉCRAN A TROUVÉ, le 10 octobre 2026.
 *
 * La moitié desk des prélèvements avait ses règles sous cliquet et n'avait
 * jamais été parcourue. En la traversant pour de bon, deux trous :
 *
 *   1. UNE SECONDE PRÉSENTATION N'ÉTAIT JAMAIS PRÉSENTÉE. Elle naît d'un
 *      rejet, quinze jours plus tard, un jour qui n'est celui d'aucun mandat.
 *      La page et l'action ne regardaient que les mandats du jour : la ligne
 *      n'apparaissait pas, « Préparer » refusait, « Remettre » comptait zéro,
 *      et le tirage restait « préparé » pour toujours. La promesse faite au
 *      client (« nous le représenterons une fois ») ne pouvait pas être tenue.
 *
 *   2. UN TIRAGE ARRIVÉ APRÈS LE DÉPART DU FICHIER se comptait comme prêt sur
 *      un bouton désactivé, sans un mot. Le desk clique, et rien.
 */
const PAGE = "src/app/desk/prelevements/page.tsx";
const ACTIONS = "src/app/desk/prelevements/actions.ts";
const lire = (f: string) => readFileSync(f, "utf8");

const mandat = (p: Partial<MandatPrelevement> = {}): MandatPrelevement => ({
  id: "m1",
  ref: "MP-0001",
  userId: "u1",
  objet: "provision",
  bankName: "Banque d'essai",
  bankAccount: "CM21 00000 00000 00000000000 00",
  accountHolder: "Client d'essai",
  maxAmount: 100_000,
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
    /* C'est juste, et c'est la cause du trou : la seconde présentation du 25
       n'est pas une échéance du calendrier, c'est un tirage qui existe déjà. */
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
    expect(src).toMatch(/repasse: x\.retryOf \? "rejet" : "prepare"/);
    expect(lire("src/app/desk/prelevements/Echeance.tsx")).toMatch(/t\("seconde présentation, après un rejet"\)/);
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

describe("préparer annonce aussi les secondes présentations", () => {
  it("l'action ne se limite plus aux mandats du jour", () => {
    const src = lire(ACTIONS);
    expect(src).toMatch(/const aAnnoncer = \[/);
    expect(src).toMatch(/for \(const \{ mandat, amount \} of aAnnoncer\)/);
    // Le refus « aucun mandat ne se présente » ne tombe plus sur un tirage qui attend.
    expect(src).toMatch(/if \(!aAnnoncer\.length\) return \{ ok: false/);
    expect(src).not.toMatch(/if \(!aTirer\.length\) return \{ ok: false/);
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
