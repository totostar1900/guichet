import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  diteAuClient,
  GESTES_ENGAGEANTS,
  JOURS_DE_MESURE,
  MESURES,
  MESURE_LABEL,
  MESURE_QUOI,
  MOTIFS_DE_MESURE,
  mesureVivante,
  peutAgir,
} from "@/lib/domain/mesure";
import { sensDeLIntention } from "@/lib/domain/intent";
import { rapporteAuLieuDeCouter } from "@/lib/domain/plafond";
import { estAchat, estCession } from "@/lib/domain/quantitatif";

/**
 * UNE MESURE EST LA SEULE CHOSE QUE LA PLATEFORME FASSE CONTRE UN CLIENT.
 *
 * Ces cas tiennent les trois limites qui l'encadrent, et aucune n'est
 * négociable : elle ne retient jamais son argent ni ses titres, elle ne coupe
 * jamais son chemin vers le desk, et elle a une fin écrite d'avance.
 */
const MAINTENANT = new Date("2026-10-10T12:00:00.000Z");

describe("ce qu'une mesure empêche", () => {
  it("suspendu arrête tout geste engageant, en disant pourquoi", () => {
    for (const g of GESTES_ENGAGEANTS) {
      const v = peutAgir(g, { mesure: { mesure: "suspendu" } }, MAINTENANT);
      expect(v.ok, g).toBe(false);
      // Un refus sans raison est la pire des pannes muettes : le client croit
      // avoir mal cliqué, recommence, puis écrit au desk.
      expect(v.raison, g).toContain("suspendu");
    }
  });

  it("prépaiement n'arrête que l'ordre non couvert", () => {
    expect(peutAgir("ordre.signer", { mesure: { mesure: "prepaiement" }, couvert: false }, MAINTENANT).ok).toBe(false);
    expect(peutAgir("ordre.signer", { mesure: { mesure: "prepaiement" }, couvert: true }, MAINTENANT).ok).toBe(true);
    // Le reste de son espace continue : une mesure n'est pas une punition générale.
    expect(peutAgir("mandat.creer", { mesure: { mesure: "prepaiement" }, couvert: false }, MAINTENANT).ok).toBe(true);
    expect(peutAgir("epargne.creer", { mesure: { mesure: "prepaiement" }, couvert: false }, MAINTENANT).ok).toBe(true);
  });

  it("et la clôture passe par la même porte", () => {
    /* Avant ce garde, la clôture était honorée à deux endroits sur quarante
       et un gestes : un compte en clôture pouvait encore signer un mandat. */
    const v = peutAgir("mandat.signer", { kycStatus: "en_cloture" }, MAINTENANT);
    expect(v.ok).toBe(false);
    expect(v.raison).toContain("clôture");
    expect(peutAgir("mandat.signer", { kycStatus: "clos" }, MAINTENANT).ok).toBe(false);
  });

  it("sans mesure, tout passe", () => {
    for (const g of GESTES_ENGAGEANTS) expect(peutAgir(g, {}, MAINTENANT).ok, g).toBe(true);
  });
});

/**
 * LE CRAN DU MILIEU, ET LES TROIS PROMESSES QU'IL A FAIT TENIR.
 *
 * « Fermeture seule » ne regarde que le sens : il refuse tout ce qui
 * augmente les lignes du client et laisse tout ce qui les réduit. En
 * l'écrivant, le garde a dû apprendre à distinguer un achat d'une vente, et
 * cette distinction a découvert deux refus que personne n'avait voulus.
 */
