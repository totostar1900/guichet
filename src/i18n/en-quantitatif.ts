/**
 * La vue quantitative d'un client : ce qu'il a traité avec la maison.
 *
 * Un dictionnaire à part, comme les prélèvements ou les virements : la page
 * porte un vocabulaire qui ne sert qu'à elle, et le fondre dans « en-rest »
 * rendrait ce fichier-là encore plus difficile à relire.
 */
export const EN_QUANTITATIF: Record<string, string> = {
  "Ce qu'il a traité avec nous": "What they have traded with us",
  "Aucun dossier choisi.": "No file selected.",
  "Ouvrir les dossiers": "Open the files",
  "Retour au dossier": "Back to the file",
  "(sans nom)": "(no name)",
  "Traité sur la plage": "Traded over the range",
  "{n} opération(s) réglée(s)": "{n} settled operation(s)",
  "Entrées d'espèces": "Cash in",
  "sorties : {m}": "out: {m}",
  "Commissions perçues": "Fees received",
  "{p} % du volume": "{p} % of the volume",
  "rien n'a encore été traité": "nothing has been traded yet",
  "Ticket médian": "Median ticket",
  "sur les opérations réglées": "over the settled operations",
  "Servi, jamais réglé": "Allotted, never settled",
  "rien en souffrance": "nothing outstanding",
  "Durée d'observation": "Observation period",
  "Depuis l'ouverture": "Since the opening",
  "1 an": "1 year",
  "2 ans": "2 years",
  "3 ans": "3 years",
  "5 ans": "5 years",
  Découpage: "Breakdown",
  Mensuel: "Monthly",
  Trimestriel: "Quarterly",
  Annuel: "Annual",
  "La plage ne contient pas une tranche entière de cette taille.": "The range does not hold one whole slice of that size.",
  "Du {a} au {b}, en {n} tranche(s).": "From {a} to {b}, in {n} slice(s).",
  "La durée demandée dépasse l'histoire du compte : la plage part de son premier geste, le {d}.":
    "The period asked for is longer than the account's history: the range starts at its first move, on {d}.",
  "Rien n'a été traité sur cette plage. Élargissez la durée, ou regardez la chronologie plus bas.":
    "Nothing was traded over this range. Widen the period, or read the chronology below.",
  "Volume traité": "Volume traded",
  "compté au jour du règlement": "counted on the settlement day",
  "Achats et souscriptions": "Purchases and subscriptions",
  "Ventes et rachats": "Sales and redemptions",
  "Mouvements d'espèces": "Cash movements",
  "à la date de valeur": "on the value date",
  Entrées: "In",
  Sorties: "Out",
  "Dont jamais réglé": "Of which never settled",
  "Ce que la maison a perçu": "What the firm received",
  "courtage et droits de garde, tels qu'ils ont été débités": "brokerage and custody fees, as they were debited",
  "Les opérations, dans l'ordre": "The operations, in order",
  "{n} sur la plage": "{n} over the range",
  "jamais réglé": "never settled",
  "Aucune opération sur cette plage.": "No operation over this range.",
  "Tout se recalcule depuis le journal des ordres et les mouvements d'espèces : aucun total n'est stocké. Un chiffre qui semble faux se corrige à sa source.":
    "Everything is recomputed from the order journal and the cash movements: no total is stored. A figure that looks wrong is corrected at its source.",
};
