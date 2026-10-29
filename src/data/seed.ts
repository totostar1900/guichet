import type { Contact, IntakeItem, Intent, LigneSondee, Offer } from "@/lib/domain/types";

/**
 * UNE CLÔTURE QUI RESTE DEVANT, quel que soit le jour où l'on sème.
 *
 * LE TROU QUE CELA BOUCHE. Toutes les séances de ce fichier portent les dates
 * VRAIES de communiqués de septembre 2026 — c'est ce qui en fait un relevé et
 * non une fixture, et c'est pourquoi on n'y touche pas. Mais elles sont donc
 * toutes passées : sur le dépôt mémoire, « Ce qui ferme bientôt » ne paraît
 * JAMAIS, et le seuil des sept jours qui déplace la bande sur la page
 * d'arrivée n'a jamais pu être vu travailler en développement.
 *
 * TROIS SÉANCES ILLUSTRATIVES LE RÉPARENT, et elles seules calculent leur
 * date. Une date fixe serait périmée la semaine suivante, et l'on retomberait
 * dans le même trou sans s'en apercevoir — c'est exactement ce qui est arrivé
 * à celles d'en haut.
 */
const cloture = (dansNJours: number, heure = "12:00:00"): string => {
  const d = new Date();
  d.setDate(d.getDate() + dansNJours);
  return `${d.toISOString().slice(0, 10)}T${heure}`;
};
const leJour = (dansNJours: number): string => cloture(dansNJours).slice(0, 10);

/**
 * Seed offers : the real September 2026 deal flow, from:
 *  - Communiqué n° 0762/MCFB (RCA, 9 sept. 2026): 3 OTA lines + 2 buybacks
 *  - Communiqués n° 000473 / 000474 MFBPP (Congo, 11 sept. 2026): OTA 6 ans, BTA 52 sem.
 *  - Teaser BHC 2e tranche (août 2026)
 * Desk prices follow the desk message of 14 sept. (94 / 93 / 92, com. 0,50 %).
 * Items flagged isExample are illustrative.
 */
