import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JOUR_MAX, JOUR_MIN, mandatVivant, tirageAutorise, verifierLeMandat, type MandatPrelevement } from "@/lib/domain/mandat";

/**
 * LE MANDAT DE PRÉLÈVEMENT : la maison tire, au lieu que le client pousse.
 *
 * Tout le reste de la plateforme va dans un sens : le client signe, puis il
 * vire. Le prélèvement inverse la direction, sur une autorisation donnée une
 * fois. Il rend l'épargne programmée autonome, qui sans lui demande au client
 * de penser à l'alimenter, et il supprime la référence recopiée, puisque
 * c'est la maison qui émet l'opération.
 *
 * Deux décisions du dirigeant, le 9 octobre 2026, et ces tests les gardent :
 * UN MANDAT PAR USAGE, et CALENDRIER SEULEMENT.
 */
const base: MandatPrelevement = {
  id: "m1",
  ref: "MP-2610-ABCD",
  userId: "u1",
  objet: "provision",
  bankName: "Afriland",
  bankAccount: "CM21 10005 00001 12345678901 23",
  accountHolder: "Georges Nitcheu",
  maxAmount: 60_000,
  amount: 50_000,
  dayOfMonth: 5,
  state: "actif",
  createdAt: "2026-10-09T08:00:00Z",
  updatedAt: "2026-10-09T08:00:00Z",
};

describe("ce qu'un mandat doit porter", () => {
  it("un mandat sans plafond n'en est pas un", () => {
    expect(verifierLeMandat({ ...base, maxAmount: 0 })).toContain("plafond");
  });

  it("le montant prélevé ne dépasse jamais le plafond signé", () => {
    /* C'est le même objet que le plafond « au plus » d'un ordre, et la même
       phrase de la convention : la maison ne vous engage jamais au-delà. */
    expect(verifierLeMandat({ ...base, amount: 70_000 })).toContain("dépasser le plafond");
  });

  it("le jour va de 1 à 28, parce que tous les mois les ont", () => {
    expect(verifierLeMandat({ ...base, dayOfMonth: 31 })).toContain("entre 1 et 28");
    expect(verifierLeMandat({ ...base, dayOfMonth: JOUR_MIN })).toBeUndefined();
    expect(verifierLeMandat({ ...base, dayOfMonth: JOUR_MAX })).toBeUndefined();
  });

  it("le compte à débiter est nommé, et c'est le client", () => {
    expect(verifierLeMandat({ ...base, accountHolder: "" })).toContain("titulaire");
    expect(verifierLeMandat({ ...base, bankAccount: "" })).toContain("RIB");
  });

  it("un mandat qui alimente une instruction dit laquelle", () => {
    expect(verifierLeMandat({ ...base, objet: "instruction", standingId: undefined })).toContain("laquelle");
    expect(verifierLeMandat({ ...base, objet: "instruction", standingId: "so-1" })).toBeUndefined();
  });
});

describe("ce qu'un mandat autorise, et quand", () => {
  const signe = { ...base, signedAt: "2026-10-09T09:00:00Z" };

  it("rien tant qu'il n'est pas signé : une ligne en base n'autorise pas un débit", () => {
    expect(mandatVivant(base)).toBe(false);
    expect(tirageAutorise(base, 50_000)).toBe(false);
  });

  it("jamais au-delà du plafond, et c'est la seule règle au moment de tirer", () => {
    expect(tirageAutorise(signe, 50_000)).toBe(true);
    expect(tirageAutorise(signe, 60_000)).toBe(true);
    expect(tirageAutorise(signe, 60_001)).toBe(false);
  });

  it("ni suspendu, ni révoqué", () => {
    for (const state of ["suspendu", "revoque"] as const) expect(tirageAutorise({ ...signe, state }, 50_000)).toBe(false);
  });
});

describe("les deux décisions de la maison, tenues par le code", () => {
  it("un mandat par usage : un second sur le même objet se refuse", () => {
    const src = readFileSync("src/app/moi/prelevements/actions.ts", "utf8");
    expect(src).toContain("Vous avez déjà un mandat pour cela");
    expect(src).toContain("préléveraient deux fois".replace("préléveraient", "prélèveraient"));
  });

  it("calendrier seulement : aucune action ne déclenche un tirage à la demande", () => {
    const src = readFileSync("src/app/moi/prelevements/actions.ts", "utf8");
    expect(src).not.toMatch(/tirerAction|prelever(Maintenant|Action)/);
  });

  it("révoquer ne supprime pas : une contestation porte sur un tirage passé", () => {
    const src = readFileSync("src/app/moi/prelevements/actions.ts", "utf8");
    expect(src).toContain('state: "revoque"');
    expect(src).not.toMatch(/deleteMandat|removeMandat/);
  });

  /* CETTE ÉPREUVE NE POUVAIT PAS ÉCHOUER, et elle a laissé passer la panne
     qu'elle était censée tenir. Elle vérifiait que « generateMandat » apparaît
     APRÈS le début de la fonction de signature : c'est vrai des deux ordres
     possibles, puisque l'appel est dans la fonction. Or l'ordre comptait — la
     pièce se produisait AVANT que la signature ne soit inscrite en base, et
     « generateMandat » relit le mandat en base. Elle sortait donc avec « lu et
     approuvé », la ligne d'un mandat non signé.
     Ce qui se vérifie désormais, c'est l'ORDRE DES DEUX ÉCRITURES ; et ce qui
     tient vraiment la chose est une épreuve qui ne lit plus le code du tout,
     mais le PDF produit par l'action — voir
     « mandat-signe-bout-a-bout.test.ts ». */
  it("inscrit la signature avant de produire l'exemplaire qui doit la porter", () => {
    const src = readFileSync("src/app/moi/prelevements/actions.ts", "utf8");
    const sign = src.indexOf("export async function signerMandatAction");
    expect(sign, "la fonction de signature a changé de nom").toBeGreaterThan(0);
    const corps = src.slice(sign);
    const ecritLaSignature = corps.indexOf("signedAt: new Date().toISOString()");
    const produitLaPiece = corps.indexOf("generateMandat(m.id)");
    expect(ecritLaSignature, "la signature ne s'inscrit plus").toBeGreaterThan(0);
    expect(produitLaPiece, "l'exemplaire ne se produit plus à la signature").toBeGreaterThan(0);
    expect(produitLaPiece, "la pièce se produit avant que la signature ne soit en base : elle sortira « lu et approuvé »").toBeGreaterThan(ecritLaSignature);
  });
});

