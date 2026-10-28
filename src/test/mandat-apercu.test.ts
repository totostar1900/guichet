import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RACINE } from "./racine";

/**
 * LE CLIENT LIT LE PAPIER AVANT DE L'AUTORISER.
 *
 * RELEVÉ À L'AUDIT DES PIÈCES SIGNÉES du 27 octobre 2026. Sur les six
 * documents que le client signe, un seul — l'ordre de transfert — existait
 * avant sa signature : sa pièce naît à la préparation et la signature
 * s'enregistre ensuite. Pour les cinq autres, le PDF se fabrique DANS le geste
 * de signer, si bien que le client relisait des chiffres sur un formulaire et
 * jamais le papier qu'il autorisait.
 *
 * LE MANDAT EST LE PLUS CHER DES CINQ : c'est la seule pièce que l'agence
 * bancaire du client réclame, et elle autorise un débit sur son compte.
 *
 * LA MAISON AVAIT DÉJÀ TRANCHÉ LA MÊME QUESTION UNE FOIS, pour la convention —
 * « on demandait une signature sur un texte inaccessible » — et y avait répondu
 * par une route servant le modèle vierge. Un mandat ne se montre pas en modèle
 * vierge : ce qu'il faut relire est le compte à débiter, le titulaire et le
 * montant.
 */
/* Le rendu et les gardes se mesurent sans session : la fonction d'aperçu ne
   regarde que le mandat, et les gardes de la route se lisent dans sa source —
   elles ont été conduites en vrai sur l'application (aperçu servi 200,
   inline/no-store, mandat d'un autre 404). */
const CLIENT = "u-apercu";

const ROUTE = `${RACINE}/src/app/api/documents/mandat-apercu/[id]/route.ts`;

/** Un mandat préparé et non signé, le seul état où l'aperçu a lieu d'être. */
async function prepare(etat: "non_signe" | "signe") {
  const { memoryRepository: r } = await import("@/lib/data/memory");
  const m = await r.createMandat({
    userId: CLIENT,
    objet: "provision",
    bankName: "Afriland First Bank",
    bankAccount: "CM21 10005 00001 12345678901 23",
    accountHolder: "Client Aperçu",
    dayOfMonth: 5,
    amount: 50_000,
  } as never);
  if (etat === "signe") await r.updateMandat(m.id, { signedAt: new Date().toISOString(), signedMethod: "code à usage unique" });
  return m;
}

describe("l'aperçu du mandat", () => {
  it("rend le document, sans consommer de numéro ni rien enregistrer", async () => {
    /* DEUX CHOSES QU'UN APERÇU NE DOIT PAS FAIRE, et la seconde est la plus
       grave. Un numéro tiré à chaque relecture en brûlerait un pour rien, et le
       registre compterait des pièces qui n'existent pas. Mais surtout : la
       pièce définitive se produit APRÈS la signature, et c'est une correction
       du 25 octobre 2026 — l'exemplaire sortait sinon avec « lu et approuvé,
       date et signature », c'est-à-dire la branche d'un mandat NON signé, sur
       la seule pièce que l'agence bancaire réclame. Un aperçu qui
       s'enregistrerait ramènerait ce défaut par la porte d'à côté. */
    const { memoryRepository: r } = await import("@/lib/data/memory");
    const m = await prepare("non_signe");
    const avant = (await r.listDocuments()).length;

    const { apercuDuMandat } = await import("@/lib/documents/generate");
    const pdf = await apercuDuMandat(m.id);

    expect(pdf, "l'aperçu ne rend rien").toBeTruthy();
    expect(pdf!.length, "le PDF est vide").toBeGreaterThan(1000);
    expect((await r.listDocuments()).length, "l'aperçu a enregistré une pièce").toBe(avant);
  });

  it("ne rend rien pour un mandat qui n'existe pas", async () => {
    // Non vacuité : une fonction qui rendrait toujours un PDF passerait l'épreuve ci-dessus.
    const { apercuDuMandat } = await import("@/lib/documents/generate");
    expect(await apercuDuMandat("mandat-qui-n-existe-pas")).toBeUndefined();
  });

  it("porte la référence du mandat à la place d'un numéro de registre", () => {
    /* La référence est ce que le client voit déjà à l'écran : elle identifie la
       pièce sans prétendre être un numéro. Le mot « aperçu » dit le reste. */
    const src = readFileSync(`${RACINE}/src/lib/documents/generate.ts`, "utf8");
    const fn = /export async function apercuDuMandat[\s\S]*?\n\}/.exec(src)?.[0] ?? "";
    expect(fn.length, "la fonction est introuvable : le relevé ne mesure rien").toBeGreaterThan(100);
    expect(fn).toMatch(/number: `aperçu · \$\{mandat\.ref\}`/);
    expect(fn, "l'aperçu tire un numéro du registre").not.toMatch(/nextNumbers/);
    expect(fn, "l'aperçu enregistre une pièce").not.toMatch(/\bstore\(/);
  });
});

