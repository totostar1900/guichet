"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { audit } from "@/lib/audit";
import { INSTRUMENTS_SONDES, manquesDeLaLigne } from "@/lib/domain/sondage";
import { PAYS_CEMAC } from "@/lib/market/budget";
import { fmt, localIso, parseAmount } from "@/lib/format";
import type { Country } from "@/lib/domain/types";

export type DeskSondageResult = { ok: true; message: string } | { ok: false; error: string };

const PATH = "/desk/sondage";

const question = z.object({
  instrument: z.enum(INSTRUMENTS_SONDES),
  country: z.string(),
  tenor: z.string().trim().min(1).max(40),
  rate: z.string().optional(),
  /* Le prix fait le rendement de la tuile ; la base le refuse sur un bon, et
     `manquesDeLaLigne` le dit avant elle. */
  pricePct: z.string().optional(),
  montant: z.string(),
  seanceLe: z.string().optional(),
  dansJours: z.string().optional(),
  note: z.string().max(600).optional(),
});

const nombre = (v?: string): number | undefined => {
  if (!v?.trim()) return undefined;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

/**
 * LA MAISON POSE UNE QUESTION À LA PLACE.
 *
 * C'est le premier des trois rôles — voir « domain/sondage » — et c'est le seul
 * que le desk crée. Elle paraît sur la page de tous les clients : c'est son
 * objet, on y répond. Elle ne porte donc aucun nom de client, et la contrainte
 * de la base le tient.
 *
 * ELLE PASSE PAR « audit », comme toute écriture métier : une question posée à
 * la place engage la parole de la maison, et le jour où un Trésor demandera
 * d'où venait un chiffre, il faudra pouvoir dire qui a sondé quoi et quand.
 */
export async function poserLaQuestion(_p: DeskSondageResult | null, form: FormData): Promise<DeskSondageResult> {
  const desk = await requireDesk(PATH);
  const p = question.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Ce formulaire est incomplet." };
  const d = p.data;
  if (!PAYS_CEMAC.includes(d.country as Country)) return { ok: false, error: "Ce Trésor n'est pas de la zone." };

  const ligne = {
    origine: "desk" as const,
    instrument: d.instrument,
    country: d.country as Country,
    tenor: d.tenor,
    rate: nombre(d.rate),
    pricePct: nombre(d.pricePct),
    montant: parseAmount(d.montant) ?? 0,
    seanceLe: d.seanceLe?.trim() || undefined,
    dansJours: d.seanceLe?.trim() ? undefined : nombre(d.dansJours),
    note: d.note?.trim() || undefined,
  };
  const manques = manquesDeLaLigne(ligne, localIso(new Date()));
  if (manques.length) return { ok: false, error: manques.join(" ") };

  const creee = await repo().createLigneSondee(ligne);
  await audit("sondage.question", "sondage", creee.id, { before: null, after: { ref: creee.ref, instrument: creee.instrument, country: creee.country, tenor: creee.tenor, montant: creee.montant } });
  await repo().logEvent({ kind: "desk", html: `Sondage <b>${creee.ref}</b> : la maison sonde ${creee.instrument} ${creee.country} ${creee.tenor} · ${fmt(creee.montant)} FCFA · par ${desk.name}` });
  revalidatePath(PATH);
  revalidatePath("/sondage");
  return { ok: true, message: `Question posée : ${creee.ref}. Elle paraît sur la page de tous les clients.` };
}

/**
 * CE QUE LE DESK CONSTATE : PORTÉE, OU CLOSE.
 *
 * « Portée au Trésor » est un FAIT, et c'est pour cela que c'est le desk qui
 * l'écrit et personne d'autre : le client ne peut pas savoir si sa ligne est
 * partie, et la maison ne peut pas le lui faire deviner.
 *
 * LA CLÔTURE EMPORTE LES RÉPONSES, et c'est voulu : une réponse à une question
 * close n'attend plus rien, et la laisser ouverte la ferait compter dans un
 * consensus sans en-tête. Le motif suit — le client le lit sur sa page — parce
 * qu'une attente qui disparaît sans un mot est une attente qu'on ne redonnera
 * pas.
 */
export async function statuerSurLaLigne(_p: DeskSondageResult | null, form: FormData): Promise<DeskSondageResult> {
  const desk = await requireDesk(PATH);
  const id = String(form.get("id") ?? "");
  const etat = String(form.get("etat") ?? "");
  const motif = String(form.get("motif") ?? "").trim();
  if (etat !== "consolidee" && etat !== "close") return { ok: false, error: "État inconnu." };
  const r = repo();
  const toutes = await r.listLignesSondees();
  const l = toutes.find((x) => x.id === id);
  if (!l) return { ok: false, error: "Ligne introuvable." };

  const avant = l.state;
  await r.updateLigneSondee(id, { state: etat, closedReason: etat === "close" ? motif || "Close par le desk." : undefined });
  /* Les réponses suivent leur question : le même état, le même motif, et le
     client lit la même phrase que celui d'à côté. */
  const suites = toutes.filter((x) => x.repondA === id && x.state !== "close");
  for (const s of suites) await r.updateLigneSondee(s.id, { state: etat, closedReason: etat === "close" ? motif || "La ligne sondée a été close par le desk." : undefined });

  await audit("sondage.statut", "sondage", id, { before: { state: avant }, after: { state: etat, reponses: suites.length } });
  await r.logEvent({
    kind: "desk",
    html: `Sondage <b>${l.ref}</b> : <b>${etat === "consolidee" ? "portée au Trésor" : "close"}</b>${suites.length ? ` avec ${suites.length} réponse(s)` : ""} · par ${desk.name}`,
  });

  /**
   * ET CHAQUE CLIENT L'APPREND, un par un.
   *
   * La page du sondage lui promet, sur chaque attente portée, que « le desk
   * vous rappellera avant la clôture » ; le code changeait l'état et se
   * taisait. Relevé à la revue à 360° du 26 octobre 2026 : c'était le seul
   * service muet de la maison.
   *
   * LES ENVOIS NE TIENNENT PAS LE GESTE. Un canal injoignable ne doit pas
   * défaire une consolidation déjà écrite et déjà portée au fil : le sort de
   * chaque envoi part au fil, nommément, et le desk voit qui n'a pas été
   * joint — c'est à lui de décrocher son téléphone, pas à la base de reculer.
   *
   * SEULES LES RÉPONSES SONT PRÉVENUES, pas la question : elle n'a pas de
   * destinataire, et la base le tient par sa contrainte.
   */
  if (etat === "consolidee") {
    const { direLaConsolidation } = await import("@/lib/notify/sondage");
    const aPrevenir = l.userId ? [l, ...suites] : suites;
    for (const x of aPrevenir) {
      const envoi = await direLaConsolidation(x).catch((e) => ({ sent: false, error: e instanceof Error ? e.message : "échec" }));
      if (!envoi.sent) await r.logEvent({ kind: "system", html: `Sondage <b>${x.ref}</b> : <b>client non prévenu</b> de la consolidation · ${envoi.error ?? "canal injoignable"}` });
    }
  }

  revalidatePath(PATH);
  revalidatePath("/sondage");
  return { ok: true, message: etat === "consolidee" ? `${l.ref} est portée au Trésor, avec ${suites.length} réponse(s).` : `${l.ref} est close.` };
}
