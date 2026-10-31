import { readFileSync } from "node:fs";
import { RACINE } from "./racine";
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
  amount: 50_000,
  dayOfMonth: 5,
  state: "actif",
  createdAt: "2026-10-09T08:00:00Z",
  updatedAt: "2026-10-09T08:00:00Z",
};

describe("ce qu'un mandat doit porter", () => {
  /* UN SEUL NOMBRE depuis le 25 octobre 2026, et plus de plafond. Le mandat en
     portait deux : le montant prélevé, et un plafond emprunté au « au plus »
     d'un ordre de bourse, où il protège d'un prix inconnu à la signature. Ici
     rien n'est inconnu — le client écrit la somme, et c'est elle qui est
     présentée. Un second nombre faisait chercher lequel serait débité. */
  it("un mandat sans montant n'en est pas un, pour les deux usages", () => {
    expect(verifierLeMandat({ ...base, amount: 0 })).toContain("ni plus ni moins");
    /* L'épargne programmée tenait son montant de l'instruction : le client
       signait une autorisation sans y écrire de chiffre. */
    expect(verifierLeMandat({ ...base, objet: "instruction", standingId: "s1", dayOfMonth: undefined, amount: undefined })).toContain("ni plus ni moins");
  });

  it("et le plafond ne revient pas, ni dans le domaine ni dans la base", () => {
    const dom = readFileSync("src/lib/domain/mandat.ts", "utf8");
    expect(dom, "un second montant est revenu sur le mandat").not.toMatch(/maxAmount/);
    expect(readFileSync("supabase/migrations/0115_prelevement_un_seul_nombre.sql", "utf8")).toMatch(/drop column max_amount/);
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

  /* NI PLUS, NI MOINS — depuis le 25 octobre 2026. La règle était « au plus le
     plafond signé », ce qui autorisait aussi tout montant INFÉRIEUR, c'est-à-dire
     la maison décidant du chiffre. Un prélèvement plus petit que celui annoncé
     n'est pas une prudence : c'est une épargne qui se remplit moins vite que ce
     que le client a lu, sans qu'il l'apprenne. */
  it("le montant présenté est celui du mandat, ni plus ni moins", () => {
    expect(tirageAutorise(signe, 50_000)).toBe(true);
    expect(tirageAutorise(signe, 49_999), "un montant moindre passe : la maison décide du chiffre à la place du client").toBe(false);
    expect(tirageAutorise(signe, 50_001)).toBe(false);
    expect(tirageAutorise(signe, 0)).toBe(false);
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
    /* LE BOUTON, ET NON LE MOT. Vérifié à l'envers le 1er novembre 2026 :
       renommer le bouton laissait cette clause VERTE, parce que le fichier
       explique le bouton deux fois dans ses commentaires — « un écran dont le
       seul contenu était un bouton “Préparer un mandat” » — et que « vue »
       lit le source tel quel. C'est le piège que la maison a nommé ailleurs,
       « le code, pas ce qu'on en dit », et il avait franchi ce fichier-ci.
       On lit donc le source sans ses notes, et c'est l'ÉTIQUETTE TRADUITE
       qu'on y cherche, appel à la traduction compris : une phrase de
       commentaire ne porte pas cet appel.
       (Et ce commentaire-ci l'a écrit une fois, en exemple, avant que le
        relevé du français sans anglais ne l'attrape comme une chaîne à
        traduire. Un scanner qui ne retire pas les notes se prend aux notes :
        c'est le défaut même qu'on répare dix lignes plus bas.) */
    const sansNotes = vue.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    expect(sansNotes, "le bouton de repli a disparu : on ne peut plus refermer").toContain('t("Préparer un mandat")');
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

/**
 * CE QUI CLOCHE SE DIT, ET IL DÉSIGNE LE CHAMP.
 *
 * RELEVÉ LE 27 OCTOBRE 2026, en conduisant l'application avec des données
 * factices comme un client l'avait fait. Trois saisies différentes — un
 * montant vide, un montant « abc », une banque d'une lettre — rendaient TOUTES
 * la même phrase : « Vérifiez les champs : banque, compte, titulaire,
 * montant. » Quatre champs nommés, aucun désigné, aucune raison.
 *
 * ET LE MANDAT MARCHAIT. Rempli correctement, il se prépare, se signe et
 * produit sa pièce : ce qui échouait n'était pas le geste, c'était la capacité
 * de l'application à dire quoi corriger — et un client qui ne sait pas quoi
 * corriger conclut que ça ne marche pas.
 *
 * LES PHRASES EXISTAIENT, INATTEIGNABLES : le contrôle de forme passait en
 * premier et rendait sa phrase générique pour tout ce qu'il rejetait. Du code
 * mort pour précisément les cas où le client a besoin d'être guidé. C'est
 * pourquoi le domaine porte maintenant TOUTES les règles, longueurs comprises :
 * une règle et sa phrase au même endroit, sinon l'une bouge sans l'autre.
 */
describe("ce qui cloche dans un mandat se dit en toutes lettres", () => {
  const sans = (quoi: Partial<MandatPrelevement>) => verifierLeMandat({ ...base, ...quoi });

  it("nomme le champ, et jamais une liste de quatre", () => {
    /* LA RÈGLE DE CETTE FEUILLE : une phrase qui nomme plusieurs champs
       n'en désigne aucun. Un client lit « banque, compte, titulaire, montant »
       et relit les quatre sans savoir lequel reprendre. */
    const phrases = [
      sans({ accountHolder: "" }),
      sans({ accountHolder: "G" }),
      sans({ bankAccount: "" }),
      sans({ bankAccount: "123" }),
      sans({ bankName: "" }),
      sans({ bankName: "X" }),
      sans({ amount: 0 }),
      sans({ dayOfMonth: 31 }),
    ];
    /* ON COMPTE LES CHAMPS NOMMÉS, et non les virgules : une bonne phrase en
       porte — « Indiquez le montant à prélever chaque mois, en chiffres : c'est
       lui qui sera présenté à votre banque » en a trois et ne désigne qu'un
       champ. Compter la ponctuation l'aurait condamnée, et c'est la phrase
       qu'on veut. Mesuré en écrivant l'épreuve. */
    const CHAMPS = [/banque/i, /\b(RIB|IBAN|compte)\b/i, /titulaire/i, /montant/i, /jour du mois/i];
    for (const p of phrases) {
      expect(p, "une saisie fautive ne dit rien").toBeTruthy();
      const nommes = CHAMPS.filter((c) => c.test(p!)).length;
      expect(nommes, `« ${p} » énumère ${nommes} champs au lieu d'en désigner un`).toBeLessThan(3);
    }
    // Et chacune est distincte : huit fautes, huit phrases.
    expect(new Set(phrases).size, "deux fautes différentes rendent la même phrase").toBe(phrases.length);
  });

  it("dit la raison, et non seulement le champ", () => {
    /* « Le RIB est invalide » envoie le client regarder son RIB sans savoir
       quoi y chercher. « Votre banque vous le donne en entier, sur votre
       relevé » lui dit où aller. */
    expect(sans({ bankAccount: "123" })).toMatch(/trop court[\s\S]*relevé/);
    expect(sans({ amount: 0 })).toMatch(/en chiffres/);
    expect(sans({ dayOfMonth: 31 })).toMatch(/tous les mois ont ces jours-là/);
  });

  it("laisse passer un mandat correct", () => {
    // Non vacuité : un contrôle qui refuserait tout passerait les deux épreuves ci-dessus.
    expect(verifierLeMandat(base)).toBeUndefined();
    expect(sans({ bankName: "BG" })).toBeUndefined();
    expect(sans({ accountHolder: "Ng" })).toBeUndefined();
    expect(sans({ bankAccount: "123456" })).toBeUndefined();
  });

  it("ne compte pas les espaces d'un RIB comme des chiffres", () => {
    /* Un RIB se lit et se recopie par groupes. La longueur se mesure donc sur
       les seuls caractères du numéro : « 1 2 3 4 » fait sept signes et quatre
       chiffres, et c'est quatre chiffres qu'il faut juger.

       L'EXEMPLE EST CHOISI POUR DISTINGUER, et le premier ne distinguait rien :
       « 1 2 3 » est trop court des deux façons de compter, donc l'épreuve
       passait au vert même en retirant la mesure. Trouvé en vérification à
       l'envers, où le défaut réintroduit n'a fait tomber personne. Et le
       commentaire d'alors disait l'inverse du code : retirer les espaces rend
       la règle PLUS stricte, non plus permissive. */
    expect(sans({ bankAccount: "1 2 3 4" }), "sept signes passent pour un numéro de compte").toMatch(/trop court/);
    // Et un vrai numéro écrit par groupes passe, lui.
    expect(sans({ bankAccount: "CM21 10005 00001 12345678901 23" })).toBeUndefined();
  });
});

describe("l'action du mandat interroge le sens avant la forme", () => {
  it("le domaine parle en premier, et le schéma ne rend plus de phrase générique", () => {
    /* LE CLIQUET QUI MANQUAIT. Les bonnes phrases étaient derrière un refus
       générique ; rien n'empêchait d'y revenir, et le défaut est invisible à
       la lecture — un refus de formulaire ressemble trait pour trait à un
       autre. */
    const src = readFileSync(`${RACINE}/src/app/moi/prelevements/actions.ts`, "utf8");
    /* ON REGARDE CE QUI EST RENDU, et non ce qui est écrit : le commentaire
       au-dessus du correctif CITE la phrase d'avant pour expliquer le défaut,
       et un cliquet qui chercherait les mots tomberait sur l'explication. */
    expect(src, "la phrase générique est revenue").not.toMatch(/error: "Vérifiez les champs/);
    /* L'ORDRE EST LE SUJET : le domaine est interrogé DANS la branche du refus
       de forme, donc avant qu'elle ne rende sa main. */
    const branche = /if \(!parsed\.success\) \{[\s\S]*?\n  \}/.exec(src)?.[0] ?? "";
    expect(branche, "le refus de forme ne passe plus par le domaine").toMatch(/verifierLeMandat\(/);
    expect(branche, "le refus de forme ne nomme pas le champ en dernier recours").toMatch(/CHAMPS\[/);
    // Non vacuité : la branche a bien été trouvée.
    expect(branche.length).toBeGreaterThan(200);
  });
});