describe("les gardes de la route qui sert l'aperçu", () => {
  const src = () => readFileSync(ROUTE, "utf8");

  it("ne sert que le mandat du client connecté", () => {
    /* ON LIT LES MANDATS DU CLIENT ET ON Y CHERCHE L'IDENTIFIANT : un
       identifiant deviné ne désigne alors rien, et l'appartenance ne se pose
       pas deux fois. C'est la mécanique employée partout où le client agit sur
       sa propre pièce — un « listMandats() » sans son identifiant servirait le
       compte à débiter de n'importe qui à qui saurait deviner une clef. */
    expect(src()).toMatch(/listMandats\(s\.userId\)/);
    expect(src(), "la route sert les mandats de tout le monde").not.toMatch(/listMandats\(\)\s*\)/);
    expect(src()).toMatch(/if \(!s\) return new NextResponse\("Connexion requise", \{ status: 401 \}\)/);
  });

  it("cesse de servir l'aperçu dès que le mandat est signé", () => {
    /* Une fois signé, l'exemplaire définitif existe, numéroté, dans ses
       documents. Servir un aperçu à côté ferait deux papiers pour une
       autorisation, et le client ne saurait pas lequel remettre à son agence. */
    expect(src()).toMatch(/if \(mien\.signedAt\) return new NextResponse\(/);
    expect(src()).toMatch(/exemplaire définitif est dans vos documents/);
  });

  it("ne garde rien en cache, et ne se télécharge pas", () => {
    /* PAS DE CACHE : le client corrige son mandat et relit. Une version gardée
       lui montrerait les chiffres d'avant sa correction, sur le document même
       qu'il s'apprête à autoriser.
       « inline » : c'est une lecture avant décision, pas une pièce à garder —
       celle qu'on garde porte un numéro. */
    expect(src()).toMatch(/"cache-control": "no-store"/);
    expect(src()).toMatch(/"content-disposition": `inline;/);
    expect(src(), "l'aperçu se présente comme une pièce à garder").not.toMatch(/attachment/);
  });
});

describe("la page le propose là où le client s'apprête à signer", () => {
  it("le lien précède la demande de code", () => {
    /* L'ORDRE EST CELUI DES GESTES : on lit, puis on demande le code, puis on
       signe. Un lien placé après le bouton du code arriverait trop tard pour
       servir à quelque chose. */
    const vue = readFileSync(`${RACINE}/src/app/moi/prelevements/MesMandats.tsx`, "utf8");
    const lien = vue.indexOf("mandat-apercu");
    const code = vue.indexOf("Recevoir mon code");
    expect(lien, "le lien d'aperçu a disparu de la page").toBeGreaterThan(0);
    expect(code).toBeGreaterThan(0);
    expect(lien, "le lien arrive après la demande de code : trop tard pour lire").toBeLessThan(code);
    /* IL DIT CE QUE C'EST, et pourquoi le lire : « c'est le document que votre
       banque vous demandera » est la raison pour laquelle on le relit. */
    expect(vue).toMatch(/Lire le mandat avant de le signer/);
    expect(vue).toMatch(/votre banque vous demandera/);
  });
});
