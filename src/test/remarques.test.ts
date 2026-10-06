import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classer, codes, FAMILLES, INCONNU, jamaisReparable, parCode, remarques, reparable } from "@/lib/market/remarques";

/**
 * LES DIX-HUIT FAMILLES COUVRENT TOUT CE QUE LE LECTEUR DIT.
 *
 * Le bulletin rend ses remarques en phrases libres. Les coder n'a d'intérêt
 * que si le codage est COMPLET : une famille « divers » qui ramasse le reste
 * est un reliquat qu'on ne corrige jamais, et elle rendrait les comptes faux
 * sans que rien n'échoue.
 *
 * Les phrases ci-dessous sont relevées en production le 6 octobre 2026, une
 * par famille, recopiées au caractère. Elles couvrent les 1 362 remarques des
 * 808 séances : la requête de contrôle ne laissait aucun message au
 * fourre-tout.
 */
const RÉELS: [string, string][] = [
  ["A", "Indice BVMAC ALL SHARE introuvable."],
  ["B", "Section OPCVM introuvable."],
  ["C", "Seulement 0 OPCVM lu(s) : la table semble incomplète."],
  ["D", "Seulement 16 OPCVM lu(s) contre 23 la séance précédente : la table semble incomplète."],
  ["E", "Seulement 11 obligation(s) lue(s) contre 15 la séance précédente : la section semble incomplète."],
  ["F", "Seulement 0 action(s) lue(s) : la section semble incomplète."],
  ["G", "Lignes présentes au bulletin précédent et absentes aujourd'hui : CG0000020220, CM0000020115."],
  ["H", "Obligation CG0000020220 : ligne de cours non reconnue."],
  ["I", "Obligation CG0000020220 : prix / nominal ambigus (« 600040001 »)."],
  ["J", "Action CM0000010009 : ligne dense non reconnue."],
  ["K", "REG (CM0000010041) : cours de clôture nul ou illisible."],
  ["L", "OPCVM FCP AB AVENIR : VL du 2023-01-05 ignorée (date ou valeur invraisemblable)."],
  ["M", "OPCVM : ligne ignorée (format inattendu) avant « AFRICA BRIGHT ASSET MANAGEMENT »"],
  ["N", "FCP ABD KOMO : VL 12 500 vs 9 000 précédente (> 25 %)."],
  ["O", "Capitalisation CG0000020436 : cellules incomplètes."],
  ["P", "Section « Capitalisation boursière » présente mais illisible : aucune ligne."],
  ["Q", "REG (CM0000010041) : 100.0 % d'écart avec le dernier cours ingéré (425 le 8 septembre 2023)."],
  ["R", "En-tête du bulletin non reconnu : aucun cours n'a été retenu."],
  ["S", "En-tête du bulletin non reconnu (numéro / date)."],
  ["T", "Obligation CM0000020115 : cellules incomplètes."],
];

describe("chaque phrase du lecteur trouve sa famille", () => {
  for (const [code, phrase] of RÉELS) {
    it(`${code} — ${phrase.slice(0, 48)}…`, () => {
      expect(classer(phrase)).toBe(code);
    });
  }

  it("aucune phrase réelle ne tombe au fourre-tout", () => {
    /* C'est l'assertion qui porte le sens : un codage incomplet compte faux
       sans rien casser, et personne ne s'en aperçoit. */
    const perdues = RÉELS.filter(([, p]) => classer(p) === INCONNU).map(([, p]) => p);
    expect(perdues).toEqual([]);
  });

  it("les dix-huit familles sont toutes exercées, et leurs lettres sont uniques", () => {
    // Non vacuité : une famille sans exemple ne serait vérifiée par personne.
    expect(RÉELS.length).toBe(FAMILLES.length);
    expect(new Set(FAMILLES.map((f) => f.code)).size).toBe(FAMILLES.length);
    expect(new Set(RÉELS.map(([c]) => c)).size).toBe(FAMILLES.length);
  });

  it("C et D ne se confondent pas, bien qu'ils commencent pareil", () => {
    /* « Seulement 16 OPCVM lu(s) contre 23 » et « Seulement 0 OPCVM lu(s) »
       partagent leurs cinq premiers mots. Sans la garde, la comparaison à la
       veille serait comptée comme un manque absolu, et les 29 séances de D
       disparaîtraient dans les 58 de C. */
    expect(classer("Seulement 0 OPCVM lu(s) : la table semble incomplète.")).toBe("C");
    expect(classer("Seulement 16 OPCVM lu(s) contre 23 la séance précédente : la table semble incomplète.")).toBe("D");
  });
});

