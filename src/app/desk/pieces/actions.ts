"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { RELEVE_OFFICIEL } from "@/data/budgets-officiels";
import { ETATS, INSTITUTIONS } from "@/lib/market/pays";
import { PAYS_CEMAC } from "@/lib/market/budget";
import { TAILLE_MAX_PIECE, entiteDeBudget, typeAdmis } from "@/lib/market/pieces";
import { lireAdresse, ranger } from "@/lib/market/pieces-archive";

export type PieceResult = { ok: true; message: string } | { ok: false; error: string };

/** Les entités qui peuvent avoir des pièces : les États et institutions des fiches, et le budget de chaque État. */
const entitesPermises = new Set<string>([...ETATS.map((e) => e.entite), ...INSTITUTIONS.map((i) => i.entite), ...PAYS_CEMAC.map((p) => entiteDeBudget(p))]);

const schema = z.object({
  entite: z.string().refine((e) => entitesPermises.has(e), "entité inconnue"),
  objet: z.enum(["budget", "notation", "autre"]),
  titre: z.string().trim().min(3).max(160),
  editeur: z.string().trim().min(2).max(160),
  url: z.string().trim().max(1000).optional(),
});

/** Garde la copie d'une pièce : lue à l'adresse donnée par le serveur, ou déposée à la main. Journal d'audit à chaque prise. */
export async function archiverPiece(_p: PieceResult | null, form: FormData): Promise<PieceResult> {
  const me = await requireDesk("/desk/pays");
  const p = schema.safeParse({ entite: form.get("entite"), objet: form.get("objet"), titre: form.get("titre"), editeur: form.get("editeur"), url: String(form.get("url") ?? "") || undefined });
  if (!p.success) return { ok: false, error: "Renseignez la pièce : son titre, son éditeur, et l'adresse ou le fichier." };
  const fichier = form.get("fichier");
  let octets: Uint8Array;
  let type: string | undefined;
  if (fichier instanceof File && fichier.size > 0) {
    if (fichier.size > TAILLE_MAX_PIECE) return { ok: false, error: "Fichier trop lourd (60 Mo au plus)." };
    octets = new Uint8Array(await fichier.arrayBuffer());
    type = typeAdmis(fichier.type, octets);
    if (!type) return { ok: false, error: "Un PDF, une page web ou une image : pas d'autre format." };
  } else if (p.data.url) {
    const lu = await lireAdresse(p.data.url);
    if ("error" in lu) return { ok: false, error: lu.error };
    octets = lu.octets;
    type = lu.type;
  } else return { ok: false, error: "Donnez une adresse https ou déposez le fichier." };
  const r = await ranger({ entite: p.data.entite, objet: p.data.objet, titre: p.data.titre, editeur: p.data.editeur, urlOrigine: p.data.url, octets, type, par: me.name });
  if (!r.ok) return r;
  if (!r.deja) await audit("piece.archivee", "piece_archivee", r.piece.id, { after: { ...r.piece }, actor: me.name, reason: `copie de « ${r.piece.titre} » (${r.piece.editeur}), empreinte ${r.piece.sha256.slice(0, 12)}` });
  revalidatePath("/desk/pays", "layout");
  revalidatePath("/desk/budgets", "layout");
  revalidatePath("/pays", "layout");
  return { ok: true, message: r.deja ? "Cette pièce était déjà conservée, identique à l'octet près." : `Copie conservée (${(r.piece.taille / 1048576).toFixed(1)} Mo, empreinte ${r.piece.sha256.slice(0, 12)}).` };
}

/** Prend, d'un coup, la copie de toutes les pièces citées par le relevé officiel d'un État. Celles que le site refuse sont nommées, et se déposent à la main. */
export async function archiverReleve(_p: PieceResult | null, form: FormData): Promise<PieceResult> {
  const me = await requireDesk("/desk/budgets");
  const pays = String(form.get("pays") ?? "");
  const b = RELEVE_OFFICIEL.find((x) => x.pays === pays);
  if (!b) return { ok: false, error: "Aucun relevé officiel pour cet État." };
  const entite = entiteDeBudget(b.pays, b.exercice);
  let prises = 0;
  let dejaLa = 0;
  const echecs: string[] = [];
  for (const r of b.references ?? []) {
    if (!r.url) continue;
    const lu = await lireAdresse(r.url);
    if ("error" in lu) {
      echecs.push(`${r.titre} : ${lu.error}`);
      continue;
    }
    const res = await ranger({ entite, objet: "budget", titre: r.titre, editeur: r.editeur, urlOrigine: r.url, octets: lu.octets, type: lu.type, par: me.name });
    if (!res.ok) {
      echecs.push(`${r.titre} : ${res.error}`);
      continue;
    }
    if (res.deja) dejaLa++;
    else {
      prises++;
      await audit("piece.archivee", "piece_archivee", res.piece.id, { after: { ...res.piece }, actor: me.name, reason: `copie de « ${res.piece.titre} » (${res.piece.editeur}), empreinte ${res.piece.sha256.slice(0, 12)}` });
    }
  }
  revalidatePath("/desk/budgets", "layout");
  revalidatePath("/pays", "layout");
  const dit = `${prises} copie(s) prise(s), ${dejaLa} déjà conservée(s)${echecs.length ? `. À déposer à la main : ${echecs.join(" · ")}` : "."}`;
  return prises + dejaLa > 0 ? { ok: true, message: dit } : { ok: false, error: dit };
}
