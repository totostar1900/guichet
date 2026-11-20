import "server-only";
import { repo } from "@/lib/data";
import { audit } from "@/lib/audit";
import { lireLeClasseur } from "@/lib/chargement-classeur";
import { loadIssuerRegistry } from "@/lib/reference";
import { emetteurDuTresor, PAYS, lireUneLigneApe, lireUneLigneIpo, lireUneLigneTresor, lireUnResultat, NOM_DE_FEUILLE, type ContexteDeLecture, type LigneChargee, type ResultatCharge } from "@/lib/domain/chargement";
import type { AuctionResult, NewAuctionResult } from "@/lib/market/auction-results";

/**
 * LE PLAN D'UN CHARGEMENT DE CLASSEUR : lu, rapproché de ce que le Desk sait, montré, et seulement ensuite écrit (20 novembre 2026).
 *
 * LES LIGNES (Trésor, emprunts, IPO) deviennent des pièces « À valider » : une pièce par ligne, brouillon rempli, jamais publié. Une ligne dont le code d'émission et la date limite sont déjà dans la file (hors pièces rejetées) est un DOUBLON : elle est montrée, pas rechargée.
 * LES RÉSULTATS ne remplissent QUE LE VIDE d'une séance connue : un chiffre déjà là n'est jamais écrasé (une différence est signalée, le desk tranche à la main), et la séance garde son état de confirmation. Une séance nouvelle n'est créée que si le code d'émission est connu d'ailleurs (durée, échéance et coupon s'en reprennent).
 */

export type StatutDeLigne = "a_charger" | "doublon" | "erreur";
export interface LignePlanifiee {
  feuille: string;
  ligne: number;
  resume: string;
  statut: StatutDeLigne;
  officielle: boolean;
  erreurs: string[];
  avertissements: string[];
}
export type StatutDeResultat = "complete" | "cree" | "inchange" | "erreur";
export interface ResultatPlanifie {
  ligne: number;
  resume: string;
  statut: StatutDeResultat;
  ajoutes: string[];
  ecarts: string[];
  erreurs: string[];
  avertissements: string[];
}
export interface PlanDeChargement {
  nom: string;
  lignes: LignePlanifiee[];
  resultats: ResultatPlanifie[];
  /** Ce que `appliquer` écrira. */
  _lignes: LigneChargee[];
  _resultats: { brut: ResultatCharge; cible?: AuctionResult; creation?: NewAuctionResult; patch?: Partial<NewAuctionResult> }[];
}

/** Les émetteurs qu'un emprunt ou une IPO peut nommer : le registre (sociétés cotées, émetteurs d'obligations, États), les six Trésors, et les émetteurs des lignes déjà publiées. Un seul endroit : le modèle téléchargé et la lecture du classeur s'y servent. */
export async function emetteursDuRegistre(): Promise<string[]> {
  const [registre, offres] = await Promise.all([loadIssuerRegistry(), repo().listOffers()]);
  const noms = new Set<string>([...registre.map((i) => i.name), ...PAYS.map(emetteurDuTresor)]);
  for (const o of offres) if ((o.kind === "APE" || o.kind === "ACTIONS") && o.issuer) noms.add(o.issuer);
  return [...noms].sort((a, b) => a.localeCompare(b, "fr"));
}

const LIBELLE: Record<string, string> = { announced: "montant annoncé", bid: "total des soumissions", served: "total servi", bidders: "soumissionnaires", coverage: "couverture", rateMin: "taux minimum", rateMax: "taux maximum", rateLimit: "taux limite", rateAvg: "taux moyen pondéré", priceMin: "prix minimum", priceMax: "prix maximum", priceLimit: "prix limite", priceAvg: "prix moyen pondéré" };

async function contexte(): Promise<{ ctx: ContexteDeLecture; resultats: AuctionResult[]; file: { isin?: string; limite?: string; etat: string }[] }> {
  const r = repo();
  const [offres, resultats, file] = await Promise.all([r.listOffers(), r.listAuctionResults({ limit: 5000 }), r.listIntake()]);
  const codes = new Set<string>();
  for (const o of offres) if (o.isin) codes.add(o.isin.toUpperCase());
  for (const x of resultats) if (x.codeEmission) codes.add(x.codeEmission.toUpperCase());
  const emetteurs = [...new Set(offres.filter((o) => o.kind === "APE" || o.kind === "ACTIONS").map((o) => o.issuer))];
  return { ctx: { codesConnus: codes, emetteurs }, resultats, file: file.map((q) => ({ isin: q.draft.isin?.toUpperCase(), limite: q.draft.deadlineAt?.slice(0, 10), etat: q.state })) };
}