describe("les remarques d'un bulletin", () => {
  const b = {
    anomalies: ["Seulement 0 OPCVM lu(s) : la table semble incomplète."],
    warnings: [
      "Indice BVMAC ALL SHARE introuvable.",
      "Obligation CM0000020115 : ligne de cours non reconnue.",
      "Obligation CM0000020255 : ligne de cours non reconnue.",
      "Section OPCVM introuvable.",
    ],
    status: "partiel" as const,
    counts: { equities: 6, bonds: 9, funds: 0 },
  };

  it("portent leur genre, et l'anomalie passe devant", () => {
    const r = remarques(b);
    expect(r[0].genre).toBe("anomalie");
    expect(r.filter((x) => x.genre === "avertissement")).toHaveLength(4);
  });

  it("donnent les lettres sans répétition, dans l'ordre", () => {
    // La séance du 3 mars 2023, telle qu'elle est en base.
    expect(codes(b)).toEqual(["A", "B", "C", "H"]);
  });

  it("comptent les occurrences, parce que deux H ne valent pas un H", () => {
    /* Une séance peut porter soixante lignes d'obligation non reconnues : sans
       le compte, la pastille dirait la même chose pour une et pour soixante. */
    expect(parCode(b)).toEqual({ A: 1, B: 1, C: 1, H: 2 });
  });
});

describe("ce qu'une relecture peut encore gagner", () => {
  const seance = (anomalies: string[], warnings: string[]) => ({ anomalies, warnings, status: "partiel" as const, counts: { equities: 6, bonds: 9, funds: 0 } });

  it("une séance retenue par les seuls codes de date ne gagnera jamais rien", () => {
    /* Mesuré : 29 séances sur 287. Six passes de relecture dans la nuit du
       6 octobre 2026 ne leur ont rien fait gagner, et ne le pouvaient pas :
       on leur reproche de ne pas contenir ce que la bourse ne publiait pas. */
    const s = seance(["Seulement 0 OPCVM lu(s) : la table semble incomplète."], ["Indice BVMAC ALL SHARE introuvable.", "Section OPCVM introuvable."]);
    expect(jamaisReparable(s)).toBe(true);
    expect(reparable(s)).toBe(false);
  });

  it("un seul vrai défaut suffit à la rendre réparable", () => {
    const s = seance([], ["Indice BVMAC ALL SHARE introuvable.", "Obligation CM0000020115 : ligne de cours non reconnue."]);
    expect(reparable(s)).toBe(true);
    expect(jamaisReparable(s)).toBe(false);
  });

  it("une séance complète n'est ni l'un ni l'autre", () => {
    const s = { anomalies: [], warnings: [], status: "ok" as const, counts: { equities: 6, bonds: 29, funds: 45 } };
    expect(jamaisReparable(s)).toBe(false);
    expect(reparable(s)).toBe(false);
  });

  it("une séance sans cours d'action attend, même déclarée « ok »", () => {
    // Le cas prévu par bulletinsToReread : status ok mais rien lu côté actions.
    const s = { anomalies: [], warnings: [], status: "ok" as const, counts: { equities: 0, bonds: 29, funds: 45 } };
    expect(reparable(s)).toBe(false);
    expect(jamaisReparable(s)).toBe(false);
  });
});

