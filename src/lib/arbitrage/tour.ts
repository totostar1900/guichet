import "server-only";
import { repo } from "@/lib/data";
import { audit } from "@/lib/audit";
import { etatDArbitrage } from "@/lib/domain/arbitrage";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { notifyIntentUpdated } from "@/lib/notify/dispatch";

/** La main qui a agi, au registre : lequel des robots est passé. */
const ROBOT = "robot arbitrages";

/**
 * LE TOUR QUI REND LA MAIN AU CLIENT.
 *
 * UNE PAIRE ARMÉE NE S'ÉTEINT PAS TOUTE SEULE. Le desk ne la déclenche que le
 * jour où les deux jambes tiennent ; si ce jour n'arrive pas, rien ne se passe
 * — et « rien ne se passe » est exactement ce que le client ne peut pas
 * distinguer d'un oubli de la maison. C'est pour cela que la date limite est
 * obligatoire depuis le 26 octobre 2026, et c'est ce tour qui lui donne son
 * effet : sans lui, la borne serait un chiffre écrit sur un formulaire.
 *
 * CE QU'IL FAIT, ET RIEN DE PLUS : il clôt les ordres dont la date est passée,
 * avec le motif que le client lit, et il le lui dit. Il ne vend rien, n'achète
 * rien et ne touche à aucune position — c'est le contraire : une expiration est
 * la garantie que rien n'a bougé.
 *
 * LES MOTS SONT LA FONCTIONNALITÉ. Un client qui lit « échoué » conclut que la
 * maison s'est trompée et n'en reposera jamais ; il faut qu'il lise que la
 * protection a joué. La phrase vient de `etatDArbitrage`, avec celles des
 * écrans, pour qu'elles ne divergent pas.
 *
 * UN TOUR QUI N'ÉTEINT RIEN EST UN SUCCÈS : il rend le compte de ce qu'il a
 * regardé, pour qu'une file qui n'avance pas se diagnostique depuis la page
 * Santé sans rejouer le tour.
 */
export interface TourDArbitrage {
  /** Les paires armées qu'on a regardées. */
  vues: number;
  /** Celles que la date a éteintes, nommées par leur référence. */
  eteints: string[];
  /** Ce qui n'a pas pu être clos, avec sa raison : un échec silencieux rendrait ce tour menteur. */
  refus: { ref: string; raison: string }[];
  /**
   * Les paires éteintes dont le client n'a PAS été prévenu, avec la raison.
   *
   * RELEVÉ À LA REVUE DES ROBOTS du 26 octobre 2026. L'envoi vivait sous
   * `if (offer)` et un `.catch(() => {})` : deux silences, et c'est le dernier
   * endroit de ce tour où « rien ne s'est passé » pouvait vouloir dire « la
   * protection a joué et personne ne vous l'a dit ».
   *
   * SÉPARÉ DE « REFUS » PARCE QUE CE N'EST PAS LA MÊME PANNE. Un refus est une
   * paire qu'on n'a pas su clore — elle reste armée, et le tour suivant
   * réessaie. Ici l'extinction a bien eu lieu : elle est faite, inscrite au
   * registre, et il ne manque que le mot au client. Les confondre ferait
   * chercher au desk une clôture à refaire là où il n'y a qu'un téléphone à
   * décrocher.
   */
  muets: { ref: string; raison: string }[];
}

/** Les états qui n'attendent plus rien : une paire qui les porte est déjà jouée. */
const CLOS = new Set(["servie", "reglee", "annulee", "non_servie"]);