export async function planifierLeClasseur(octets: Uint8Array | ArrayBuffer, nom: string, emetteursDuRegistre: string[] = []): Promise<PlanDeChargement> {
  const feuilles = await lireLeClasseur(octets);
  const { ctx, resultats: connus, file } = await contexte();
  const contexteComplet: ContexteDeLecture = { ...ctx, emetteurs: [...new Set([...ctx.emetteurs, ...emetteursDuRegistre])] };
  const plan: PlanDeChargement = { nom, lignes: [], resultats: [], _lignes: [], _resultats: [] };
  const vus = new Set<string>();

  for (const f of feuilles) {
    for (const { ligne, valeurs } of f.lignes) {
      if (f.feuille === "resultats") {
        const b = lireUnResultat(valeurs, ligne);
        const base = { ligne, resume: b.resume, ajoutes: [] as string[], ecarts: [] as string[], erreurs: b.erreurs, avertissements: b.avertissements };
        if (b.erreurs.length) {
          plan.resultats.push({ ...base, statut: "erreur" });
          continue;
        }
        const mm = connus.filter((x) => x.sessionOn === b.sessionOn && ((x.codeEmission ?? "").toUpperCase() === b.code || (!x.codeEmission && x.country === b.country && x.instrument === b.instrument)));
        if (mm.length > 1) {
          plan.resultats.push({ ...base, statut: "erreur", erreurs: ["séance ambiguë : plusieurs séances de ce jour portent ce code ; corriger au Desk"] });
          continue;
        }
        const cible = mm[0];
        if (cible) {
          const patch: Record<string, number> = {};
          const ajoutes: string[] = [];
          const ecarts: string[] = [];
          for (const [k, v] of Object.entries(b.valeurs)) {
            if (v == null) continue;
            const actuel = (cible as unknown as Record<string, number | undefined>)[k];
            if (actuel == null) {
              patch[k] = v;
              ajoutes.push(LIBELLE[k] ?? k);
            } else if (Math.abs(actuel - v) > (k.startsWith("rate") || k.startsWith("price") ? 0.006 : k === "coverage" ? 0.05 : k === "bidders" ? 0 : 1_000_000)) ecarts.push(`${LIBELLE[k] ?? k} : Desk ${actuel.toLocaleString("fr-FR")}, classeur ${v.toLocaleString("fr-FR")} (non modifié)`);
          }
          plan.resultats.push({ ...base, statut: ajoutes.length ? "complete" : "inchange", ajoutes, ecarts });
          plan._resultats.push({ brut: b, cible, patch: ajoutes.length ? (patch as Partial<NewAuctionResult>) : undefined });
          continue;
        }
        const jumelle = connus.find((x) => (x.codeEmission ?? "").toUpperCase() === b.code);
        if (!jumelle) {
          plan.resultats.push({ ...base, statut: "erreur", erreurs: ["code d'émission inconnu du Desk : chargez d'abord la ligne (feuille Trésor), ou vérifiez le code"] });
          continue;
        }
        const creation: NewAuctionResult = {
          codeEmission: b.code,
          country: b.country!,
          instrument: b.instrument!,
          tenor: jumelle.tenor,
          sessionOn: b.sessionOn!,
          abondement: true,
          couponRate: jumelle.couponRate,
          maturityOn: jumelle.maturityOn,
          ...b.valeurs,
          sourceUrl: `classeur:${b.code}:${b.sessionOn}`,
          sourceTitle: `Classeur Excel · ${b.piece}`,
        } as NewAuctionResult;
        plan.resultats.push({ ...base, statut: "cree", ajoutes: Object.keys(b.valeurs).filter((k) => (b.valeurs as Record<string, number | undefined>)[k] != null).map((k) => LIBELLE[k] ?? k) });
        plan._resultats.push({ brut: b, creation });
        continue;
      }

      const lire = f.feuille === "tresor" ? lireUneLigneTresor : f.feuille === "ape" ? lireUneLigneApe : lireUneLigneIpo;
      const c = lire(valeurs, ligne, contexteComplet);
      const cle = `${c.code}|${c.brouillon?.deadlineAt?.slice(0, 10)}`;
      const doublon = !c.erreurs.length && (vus.has(cle) || file.some((q) => q.isin === c.code && q.limite === c.brouillon?.deadlineAt?.slice(0, 10) && q.etat !== "rejete"));
      if (!c.erreurs.length) vus.add(cle);
      plan.lignes.push({ feuille: NOM_DE_FEUILLE[f.feuille], ligne, resume: c.resume, statut: c.erreurs.length ? "erreur" : doublon ? "doublon" : "a_charger", officielle: Boolean(c.brouillon?.official), erreurs: c.erreurs, avertissements: c.avertissements });
      if (!c.erreurs.length && !doublon) plan._lignes.push(c);
    }
  }
  return plan;
}