export const SEED_OFFERS: Offer[] = [
  {
    id: "rca-ota-c-2028",
    kind: "OTA",
    operation: "abondement",
    country: "RCA",
    countryName: "République centrafricaine",
    issuer: "Trésor public de la République centrafricaine",
    title: "OTA 6,50 % · 14 févr. 2028",
    isin: "CF2K00000056",
    status: "published",
    blurb:
      "Ligne la plus courte des trois, donc celle où la décote pèse le plus sur le rendement annuel. Les intérêts courus depuis février (214 jours) sont avancés au règlement et récupérés au coupon du 14 févr. 2027.",
    documents: [],
    opensAt: "2026-09-09T18:42:00",
    deadlineAt: "2026-09-14T12:00:00",
    resultsAt: "2026-09-14T15:00:00",
    settleOn: "2026-09-16",
    maturityOn: "2028-02-14",
    lastCouponOn: "2026-02-14",
    nominal: 10_000,
    couponRate: 6.5,
    pricePct: 94,
    commissionPct: 0,
    minTitles: 100,
    sizeLabel: "7,5 à 10 Mds FCFA",
    version: 1,
    pricedAt: "2026-09-09T18:42:00",
  },
  {
    id: "rca-ota-a-2028",
    kind: "OTA",
    operation: "nouvelle_ligne",
    country: "RCA",
    countryName: "République centrafricaine",
    issuer: "Trésor public de la République centrafricaine",
    title: "OTA 6,25 % · 16 sept. 2028",
    isin: "CF2A00000132",
    status: "published",
    blurb: "Ligne nouvelle : aucun coupon couru, décaissement exactement au prix. Deux coupons pleins puis le capital.",
    documents: [],
    opensAt: "2026-09-09T18:42:00",
    deadlineAt: "2026-09-14T12:00:00",
    resultsAt: "2026-09-14T15:00:00",
    settleOn: "2026-09-16",
    maturityOn: "2028-09-16",
    lastCouponOn: null,
    nominal: 10_000,
    couponRate: 6.25,
    pricePct: 93,
    commissionPct: 0,
    minTitles: 100,
    sizeLabel: "7,5 à 10 Mds FCFA",
    version: 1,
    pricedAt: "2026-09-09T18:42:00",
  },
  {
    id: "rca-ota-b-2029",
    kind: "OTA",
    operation: "abondement",
    country: "RCA",
    countryName: "République centrafricaine",
    issuer: "Trésor public de la République centrafricaine",
    title: "OTA 6,50 % · 12 août 2029",
    isin: "CF2J00000232",
    status: "published",
    blurb: "La plus longue : trois coupons et le remboursement en août 2029. Coupon couru faible (35 jours).",
    documents: [],
    opensAt: "2026-09-09T18:42:00",
    deadlineAt: "2026-09-14T12:00:00",
    resultsAt: "2026-09-14T15:00:00",
    settleOn: "2026-09-16",
    maturityOn: "2029-08-12",
    lastCouponOn: "2026-08-12",
    nominal: 10_000,
    couponRate: 6.5,
    pricePct: 92,
    commissionPct: 0,
    minTitles: 100,
    sizeLabel: "5 à 7,5 Mds FCFA",
    version: 1,
    pricedAt: "2026-09-09T18:42:00",
  },
  {
    id: "rca-rachat-2026-11",
    kind: "RACHAT",
    operation: "rachat",
    country: "RCA",
    countryName: "République centrafricaine",
    issuer: "Trésor public de la République centrafricaine",
    title: "Rachat OTA 3 ans · éch. 29 nov. 2026",
    isin: "CF2J00000091",
    status: "published",
    blurb:
      "Le Trésor rachète cette ligne à 100 % du nominal, dix semaines avant son échéance. Utile pour libérer de la trésorerie ou réinvestir sur les lignes décotées de la même adjudication.",
    documents: [],
    opensAt: "2026-09-09T18:42:00",
    deadlineAt: "2026-09-14T12:00:00",
    resultsAt: "2026-09-14T15:00:00",
    settleOn: "2026-09-16",
    maturityOn: "2026-11-29",
    nominal: 10_000,
    pricePct: 100,
    commissionPct: 0,
    sizeLabel: "8,8 Mds FCFA rachetés",
    version: 1,
    pricedAt: "2026-09-09T18:42:00",
  },
  {
    id: "rca-rachat-2026-12",
    kind: "RACHAT",
    operation: "rachat",
    country: "RCA",
    countryName: "République centrafricaine",
    issuer: "Trésor public de la République centrafricaine",
    title: "Rachat OTA 6 ans · éch. 4 déc. 2026",
    isin: "CF2L00000014",
    status: "published",
    blurb: "Rachat au pair de la ligne 6 ans arrivant à échéance en décembre. Les porteurs cèdent via leur intermédiaire avant lundi midi.",
    documents: [],
    opensAt: "2026-09-09T18:42:00",
    deadlineAt: "2026-09-14T12:00:00",
    resultsAt: "2026-09-14T15:00:00",
    settleOn: "2026-09-16",
    maturityOn: "2026-12-04",
    nominal: 10_000,
    pricePct: 100,
    commissionPct: 0,
    sizeLabel: "1,2 Md FCFA rachetés",
    version: 1,
    pricedAt: "2026-09-09T18:42:00",
  },
  {
    id: "cg-ota-2028",
    kind: "OTA",
    operation: "abondement",
    country: "Congo",
    countryName: "République du Congo",
    issuer: "Trésor public de la République du Congo",
    title: "OTA 6,00 % · 31 mars 2028",
    isin: "CG2L00000012",
    status: "published",
    blurb:
      "Abondement de la ligne 6 ans du Congo, 1 an et 6 mois restants. Le prix proposé sera arrêté par le desk une fois les résultats RCA connus.",
    documents: [{ name: "Communiqué d'annonce n° 000473/MFBPP", meta: "PDF · 1 p." }],
    opensAt: "2026-09-11T17:00:00",
    deadlineAt: "2026-09-15T12:00:00",
    resultsAt: "2026-09-15T15:00:00",
    settleOn: "2026-09-17",
    maturityOn: "2028-03-31",
    lastCouponOn: "2026-03-31",
    nominal: 10_000,
    couponRate: 6,
    pricePct: 100,
    priceNote: "indicatif : prix à fixer par le desk",
    commissionPct: 0,
    minTitles: 100,
    sizeLabel: "10 Mds FCFA",
    version: 0,
  },
  /* Deux fonds, et de quoi passer de l'un à l'autre.

     L'étagère des OPCVM était vide dans la démonstration : aucun fonds, donc ni
     comparaison, ni courbe, ni rachat, et le passage d'un fonds à l'autre n'avait
     nulle part où se montrer. Deux suffisent, l'un calme et l'autre moins, avec
     des droits de sortie sur le premier pour que le produit d'un rachat ne soit
     pas exactement la valeur des parts. */
  {
    id: "fcp-monetaire",
    kind: "FONDS",
    operation: "secondaire",
    country: "Cameroun",
    countryName: "République du Cameroun",
    issuer: "Corridor Asset Management",
    title: "FCP Trésorerie Corridor",
    isin: "CMFCP-MONETAIRE",
    status: "published",
    isExample: true,
    blurb: "Exemple de fonds commun de placement agréé COSUMAF, dont la valeur liquidative est publiée au Bulletin Officiel de la Cote.",
    documents: [],
    opensAt: "2026-01-02T09:00:00",
    deadlineAt: "2099-12-31T17:00:00",
    settleOn: "2026-09-24",
      lastCouponOn: null,
    nominal: 0,
    commissionPct: 0,
    fund: {
      key: "fcp-monetaire",
      manager: "Corridor Asset Management",
      depositary: "LCB Bank",
      category: "M",
      frequency: "hebdomadaire",
      nav: 10820,
      navDate: "2026-09-18",
      navOrigin: 10000,
      inceptionDate: "2021-04-01",
      perfSinceInceptionPct: 8.2,
      /* LES DOUZE MOIS MANQUAIENT, ET LEUR ABSENCE SE VOYAIT À L'ÉCRAN :
         un fonds né en 2021 sans performance sur un an n'existe pas en
         vrai, et la tuile retombait donc sur l'annualisé depuis l'origine
         — « +1,4 % par an », ce qui est juste pour cette série et faux
         comme image du produit. Deux valeurs plausibles pour la zone :
         un monétaire autour de cinq, un obligataire autour de sept. */
      perf1yPct: 4.9,
      perf1yFrom: "2025-09-19",
      distributed: true,
      agreementRef: "CONV-2026-001",
      entryFeePct: 1,
      exitFeePct: 0.5,
      managementFeePct: 0.9,
      minAmount: 100_000,
      cutoff: "mardi 12 h pour la VL du jeudi",
      settlementDays: 3,
    },
    version: 1,
  },
  {
    id: "fcp-obligataire",
    kind: "FONDS",
    operation: "secondaire",
    country: "Cameroun",
    countryName: "République du Cameroun",
    issuer: "Corridor Asset Management",
    title: "FCP Obligations CEMAC",
    isin: "CMFCP-OBLIGATAIRE",
    status: "published",
    isExample: true,
    blurb: "Exemple de fonds commun de placement agréé COSUMAF, dont la valeur liquidative est publiée au Bulletin Officiel de la Cote.",
    documents: [],
    opensAt: "2026-01-02T09:00:00",
    deadlineAt: "2099-12-31T17:00:00",
    settleOn: "2026-09-24",
      lastCouponOn: null,
    nominal: 0,
    commissionPct: 0,
    fund: {
      key: "fcp-obligataire",
      manager: "Corridor Asset Management",
      depositary: "LCB Bank",
      category: "O",
      frequency: "hebdomadaire",
      nav: 12430,
      navDate: "2026-09-18",
      navOrigin: 10000,
      inceptionDate: "2021-04-01",
      perfSinceInceptionPct: 24.3,
      perf1yPct: 7.4,
      perf1yFrom: "2025-09-19",
      distributed: true,
      agreementRef: "CONV-2026-001",
      entryFeePct: 1,
      exitFeePct: 0,
      managementFeePct: 1.35,
      minAmount: 100_000,
      cutoff: "mardi 12 h pour la VL du jeudi",
      settlementDays: 3,
    },
    version: 1,
  },
  /* Une adjudication encore ouverte.

     Toutes les lignes du primaire de la démonstration avaient leur clôture
     derrière elles, si bien qu'aucune ne montrait ce qu'un client fait avant une
     adjudication : annoncer un montant, et la condition à laquelle il tient. Un
     bon plutôt qu'une obligation, parce que la condition s'y dit en taux et que
     c'est le sens le plus facile à prendre à l'envers. */
  {
    id: "cm-bta-26-2027",
    kind: "BTA",
    operation: "nouvelle_ligne",
    country: "Cameroun",
    countryName: "République du Cameroun",
    issuer: "Trésor public de la République du Cameroun",
    title: "BTA 26 semaines · 8 avr. 2027",
    isin: "CM1300002014",
    status: "published",
    blurb:
      "Bon à intérêts précomptés à six mois : vous payez moins que le nominal et recevez 1 000 000 FCFA par bon à l'échéance. Le taux est fixé à l'adjudication.",
    documents: [],
    opensAt: "2026-09-22T09:00:00",
    deadlineAt: "2026-10-08T12:00:00",
    resultsAt: "2026-10-08T15:00:00",
    settleOn: "2026-10-12",
    maturityOn: "2027-04-08",
    nominal: 1_000_000,
    precountRate: 4.75,
    rateNote: "taux indicatif : fixé à l'adjudication",
    commissionPct: 0,
    minTitles: 1,
    sizeLabel: "15 Mds FCFA",
    version: 0,
  },
  {
    id: "cg-bta-52-2027",
    kind: "BTA",
    operation: "nouvelle_ligne",
    country: "Congo",
    countryName: "République du Congo",
    issuer: "Trésor public de la République du Congo",
    title: "BTA 52 semaines · 16 sept. 2027",
    isin: "CG1300001472",
    status: "published",
    blurb:
      "Bon à intérêts précomptés : vous payez moins que le nominal et recevez 1 000 000 FCFA par bon dans un an. Le placement court de référence en CEMAC.",
    documents: [{ name: "Communiqué d'annonce n° 000474/MFBPP", meta: "PDF · 1 p." }],
    opensAt: "2026-09-11T17:00:00",
    deadlineAt: "2026-09-15T12:00:00",
    resultsAt: "2026-09-15T15:00:00",
    settleOn: "2026-09-17",
    maturityOn: "2027-09-16",
    nominal: 1_000_000,
    /* LE TAUX INDICATIF VIENT DU MARCHÉ, pas d'un nombre rond. Il portait 5,5 %
       — la valeur par défaut que l'écran « À valider » a précisément été bâti
       pour supprimer — soit 5,905 % de rendement quand les séances comparables
       en disaient 7,615 : la démonstration publiait un bon cent soixante-dix
       points de base sous le marché, et l'écran qui mesure le niveau affichait
       l'écart juste à côté.

       6,98 % est ce que « niveauDuMarche » propose pour cette ligne avec la
       SEULE information antérieure à sa séance : quatre séances du panier
       « 1 an », la plus récente à quarante-neuf jours, converties en taux
       précompté pour ces dates-ci. L'adjudication réelle du 15 septembre 2026
       sur ce même ISIN est sortie à 6,970 % : un point de base. */
    precountRate: 6.98,
    rateNote: "taux indicatif : fixé à l'adjudication",
    commissionPct: 0,
    minTitles: 1,
    sizeLabel: "10 Mds FCFA",
    version: 0,
  },
  {
    id: "bhc-ipo-t2",
    kind: "ACTIONS",
    operation: "ipo",
    country: "Gabon",
    countryName: "Gabon · BVMAC",
    issuer: "BGFI Holding Corporation S.A.",
    title: "BGFI Holding : augmentation de capital (2e tranche)",
    isin: "GA0000010074",
    status: "published",
    blurb:
      "1 006 975 actions nouvelles à 80 000 FCFA, pour porter le flottant de 3,86 % à 10 %. Premier dividende 2 500 FCFA/action (3,12 % sur le prix d'introduction). Cours au 26 août : 90 000 FCFA.",
    documents: [
      { name: "Teaser investisseurs : 2e tranche", meta: "PDF · 19 p." },
      { name: "Formulaire de manifestation d'intérêt (BGFI Bourse)", meta: "PDF · 1 p." },
    ],
    opensAt: "2026-09-15T08:00:00",
    deadlineAt: "2026-10-15T17:00:00",
    settleOn: "2026-10-30",
    nominal: 80_000,
    commissionPct: 0,
    pricePerShare: 80_000,
    minShares: 10,
    sharesOffered: 1_006_975,
    dividendPerShare: 2_500,
    lastPrice: 90_000,
    lastPriceOn: "2026-08-26",
    sizeLabel: "80,56 Mds FCFA",
    version: 1,
    pricedAt: "2026-09-12T11:30:00",
  },
  {
    id: "mkt-bhc",
    kind: "MARCHE",
    operation: "secondaire",
    country: "Gabon",
    countryName: "Gabon · BVMAC",
    issuer: "BGFI Holding Corporation S.A.",
    title: "BGFI Holding (BHC) : action cotée",
    isin: "GA0000010074",
    status: "published",
    blurb: "Action BGFI Holding cotée à la BVMAC depuis le 26 août 2026. Premier dividende 2 500 FCFA. Ordres d'achat et de vente exécutés au marché, règlement T+3.",
    documents: [{ name: "Fiche valeur BVMAC", meta: "Lien" }],
    opensAt: "2026-08-26T09:00:00",
    deadlineAt: "2099-12-31T17:00:00",
    settleOn: "2026-09-17",
    nominal: 1,
    commissionPct: 0,
    market: "BVMAC",
    instrument: "action",
    lastPrice: 90_000,
    lastPriceOn: "2026-09-11",
    bid: 89_500,
    ask: 90_500,
    lotSize: 1,
    settlementDays: 3,
    dividendPerShare: 2_500,
    version: 1,
    pricedAt: "2026-09-11T17:30:00",
  },
  {
    id: "mkt-ecmr-2031",
    kind: "MARCHE",
    operation: "secondaire",
    country: "Cameroun",
    countryName: "République du Cameroun",
    issuer: "Trésor public de la République du Cameroun",
    title: "OTA Cameroun 6,25 % · 8 juil. 2031 : secondaire",
    isin: "CM2Z00000xxx",
    status: "published",
    isExample: true,
    blurb: "Exemple de ligne du Trésor négociable sur le marché secondaire via un SVT : achat ou vente au cours du jour, coupon couru réglé au prorata.",
    documents: [],
    opensAt: "2026-07-08T09:00:00",
    deadlineAt: "2099-12-31T17:00:00",
    settleOn: "2026-09-17",
    maturityOn: "2031-07-08",
    lastCouponOn: null,
    nominal: 10_000,
    couponRate: 6.25,
    commissionPct: 0,
    market: "Trésor secondaire",
    instrument: "obligation",
    lastPrice: 97.25,
    lastPriceOn: "2026-09-11",
    bid: 96.75,
    ask: 97.5,
    lotSize: 10,
    settlementDays: 3,
    version: 1,
    pricedAt: "2026-09-11T17:30:00",
  },
  {
    id: "bhc-ipo-t1",
    kind: "ACTIONS",
    operation: "ipo",
    country: "Gabon",
    countryName: "Gabon · BVMAC",
    issuer: "BGFI Holding Corporation S.A.",
    title: "BGFI Holding : introduction en bourse (1re tranche)",
    isin: "GA0000010074",
    status: "live",
    blurb:
      "Première tranche close en avril 2026. Le titre est coté à la BVMAC depuis le 26 août ; un premier dividende de 2 500 FCFA a été versé.",
    documents: [{ name: "Note d'opération 1re tranche", meta: "PDF" }],
    opensAt: "2026-03-02T08:00:00",
    deadlineAt: "2026-04-30T17:00:00",
    settleOn: "2026-05-15",
    nominal: 80_000,
    commissionPct: 0,
    pricePerShare: 80_000,
    minShares: 10,
    dividendPerShare: 2_500,
    lastPrice: 90_000,
    lastPriceOn: "2026-08-26",
    version: 1,
    resultLine: "45,32 Mds levés · 7 601 souscripteurs dans 24 pays · coté depuis le 26 août à 90 000 FCFA (+12,5 %)",
  },
  {
    id: "ex-cm-ota-2031",
    kind: "OTA",
    operation: "nouvelle_ligne",
    country: "Cameroun",
    countryName: "République du Cameroun",
    issuer: "Trésor public de la République du Cameroun",
    title: "OTA 6,25 % · 8 juil. 2031",
    isin: "CM2Z00000xxx",
    status: "live",
    isExample: true,
    blurb: "Exemple d'une ligne passée, en vie : la fiche reste consultable, avec le prix servi, l'échéancier des coupons et la valorisation.",
    documents: [],
    opensAt: "2026-07-01T08:00:00",
    deadlineAt: "2026-07-06T12:00:00",
    resultsAt: "2026-07-06T15:00:00",
    settleOn: "2026-07-08",
    maturityOn: "2031-07-08",
    lastCouponOn: null,
    nominal: 10_000,
    couponRate: 6.25,
    pricePct: 96.5,
    servedPricePct: 96.5,
    commissionPct: 0,
    version: 1,
    resultLine: "Servie à 96,500 % · vos ordres servis à 100 % · premier coupon le 8 juil. 2027",
  },

  /* ─── TROIS SÉANCES QUI FERMENT DEVANT, pour que la bande existe ──────────
     Une par ton de « urgenceDe » : sous sept jours, sous quatorze, sous
     trente. La première fait basculer « presse() », donc la bande remonte sur
     la page d'arrivée au-dessus du portefeuille — le déplacement que le seuil
     commande, et que rien ne montrait. */
  {
    id: "ex-td-bta-13",
    kind: "BTA",
    operation: "nouvelle_ligne",
    country: "Tchad",
    countryName: "République du Tchad",
    issuer: "Trésor public de la République du Tchad",
    title: "BTA 13 semaines · Tchad",
    isin: "TD0000000EX1",
    status: "published",
    isExample: true,
    blurb: "Exemple de séance qui ferme sous sept jours : c'est le seuil au-delà duquel un virement de la zone n'est plus certain d'arriver avant le dépôt, et la page d'arrivée remonte la bande des échéances quand il est franchi.",
    documents: [],
    opensAt: `${leJour(-6)}T09:00:00`,
    deadlineAt: cloture(4),
    resultsAt: cloture(4, "15:00:00"),
    settleOn: leJour(8),
    maturityOn: leJour(4 + 91),
    nominal: 1_000_000,
    precountRate: 5.1,
    rateNote: "taux indicatif : fixé à l'adjudication",
    commissionPct: 0,
    minTitles: 1,
    sizeLabel: "10 Mds FCFA",
    version: 0,
  },
  {
    id: "ex-ga-ota-5",
    kind: "OTA",
    operation: "nouvelle_ligne",
    country: "Gabon",
    countryName: "République gabonaise",
    issuer: "Trésor public de la République gabonaise",
    title: "OTA 6,25 % · 5 ans · Gabon",
    isin: "GA0000000EX2",
    status: "published",
    isExample: true,
    blurb: "Exemple de séance annoncée à moyen terme : notée, mais rien ne presse encore.",
    /* RETENUE PAR LE DESK, et c'est la troisième section que le dépôt mémoire
       ne montrait jamais. Le motif est NEUTRE — « la sélection du desk » n'est
       pas une recommandation, et le type le dit en toutes lettres. La durée
       d'affichage se calcule, pour la raison qui vaut partout ici : une date
       fixe serait dépassée la semaine suivante.
       C'est la séance à onze jours, et non celle à quatre : l'urgente est déjà
       en tête de « Ce qui ferme bientôt », et la retenir une seconde fois sur
       la même page la dirait deux fois. */
    featured: { reason: "Retenue pour sa durée : cinq ans, entre les bons à treize semaines et les lignes longues de la cote.", until: cloture(11).slice(0, 10), by: "Exemple", at: `${leJour(-2)}T09:30:00` },
    documents: [],
    opensAt: `${leJour(-2)}T09:00:00`,
    deadlineAt: cloture(11),
    resultsAt: cloture(11, "15:00:00"),
    settleOn: leJour(15),
    maturityOn: leJour(11 + 5 * 365),
    nominal: 10_000,
    couponRate: 6.25,
    pricePct: 97,
    rateNote: "prix indicatif : fixé à l'adjudication",
    commissionPct: 0,
    minTitles: 50,
    sizeLabel: "40 Mds FCFA",
    version: 0,
  },
  {
    id: "ex-cm-bta-26",
    kind: "BTA",
    operation: "nouvelle_ligne",
    country: "Cameroun",
    countryName: "République du Cameroun",
    issuer: "Trésor public de la République du Cameroun",
    title: "BTA 26 semaines · Cameroun",
    isin: "CM0000000EX3",
    status: "published",
    isExample: true,
    blurb: "Exemple de séance au bord de la fenêtre des trente jours : au-delà, ce n'est plus « bientôt », c'est le calendrier.",
    documents: [],
    opensAt: `${leJour(0)}T09:00:00`,
    deadlineAt: cloture(24),
    resultsAt: cloture(24, "15:00:00"),
    settleOn: leJour(28),
    maturityOn: leJour(24 + 182),
    nominal: 1_000_000,
    precountRate: 4.9,
    rateNote: "taux indicatif : fixé à l'adjudication",
    commissionPct: 0,
    minTitles: 1,
    sizeLabel: "20 Mds FCFA",
    version: 0,
  },

  /* ─── UN RACHAT DU TRÉSOR OUVERT, SUR UNE LIGNE QUE LE CLIENT DÉTIENT ─────
     RELEVÉ LE 29 OCTOBRE 2026, en convertissant le parcours de cession : le
     jeu d'essai portait deux rachats, tous deux clos depuis six semaines, et
     dont les ISIN ne correspondaient à aucune ligne détenue par le client de
     démonstration. La seule sortie qui porte le mot « cession » n'était donc
     visible NULLE PART — ni son plafond, ni « tout céder », ni ce qui
     resterait. Elle se vérifiait par le domaine et pas à l'écran, et c'est
     exactement ce qu'un jeu de démonstration est censé empêcher.

     SON ISIN EST CELUI DE « rca-ota-c-2028 », que le client détient depuis sa
     prise ferme réglée du 2 juin : c'est par l'ISIN que les positions se
     recoupent, et un rachat qui ne viserait aucune ligne détenue ne montrerait
     rien de plus que les deux précédents. */
  {
    id: "ex-rca-rachat-ouvert",
    kind: "RACHAT",
    operation: "rachat",
    country: "RCA",
    countryName: "République centrafricaine",
    issuer: "Trésor public de la République centrafricaine",
    title: "Rachat OTA 6,50 % · éch. 14 févr. 2028",
    isin: "CF2K00000056",
    status: "published",
    isExample: true,
    blurb:
      "Exemple de rachat ouvert sur une ligne détenue : le Trésor reprend ses titres à 100 % du nominal avant l'échéance. C'est la seule sortie dont la question s'appelle « cession », et elle part de ce qu'on détient — d'où son plafond et son « tout céder ».",
    documents: [],
    opensAt: `${leJour(-3)}T09:00:00`,
    deadlineAt: cloture(18),
    resultsAt: cloture(18, "15:00:00"),
    settleOn: leJour(22),
    maturityOn: "2028-02-14",
    nominal: 10_000,
    pricePct: 100,
    commissionPct: 0,
    sizeLabel: "5 Mds FCFA",
    version: 1,
    pricedAt: `${leJour(-3)}T09:00:00`,
  },
];

