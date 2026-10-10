import "server-only";
import { repo } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { peutAgir, type GesteEngageant, type Verdict } from "@/lib/domain/mesure";

/**
 * LE GARDE, APPELÉ AVANT TOUT GESTE ENGAGEANT.
 *
 * Avant lui, la clôture d'un compte était honorée à DEUX endroits sur les
 * quarante et un gestes qu'un client peut faire : il pouvait encore signer un
 * mandat, programmer une épargne, changer ses coordonnées bancaires. Une
 * restriction honorée dans deux cas sur quarante et un n'est pas une
 * restriction, et c'est pourquoi ce garde précède toute mesure : sans lui,
 * chaque cran ajouté serait décoratif.
 *
 * IL REFUSE EN DISANT POURQUOI. Un refus sans raison est la pire des pannes
 * muettes : le client croit avoir mal cliqué, recommence, et finit par
 * écrire au desk pour une chose que l'écran aurait pu dire.
 *
 * `couvert` sert au seul cran « prépaiement » : l'appelant dit si la
 * provision couvre déjà l'opération, parce que lui seul connaît le montant.
 */
export async function garde(geste: GesteEngageant, opts: { couvert?: boolean; montant?: number } = {}): Promise<Verdict> {
  const s = await getSession();
  if (!s) return { ok: false, raison: "Connectez-vous d'abord." };
  const r = repo();
  const contact = await r.getContact(s.userId).catch(() => undefined);
  /* LA COUVERTURE SE CALCULE ICI, et non chez l'appelant : sous prépaiement
     c'est la seule chose qui compte, et chaque appelant la calculerait un peu
     différemment. Le montant lui, vient de l'appelant : lui seul le connaît. */
  const couvert = opts.couvert ?? (opts.montant != null ? await provisionCouvre(s.userId, opts.montant) : undefined);
  return peutAgir(geste, { mesure: contact?.mesure, kycStatus: s.kycStatus, couvert }, new Date());
}

/** Le disponible d'un client couvre-t-il ce montant ? Réservé et affecté ne comptent pas : ils sont déjà pris. */
export async function provisionCouvre(userId: string, montant: number): Promise<boolean> {
  if (!montant) return true;
  const r = repo();
  const [entries, intents] = await Promise.all([r.listCash(userId).catch(() => []), r.listIntents().catch(() => [])]);
  const { cashPosition } = await import("@/lib/domain/cash");
  const p = cashPosition(entries, intents.filter((i) => i.clientId === userId));
  return p.balance - p.assigned - p.reserve >= montant;
}
