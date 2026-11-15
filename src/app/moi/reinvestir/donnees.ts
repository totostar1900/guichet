import { repo } from "@/lib/data";
import { positionsFrom } from "@/lib/positions";
import { cashPosition } from "@/lib/domain/cash";
import { bilan, suivre, type LigneTenue } from "@/lib/domain/encaissement";
import { recurringMinimum } from "@/lib/domain/standing";
import { localIso } from "@/lib/format";

/**
 * CE QUE LES PAGES DU RÉINVESTISSEMENT LISENT, UNE FOIS : le sommaire et ses quatre pages ne recopient pas la même requête.
 * Le disponible est celui du journal, jamais la somme des coupons échus : un coupon déjà replacé n'est plus disponible.
 */
export async function lireLeReinvestissement(userId: string) {
  const r = repo();
  const [intents, offers, cash, standing] = await Promise.all([
    r.listIntents(),
    r.listOffers(),
    r.listCash(userId).catch(() => []),
    r.listStandingOrders(userId).catch(() => []),
  ]);
  const mine = intents.filter((i) => i.clientId === userId);
  const positions = positionsFrom(mine, offers);
  const lignes: LigneTenue[] = positions.map((p) => ({ intentId: p.intent.id, titre: p.offer.title, echus: p.echus, aVenir: p.flows }));
  const suivis = suivre(lignes, cash);
  const b = bilan(suivis);
  const poche = cashPosition(cash, mine);
  const enPlace = standing.filter((s) => s.source === "encaissements");
  const active = enPlace.find((s) => s.state === "active");
  /* Un versement va vers une part, qui se divise : un titre ne se divise pas, et un montant venu d'un coupon n'y tomberait jamais juste. */
  const fonds = offers
    .filter((o) => o.kind === "FONDS" && o.fund?.distributed && !o.hidden && o.status !== "withdrawn")
    .map((o) => ({ id: o.id, title: o.title, min: recurringMinimum(o) }))
    .sort((a, b2) => a.title.localeCompare(b2.title, "fr"));
  const prochains = suivis.filter((f) => f.etat === "a_venir").slice(0, 4);
  return { offers, b, poche, enPlace, active, fonds, prochains, aujourdHui: localIso(new Date()) };
}