/**
 * LE CLIQUET CONTRE LA PRODUCTION, et non contre mes exemples.
 *
 * Les dix-huit phrases ci-dessus, je les ai choisies : elles prouvent que
 * chaque famille sait reconnaître ce que j'attends d'elle, pas qu'elle couvre
 * ce que le lecteur produit vraiment.
 *
 * Le gabarit, lui, est relevé en base : les 1 362 remarques des 808 séances,
 * réduites à leurs 54 FORMES distinctes en effaçant nombres et ISIN. Sept
 * kilo-octets, relisibles à l'œil, et qui couvrent chaque façon qu'a le
 * lecteur de parler. Le jour où il invente une phrase, elle tombera au
 * fourre-tout et ce test le dira.
 */
const FORMES = JSON.parse(readFileSync(new URL("../lib/market/__fixtures__/remarques-reelles.json", import.meta.url), "utf8")) as [string, string, number][];

describe("les formes relevées en production", () => {
  it("aucune ne tombe au fourre-tout", () => {
    const perdues = FORMES.filter(([, texte]) => classer(texte) === INCONNU).map(([, texte, n]) => `${n}x ${texte}`);
    expect(perdues, "une forme non classée fausse tous les comptes sans rien casser").toEqual([]);
  });

  /* T est prévue par le lecteur et n'a jamais paru en huit cents séances.
     La déclarer ici vaut mieux que d'affaiblir l'assertion : le jour où elle
     paraît, le gabarit la verra, et la liste devra maigrir. */
  const JAMAIS_VUES = ["T"];

  it("et elles exercent toutes les familles, sauf celles déclarées jamais vues", () => {
    /* Non vacuité à l'envers : si le gabarit ne couvrait que trois familles,
       le test précédent passerait en ne prouvant presque rien. */
    const vues = new Set(FORMES.map(([, texte]) => classer(texte)));
    const orphelines = FAMILLES.filter((f) => !vues.has(f.code) && !JAMAIS_VUES.includes(f.code)).map((f) => f.code);
    expect(orphelines).toEqual([]);
    // Et l'inverse : une famille déclarée jamais vue qui paraît doit quitter la liste.
    expect(JAMAIS_VUES.filter((c) => vues.has(c)), "cette famille paraît maintenant en production").toEqual([]);
  });

  it("le gabarit pèse ce qu'il doit peser", () => {
    // 54 formes pour 1 362 remarques : s'il tombe à cinq, il ne couvre plus rien.
    expect(FORMES.length).toBeGreaterThan(40);
    expect(FORMES.reduce((s, [, , n]) => s + n, 0)).toBeGreaterThan(1000);
  });

  it("chaque famille paraît toujours du même côté, anomalie ou avertissement", () => {
    /* La pastille porte une couleur par genre. Si une même famille sortait
       tantôt en anomalie tantôt en avertissement, la couleur mentirait une
       fois sur deux. */
    const cotes = new Map<string, Set<string>>();
    for (const [genre, texte] of FORMES) {
      const c = classer(texte);
      cotes.set(c, (cotes.get(c) ?? new Set()).add(genre));
    }
    const doubles = [...cotes].filter(([, g]) => g.size > 1).map(([c, g]) => `${c} : ${[...g].join(" et ")}`);
    expect(doubles).toEqual([]);
  });

  it("et ce côté est celui que la table déclare", () => {
    const menteuses = FORMES.filter(([genre, texte]) => {
      const f = FAMILLES.find((x) => x.code === classer(texte));
      return f && f.genre !== genre;
    }).map(([genre, texte]) => `${classer(texte)} déclarée ${FAMILLES.find((x) => x.code === classer(texte))!.genre}, vue en ${genre} : ${texte.slice(0, 50)}`);
    expect(menteuses).toEqual([]);
  });
});
