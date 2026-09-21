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
        { type: "diagram", kind: "carte-documents", caption: l("En or, les actes signés par le client (règle réglementaire : un responsable approuve chaque changement de texte) ; en bleu, les avis envoyés au client (relu par un autre membre du desk) ; en gris, ce qui va aux contreparties (libre).", "In gold, the acts signed by the client (regulatory rule: a manager approves every wording change); in blue, the notices sent to the client (reviewed by another desk member); in grey, what goes to counterparties (free).") },
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
      id: "ouverture",
      title: l("Ouverture de la relation", "Opening the relationship"),
      blocks: [
        {
          type: "steps",
          items: [
            l("Le client ouvre son dossier dans Mon espace : identité, pièces, RIB, profil financier. Rien ne se signe encore.", "The client opens their file in My space: identity, documents, bank details, financial profile. Nothing is signed yet."),
            l("Le desk revoit le dossier (KYC, sanctions / PPE, cotation du risque) et l'approuve ; le dossier d'ouverture SVT / dépositaire part (préparé par le desk, signé Purpose, reçu par le dépositaire).", "The desk reviews the file (KYC, sanctions / PEP, risk rating) and approves it; the custodian file goes out (prepared by the desk, signed by Purpose, received by the custodian)."),
            l("Le client accepte la convention par code à usage unique (ou la signe sur papier) ; copie dans Mes documents. Si un tiers doit passer les ordres : le mandat, préparé depuis le dossier, signé par le client et le mandataire.", "The client accepts the agreement by one-time code (or signs it on paper); copy in My documents. If a third party must place orders: the mandate, prepared from the file, signed by the client and the agent."),
            l("Le dépositaire ouvre le compte-titres ; le desk saisit son numéro. Le compte est actif : les prises fermes sont possibles.", "The custodian opens the securities account; the desk enters its number. The account is active: firm orders are possible."),
          ],
        },
      ],
    },
    {
      id: "primaire",
      title: l("Souscription sur le marché primaire (adjudication, APE)", "Primary market subscription (auction, APE)"),
      blocks: [
        {
          type: "steps",
          items: [
            l("Client : intention ferme sur la fiche (montant, prix limite, canal), deux canaux prouvés, profil vérifié. État : reçue.", "Client: firm intention on the line (amount, limit price, channel), two proven channels, profile checked. State: received."),
            l("Desk : vérifie et confirme. Naissent le bulletin d'ordre (préparé par Purpose, signé « lu et approuvé » par le client) et l'appel de fonds (préparé par Purpose, exécuté par le client). État : confirmée.", "Desk: checks and confirms. Born: the order form (prepared by Purpose, signed “read and approved” by the client) and the call for funds (prepared by Purpose, executed by the client). State: confirmed."),
            l("Client : signe le bulletin (WhatsApp, e-mail, agence) et vire sur le compte ségrégué ; le desk marque « signé » et « fonds reçus ».", "Client: signs the order form (WhatsApp, e-mail, branch) and wires to the segregated account; the desk marks “signed” and “funds received”."),
            l("Desk : soumet l'adjudication en un bordereau SVT (préparé par le desk, signé Purpose, reçu par le SVT). État : transmise.", "Desk: submits the auction in one slip (prepared by the desk, signed by Purpose, received by the primary dealer). State: transmitted."),
            l("Trésor / SVT : résultat. Avis de résultat et d'allocation, ou avis de non-allocation avec restitution des fonds (préparés par Purpose, envoyés au client). État : servie ou non servie.", "Treasury / dealer: result. Result and allotment notice, or non-allotment notice with funds returned (prepared by Purpose, sent to the client). State: served or not served."),
            l("Dépositaire : règlement-livraison, titres inscrits au nom du client. Avis d'opéré (préparé par Purpose, envoyé au client). État : réglée.", "Custodian: settlement-delivery, securities registered in the client's name. Contract note (prepared by Purpose, sent to the client). State: settled."),
          ],
        },
      ],
    },
    {
      id: "secondaire",
      title: l("Achat, vente et cession sur le marché secondaire ; OPCVM", "Purchase, sale on the secondary market; funds"),
      blocks: [
        {
          type: "table",
          head: [l("Étape", "Step"), l("Achat d'une ligne cotée", "Purchase of a listed line"), l("Vente · cession", "Sale"), l("OPCVM (souscription · rachat)", "Funds (subscription · redemption)")],
          rows: [
            [l("Intention", "Intention"), l("quantité, prix limite ou marché", "quantity, limit or market price"), l("quantité détenue, prix limite", "quantity held, limit price"), l("montant, ou parts", "amount, or units")],
            [l("Confirmation : documents", "Confirmation: documents"), l("bulletin d'ordre (passage marché secondaire), signé ; appel de fonds", "order form (secondary market passage), signed; call for funds"), l("ordre de cession avec l'attestation du cédant, signé ; pas d'appel de fonds", "sale order with the seller's attestation, signed; no call for funds"), l("bulletin de souscription ou ordre de rachat, signé ; appel de fonds pour une souscription", "subscription form or redemption order, signed; call for funds for a subscription")],
            [l("Transmission", "Transmission"), l("à la société de bourse ; sa confirmation d'exécution est classée au Dépôt", "to the broker; its execution confirmation is filed in the Repository"), l("à la société de bourse (ou au SVT pour un rachat de bons)", "to the broker (or the dealer for a bill buyback)"), l("bordereau OPCVM par société de gestion, avant le cut-off", "fund slip per management company, before the cut-off")],
            [l("Règlement", "Settlement"), l("avis d'opéré : cours, frais, coupon couru", "contract note: price, fees, accrued coupon"), l("avis d'opéré : produit net viré sur le compte du client", "contract note: net proceeds wired to the client's account"), l("avis d'opéré : parts, VL, droits", "contract note: units, NAV, fees")],
          ],
        },
      ],
    },
    {
      id: "vie",
      title: l("Vie du titre et fin de la relation", "Life of the security and end of the relationship"),
      blocks: [
        {
          type: "steps",
          items: [
            l("Coupon ou remboursement payé par l'émetteur : avis de coupon / remboursement, un par flux, depuis le dossier du client ou en lot depuis Aujourd'hui ; envoyé seulement par un canal prouvé, sinon gardé au dossier.", "Coupon or redemption paid by the issuer: coupon / redemption notice, one per flow, from the client file or in batch from Today; sent only on a proven channel, otherwise kept in the file."),
            l("Relevé de position et attestation de détention : à la demande du client (Mon espace) ou du desk.", "Statement and attestation: at the client's (My space) or the desk's request."),
            l("Réclamation : le client la dépose depuis Mon espace (faits, demande, opération concernée), signée par code ; accusé de réception sous deux jours ouvrés, réponse sous trente jours, recours COSUMAF ; le desk enregistre celles reçues par appel, WhatsApp, e-mail ou courrier.", "Complaint: the client files it from My space (facts, request, operation concerned), signed by code; acknowledgement within two business days, answer within thirty days, COSUMAF as recourse; the desk records those received by phone, WhatsApp, e-mail or mail."),
            l("Transfert ou clôture : le desk prépare l'ordre (toutes les positions, certaines, ou clôture sans position), le client le signe, le dossier passe « en clôture » (plus de nouvelle intention), le dépositaire confirme, le dossier est « clos » et le relevé final est joint.", "Transfer or closure: the desk prepares the order (all positions, some, or closure with no position), the client signs it, the file goes “in closure” (no new intention), the custodian confirms, the file is “closed” and the final statement is attached."),
          ],
        },
        { type: "note", kind: "rule", text: l("Les trois rôles ne se mélangent jamais : Purpose prépare, le client signe ce qui l'engage, le desk signe pour Purpose ce qui va aux contreparties. Un avis ne porte pas de signature : c'est un constat, numéroté et gardé.", "The three roles never blur: Purpose prepares, the client signs what binds them, the desk signs for Purpose what goes to counterparties. A notice carries no signature: it is a record, numbered and kept.") },
        { type: "link", href: "/desk/clients", label: l("Dossiers › Actes et avis", "Files › Acts and notices"), hint: l("mandat, avis de coupon, transfert / clôture, réclamation reçue", "mandate, coupon notice, transfer / closure, complaint received") },
      ],
    },
  ],
};
