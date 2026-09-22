import { l, type DocPage } from "./types";

/**
 * Every document of a relationship, who prepares it, who signs it, who
 * receives it: the map by kind and moment, then the flows operation by
 * operation, then the four acts added in September 2026 and their circuits.
 */
export const DOCUMENTS: DocPage = {
  slug: "documents",
  title: l("Les documents, de l'intention à la clôture", "The documents, from intention to closure"),
  summary: l("La carte des documents en trois kinds (signés par le client, envoyés au client, transmis aux contreparties), les parcours opération par opération avec qui prépare, qui signe, qui reçoit, et les quatre actes : mandat, avis de coupon, réclamation, transfert / clôture.", "The map of documents in three kinds (signed by the client, sent to the client, sent to counterparties), the flows operation by operation with who prepares, who signs, who receives, and the four acts: mandate, coupon notice, complaint, transfer / closure."),
  visibility: "desk",
  audience: ["desk", "admin"],
  order: 3,
  checkedOn: "2026-09-22",
  owner: "Georges",
  chapters: [
    {
      id: "carte",
      title: l("La carte des documents", "The map of the documents"),
      blocks: [
        { type: "lead", text: l("Trois kinds, un par règle de rédaction, et le temps de gauche à droite : chaque document a une seule case, le moment où il naît. Ce que le client signe engage ; ce que Purpose lui envoie constate ; ce que le desk transmet aux contreparties reste interne.", "Three kinds, one per wording rule, and time from left to right: each document has one cell, the moment it is born. What the client signs binds; what Purpose sends records; what the desk sends to counterparties stays internal.") },
        { type: "docmap", caption: l("En or, les actes signés par le client (règle réglementaire : un responsable approuve chaque changement de texte) ; en bleu, les avis envoyés au client (relu par un autre membre du desk) ; en gris, ce qui va aux contreparties (libre). Toucher un document ouvre sa fiche : qui le prépare, qui le signe, qui le reçoit, où il naît, où le trouver, son modèle.", "In gold, the acts signed by the client (regulatory rule: a manager approves every wording change); in blue, the notices sent to the client (reviewed by another desk member); in grey, what goes to counterparties (free). Tapping a document opens its card: who prepares it, who signs it, who receives it, where it is born, where to find it, its model.") },
        {
          type: "table",
          head: [l("Kind", "Kind"), l("Documents", "Documents"), l("Qui prépare", "Who prepares"), l("Qui signe", "Who signs"), l("Règle du registre", "Registry rule")],
          rows: [
            [l("Signés par le client", "Signed by the client"), l("Convention, mandat, bulletin d'ordre (souscription, achat, vente), ordre de cession / rachat, réclamation, ordre de transfert / clôture", "Agreement, mandate, order form (subscription, purchase, sale), sale / redemption order, complaint, transfer / closure order"), l("Purpose, depuis l'intention ou le dossier", "Purpose, from the intention or the file"), l("le client (et le mandataire pour le mandat)", "the client (and the agent for the mandate)"), l("réglementaire", "regulatory")],
            [l("Envoyés au client", "Sent to the client"), l("Appel de fonds, avis de résultat, de non-allocation, d'opéré, de coupon / remboursement, relevé de position, attestation de détention", "Call for funds, result, non-allotment, contract, coupon / redemption notices, statement, attestation"), l("Purpose", "Purpose"), l("personne (l'attestation est signée et cachetée par Purpose)", "nobody (the attestation is signed and stamped by Purpose)"), l("relu", "reviewed")],
            [l("Transmis aux contreparties", "Sent to counterparties"), l("Dossier d'ouverture SVT / dépositaire, bordereau de soumission SVT, bordereau OPCVM, instruction de transfert", "Custodian file, auction slip, fund slip, transfer instruction"), l("le desk", "the desk"), l("Purpose", "Purpose"), l("libre, jamais envoyé au client", "free, never sent to the client")],
          ],
        },
        { type: "link", href: "/desk/referentiel/modeles", label: l("Le registre des modèles", "The models registry"), hint: l("le texte de chaque passage, sa version, sa règle", "each passage's text, version and rule") },
      ],
    },
    {
      id: "parcours",
      title: l("Les parcours, opération par opération", "The flows, operation by operation"),
      blocks: [
        { type: "lead", text: l("Qui agit, quel document naît, qui le signe, qui le reçoit, et l'horloge qui court. La couleur de la carte dit qui agit ; celle du document dit son kind. Un document se touche pour ouvrir sa fiche.", "Who acts, which document is born, who signs it, who receives it, and the clock that runs. The card's colour says who acts; the document's says its kind. A document is tapped to open its card.") },
        { type: "flows", caption: l("Six parcours : ouverture, souscription primaire, achat secondaire, vente et cession, OPCVM, vie du titre et fin. Les mêmes données servent la carte ci-dessus et le bloc « Actes et avis » des dossiers.", "Six flows: opening, primary subscription, secondary purchase, sale, funds, life of the security and end. The same data serves the map above and the “Acts and notices” block of the files.") },
        { type: "note", kind: "rule", text: l("Les trois rôles ne se mélangent jamais : Purpose prépare, le client signe ce qui l'engage, le desk signe pour Purpose ce qui va aux contreparties. Un avis ne porte pas de signature : c'est un constat, numéroté et gardé.", "The three roles never blur: Purpose prepares, the client signs what binds them, the desk signs for Purpose what goes to counterparties. A notice carries no signature: it is a record, numbered and kept.") },
        { type: "link", href: "/desk/clients", label: l("Dossiers › Actes et avis", "Files › Acts and notices"), hint: l("mandat, avis de coupon, transfert / clôture, réclamation reçue", "mandate, coupon notice, transfer / closure, complaint received") },
      ],
    },
    {
      id: "references",
      title: l("Les deux références d'un document", "The two references of a document"),
      blocks: [
        { type: "lead", text: l("Chaque document porte deux références, parce qu'elles font deux métiers différents : celle qu'il imprime, que le client cite, et celle du registre de la maison, que le desk et un contrôleur lisent.", "Every document carries two references, because they do two different jobs: the one it prints, which the client quotes, and the one in the firm's register, read by the desk and by a controller.") },
        {
          type: "table",
          head: [l("", ""), l("La référence imprimée", "The printed reference"), l("L'entrée du registre", "The register entry")],
          rows: [
            [l("À quoi elle ressemble", "What it looks like"), l("PC-BUL-260922-K7Q4", "PC-BUL-260922-K7Q4"), l("PC-BUL-2026-0018", "PC-BUL-2026-0018")],
            [l("Ce qu'elle dit", "What it says"), l("le modèle et le jour d'émission, puis quatre caractères tirés au sort", "the model and the day of issue, then four characters drawn at random"), l("le modèle, l'année, et le rang dans la suite de l'année", "the model, the year, and the rank in that year's sequence")],
            [l("Qui la voit", "Who sees it"), l("le client, sur son document ; le desk ; tout le monde", "the client, on their document; the desk; everyone"), l("le desk et l'audit, jamais l'exemplaire d'un client", "the desk and audit, never a client's copy")],
          ],
        },
        { type: "p", text: l("La raison est simple : une référence qui compte donne le compte. Un client qui reçoit PC-AF-2026-0002 sait que c'est le deuxième appel de fonds de l'année, et un client qui en reçoit deux à quelques semaines d'écart connaît le rythme. Ce n'est pas une information à lui donner en même temps que son document. La référence imprimée ne porte donc aucun rang ; le registre, lui, garde une suite ininterrompue, qui est ce qu'un contrôleur attend.", "The reason is simple: a reference that counts gives the count away. A client receiving PC-AF-2026-0002 knows it is the second funding call of the year, and a client receiving two a few weeks apart knows the rate. That is not something to hand over along with their document. So the printed reference carries no rank; the register keeps an unbroken sequence, which is what a controller expects.") },
        { type: "note", kind: "info", text: l("Deux exceptions, voulues. Un document transmis à une contrepartie (bordereau de soumission, dossier SVT) garde sa suite comme référence : la BVMAC et le Trésor lisent un registre, et il n'y a pas de volume à protéger d'eux. Une note sur l'indice garde la référence de sa période (PC-IDX-2026T2), qui ne dit rien d'autre qu'un trimestre.", "Two exceptions, on purpose. A document sent to a counterparty (submission form, SVT file) keeps its sequence as its reference: the BVMAC and the Treasury read a register, and there is no volume to protect from them. A note on the index keeps its period's reference (PC-IDX-2026T2), which says nothing but a quarter.") },
        { type: "note", kind: "rule", text: l("Une référence déjà entre les mains d'un client ne change jamais. Les documents émis avant cette règle gardent la leur, et c'est elle qui sert d'entrée de registre. Les deux formes se cherchent dans la même boîte, à Documents.", "A reference already in a client's hands never changes. Documents issued before this rule keep theirs, and it serves as their register entry. Both forms are searched from the same box, in Documents.") },
        { type: "p", text: l("La référence imprimée s'épelle au téléphone sans hésitation : son alphabet ne contient ni I, ni L, ni O, ni U, ni zéro, ni un. Le registre, lui, se calcule à partir de la plus haute entrée déjà inscrite, jamais du nombre de lignes : un document retiré ne rend pas son numéro au suivant.", "The printed reference spells out over the phone without hesitation: its alphabet holds no I, L, O, U, zero or one. The register is computed from the highest entry already logged, never from the number of rows: a removed document never hands its number to the next one.") },
        { type: "link", href: "/desk/documents", label: l("Documents", "Documents"), hint: l("la boîte de recherche accepte l'une ou l'autre référence", "the search box takes either reference") },
      ],
    },
  ],
};
