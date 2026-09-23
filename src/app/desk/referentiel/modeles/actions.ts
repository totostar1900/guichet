"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { isResponsable } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { checkPassage, PASSAGES, type TemplateScope } from "@/lib/documents/passages";

export type ModelResult = { ok: true; message: string } | { ok: false; error: string };

const findDef = (docType: string, passage: string) => (PASSAGES[docType as TemplateScope] ?? []).find((d) => d.key === passage);

/**
 * A new version of a passage. « libre » is current at once; « relu » waits
 * for another desk member; « réglementaire » waits for a responsable. The
 * previous current version is kept as superseded, never erased.
 */
export async function saveModelTextAction(_p: ModelResult | null, form: FormData): Promise<ModelResult> {
  const desk = await requireDesk("/desk/referentiel/modeles");
  const docType = String(form.get("docType") ?? "");
  const passage = String(form.get("passage") ?? "");
  const fr = String(form.get("fr") ?? "").trim();
  const en = String(form.get("en") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();
  const def = findDef(docType, passage);
  if (!def) return { ok: false, error: "Passage inconnu." };
  const bad = checkPassage(def, fr, en);
  if (bad) return { ok: false, error: bad };
  const status = def.sensitivity === "libre" ? "current" : "pending";
  const row = await repo().addTemplateText({ docType: docType as TemplateScope, passage, fr, en, status, by: desk.name, note: note || undefined, approvedBy: status === "current" ? desk.name : undefined, approvedAt: status === "current" ? new Date().toISOString() : undefined });
  await audit("template.text", "template", `${docType}:${passage}`, { after: { version: row.version, status, fr, en }, reason: note || undefined });
  await repo().logEvent({ kind: "desk", html: `<b>Modèle ${docType}</b> · passage « ${def.label} » : version ${row.version} ${status === "current" ? "en vigueur" : "proposée"} par ${desk.name}${note ? ` : ${note}` : ""}` });
  revalidatePath("/desk/referentiel/modeles");
  return { ok: true, message: status === "current" ? `Version ${row.version} en vigueur.` : def.sensitivity === "relu" ? `Version ${row.version} enregistrée : un autre membre du desk doit la relire pour la mettre en vigueur.` : `Version ${row.version} enregistrée : un responsable doit l'approuver.` };
}

/** Makes a version current: the reader (another member) for « relu », a responsable for « réglementaire »; any older version can come back this way. */
export async function activateModelTextAction(_p: ModelResult | null, form: FormData): Promise<ModelResult> {
  const desk = await requireDesk("/desk/referentiel/modeles");
  const id = String(form.get("id") ?? "");
  const rows = await repo().listTemplateTexts();
  const row = rows.find((r) => r.id === id);
  if (!row) return { ok: false, error: "Version introuvable." };
  const def = findDef(row.docType, row.passage);
  if (!def) return { ok: false, error: "Passage inconnu." };
  if (def.sensitivity === "reglementaire" && !isResponsable(desk)) return { ok: false, error: "Un passage réglementaire n'entre en vigueur que par un responsable." };
  if (def.sensitivity === "relu" && row.status === "pending" && row.by === desk.name && !isResponsable(desk)) return { ok: false, error: "La relecture se fait par un autre membre du desk que l'auteur." };
  await repo().setTemplateTextStatus(id, "current", desk.name);
  await audit("template.activate", "template", `${row.docType}:${row.passage}`, { after: { version: row.version }, reason: `mise en vigueur par ${desk.name}` });
  await repo().logEvent({ kind: "desk", html: `<b>Modèle ${row.docType}</b> · passage « ${def.label} » : version ${row.version} mise en vigueur par ${desk.name}` });
  revalidatePath("/desk/referentiel/modeles");
  return { ok: true, message: `Version ${row.version} en vigueur.` };
}

/** Back to the code's default: no version current; the older ones stay in the history. */
export async function resetModelTextAction(_p: ModelResult | null, form: FormData): Promise<ModelResult> {
  const desk = await requireDesk("/desk/referentiel/modeles");
  if (!isResponsable(desk)) return { ok: false, error: "Le retour au texte d'origine se fait par un responsable." };
  const docType = String(form.get("docType") ?? "");
  const passage = String(form.get("passage") ?? "");
  const rows = (await repo().listTemplateTexts(docType as TemplateScope)).filter((r) => r.passage === passage && r.status === "current");
  for (const r of rows) await repo().setTemplateTextStatus(r.id, "superseded");
  await audit("template.reset", "template", `${docType}:${passage}`, { reason: `texte d'origine rétabli par ${desk.name}` });
  revalidatePath("/desk/referentiel/modeles");
  return { ok: true, message: "Texte d'origine rétabli." };
}
