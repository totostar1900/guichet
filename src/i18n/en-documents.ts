/**
 * La page des documents, ses quatre rayons et les textes de la maison
 * (10 octobre 2026).
 *
 * ONZE CLEFS SONT INVISIBLES AU SCANNER et doivent être tenues à la main :
 * celles écrites dans un ternaire au milieu d'un appel au traducteur
 * (« {n} documents » / « {n} document », les pastilles « 1 à signer »,
 * « 1 à régler », « 1 à faire »). Un cliquet les compte :
 * src/test/page-documents.test.ts.
 */
export const EN_DOCUMENTS: Record<string, string> = {
  /* ---- la page ---- */
  "Vos papiers": "Your papers",
  "Aucun document pour l'instant": "No document yet",
  "Tout ce qui porte votre nom et un numéro : ce que vous avez signé, ce que vos opérations ont produit, et les mouvements de votre argent.":
    "Everything that carries your name and a number: what you have signed, what your operations produced, and the movements of your money.",
  "Le relevé de position et l'attestation de détention se fabriquent à la date que vous choisissez.": "The position statement and the holding certificate are made at the date you choose.",

  /* ---- rayon 1 ---- */
  "Ce que vous avez signé": "What you have signed",
  "Vos engagements : ils ne changent que si vous les reprenez.": "Your commitments: they change only if you sign them again.",
  "signé par vous le {d}": "signed by you on {d}",
  "établi le {d}": "drawn up on {d}",
  "Votre convention et vos ordres signés paraîtront ici.": "Your agreement and your signed orders will appear here.",
  "version {v} · le texte de la maison, dans la version que vous avez acceptée": "version {v} · the firm's text, in the version you accepted",
  "acceptées le {d}": "accepted on {d}",
  acceptées: "accepted",

  /* ---- rayon 2 ---- */
  "Ce que vos opérations ont produit": "What your operations produced",
  "Appels de fonds, résultats, avis d'opéré, coupons : ils tombent d'un ordre.": "Calls for funds, results, execution notices, coupons: they fall from an order.",
  "Vos appels de fonds, résultats et avis d'opéré apparaîtront ici.": "Your calls for funds, results and execution notices will appear here.",
  "dernier le {d}": "last on {d}",
  "Hors opération": "Outside any operation",
  "des papiers dont l'opération n'est plus au catalogue": "papers whose operation is no longer in the catalogue",
  "à régler": "to settle",
  "émis le {d}": "issued on {d}",

  /* ---- rayon 3 ---- */
  "Les mouvements de votre argent": "The movements of your money",
  "Ce qui entre, ce qui sort, et ce que la conservation coûte.": "What comes in, what goes out, and what custody costs.",
  "Vos versements, prélèvements et avis de garde paraîtront ici.": "Your payouts, debits and custody notices will appear here.",
  "édité le {d}": "produced on {d}",
  "Avis de versement": "Payout notice",
  "{m} FCFA vers votre compte bancaire": "{m} FCFA to your bank account",
  "payé le {d}": "paid on {d}",
  "Le journal": "The journal",
  "Prélèvement encaissé": "Debit collected",
  "Prélèvement rejeté": "Debit rejected",
  "Prélèvement présenté": "Debit presented",
  "Prélèvement annoncé": "Debit announced",
  "{m} FCFA le {d}": "{m} FCFA on {d}",
  "encaissé le {d}": "collected on {d}",
  "rejeté par votre banque": "refused by your bank",
  "annoncé le {d}": "announced on {d}",
  "Mes prélèvements": "My direct debits",
  "Avis de droits de garde · {p}": "Custody fee notice · {p}",
  Contester: "Dispute",

  /* ---- rayon 4 ---- */
  "Vos démarches": "Your procedures",
  "Ce qu'on ouvre quand quelque chose ne va pas, ou quand on s'en va.": "What you open when something is wrong, or when you leave.",
  "déposée le {d}": "filed on {d}",
  "une réponse écrite, puis la médiation COSUMAF si rien ne va": "a written answer, then COSUMAF mediation if nothing works",
  "Ouvrir une démarche": "Start a procedure",

  /* ---- les nombres et les pastilles, écrits en ternaire ---- */
  "{n} documents": "{n} documents",
  "{n} document": "{n} document",
  "{n} opérations": "{n} operations",
  "{n} opération": "{n} operation",
  "1 à signer": "1 to sign",
  "{n} à régler": "{n} to settle",
  "1 à régler": "1 to settle",
  "{n} à faire": "{n} to do",
  "1 à faire": "1 to do",
  Régler: "Settle",
  Lire: "Read",

  /* ---- le pied et les textes ---- */
  "Les textes de la maison": "The firm's texts",
  "Mentions, risques, annexe tarifaire, règles des services : les mêmes pour tous, version par version.": "Legal notice, risks, fee schedule, service rules: the same for everyone, version by version.",
  "Textes et conditions": "Texts and conditions",
  "Mentions en vigueur : version {v}.": "Legal notice in force: version {v}.",
  "ce qui vaut pour tout le monde": "what applies to everyone",
  "Les mêmes pour tout le monde. Ils n'ont pas de numéro : ils ont une version, et vous lisez toujours celle qui est en vigueur. Ceux que vous avez acceptés portent leur date, et se retrouvent aussi dans vos documents.":
    "The same for everyone. They have no number: they have a version, and you always read the one in force. Those you have accepted carry their date, and are also found in your documents.",
  "Qui nous sommes, ce que le Guichet est, les risques, vos canaux et vos données.": "Who we are, what the Guichet is, the risks, your channels and your data.",
  "à accepter à votre prochaine connexion": "to accept at your next sign-in",
  "Le contrat entre vous et Purpose Capital : ce que vous nous confiez, ce que nous vous devons.": "The contract between you and Purpose Capital: what you entrust to us, what we owe you.",
  "signée le {d}": "signed on {d}",
  "à reprendre : le texte a changé": "to sign again: the text has changed",
  "se signe après l'approbation de votre dossier": "signed once your file is approved",
  "Ce qui se facture, et ce qui ne se facture pas. C'est elle que cite l'article 6 de votre convention.": "What is charged, and what is not. It is what article 6 of your agreement refers to.",
  "en vigueur": "in force",
  "Les risques que vous portez": "The risks you bear",
  "Capital, liquidité, taux, allocation : ce que chaque instrument peut vous coûter.": "Capital, liquidity, rates, allocation: what each instrument may cost you.",
  "Les règles de chaque service": "The rules of each service",
  "Garde, espèces, prélèvement, encaissement : chaque service dit sa règle, son tarif et son état.": "Custody, cash, direct debit, collection: each service states its rule, its price and its state.",
  "au cas par cas": "case by case",
  "version {v}": "version {v}",
  "Un texte qui change vous est présenté à votre connexion suivante, et la version acceptée reste lisible dans vos documents.":
    "A text that changes is shown to you at your next sign-in, and the version you accepted stays readable in your documents.",

  /* ---- la pièce ouverte : ce qu'elle prouve, et ses voisines ---- */
  "Votre ordre {r}": "Your order {r}",
  "Il porte votre {op} de {m} sur": "It carries your {op} of {m} on",
  ", référence {r}. Établi le {d}.": ", reference {r}. Drawn up on {d}.",
  "Les pièces de cet ensemble": "The papers of this set",
  "pièce {n} sur {total}": "paper {n} of {total}",
  "documents de l'opération {r}": "documents of operation {r}",
  "pièces de votre dossier": "papers of your file",
  "Voir l'opération": "See the operation",
  "Contester cette pièce": "Dispute this paper",
};
