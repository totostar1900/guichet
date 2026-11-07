"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { AuctionResult, NewAuctionResult } from "@/lib/market/auction-results";
import { planifier, sourcesDeNouvelle, verser, type Decisions, type EcartPropose, type SeanceDuDesk } from "@/lib/market/import-oja";
import type { SeanceOja } from "@/lib/market/oja";
import { CHAMPS, exclure, patchDesColonnes, sourcesDe, trancher, type Champ, type Source } from "@/lib/market/sources-seance";

/**
 * L'IMPORT D'UN EXPORT OJA, CÔTÉ SERVEUR (6 novembre 2026).
 *
 * Le fichier est lu et réduit DANS LE NAVIGATEUR du desk (8 Mo, 32 870 lignes, des comptes acheteurs qui n'ont aucune raison de voyager) : le serveur ne reçoit que les séances,
 * déjà agrégées. Il les revalide (rien de ce qui arrive du navigateur n'est cru sur parole), les rapproche des séances du Desk, et n'écrit qu'après « Importer ».
 */

const champ = z.enum(CHAMPS);
const valeur = z.number().finite().min(0).max(1e13);
const seanceSchema = z.object({
  isin: z.string().regex(/^(GA|CM|CG|TD|CF|GQ)[12][0-9A-Z]{9}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pays: z.string().max(40),
  instrument: z.enum(["BTA", "OTA"]),
  valeurs: z.partialRecord(champ, valeur),
  tenor: z.string().max(40).optional(),
  couponRate: z.number().finite().min(0).max(50).optional(),
  maturityOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fiabilite: z.enum(["fiable", "a_confirmer"]),
  carnet: z.object({ rejeteAuPrix: z.number().finite().min(0), nbOffres: z.number().int().min(0), traiteLe: z.string().max(40).optional() }),
});
const lotSchema = z.object({
  seances: z.array(seanceSchema).max(20_000),
  rejeteesCles: z.array(z.string().max(40)).max(20_000),
  ignorees: z.number().int().min(0),
  lignes: z.object({ offres: z.number().int(), encheres: z.number().int(), titres: z.number().int() }),
  plage: z.object({ du: z.string(), au: z.string() }).optional(),
  fichiers: z.array(z.object({ type: z.enum(["offres", "encheres", "titres"]), nom: z.string().max(200), lignes: z.number().int().min(0) })).max(3),
  avertissements: z.array(z.string().max(300)).max(20),
  /** Remet en jeu les écarts déjà tranchés (rien n'est définitif). */
  rouvrir: z.boolean().optional(),
});
export type LotOja = z.infer<typeof lotSchema>;

export interface LigneEcartOja {
  deskId: string;
  /** La séance a un communiqué rapatrié : le lien PDF existe. */
  fichier: boolean;
  code: string;
  pays: string;
  instrument: string;
  date: string;
  ecartJours: number;
  champs: (EcartPropose & { cle: string })[];
}

export interface ApercuOja {
  ok: boolean;
  error?: string;
  fichiers: LotOja["fichiers"];
  plage?: LotOja["plage"];
  compteurs?: ReturnType<typeof planifier>["compteurs"] & { seances: number };
  avertissements: string[];
  ecarts: LigneEcartOja[];
  ecartsTotal: number;
  contredites: { deskId: string; isin: string; date: string; pays: string }[];
  nouvellesParAn: Record<string, number>;
}

const vide: ApercuOja = { ok: false, fichiers: [], avertissements: [], ecarts: [], ecartsTotal: 0, contredites: [], nouvellesParAn: {} };

async function lireLot(brut: string): Promise<{ lot: LotOja } | { erreur: string }> {
  let json: unknown;
  try {
    json = JSON.parse(brut);
  } catch {
    return { erreur: "Lot illisible : relancez la lecture du fichier." };
  }
  const p = lotSchema.safeParse(json);
  if (!p.success) return { erreur: `Lot invalide : ${p.error.issues[0]?.path.join(".") ?? ""} ${p.error.issues[0]?.message ?? ""}`.trim() };
  if (!p.data.seances.length) return { erreur: "Aucune séance finale dans ce fichier : rien à importer." };
  return { lot: p.data };
}

const duDesk = (r: AuctionResult): SeanceDuDesk => r as unknown as SeanceDuDesk;

/** L'aperçu : le plan de l'import, calculé sans rien écrire. */
export async function apercuOjaAction(brut: string): Promise<ApercuOja> {
  await requireDesk("/desk/adjudications");
  const l = await lireLot(brut);
  if ("erreur" in l) return { ...vide, error: l.erreur };
  const { lot } = l;
  const desk = await repo().listAuctionResults({ limit: 20_000 });
  const plan = planifier(lot.seances as SeanceOja[], lot.rejeteesCles, lot.ignorees, desk.map(duDesk), { rouvrir: lot.rouvrir });
  const parId = new Map(desk.map((d) => [d.id, d]));
  const ecarts: LigneEcartOja[] = plan.rapprochees
    .filter((x) => x.ecarts.length > 0)
    .map((x) => {
      const d = parId.get(x.deskId)!;
      return { deskId: x.deskId, fichier: Boolean(d.fileKey), code: d.codeEmission ?? x.oja.isin, pays: d.country, instrument: d.instrument, date: d.sessionOn, ecartJours: x.ecartJours, champs: x.ecarts.map((e) => ({ ...e, cle: `${x.deskId}:${e.champ}` })) };
    });
  const nouvellesParAn: Record<string, number> = {};
  for (const s of plan.nouvelles) nouvellesParAn[s.date.slice(0, 4)] = (nouvellesParAn[s.date.slice(0, 4)] ?? 0) + 1;
  return {
    ok: true,
    fichiers: lot.fichiers,
    plage: lot.plage,
    compteurs: { ...plan.compteurs, seances: lot.seances.length },
    avertissements: lot.avertissements,
    ecarts: ecarts.slice(0, 120),
    ecartsTotal: ecarts.length,
    contredites: plan.contredites.map((c) => ({ ...c, pays: parId.get(c.deskId)?.country ?? "" })),
    nouvellesParAn,
  };
}

export interface ResultatOja {
  ok: boolean;
  error?: string;
  message?: string;
  importId?: string;
}

const choixSchema = z.object({
  nouvellesFiables: z.boolean(),
  nouvellesAConfirmer: z.boolean(),
  decisions: z.record(z.string().max(80), z.enum(["pdf", "excel"])),
});

export interface ChoixOja {
  nouvellesFiables: boolean;
  nouvellesAConfirmer: boolean;
  decisions: Decisions;
}

const jeterDansLesLots = async <T,>(xs: T[], taille: number, f: (x: T) => Promise<void>) => {
  for (let i = 0; i < xs.length; i += taille) await Promise.all(xs.slice(i, i + taille).map(f));
};

/**
 * L'import : verse l'Excel sur les séances connues (les deux jeux de valeurs restent), crée les séances nouvelles, écrit le journal.
 *
 * Les séances nouvelles FIABLES sont créées déjà confirmées par le desk qui a cliqué : c'est le geste « Confirmer en lot » de la planche 2A. Les séances À CONFIRMER (avant le
 * 1er février 2023) ne sont créées que si le desk le coche, et restent à relire.
 */
export async function appliquerOjaAction(charge: string): Promise<ResultatOja> {
  const desk = await requireDesk("/desk/adjudications");
  /* UNE SEULE CHAÎNE EN ARGUMENT, ET C'EST VOULU : React compte la longueur d'une chaîne dans le tableau d'arguments d'une action, et refuse
     « Maximum array nesting exceeded » dès qu'un deuxième argument accompagne un lot de plusieurs Mo. Le lot et les choix voyagent donc ensemble. */
  let enveloppe: { lot?: unknown; choix?: unknown };
  try {
    enveloppe = JSON.parse(charge);
  } catch {
    return { ok: false, error: "Lot illisible : relancez la lecture du fichier." };
  }
  const brut = JSON.stringify(enveloppe.lot ?? null);
  const c = choixSchema.safeParse(enveloppe.choix);
  if (!c.success) return { ok: false, error: "Choix illisibles : relancez l'aperçu." };
  const choix: ChoixOja = c.data;
  const l = await lireLot(brut);
  if ("erreur" in l) return { ok: false, error: l.erreur };
  const { lot } = l;
  const r = repo();
  const existantes = await r.listAuctionResults({ limit: 20_000 });
  const plan = planifier(lot.seances as SeanceOja[], lot.rejeteesCles, lot.ignorees, existantes.map(duDesk), { rouvrir: lot.rouvrir });
  const le = new Date().toISOString();

  const aCreer = plan.nouvelles.filter((s) => (s.fiabilite === "fiable" ? choix.nouvellesFiables : choix.nouvellesAConfirmer));
  const aVerser = plan.rapprochees.filter((x) => !x.inchangee);
  const journal = await r.createOjaImport({
    by: desk.name,
    fichiers: lot.fichiers,
    plage: lot.plage,
    seances: lot.seances.length,
    nouvelles: aCreer.length,
    rapprochees: plan.rapprochees.length,
    concordantes: plan.compteurs.concordantes,
    ecarts: plan.compteurs.ecarts,
    ignorees: plan.compteurs.ignorees,
    exclu: false,
  });

  const parId = new Map(existantes.map((d) => [d.id, d]));
  let modifiees = 0;
  await jeterDansLesLots(aVerser, 8, async (x) => {
    const avant = parId.get(x.deskId)!;
    const v = verser(duDesk(avant), x.oja, journal.id, choix.decisions, desk.name, le);
    const colonnes = Object.fromEntries(CHAMPS.map((c) => [c, v.colonnes[c]]).filter(([c, val]) => (avant[c as Champ] ?? null) !== val)) as Partial<Record<Champ, number | null>>;
    // Une séance qui n'a que des champs inchangés reçoit tout de même ses sources : c'est ce qui permet de les exclure et de les comparer plus tard.
    await r.updateAuctionResult(x.deskId, { sources: v.sources, ...colonnes, ...(avant.tenor && avant.tenor !== "—" ? {} : x.oja.tenor ? { tenor: x.oja.tenor } : {}) });
    if (Object.keys(colonnes).length) {
      modifiees++;
      await audit("auction.source", "auction_result", x.deskId, {
        before: Object.fromEntries(Object.keys(colonnes).map((c) => [c, avant[c as Champ] ?? null])),
        after: colonnes,
        reason: `Import OJA ${journal.id} : valeur retenue changée (${Object.keys(colonnes).join(", ")})`,
      });
    }
  });

  const lignes: NewAuctionResult[] = aCreer.map((s) => {
    const confirmee = s.fiabilite === "fiable";
    return {
      codeEmission: s.isin,
      country: s.pays as NewAuctionResult["country"],
      instrument: s.instrument,
      tenor: s.tenor ?? "—",
      sessionOn: s.date,
      abondement: false,
      ...(Object.fromEntries(CHAMPS.filter((c) => s.valeurs[c] != null).map((c) => [c, s.valeurs[c]])) as Partial<Record<Champ, number>>),
      couponRate: s.couponRate,
      maturityOn: s.maturityOn,
      sourceUrl: `oja:${s.isin}:${s.date}`,
      sourceTitle: `Export OJA · séance du ${s.date}`,
      sources: sourcesDeNouvelle(s, journal.id),
      ...(confirmee ? { confirmedBy: desk.name, confirmedAt: le } : {}),
    };
  });
  const creees = lignes.length ? await r.insertAuctionResults(lignes) : 0;

  await audit("oja.import", "oja_import", journal.id, {
    after: { fichiers: lot.fichiers, plage: lot.plage ?? null, nouvelles: creees, rapprochees: plan.rapprochees.length, versees: aVerser.length, retenuesChangees: modifiees, ecarts: plan.compteurs.ecarts, contredites: plan.compteurs.contredites },
    reason: `Import OJA par ${desk.name} : ${creees} séance(s) créée(s), ${aVerser.length} séance(s) enrichie(s)`,
  });
  await r.logEvent({ kind: "desk", html: `<b>Import OJA</b> par ${desk.name} : ${creees} séance(s) nouvelle(s), ${aVerser.length} enrichie(s) de l'Excel, ${plan.compteurs.ecarts} écart(s)` });
  revalidatePath("/desk/adjudications", "layout");
  revalidatePath("/desk/analyses");
  revalidatePath("/marche/adjudications");
  return {
    ok: true,
    importId: journal.id,
    message: `${creees} séance(s) créée(s), ${aVerser.length} séance(s) enrichie(s), ${modifiees} valeur(s) retenue(s) changée(s).`,
  };
}

const sourceSchema = z.enum(["pdf", "excel"]);

/** Le desk tranche un champ en écart : valeur écartée, motif, auteur et date sont gardés. */
export async function trancherEcartAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/adjudications");
  const id = String(form.get("id") ?? "");
  const c = champ.safeParse(form.get("champ"));
  const s = sourceSchema.safeParse(form.get("source"));
  const motif = String(form.get("motif") ?? "").trim().slice(0, 300) || "tranché par le desk";
  if (!id || !c.success || !s.success) return;
  const r = repo();
  const avant = await r.getAuctionResult(id);
  if (!avant) return;
  const apres = trancher(sourcesDe(avant), c.data, s.data, motif, desk.name, new Date().toISOString());
  const col = patchDesColonnes(apres);
  await r.updateAuctionResult(id, { sources: apres, [c.data]: col[c.data] });
  await audit("auction.source", "auction_result", id, {
    before: { [c.data]: avant[c.data] ?? null, retenu: sourcesDe(avant).retenu[c.data] ?? null },
    after: { [c.data]: col[c.data], retenu: s.data },
    reason: `Écart tranché sur « ${c.data} » : ${s.data} retenu (${motif})`,
  });
  revalidatePath("/desk/adjudications", "layout");
}

