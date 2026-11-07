/**
 * LES COMPTEURS D'UN IMPORT OJA, EXPLIQUÉS (7 novembre 2026, demande du dirigeant : « une bulle à chaque KPI : ce que le chiffre veut dire, les actions à mener, l'apport »).
 *
 * Chaque bulle répond à trois questions, dans le même ordre : CE QUE C'EST, CE QU'IL Y A À FAIRE, À QUOI ÇA SERT. Une ligne vide sépare les trois.
 */
export type CleKpiOja = "nouvellesFiables" | "nouvellesAConfirmer" | "ecarts" | "concordantes" | "ignorees" | "nouvelles";

/** Les cinq onglets de la liste des séances : « tout », puis les quatre états. */
export type CleOnglet = "tout" | "a_lire" | "a_relire" | "relue" | "ecartee";

const trois = (ce: string, faire: string, sert: string) => `${ce}\n\nÀ faire : ${faire}\n\nÀ quoi ça sert : ${sert}`;

export const KPI_OJA: Record<CleKpiOja, { titre: string; texte: string }> = {
  nouvellesFiables: {
    titre: "Nouvelles fiables",
    texte: trois(
      "Séances présentes dans l'export OJA et absentes du Desk, dont l'état des offres est lisible (depuis le 1er février 2023) : le taux et les montants se recalculent avec la règle exacte.",
      "laissez la case « Importer et confirmer » cochée. Les séances sont créées avec la source « Excel » et confirmées sous votre nom.",
      "elles comblent les trous de l'historique. Elles alimentent la courbe des rendements, la comparaison sur une période passée et la fiche de chaque ligne.",
    ),
  },
  nouvellesAConfirmer: {
    titre: "À confirmer (avant 2023)",
    texte: trois(
      "Séances nouvelles d'avant le 1er février 2023, quand l'état des offres est ambigu : le taux recalculé peut être faux.",
      "ne les importez que si vous pouvez les vérifier sur le communiqué. Elles entrent sans être confirmées.",
      "elles allongent l'historique. Tant qu'elles ne sont pas confirmées par une personne, le client ne les voit pas.",
    ),
  },
  ecarts: {
    titre: "Écarts à trancher",
    texte: trois(
      "Séances déjà au Desk dont au moins un chiffre diffère entre le communiqué (PDF) et l'export Excel.",
      "ouvrez la liste et gardez la source proposée par la règle, ou changez-la champ par champ. La règle propose l'Excel pour une erreur d'unité ou un chiffre qui se contredit (depuis 2023), le communiqué sinon. Chaque choix est tracé.",
      "corriger un chiffre faux avant qu'il n'atteigne un client. Les deux valeurs et le motif du choix restent gardés.",
    ),
  },
  concordantes: {
    titre: "Concordantes",
    texte: trois(
      "Séances déjà au Desk dont les chiffres de l'Excel sont les mêmes que ceux du communiqué.",
      "rien. L'import ajoute l'Excel comme seconde source de la séance.",
      "deux sources indépendantes disent la même chose : le chiffre est plus sûr. Plus il y en a, plus l'historique est solide.",
    ),
  },
  ignorees: {
    titre: "Ignorées",
    texte: trois(
      "Séances laissées de côté : carnet du jour encore ouvert, séances rejetées par OJA, séances que le Desk a écartées.",
      "rien en général. Si un nombre vous surprend, ouvrez la séance concernée dans le tableau des adjudications.",
      "l'import ne reprend ni séance en cours ni séance annulée : aucun taux qui n'a pas existé n'entre dans la base.",
    ),
  },
  nouvelles: {
    titre: "Nouvelles séances",
    texte: trois(
      "Séances créées au Desk par ce dernier import, parce qu'elles n'y existaient pas.",
      "ouvrez-les dans le tableau et confirmez sur la pièce celles qui sont marquées « à confirmer ».",
      "mesurer ce que l'import a réellement apporté à l'historique. Un chiffre à zéro veut dire que le Desk était déjà à jour.",
    ),
  },
};