describe("fermeture seule", () => {
  const FERMETURE = { mesure: { mesure: "fermeture_seule" as const } };

  it("refuse ce qui augmente, laisse ce qui réduit", () => {
    const achat = peutAgir("ordre.deposer", { ...FERMETURE, sens: "augmente" }, MAINTENANT);
    expect(achat.ok).toBe(false);
    expect(achat.raison).toContain("vendre");
    expect(peutAgir("ordre.deposer", { ...FERMETURE, sens: "reduit" }, MAINTENANT).ok).toBe(true);
    expect(peutAgir("ordre.signer", { ...FERMETURE, sens: "reduit" }, MAINTENANT).ok).toBe(true);
    expect(peutAgir("ordre.accepter_contre", { ...FERMETURE, sens: "reduit" }, MAINTENANT).ok).toBe(true);
  });

  it("et les gestes qui n'ont qu'un sens sont refusés sans qu'on le dise", () => {
    // Une épargne, un réinvestissement et un mandat font toujours grossir la
    // relation : l'appelant n'a rien à préciser.
    for (const g of ["epargne.creer", "epargne.modifier", "reinvestir", "mandat.creer", "mandat.signer"] as const) {
      expect(peutAgir(g, FERMETURE, MAINTENANT).ok, g).toBe(false);
    }
  });

  it("il est plus doux que la suspension, et c'est tout son intérêt", () => {
    // Sous suspension le client ne vend plus lui-même ; sous fermeture seule si.
    expect(peutAgir("ordre.deposer", { mesure: { mesure: "suspendu" }, sens: "reduit" }, MAINTENANT).ok).toBe(false);
    expect(peutAgir("ordre.deposer", { ...FERMETURE, sens: "reduit" }, MAINTENANT).ok).toBe(true);
  });
});

describe("les trois refus que personne n'avait voulus", () => {
  it("vendre et acheter passaient par la même porte", () => {
    /* La suspension refusait les deux, alors que son propre message disait au
       client qu'il pouvait demander ses espèces et consulter ses lignes. Le
       refus de vendre reste, mais il dit maintenant par où passer. */
    const v = peutAgir("ordre.deposer", { mesure: { mesure: "suspendu" }, sens: "reduit" }, MAINTENANT);
    expect(v.ok).toBe(false);
    expect(v.raison).toContain("écrivez-nous");
  });

  it("poser une question n'est pas un engagement, sous aucune mesure", () => {
    /* « Information » et « rappel » empruntent la porte des ordres : un compte
       suspendu ne pouvait pas nous écrire, au moment précis où l'écran lui
       disait de le faire. Une mesure ne coupe jamais le chemin vers nous. */
    for (const m of MESURES) {
      expect(peutAgir("ordre.deposer", { mesure: { mesure: m }, sens: "aucun" }, MAINTENANT).ok, m).toBe(true);
    }
    expect(peutAgir("ordre.deposer", { kycStatus: "clos", sens: "aucun" }, MAINTENANT).ok).toBe(true);
    expect(peutAgir("ordre.deposer", { kycStatus: "en_cloture", sens: "aucun" }, MAINTENANT).ok).toBe(true);
  });

  it("un compte en clôture doit pouvoir solder ses lignes, sinon il ne se clôt jamais", () => {
    expect(peutAgir("ordre.deposer", { kycStatus: "en_cloture", sens: "reduit" }, MAINTENANT).ok).toBe(true);
    expect(peutAgir("ordre.deposer", { kycStatus: "en_cloture", sens: "augmente" }, MAINTENANT).ok).toBe(false);
    // Clos, en revanche, il n'y a plus rien à solder : le refus le dit.
    const v = peutAgir("ordre.deposer", { kycStatus: "clos", sens: "reduit" }, MAINTENANT);
    expect(v.ok).toBe(false);
    expect(v.raison).toContain("clos");
  });

  it("le sens se lit une seule fois, dans intent.ts", () => {
    expect(sensDeLIntention("achat")).toBe("augmente");
    expect(sensDeLIntention("appetit")).toBe("augmente");
    expect(sensDeLIntention("souscription")).toBe("augmente");
    expect(sensDeLIntention("vente")).toBe("reduit");
    expect(sensDeLIntention("cession")).toBe("reduit");
    expect(sensDeLIntention("rachat")).toBe("reduit");
    expect(sensDeLIntention("info")).toBe("aucun");
    expect(sensDeLIntention("rappel")).toBe("aucun");
    /* LES DEUX AUTRES LECTEURS Y REVIENNENT. Trois listes posaient la même
       question avant ce cran ; si l'une repart, ce cas tombe. */
    expect(rapporteAuLieuDeCouter("vente")).toBe(true);
    expect(rapporteAuLieuDeCouter("ferme")).toBe(false);
    // Un appétit augmente, mais il n'a traité avec personne : la vue
    // quantitative compte ce qui s'est fait, pas ce qui s'est dit.
    expect(estAchat("appetit")).toBe(false);
    expect(estAchat("ferme")).toBe(true);
    expect(estCession("rachat")).toBe(true);
  });
});

