"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { REF } from "@/lib/reference";
import { direLeGestePasseSeul, quatreYeux } from "@/lib/desk/quatre-yeux";
import { registreEnBrouillon, registrePublie } from "@/lib/desk/registre-data";
import { estMotifDEcart, MOTIFS_D_ECART, termeParDefaut, type Ecarte } from "@/lib/domain/registre-ecartes";

export type RegistreResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  nom: z.string().trim().min(2).max(120),
  naissance: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  pieceType: z.string().trim().max(40).optional(),
  pieceNumero: z.string().trim().max(60).optional(),
  motif: z.string().trim(),
  note: z.string().trim().max(600).optional(),
  jusquAu: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * INSCRIRE QUELQU'UN : UN BROUILLON, JAMAIS UNE INSCRIPTION.
 *
 * Écarter une personne lui ferme la maison, et c'est plus grave que de
 * changer un mot du glossaire. Elle attend donc la publication, comme tout
 * le référentiel, et la publication demande une seconde personne.
 */
export async function inscrireAction(_p: RegistreResult | null, form: FormData): Promise<RegistreResult> {
  const me = await requireResponsable("/desk/referentiel/registre");
  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== ""));
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Il faut au moins un nom, et un motif pris dans la liste." };
  const { nom, naissance, pieceType, pieceNumero, motif, note, jusquAu } = p.data;
  if (!estMotifDEcart(motif)) return { ok: false, error: "Motif inconnu." };

  /* UNE INSCRIPTION QUI N'ACCROCHERA JAMAIS RIEN EST PIRE QUE PAS
     D'INSCRIPTION : le desk croit la personne écartée et elle ne l'est pas.
     Sans numéro de pièce, il faut au moins un nom ET une date de naissance,
     parce qu'un nom seul ne produit aucune correspondance. */
  if (!pieceNumero && !naissance) {
    return { ok: false, error: "Sans numéro de pièce, la date de naissance est obligatoire : un nom seul n'accroche rien, et l'inscription serait muette." };
  }
  if (jusquAu && MOTIFS_D_ECART[motif].sansTerme === false && jusquAu < new Date().toISOString().slice(0, 10)) {
    return { ok: false, error: "Le terme est déjà passé : l'inscription ne compterait pour personne." };
  }

  const id = `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const e: Ecarte = {
    id,
    nom,
    naissance,
    pieceType,
    pieceNumero,
    motif,
    note,
    par: me.name,
    le: new Date().toISOString(),
    jusquAu: jusquAu ?? termeParDefaut(motif),
  };
  await repo().saveReferenceDraft(REF.ecartes, id, { op: "set", data: e }, me.name);
  revalidatePath("/desk/referentiel/registre");
  return { ok: true, message: "Inscription en brouillon. Personne n'est écarté tant qu'elle n'est pas publiée." };
}

/**
 * LEVER UNE INSCRIPTION, SANS L'EFFACER.
 *
 * Savoir qu'on a écarté quelqu'un puis qu'on s'est ravisé vaut mieux qu'une
 * ligne disparue : c'est la règle des instructions arrêtées, et c'est aussi
 * la seule façon de répondre à quelqu'un qui demande pourquoi on l'a refusé
 * l'an dernier.
 */
export async function leverAction(_p: RegistreResult | null, form: FormData): Promise<RegistreResult> {
  const me = await requireResponsable("/desk/referentiel/registre");
  const id = String(form.get("id") ?? "").trim();
  const motif = String(form.get("leveeMotif") ?? "").trim();
  if (!id) return { ok: false, error: "Inscription introuvable." };
  if (motif.length < 4) return { ok: false, error: "Dites pourquoi vous levez cette inscription : c'est ce que lira la personne suivante." };
  const e = (await registrePublie()).find((x) => x.id === id) ?? (await registreEnBrouillon()).find((x) => x.id === id);
  if (!e) return { ok: false, error: "Inscription introuvable." };
  const leve: Ecarte = { ...e, leveeLe: new Date().toISOString(), leveePar: me.name, leveeMotif: motif.slice(0, 300) };
  await repo().saveReferenceDraft(REF.ecartes, id, { op: "set", data: leve }, me.name);
  revalidatePath("/desk/referentiel/registre");
  return { ok: true, message: "Levée en brouillon. Elle prendra effet à la publication." };
}

/**
 * PUBLIER : LA SECONDE PERSONNE, PARCE QUE C'EST UN REFUS D'ENTRER.
 *
 * Une mesure se pose à quatre yeux ; une inscription au registre vaut une
 * mesure posée d'avance sur quelqu'un qui n'est pas encore client, et qui
 * ne saura donc pas qu'elle existe. Elle en mérite au moins autant.
 */
export async function publierRegistreAction(_p: RegistreResult | null, form: FormData): Promise<RegistreResult> {
  const me = await requireResponsable("/desk/referentiel/registre");
  const mot = String(form.get("mot") ?? "").trim().toLowerCase();
  if (mot !== "publier") return { ok: false, error: "Recopiez le mot « publier » pour confirmer." };
  const brouillons = await registreEnBrouillon();
  if (brouillons.length === 0) return { ok: false, error: "Aucun brouillon à publier." };

  const quoi = brouillons.length === 1 ? (brouillons[0].leveeLe ? `Levée de « ${brouillons[0].nom} » au registre` : `Inscription de « ${brouillons[0].nom} » au registre`) : `${brouillons.length} changements au registre des personnes écartées`;
  const verdict = await quatreYeux(me, quoi);
  if (verdict.quoi === "attend") return { ok: false, error: "Un second responsable doit confirmer cette publication. Elle a été proposée." };
  if (verdict.quoi === "seul") await direLeGestePasseSeul(me, "Publication au registre des personnes écartées", brouillons[0].id, verdict.raison ?? "", verdict.motif ?? "");

  const r = repo();
  await r.publishReference(REF.ecartes, brouillons.map((b) => b.id));
  for (const b of brouillons) {
    await audit(b.leveeLe ? "registre.lever" : "registre.inscrire", "reference", `${REF.ecartes}/${b.id}`, { after: b, reason: b.leveeLe ? b.leveeMotif : MOTIFS_D_ECART[b.motif].libelle });
  }
  /* LE JOURNAL DU DESK NE NOMME PAS LE MOTIF DE CONFORMITÉ. Le registre est
     déjà derrière le desk, mais un événement se relit à vingt, et un soupçon
     écrit en clair dans un fil commun finit par se savoir. */
  const dits = brouillons.map((b) => (b.leveeLe ? `levée de ${b.nom}` : MOTIFS_D_ECART[b.motif].conformite ? `${b.nom} (motif de conformité)` : `${b.nom} · ${MOTIFS_D_ECART[b.motif].libelle}`));
  await r.logEvent({ kind: "desk", html: `Registre des personnes écartées : <b>${brouillons.length} changement(s)</b> publié(s) par ${me.name} · ${dits.join(" · ")}` });
  revalidatePath("/desk/referentiel/registre");
  revalidatePath("/desk/clients");
  return { ok: true, message: `${brouillons.length} changement(s) publié(s). Les dossiers soumis sont relus au prochain affichage.` };
}

export async function jeterRegistreAction(): Promise<RegistreResult> {
  await requireResponsable("/desk/referentiel/registre");
  const brouillons = await registreEnBrouillon();
  await repo().discardReference(REF.ecartes, brouillons.map((b) => b.id));
  revalidatePath("/desk/referentiel/registre");
  return { ok: true, message: "Brouillons abandonnés." };
}
