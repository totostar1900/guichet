"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { pourquoiPasArreter } from "@/lib/domain/preavis";
import { escapeHtml, fmt, localIso } from "@/lib/format";

export type ArretResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Arrêter une opération annoncée.
 *
 * C'est ce bouton qui fait d'un préavis autre chose qu'une information. Le robot
 * exécutait puis prévenait ; prévenir sans donner le moyen de dire non aurait
 * seulement déplacé le problème d'une case.
 *
 * L'arrêt ne touche pas l'instruction : un versement arrêté ce mois-ci ne
 * supprime pas l'épargne programmée, et c'est la distinction qui compte. Le
 * client dit non à CETTE occurrence ; s'il veut tout arrêter, l'instruction a sa
 * propre page et son propre geste.
 *
 * Le motif est facultatif, et c'est voulu : exiger une raison pour refuser ce
 * qu'on ne doit pas serait une porte qui pèse.
 */
export async function arreterLOperation(_p: ArretResult | null, form: FormData): Promise<ArretResult> {
  const s = await requireSession("/");
  const id = String(form.get("preavisId") ?? "");
  const motif = String(form.get("reason") ?? "").trim().slice(0, 240) || undefined;
  if (!id) return { ok: false, error: "Opération introuvable." };

  const r = repo();
  /* On ne lit que les occurrences de CE client : une clef devinée ne désigne
     alors rien, et la question de l'appartenance ne se pose pas deux fois. */
  const p = (await r.listPreavis({ userId: s.userId })).find((x) => x.id === id);
  const empeche = pourquoiPasArreter(p, localIso(new Date()));
  if (empeche) return { ok: false, error: empeche };

  try {
    await r.cloturerPreavis(id, { state: "arretee", stopReason: motif });
  } catch {
    // Le robot l'a prise entre-temps : le dire plutôt que de laisser croire.
    return { ok: false, error: "Le robot vient de la traiter. Le desk peut encore annuler l'ordre avant son règlement." };
  }
  await audit("standing.arret", "client", s.userId, { after: { preavis: id, motif }, reason: `arrêt de l'opération annoncée ${fmt(Math.round(p!.amount))} FCFA` });
  await r.logEvent({
    kind: "desk",
    html: `<b>${escapeHtml(s.name)} arrête</b> l'opération annoncée du ${p!.dueOn} (${fmt(Math.round(p!.amount))} FCFA)${motif ? ` · « ${escapeHtml(motif)} »` : ""}. L'instruction reste active.`,
  });
  revalidatePath("/");
  return { ok: true, message: "C'est arrêté : rien ne partira. Votre instruction reste active pour les prochaines fois." };
}