/** Exclure ou rétablir une source pour une séance. Une séance garde toujours au moins une source. */
export async function exclureSourceAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/adjudications");
  const id = String(form.get("id") ?? "");
  const s = sourceSchema.safeParse(form.get("source"));
  const excl = String(form.get("exclure") ?? "") === "1";
  if (!id || !s.success) return;
  const r = repo();
  const avant = await r.getAuctionResult(id);
  if (!avant) return;
  const src = sourcesDe(avant);
  const apres = exclure(src, s.data, excl);
  const restantes = (["pdf", "excel"] as Source[]).filter((x) => apres[x] && !(apres.exclues ?? []).includes(x));
  if (!restantes.length) return;
  const col = patchDesColonnes(apres);
  await r.updateAuctionResult(id, { sources: apres, ...col });
  await audit("auction.source", "auction_result", id, {
    before: { exclues: src.exclues ?? [] },
    after: { exclues: apres.exclues ?? [] },
    reason: `${excl ? "Source exclue" : "Source rétablie"} : ${s.data} (${desk.name})`,
  });
  revalidatePath("/desk/adjudications", "layout");
  revalidatePath("/desk/analyses");
}

/**
 * Exclure un import entier, ou le rétablir. Les séances qui n'ont que cette source sont mises de côté (motif écrit) et reviennent au rétablissement ; les autres
 * retrouvent les valeurs du communiqué.
 */
