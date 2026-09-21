import { l, type DocPage } from "./types";

/**
 * The BVMAC All Share Index: what it is, what the bulletin publishes, how it
 * is built, who weighs what, how to read it, and where Guichet shows it. The
 * methodology note of the BVMAC is still to obtain: the points it will settle
 * are marked.
 */
export const INDICE: DocPage = {
  slug: "indice",
  title: l("L'indice BVMAC All Share", "The BVMAC All Share Index"),
  summary: l("Le seul chiffre du marché des actions que la presse reprend : ce qu'il est, comment il se calcule, qui pèse quoi, comment le lire avec sept valeurs, et où le Guichet le montre.", "The one figure of the equity market the press quotes: what it is, how it is computed, who weighs what, how to read it with seven shares, and where Guichet shows it."),
  visibility: "desk",
  audience: ["desk", "admin"],
  order: 4,
  checkedOn: "2026-09-22",
  owner: "Georges",
  chapters: [
    {
      id: "quoi",
      title: l("Ce que c'est", "What it is"),
      blocks: [
        { type: "lead", text: l("Le BVMAC All Share Index (code BVMAC-AS) est l'indice composite du marché des actions de la Bourse des Valeurs Mobilières de l'Afrique Centrale : un seul nombre, en points, qui résume séance après séance l'ensemble des actions cotées. Sa base est conventionnelle ; c'est sa variation qui porte l'information.", "The BVMAC All Share Index (code BVMAC-AS) is the composite index of the equity market of the Central African stock exchange: one number, in points, summing up all listed shares session after session. Its base is a convention; its variation carries the information.") },
        { type: "p", text: l("« All Share » dit son périmètre : toutes les actions inscrites à la cote, sans sélection ; sept émetteurs au 4 août 2026 (SEMC, SAFACAM, SOCAPALM, La Régionale, BANGE, SCG-Ré, BGFI Holding). Les obligations et les bons du Trésor n'en font pas partie ; leur repère dans Guichet est le rendement des BTA.", "“All Share” names its scope: every listed share, no selection; seven issuers on 4 August 2026 (SEMC, SAFACAM, SOCAPALM, La Régionale, BANGE, SCG-Ré, BGFI Holding). Bonds and Treasury bills are not in it; their reference in Guichet is the BTA yield.") },
        { type: "note", kind: "info", text: l("Le bulletin publie le niveau, la variation du jour et une courbe des dernières séances. Les règles de calcul (date et niveau de base, pondération exacte, dividendes, opérations sur titres) tiennent dans la note méthodologique de la BVMAC, à obtenir ; les points qu'elle tranchera sont marqués ici.", "The bulletin publishes the level, the day's variation and a curve of the last sessions. The computation rules (base date and level, exact weighting, dividends, corporate actions) are in the BVMAC methodology note, still to obtain; the points it will settle are marked here.") },
      ],
    },
    {
      id: "bulletin",
      title: l("Ce que publie le bulletin, et ce que Guichet en lit", "What the bulletin publishes, and what Guichet reads"),
      blocks: [
        { type: "p", text: l("En tête de chaque Bulletin Officiel de la Cote, avant la synthèse du marché, le bloc « BVMAC ALL SHARE INDEX » porte le niveau (1 132,95 points le 4 août 2026), la variation du jour (0,00 %) et une petite courbe à l'échelle serrée. Le lecteur de bulletin du Guichet le capte à chaque séance : market_bulletins.index_value et index_variation_pct, une ligne par séance depuis le premier bulletin lu.", "At the head of every Official Quotation Bulletin, before the market summary, the “BVMAC ALL SHARE INDEX” block carries the level (1 132.95 points on 4 August 2026), the day's variation (0.00 %) and a small tight-scale curve. Guichet's bulletin reader captures it every session: market_bulletins.index_value and index_variation_pct, one row per session since the first bulletin read.") },
        { type: "p", text: l("Plus loin, la page « Capitalisation boursière et encours des titres de dettes » donne, pour chaque émetteur, le cours de clôture, le nombre de titres du flottant coté et du capital global, les deux capitalisations, le dernier dividende et la liquidité sur trois mois. Le Guichet la lit aussi : ces champs sont sur la cotation de chaque action (quotes.market_cap_total, market_cap_float, shares_total, shares_float, last_dividend, liquidity_3m_pct). C'est là que se lit le poids de chacun.", "Further, the page “Market capitalisation and outstanding debt securities” gives, per issuer, the closing price, the number of shares in the quoted float and in the global capital, the two capitalisations, the last dividend and the three-month liquidity. Guichet reads it too: those fields sit on each share's quote (quotes.market_cap_total, market_cap_float, shares_total, shares_float, last_dividend, liquidity_3m_pct). That is where each weight is read.") },
        { type: "link", href: "/desk/depot", label: l("Les bulletins conservés au Dépôt", "The bulletins kept in the Repository"), hint: l("le PDF de chaque séance, le bloc de l'indice en page 1", "each session's PDF, the index block on page 1") },
      ],
    },
    {
      id: "construction",
      title: l("Comment il se construit", "How it is built"),
      blocks: [
        { type: "p", text: l("Un indice d'actions est presque toujours une somme de capitalisations divisée par un diviseur, puis ramenée à une base : Indice(t) = Σ (cours(i,t) × nombre de titres(i)) ÷ diviseur(t). Le diviseur est fixé au départ pour que l'indice vaille sa base (souvent 1 000), puis ajusté à chaque événement qui change la capitalisation sans que le marché ait bougé (introduction, augmentation de capital, radiation, changement de flottant). Sans lui, l'arrivée d'une grande valeur ferait bondir l'indice le jour de son entrée.", "An equity index is almost always a sum of capitalisations divided by a divisor, then rebased: Index(t) = Σ (price(i,t) × number of shares(i)) ÷ divisor(t). The divisor is set at the start so the index equals its base (often 1,000), then adjusted at every event that changes capitalisation without the market moving (listing, capital increase, delisting, float change). Without it, the arrival of a large stock would make the index jump on its entry day.") },
        {
          type: "table",
          head: [l("Choix", "Choice"), l("Options", "Options"), l("Ce que cela change", "What it changes"), l("Pour la BVMAC", "For the BVMAC")],
          rows: [
            [l("Le nombre de titres", "The number of shares"), l("capital global, ou flottant coté", "global capital, or quoted float"), l("avec le global, BGFI Holding pèse 74 % ; avec le flottant, 42 %", "on global capital BGFI Holding weighs 74 %; on the float, 42 %"), l("à confirmer", "to confirm")],
            [l("Les dividendes", "Dividends"), l("indice de prix (hors dividendes) ou de rendement (réinvestis)", "price index (ex dividends) or total return (reinvested)"), l("sur des valeurs qui versent 5 à 8 % par an, l'écart se creuse vite", "on shares paying 5 to 8 % a year, the gap widens fast"), l("à confirmer, probablement prix", "to confirm, probably price")],
            [l("Le cours retenu", "The price used"), l("dernier cours traité, ou cours de référence même sans transaction", "last traded price, or reference price even without a trade"), l("sept valeurs peu liquides : beaucoup de séances sans échange, l'indice « ne bouge pas » faute de transaction, pas faute de valeur", "seven illiquid shares: many sessions without a trade, the index “does not move” for lack of a trade, not of value"), l("cours de clôture du bulletin", "closing price of the bulletin")],
          ],
        },
        { type: "note", kind: "rule", text: l("Guichet ne construit pas d'indice maison et ne mesure pas un client contre l'indice. Il le montre, l'explique et s'en sert comme repère de lecture ; un indice propre serait un produit réglementé, et une mesure « contre l'indice » serait trompeuse sur ce marché.", "Guichet builds no index of its own and never measures a client against the index. It shows it, explains it and uses it as a reading reference; an own index would be a regulated product, and a measure “against the index” would be misleading on this market.") },
      ],
    },
    {
      id: "poids",
      title: l("Qui pèse quoi (bulletin n° 2565, 4 août 2026)", "Who weighs what (bulletin no. 2565, 4 August 2026)"),
      blocks: [
        {
          type: "table",
          head: [l("Émetteur", "Issuer"), l("Cours (FCFA)", "Price (FCFA)"), l("Cap. globale (Md)", "Global cap. (bn)"), l("Poids global", "Global weight"), l("Cap. flottante (Md)", "Float cap. (bn)"), l("Poids flottant", "Float weight")],
          rows: [
            [l("BGFI Holding", "BGFI Holding"), l("90 000", "90,000"), l("1 325,6", "1,325.6"), l("73,7 %", "73.7 %"), l("51,0", "51.0"), l("42,3 %", "42.3 %")],
            [l("SOCAPALM", "SOCAPALM"), l("50 000", "50,000"), l("228,8", "228.8"), l("12,7 %", "12.7 %"), l("39,4", "39.4"), l("32,7 %", "32.7 %")],
            [l("BANGE", "BANGE"), l("223 255", "223,255"), l("124,8", "124.8"), l("6,9 %", "6.9 %"), l("11,2", "11.2"), l("9,3 %", "9.3 %")],
            [l("SAFACAM", "SAFACAM"), l("32 850", "32,850"), l("40,8", "40.8"), l("2,3 %", "2.3 %"), l("8,2", "8.2"), l("6,8 %", "6.8 %")],
            [l("La Régionale", "La Régionale"), l("39 000", "39,000"), l("39,5", "39.5"), l("2,2 %", "2.2 %"), l("2,8", "2.8"), l("2,3 %", "2.3 %")],
            [l("SCG-Ré", "SCG-Ré"), l("20 000", "20,000"), l("30,0", "30.0"), l("1,7 %", "1.7 %"), l("6,0", "6.0"), l("5,0 %", "5.0 %")],
            [l("SEMC", "SEMC"), l("53 000", "53,000"), l("10,2", "10.2"), l("0,6 %", "0.6 %"), l("2,0", "2.0"), l("1,7 %", "1.7 %")],
          ],
        },
        { type: "p", text: l("Dans les deux lectures, l'indice est d'abord l'histoire de BGFI Holding et de SOCAPALM. La page Sociétés d'une action et l'outil Comparer montrent le poids courant, recalculé à chaque bulletin.", "In both readings the index is first the story of BGFI Holding and SOCAPALM. A share's Companies page and the Compare tool show the current weight, recomputed at each bulletin.") },
      ],
    },
    {
      id: "lire",
      title: l("Comment le lire", "How to read it"),
      blocks: [
        {
          type: "table",
          head: [l("Horizon", "Horizon"), l("Ce qu'on regarde", "What to look at"), l("Ce qu'on en tire", "What it tells")],
          rows: [
            [l("La séance", "The session"), l("la variation jour", "the day's variation"), l("presque toujours 0,00 % : pas de transaction. Un chiffre non nul dit qu'une valeur a traité, et laquelle se voit dans le bulletin.", "almost always 0.00 %: no trade. A non-zero figure says a share traded, and which one shows in the bulletin.")],
            [l("Le mois", "The month"), l("le niveau contre celui d'il y a un mois", "the level against one month ago"), l("le sens du marché, une fois les séances vides lissées.", "the direction of the market, once empty sessions are smoothed.")],
            [l("L'année", "The year"), l("depuis le 1er janvier, et sur douze mois glissants", "year to date, and twelve rolling months"), l("le chiffre qui se compare à une obligation (6 à 7 % brut) ou à un fonds.", "the figure that compares to a bond (6 to 7 % gross) or a fund.")],
            [l("Depuis l'entrée", "Since entry"), l("le niveau au jour d'un achat contre aujourd'hui", "the level on a purchase day against today"), l("« mon action a fait +12 %, le marché +7 % » : la valeur a-t-elle bougé avec le marché ou seule ?", "“my share made +12 %, the market +7 %”: did the share move with the market or alone?")],
          ],
        },
        {
          type: "table",
          head: [l("Piège", "Trap"), l("Pourquoi", "Why"), l("La bonne lecture", "The right reading")],
          rows: [
            [l("« Le marché monte »", "“The market is up”"), l("74 % du poids sur une valeur", "74 % of the weight on one share"), l("regarder quelle valeur a traité avant de parler de marché", "look at which share traded before speaking of the market")],
            [l("« Stable, donc rien ne se passe »", "“Stable, so nothing happens”"), l("sans transaction, le cours de référence ne bouge pas", "without a trade the reference price does not move"), l("les volumes disent plus que l'indice", "volumes say more than the index")],
            [l("« Battre l'indice »", "“Beat the index”"), l("sept valeurs, liquidité sur trois mois proche de zéro : pas un portefeuille réplicable", "seven shares, three-month liquidity near zero: not a replicable portfolio"), l("un repère de lecture, pas un objectif de gestion", "a reading reference, not a management target")],
            [l("Comparer à un fonds", "Comparing to a fund"), l("les OPCVM de la place sont surtout obligataires et monétaires", "the local funds are mostly bond and money-market funds"), l("une action à l'indice, un fonds obligataire au BTA", "a share to the index, a bond fund to the BTA")],
            [l("Les dividendes", "Dividends"), l("un indice de prix ne les compte pas", "a price index leaves them out"), l("la performance d'un porteur = le cours plus le dividende ; Guichet affiche les deux", "a holder's performance = price plus dividend; Guichet shows both")],
          ],
        },
      ],
    },
    {
      id: "guichet",
      title: l("Où le Guichet le montre", "Where Guichet shows it"),
      blocks: [
        {
          type: "table",
          head: [l("Endroit", "Place"), l("Ce qui s'affiche", "What shows"), l("Source", "Source")],
          rows: [
            [l("Titres (marché secondaire) et Actualités", "Securities (secondary market) and News"), l("le pouls : niveau, séance, un mois, depuis le 1er janvier, douze mois, soixante séances en courbe, l'étiquette « indice de prix », le lien vers la leçon", "the pulse: level, session, one month, year to date, twelve months, sixty sessions in a line, the “price index” tag, the link to the lesson"), l("market_bulletins", "market_bulletins")],
            [l("Sociétés › une action", "Companies › a share"), l("sous le graphique du cours : cours et indice en base 100 sur la période choisie, la phrase (« la valeur a fait plus que le marché »), le poids dans l'indice, le dernier dividende", "under the price chart: share and index rebased to 100 on the chosen period, the sentence (“the share did more than the market”), the weight in the index, the last dividend"), l("quotes + market_bulletins", "quotes + market_bulletins")],
            [l("Comparer", "Compare"), l("deux actions : l'indice sur douze mois remplace le BTA comme repère des rendements ; une ligne « Dans l'indice BVMAC » (poids, liquidité)", "two shares: the twelve-month index replaces the BTA as the returns reference; a row “In the BVMAC index” (weight, liquidity)"), l("quotes + market_bulletins", "quotes + market_bulletins")],
            [l("Santé", "Health"), l("« Indice BVMAC et cours d'actions » : une variation publiée sans cours d'action changé dans la lecture (ou l'inverse) passe en orange", "“BVMAC index and share prices”: a published variation with no share price changed in the reading (or the reverse) turns orange"), l("quotesOn(séance), bulletin", "quotesOn(session), bulletin")],
            [l("Guide › Comprendre le marché › Instruments", "Guide › Understanding the market › Instruments"), l("la leçon « L'indice de la BVMAC : ce qu'il dit, ce qu'il ne dit pas », avec le niveau vivant, les poids et le curseur « une valeur bouge »", "the lesson “The BVMAC index: what it says, what it does not”, with the live level, the weights and the “one share moves” slider"), l("les mêmes", "the same")],
          ],
        },
        {
          type: "steps",
          items: [
            l("La méthodologie : écrire à la BVMAC (courrier dans docs/courrier-bvmac-indice.md), verser la réponse au Dépôt › Références, reprendre ses termes dans cette page et dans la leçon ; alors le Guichet recalcule l'indice à partir des cours lus et le contrôle Santé devient exact.", "The methodology: write to the BVMAC (letter in docs/courrier-bvmac-indice.md), file the answer at Repository › References, take its terms into this page and the lesson; Guichet then recomputes the index from the prices read and the Health check becomes exact."),
            l("Le pouls dit « indice de prix » tant que la BVMAC n'a pas confirmé ; les poids sont montrés dans les deux lectures, marquées.", "The pulse says “price index” until the BVMAC confirms; weights are shown in both readings, marked."),
          ],
        },
      ],
    },
  ],
};
