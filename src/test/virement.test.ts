import { describe, expect, it } from "vitest";
import { referenceDeProvision } from "@/lib/domain/cash";
import { ALPHABET_REFERENCE, anciennete, empreinte, intituleConcordant, lireLeReleve, motifsCandidats, peutRestituer, resoudreLeMotif, verdictDuVirement, type Resolution } from "@/lib/domain/virement";

/**
 * LE TRAITEMENT DES VIREMENTS ENTRANTS.
 *
 * La banque ne donnera pas de numéro de compte par client : un virement n'est
 * rattachable que par le motif recopié à la main. Ces cliquets gardent les
 * trois règles qui en découlent, et surtout la troisième, qui est la seule
 * dont la violation ne se verrait pas : une ligne de relevé ne s'inscrit
 * qu'une fois.
 */
const MOI = referenceDeProvision("u-georges");
const ELLE = referenceDeProvision("u-marie");
const refs = new Map([
  [MOI, "u-georges"],
  [ELLE, "u-marie"],
]);

describe("le motif, et ce qu'on en tire", () => {
  it("trouve la référence même noyée dans une phrase", () => {
    expect(motifsCandidats(`PROVISION ${MOI} MERCI`)).toContain(MOI);
    expect(motifsCandidats(`  ${MOI.toLowerCase()}  `)).toContain(MOI);
    /* « PR-ABCDEF » sans tiret : la banque du client mange la ponctuation, et
       c'est le cas le plus fréquent après le motif juste. */
    expect(motifsCandidats(MOI.replace("-", ""))).toContain(MOI);
  });

  it("ne prend pas « PROVISION » pour un PR suivi de sept lettres", () => {
    expect(motifsCandidats("PROVISION")).toEqual([]);
    expect(motifsCandidats("PRELEVEMENT")).toEqual([]);
  });

  it("ne prend pas un montant pour une référence", () => {
    /* 0, 1, 2, 5, 8 ne sont pas dans l'alphabet : un montant de six chiffres
       ne peut donc jamais ressembler à une référence, et c'est exprès. */
    expect(motifsCandidats("500 000")).toEqual([]);
    expect(motifsCandidats("1 000 000 FCFA")).toEqual([]);
  });

  it("partage l'alphabet de celui qui fabrique les références", () => {
    /* La duplication est assumée, pas l'écart : `cash.ts` fabrique, ce module
       reconnaît, et si l'un des deux change l'autre devient aveugle. */
    const fabriquees = [referenceDeProvision("a"), referenceDeProvision("b"), referenceDeProvision("u-georges"), referenceDeProvision("u-marie")];
    for (const r of fabriquees) expect([...r.slice(3)].every((c) => ALPHABET_REFERENCE.includes(c)), r).toBe(true);
  });
});

describe("du motif au client", () => {
  it("rend le client sur une référence exacte", () => {
    expect(resoudreLeMotif(`VIR ${MOI}`, refs)).toEqual({ kind: "exacte", ref: MOI, userId: "u-georges" });
  });

  it("propose, sans trancher, quand un caractère diffère", () => {
    /* Le cas mesuré : nos références n'emploient ni O ni 0, donc un motif qui
       en porte un est une faute de recopie, pas une autre référence. */
    const faute = `PR-O${MOI.slice(4)}`;
    const r = resoudreLeMotif(faute, refs);
    expect(r.kind).toBe("proche");
    expect(r.kind === "proche" && r.candidats.map((c) => c.ref)).toEqual([MOI]);
  });

  it("avoue qu'elle ne sait pas, plutôt que de choisir le moins faux", () => {
    expect(resoudreLeMotif("EPARGNE", refs).kind).toBe("aucune");
    expect(resoudreLeMotif(undefined, refs).kind).toBe("aucune");
    expect(resoudreLeMotif("PR-QQQQQQ", refs).kind).toBe("aucune");
  });

  it("préfère la référence écrite exprès à un jeton nu de six caractères", () => {
    const nu = ELLE.slice(3);
    const c = motifsCandidats(`${nu} ${MOI}`);
    expect(c[0]).toBe(MOI);
  });
});