describe("une mesure a une fin écrite d'avance", () => {
  it("elle tombe d'elle-même à son terme", () => {
    // Sinon un compte reste puni par oubli, ce qui est la façon la plus sûre
    // de perdre un client sans l'avoir décidé.
    expect(mesureVivante({ mesure: "suspendu", jusquAu: "2026-10-09" }, MAINTENANT)).toBe("aucune");
    expect(mesureVivante({ mesure: "suspendu", jusquAu: "2026-11-09" }, MAINTENANT)).toBe("suspendu");
    expect(peutAgir("ordre.deposer", { mesure: { mesure: "suspendu", jusquAu: "2026-10-09" } }, MAINTENANT).ok).toBe(true);
  });

  it("et sa durée par défaut est celle des courtiers", () => {
    expect(JOURS_DE_MESURE).toBe(90);
  });
});

describe("ce que le client lit de sa propre mesure", () => {
  it("la cause, quand c'est une mesure de marché", () => {
    const dit = diteAuClient({ mesure: "prepaiement", motif: "ordre_non_regle", jusquAu: "2027-01-08" }, MAINTENANT);
    expect(dit).toContain("Prépaiement exigé");
    expect(dit).toContain("n'a pas été réglé");
    expect(dit).toContain("2027-01-08");
  });

  it("JAMAIS la cause, quand c'est un soupçon", () => {
    /* Prévenir quelqu'un qu'il est soupçonné est une faute au regard des
       textes LBC/FT, et cela prévient précisément la personne qu'il ne faut
       pas prévenir. Ce silence est la loi, pas une pudeur. */
    const dit = diteAuClient({ mesure: "suspendu", motif: "verification" }, MAINTENANT);
    expect(dit).toContain("vérification est en cours");
    expect(dit).not.toMatch(/soupçon|fraude|conformité|blanchiment/i);
  });

  it("et rien du tout quand il n'y a pas de mesure", () => {
    expect(diteAuClient(undefined, MAINTENANT)).toBeUndefined();
    expect(diteAuClient({ mesure: "aucune" }, MAINTENANT)).toBeUndefined();
    expect(diteAuClient({ mesure: "suspendu", jusquAu: "2026-01-01" }, MAINTENANT)).toBeUndefined();
  });

  it("un motif de conformité est marqué comme tel dans la liste", () => {
    expect(MOTIFS_DE_MESURE.verification.conformite).toBe(true);
    expect(MOTIFS_DE_MESURE.verification.auClient).toBe("");
    expect(MOTIFS_DE_MESURE.ordre_non_regle.conformite).toBe(false);
  });
});

