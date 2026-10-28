import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { apercuDuMandat } from "@/lib/documents/generate";

/**
 * LE MANDAT QUE LE CLIENT LIT AVANT DE LE SIGNER.
 *
 * RELEVÉ À L'AUDIT DES PIÈCES SIGNÉES du 27 octobre 2026 : le client
 * autorisait sa banque à être débitée sans avoir vu le papier qui le dit. Il
 * relisait des chiffres sur un formulaire ; la pièce, elle, naissait dans le
 * geste de signer.
 *
 * La maison avait déjà tranché la même question pour la convention — « on
 * demandait une signature sur un texte inaccessible » — et la route voisine du
 * modèle de convention en est la réponse. Celle-ci est son équivalent pour une
 * pièce PERSONNELLE : un mandat ne se montre pas en modèle vierge, puisque ce
 * qu'il faut relire est le compte à débiter, le titulaire et le montant.
 *
 * ─── TROIS GARDES, ET CHACUNE A SA RAISON ──────────────────────────────────
 *
 *   LE SIEN, ET LE SIEN SEUL. On lit les mandats DU CLIENT CONNECTÉ et on y
 *   cherche l'identifiant : un identifiant deviné ne désigne alors rien, et la
 *   question de l'appartenance ne se pose pas deux fois. C'est la mécanique
 *   déjà employée partout où le client agit sur sa propre pièce.
 *
 *   SEULEMENT TANT QU'IL N'EST PAS SIGNÉ. Une fois signé, l'exemplaire
 *   définitif existe, numéroté, dans ses documents : servir un aperçu à côté
 *   ferait deux papiers pour une autorisation, et le client ne saurait pas
 *   lequel remettre à son agence. On renvoie donc vers le vrai.
 *
 *   JAMAIS EN TÉLÉCHARGEMENT. « inline » : c'est une lecture avant décision,
 *   pas une pièce à garder. Celle qu'on garde porte un numéro.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return new NextResponse("Connexion requise", { status: 401 });
  const { id } = await params;
  const mien = (await repo().listMandats(s.userId)).find((m) => m.id === id);
  if (!mien) return new NextResponse("Mandat introuvable", { status: 404 });
  if (mien.signedAt) return new NextResponse("Ce mandat est signé : son exemplaire définitif est dans vos documents.", { status: 409 });
  const pdf = await apercuDuMandat(id);
  if (!pdf) return new NextResponse("Aperçu indisponible", { status: 404 });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="apercu-mandat-${mien.ref}.pdf"`,
      /* AUCUN CACHE : le client corrige son mandat et relit. Une version gardée
         lui montrerait les chiffres d'avant sa correction, sur le document même
         qu'il s'apprête à autoriser. */
      "cache-control": "no-store",
    },
  });
}