describe("le donneur d'ordre contre l'intitulé déclaré", () => {
  it("concorde malgré la civilité, l'accent et l'ordre des mots", () => {
    expect(intituleConcordant("MME ABENA MARIE CLAIRE", "Abéna Marie Claire")).toBe("concorde");
    expect(intituleConcordant("ABENA MARIE", "MME ABENA MARIE CLAIRE")).toBe("concorde");
    expect(intituleConcordant("SARL TECHNOPLUS", "Technoplus SARL")).toBe("concorde");
  });

  it("signale les fonds d'un tiers, que l'article 3 refuse", () => {
    expect(intituleConcordant("SARL TECHNOPLUS", "ABENA MARIE CLAIRE")).toBe("differe");
    expect(intituleConcordant("NITCHEU GEORGES", "ABENA MARIE CLAIRE")).toBe("differe");
  });

  it("dit « inconnu » quand le dossier n'a pas d'intitulé, et ne devine pas", () => {
    expect(intituleConcordant("NITCHEU GEORGES", undefined)).toBe("inconnu");
    expect(intituleConcordant("NITCHEU GEORGES", "  ")).toBe("inconnu");
    expect(intituleConcordant(undefined, "NITCHEU GEORGES")).toBe("inconnu");
  });

  it("ne concorde pas sur les seuls mots vides", () => {
    // « MME DE LA » contre « MME DU BOIS » : deux civilités ne font pas une identité.
    expect(intituleConcordant("MME DE LA", "MME DU BOIS")).toBe("inconnu");
  });
});

describe("le verdict, et le seul cas qui ouvre un geste", () => {
  const exacte: Resolution = { kind: "exacte", ref: MOI, userId: "u-georges" };
  it("un seul verdict se rattache d'un geste", () => {
    expect(verdictDuVirement(exacte, "concorde")).toBe("a_rattacher");
    expect(verdictDuVirement(exacte, "differe")).toBe("tiers");
    expect(verdictDuVirement(exacte, "inconnu")).toBe("intitule_inconnu");
    expect(verdictDuVirement({ kind: "proche", candidats: [{ ref: MOI, userId: "u-georges" }] }, "concorde")).toBe("proche");
    expect(verdictDuVirement({ kind: "aucune" }, "concorde")).toBe("orphelin");
  });
});

describe("l'empreinte d'une ligne de relevé", () => {
  const l = { at: "2026-10-09", amount: 500_000, payer: "NITCHEU GEORGES", motif: MOI };

  it("est la même pour la même ligne, relevé relu ou non", () => {
    expect(empreinte(l)).toBe(empreinte({ ...l }));
    // La casse, les accents et la ponctuation du donneur d'ordre ne la changent pas.
    expect(empreinte({ ...l, payer: "Nitcheu, Georges" })).toBe(empreinte(l));
  });

  it("change dès que la ligne change", () => {
    expect(empreinte({ ...l, amount: 500_001 })).not.toBe(empreinte(l));
    expect(empreinte({ ...l, at: "2026-10-08" })).not.toBe(empreinte(l));
    expect(empreinte({ ...l, payer: "ABENA MARIE" })).not.toBe(empreinte(l));
    expect(empreinte({ ...l, motif: ELLE })).not.toBe(empreinte(l));
  });

  it("laisse passer un second virement identique, mais seulement si on le dit", () => {
    /* Deux virements réellement identiques le même jour existent. Ils se
       tranchent à la main, et la décision laisse sa trace au lieu d'être
       supposée par un garde-fou qui s'ouvrirait tout seul. */
    expect(empreinte(l, 2)).not.toBe(empreinte(l));
    expect(empreinte(l, 2)).toBe(empreinte(l, 2));
  });
});

