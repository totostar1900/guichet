"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDesk } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { repo } from "@/lib/data";
import { confirmable, millions, type NewAuctionResult } from "@/lib/market/auction-results";
import { auctionReadingAvailable, readAuctionResult } from "@/lib/market/auction-extract";
import { readSource } from "@/lib/intake/storage";

export interface ResultOutcome {
  ok: boolean;
  error?: string;
  message?: string;
  /** La lecture proposée par la machine : posée dans les champs, écrite nulle part. */
  proposal?: Partial<NewAuctionResult>;
  remarks?: string[];
}

/**
 * La lecture d'un communiqué de résultats : proposée par la machine, arrêtée ici.
 *
 * Le robot dépose l'identité de la séance, qu'il lit dans le titre de la BEAC.
 * Les chiffres, eux, sont à l'intérieur d'un scan, et c'est une personne qui les
 * relève avec la pièce sous les yeux. Deux boutons, donc, et la différence entre
 * les deux est tout l'intérêt de l'écran : enregistrer garde le travail en
 * cours, confirmer engage la maison. Tant que « confirmedBy » est vide, aucune
 * offre ne se fonde sur ce taux.
 */

/** Les montants se saisissent en millions, comme le communiqué les imprime, et se gardent en francs. */
const money = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d.,-]/g, "").replace(",", "."))
  .transform((v) => (v === "" ? undefined : Number(v)))
  .refine((v) => v === undefined || Number.isFinite(v), "Montant illisible")
  .transform((v) => (v === undefined ? undefined : millions(v)));

const pct = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d.,-]/g, "").replace(",", "."))
  .transform((v) => (v === "" ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0 && v <= 1000), "Pourcentage illisible");

const count = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isInteger(v) && v >= 0 && v < 1000), "Nombre illisible");

const schema = z.object({
  id: z.string().min(1),
  codeEmission: z.string().trim().max(40).optional(),
  tenor: z.string().trim().min(1).max(40),
  announced: money,
  bid: money,
  served: money,
  networkSize: count,
  bidders: count,
  rateMin: pct,
  rateMax: pct,
  rateLimit: pct,
  rateAvg: pct,
  priceMin: pct,
  priceMax: pct,
  priceLimit: pct,
  priceAvg: pct,
  coverage: pct,
  offerId: z.string().trim().max(120).optional(),
});

const read = (form: FormData) =>
  schema.safeParse({
    id: String(form.get("id") ?? ""),
    codeEmission: String(form.get("codeEmission") ?? ""),
    tenor: String(form.get("tenor") ?? ""),
    announced: String(form.get("announced") ?? ""),
    bid: String(form.get("bid") ?? ""),
    served: String(form.get("served") ?? ""),
    networkSize: String(form.get("networkSize") ?? ""),
    bidders: String(form.get("bidders") ?? ""),
    rateMin: String(form.get("rateMin") ?? ""),
    rateMax: String(form.get("rateMax") ?? ""),
    rateLimit: String(form.get("rateLimit") ?? ""),
    rateAvg: String(form.get("rateAvg") ?? ""),
    priceMin: String(form.get("priceMin") ?? ""),
    priceMax: String(form.get("priceMax") ?? ""),
    priceLimit: String(form.get("priceLimit") ?? ""),
    priceAvg: String(form.get("priceAvg") ?? ""),
    coverage: String(form.get("coverage") ?? ""),
    offerId: String(form.get("offerId") ?? ""),
  });

const patchFrom = (d: z.infer<typeof schema>): Partial<NewAuctionResult> => ({
  codeEmission: d.codeEmission || undefined,
  tenor: d.tenor,
  announced: d.announced,
  bid: d.bid,
  served: d.served,
  networkSize: d.networkSize,
  bidders: d.bidders,
  rateMin: d.rateMin,
  rateMax: d.rateMax,
  rateLimit: d.rateLimit,
  rateAvg: d.rateAvg,
  priceMin: d.priceMin,
  priceMax: d.priceMax,
  priceLimit: d.priceLimit,
  priceAvg: d.priceAvg,
  coverage: d.coverage,
  offerId: d.offerId || undefined,
});

/** Garde la lecture en cours. Elle ne sert de référence à rien tant qu'elle n'est pas confirmée. */
export async function saveResultAction(_prev: ResultOutcome | null, form: FormData): Promise<ResultOutcome> {
  await requireDesk("/desk/adjudications");
  const p = read(form);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  await repo().updateAuctionResult(p.data.id, patchFrom(p.data));
  revalidatePath("/desk/adjudications");
  return { ok: true, message: "Lecture enregistrée. Elle ne sert pas encore de référence." };
}