export const SEED_INTENTS: Intent[] = [
  // the demo client (dev login « G. Nitcheu ») has a past: one line settled, one not served
  { id: "i-001", ref: "PF-0602-001", clientId: "dev-client-g-nitcheu", offerId: "rca-ota-c-2028", offerVersion: 1, clientName: "G. Nitcheu", clientSegment: "Personne physique · Yaoundé", type: "ferme", amount: 5_000_000, channel: "WhatsApp", state: "reglee", allocationPct: 100, createdAt: "2026-06-02T09:10:00", updatedAt: "2026-06-12T10:00:00" },
  { id: "i-002", ref: "PF-0715-002", clientId: "dev-client-g-nitcheu", offerId: "rca-ota-c-2028", offerVersion: 1, clientName: "G. Nitcheu", clientSegment: "Personne physique · Yaoundé", type: "appetit", amount: 2_000_000, channel: "E-mail", state: "non_servie", createdAt: "2026-07-15T14:20:00", updatedAt: "2026-07-20T09:00:00" },
  /* DEUX DÉCISIONS QUI ATTENDENT, et c'est le seul moyen de VOIR la bande
     « Ce qui vous attend » et la pastille qui la compte. Le client de
     démonstration n'avait que des ordres réglés ou non servis : les deux
     objets qui portent tout le dialogue avec le client ne paraissaient donc
     jamais en démonstration, ni sous les yeux de qui travaille dessus.
     Un ordre se signe quand il est reçu ou confirmé, non signé, et qu'il
     porte son plafond (domain/intent, « ordreSignable ») ; une
     contre-proposition attend une réponse. Un de chaque. */
  { id: "i-003", ref: "PF-1018-003", clientId: "dev-client-g-nitcheu", offerId: "rca-ota-c-2028", offerVersion: 1, clientName: "G. Nitcheu", clientSegment: "Personne physique · Yaoundé", type: "ferme", amount: 3_000_000, maxAmount: 3_150_000, channel: "WhatsApp", state: "confirmee", createdAt: "2026-10-18T10:05:00", updatedAt: "2026-10-20T08:30:00" },
  { id: "i-004", ref: "PF-1020-004", clientId: "dev-client-g-nitcheu", offerId: "rca-ota-c-2028", offerVersion: 1, clientName: "G. Nitcheu", clientSegment: "Personne physique · Yaoundé", type: "ferme", amount: 1_500_000, maxAmount: 1_600_000, channel: "E-mail", state: "contre_proposee", createdAt: "2026-10-20T15:40:00", updatedAt: "2026-10-21T09:15:00" },
  {
    id: "i-011",
    ref: "PF-0914-011",
    clientId: "c-am",
    offerId: "rca-ota-c-2028",
    offerVersion: 1,
    clientName: "A. M.",
    clientSegment: "Personne physique · Douala",
    type: "ferme",
    amount: 25_000_000,
    limitPrice: 95,
    channel: "WhatsApp",
    state: "confirmee",
    createdAt: "2026-09-14T08:12:00",
    updatedAt: "2026-09-14T08:40:00",
  },
  {
    id: "i-012",
    ref: "AP-0914-012",
    clientId: "c-tontine",
    offerId: "rca-ota-a-2028",
    offerVersion: 1,
    clientName: "Tontine Espoir",
    clientSegment: "Groupement · Yaoundé",
    type: "appetit",
    amount: 15_000_000,
    channel: "WhatsApp",
    state: "recue",
    createdAt: "2026-09-14T08:20:00",
    updatedAt: "2026-09-14T08:20:00",
  },
  {
    id: "i-013",
    ref: "PF-0914-013",
    clientId: "c-se",
    offerId: "rca-ota-c-2028",
    offerVersion: 1,
    clientName: "S. E.",
    clientSegment: "Diaspora · Paris",
    type: "ferme",
    amount: 50_000_000,
    limitPrice: 94,
    channel: "E-mail",
    state: "transmise",
    createdAt: "2026-09-14T08:34:00",
    updatedAt: "2026-09-14T09:10:00",
  },
  {
    id: "i-014",
    ref: "AP-0914-014",
    clientId: "c-avc",
    offerId: "rca-ota-b-2029",
    offerVersion: 1,
    clientName: "Assur-Vie Centrale",
    clientSegment: "Institutionnel · Bangui",
    type: "appetit",
    amount: 200_000_000,
    channel: "Appel",
    state: "recue",
    createdAt: "2026-09-14T08:41:00",
    updatedAt: "2026-09-14T08:41:00",
  },
  {
    id: "i-016",
    ref: "CS-0914-016",
    clientId: "c-mbaiki",
    offerId: "rca-rachat-2026-11",
    offerVersion: 1,
    clientName: "Groupe Mbaïki SARL",
    clientSegment: "Entreprise · Bangui",
    type: "cession",
    amount: 300,
    channel: "Appel",
    state: "confirmee",
    createdAt: "2026-09-14T09:02:00",
    updatedAt: "2026-09-14T09:05:00",
  },
  {
    id: "i-017",
    ref: "PF-0914-017",
    clientId: "c-jpo",
    offerId: "rca-ota-a-2028",
    offerVersion: 1,
    clientName: "J.-P. O.",
    clientSegment: "Personne physique · Yaoundé",
    type: "ferme",
    amount: 10_000_000,
    channel: "WhatsApp",
    state: "recue",
    createdAt: "2026-09-14T09:18:00",
    updatedAt: "2026-09-14T09:18:00",
  },
  /* Deux clients qui se font face sur la même ligne cotée.

     La démonstration ne portait aucun ordre de bourse, et l'appariement y était
     donc invisible : le desk voyait un carnet vide et personne ne pouvait lire
     l'écran qui compte. Ces deux ordres se répondent, 96,750 contre 97,250, et
     le vendeur en offre moins que l'acheteur n'en demande : il reste de l'appétit
     après l'appariement, ce qui montre les deux moitiés de l'écran d'un coup. */
  /* Le client détient des parts : sans elles, aucun rachat n'est possible et le
     passage d'un fonds à l'autre reste une idée. Souscription réglée, parts
     livrées : 2 000 000 FCFA nets des droits d'entrée, à la valeur liquidative. */
  {
    id: "i-021",
    ref: "PF-0520-021",
    clientId: "dev-client-g-nitcheu",
    offerId: "fcp-monetaire",
    offerVersion: 1,
    clientName: "G. Nitcheu",
    clientSegment: "Personne physique · Yaoundé",
    type: "souscription",
    amount: 2_000_000,
    servedUnits: 183.02,
    executedPrice: 10_820,
    allocationPct: 100,
    channel: "E-mail",
    state: "reglee",
    createdAt: "2026-05-20T10:00:00",
    updatedAt: "2026-05-26T09:00:00",
  },
  /* UN ARBITRAGE SIMULTANÉ, EN COURS.

     Le client a demandé une seule chose : quitter la trésorerie pour les
     obligations. Le rachat est placé ; la souscription naîtra de son exécution,
     pour le montant exact reçu, que personne ne connaît encore.

     IL PORTE SES DEUX BORNES depuis le 26 octobre 2026, comme tout arbitrage :
     un plancher sous lequel rien ne part, une date au-delà de laquelle tout
     s'annule. De fonds à fonds elles jouent rarement — les deux jambes se
     règlent sur une VL — mais une VL peut tomber et des droits de sortie
     mordent, et un service qui change de règles selon la ligne est un service
     que personne n'explique. */
  {
    id: "i-022",
    ref: "PF-0924-022",
    clientId: "dev-client-g-nitcheu",
    offerId: "fcp-monetaire",
    offerVersion: 1,
    clientName: "G. Nitcheu",
    clientSegment: "Personne physique · Yaoundé",
    type: "rachat",
    amount: 50,
    switchToOfferId: "fcp-obligataire",
    switchFloor: 500_000,
    switchBy: "2026-11-24",
    channel: "E-mail",
    state: "transmise",
    createdAt: "2026-09-24T11:20:00",
    updatedAt: "2026-09-24T15:05:00",
  },
  /* UN ARBITRAGE CONDITIONNEL, ARMÉ, ET C'EST LE CAS QUI COMPTE.

     Il part du même fonds et vise une ACTION COTÉE : une des deux jambes passe
     donc par le carnet de la BVMAC, où un ordre peut rester plusieurs séances
     sans trouver preneur. Il n'y a pas de simultanéité possible, et c'est
     précisément pour cela que la paire est armée : le client ne se désinvestit
     que si l'arrivée est tenue, au prix de pouvoir ne jamais partir.

     Sans cette ligne, la démonstration ne montrerait que le cas facile — celui
     qui marche déjà — et l'écran « armé, rien n'a bougé » n'aurait rien à
     afficher. C'est l'état que le client lit le plus longtemps. */
  {
    id: "i-023",
    ref: "PF-1026-023",
    clientId: "dev-client-g-nitcheu",
    offerId: "fcp-monetaire",
    offerVersion: 1,
    clientName: "G. Nitcheu",
    clientSegment: "Personne physique · Yaoundé",
    type: "rachat",
    amount: 40,
    switchToOfferId: "mkt-bhc",
    switchFloor: 400_000,
    switchBy: "2026-12-15",
    channel: "WhatsApp",
    state: "confirmee",
    createdAt: "2026-10-26T09:15:00",
    updatedAt: "2026-10-26T09:40:00",
  },
  /* Un appétit qui ne tient qu'en dessous du prix annoncé.

     Sans lui, l'échelle du sondage n'aurait que des barreaux servis et ne
     montrerait pas ce qu'elle sert à voir : le niveau où la demande de la place
     s'arrête. À 94 %, celui-ci ne serait pas servi, et c'est le renseignement
     qu'on porte à l'émetteur. */
  {
    id: "i-020",
    ref: "AP-0913-020",
    clientId: "c-tontine",
    offerId: "rca-ota-c-2028",
    offerVersion: 1,
    clientName: "Tontine Espoir",
    clientSegment: "Groupement · Bafoussam",
    type: "appetit",
    amount: 10_000_000,
    limitPrice: 93,
    channel: "WhatsApp",
    state: "recue",
    createdAt: "2026-09-13T16:45:00",
    updatedAt: "2026-09-13T16:45:00",
  },
  {
    id: "i-018",
    ref: "PF-0915-018",
    clientId: "c-assur",
    offerId: "mkt-ecmr-2031",
    offerVersion: 1,
    clientName: "Assur-Vie Centrale",
    clientSegment: "Personne morale · Douala",
    type: "achat",
    amount: 1_500,
    limitPrice: 97.25,
    channel: "E-mail",
    state: "confirmee",
    createdAt: "2026-09-15T10:05:00",
    updatedAt: "2026-09-15T10:40:00",
  },
  {
    id: "i-019",
    ref: "PF-0916-019",
    clientId: "c-mbaiki",
    offerId: "mkt-ecmr-2031",
    offerVersion: 1,
    clientName: "Groupe Mbaïki SARL",
    clientSegment: "Personne morale · Bangui",
    type: "vente",
    amount: 900,
    limitPrice: 96.75,
    channel: "WhatsApp",
    state: "recue",
    createdAt: "2026-09-16T08:30:00",
    updatedAt: "2026-09-16T08:30:00",
  },
];

