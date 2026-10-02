"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { standingBlock } from "@/lib/domain/standing";
import { cleEnMots, pourquoiPasDeCle, repartition, type Part } from "@/lib/domain/repartition";
import { fmt, localIso, parseAmount } from "@/lib/format";

export type ModifResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  id: z.string().min(1),
  amount: z.string().optional(),
  minAmount: z.string().optional(),
  dayOfMonth: z.coerce.number().int().min(1).max(28).optional(),
  endsOn: z.string().optional(),
  onBlocked: z.enum(["passer", "arreter"]).default("passer"),
});

/**
 * Modifier une instruction active.
 *
 * MODIFIER, C'EST REMPLACER. L'instruction a produit de vrais ordres, et ces
 * ordres la désignent par son identifiant : la modifier en place ferait mentir
 * le passé, puisqu'un ordre de 50 000 pointerait vers une instruction qui dit
 * 80 000 et que personne ne saurait plus sous quels termes il est parti.
 * L'ancienne passe donc à « remplacée », garde ses ordres et ses termes, et la
 * nouvelle dit laquelle elle remplace. C'est la règle du journal des espèces :
 * on ne réécrit pas, on en passe une autre.
 *
 * ET LA MODIFICATION PÉRIME L'OCCURRENCE OUVERTE, ce qui n'était pas dans la
 * demande et compte plus que le reste. Depuis le préavis, une occurrence peut
 * être annoncée quand le client change ses termes : sans rien faire, le robot
 * exécuterait demain ce qui a été annoncé, c'est-à-dire les ANCIENS termes,
 * sur une instruction qui n'existe plus. La nouvelle instruction en annoncera
 * une au prochain tour, avec les termes que le client vient d'écrire.
 */
export async function modifierStandingAction(_p: ModifResult | null, form: FormData): Promise<ModifResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Connectez-vous." };
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Modification incomplète." };

  const r = repo();
  const mine = await r.listStandingOrders(session.userId);
  const s = mine.find((x) => x.id === p.data.id);
  if (!s) return { ok: false, error: "Instruction introuvable." };
  if (s.state !== "active") return { ok: false, error: "Cette instruction ne court plus : programmez-en une nouvelle." };

  /* La clé arrive en champs parallèles, une ligne par destination. Vide, la
     destination d'origine reste seule : ne rien écrire ne doit pas effacer ce
     qui existe. */
  const dest = form.getAll("splitOffer").map(String);
  const pcts = form.getAll("splitPct").map(String);
  const parts: Part[] = [];
  for (let i = 0; i < dest.length; i += 1) {
    const offerId = (dest[i] ?? "").trim();
    const brut = (pcts[i] ?? "").trim();
    if (!offerId && !brut) continue;
    parts.push({ offerId, pct: Number(brut) });
  }
  const cle = parts.length ? parts : repartition(s);
  const mauvaise = pourquoiPasDeCle(cle);
  if (mauvaise) return { ok: false, error: mauvaise };

  const montant = p.data.amount ? parseAmount(p.data.amount) : s.amount;
  const jour = p.data.dayOfMonth ?? s.dayOfMonth;
  const plancher = p.data.minAmount ? parseAmount(p.data.minAmount) : s.minAmount;
  if (s.source !== "encaissements" && montant <= 0) return { ok: false, error: "Indiquez le montant du versement." };

  /* Chaque destination se relit : un fonds a pu fermer depuis la signature, et
     la clé en nomme peut-être plusieurs. */
  const offres = await Promise.all(cle.map((x) => r.getOffer(x.offerId)));
  for (const [i, o] of offres.entries()) {
    const wrong = standingBlock(o, { amount: s.source === "encaissements" ? 0 : Math.floor((montant * cle[i].pct) / 100), dayOfMonth: jour, startsOn: localIso(new Date()), endsOn: p.data.endsOn || undefined, source: s.source });
    if (wrong.length) return { ok: false, error: cle.length > 1 ? `${o?.title ?? cle[i].offerId} : ${wrong.join(" ")}` : wrong.join(" ") };
  }

  /* L'occurrence annoncée tombe AVANT le remplacement : si la suite échouait,
     mieux vaut un versement manqué qu'un versement aux anciens termes. */
  const ouvertes = (await r.listPreavis({ standingId: s.id, state: "annoncee" }).catch(() => [])).filter((x) => x.state === "annoncee");
  for (const x of ouvertes) await r.cloturerPreavis(x.id, { state: "perimee" });

  const neuve = await r.remplacerStandingOrder(s.id, {
    userId: s.userId,
    clientName: s.clientName,
    clientSegment: s.clientSegment,
    offerId: cle[0].offerId,
    amount: s.source === "encaissements" ? 0 : montant,
    source: s.source,
    minAmount: plancher,
    dayOfMonth: jour,
    startsOn: localIso(new Date()),
    endsOn: p.data.endsOn || undefined,
    onBlocked: p.data.onBlocked,
    channel: s.channel,
    contactPhone: s.contactPhone,
    contactEmail: s.contactEmail,
    splits: cle.length > 1 ? cle : undefined,
  });

  const titre = (id: string) => offres.find((o) => o?.id === id)?.title ?? id;
  const dit = s.source === "encaissements" ? `réinvestissement${plancher ? ` à partir de ${fmt(plancher)} FCFA` : ""}` : `${fmt(montant)} FCFA le ${jour} de chaque mois`;
  await r.logEvent({
    kind: "intent",
    offerId: cle[0].offerId,
    html: `${neuve.ref} (${neuve.clientName}) : <b>nouvelle version</b> de ${s.ref} · ${dit} · ${cleEnMots(cle, titre)}${ouvertes.length ? ` · l'opération annoncée a été annulée` : ""}`,
  });
  await audit("standing.modifier", "standing", neuve.id, {
    before: { ref: s.ref, amount: s.amount, dayOfMonth: s.dayOfMonth, minAmount: s.minAmount, splits: s.splits },
    after: { ref: neuve.ref, amount: neuve.amount, dayOfMonth: neuve.dayOfMonth, minAmount: neuve.minAmount, splits: neuve.splits, perimees: ouvertes.length },
    reason: `nouvelle version de ${s.ref}`,
  });
  revalidatePath("/");
  revalidatePath("/moi/reinvestir");
  return {
    ok: true,
    message: ouvertes.length
      ? `C'est modifié, et l'opération qui était annoncée n'aura pas lieu. La prochaine suivra vos nouveaux termes : ${cleEnMots(cle, titre)}.`
      : `C'est modifié : ${cleEnMots(cle, titre)}. L'ancienne version reste dans votre historique avec les ordres qu'elle a produits.`,
  };
}
