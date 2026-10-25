import { repo } from "@/lib/data";
import { DOC_LABEL } from "@/lib/documents/registry";
import type { DocumentType } from "@/lib/domain/types";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { fmt, fmtDate } from "@/lib/format";
import { positionsFrom } from "@/lib/positions";
import type { Intent } from "@/lib/domain/types";
import type { DocLigne } from "./Operations";

/* LE RAYON D'UN PAPIER SE LIT DE CE QU'IL FAIT, et un papier n'a qu'un rayon :
   ce que vous avez signé, ce qu'une opération a produit, un mouvement
   d'argent, une démarche. Un bulletin est un engagement avant d'être la pièce
   d'une opération : il monte donc au premier rayon, en nommant sa ligne. */
const SIGNES: DocumentType[] = ["convention", "prelevement", "bulletin", "cession"];
/* Les papiers de l argent : ceux qui s éditent, et les trois avis qui sont
   l avis d un mouvement (versement, garde, prélèvement). Ils sont nommés ici
   pour ne pas tomber dans le rayon des opérations, auxquelles ils
   n appartiennent pas. */
const ARGENT: DocumentType[] = ["releve", "attestation", "versement", "garde", "tirage"];
const DEMARCHES: DocumentType[] = ["reclamation", "transfert"];

/**
 * LES QUATRE RAYONS, CALCULÉS UNE FOIS POUR CINQ PAGES.
 *
 * Ils vivaient dans la page, parce qu'ils tenaient tous dans la page : quatre
 * plis l'un sous l'autre. Depuis le 24 octobre 2026 chaque rayon EST une page
 * — le chevron d'une bande promettait d'en ouvrir une et ne faisait que la
 * déplier —, et cinq pages qui recalculeraient chacune leur part de la même
 * lecture auraient divergé à la première règle changée.
 *
 * ON CHARGE TOUT POUR N'EN RENDRE QU'UN, et c'est assumé : les quatre rayons
 * se taillent dans les mêmes listes (les documents, les intentions, les
 * versements, les avis de garde, les prélèvements), et les séparer demanderait
 * cinq requêtes au lieu d'une, pour les mêmes octets.
 */