describe("lire un relevé collé", () => {
  const releve = [
    `09/10/2026  VIR RECU NITCHEU GEORGES   ${MOI}                 500 000`,
    `09/10/2026  VIR RECU ABENA MARIE CLAIRE  PROVISION ${ELLE}     250 000`,
    `08/10/2026  VIR RECU SARL TECHNOPLUS     ${ELLE} POUR MME ABENA   1 000 000`,
    "08/10/2026  VIR RECU ONDO JEAN PIERRE    EPARGNE                 150 000",
  ].join("\n");

  it("rend une ligne par crédit, avec sa date et son montant", () => {
    const { lignes } = lireLeReleve(releve);
    expect(lignes.map((l) => [l.at, l.amount])).toEqual([
      ["2026-10-09", 500_000],
      ["2026-10-09", 250_000],
      ["2026-10-08", 1_000_000],
      ["2026-10-08", 150_000],
    ]);
  });

  it("lit le jour avant le mois, comme les relevés de la zone", () => {
    // L'inverse donnerait le 10 septembre pour le 9 octobre, sans qu'un total bouge.
    expect(lireLeReleve("09/10/2026 VIR RECU X 500 000").lignes[0].at).toBe("2026-10-09");
  });

  it("sort le donneur d'ordre sans la mécanique bancaire ni la référence", () => {
    const { lignes } = lireLeReleve(releve);
    expect(lignes[0].payer).toBe("NITCHEU GEORGES");
    expect(lignes[2].payer).toBe("SARL TECHNOPLUS MME ABENA");
    expect(lignes[3].payer).toBe("ONDO JEAN PIERRE");
  });

  it("trouve la référence là où elle est, et rien là où elle n'est pas", () => {
    const { lignes } = lireLeReleve(releve);
    expect(lignes.map((l) => l.motif)).toEqual([MOI, ELLE, ELLE, undefined]);
  });

  it("rend les quatre verdicts de la vraie vie", () => {
    const { lignes } = lireLeReleve(releve);
    const holders = ["NITCHEU GEORGES", "ABENA MARIE CLAIRE", "ABENA MARIE CLAIRE", undefined];
    const verdicts = lignes.map((l, i) => verdictDuVirement(resoudreLeMotif(l.motif, refs), intituleConcordant(l.payer, holders[i])));
    expect(verdicts).toEqual(["a_rattacher", "a_rattacher", "tiers", "orphelin"]);
  });

  it("ne perd pas une ligne en silence", () => {
    /* Une ligne tombée sans bruit est un virement orphelin de plus, et la page
       ne pourrait pas même la montrer. Acquitter n'est pas se taire. */
    const { lignes, illisibles } = lireLeReleve("SOLDE REPORTE\n09/10/2026 VIR RECU X 500 000\nTOTAL DES MOUVEMENTS");
    expect(lignes).toHaveLength(1);
    expect(illisibles).toEqual(["SOLDE REPORTE", "TOTAL DES MOUVEMENTS"]);
  });

  it("ignore les lignes vides sans les compter comme illisibles", () => {
    expect(lireLeReleve("\n\n  \n").illisibles).toEqual([]);
  });

  it("fige l'empreinte à la lecture, pour qu'une correction de frappe ne la déplace pas", () => {
    const l = lireLeReleve(releve).lignes[0];
    expect(l.fingerprint).toBe(empreinte({ at: l.at, amount: l.amount, payer: l.payer, motif: l.motif }));
  });

  it("ne laisse pas le dernier caractère d'une référence se coller au montant", () => {
    /* MESURÉ À L'ÉCRAN le 9 octobre 2026 : « PR-UCKRK9   500 000 » se lisait
       9 500 000, le 9 de la référence franchissant les espaces. Un virement de
       cinq cent mille entrait au journal pour neuf millions et demi, et aucune
       page ne l'aurait dit. Les références finissent par un chiffre une fois
       sur quatre : le cas n'avait rien de rare. */
    expect(lireLeReleve(`09/10/2026 VIR RECU X ${MOI} 500 000`).lignes[0].amount).toBe(500_000);
    expect(lireLeReleve("09/10/2026 VIR RECU X PR-UCKRK9   300 000").lignes[0].amount).toBe(300_000);
  });

  it("ne prend pas une année pour un montant", () => {
    // « SOLDE REPORTE AU 30/09/2026 » s'inscrivait pour 2 026 francs.
    expect(lireLeReleve("SOLDE REPORTE AU 30/09/2026").lignes).toEqual([]);
    expect(lireLeReleve("SOLDE REPORTE AU 30/09/2026").illisibles).toHaveLength(1);
  });

  it("ne prend pas un petit nombre pour un montant", () => {
    // Le dernier nombre, et seulement s'il atteint mille : un numéro de pièce traîne partout.
    expect(lireLeReleve("09/10/2026 VIR RECU X 250 000 PIECE 47").lignes[0].amount).toBe(250_000);
  });

  it("colle un numéro de pièce au montant quand le relevé les sépare d'une espace, et c'est assumé", () => {
    /* « PIECE 47 250 000 » se lit 47 250 000, parce que c'est AUSSI un montant
       parfaitement possible : quarante-sept millions en groupes de trois. Aucune
       règle ne tranche, et la plus prudente des deux lectures serait fausse une
       fois sur deux.
       Le remède n'est donc pas ici mais dans le texte collé, qui se corrige et
       se relit : l'opérateur a le relevé sous les yeux, et rien de ce que
       l'écran montre d'une ligne lue n'est modifiable à côté d'elle. La machine
       lit, une personne confirme, et ce test dit laquelle des deux porte ce
       cas. */
    expect(lireLeReleve("09/10/2026 VIR RECU X PIECE 47 250 000").lignes[0].amount).toBe(47_250_000);
  });
});

describe("l'âge et la restitution", () => {
  it("compte l'âge d'un crédit sans nom en jours", () => {
    const now = new Date("2026-10-09T10:00:00Z");
    expect(anciennete({ at: "2026-10-09" }, now)).toBe(0);
    expect(anciennete({ at: "2026-10-03" }, now)).toBe(6);
  });

  it("exige un motif écrit avant de renvoyer l'argent de quelqu'un", () => {
    expect(peutRestituer({ state: "recu" }, "fonds d'un tiers")).toBe(true);
    expect(peutRestituer({ state: "recu" }, "")).toBe(false);
    expect(peutRestituer({ state: "recu" }, "ok")).toBe(false);
    expect(peutRestituer({ state: "rattache" }, "fonds d'un tiers")).toBe(false);
  });
});