/** Intake queue : sources received this week, as the extractor would leave them. */
export const SEED_INTAKE: IntakeItem[] = [
  {
    id: "q-cg-ota",
    source: "mail",
    title: "Communiqué OTA 6 ans Congo : n° 000473/MFBPP",
    fromLabel: "dobm@tresor-congo.cg · ven. 11 sept. 16:20",
    receivedAt: "2026-09-11T16:20:00",
    state: "a_valider",
    offerId: "cg-ota-2028",
    extractedIn: 41,
    rawText: `MINISTÈRE DES FINANCES, DU BUDGET ET DU PORTEFEUILLE PUBLIC, DIRECTION GÉNÉRALE DU TRÉSOR, DOBM
N° 000473 / MFBPP/DGT/DGAT/DOBM/SOMD : Brazzaville, le 11 sept. 2026

COMMUNIQUÉ D'ANNONCE : ÉMISSION DES OBLIGATIONS DU TRÉSOR

Le Trésor Public de la République du Congo procèdera le Mardi 15 septembre 2026 à l'émission par voie d'adjudication, des Obligations du Trésor assimilables par abondement dont les caractéristiques sont les suivantes :
• Désignation : Obligations du trésor à 6 ans
• Code Émission : CG2L00000012 OTA 6 ans 6,00% - 31 MARS 2028
• Échéance : 31 mars 2028
• Remboursement : In fine
• Forme des titres : Titres dématérialisés
• Volume d'émission (en millions de FCFA) : 10 000
• Valeur nominale unitaire (en FCFA) : 10 000
• Rendement : 6.00% du nominal (les intérêts sont payés annuellement)
• Date limite de souscription : Mardi 15 septembre 2026
• Lieu de souscription : auprès des banques et établissements financiers de la CEMAC agréés comme « Spécialistes en Valeurs du Trésor »
• Date d'annonce des résultats : Mardi 15 septembre 2026 avant 15 h 00
• Date de règlement : Jeudi 17 septembre 2026 avant 15 h 00
• Date de valeur : Jeudi 17 septembre 2026 avant 15 h 00

Les personnes physiques ou morales souhaitant acquérir ces titres doivent s'adresser aux établissements de crédit suivants : Afriland First Bank, BGFI Bank, CCEI Bank, Commercial Bank of Cameroun, UBA, BSCA Bank Congo, Crédit du Congo, Ecobank, BOA, Orabank, SCB, UBC, Société Générale, Coris Bank, CCA Bank, BANGE…

Pour le Ministre : Le Directeur Général du Trésor, Albert NGONDO`,
    draft: {
      kind: "OTA",
      operation: "abondement",
      country: "Congo",
      countryName: "République du Congo",
      issuer: "Trésor public de la République du Congo",
      isin: "CG2L00000012",
      sourceRef: "n° 000473/MFBPP du 11 sept. 2026",
      nominal: 10_000,
      couponRate: 6,
      maturityOn: "2028-03-31",
      lastCouponOn: "2026-03-31",
      deadlineAt: "2026-09-15T12:00",
      resultsAt: "2026-09-15T15:00",
      settleOn: "2026-09-17",
      sizeLabel: "10 Mds FCFA",
      title: "OTA 6,00 % · 31 mars 2028",
      blurb: "Abondement de la ligne 6 ans du Congo, 1 an et 6 mois restants. Coupon annuel de 6,00 %, remboursement in fine le 31 mars 2028.",
      official: true,
      confidence: { kind: "sure", operation: "sure", country: "sure", issuer: "sure", isin: "sure", nominal: "sure", couponRate: "sure", maturityOn: "sure", lastCouponOn: "check", deadlineAt: "check", resultsAt: "sure", settleOn: "sure", sizeLabel: "sure" },
      remarks: ["Dernier coupon déduit de l'échéance (31 mars) : à confirmer avec l'historique de la ligne.", "Heure limite de dépôt non précisée dans le communiqué : 12 h 00 retenu par convention."],
    },
  },
  {
    id: "q-cg-bta",
    source: "mail",
    title: "Communiqué BTA 52 semaines Congo : n° 000474/MFBPP",
    fromLabel: "dobm@tresor-congo.cg · ven. 11 sept. 16:21",
    receivedAt: "2026-09-11T16:21:00",
    state: "a_valider",
    offerId: "cg-bta-52-2027",
    extractedIn: 38,
    rawText: `N° 000474 / MFBPP/DGT/DGAT/DOBM/SOMD : 11 sept. 2026
COMMUNIQUÉ D'ANNONCE : ÉMISSION DES BONS DU TRÉSOR

Le Trésor Public de la République du Congo procèdera le Mardi 15 septembre 2026 à l'émission par voie d'adjudication des bons du Trésor assimilables :
• Désignation : Bons du trésor à 52 semaines
• Code Émission : CG1300001472 BTA-52 16 SEPT 2027
• Échéance : 16 septembre 2027
• Remboursement : In fine : Titres dématérialisés
• Volume (en millions de FCFA) : 10 000
• Valeur nominale unitaire (en FCFA) : 1 000 000
• Rendement : les intérêts sont précomptés sur la valeur nominale des Bons
• Date limite de souscription : Mardi 15 septembre 2026
• Date d'annonce des résultats : Mardi 15 septembre 2026 avant 15 h 00
• Date de règlement / de valeur : Jeudi 17 septembre 2026`,
    draft: {
      kind: "BTA",
      operation: "nouvelle_ligne",
      country: "Congo",
      countryName: "République du Congo",
      issuer: "Trésor public de la République du Congo",
      isin: "CG1300001472",
      sourceRef: "n° 000474/MFBPP du 11 sept. 2026",
      nominal: 1_000_000,
      maturityOn: "2027-09-16",
      deadlineAt: "2026-09-15T12:00",
      resultsAt: "2026-09-15T15:00",
      settleOn: "2026-09-17",
      sizeLabel: "10 Mds FCFA",
      title: "BTA 52 semaines · 16 sept. 2027",
      blurb: "Bon à intérêts précomptés à 52 semaines : vous payez moins que le nominal et recevez 1 000 000 FCFA par bon le 16 septembre 2027.",
      official: true,
      confidence: { kind: "sure", operation: "sure", country: "sure", issuer: "sure", isin: "sure", nominal: "sure", precountRate: "missing", maturityOn: "sure", deadlineAt: "check", resultsAt: "sure", settleOn: "sure", sizeLabel: "sure" },
      remarks: ["Taux précompté fixé à l'adjudication : le desk indique un taux indicatif.", "Heure limite non précisée : 12 h 00 retenu."],
    },
  },
  {
    id: "q-ga-bta",
    source: "photo",
    title: "Écran « BTA Gabon 26 sem. : adjudication 23 sept. »",
    fromLabel: "Desk BGFI Bourse (WhatsApp) · lun. 14 sept. 08:47",
    receivedAt: "2026-09-14T08:47:00",
    state: "bloque",
    extractedIn: 22,
    rawText: "[Photo d'écran transférée sur WhatsApp, IMG_20260914_084711.jpg]\n\nADJUDICATION BTA, TRÉSOR GABON\nMercredi 23/09/2026\nBTA 26 semaines · éch. 25/03/2027\nVolume : 15 000 (M FCFA)\nNominal 1 000 000\nCode : GA13000…(flou)\nDépôt avant 12h00, SVT",
    draft: {
      kind: "BTA",
      operation: "nouvelle_ligne",
      country: "Gabon",
      countryName: "République gabonaise",
      issuer: "Trésor public de la République gabonaise",
      nominal: 1_000_000,
      maturityOn: "2027-03-25",
      deadlineAt: "2026-09-23T12:00",
      settleOn: "2026-09-25",
      sizeLabel: "15 Mds FCFA ?",
      title: "BTA 26 semaines · 25 mars 2027",
      official: false,
      confidence: { kind: "sure", operation: "check", country: "sure", issuer: "sure", isin: "missing", nominal: "sure", maturityOn: "check", deadlineAt: "check", settleOn: "check", sizeLabel: "check" },
      remarks: ["Source non officielle (photo d'écran) : demander le communiqué au Trésor gabonais avant toute publication.", "Code émission illisible.", "Date de règlement déduite (J+2)."],
    },
  },
  {
    id: "q-bhc",
    source: "mail",
    title: "Teaser BHC 2e tranche + formulaire de réservation",
    fromLabel: "bgfibourse@bgfi.com · sam. 12 sept. 10:05",
    receivedAt: "2026-09-12T10:05:00",
    state: "publie",
    offerId: "bhc-ipo-t2",
    publishedAt: "2026-09-12T11:30:00",
    extractedIn: 64,
    draft: { kind: "ACTIONS", operation: "ipo", official: true, confidence: {}, remarks: [] },
  },
  {
    id: "q-rca",
    source: "pdf",
    title: "Communiqué OTA RCA : n° 0762/MCFB (3 lignes + 2 rachats)",
    fromLabel: "snreetp@minfb-rca.org · mer. 9 sept. 15:10",
    receivedAt: "2026-09-09T15:10:00",
    state: "publie",
    offerId: "rca-ota-c-2028",
    publishedAt: "2026-09-09T18:42:00",
    extractedIn: 58,
    draft: { kind: "OTA", operation: "abondement", official: true, confidence: {}, remarks: [] },
  },
];