/**
 * LE PARCOURS, TEL QU'IL A ÉTÉ JOUÉ LE 25 OCTOBRE 2026.
 *
 * Le prélèvement « ne marchait pas ». Mesuré en pilotant l'application du
 * premier clic au document : il marchait de bout en bout — mandat créé, code
 * reçu, signature prise, exemplaire produit — et NE DISAIT RIEN. Un geste qui
 * aboutit en silence est indiscernable d'un geste qui échoue, et c'est la
 * seule chose que le client puisse en conclure.
 *
 * Trois trouvailles, et chacune a sa garde ici :
 *
 *   LA CONFIRMATION MOURAIT AVEC LE FORMULAIRE. « Mandat signé » vivait dans
 *   le bloc de signature, que signer fait disparaître.
 *
 *   LA PIÈCE ÉTAIT INATTEIGNABLE. Son geste au rayon des papiers signés était
 *   « Modifier », vers la page des prélèvements : le seul document qu'une
 *   agence bancaire réclame était le seul qu'on ne pouvait pas ouvrir.
 *
 *   UN BOUTON POUR OUVRIR UN FORMULAIRE. On arrivait de « Approvisionner votre
 *   compte » sur un écran dont tout le contenu était « Préparer un mandat ».
 */
describe("ce que le parcours du mandat doit dire", () => {
  const vue = readFileSync("src/app/moi/prelevements/MesMandats.tsx", "utf8");

  it("dit la signature après que le formulaire qui la portait a disparu", () => {
    const signe = vue.slice(vue.indexOf("{m.signeLe ? ("), vue.indexOf(") : ("));
    expect(signe, "la confirmation de signature n'est plus dans la branche qui survit").toMatch(/sign\?\.ok && sign\.message/);
    /* Non vacuité : le message vient bien de l'action de signature, et la
       branche examinée est bien celle du mandat signé. */
    expect(vue, "l'action de signature ne rend plus d'état").toMatch(/useActionState<MandatResult \| null, FormData>\(signerMandatAction/);
    expect(signe, "la branche lue n'est pas celle du mandat signé").toContain("Signé le {d}");
  });

  it("mène à l'exemplaire, au lieu de dire où il se trouve", () => {
    expect(vue, "la carte ne mène plus à la pièce").toMatch(/m\.piece \? `\/moi\/documents\/\$\{m\.piece\}/);
    /* Et la page passe bien l'adresse : sans elle, le lien retomberait pour
       toujours sur le rayon, c'est-à-dire sur la phrase qu'il remplace. */
    expect(readFileSync("src/app/moi/prelevements/page.tsx", "utf8"), "la page ne passe plus l'exemplaire").toMatch(/piece: m\.docId/);
  });

  it("ouvre le formulaire quand il n'y a rien d'autre à lire", () => {
    expect(vue, "le formulaire se referme derrière un bouton même sans autorisation").toMatch(/useState\(connue \|\| vivants\.length === 0\)/);
    /* Le repli garde son sens dès qu'une autorisation existe : on vient alors
       lire la liste, et en ajouter une seconde est délibéré. */
    expect(vue, "le bouton de repli a disparu : on ne peut plus refermer").toContain("Préparer un mandat");
  });

  /* LA SIGNATURE MANUSCRITE, POUR LA BANQUE ET POUR ELLE SEULE. Plusieurs
     banques de la zone n'acceptent un prélèvement que sur un mandat signé à la
     main. Le cadre ne paraît qu'une fois le mandat signé électroniquement, et
     une phrase dit qu'il ne conditionne rien — sans quoi il démentirait la
     signature qu'il suit, ce que la maison a déjà payé une fois avec
     « lu et approuvé ». */
  it("porte un cadre manuscrit pour la banque, et dit qu'il n'engage rien de plus", () => {
    const doc = readFileSync("src/lib/documents/pdf/kyc-templates.tsx", "utf8");
    const mandat = doc.slice(doc.indexOf("export function MandatPrelevementDoc"));
    expect(mandat, "le cadre manuscrit pour la banque a disparu").toContain("Signature manuscrite du débiteur, pour sa banque");
    expect(mandat, "le cadre manuscrit paraît même sur un mandat non signé : il démentirait la signature").toMatch(/\{mandat\.signedAt \? \(/);
    expect(mandat, "rien ne dit au client que ce cadre ne conditionne aucun prélèvement").toMatch(/aucun prélèvement\s*\n?\s*n&apos;attend ce cadre/);
  });
});
