"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { direLeGestePasseSeul, quatreYeux } from "@/lib/desk/quatre-yeux";
import { JOURS_DE_MESURE, MESURES, MESURE_LABEL, MOTIFS_DE_MESURE, type Mesure, type MotifDeMesure } from "@/lib/domain/mesure";

export type MesureResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  userId: z.string().min(1),
  mesure: z.enum(MESURES),
  motif: z.string().optional(),
  jours: z.coerce.number().min(1).max(365).optional(),
});

/**
 * POSER OU LEVER UNE MESURE.
 *
 * Trois exigences, et elles tiennent ensemble.
 *
 * UN MOTIF PRIS DANS LA LISTE, jamais une phrase libre : une cause qui se
 * réécrit n'est plus contestable. Et c'est le motif qui décide de ce que le
 * client lit : celui de conformité ne lui dit rien, et ce silence est la loi.
 *
 * UNE DURÉE PAR DÉFAUT, quatre-vingt-dix jours, parce qu'une mesure sans
 * terme reste en place par oubli. Elle tombe d'elle-même ; la lever plus tôt
 * reste possible.
 *
 * DEUX PERSONNES, PAS DEUX RÔLES. Le contrôle à quatre yeux de la maison
 * s'applique : quand il ne peut pas s'appliquer, le geste passe et le dit,
 * plutôt que de bloquer un desk d'une seule personne.
 */
export async function poserMesureAction(_p: MesureResult | null, form: FormData): Promise<MesureResult> {
  const me = await requireResponsable("/desk/clients");
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Saisie invalide." };
  const { userId, mesure } = p.data;
  const motif = p.data.motif as MotifDeMesure | undefined;
  if (mesure !== "aucune" && (!motif || !(motif in MOTIFS_DE_MESURE))) return { ok: false, error: "Choisissez un motif dans la liste." };

  const r = repo();
  const contact = await r.getContact(userId);
  if (!contact) return { ok: false, error: "Client introuvable." };
  const avant = contact.mesure;

  const verdict = await quatreYeux(me, mesure === "aucune" ? "Levée d'une mesure" : `Mesure « ${MESURE_LABEL[mesure as Mesure]} »`);
  if (verdict.quoi === "attend") return { ok: false, error: "Un second responsable doit confirmer cette mesure. Elle a été proposée." };
  if (verdict.quoi === "seul") await direLeGestePasseSeul(me, mesure === "aucune" ? "Levée d une mesure" : "Mesure sur un compte", userId, verdict.raison ?? "", verdict.motif ?? "");

  const jusquAu =
    mesure === "aucune"
      ? undefined
      : new Date(Date.now() + (p.data.jours ?? JOURS_DE_MESURE) * 86_400_000).toISOString().slice(0, 10);
  const apres = { mesure, motif: mesure === "aucune" ? undefined : motif, par: me.name, le: new Date().toISOString(), jusquAu };
  await r.setMesure(userId, apres);
  await audit("client.mesure", "profile", userId, { before: avant, after: apres, reason: motif ? MOTIFS_DE_MESURE[motif].libelle : "levée" });
  await r.logEvent({
    kind: "desk",
    html:
      mesure === "aucune"
        ? `Mesure <b>levée</b> sur le compte de ${contact.name} par ${me.name}`
        : `<b>${MESURE_LABEL[mesure as Mesure]}</b> posé sur le compte de ${contact.name} par ${me.name} · ${motif ? MOTIFS_DE_MESURE[motif].libelle : ""} · jusqu'au ${jusquAu}`,
  });
  revalidatePath("/desk/clients");
  revalidatePath("/desk/repertoire");
  return {
    ok: true,
    message: mesure === "aucune" ? "Mesure levée. Le compte fonctionne de nouveau normalement." : `${MESURE_LABEL[mesure as Mesure]} jusqu'au ${jusquAu}. Le client en est informé sur son espace.`,
  };
}
