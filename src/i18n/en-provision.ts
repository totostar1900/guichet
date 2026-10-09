/**
 * La page de la provision (/moi/provision, reprise le 9 octobre 2026).
 *
 * Son fichier, comme l'annexe tarifaire et les prélèvements : ce sont les
 * mots de l'argent qui dort chez la maison, et ils se relisent ensemble. Un
 * client qui conteste cite ces phrases.
 */
export const EN_PROVISION: Record<string, string> = {
  /* ---- le solde et ses états ---- */
  "Ce que la maison vous doit": "What the firm owes you",
  "dernier mouvement le {d}": "last entry on {d}",
  "Pour votre prochain ordre, ou à reprendre quand vous voulez.": "For your next order, or to take back whenever you want.",
  "Par vos ordres signés. Cette somme ne sort qu'au règlement, et ce qui n'est pas consommé revient.":
    "By your signed orders. This sum leaves only at settlement, and whatever is not used comes back.",
  "{m} FCFA placés": "{m} FCFA placed",
  "en parts de {f}, inscrites à votre nom.": "in units of {f}, registered in your name.",
  "Hors de ce solde : c'est une ligne de votre portefeuille.": "Outside this balance: it is a line of your portfolio.",
  "La voir": "See it",
  "Me la faire virer": "Have it transferred to me",

  /* ---- les gestes ---- */
  "Ce que vous pouvez en faire": "What you can do with it",
  "Trois gestes sont les vôtres. Le quatrième, celui qui règle vos ordres, se fait sans vous.":
    "Three moves are yours. The fourth, the one that settles your orders, happens without you.",

  /* 1 · l'alimenter */
  "Deux chemins : une fois, ou chaque mois": "Two ways: once, or every month",
  "Prélèvement actif": "Direct debit active",
  "Par virement": "By transfer",
  "une fois": "once",
  "Le motif rattache votre virement à votre compte : sans lui, il arrive sans nom. Le compte émetteur doit être au vôtre.":
    "The reference attaches your transfer to your account: without it, it arrives nameless. The sending account must be in your name.",
  "Par prélèvement": "By direct debit",
  "chaque mois": "every month",
  "{m} FCFA le {j} de chaque mois": "{m} FCFA on day {j} of each month",
  "Mandat signé": "Mandate signed",
  "prochain prélèvement le {d}, annoncé {n} jours avant": "next debit on {d}, announced {n} days ahead",
  "suspendu après deux rejets : votre banque a refusé le prélèvement": "suspended after two rejections: your bank refused the debit",
  "Changer le montant": "Change the amount",
  "Révoquer le mandat": "Revoke the mandate",
  "Chaque prélèvement est annoncé avant de partir, et nous ne prélevons jamais plus que le montant que vous avez signé.":
    "Every debit is announced before it goes out, and we never take more than the amount you signed.",
  "Faites venir une somme fixe chaque mois, sans y penser. Vous signez l'autorisation une fois ; chaque prélèvement vous est annoncé cinq jours avant, et jamais au-delà du montant signé.":
    "Bring in a fixed sum every month, without thinking about it. You sign the authorisation once; every debit is announced to you five days ahead, and never beyond the amount signed.",
  "Mettre en place un prélèvement": "Set up a direct debit",
  "Vous fixez le montant et le jour, et vous l'arrêtez quand vous voulez.": "You set the amount and the day, and you stop it whenever you want.",

  /* Les boutons de recopie : le motif surtout, qu'on tape de mémoire. */
  "Copier {quoi}": "Copy {quoi}",
  copier: "copy",
  copié: "copied",
  "le motif du virement": "the transfer reference",
  "le bénéficiaire": "the beneficiary",
  "la banque": "the bank",
  "le RIB": "the account details",

  /* 2 · la faire travailler */
  "La faire travailler": "Put it to work",
  "En parts d'un fonds monétaire, à votre nom": "In units of a money market fund, in your name",
  "Pour qu'elle ne dorme pas, placez tout ou partie du disponible. Le rendement est celui du fonds ; nous n'en promettons aucun.":
    "So that it does not lie idle, place all or part of what is available. The return is the fund's; we promise none.",
  "Montant à placer": "Amount to place",
  "Tout le disponible": "All that is available",
  "Vous n'avez que {m} FCFA de disponible : le reste est mis de côté par vos ordres en cours, ou déjà placé.":
    "You only have {m} FCFA available: the rest is set aside by your orders in progress, or already placed.",
  "droits d'entrée {p} %": "entry fee {p} %",
  "Placer ici": "Place here",
  "Une fois placée, la somme ne règle plus un ordre : il faut d'abord racheter les parts, ce qui prend le délai de centralisation du fonds.":
    "Once placed, the sum no longer settles an order: the units must first be redeemed, which takes the fund's centralisation period.",

  /* 3 · la reprendre */
  "La reprendre": "Take it back",
  "Sous 72 heures ouvrables": "Within 72 working hours",
  "Votre disponible vous est versé sur demande, sur {c}, le compte déclaré à l'ouverture et le seul possible.":
    "What is available is paid to you on request, to {c}, the account declared at opening and the only one possible.",
  "Votre disponible vous est versé sur demande, sur le compte bancaire déclaré à l'ouverture et sur lui seul.":
    "What is available is paid to you on request, to the bank account declared at opening and to that account only.",
  "Il part dans les soixante-douze heures ouvrables qui suivent votre demande, et le desk recalcule au moment du virement : un coupon qui tombe d'ici là s'y ajoute.":
    "It leaves within seventy-two working hours of your request, and the desk recalculates at the moment of the transfer: a coupon falling in between is added to it.",

  /* Celui qui se fait sans vous */
  "Régler un ordre": "Settle an order",
  "Sans virement, sans délai": "No transfer, no wait",
  "Sans vous": "Without you",
  "Quand vous signez un ordre, le montant est mis de côté sur cette provision : vous n'avez rien à virer, et rien à faire ici.":
    "When you sign an order, the amount is set aside on this provision: you have nothing to transfer, and nothing to do here.",
  "Si l'ordre n'est servi qu'en partie, ou pas du tout, la différence redevient disponible le jour où le résultat est connu.":
    "If the order is served only in part, or not at all, the difference becomes available again on the day the result is known.",
  "Vos ordres en cours": "Your orders in progress",

  /* ---- le pied ---- */
  "D'où vient ce solde": "Where this balance comes from",
  "Chaque mouvement est porté au journal, à sa date de valeur.": "Every entry is recorded in the journal, at its value date.",
  "Le journal de vos mouvements": "The journal of your entries",
  "Rien : ni la tenue de la provision, ni le virement de retour.": "Nothing: neither holding the provision, nor the transfer back.",
  "L'annexe tarifaire": "The fee schedule",
};
