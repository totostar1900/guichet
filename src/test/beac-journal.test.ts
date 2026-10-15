import { describe, expect, it } from "vitest";
import { empreinteDe, journaliser, type DernierEtat } from "@/lib/market/beac-journal";
import type { BeacAuction } from "@/lib/market/beac";

/**
 * LE JOURNAL DES ANNONCES DE LA BEAC.
 *
 * La page ne montre que l'état courant. Une séance programmée puis annulée ne
 * laisse aucune trace ailleurs, et c'est la seule matière de ce chantier qui
 * se perd en temps réel. Le journal est donc en ajout seul, et ces tests
 * gardent les trois décisions qui le rendent utilisable.
 */

const seance = (url: string, p: Partial<BeacAuction> = {}): BeacAuction =>
  ({
    doc: { url, title: `Avis d'adjudication ${url}`, country: "Cameroun", year: "2026" },
    kind: "annonce",
    instrument: "BTA",
    tenor: "26 semaines",
    on: "2026-11-05",
    abondement: false,
    country: "Cameroun",
    ...p,
  }) as BeacAuction;

const connu = (a: BeacAuction, present = true): DernierEtat => ({ url: a.doc.url, present, empreinte: empreinteDe(a) });

describe("le journal des annonces BEAC", () => {
  it("écrit ce qui apparaît", () => {
    const v = journaliser([seance("/a"), seance("/b")], [], true);
    expect(v.ajouts).toBe(2);
    expect(v.aEcrire.map((o) => o.url)).toEqual(["/a", "/b"]);
    expect(v.aEcrire.every((o) => o.present)).toBe(true);
  });

  it("n'écrit RIEN quand rien ne change", () => {
    /* À mille documents et vingt-quatre lectures par jour, écrire chaque tour
       ferait huit millions de lignes par an pour dire que rien ne bouge. */
    const a = seance("/a");
    const v = journaliser([a], [connu(a)], true);
    expect(v.aEcrire).toEqual([]);
    expect(v.inchanges).toBe(1);
  });

  it("écrit une révision quand la date de séance bouge", () => {
    const avant = seance("/a", { on: "2026-11-05" });
    const apres = seance("/a", { on: "2026-11-12" });
    const v = journaliser([apres], [connu(avant)], true);
    expect(v.revisions).toBe(1);
    expect(v.aEcrire[0].seance).toBe("2026-11-12");
  });

  it("écrit une disparition quand un document quitte la page", () => {
    /* Le signal le plus net qu'un Trésor perd l'accès au marché, et
       aujourd'hui totalement invisible. */
    const a = seance("/a");
    const v = journaliser([], [connu(a)], true);
    expect(v.disparitions).toBe(1);
    expect(v.aEcrire[0]).toMatchObject({ url: "/a", present: false });
  });

  it("ne répète pas une disparition déjà écrite", () => {
    /* Sans cela, une adjudication absente depuis six mois ferait une ligne de
       plus à chaque tour, et le journal dirait cent fois la même annulation. */
    const a = seance("/a");
    expect(journaliser([], [connu(a, false)], true).aEcrire).toEqual([]);
  });

  it("écrit le retour d'un document disparu, qui est un fait à dater", () => {
    const a = seance("/a");
    const v = journaliser([a], [connu(a, false)], true);
    expect(v.revisions).toBe(1);
    expect(v.aEcrire[0].present).toBe(true);
  });

  it("N'ÉCRIT RIEN SUR UNE LECTURE RATÉE, et c'est le garde qui compte", () => {
    /* Le danger du lot. Une page injoignable, prise pour une page vide,
       écrirait une annulation sur CHAQUE adjudication du calendrier, d'un
       seul coup. Le journal refuse donc d'écrire sans la confirmation que la
       lecture a réussi, et le robot ne l'atteint qu'après deux refus. */
    const v = journaliser([], [connu(seance("/a")), connu(seance("/b")), connu(seance("/c"))], false);
    expect(v.aEcrire).toEqual([]);
    expect(v.disparitions).toBe(0);
  });

  it("ignore un remaniement du titre, qui ne change rien à la séance", () => {
    /* La BEAC écrit « République du Tchad » et « République Tchad » sur deux
       communiqués voisins. Une empreinte prise sur le titre écrirait une
       révision à chaque coquille, et le journal se remplirait de faux
       mouvements. */
    const avant = seance("/a");
    const apres = seance("/a");
    apres.doc.title = "Avis d'adjudication des BTA - République Tchad";
    expect(journaliser([apres], [connu(avant)], true).aEcrire).toEqual([]);
  });

  it("distingue un abondement d'une émission neuve", () => {
    const avant = seance("/a", { abondement: false });
    const apres = seance("/a", { abondement: true });
    expect(journaliser([apres], [connu(avant)], true).revisions).toBe(1);
  });
});

/**
 * UN ROBOT NE DÉCLARE DISPARU QUE CE QU'IL SURVEILLE.
 *
 * Mesuré le 15 octobre 2026. Le journal a été élargi aux quatre pages de
 * statistiques de la BEAC sans que le robot, qui ne lit que la page des
 * annonces, en sache rien. À son passage suivant il a trouvé 345 pièces
 * « manquantes » de SA page et les a toutes déclarées disparues, titre vidé.
 * Elles n'avaient jamais quitté le site.
 */
describe("le périmètre d'un robot", () => {
  const doc = (url: string, title: string) => ({ url, title, country: "Cameroun", year: "2026" });
  const vue = (url: string, title: string): BeacAuction => ({
    doc: doc(url, title),
    kind: "annonce",
    instrument: "BTA",
    tenor: "26 semaines",
    on: "2026-10-20",
    abondement: false,
    country: "Cameroun",
  });

  it("NE TOUCHE PAS AUX PIÈCES D'UNE AUTRE PAGE", () => {
    const connus = [
      { url: "https://b/a.pdf", present: true, empreinte: "x", page: "annonces" },
      { url: "https://b/courbe.pdf", present: true, empreinte: "y", page: "statistiques" },
    ];
    const v = journaliser([vue("https://b/a.pdf", "Communiqué d'annonce")], connus, true, "annonces");
    expect(v.disparitions).toBe(0);
    expect(v.aEcrire.some((o) => o.url.includes("courbe"))).toBe(false);
  });

  it("déclare bien disparue une pièce de SA page qui a quitté la liste", () => {
    const connus = [
      { url: "https://b/a.pdf", present: true, empreinte: "x", page: "annonces" },
      { url: "https://b/partie.pdf", present: true, empreinte: "z", page: "annonces" },
    ];
    const v = journaliser([vue("https://b/a.pdf", "Communiqué d'annonce")], connus, true, "annonces");
    expect(v.disparitions).toBe(1);
    expect(v.aEcrire.find((o) => !o.present)?.url).toBe("https://b/partie.pdf");
  });

  it("marque chaque écriture de sa page", () => {
    const v = journaliser([vue("https://b/n.pdf", "Communiqué d'annonce")], [], true, "statistiques");
    expect(v.aEcrire[0].page).toBe("statistiques");
  });

  it("traite une ligne sans page comme venant des annonces, qui est l'historique", () => {
    const connus = [{ url: "https://b/vieille.pdf", present: true, empreinte: "x" }];
    const v = journaliser([], connus, true, "annonces");
    expect(v.disparitions).toBe(1);
  });
});