/**
 * LES ONGLETS DE LA LISTE DES SÉANCES, EXPLIQUÉS (7 novembre 2026) : ce que l'onglet contient, ce que le Desk en attend, à quoi cela sert.
 * Même forme que les compteurs de l'import : trois paragraphes, dans le même ordre.
 */
export const ONGLETS_SEANCES: Record<CleOnglet, { titre: string; texte: string }> = {
  tout: {
    titre: "Toutes les séances",
    texte: trois(
      "Les séances de travail : à lire, à relire et relues. Les écartées n'en font pas partie.",
      "rien en soi. L'objectif est que « À lire » et « À relire » tombent à zéro. Servez-vous de la recherche (Trésor, durée, code) pour retrouver une séance.",
      "c'est la mémoire de ce que le marché a payé, séance par séance.",
    ),
  },
  a_lire: {
    titre: "À lire",
    texte: trois(
      "Séances que le robot a déposées avec leur identité mais sans aucun chiffre : le communiqué n'a encore rien donné.",
      "ouvrir le communiqué, lancer « Lire le communiqué » ou saisir les chiffres à la main, puis enregistrer.",
      "sans chiffres, une séance ne donne ni taux ni point de courbe.",
    ),
  },
  a_relire: {
    titre: "À relire",
    texte: trois(
      "Séances dont les chiffres sont posés (lus par la machine, repris d'un import Excel ou saisis) mais qu'aucune personne n'a confirmés.",
      "comparer avec le communiqué, corriger au besoin, puis confirmer. Les bons du Trésor fiables se confirment en lot, depuis la bande du haut.",
      "seule une séance confirmée fonde un taux, une courbe et ce que le client voit.",
    ),
  },
  relue: {
    titre: "Relues",
    texte: trois(
      "Séances confirmées par une personne : leurs chiffres font foi.",
      "rien, sauf si un écart apparaît plus tard (import Excel, correction). Une séance relue se rouvre depuis sa fiche, et rien n'est jamais définitif.",
      "c'est la base de tous les rendements affichés, des comparaisons sur une période passée et des fiches des lignes.",
    ),
  },
  ecartee: {
    titre: "Écartées",
    texte: trois(
      "Pièces qui ne sont pas un résultat (séance annulée ou infructueuse, doublon, communiqué hors sujet) : rangées, jamais effacées.",
      "de temps en temps, vérifier qu'aucune séance utile n'y dort, et la remettre d'un clic si besoin.",
      "garder la file de travail propre sans rien perdre : l'import OJA les ignore.",
    ),
  },
};

/** L'anglais des mêmes bulles : les clefs sont les textes français composés, tels que `Info` les passe à `t()`. */
const trois_en = (ce: string, faire: string, sert: string) => `${ce}\n\nTo do: ${faire}\n\nWhat it is for: ${sert}`;

