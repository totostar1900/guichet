/**
 * LES COMPTEURS D'UN IMPORT OJA, EXPLIQUÉS (7 novembre 2026, demande du dirigeant : « une bulle à chaque KPI : ce que le chiffre veut dire, les actions à mener, l'apport »).
 *
 * Chaque bulle répond à trois questions, dans le même ordre : CE QUE C'EST, CE QU'IL Y A À FAIRE, À QUOI ÇA SERT. Une ligne vide sépare les trois.
 */
export type CleKpiOja = "nouvellesFiables" | "nouvellesAConfirmer" | "ecarts" | "concordantes" | "ignorees" | "nouvelles";

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

/** Les paires français → anglais, à verser dans le dictionnaire (`en-oja.ts`). */
export const EN_KPI_OJA: Record<string, string> = Object.fromEntries(
  (Object.keys(KPI_OJA) as CleKpiOja[]).flatMap((k) => [
    [KPI_OJA[k].titre, EN_PARTS[k].titre],
    [KPI_OJA[k].texte, EN_PARTS[k].texte],
  ]),
);