/** Contacts reachable for broadcasts (demo). Phone numbers are placeholders. */
export const SEED_CONTACTS: Contact[] = [
  { id: "c-am", name: "A. M.", segment: "Personne physique · Douala", phone: "+237600000011", email: "a.m@example.com", whatsappOptIn: true },
  { id: "c-se", name: "S. E.", segment: "Diaspora · Paris", phone: "+33600000013", email: "s.e@example.com", whatsappOptIn: true },
  { id: "c-avc", name: "Assur-Vie Centrale", segment: "Institutionnel · Bangui", email: "tresorerie@avc.example.com", whatsappOptIn: false },
  { id: "c-tontine", name: "Tontine Espoir", segment: "Groupement · Yaoundé", phone: "+237600000012", whatsappOptIn: true },
  { id: "c-mbaiki", name: "Groupe Mbaïki SARL", segment: "Entreprise · Bangui", phone: "+236700000016", email: "dg@mbaiki.example.com", whatsappOptIn: true },
  { id: "c-jpo", name: "J.-P. O.", segment: "Personne physique · Yaoundé", phone: "+237600000017", whatsappOptIn: true },
  /* Le compte de la maison, dans le jeu d'essai comme en production : marqué,
     donc écarté du reporting et signalé sur le desk. C'est lui qui fait
     traverser ce chemin en local, sinon il ne se verrait qu'une fois posé. */
  { id: "dev-client-g-nitcheu", name: "G. Nitcheu", segment: "Personne physique · Yaoundé", phone: "+237687676767", email: "georges.nitcheu@gmail.com", whatsappOptIn: true, demo: true },
];