/** Écrit le plan. Tout passe par l'audit, avec ce qu'il y avait avant : une ligne d'audit par lot, une par séance touchée. */
export async function appliquerLePlan(plan: PlanDeChargement, par: string): Promise<{ pieces: number; seancesCompletees: number; seancesCreees: number }> {
  const r = repo();
  let pieces = 0;
  let completees = 0;
  let creees = 0;
  for (const c of plan._lignes) {
    const d = c.brouillon!;
    const item = await r.createIntake({
      source: "texte",
      title: d.title || `${c.resume}`,
      fromLabel: `Classeur Excel · ${plan.nom} · ${NOM_DE_FEUILLE[c.feuille]}, ligne ${c.ligne}`,
      receivedAt: new Date().toISOString(),
      state: d.official ? "a_valider" : "bloque",
      rawText: d.remarks.join("\n"),
      draft: d,
    });
    pieces++;
    await audit("intake.classeur", "intake", item.id, { after: { titre: item.title, classeur: plan.nom, feuille: c.feuille, ligne: c.ligne, officielle: d.official }, reason: `chargée depuis un classeur par ${par}` });
  }
  for (const x of plan._resultats) {
    const piece = x.brut.piece ?? "";
    if (x.cible && x.patch) {
      const cible = x.cible;
      const patch: Partial<NewAuctionResult> = { ...x.patch };
      /* La séance garde ses sources : ce que le classeur rapporte du communiqué entre dans la source « communiqué », retenue pour ces champs. */
      if (cible.sources) {
        const champs = Object.keys(x.patch) as (keyof typeof cible.sources.retenu)[];
        patch.sources = { ...cible.sources, pdf: { ...(cible.sources.pdf ?? {}), ...(x.patch as Record<string, number>) }, retenu: { ...cible.sources.retenu, ...Object.fromEntries(champs.map((k) => [k, "pdf"])) } };
      }
      await r.updateAuctionResult(cible.id, patch as Parameters<typeof r.updateAuctionResult>[1]);
      completees++;
      await audit("auction.classeur", "auction_result", cible.id, { before: Object.fromEntries(Object.keys(x.patch).map((k) => [k, null])), after: x.patch, reason: `complétée depuis un classeur par ${par} · pièce : ${piece}` });
    } else if (x.creation) {
      const row = await r.upsertAuctionResult(x.creation);
      creees++;
      await audit("auction.classeur", "auction_result", row.id, { after: x.creation, reason: `séance créée depuis un classeur par ${par} · pièce : ${piece}` });
    }
  }
  await audit("chargement.classeur", "chargement", plan.nom, { after: { pieces, seancesCompletees: completees, seancesCreees: creees }, reason: `classeur « ${plan.nom} » chargé par ${par}` });
  await r.logEvent({ kind: "desk", html: `Classeur <b>${plan.nom}</b> chargé par ${par} : ${pieces} pièce${pieces > 1 ? "s" : ""} à valider, ${completees} séance${completees > 1 ? "s" : ""} complétée${completees > 1 ? "s" : ""}, ${creees} créée${creees > 1 ? "s" : ""}` });
  return { pieces, seancesCompletees: completees, seancesCreees: creees };
}
