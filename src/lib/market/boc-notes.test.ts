import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBoc } from "./boc-parse";
import { classer } from "./remarques";

/**
 * LE LECTEUR GARDE LA LIGNE QU'IL N'A PAS SU LIRE.
 *
 * Jusqu'au 6 octobre 2026 il poussait une phrase et jetait le texte :
 * « Obligation CM0000020115 : ligne de cours non reconnue. » sans jamais dire
 * SUR QUOI il avait buté. La variable portant ce texte était vivante à
 * l'instant de l'échec, deux lignes au-dessus du message, et mourait avec lui.
 *
 * La conséquence se voyait dans le rapport d'une séance : il ne pouvait
 * répéter que la phrase. Un rapport qui relit la même phrase n'apprend rien
 * à personne, et aucune mise en page ne rattrape une donnée jamais écrite.
 *
 * Le carnet garde les deux : la phrase, pour l'ingestion, qui n'en demande
 * pas plus ; le texte brut et le motif attendu, pour qui veut comprendre.
 *
 * Les deux séances ci-dessous sont choisies pour ce qu'elles cassent : celle
 * de décembre 2023 est la pire de la série, celle de juillet 2025 porte la
 * mise en page en trois lignes qui a coûté trente et une séances.
 */
const bulletin = (jour: string) => parseBoc(readFileSync(new URL(`./__fixtures__/BOC-${jour}.txt`, import.meta.url), "utf8"));

/** Tous les gabarits du dépôt, pour que le balayage ne dépende pas de mon choix. */
const TOUS = readdirSync(new URL("./__fixtures__/", import.meta.url))
  .filter((f) => /^BOC-\d{8}\.txt$/.test(f))
  .map((f) => ({ f, p: parseBoc(readFileSync(new URL(`./__fixtures__/${f}`, import.meta.url), "utf8")) }));

describe("le carnet du lecteur", () => {
  const p = bulletin("20231222");

  it("rend autant de notes que de phrases, et les mêmes", () => {
    /* Le carnet ne remplace pas « warnings » : il le double. Si les deux
       divergeaient, l'ingestion et le rapport raconteraient deux histoires. */
    expect(p.notes.map((n) => n.message)).toEqual(p.warnings);
  });

  it("garde le texte exact sur lequel il a buté", () => {
    const avecBrut = p.notes.filter((n) => n.brut);
    expect(avecBrut.length, "aucune note ne porte de texte : le lecteur jette encore").toBeGreaterThan(0);
    for (const n of avecBrut) {
      expect(n.brut!.length).toBeGreaterThan(0);
      // Et il dit ce qu'il cherchait : un brut sans attente ne s'interprète pas.
      expect(n.attendu, n.message).toBeTruthy();
    }
  });

  it("montre la ligne d'action que cette séance a perdue", () => {
    /* Le 22 décembre 2023 est la séance qui a fait échouer les six passes de
       la nuit : zéro action lue. Le rapport doit pouvoir montrer pourquoi. */
    const dense = p.notes.find((n) => /ligne dense non reconnue/.test(n.message));
    expect(dense, "la séance du 22/12/2023 perd ses actions sans dire sur quoi").toBeTruthy();
    expect(dense!.brut).toMatch(/\d/);
    expect(classer(dense!.message)).toBe("J");
  });

  it("borne le texte gardé : un PDF entier n'est pas un diagnostic", () => {
    // Quatre cents caractères suffisent à montrer une ligne et son voisinage.
    for (const n of p.notes) if (n.brut) expect(n.brut.length).toBeLessThanOrEqual(400);
  });
});

describe("la mise en page de 2025, celle qui coupe en trois", () => {
  const p = bulletin("20250701");

  it("se lit sans rien perdre, et le carnet reste cohérent", () => {
    expect(p.equities.map((e) => e.mnemo)).toEqual(["SEMC", "SAF", "SOCAP", "REG", "BANGE", "SCGRE"]);
    expect(p.notes.map((n) => n.message)).toEqual(p.warnings);
  });

  it("et chaque phrase qu'il produit trouve sa famille", () => {
    /* Le lien entre le lecteur et le classement : une phrase neuve qui ne
       tomberait dans aucune famille se verrait ici, sur un vrai bulletin, et
       pas seulement dans le gabarit des formes déjà vues. */
    const perdues = p.warnings.filter((m) => classer(m) === "Z");
    expect(perdues).toEqual([]);
  });
});

/**
 * LE BALAYAGE DE TOUS LES GABARITS.
 *
 * Un sabotage l'a montré : retirer le motif attendu du point le plus
 * fréquent du lecteur ne cassait rien, parce qu'aucun des gabarits choisis
 * n'exerçait ce point. H pèse 650 remarques sur 141 séances, et il n'était
 * couvert nulle part. Un cliquet qui rate le cas le plus courant ne couvre
 * rien du tout.
 */
describe("le carnet, sur tous les gabarits du dépôt", () => {
  const notes = TOUS.flatMap(({ f, p }) => p.notes.filter((n) => n.brut).map((n) => ({ f, n })));

  it("chaque texte gardé dit aussi ce qui était attendu", () => {
    /* Un brut sans attente ne s'interprète pas : on voit une suite de
       chiffres collés sans savoir où le lecteur voulait couper. */
    const muettes = notes.filter(({ n }) => !n.attendu).map(({ f, n }) => `${f} : ${n.message}`);
    expect(muettes).toEqual([]);
  });

  it("et les trois points qui butent vraiment sont exercés", () => {
    /* H, I et J : la ligne d'obligation non reconnue, le prix collé au
       nominal, la ligne d'action dense. Ce sont les trois seuls endroits où
       le lecteur tient un texte au moment d'échouer, et les trois doivent
       être couverts par au moins un gabarit, sans quoi le sabotage passe. */
    const vus = new Set(notes.map(({ n }) => classer(n.message)));
    expect([...vus].sort()).toEqual(["H", "I", "J"]);
  });

  it("le balayage regarde bien plusieurs bulletins", () => {
    expect(TOUS.length).toBeGreaterThanOrEqual(6);
    expect(notes.length).toBeGreaterThan(8);
  });
});
