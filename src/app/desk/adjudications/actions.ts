"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDesk } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { repo } from "@/lib/data";
import { confirmable, millions, type NewAuctionResult } from "@/lib/market/auction-results";
import { auctionReadingAvailable, readAuctionResult, readingTrouble } from "@/lib/market/auction-extract";
import { auctionYield } from "@/lib/market/yield";
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

/**
 * Confirme toute une file, par le même chemin qu'une séance seule.
 *
 * La session du desk est exigée comme ailleurs, la recevabilité est vérifiée
 * séance par séance, et chaque confirmation écrit son entrée au journal sous le
 * nom du signataire. Seul le nombre de clics change.
 *
 * Une séance irrecevable est comptée et nommée, elle n'annule pas les autres.
 */
export async function confirmBatchAction(_prev: ResultOutcome | null, form: FormData): Promise<ResultOutcome> {
  const desk = await requireDesk("/desk/adjudications");
  const instrument = String(form.get("instrument") ?? "");
  if (instrument !== "BTA" && instrument !== "OTA") return { ok: false, error: "Instrument inconnu." };
  const pays = String(form.get("pays") ?? "");

  const r = repo();
  const attente = (await r.listAuctionResults({ limit: 1000 })).filter(
    (x) => !x.confirmedBy && x.instrument === instrument && (!pays || x.country === pays),
  );

  let signees = 0;
  let muettes = 0;
  const refusees: string[] = [];
  for (const avant of attente) {
    const manque = confirmable(avant) ?? (avant.codeEmission ? null : "le code d'émission");
    if (manque) {
      refusees.push(`${avant.country} ${avant.sessionOn}`);
      continue;
    }
    const after = await r.updateAuctionResult(avant.id, { confirmedBy: desk.name, confirmedAt: new Date().toISOString() });
    if (!auctionYield(after)) muettes += 1;
    signees += 1;
    /* Une entrée par séance : un lot ne doit pas laisser une trace plus pauvre
       qu'un geste unitaire, sans quoi la relecture en lot serait un moyen de
       signer moins visiblement. */
    await audit("auction.confirm", "auction_result", after.id, {
      before: { confirmedBy: null },
      after: { confirmedBy: desk.name, rateAvg: after.rateAvg ?? null, priceAvg: after.priceAvg ?? null },
      reason: `Confirmation en lot : ${after.country}, ${after.instrument} ${after.tenor}, séance du ${after.sessionOn}`,
    });
  }

  if (signees) {
    await r.logEvent({
      kind: "desk",
      html: `<b>${signees} séance(s) ${instrument}</b> confirmées en lot par ${desk.name}${pays ? ` (${pays})` : ""}${muettes ? ` · ${muettes} ne donnent pas de rendement` : ""}`,
    });
  }
  revalidatePath("/desk/adjudications");
  revalidatePath("/desk/analyses");
  if (!signees) return { ok: false, error: refusees.length ? `Aucune séance signée : ${refusees.length} irrecevable(s).` : "Aucune séance en attente pour ce choix." };
  return {
    ok: true,
    message:
      `${signees} séance(s) confirmées.` +
      (muettes ? ` ${muettes} ne publient qu'une fourchette et ne donneront aucun rendement.` : "") +
      (refusees.length ? ` ${refusees.length} écartée(s), faute de chiffre ou de code : ${refusees.slice(0, 4).join(", ")}${refusees.length > 4 ? "…" : ""}.` : ""),
  };
}

/** Défait la confirmation, quand la relecture s'est trompée de colonne. */
export async function reopenResultAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/adjudications");
  const id = String(form.get("id") ?? "");
  const before = await repo().getAuctionResult(id);
  if (!before?.confirmedBy) return;
  await repo().reopenAuctionResult(id);
  await audit("auction.reopen", "auction_result", id, { before: { confirmedBy: before.confirmedBy }, after: { confirmedBy: null } });
  await repo().logEvent({ kind: "desk", html: `Adjudication rouverte par ${desk.name} : <b>${before.instrument} ${before.tenor}</b>, séance du ${before.sessionOn}` });
  revalidatePath("/desk/adjudications");
}

/**
 * La machine lit, la personne arrête.
 *
 * La lecture enregistre ce qu'elle a lu, et ne remplit que ce qui est vide. Le
 * robot de lecture en masse le faisait depuis le début ; l'écran, lui, ne gardait
 * rien, et une séance tchadienne a été lue plusieurs fois de suite sans que sa
 * ligne cesse d'être vide. Deux chemins pour un même geste, deux comportements :
 * c'était l'incohérence, pas le malentendu.
 *
 * Ce qui reste intouché est la confirmation, et c'est là qu'est la barrière : un
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
    const { proposal, remarks, seconds, model } = await readAuctionResult(Buffer.from(bytes).toString("base64"), hint);
    // Seuls les champs vides se remplissent : ce que le desk a corrigé reste.
    const vide = <T,>(actuel: T | null | undefined, lu: T | undefined) => (actuel == null ? lu : undefined);
    await repo().updateAuctionResult(id, {
      codeEmission: r.codeEmission ?? proposal.codeEmission,
      tenor: r.tenor && r.tenor !== "—" ? r.tenor : (proposal.tenor ?? r.tenor),
      announced: vide(r.announced, proposal.announced),
      bid: vide(r.bid, proposal.bid),
      served: vide(r.served, proposal.served),
      networkSize: vide(r.networkSize, proposal.networkSize),
      bidders: vide(r.bidders, proposal.bidders),
      rateMin: vide(r.rateMin, proposal.rateMin),
      rateMax: vide(r.rateMax, proposal.rateMax),
      rateLimit: vide(r.rateLimit, proposal.rateLimit),
      rateAvg: vide(r.rateAvg, proposal.rateAvg),
      priceMin: vide(r.priceMin, proposal.priceMin),
      priceMax: vide(r.priceMax, proposal.priceMax),
      priceLimit: vide(r.priceLimit, proposal.priceLimit),
      priceAvg: vide(r.priceAvg, proposal.priceAvg),
      coverage: vide(r.coverage, proposal.coverage),
      priceAvgFcfa: vide(r.priceAvgFcfa, proposal.priceAvgFcfa),
      yieldAvg: vide(r.yieldAvg, proposal.yieldAvg),
      yieldLimit: vide(r.yieldLimit, proposal.yieldLimit),
      couponRate: vide(r.couponRate, proposal.couponRate),
      maturityOn: vide(r.maturityOn, proposal.maturityOn),
    });
    revalidatePath("/desk/adjudications");
    revalidatePath("/desk/adjudications/tableau");
    return {
      ok: true,
      message: `Lue en ${String(seconds).replace(".", ",")} s par ${model} et enregistrée. Vérifiez chaque chiffre sur la pièce, puis confirmez.`,
      proposal,
      remarks,
    };
  } catch (e) {
    // Le détail technique part au journal, où il se retrouve ; l'écran reçoit
    // une phrase qui dit quoi faire. Recracher la réponse brute de l'API dans le
    // formulaire apprend au desk à ne plus lire ses propres messages.
    const brut = e instanceof Error ? e.message : String(e);
    await repo()
      .logEvent({ kind: "system", html: `Lecture d'adjudication refusée (séance du ${r.sessionOn}, ${r.instrument} ${r.tenor}) : ${brut.slice(0, 400).replace(/</g, "&lt;")}` })
      .catch(() => {});
    return { ok: false, error: readingTrouble(brut) };
  }
}
