import type { BudgetEtat, Country, NoteBudget } from "@/lib/domain/types";
import { ecartsEntre, notesDe } from "./budget";
import { releveDuBudget } from "./note-budget";

/**
 * CE QUI ATTEND D'ÊTRE ÉCRIT.
 *
 * LE DÉFAUT QUE CE CARNET CORRIGE. Une note qui ne s'écrit que lorsqu'on la
 * demande s'écrit quand quelqu'un est déjà inquiet. La série penche alors vers
 * les crises et se tait dans le calme — et le récit dans la durée, qui est le
 * but, s'en trouve faussé. Le remède n'est PAS de produire la note
 * automatiquement : ce serait le calendrier qu'on a écarté, et une note
 * produite d'office n'engage personne. C'est que l'outil SIGNALE qu'il y a de
 * quoi écrire, et laisse le desk décider.
 *
 * CE QUE LE CARNET NE FAIT JAMAIS, et qui tient en trois interdits :
 *   il n'écrit pas la note ; il ne la date pas ; il ne la suggère à aucun
 *   client. Il pose une ligne sur un carnet, et c'est tout. La maison sait
 *   déjà le faire — « Santé », « Robots muets », la fraîcheur des séries
 *   signalent sans agir.
 *
 * CHAQUE SIGNAL EST UN FAIT MESURÉ, JAMAIS UNE IMPRESSION. « Le baril diverge
 * depuis deux trimestres » serait invérifiable ici : rien dans les données ne
 * porte l'historique d'une hypothèse. Le carnet dit donc ce qu'il sait —
 * « constaté à 100 $ contre 62,38 $ retenu » — et laisse la durée à qui écrit.
 *
 * ET IL SE TAIT QUAND LE DESK A DÉJÀ ÉCRIT. Un signal qui reste allumé après
 * qu'on y a répondu devient du papier peint : la maison a déjà vu un lecteur
 * de bulletins signaler soixante lectures partielles pendant un an sans que
 * personne n'agisse, parce que rien ne changeait jamais.
 */
export type GenreDeSignal = "jamais_ecrite" | "releve_a_bouge" | "hypothese_diverge" | "note_vieillit";

export interface Signal {
  pays: Country;
  exercice: number;
  genre: GenreDeSignal;
  /** Les trous de la phrase : la page compose, le domaine ne rédige pas. */
  params: Record<string, string>;
}

/**
 * LES PHRASES, EN GABARIT. Le domaine ne rend pas de texte composé : une
 * phrase fabriquée ici traverserait t() sous forme de variable et resterait en
 * français dans l'interface anglaise. Le gabarit, lui, est une clef.
 */
export const DIT: Record<GenreDeSignal, string> = {
  jamais_ecrite: "Aucune note écrite. Le relevé date du {releve}.",
  releve_a_bouge: "Le relevé a changé sur {postes} poste(s) depuis la note n° {numero}.",
  hypothese_diverge: "{libelle} : {constate} constaté, contre {valeur} retenu par la loi.",
  note_vieillit: "Dernière note il y a {mois} mois.",
};

/**
 * SIX MOIS, ET POURQUOI CE NOMBRE. C'est le rythme du socle semestriel qu'on a
 * écarté : la note ne tombe plus à date fixe, mais passé ce délai l'outil
 * remarque qu'un dossier n'a rien reçu. Remarquer n'est pas produire.
 */
export const MOIS_AVANT_DE_S_INQUIETER = 6;

/** Les mois pleins entre deux jours, sans prétendre à la précision du calendrier. */
export const moisEntre = (depuis: string, jusqua: string): number => {
  const a = new Date(depuis);
  const b = new Date(jusqua);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.max(0, b.getDate() < a.getDate() ? m - 1 : m);
};

/**
 * Le carnet d'un État. `aujourdHui` est passé et jamais lu de l'horloge : un
 * signal qui dépend de l'heure du serveur ne se teste pas, et celui-ci dit
 * « il y a sept mois » à quelqu'un qui va le citer.
 */
export function signauxDe(b: BudgetEtat, notes: NoteBudget[], aujourdHui: string): Signal[] {
  const out: Signal[] = [];
  const serie = notesDe(notes, b.pays, b.exercice);
  const derniere = serie[0];
  const cadre = { pays: b.pays, exercice: b.exercice };

  if (!derniere) {
    out.push({ ...cadre, genre: "jamais_ecrite", params: { releve: b.source.releveLe } });
  } else {
    /* L'ÉCART SE MESURE AVEC LA MÊME MACHINE QUE LA FICHE. Si le tableau des
       écarts de la prochaine note aurait quelque chose à montrer, c'est qu'il
       y a quelque chose à écrire : la question est exactement la même. */
    const bouge = ecartsEntre(derniere, { ...derniere, releve: releveDuBudget(b) }).filter((e) => e.change);
    if (bouge.length) out.push({ ...cadre, genre: "releve_a_bouge", params: { postes: String(bouge.length), numero: String(derniere.numero) } });

    const mois = moisEntre(derniere.closeLe, aujourdHui);
    if (mois >= MOIS_AVANT_DE_S_INQUIETER) out.push({ ...cadre, genre: "note_vieillit", params: { mois: String(mois) } });
  }

  for (const h of b.hypotheses ?? []) {
    if (!h.constate || h.constate === h.valeur) continue;
    /* ET IL SE TAIT QUAND LA DERNIÈRE NOTE PORTE DÉJÀ CE CONSTAT : le desk a
       écrit dessus, le signal a fait son travail. S'il bouge ensuite, c'est
       « le relevé a changé » qui le dira. */
    if (derniere?.releve.some((r) => r.cle === `${h.cle}_constate` && r.valeur === h.constate)) continue;
    out.push({ ...cadre, genre: "hypothese_diverge", params: { libelle: h.libelle, constate: h.constate, valeur: h.valeur } });
  }

  return out;
}

/**
 * LES TROUS, PRÊTS POUR L'ÉCRAN. Le domaine range une date telle qu'elle est
 * écrite — « 2026-10-25 » —, parce qu'une date formatée n'est plus comparable.
 * L'écran la met au format de la maison, et le formateur est passé : le
 * domaine ne connaît ni la langue, ni le fuseau de qui lit.
 */
export const trousDe = (s: Signal, fmtDate: (d: string) => string): Record<string, string> =>
  s.params.releve ? { ...s.params, releve: fmtDate(s.params.releve) } : s.params;

/** L'ordre de lecture : le dossier muet d'abord, le dossier qui dort en dernier. */
const RANG: Record<GenreDeSignal, number> = { jamais_ecrite: 0, releve_a_bouge: 1, hypothese_diverge: 2, note_vieillit: 3 };

export function carnet(budgets: BudgetEtat[], notes: NoteBudget[], aujourdHui: string): Signal[] {
  return budgets
    .flatMap((b) => signauxDe(b, notes, aujourdHui))
    .sort((x, y) => RANG[x.genre] - RANG[y.genre] || x.pays.localeCompare(y.pays));
}
