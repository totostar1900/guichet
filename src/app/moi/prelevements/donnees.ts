import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { etapeDuMandat, MOTIFS_DE_REFUS_DE_COPIE } from "@/lib/domain/mandat";
import { prochaineEcheance } from "@/lib/domain/prelevement";
import { nextRun } from "@/lib/domain/standing";
import { localIso } from "@/lib/format";
import { aucunCanalPossible, canalDuCode } from "@/lib/kyc/canal";
import type { Vu } from "./MesMandats";

/**
 * CE QUE LES PAGES DES PRÉLÈVEMENTS LISENT, UNE FOIS : le sommaire, la page d'un mandat, la création et l'historique ne recopient pas la même requête.
 * Un mandat se lit comme le client le voit : où il en est (l'étape), l'épargne qu'il paie, son prochain prélèvement, et le motif du dernier refus de sa copie.
 */
export async function lireLesMandats(userId: string) {
  const t = await getT();
  const r = repo();
  const [mandats, standing, fiche, tirages, offres] = await Promise.all([
    r.listMandats(userId),
    r.listStandingOrders(userId).catch(() => []),
    r.getClientFileByUser(userId),
    r.listTirages({ userId }).catch(() => []),
    r.listOffers().catch(() => []),
  ]);
  const aujourdHui = localIso(new Date());
  const epargneDe = (id?: string) => (id ? standing.find((x) => x.id === id) : undefined);
  const canal = fiche ? await canalDuCode(userId, fiche) : undefined;
  const vus: Vu[] = mandats.map((m) => ({
    id: m.id,
    standingId: m.standingId,
    ref: m.ref,
    objet: m.objet,
    titulaire: m.accountHolder,
    banque: m.bankName,
    compte: m.bankAccount,
    montant: m.amount,
    jour: m.dayOfMonth ?? epargneDe(m.standingId)?.dayOfMonth,
    fonds: epargneDe(m.standingId) ? offres.find((o) => o.id === epargneDe(m.standingId)?.offerId)?.title : undefined,
    etat: m.state,
    etape: etapeDuMandat(m),
    refus: m.refusMotif && m.refusMotif in MOTIFS_DE_REFUS_DE_COPIE ? t(MOTIFS_DE_REFUS_DE_COPIE[m.refusMotif as keyof typeof MOTIFS_DE_REFUS_DE_COPIE]) : undefined,
    signeLe: m.signedAt,
    piece: m.docId,
    codeEnvoyeA: m.pendingCodeTo,
    codeEnvoyeLe: m.pendingCodeAt,
    revoqueLe: m.revokedAt,
    prochain:
      m.signedAt && m.state === "actif" && etapeDuMandat(m) === "actif"
        ? m.dayOfMonth
          ? prochaineEcheance(m.dayOfMonth, aujourdHui)
          : ((e) => (e ? nextRun(e, aujourdHui) : null))(epargneDe(m.standingId)) ?? undefined
        : undefined,
  }));
  return {
    mandats,
    vus,
    tirages,
    fiche,
    canal: canal ? { to: canal.to, parMail: canal.channel === "email" } : undefined,
    injoignable: aucunCanalPossible(canal),
    /* Un mandat par usage : la provision n'est proposée que si aucun mandat vivant (actif ou à signer) ne la couvre. */
    provisionLibre: !mandats.some((m) => m.objet === "provision" && m.state !== "revoque"),
  };
}