export async function chargerLesRayons(userId: string, t: (s: string, v?: Record<string, string>) => string) {
  const s = { userId };
  const r = repo();
  const [intents, offers, docs, myFile, consent] = await Promise.all([r.listIntents(), r.listOffers(), r.listDocuments(), r.getClientFileByUser(s.userId), r.getConsent(s.userId).catch(() => ({}) as { version?: string; at?: string })]);
  const [payouts, garde, tirages] = await Promise.all([
    r.listPayouts({ userId: s.userId }).catch(() => []),
    r.listCustodyNotices({ userId: s.userId }).catch(() => []),
    r.listTirages({ userId: s.userId }).catch(() => []),
  ]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const byOffer = new Map(offers.map((o) => [o.id, o]));
  /* Une ligne qui n'est plus au catalogue existe encore : ses documents gardent
     son nom. Sans ce rattrapage, un avis d'opéré se retrouverait sous un
     identifiant nu. */
  const manquantes = [...new Set(mine.map((i) => i.offerId).filter((id) => !byOffer.has(id)))];
  for (const o of await Promise.all(manquantes.map((id) => r.getOffer(id).catch(() => undefined)))) if (o) byOffer.set(o.id, o);
  const parIntention = new Map(mine.map((i) => [i.id, i]));

  const miens = docs.filter((d) => d.type !== "dossier_svt" && ((d.intentId && parIntention.has(d.intentId)) || (myFile && d.clientFileId === myFile.id) || d.clientId === s.userId));
  const tientQuelqueChose = positionsFrom(mine, offers).length > 0;
  const montant = (i: Intent, kind?: string) => (i.amount ? (i.type === "rachat" ? `${i.amount.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts` : `${fmt(i.amount)} ${kind === "RACHAT" ? "titres" : "FCFA"}`) : "");
  const ligneDe = (intentId?: string) => (intentId ? byOffer.get(parIntention.get(intentId)?.offerId ?? "")?.title : undefined);
  /* Le retour de la pièce revient d'où l'on vient : la visionneuse ramenait
     toujours à cette liste, même quand on arrivait d'un ordre. */
  const versLaPiece = (id: string) => `/moi/documents/${id}?de=${encodeURIComponent("/moi/documents")}`;

  /* ── Rayon 1 · ce que vous avez signé ─────────────────────────────── */
  const signes = miens
    .filter((d) => SIGNES.includes(d.type))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => {
      const i = d.intentId ? parIntention.get(d.intentId) : undefined;
      const aSigner = Boolean(i) && !i!.signedAt && i!.state === "confirmee";
      return {
        id: d.id,
        titre: t(DOC_LABEL[d.type]),
        sous: [ligneDe(d.intentId), i?.amount ? montant(i, byOffer.get(i.offerId)?.kind) : undefined, d.number].filter(Boolean).join(" · "),
        etat: aSigner ? t("à signer") : d.status === "signe" ? t("signé par vous le {d}", { d: fmtDate(d.createdAt, false) }) : t("établi le {d}", { d: fmtDate(d.createdAt, false) }),
        ton: (aSigner ? "attend" : d.status === "signe" ? "fait" : undefined) as "attend" | "fait" | undefined,
        /* LE MANDAT S'OUVRE COMME TOUTE PIÈCE SIGNÉE, depuis le 25 octobre
           2026. Son geste était « Modifier », vers la page des prélèvements :
           le seul papier qu'une agence bancaire réclame était donc le seul de
           ce rayon qu'on ne pouvait pas ouvrir. Et « au plus un geste » veut
           dire que c'est CELUI DU PAPIER : modifier un mandat vit sur la page
           des prélèvements, qui s'atteint du compte et de l'écran
           d'approvisionnement. */
        geste: aSigner ? { label: t("Signer"), href: `/moi/ordres/${d.intentId}`, primaire: true } : { label: t("Ouvrir"), href: versLaPiece(d.id) },
      };
    });
  const aSigner = signes.filter((x) => x.ton === "attend").length;

  /* ── Rayon 2 · ce que vos opérations ont produit ───────────────────── */
  const desOperations: DocLigne[] = miens
    .filter((d) => !SIGNES.includes(d.type) && !ARGENT.includes(d.type) && !DEMARCHES.includes(d.type))
    .map((d) => {
      const i = d.intentId ? parIntention.get(d.intentId) : undefined;
      const aRegler = d.type === "fonds" && i?.state === "confirmee" && !i.coveredAt;
      return {
        id: d.id,
        titre: t(DOC_LABEL[d.type]),
        sous: d.number,
        at: d.createdAt,
        atText: fmtDate(d.createdAt, false),
        etat: aRegler ? t("à régler") : t("émis le {d}", { d: fmtDate(d.createdAt, false) }),
        ton: (aRegler ? "attend" : undefined) as "attend" | undefined,
        geste: aRegler ? { label: t("Régler"), href: `/moi/ordres/${d.intentId}`, primaire: true } : { label: t("Ouvrir"), href: versLaPiece(d.id) },
        intentId: d.intentId,
      };
    });
  const ops = mine
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((i) => {
      const o = byOffer.get(i.offerId);
      return {
        id: i.id,
        titre: o?.title ?? i.offerId,
        sous: `${t(INTENT_LABEL[i.type])}${i.amount ? ` · ${montant(i, o?.kind)}` : ""} · ${t("réf.")} ${i.ref}`,
        etat: t(INTENT_STATE_LABEL[i.state]),
        etatKey: i.state,
        href: o ? `/offres/${o.id}` : undefined,
      };
    });
  const aRegler = desOperations.filter((d) => d.ton === "attend").length;

  /* ── Rayon 3 · les mouvements de votre argent ──────────────────────
     Trois familles entrent ici qui n'étaient nulle part : le versement de
     votre solde, les prélèvements présentés avec leur préavis, et les avis
     de droits de garde. Un mouvement d'argent sans trace consultable est la
     seule chose que la convention promet et que la page ne donnait pas. */
  /* LE PAPIER PASSE DEVANT LA LIGNE : quand l avis existe, le geste l ouvre.
     Les mouvements d avant le 10 octobre 2026 n en ont pas, et leur ligne
     reste ce qu elle était : un avis ne se fabrique pas rétroactivement. */
  const avisDe = new Map(miens.filter((d) => d.sourceId).map((d) => [d.sourceId as string, d]));
  const ouvrirLAvis = (source: string, sinon: { label: string; href: string }) => {
    const doc = avisDe.get(source);
    return doc ? { label: t("Ouvrir"), href: versLaPiece(doc.id) } : sinon;
  };
  const argent = [
    ...miens
      .filter((d) => d.type === "releve" || d.type === "attestation")
      .map((d) => ({
        clef: `doc-${d.id}`,
        at: d.createdAt,
        titre: t(DOC_LABEL[d.type]),
        sous: d.number,
        etat: t("édité le {d}", { d: fmtDate(d.createdAt, false) }),
        ton: undefined as "fait" | "attend" | undefined,
        geste: { label: t("Ouvrir"), href: versLaPiece(d.id) },
      })),
    ...payouts
      .filter((p) => p.state === "payee")
      .map((p) => ({
        clef: `payout-${p.id}`,
        at: p.closedAt ?? p.askedAt,
        titre: t("Avis de versement"),
        sous: t("{m} FCFA vers votre compte bancaire", { m: fmt(Math.round(p.paidAmount ?? p.askedAmount)) }),
        etat: t("payé le {d}", { d: fmtDate(p.closedAt ?? p.askedAt, false) }),
        ton: "fait" as const,
        geste: ouvrirLAvis(p.id, { label: t("Le journal"), href: "/moi/performance#operations" }),
      })),
    /* UN TIRAGE NE PARAÎT QUE S'IL A ÉTÉ DIT OU PRÉSENTÉ : une échéance
       seulement préparée, ou écartée avant la remise, n'a rien demandé au
       client et n'a donc rien à prouver. */
    ...tirages
      .filter((x) => x.noticeSent || x.state === "remis" || x.state === "encaisse" || x.state === "rejete")
      .map((x) => ({
        clef: `tirage-${x.id}`,
        at: x.settledAt ?? x.handedAt ?? x.announcedAt ?? x.createdAt,
        titre: x.state === "encaisse" ? t("Prélèvement encaissé") : x.state === "rejete" ? t("Prélèvement rejeté") : x.state === "remis" ? t("Prélèvement présenté") : t("Prélèvement annoncé"),
        sous: `${t("{m} FCFA le {d}", { m: fmt(x.amount), d: fmtDate(x.dueOn, false) })} · ${x.ref}`,
        etat: x.state === "encaisse" ? t("encaissé le {d}", { d: fmtDate(x.settledAt ?? x.dueOn, false) }) : x.state === "rejete" ? t("rejeté par votre banque") : t("annoncé le {d}", { d: fmtDate(x.announcedAt ?? x.createdAt, false) }),
        ton: (x.state === "encaisse" ? "fait" : x.state === "rejete" ? "attend" : undefined) as "fait" | "attend" | undefined,
        geste: ouvrirLAvis(x.id, { label: t("Mes prélèvements"), href: "/moi/prelevements" }),
      })),
    ...garde.map((a) => ({
      clef: `garde-${a.id}`,
      at: a.periodTo,
      titre: t("Avis de droits de garde · {p}", { p: a.period }),
      sous: `${a.du > 0 ? t("{m} FCFA", { m: fmt(Math.round(a.du)) }) : t("sans frais")} · ${a.ref}`,
      etat: t("du {a} au {b}", { a: fmtDate(a.periodFrom, false), b: fmtDate(a.periodTo, false) }),
      ton: undefined as "fait" | "attend" | undefined,
      /* UN FRAIS SE CONTESTE SUR UN PAPIER : le geste est ici, à côté du
         montant, et non trois pages plus loin. */
      geste: ouvrirLAvis(a.id, { label: t("Contester"), href: "/moi/reclamation" }),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  /* ── Rayon 4 · vos démarches ───────────────────────────────────────── */
  const demarches = miens
    .filter((d) => DEMARCHES.includes(d.type))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => ({
      id: d.id,
      titre: t(DOC_LABEL[d.type]),
      sous: `${t("déposée le {d}", { d: fmtDate(d.createdAt, false) })} · ${d.number}`,
      geste: { label: t("Ouvrir"), href: versLaPiece(d.id) },
    }));

  /* Un rayon vide ne compte pas à voix haute : « 0 document » sur une bande
     dit deux fois la même chose que la phrase qui est dessous. Et le pluriel
     se lit du nombre affiché, pas d'une autre liste : « 0 opérations » était
     le pluriel d'un compte qui n'était pas celui-là. */  /* Combien d'opérations ont produit un papier : la page des opérations s'en
     sert pour savoir si sa bascule « par opération / par date » a un sens. */
  const opsAvecDocs = ops.filter((o) => desOperations.some((d) => d.intentId === o.id)).length;

  return { signes, aSigner, desOperations, ops, opsAvecDocs, aRegler, argent, demarches, consent, tientQuelqueChose };
}

export type Rayons = Awaited<ReturnType<typeof chargerLesRayons>>;