export async function tourDesArbitrages(now = new Date()): Promise<TourDArbitrage> {
  const r = repo();
  const aujourdHui = localIso(now);
  const tous = await r.listIntents();
  /* On ne lit QUE les paires encore vivantes : un ordre déjà servi porte sa
     destination pour toujours, et le reclore chaque soir écrirait une ligne de
     journal par jour et par arbitrage passé. */
  const armes = tous.filter((i) => i.switchToOfferId && !CLOS.has(i.state));
  const eteints: string[] = [];
  const refus: { ref: string; raison: string }[] = [];
  const muets: { ref: string; raison: string }[] = [];

  for (const i of armes) {
    if (!i.switchBy || i.switchBy >= aujourdHui) continue;
    try {
      const offer = await r.getOffer(i.offerId);
      const dest = await r.getOffer(i.switchToOfferId!);
      /* LE MOTIF EST CELUI QUE LE CLIENT LIT, et il dit le succès. Il est écrit
         ici en une phrase plutôt que repris de `etatDArbitrage` parce que
         celui-ci parle au présent d'un état ; ce motif-ci est daté et nomme la
         ligne d'arrivée, ce que l'état ne peut pas faire. Les deux disent la
         même chose, et l'épreuve les tient ensemble. */
      const motif = `Arbitrage expiré le ${fmtDate(i.switchBy, false)} : la ligne d'arrivée${dest ? ` (${dest.title})` : ""} n'a pas tenu en même temps que la vente, au-dessus de votre plancher${i.switchFloor ? ` de ${fmt(i.switchFloor)} FCFA` : ""}. Rien n'a bougé : votre position est intacte, et votre argent aussi. C'est la protection qui a joué.`;
      const clos = await r.setIntentState(i.id, "annulee", motif);
      /* AU REGISTRE, comme une transition faite à la main. Le desk qui passe
         une intention en « annulée » laisse « intent.transition » avec son
         avant et son après ; ce robot clôt l'ordre d'un client et ne laissait
         rien. Le même événement tracé par une porte et pas par l'autre est la
         pire des deux situations, parce que le registre paraît complet — et
         c'est ici l'ordre du client qui se ferme. */
      await audit("intent.transition", "intent", i.id, {
        before: { state: i.state },
        after: { state: "annulee", closedReason: motif },
        reason: `${i.ref} · ${i.clientName} · arbitrage expiré le ${fmtDate(i.switchBy, false)}`,
        actor: ROBOT,
      });
      await r.logEvent({
        kind: "system",
        intentId: i.id,
        offerId: i.offerId,
        html: `${i.ref} : <b>arbitrage expiré</b> (date limite du ${fmtDate(i.switchBy, false)}) · position intacte, rien n'a bougé`,
      });
      eteints.push(i.ref);
      /**
       * ET LE CLIENT L'APPREND, OU LE DESK APPREND QU'IL NE L'A PAS APPRIS.
       *
       * C'EST LE MESSAGE QUI PORTE TOUT LE SENS DE CE TOUR. L'extinction n'est
       * pas un fait visible : le client lisait « armé, rien n'a bougé » et
       * lirait ensuite « clos, rien n'a bougé ». Sans le message, la seule
       * différence entre la protection qui a joué et une maison qui a oublié
       * son ordre est une ligne d'état qu'il faut aller chercher.
       *
       * LE SILENCE ÉTAIT « .catch(() => {}) » — le try/catch vide, exactement
       * celui que le robot de l'épargne a coûté à cette maison — ET LE FAIT
       * QUE `notifyIntentUpdated` RENDAIT `void`. Deux chemins y mènent, tous
       * deux atteignables : aucun contact joignable sur l'ordre, et un canal
       * que le fournisseur refuse ou saute. Dans le premier, AUCUNE ligne
       * n'entre au registre des notifications, donc le panneau « Envois en
       * échec » de la page Santé ne rattrapait rien : il n'y avait rien à voir
       * nulle part.
       *
       * « if (offer) » GARDE UN CAS QUE L'APPLICATION NE PRODUIT PAS :
       * `createIntent` refuse une offre inconnue et rien ne supprime jamais une
       * offre. Le garde reste — `getOffer` rend un optionnel, et une ligne
       * effacée à la main en base ne doit pas lever — mais sa raison est
       * nommée ici pour ce qu'elle est, et non pour un trou qu'elle aurait
       * bouché.
       *
       * L'ENVOI EST APRÈS L'EXTINCTION ET NE LA DÉFAIT PAS. Une borne que le
       * client a signée doit jouer à la date dite, même si son canal est
       * cassé ; le laisser armé serait lui retirer la protection pour laquelle
       * il a écrit cette date. Le `try` ici est à lui : sans cela, un
       * fournisseur en panne tomberait dans le `catch` du tour et rangerait en
       * « refus » une clôture qui a eu lieu.
       */
      const envoi = offer
        ? await notifyIntentUpdated(clos, offer, "annulee").catch((e) => ({ sent: false, error: e instanceof Error ? e.message : "échec de l'envoi" }))
        : { sent: false, error: `la ligne de départ (${i.offerId}) est introuvable : le message n'a pas pu être composé` };
      if (!envoi.sent) {
        const raison = envoi.error ?? "canal injoignable";
        muets.push({ ref: i.ref, raison });
        await r.logEvent({
          kind: "avis_manque",
          intentId: i.id,
          html: `${i.ref} (${i.clientName}) : <b>extinction non annoncée au client</b> · ${raison} · la position est intacte, et c'est à lui dire de la main`,
        });
      }
    } catch (e) {
      refus.push({ ref: i.ref, raison: e instanceof Error ? e.message : "échec" });
    }
  }
  return { vues: armes.length, eteints, refus, muets };
}

/**
 * L'ÉTAT D'UNE PAIRE, POUR UN ÉCRAN, SANS RELIRE LA BASE.
 *
 * Réexporté d'ici pour que les pages n'aient qu'un import à faire quand elles
 * affichent un arbitrage : le domaine donne les mots, le tour donne l'effet.
 */
export { etatDArbitrage };
