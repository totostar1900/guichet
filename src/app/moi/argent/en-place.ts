import { repo } from "@/lib/data";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { nextRun } from "@/lib/domain/standing";
import { etapeDuMandat, paiementDeLEpargne } from "@/lib/domain/mandat";
import { prochaineEcheance } from "@/lib/domain/prelevement";
import type { getT } from "@/i18n/server";

type T = Awaited<ReturnType<typeof getT>>;

/** Une règle qui part toute seule, dite UNE fois (16 novembre 2026, planche « Mon argent », 2B). */
export type RegleEnPlace = {
  cle: string;
  nom: string;
  dit: string;
  /** L'état, dans le vocabulaire unique : à signer · copie attendue · en vérification · copie refusée · actif · arrêté. */
  etat: string;
  ton: "actif" | "attente" | "neutre";
  href: string;
  /** Le geste que la règle attend du client, dit dans la rangée plutôt que derrière un tap. */
  geste?: { libelle: string; href: string };
};

/**
 * CE QUI PART TOUT SEUL, RANGÉ PAR RÈGLE ET NON PAR PAGE.
 *
 * L'épargne et son mandat sont UNE décision : une épargne dont le mandat attend sa signature est une seule rangée, « à signer », et son geste est « Signer le mandat ».
 * Elle ne se lit plus une fois sous « Prélèvements » et une fois sous « Épargnes programmées » (audit du 16 novembre 2026).
 */
export async function reglesEnPlace(userId: string, t: T): Promise<RegleEnPlace[]> {
  const r = repo();
  const [mandats, standing, offers] = await Promise.all([r.listMandats(userId).catch(() => []), r.listStandingOrders(userId).catch(() => []), r.listOffers().catch(() => [])]);
  const aujourdHui = localIso(new Date());
  const titre = (id: string) => offers.find((o) => o.id === id)?.title ?? id;
  const lignes: RegleEnPlace[] = [];

  const etatDuMandat = (etape: ReturnType<typeof etapeDuMandat>, suspendu: boolean) => {
    if (suspendu) return { etat: t("arrêté"), ton: "neutre" as const, geste: undefined };
    if (etape === "a_signer") return { etat: t("à signer"), ton: "attente" as const, geste: t("Signer le mandat") };
    if (etape === "copie_attendue") return { etat: t("copie attendue"), ton: "attente" as const, geste: t("Envoyer ma copie signée") };
    if (etape === "copie_refusee") return { etat: t("copie refusée"), ton: "attente" as const, geste: t("Renvoyer ma copie signée") };
    if (etape === "en_verification") return { etat: t("en vérification"), ton: "attente" as const, geste: undefined };
    return { etat: t("actif"), ton: "actif" as const, geste: undefined };
  };

  /* LES ÉPARGNES, chacune avec son mandat dedans. */
  for (const x of standing.filter((y) => y.source === "virement" && (y.state === "active" || y.state === "suspendue"))) {
    const mandat = mandats.find((m) => m.objet === "instruction" && m.standingId === x.id && m.state !== "revoque");
    const paiement = paiementDeLEpargne(x, mandats, standing);
    const etape = mandat ? etapeDuMandat(mandat) : paiement === "virement" || paiement === "prelevement" ? "actif" : "a_signer";
    const e = etatDuMandat(etape, x.state === "suspendue");
    const prochain = e.ton === "actif" ? nextRun(x, aujourdHui) : null;
    lignes.push({
      cle: `epargne-${x.id}`,
      nom: t("Épargne vers {f}", { f: titre(x.offerId) }),
      dit: [t("{m} FCFA", { m: fmt(x.amount) }), t("le {j} de chaque mois", { j: String(x.dayOfMonth) }), prochain ? t("prochain le {d}", { d: fmtDate(prochain, false) }) : undefined].filter(Boolean).join(" · "),
      etat: e.etat,
      ton: e.ton,
      href: mandat ? `/moi/prelevements/${mandat.id}` : "/moi/epargne",
      geste: e.geste && mandat ? { libelle: e.geste, href: `/moi/prelevements/${mandat.id}` } : undefined,
    });
  }

  /* LE VERSEMENT MENSUEL DE LA PROVISION : un mandat sans épargne. */
  for (const m of mandats.filter((y) => y.objet === "provision" && y.state !== "revoque")) {
    const e = etatDuMandat(etapeDuMandat(m), m.state === "suspendu");
    const prochain = e.ton === "actif" && m.dayOfMonth ? prochaineEcheance(m.dayOfMonth, aujourdHui) : undefined;
    lignes.push({
      cle: `provision-${m.id}`,
      nom: t("Verser chaque mois"),
      dit: [t("{m} FCFA", { m: fmt(m.amount) }), m.dayOfMonth ? t("le {j} de chaque mois", { j: String(m.dayOfMonth) }) : undefined, prochain ? t("prochain le {d}", { d: fmtDate(prochain, false) }) : undefined].filter(Boolean).join(" · "),
      etat: e.etat,
      ton: e.ton,
      href: `/moi/prelevements/${m.id}`,
      geste: e.geste ? { libelle: e.geste, href: `/moi/prelevements/${m.id}` } : undefined,
    });
  }

  /* LES COUPONS : une rangée, en place ou non. */
  const coupons = standing.filter((x) => x.source === "encaissements" && x.state === "active");
  if (coupons.length) {
    for (const x of coupons)
      lignes.push({ cle: `coupons-${x.id}`, nom: t("Coupons replacés vers {f}", { f: titre(x.offerId) }), dit: t("Chaque coupon reçu est replacé automatiquement."), etat: t("actif"), ton: "actif", href: "/moi/reinvestir" });
  } else {
    lignes.push({ cle: "coupons", nom: t("Réinvestir mes coupons"), dit: t("Chaque coupon reçu est replacé automatiquement sur la ligne de votre choix."), etat: t("rien en place"), ton: "neutre", href: "/moi/reinvestir" });
  }
  return lignes;
}
