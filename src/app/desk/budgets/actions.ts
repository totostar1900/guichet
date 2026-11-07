"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { RELEVE_OFFICIEL } from "@/data/budgets-officiels";
import type { BudgetEtat, EtatDuMillesime, PorteDeFinancement } from "@/lib/domain/types";
import { PAYS_CEMAC } from "@/lib/market/budget";
import { lireLignesBudget } from "@/lib/market/pieces";

export type BudgetResult = { ok: true; message: string } | { ok: false; error: string };

const MILLESIMES: EtatDuMillesime[] = ["vote", "revision_annoncee", "revision_deposee", "revise"];

async function ecrire(b: BudgetEtat, acteur: string, motif: string) {
  const avant = (await repo().budgetsDesEtats()).find((x) => x.pays === b.pays && x.exercice === b.exercice);
  await repo().upsertBudgetEtat(b);
  await audit("budget.enregistre", "budget_etat", `${b.pays}-${b.exercice}`, { before: avant, after: b, actor: acteur, reason: motif });
}

/** Charge le relevé des pièces officielles (tous les États, ou un seul), sous le nom de celui qui clique. Ce qui existait part au journal d'audit. */
export async function chargerReleve(_p: BudgetResult | null, form: FormData): Promise<BudgetResult> {
  const me = await requireDesk("/desk/budgets");
  const pays = String(form.get("pays") ?? "tous");
  const liste = pays === "tous" ? RELEVE_OFFICIEL : RELEVE_OFFICIEL.filter((b) => b.pays === pays);
  if (!liste.length) return { ok: false, error: "Aucun relevé officiel pour cet État." };
  for (const b of liste) await ecrire(b, me.name, `relevé des pièces officielles du 7 novembre 2026 : ${b.pays} ${b.exercice}`);
  revalidatePath("/desk/budgets", "layout");
  revalidatePath("/pays", "layout");
  return { ok: true, message: `${liste.length} budget(s) enregistré(s) : ${liste.map((b) => b.pays).join(", ")}.` };
}

const schema = z.object({
  pays: z.enum(PAYS_CEMAC as [string, ...string[]]),
  exercice: z.coerce.number().int().min(2020).max(2035),
  millesime: z.enum(MILLESIMES as [EtatDuMillesime, ...EtatDuMillesime[]]),
  loi: z.string().trim().min(5).max(300),
  promulgueeLe: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  budgetTotal: z.string().optional(),
  solde: z.string().optional(),
  besoin: z.string().optional(),
  source: z.string().trim().min(5).max(300),
  sourceUrl: z.string().trim().url().refine((u) => u.startsWith("https://"), "https").optional().or(z.literal("")),
});

const montant = (v: string | undefined): number | undefined | "refus" => {
  const t = (v ?? "").trim();
  if (!t) return undefined;
  const n = Number(t.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 1000) : "refus";
};

/** La saisie d'un budget : montants en milliards, postes un par ligne (« libellé | montant »), « | titres » pour la porte des titres publics. Rien n'est calculé : le solde est celui que la pièce écrit. */
export async function enregistrerBudget(_p: BudgetResult | null, form: FormData): Promise<BudgetResult> {
  const me = await requireDesk("/desk/budgets");
  const p = schema.safeParse(Object.fromEntries(form.entries()));
  if (!p.success) return { ok: false, error: "Renseignez le pays, l'exercice, le millésime, le texte de la loi et la pièce source (adresse en https)." };
  const refus: string[] = [];
  const rec = lireLignesBudget(String(form.get("recettes") ?? ""));
  const dep = lireLignesBudget(String(form.get("depenses") ?? ""));
  const fin = lireLignesBudget(String(form.get("financement") ?? ""));
  refus.push(...rec.refus.map((r) => `Recettes, ${r}`), ...dep.refus.map((r) => `Dépenses, ${r}`), ...fin.refus.map((r) => `Financement, ${r}`));
  const total = montant(p.data.budgetTotal);
  const solde = montant(p.data.solde);
  const besoin = montant(p.data.besoin);
  if (total === "refus" || solde === "refus" || besoin === "refus") refus.push("Un montant n'est pas un nombre (milliards, virgule ou point).");
  if (refus.length) return { ok: false, error: refus.join(" · ") };
  const refs = String(form.get("references") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [titre, editeur, url] = l.split("|").map((x) => x.trim());
      return { titre, editeur: editeur || "non nommé", url: url && /^https:\/\/\S+$/.test(url) ? url : undefined, verifieLe: new Date().toISOString().slice(0, 10) };
    });
  const b: BudgetEtat = {
    pays: p.data.pays as BudgetEtat["pays"],
    exercice: p.data.exercice,
    millesime: p.data.millesime,
    loi: p.data.loi,
    promulgueeLe: p.data.promulgueeLe || undefined,
    hypotheses: [],
    budgetTotal: total as number | undefined,
    recettes: rec.postes.map(({ cle, libelle, montant }) => ({ cle, libelle, montant })),
    depenses: dep.postes.map(({ cle, libelle, montant }) => ({ cle, libelle, montant })),
    soldeDeclare: solde as number | undefined,
    besoinDeFinancement: besoin as number | undefined,
    financement: fin.postes as PorteDeFinancement[],
    source: { texte: p.data.source, releveLe: new Date().toISOString().slice(0, 10), url: p.data.sourceUrl || undefined },
    references: refs,
    aRelever: String(form.get("aRelever") ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
  };
  await ecrire(b, me.name, `saisie du budget ${b.pays} ${b.exercice} au Desk`);
  revalidatePath("/desk/budgets", "layout");
  revalidatePath("/pays", "layout");
  return { ok: true, message: `Budget ${b.pays} ${b.exercice} enregistré.` };
}