/**
 * LE SONDAGE D'AVANT SÉANCE, DANS SES TROIS RÔLES.
 *
 * Sans ces lignes, la page du sondage s'ouvrirait vide et ne montrerait rien de
 * ce qu'elle existe pour montrer : ni une question de la maison à laquelle on
 * répond, ni une demande qui s'accumule, ni un consensus. Trois rôles sont donc
 * représentés, et un consensus est VOLONTAIREMENT MÛR — cent millions et trois
 * clients — pour que l'écran du desk ait quelque chose à proposer au Trésor dès
 * la première visite, et que le seuil se voie franchi plutôt que décrit.
 *
 * LES IDENTIFIANTS SONT ÉCRITS EN CLAIR, comme ceux des intentions : le dépôt en
 * mémoire les garde tels quels, et une réponse doit pouvoir nommer sa question.
 */
export const SEED_SONDAGES: LigneSondee[] = [
  /* LA QUESTION DE LA MAISON, celle qui a reçu des réponses. */
  {
    id: "sd-001",
    ref: "SD-1019-A4KM",
    origine: "desk",
    instrument: "OTA",
    country: "Cameroun",
    tenor: "5 ans",
    rate: 6.25,
    /* LE PRIX INDICATIF FAIT LE RENDEMENT DE LA TUILE : 6,25 % de coupon acheté
       à 97 rend près de 7 %. Sans lui, la tuile n'a que trois faits sur quatre,
       et c'est le quatrième qui compare. */
    pricePct: 97,
    montant: 500_000_000,
    dansJours: 21,
    /* LA NOTE DIT CE QUE LA TUILE NE DIT PAS, et rien de plus.
       Elle disait « Le Trésor camerounais revient sur le 5 ans en novembre » :
       deux lignes, et une séance annoncée que personne n'a annoncée. Le pays,
       la durée, le montant et le niveau sont déjà sur la tuile ; ce qui reste à
       dire est POURQUOI la maison sonde celle-ci, en une phrase. */
    note: "C'est la durée qu'on nous demande le plus : nous voulons savoir à quel coupon.",
    state: "ouverte",
    createdAt: "2026-10-19T09:00:00",
    updatedAt: "2026-10-19T09:00:00",
  },
  /* TROIS RÉPONSES, ET ELLES FRANCHISSENT LE SEUIL : 420 millions, trois
     clients. Les niveaux sont volontairement étagés — 6,10 / 6,40 / 6,75 — pour
     que l'échelle montre ce qu'elle sert à montrer : où la demande s'arrête. */
  {
    id: "sd-002",
    ref: "SD-1020-B8TR",
    origine: "client",
    repondA: "sd-001",
    userId: "c-avc",
    clientName: "Assur-Vie Centrale",
    clientSegment: "Institutionnel · Bangui",
    instrument: "OTA",
    country: "Cameroun",
    tenor: "5 ans",
    rate: 6.1,
    montant: 250_000_000,
    dansJours: 14,
    state: "ouverte",
    createdAt: "2026-10-20T11:30:00",
    updatedAt: "2026-10-20T11:30:00",
  },
  {
    id: "sd-003",
    ref: "SD-1021-C2WX",
    origine: "client",
    repondA: "sd-001",
    userId: "c-mbaiki",
    clientName: "Groupe Mbaïki SARL",
    clientSegment: "Entreprise · Bangui",
    instrument: "OTA",
    country: "Cameroun",
    tenor: "5 ans",
    rate: 6.4,
    montant: 120_000_000,
    dansJours: 30,
    state: "ouverte",
    createdAt: "2026-10-21T08:15:00",
    updatedAt: "2026-10-21T08:15:00",
  },
  {
    id: "sd-004",
    ref: "SD-1022-D6YN",
    origine: "client",
    repondA: "sd-001",
    userId: "dev-client-g-nitcheu",
    clientName: "G. Nitcheu",
    clientSegment: "Personne physique · Yaoundé",
    instrument: "OTA",
    country: "Cameroun",
    tenor: "5 ans",
    rate: 6.75,
    montant: 50_000_000,
    dansJours: 21,
    state: "ouverte",
    createdAt: "2026-10-22T19:40:00",
    updatedAt: "2026-10-22T19:40:00",
  },
  /* UNE SECONDE QUESTION, SANS RÉPONSE ENCORE : l'écran doit savoir dire
     « personne n'a encore répondu » sans que cela ressemble à une panne. */
  {
    id: "sd-005",
    ref: "SD-1024-E9JP",
    origine: "desk",
    instrument: "BTA",
    country: "Gabon",
    tenor: "52 semaines",
    rate: 5.5,
    montant: 200_000_000,
    seanceLe: "2026-11-18",
    note: "Du court, pour une trésorerie qui ne veut pas s'engager cinq ans.",
    state: "ouverte",
    createdAt: "2026-10-24T10:00:00",
    updatedAt: "2026-10-24T10:00:00",
  },
  /* UNE LIGNE POUSSÉE PAR UN CLIENT, qui ne répond à aucune question : c'est le
     troisième rôle, et celui que le dirigeant a demandé en premier. Elle est
     seule, donc sous le seuil, et c'est exactement ce que le desk doit voir —
     une demande qui n'est pas encore une ligne. */
  {
    id: "sd-006",
    ref: "SD-1025-F3QV",
    origine: "client",
    userId: "dev-client-g-nitcheu",
    clientName: "G. Nitcheu",
    clientSegment: "Personne physique · Yaoundé",
    instrument: "OTA",
    country: "Congo",
    tenor: "3 ans",
    rate: 7,
    pricePct: 99,
    montant: 30_000_000,
    dansJours: 60,
    note: "Je cherche du court congolais : rien d'annoncé depuis juin.",
    state: "ouverte",
    createdAt: "2026-10-25T16:20:00",
    updatedAt: "2026-10-25T16:20:00",
  },
];
