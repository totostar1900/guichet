import { repo } from "@/lib/data";
import { nextRun, recurringMinimum } from "@/lib/domain/standing";
import { localIso } from "@/lib/format";

/**
 * CE QUE LES PAGES DE L'ÉPARGNE PROGRAMMÉE LISENT, UNE FOIS : le sommaire et ses trois pages ne recopient pas la même requête.
 * Un versement mensuel va vers une PART, qui se divise : un titre ne se divise pas, et une somme fixe n'y tomberait jamais juste.
 */
export async function lireLEpargne(userId: string) {
  const r = repo();
  const [offers, standing, mandats] = await Promise.all([r.listOffers(), r.listStandingOrders(userId).catch(() => []), r.listMandats(userId).catch(() => [])]);
  const aujourdHui = localIso(new Date());
  const fonds = offers
    .filter((o) => o.kind === "FONDS" && !o.hidden && o.status !== "withdrawn")
    // La VL part avec le fonds : sans elle, le formulaire ne peut pas dire ce qu'un versement achète.
    .map((o) => ({ id: o.id, title: o.title, min: recurringMinimum(o), vl: o.fund?.nav }))
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));
  const versements = standing.filter((x) => x.source === "virement");
  const actifs = versements.filter((x) => x.state === "active");
  const prochain = actifs.map((x) => nextRun(x, aujourdHui)).filter((d): d is string => Boolean(d)).sort()[0];
  return { offers, standing, mandats, fonds, versements, actifs, prochain, aujourdHui };
}
