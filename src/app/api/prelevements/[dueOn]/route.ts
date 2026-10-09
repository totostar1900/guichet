import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { csvDeLaRemise, refDeLaRemise, type LigneDeRemise } from "@/lib/domain/prelevement";

export const dynamic = "force-dynamic";

/**
 * LE FICHIER DE LA REMISE, tel qu'il part à la banque.
 *
 * Il se régénère à la demande à partir des tirages de l'échéance, et non d'un
 * fichier rangé quelque part. C'est volontaire tant que le format n'est pas
 * arrêté avec la banque : ranger un fichier dont on sait que la forme va
 * changer donnerait l'illusion d'une pièce, alors que la pièce est la liste
 * des tirages remis, qui elle ne bouge pas.
 *
 * Il ne prend QUE les tirages remis : un tirage encore en préparation, ou dont
 * le préavis n'est pas parti, n'a rien à faire dans un fichier que la banque
 * va exécuter.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ dueOn: string }> }) {
  await requireDesk("/desk/prelevements");
  const { dueOn } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) return new Response("Échéance illisible", { status: 400 });

  const r = repo();
  const [tirages, mandats] = await Promise.all([r.listTirages({ dueOn }), r.listMandats()]);
  const parId = new Map(mandats.map((m) => [m.id, m]));
  const lignes: LigneDeRemise[] = tirages
    .filter((t) => t.state !== "prepare" && t.state !== "abandonne")
    .map((t) => {
      const m = parId.get(t.mandatId);
      return {
        ref: t.ref,
        mandatRef: m?.ref ?? t.mandatId,
        dueOn: t.dueOn,
        titulaire: m?.accountHolder ?? "",
        banque: m?.bankName ?? "",
        compte: m?.bankAccount ?? "",
        amount: t.amount,
        libelle: m?.objet === "provision" ? "Purpose Capital - provision" : "Purpose Capital - epargne programmee",
      };
    });
  if (!lignes.length) return new Response("Aucun tirage remis à cette échéance", { status: 404 });

  const ref = refDeLaRemise(dueOn);
  return new Response(csvDeLaRemise(ref, lignes), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${ref}.csv"`,
      "cache-control": "no-store",
    },
  });
}