const EN_PARTS: Record<CleKpiOja, { titre: string; texte: string }> = {
  nouvellesFiables: {
    titre: "New and reliable",
    texte: trois_en(
      "Sessions present in the OJA export and missing from the Desk, whose offer states are readable (from 1 February 2023): the rate and amounts are recomputed with the exact rule.",
      "leave the « Import and confirm » box ticked. The sessions are created with the source « Excel » and confirmed under your name.",
      "they fill the gaps in the history. They feed the yield curve, the comparison over a past period and the sheet of each line.",
    ),
  },
  nouvellesAConfirmer: {
    titre: "To confirm (before 2023)",
    texte: trois_en(
      "New sessions from before 1 February 2023, when the offer states are ambiguous: the recomputed rate may be wrong.",
      "import them only if you can check them against the notice. They come in unconfirmed.",
      "they lengthen the history. Until a person confirms them, the client does not see them.",
    ),
  },
  ecarts: {
    titre: "Discrepancies to settle",
    texte: trois_en(
      "Sessions already in the Desk where at least one figure differs between the notice (PDF) and the Excel export.",
      "open the list and keep the source the rule proposes, or change it field by field. The rule proposes the Excel for a unit error or a self-contradicting figure (from 2023), the notice otherwise. Every choice is traced.",
      "correct a wrong figure before it reaches a client. Both values and the reason for the choice are kept.",
    ),
  },
  concordantes: {
    titre: "Matching",
    texte: trois_en(
      "Sessions already in the Desk whose Excel figures are the same as the notice's.",
      "nothing. The import adds the Excel as the session's second source.",
      "two independent sources say the same thing: the figure is safer. The more there are, the sounder the history.",
    ),
  },
  ignorees: {
    titre: "Ignored",
    texte: trois_en(
      "Sessions left aside: today's order book still open, sessions OJA rejected, sessions the Desk set aside.",
      "nothing in general. If a number surprises you, open the session in the auctions table.",
      "the import takes neither a session in progress nor a cancelled one: no rate that never existed enters the database.",
    ),
  },
  nouvelles: {
    titre: "New sessions",
    texte: trois_en(
      "Sessions created in the Desk by this latest import, because they did not exist there.",
      "open them in the table and confirm against the document those marked « to confirm ».",
      "measure what the import really added to the history. A zero means the Desk was already up to date.",
    ),
  },
};

const EN_ONGLETS: Record<CleOnglet, { titre: string; texte: string }> = {
  tout: {
    titre: "All sessions",
    texte: trois_en("Working sessions: to read, to review and reviewed. Set-aside ones are not included.", "nothing in itself. The goal is for « To read » and « To review » to fall to zero. Use the search (Treasury, maturity, code) to find a session.", "it is the memory of what the market paid, session by session."),
  },
  a_lire: {
    titre: "To read",
    texte: trois_en("Sessions the robot filed with their identity but no figure at all: the notice has yielded nothing yet.", "open the notice, run « Read the notice » or key the figures in by hand, then save.", "without figures, a session gives neither a rate nor a point on the curve."),
  },
  a_relire: {
    titre: "To review",
    texte: trois_en("Sessions whose figures are set (read by the machine, taken from an Excel import or keyed in) but that no person has confirmed.", "compare with the notice, correct if needed, then confirm. Reliable Treasury bills are confirmed in a batch from the top strip.", "only a confirmed session grounds a rate, a curve and what the client sees."),
  },
  relue: {
    titre: "Reviewed",
    texte: trois_en("Sessions confirmed by a person: their figures are authoritative.", "nothing, unless a discrepancy shows up later (Excel import, correction). A reviewed session is reopened from its sheet, and nothing is ever final.", "it is the basis of every yield shown, of past-period comparisons and of the line sheets."),
  },
  ecartee: {
    titre: "Set aside",
    texte: trois_en("Documents that are not a result (cancelled or unsuccessful session, duplicate, off-topic notice): filed away, never deleted.", "now and then, check that no useful session is sleeping there, and put it back with one click if needed.", "keep the work queue clean without losing anything: the OJA import ignores them."),
  },
};

/** Les paires français → anglais, à verser dans le dictionnaire (`en-oja.ts`). */
export const EN_KPI_OJA: Record<string, string> = Object.fromEntries([
  ...(Object.keys(KPI_OJA) as CleKpiOja[]).flatMap((k) => [
    [KPI_OJA[k].titre, EN_PARTS[k].titre],
    [KPI_OJA[k].texte, EN_PARTS[k].texte],
  ]),
  ...(Object.keys(ONGLETS_SEANCES) as CleOnglet[]).flatMap((k) => [
    [ONGLETS_SEANCES[k].titre, EN_ONGLETS[k].titre],
    [ONGLETS_SEANCES[k].texte, EN_ONGLETS[k].texte],
  ]),
]);
