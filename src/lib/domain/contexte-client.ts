import "server-only";
import { cache } from "react";
import { repo } from "@/lib/data";
import { loadBeacAuctions } from "@/lib/market/beac-feed";
import type { BeacAuction } from "@/lib/market/beac";
import { positionsFrom } from "@/lib/positions";
import { attendUneSignature } from "@/lib/domain/intent";
import { conventionAReprendre } from "@/lib/kyc/checklist";
import { cashPosition } from "@/lib/domain/cash";
import { bilan, suivre, type LigneTenue } from "@/lib/domain/encaissement";
import { attentesDuClient, type ContexteClient } from "@/lib/domain/services";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, localIso } from "@/lib/format";

/**
 * Ce que la maison sait d'un client, assemblé une fois.
 *
 * TROIS ENDROITS LE DEMANDAIENT, chacun le fabriquait. La console, la page des
 * services, et maintenant le compteur « À décider » de la bande, qui paraît sur
 * toutes les pages. Trois assemblages veulent dire trois occasions de diverger,
 * et un compteur qui annoncerait deux décisions devant une page qui en montre
 * trois est pire que pas de compteur du tout.
 *
 * `cache` de React fait le reste : la bande et la page se rendent dans la même
 * requête, donc l'assemblage coûte une fois pour les deux. Le seul appel
 * réseau, les annonces de la BEAC, porte déjà son propre cache d'une heure.
 */
export const contexteDuClient = cache(async (userId: string): Promise<ContexteClient> => {
  const t = await getT();
  const r = repo();
  const aujourdHui = localIso(new Date());

  const [intents, offers, cash, standing, feed, fiche] = await Promise.all([
    r.listIntents(),
    r.listOffers(),
    r.listCash(userId).catch(() => []),
    r.listStandingOrders(userId).catch(() => []),
    loadBeacAuctions().catch(() => ({ auctions: [] as BeacAuction[] })),
    r.getClientFileByUser(userId).catch(() => undefined),
  ]);

  const mine = intents.filter((i) => i.clientId === userId);
  const aSigner = mine.filter(attendUneSignature);
  const aRepondre = mine.filter((i) => i.state === "contre_proposee");
  const positions = positionsFrom(mine, offers);
  const poche = cashPosition(cash, mine);
  const lignes: LigneTenue[] = positions.map((p) => ({ intentId: p.intent.id, titre: p.offer.title, echus: p.echus, aVenir: p.flows }));
  const b = bilan(suivre(lignes, cash));
  const part = positions.find((p) => p.offer.kind === "FONDS");
  const action = positions.find((p) => p.offer.kind === "ACTIONS");
  const reinv = standing.find((x) => x.state === "active" && x.source === "encaissements");
  const epargne = standing.find((x) => x.state === "active" && x.source === "virement");
  const devant = feed.auctions
    .filter((a) => a.kind === "annonce" && a.on && a.on >= aujourdHui)
    .sort((a, b2) => a.on!.localeCompare(b2.on!))[0];

  return {
    lignes: positions.length,
    partsDeFonds: part ? { titre: part.offer.title, parts: part.units } : undefined,
    fondsOuverts: offers.filter((o) => o.kind === "FONDS" && o.fund?.distributed && !o.hidden).length,
    actions: action ? { titre: action.offer.title, n: action.units } : undefined,
    disponible: poche.idle,
    /* Les deux devoirs : un bulletin à signer, une contre-proposition à
       trancher. Ils se comptent sur les ordres du client, déjà lus ici. */
    /* UNE QUESTION N'EST PAS UN BULLETIN. Le compte prenait « état confirmée »
       tous types confondus : une question posée au desk, qu'il avait prise en
       main, s'annonçait « 1 ordre · le bulletin est prêt ». La règle vraie vit
       dans le registre des documents, et attendUneSignature la lit. */
    aSigner: aSigner.length,
    aRepondre: aRepondre.length,
    // Seules : le bouton va droit à l'ordre. Plusieurs : il va à leur liste.
    ouSigner: aSigner.length === 1 ? aSigner[0].id : undefined,
    ouRepondre: aRepondre.length === 1 ? aRepondre[0].id : undefined,
    /* LE TROISIÈME DEVOIR, QUI MANQUAIT. Le dossier se lisait sur sa page et
       nulle part ailleurs : un client approuvé dont la convention attendait
       pouvait traverser l'application entière sans croiser le geste qui la
       déverrouille. Les deux états retenus sont ceux où le desk a joué et
       rend la main ; le brouillon n'attend personne. */
    dossier: fiche?.status === "approuve" && !fiche.consents.conventionAt ? "convention" : fiche && conventionAReprendre(fiche) ? "convention_reprise" : fiche?.status === "complements" ? "complements" : undefined,
    attendu: b.nbAttendus ? { montant: b.attendu, retardJours: b.retardMax } : undefined,
    reinvestissement: reinv ? { destination: offers.find((o) => o.id === reinv.offerId)?.title ?? reinv.offerId, plancher: reinv.minAmount } : undefined,
    epargne: epargne ? { montant: epargne.amount, jour: epargne.dayOfMonth, destination: offers.find((o) => o.id === epargne.offerId)?.title ?? epargne.offerId } : undefined,
    prochaineSeance: devant
      ? { pays: devant.country ?? t("la zone"), quoi: [devant.instrument, devant.tenor].filter(Boolean).join(" ") || t("une séance"), le: fmtDate(devant.on!) }
      : undefined,
    moisDHistorique: positions.length ? 12 : 0,
    appariementExecutable: false,
    /* Le champ existait, documenté, et personne ne le remplissait ici : la
       console et la bande supposaient donc le compte ouvert, y compris pour un
       dossier au brouillon. La seconde condition tient parce qu'un client qui
       tient des lignes a forcément un compte : sans elle, un référentiel
       incomplet renverrait ouvrir un compte déjà ouvert. */
    compteOuvert: Boolean(fiche?.review.custodianAccount) || positions.length > 0,
  };
});

/**
 * Ce qui attend ce client, pour la barre : le compte ET la destination.
 *
 * Le même calcul que la page, jamais un raccourci : un compteur qui compte
 * autrement que la liste qu'il ouvre ment deux fois, une fois dans la bande et
 * une fois quand on clique.
 *
 * ELLE REND LA LISTE, ET PAS SEULEMENT SA LONGUEUR. Une pastille qui annonce
 * un nombre sans mener nulle part demande au lecteur de deviner où aller : la
 * barre a besoin du geste autant que du chiffre. Une seule attente, et la
 * pastille y va tout droit ; plusieurs, elle ouvre la bande qui les porte.
 */
export interface AttenteDeBarre {
  cle: string;
  href: string;
}
export const attentesPourLaBarre = cache(async (userId: string): Promise<AttenteDeBarre[]> => {
  try {
    const ctx = await contexteDuClient(userId);
    // Le formateur ne sert qu'aux libellés, dont on ne garde ici que la destination.
    return attentesDuClient(ctx, fmt).map((a) => ({ cle: a.cle, href: a.href }));
  } catch {
    // Le compteur ne fait jamais tomber une page : sans liste, pas de pastille.
    return [];
  }
});
