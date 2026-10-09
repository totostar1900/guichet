/**
 * L'annexe tarifaire (page /info/tarifs, 9 octobre 2026).
 *
 * Son fichier, comme les prélèvements et les virements, parce qu'elle forme
 * un vocabulaire à elle : ce que la maison prend, ce que le produit prend, ce
 * qui ne se facture pas. Ce sont les phrases qu'un client cite quand il
 * conteste, et elles se relisent ensemble.
 */
export const EN_TARIFS: Record<string, string> = {
  "Annexe tarifaire": "Fee schedule",
  "Ce que vous payez": "What you pay",
  "Tout ce qui se facture est ici, et ce qui ne se facture pas y est aussi : un service absent d'une liste finit par être réclamé un jour. Les montants sont en francs CFA, hors fiscalité.":
    "Everything that is charged is here, and so is everything that is not: a service missing from a list ends up being claimed one day. Amounts are in CFA francs, before tax.",

  "À l'opération": "Per operation",
  "Ce qui est prélevé au moment où vous agissez, par nature d'opération.": "What is taken at the moment you act, by kind of operation.",
  "Ce que vous faites": "What you do",
  "Ce que {c} prend": "What {c} takes",
  "Ce que le produit prend": "What the product takes",
  "minimum {m} FCFA": "minimum {m} FCFA",
  "Sortir d'un fonds": "Leaving a fund",
  "Droits d'entrée du fonds : {p}": "The fund's entry fee: {p}",
  "Droits d'entrée du fonds, de {a} à {b} selon le fonds, indiqués sur sa fiche": "The fund's entry fee, from {a} to {b} depending on the fund, shown on its sheet",
  "Les droits d'entrée figurent sur la fiche de chaque fonds.": "Entry fees are shown on each fund's sheet.",
  "Droits de sortie du fonds, le cas échéant": "The fund's exit fee, if any",
  "Les droits de sortie du premier, puis les droits d'entrée du second": "The first fund's exit fee, then the second fund's entry fee",
  "Les frais de marché de la BVMAC, s'il en est appliqué": "The BVMAC's market fees, if any are applied",

  "Dans le temps": "Over time",
  "Ce qui se facture parce que le service dure, et non parce que vous agissez.": "What is charged because the service lasts, and not because you act.",
  "Ce que nous assurons": "What we provide",
  "Ce que cela coûte": "What it costs",
  "Comment il se calcule": "How it is worked out",
  "Conservation de vos titres": "Custody of your securities",
  "{n} points de base par an": "{n} basis points a year",
  "Sur la valeur de conservation, au prorata des jours gardés{f}.": "On the custody value, pro rata to the days held{f}.",
  ", en deçà de {m} FCFA rien n'est dû": ", below {m} FCFA nothing is due",
  "Le barème n'est pas ouvert : aucun droit de garde n'est prélevé aujourd'hui.": "The scale is not open: no custody fee is taken today.",
  "Tenue de votre compte-titres": "Keeping your securities account",
  "Comprise dans le service": "Included",
  "Votre provision chez nous": "Your provision with us",
  "Aucun frais de tenue, aucun frais d'inactivité.": "No holding fee, no dormancy fee.",

  "Ce qui ne se facture pas": "What is not charged",
  "Nommé ici pour que ce soit opposable, et non sous-entendu.": "Named here so that it is binding, and not merely implied.",
  "Ouverture du compte-titres, et du sous-compte chez le teneur de compte": "Opening the securities account, and the sub-account at the account keeper",
  "Versement de votre solde vers votre compte bancaire": "Paying your balance out to your bank account",
  "Mandat de prélèvement, et chaque prélèvement présenté": "The direct debit mandate, and each debit presented",
  "Épargne programmée, et chacun de ses préavis": "The savings plan, and each of its notices",
  "Bulletins, avis d'opéré, relevés, attestations et duplicata": "Order forms, contract notes, statements, certificates and duplicates",
  "Clôture du compte": "Closing the account",
  "Duplicata d'un document déjà émis": "A duplicate of a document already issued",

  "Ce que vous payez sans que cela nous revienne": "What you pay that does not come to us",
  "Les frais de gestion d'un fonds sont prélevés chaque année dans sa valeur liquidative. Vous ne les voyez pas passer, et ils réduisent pourtant votre rendement plus sûrement que tout le reste de cette page. La fiche de chaque fonds les indique.":
    "A fund's management fees are taken every year out of its net asset value. You never see them go, and yet they reduce your return more surely than anything else on this page. Each fund's sheet states them.",
  "La fiscalité dépend de l'instrument et de votre État de résidence. Les rendements affichés sont bruts : ce que vous touchez est après retenue.":
    "Tax depends on the instrument and on your State of residence. The yields shown are gross: what you receive is after withholding.",

  "Tarifs en vigueur depuis le {d}.": "Fees in force since {d}.",
  "Tarifs en vigueur ce jour.": "Fees in force today.",
  "Toute modification vous est notifiée trente jours avant son application, comme le prévoit l'article 6 de votre convention.":
    "Any change is notified to you thirty days before it applies, as article 6 of your agreement provides.",
  "L'annexe tarifaire que cite l'article 6 de votre convention : ce qui se facture, et ce qui ne se facture pas.":
    "The fee schedule that article 6 of your agreement refers to: what is charged, and what is not.",
  "Lire l'annexe":
    "Read the schedule",
};
