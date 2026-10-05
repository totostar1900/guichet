/**
 * LES MOTS DU BANDEAU DE SUIVI.
 *
 * Trois zones, deux lignes chacune : tout y est court, et c'est précisément le
 * risque. Une clef comme « mise » ou « période » traduite ici vaudrait pour
 * toute l'application, puisque le dictionnaire porte la clef française. Chaque
 * clef porte donc son contexte, et celles qui existaient déjà ailleurs
 * (« sur la période », « depuis l'origine ») sont reprises telles quelles.
 */
export const EN_BANDEAU: Record<string, string> = {
  /* ce que le bandeau est en train de lire */
  "séance lue": "session read",
  "dernière séance": "latest session",
  "point lu": "point read",
  "dernier point": "latest point",
  "exercice lu": "year read",
  "dernier exercice": "latest year",
  "VL lue": "NAV read",
  "dernière VL": "latest NAV",
  "dernier cours": "last price",
  "période épinglée": "pinned period",
  "Total du bilan et fonds propres par année": "Total assets and equity by year",
  /* l'épingle : ce que le bandeau dit quand une date, ou deux, sont posées */
  "épinglée": "pinned",
  "épinglé": "pinned",
  "une seconde date pour l'écart": "a second date for the change",
  "une seconde date pour recadrer": "a second date to reframe",
  "un second flux pour le total": "a second flow for the total",
  "une seconde date": "a second date",
  "{n} séances, {m} bougées": "{n} sessions, {m} moved",
  /* la feuille du compte */
  "Nos bureaux": "Our offices",
  "Nom et ville": "Name and city",
  /* les écarts */
  "sur un an": "year on year",
  "vs la mise": "vs outlay",
  "du capital": "of capital",
  "en flottant": "free float",
  "début de période": "start of period",
  "est épinglée": "is pinned",
  "échangé sur la période": "traded over the period",
  /* l'échéancier d'une ligne, au repos */
  "l'échéancier": "the schedule",
  "{n} versements": "{n} payments",
  "ce qui revient": "what comes back",
  "la mise": "the outlay",
  "de plus": "more",
};