export async function exclureImportAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/adjudications");
  const importId = String(form.get("importId") ?? "");
  const excl = String(form.get("exclure") ?? "") === "1";
  if (!importId) return;
  const r = repo();
  const lignes = (await r.listAuctionResults({ limit: 20_000 })).filter((x) => x.sources?.importId === importId);
  const motif = `Import OJA exclu (${importId.slice(0, 8)})`;
  let touchees = 0;
  await jeterDansLesLots(lignes, 8, async (x) => {
    const src = sourcesDe(x);
    const apres = exclure(src, "excel", excl);
    const sansPdf = !apres.pdf;
    const col = patchDesColonnes(apres);
    if (sansPdf) {
      // Séance née de l'Excel seul : on la met de côté (ou on la rétablit) sans toucher à ses colonnes.
      await r.updateAuctionResult(x.id, excl ? { sources: apres, setAsideReason: motif, setAsideBy: desk.name, setAsideAt: new Date().toISOString() } : { sources: apres, setAsideReason: null, setAsideBy: null, setAsideAt: null });
    } else {
      await r.updateAuctionResult(x.id, { sources: apres, ...col });
    }
    touchees++;
  });
  await r.updateOjaImport(importId, { exclu: excl });
  await audit("oja.import", "oja_import", importId, { after: { exclu: excl, seances: touchees }, reason: `${excl ? "Import exclu" : "Import rétabli"} par ${desk.name} : ${touchees} séance(s)` });
  revalidatePath("/desk/adjudications", "layout");
  revalidatePath("/desk/analyses");
  revalidatePath("/marche/adjudications");
}

