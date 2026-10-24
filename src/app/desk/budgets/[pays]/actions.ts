"use server";

import { revalidatePath } from "next/cache";
import { requireDesk } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { repo } from "@/lib/data";
import type { NoteBudget, ParagrapheNote } from "@/lib/domain/types";
import { notesDe, paysDuSlug, slugDuPays } from "@/lib/market/budget";
import { numeroSuivant, releveDuBudget, verifierNote, type BrouillonNote, type Refus } from "@/lib/market/note-budget";

/**
 * ÉCRIRE UNE NOTE DU DESK. ELLE S'AJOUTE, ELLE NE SE REPREND PAS.
 *
 * Trois choses se décident ici plutôt que dans le formulaire, parce qu'un
 * formulaire se contourne et qu'une action serveur ne se contourne pas :
 *
 *  1. LE RELEVÉ EST PRIS SUR LA FICHE, jamais saisi. « Ce qui a changé depuis
 *     la note précédente » ne vaut que si les deux relevés sortent du même
 *     endroit ; frappés à la main, ils compareraient de l'orthographe.
 *  2. LE RANG EST CALCULÉ sur la série existante. Laissé au rédacteur, il se
 *     chevaucherait, et « depuis la n° 2 » cesserait de désigner quelque chose.
 *  3. LE REFUS EST ENTIER. Tous les manquements reviennent d'un coup : un
 *     formulaire qui recale un champ à la fois fait recommencer cinq fois, et
 *     au cinquième on écrit n'importe quoi pour qu'il se taise.
 *
 * PAS D'« approvalReason » : cette écriture ne touche aucun terme financier —
 * ni prix, ni ticket, ni échéancier. Elle range une lecture datée, signée, et
 * l'audit en porte l'avant et l'après comme pour toute écriture métier.
 */
export type EcritureNote = { ok?: string; error?: string; refus?: Refus[] };

const lignes = (v: FormDataEntryValue | null): string[] =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

/** Les paragraphes arrivent en deux colonnes parallèles : un genre, un texte. */
function corpsDuFormulaire(form: FormData): ParagrapheNote[] {
  const genres = form.getAll("corps_genre").map(String);
  const textes = form.getAll("corps_texte").map(String);
  return genres
    .map((g, i) => ({ genre: g === "lecture" ? ("lecture" as const) : ("constat" as const), texte: (textes[i] ?? "").trim() }))
    .filter((p) => p.texte.length > 0);
}

export async function ecrireNoteAction(_prev: EcritureNote | null, form: FormData): Promise<EcritureNote> {
  const slug = String(form.get("pays") ?? "");
  const desk = await requireDesk(`/desk/budgets/${slug}`);
  const pays = paysDuSlug(slug);
  if (!pays) return { error: "État inconnu." };

  const r = repo();
  const budget = (await r.budgetsDesEtats()).find((b) => b.pays === pays);
  /* Une note commente un texte. Sans budget relevé, elle commenterait le vide,
     et son relevé serait vide lui aussi : le fil ne pourrait plus rien montrer. */
  if (!budget) return { error: "Aucun budget relevé sur cet État : une note n'aurait rien à commenter." };

  const brouillon: BrouillonNote = {
    titre: String(form.get("titre") ?? "").trim(),
    enUnePhrase: String(form.get("enUnePhrase") ?? "").trim(),
    motif: String(form.get("motif") ?? "").trim(),
    demandeePar: String(form.get("demandeePar") ?? "").trim(),
    corps: corpsDuFormulaire(form),
    surveiller: lignes(form.get("surveiller")),
    malLu: String(form.get("malLu") ?? "").trim(),
  };

  const refus = verifierNote(brouillon);
  if (refus.length) return { refus, error: `La note n'a pas été écrite : ${refus.length} point${refus.length > 1 ? "s" : ""} à reprendre.` };

  const precedentes = notesDe(await r.notesBudget(), pays, budget.exercice);
  const precedente = precedentes[0];

  const note: NoteBudget = {
    id: crypto.randomUUID(),
    pays,
    exercice: budget.exercice,
    numero: numeroSuivant(precedentes),
    titre: brouillon.titre,
    enUnePhrase: brouillon.enUnePhrase,
    motif: brouillon.motif,
    demandeePar: brouillon.demandeePar,
    redigeePar: desk.name,
    closeLe: new Date().toISOString(),
    corps: brouillon.corps,
    surveiller: brouillon.surveiller,
    malLu: brouillon.malLu,
    releve: releveDuBudget(budget),
  };

  try {
    await r.createNoteBudget(note);
  } catch {
    /* Le rang était libre il y a un instant : quelqu'un d'autre a écrit entre
       les deux. Le dire plutôt que renuméroter dans son dos. */
    return { error: "Une note du même rang vient d'être écrite. Rafraîchissez la page : votre texte repartira du rang suivant." };
  }

  /**
   * L'AVANT N'EST PAS « RIEN ». Une note s'ajoute, mais ce qu'elle change,
   * c'est l'état de la série : le relevé que le desk tenait pour courant.
   * Ranger ce relevé-là en « avant » donne au journal exactement le tableau
   * d'écarts que la page affiche, vérifiable sans ouvrir la page.
   */
  await audit("note_budget.ecrite", "note_budget", note.id, {
    before: precedente ? { numero: precedente.numero, closeLe: precedente.closeLe, releve: precedente.releve } : undefined,
    after: { numero: note.numero, closeLe: note.closeLe, releve: note.releve, titre: note.titre },
    reason: `${desk.name} a écrit la note n° ${note.numero} sur ${pays} ${budget.exercice}, demandée par ${note.demandeePar} : ${note.motif}`,
  });

  await r.logEvent({
    kind: "desk",
    html: `<b>Note de budget</b> n° ${note.numero} sur ${pays} ${budget.exercice} : « ${note.titre} » · demandée par ${note.demandeePar} · par ${desk.name}`,
  });

  revalidatePath(`/desk/budgets/${slugDuPays(pays)}`);
  revalidatePath("/desk/budgets");
  return {
    ok: precedente
      ? `Note n° ${note.numero} écrite. Le tableau des écarts avec la n° ${precedente.numero} est calculé : relisez-le avant de la citer.`
      : `Note n° ${note.numero} écrite — la première de la série sur ${pays} ${budget.exercice}.`,
  };
}