/**
 * Arrête la lecture : à partir d'ici, ce taux fonde les indications du desk.
 *
 * Le code d'émission est exigé parce que sans lui la séance ne se rattache à
 * aucune ligne, et un chiffre est exigé parce qu'une séance sans chiffre ne dit
 * rien. Le reste peut manquer : tous les Trésors n'impriment pas la même chose.
 */
export async function confirmResultAction(_prev: ResultOutcome | null, form: FormData): Promise<ResultOutcome> {
  const desk = await requireDesk("/desk/adjudications");
  const p = read(form);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  const r = repo();
  const before = await r.getAuctionResult(p.data.id);
  if (!before) return { ok: false, error: "Séance introuvable." };
  const patch = patchFrom(p.data);
  const manque = confirmable({ ...before, ...patch });
  if (manque) return { ok: false, error: `Il manque : ${manque}` };
  const after = await r.updateAuctionResult(p.data.id, { ...patch, confirmedBy: desk.name, confirmedAt: new Date().toISOString() });
  await audit("auction.confirm", "auction_result", after.id, {
    before: { confirmedBy: before.confirmedBy ?? null },
    after: { confirmedBy: desk.name, rateAvg: after.rateAvg ?? null, priceAvg: after.priceAvg ?? null, coverage: after.coverage ?? null, bidders: after.bidders ?? null },
    reason: `Séance du ${after.sessionOn}, ${after.instrument} ${after.tenor}`,
  });
  await r.logEvent({
    kind: "desk",
    html: `Adjudication relue par ${desk.name} : <b>${after.instrument} ${after.tenor}</b>, ${after.country}, séance du ${after.sessionOn}${after.rateAvg != null ? ` · taux moyen ${after.rateAvg} %` : after.priceAvg != null ? ` · prix moyen ${after.priceAvg} %` : ""}`,
  });
  revalidatePath("/desk/adjudications");
  revalidatePath("/desk/a-valider");
  return { ok: true, message: "Séance confirmée : elle sert maintenant de référence." };
}

/** Défait la confirmation, quand la relecture s'est trompée de colonne. */
export async function reopenResultAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/adjudications");
  const id = String(form.get("id") ?? "");
  const before = await repo().getAuctionResult(id);
  if (!before?.confirmedBy) return;
  await repo().updateAuctionResult(id, { confirmedBy: undefined, confirmedAt: undefined });
  await audit("auction.reopen", "auction_result", id, { before: { confirmedBy: before.confirmedBy }, after: { confirmedBy: null } });
  await repo().logEvent({ kind: "desk", html: `Adjudication rouverte par ${desk.name} : <b>${before.instrument} ${before.tenor}</b>, séance du ${before.sessionOn}` });
  revalidatePath("/desk/adjudications");
}

/**
 * La machine lit, la personne arrête.
 *
 * Rien n'est écrit ici. La lecture est renvoyée à l'écran, qui la pose dans les
 * champs à côté de la pièce ouverte ; c'est « Enregistrer » qui la garde et
 * « Confirmer » qui l'engage. La distinction est le sujet de tout l'écran : un
 * chiffre lu de travers sur un scan, s'il devenait référence sans que personne
 * ne l'ait regardé, se propagerait sans bruit à toutes les offres suivantes.
 */
export async function proposeResultAction(_prev: ResultOutcome | null, form: FormData): Promise<ResultOutcome> {
  await requireDesk("/desk/adjudications");
  if (!auctionReadingAvailable()) return { ok: false, error: "Lecture automatique indisponible : ANTHROPIC_API_KEY absente. Les chiffres se saisissent à la main." };
  const id = String(form.get("id") ?? "");
  const r = await repo().getAuctionResult(id);
  if (!r) return { ok: false, error: "Séance introuvable." };
  if (!r.fileKey) return { ok: false, error: "Le communiqué n'a pas été rapatrié : il n'y a rien à lire." };
  try {
    const bytes = await readSource(r.fileKey);
    const hint = `Séance du ${r.sessionOn}, ${r.instrument}${r.tenor && r.tenor !== "—" ? ` ${r.tenor}` : ""}, ${r.country}.`;
    const { proposal, remarks, seconds } = await readAuctionResult(Buffer.from(bytes).toString("base64"), hint);
    return {
      ok: true,
      message: `Lecture proposée en ${String(seconds).replace(".", ",")} s. Vérifiez chaque chiffre sur la pièce : rien n'est encore enregistré.`,
      proposal,
      remarks,
    };
  } catch (e) {
    return { ok: false, error: `Lecture impossible : ${e instanceof Error ? e.message : "erreur"}` };
  }
}
