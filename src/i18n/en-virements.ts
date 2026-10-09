/**
 * Les virements bancaires entrants, côté desk (page /desk/virements, 9 octobre 2026).
 *
 * Leur fichier, comme les prélèvements, parce qu'ils forment un vocabulaire à
 * eux : un crédit, un motif, un rattachement, une restitution, une empreinte.
 * Les quatre règles de la page s'y relisent ensemble, et ce sont elles qu'un
 * contrôleur demandera.
 */
export const EN_VIREMENTS: Record<string, string> = {
  "Virements reçus": "Transfers received",
  "Sans numéro de compte par client, un virement entrant n'est rattachable que par le motif que le client y a écrit. Cette page lit le relevé, propose un client pour chaque crédit, et attend une confirmation. Elle est aussi le registre de ce qui est arrivé sans nom.":
    "Without a per-client account number, an incoming transfer can only be matched by the reference the client wrote on it. This page reads the statement, proposes a client for each credit, and waits for a confirmation. It is also the register of what arrived with no name.",
  "Rattachés ce mois": "Matched this month",
  "Nombre de virements": "Number of transfers",
  "En attente d'un nom": "Waiting for a name",
  "Au-delà de {n} jours": "Older than {n} days",
  Restitués: "Returned",

  "Lire le relevé": "Read the statement",
  "Collez les lignes de crédit. La machine lit, vous confirmez.": "Paste the credit lines. The machine reads, you confirm.",
  "Lignes de crédit du relevé": "Credit lines from the statement",
  "Une ligne déjà inscrite se reconnaît et ne se propose plus : un relevé dont la période chevauche la précédente ne crédite pas deux fois.":
    "A line already recorded is recognised and no longer offered: a statement whose period overlaps the previous one does not credit twice.",
  "{n} lignes non lues": "{n} lines not read",
  "Il y manque une date ou un montant. Rien n'est perdu : elles sont ici.": "They lack a date or an amount. Nothing is lost: they are here.",
  "{n} crédits lus, à confirmer un par un": "{n} credits read, to confirm one by one",
  "Rien de nouveau dans ce relevé": "Nothing new in this statement",
  "Rien n'est inscrit au journal avant votre geste.": "Nothing reaches the cash journal before you act.",
  "sans référence": "no reference",
  "déjà inscrite": "already recorded",
  "C'est un second virement identique": "This is a second, identical transfer",
  "aucun intitulé de compte déclaré": "no account name declared",
  "Proposé parce qu'un seul caractère diffère de son motif.": "Proposed because a single character differs from their reference.",
  "Référence exacte, intitulé concordant": "Exact reference, matching account name",
  "Fonds d'un tiers": "Third party funds",
  "Intitulé de compte non déclaré": "Account name not declared",
  "Référence approchante": "Near reference",
  "Aucune référence lisible": "No readable reference",
  "L'article 3 refuse et restitue : le motif nomme ce client, le compte débité n'est pas le sien.":
    "Article 3 refuses and returns them: the reference names this client, the account debited is not theirs.",
  "Le motif ne porte pas de référence. Un nom ne suffit pas à inscrire.": "The reference field carries none. A name is not enough to record a credit.",
  Rattacher: "Match",
  "Rattacher quand même": "Match anyway",
  "Mettre en attente": "Leave waiting",
  Restituer: "Return it",
  "Pourquoi cet argent repart": "Why this money goes back",
  "Choisir un client": "Choose a client",

  "En attente, sans nom": "Waiting, with no name",
  "Rangés par ancienneté : c'est l'âge qui appelle quelqu'un, pas le montant.": "Ordered by age: it is the age that calls for someone, not the amount.",
  "Rien n'attend un nom. C'est l'état normal, et il se vérifie en un coup d'œil.": "Nothing is waiting for a name. That is the normal state, and it reads at a glance.",
  "motif vide": "empty reference",
  "{nom} ? Un seul caractère sépare ce motif de {ref}.": "{nom}? A single character separates this reference from {ref}.",

  "Rattachés récemment": "Matched recently",
  "Un rattachement ne se défait pas : une erreur se répare par un mouvement inverse au journal du client.":
    "A match is not undone: a mistake is repaired by an opposite entry in the client's cash journal.",
  "Aucun virement rattaché pour l'instant.": "No transfer matched yet.",
  "Le virement de retour se fait en banque ; la ligne garde son motif.": "The return transfer is made at the bank; the line keeps its reason.",

  "{m} FCFA sont arrivés sans nom ({n} virements) : ils ne sont dus à personne et n'entrent pas dans le chiffre ci-dessus, mais ils sont bien en banque.":
    "{m} FCFA arrived with no name ({n} transfers): they are owed to nobody and do not count in the figure above, but they are indeed at the bank.",
  "Les rattacher →": "Match them →",
  "Les quatre règles que cette page tient": "The four rules this page holds",
  "Un crédit est un fait, un rattachement est une décision. La ligne du relevé existe dès sa lecture, même sans nom : sans cela, l'argent arrivé sans nom n'existerait nulle part et personne ne saurait qu'il attend.":
    "A credit is a fact, a match is a decision. The statement line exists from the moment it is read, even with no name: without that, money arrived with no name would exist nowhere and nobody would know it is waiting.",
  "La machine lit, une personne confirme. Une référence exacte avec un intitulé concordant se rattache d'un geste ; tout le reste se montre et attend.":
    "The machine reads, a person confirms. An exact reference with a matching account name is matched in one gesture; everything else is shown and waits.",
  "Les fonds d'un tiers se refusent et se restituent, c'est l'article 3 de la convention. La page compare donc toujours le donneur d'ordre à l'intitulé déclaré, et c'est le seul contrôle qu'elle fasse d'office.":
    "Third party funds are refused and returned, that is article 3 of the agreement. The page therefore always compares the payer with the declared account name, and that is the only check it makes by itself.",
  "Une ligne de relevé ne s'inscrit qu'une fois. L'empreinte est unique en base : un relevé relu ne crée pas un double crédit, et c'est l'erreur que personne ne verrait passer.":
    "A statement line is recorded only once. The fingerprint is unique in the database: a statement read twice does not create a double credit, and that is the mistake nobody would catch.",
};