describe("ce qu'une mesure ne touchera jamais", () => {
  const lire = (f: string) => readFileSync(f, "utf8");

  it("les gestes gardés sont les engagements, et rien d'autre", () => {
    /* La liste dit ce qu'on EMPÊCHE, jamais ce qu'on autorise : un geste
       ajouté demain ne doit pas se trouver bloqué par surprise. */
    expect([...GESTES_ENGAGEANTS].sort()).toEqual(
      ["epargne.creer", "epargne.modifier", "mandat.creer", "mandat.signer", "ordre.accepter_contre", "ordre.deposer", "ordre.signer", "reinvestir"].sort(),
    );
  });

  it("retirer son argent, vendre, se plaindre et écrire restent ouverts", () => {
    /* L'argent et les titres sont au client, pas à nous. Seule une décision
       de justice ou une instruction de l'ANIF permettrait de les retenir, et
       c'est alors elle le fondement, pas notre appréciation. */
    const libres: [string, string][] = [
      ["src/app/moi/actions.ts", "statementAction"],
      ["src/app/moi/reclamation/actions.ts", "complaintDepositAction"],
      ["src/app/moi/securite/actions.ts", "forgetDeviceAction"],
    ];
    for (const [f, nom] of libres) {
      const src = lire(f);
      const i = src.indexOf(`export async function ${nom}`);
      const fin = src.indexOf("\nexport async function", i + 1);
      expect(src.slice(i, fin === -1 ? undefined : fin), `${nom} ne doit pas être gardé`).not.toMatch(/await garde\(/);
    }
  });

  it("arrêter son épargne et révoquer son mandat restent ouverts", () => {
    // Un compte sous mesure doit pouvoir CESSER de s'engager : l'en empêcher
    // aggraverait ce que la mesure veut arrêter.
    const s = lire("src/app/moi/standing-actions.ts");
    const i = s.indexOf("export async function stopStandingAction");
    expect(s.slice(i)).not.toMatch(/await garde\(/);
    const p = lire("src/app/moi/prelevements/actions.ts");
    const j = p.indexOf("export async function revoquerMandatAction");
    expect(p.slice(j)).not.toMatch(/await garde\(/);
  });

  it("et refuser une contre-proposition reste ouvert", () => {
    const c = lire("src/app/moi/counter-actions.ts");
    expect(c).toMatch(/const passe = await garde\("ordre\.accepter_contre", \{ type: it\.type \}\)/);
    const i = c.indexOf('await garde("ordre.accepter_contre"');
    const j = c.indexOf('noter("ordre.contre.refusee")');
    expect(j, "le refus doit être noté AVANT le garde de l'acceptation").toBeLessThan(i);
  });
});

describe("les huit gestes engageants passent tous par le garde", () => {
  it("chacun est appelé quelque part", () => {
    const fichiers = [
      "src/app/offres/[id]/actions.ts",
      "src/app/moi/ordres/[id]/actions.ts",
      "src/app/moi/counter-actions.ts",
      "src/app/moi/standing-actions.ts",
      "src/app/moi/modifier-actions.ts",
      "src/app/moi/prelevements/actions.ts",
    ];
    const tout = fichiers.map((f) => readFileSync(f, "utf8")).join("\n");
    const manquants = GESTES_ENGAGEANTS.filter((g) => !tout.includes(`garde("${g}"`));
    expect(manquants, `gestes déclarés mais jamais gardés : ${manquants.join(", ")}`).toEqual([]);
  });

  it("et le garde se lit avant l'écriture, pas après", () => {
    // Un garde posé après l'enregistrement ne garde rien.
    const s = readFileSync("src/app/moi/prelevements/actions.ts", "utf8");
    expect(s.indexOf('garde("mandat.signer")')).toBeLessThan(s.indexOf('noter("mandat.signe"'));
  });
});

describe("tout ce que les mesures affichent est traduit", () => {
  it("crans, définitions et motifs passent par une variable", async () => {
    const { EN_JOURNAL } = await import("@/i18n/en-journal");
    const manquants: string[] = [];
    for (const m of MESURES) {
      if (!EN_JOURNAL[MESURE_LABEL[m]]) manquants.push(MESURE_LABEL[m]);
      if (!EN_JOURNAL[MESURE_QUOI[m]]) manquants.push(MESURE_QUOI[m]);
    }
    for (const v of Object.values(MOTIFS_DE_MESURE)) {
      if (!EN_JOURNAL[v.libelle]) manquants.push(v.libelle);
      if (v.auClient && !EN_JOURNAL[v.auClient]) manquants.push(v.auClient);
    }
    expect(manquants, `sans traduction :\n  ${manquants.join("\n  ")}`).toEqual([]);
  });
});
