"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { accuseDeReception, pourquoiPasDeTemoignage, type CeQueDitLeClient } from "@/lib/domain/temoignage";
import { escapeHtml, fmt, localIso } from "@/lib/format";

export type TemoignageResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Le client dit ce qu'il a vu sur son compte.
 *
 * Pour un compte-titres tenu ailleurs, il est la seule personne au monde qui le
 * sache : l'argent ne passe pas par la maison. L'écran lui annonçait pourtant
 * « l'émetteur doit encore ces sommes, et le desk les suit », sans aucun bouton.
 *
 * CE GESTE NE CRÉDITE RIEN, et c'est le point qu'il faut tenir. Un client qui
 * dit « reçu » ne fait pas entrer d'argent au journal : il donne au desk une
 * raison d'aller chercher la pièce. Laisser une déclaration créditer
 * rouvrirait, à l'envers, la faute que ce lot entier corrige : une écriture
 * sans preuve.
 *
 * La clef du flux arrive du formulaire et n'est pas vérifiée contre
 * l'échéancier du client. Elle le pourrait, au prix de recalculer toutes ses
 * positions à chaque clic ; elle porte son identifiant d'opération, donc une
 * clef forgée ne désignerait qu'une échéance d'un autre, et la ligne reste
 * rangée sous CE client. Le desk n'affiche que les témoignages qui tombent sur
 * une échéance réelle du client, et une clef inventée n'apparaît nulle part.
 */
export async function direLeFlux(_p: TemoignageResult | null, form: FormData): Promise<TemoignageResult> {
  const s = await requireSession("/");
  const flowKey = String(form.get("flowKey") ?? "").trim();
  const said = String(form.get("said") ?? "").trim() as CeQueDitLeClient;
  const brut = String(form.get("saidAmount") ?? "").replace(/\s/g, "").replace(",", ".");
  const saidAmount = brut ? Number(brut) : undefined;
  const saidOn = String(form.get("saidOn") ?? "").trim() || undefined;
  const note = String(form.get("note") ?? "").trim().slice(0, 240) || undefined;
  if (!flowKey) return { ok: false, error: "Échéance introuvable." };

  const empeche = pourquoiPasDeTemoignage({ said, saidAmount, saidOn, aujourdHui: localIso(new Date()) });
  if (empeche) return { ok: false, error: empeche };

  const r = repo();
  const t = await r.direLeFlux({ userId: s.userId, flowKey, said, saidAmount, saidOn, note });
  await audit("flux.temoignage", "client", s.userId, { after: { flowKey, said, saidAmount, saidOn, temoignage: t.id }, reason: `le client dit « ${said} » sur ${flowKey}` });
  await r.logEvent({
    kind: "desk",
    html:
      said === "rien"
        ? `<b>${escapeHtml(s.name)} n'a rien reçu</b> sur une échéance attendue : à relancer auprès de l'émetteur${note ? ` · « ${escapeHtml(note)} »` : ""}`
        : said === "autre"
          ? `<b>${escapeHtml(s.name)} a reçu ${fmt(Math.round(saidAmount ?? 0))} FCFA</b> au lieu du montant annoncé${saidOn ? `, le ${saidOn}` : ""}${note ? ` · « ${escapeHtml(note)} »` : ""}`
          : `${escapeHtml(s.name)} confirme avoir reçu une échéance${saidOn ? `, le ${saidOn}` : ""} : la pièce reste à rapprocher${note ? ` · « ${escapeHtml(note)} »` : ""}`,
  });
  revalidatePath("/");
  revalidatePath("/desk/encaissements");
  return { ok: true, message: accuseDeReception(said) };
}
