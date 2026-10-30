import "server-only";
import { repo } from "@/lib/data";
import { audit } from "@/lib/audit";
import { SEUIL_CLIENTS, SEUIL_MONTANT, consensus, expiree, mur, prete } from "@/lib/domain/sondage";
import { fmt, fmtDate, fmtPct, localIso } from "@/lib/format";
import { direLaClotureDeLAttente } from "@/lib/notify/sondage";

/** La main qui a agi, au registre et sur l'historique : lequel des robots est passé. */
const ROBOT = "robot sondage";

/**
 * LE TOUR DU SONDAGE : IL CLÔT CE QUI A EXPIRÉ, ET IL PRÉVIENT CE QUI EST MÛR.
 *
 * CE QUE LE ROBOT NE FAIT PAS, ET C'EST LE CHOIX PRINCIPAL : il n'écrit PAS le
 * consensus. Le dirigeant a demandé qu'« un robot consolide et propose un
 * consensus », et la tentation était de le calculer chaque soir dans une table.
 * Un consensus rangé est un chiffre qui vieillit : le desk lirait celui d'hier
 * soir pendant qu'une réponse de ce matin l'a déjà déplacé, et RIEN NE DIRAIT
 * L'ÉCART — c'est la forme de panne que cette maison a le plus payée. Le
 * consensus est donc une fonction pure, recalculée à chaque lecture de la page.
 *
 * CE QUE LE ROBOT FAIT EST CE QU'UNE LECTURE NE PEUT PAS FAIRE :
 *
 *   IL REND LA MAIN. Une attente dont le jour est passé n'attend plus rien, et
 *   la laisser « ouverte » la ferait compter dans un consensus que plus
 *   personne ne peut honorer : la maison porterait au Trésor une demande dont
 *   une part est déjà partie ailleurs. C'est la même mécanique que celle des
 *   arbitrages, et pour la même raison.
 *
 *   IL PRÉVIENT. Un consensus franchit le seuil le jour où un troisième client
 *   répond, et personne ne regarde la page à cet instant. Sans une ligne au
 *   journal, le desk découvre une demande mûre trois semaines plus tard, quand
 *   la séance qu'elle appelait est passée.
 *
 * UN TOUR QUI NE CLÔT RIEN EST UN SUCCÈS : il rend le compte de ce qu'il a
 * regardé, pour qu'une file qui n'avance pas se diagnostique depuis la page
 * Santé sans rejouer le tour.
 */
export interface TourDuSondage {
  /** Les attentes vivantes qu'on a regardées. */
  vues: number;
  /** Celles que la date a closes, nommées par leur référence. */
  closes: string[];
  /** Les demandes qui ont franchi le seuil et que le desk doit porter. */
  mures: { ligne: string; montant: number; clients: number }[];
  /** Ce qui n'a pas pu être clos, avec sa raison : un échec muet rendrait ce tour menteur. */
  refus: { ref: string; raison: string }[];
}

export async function tourDuSondage(now = new Date()): Promise<TourDuSondage> {
  const r = repo();
  const aujourdHui = localIso(now);
  const toutes = await r.listLignesSondees();
  const vivantes = toutes.filter((l) => l.state !== "close");
  const closes: string[] = [];
  const refus: { ref: string; raison: string }[] = [];

  for (const l of vivantes) {
    const jour = prete(l);
    /**
     * C'EST LA FIN DE LA FENÊTRE QUI REND LA MAIN, QUAND IL Y EN A UNE.
     *
     * Une ligne ne portait qu'un DÉBUT, et le robot la fermait le lendemain de
     * ce début : « prêt à partir du 18 novembre » devenait clos le 19. C'était
     * la seule lecture possible d'une date seule, et elle contredit maintenant
     * ce que le client écrit — « valable jusqu'au 31 décembre » veut dire qu'il
     * reste preneur six semaines de plus.
     *
     * Sans « jusquA », rien ne change : le début gouverne, comme avant, et les
     * lignes d'avant le 30 octobre 2026 se ferment au même jour qu'hier.
     */
    const fin = l.jusquA ?? jour;
    const parLaFin = Boolean(l.jusquA) && expiree(l, aujourdHui);
    /* LE JOUR SE COMPTE DEPUIS LA CRÉATION, et non depuis aujourd'hui. « Dans
       21 jours » dit le 20 octobre veut dire le 10 novembre, pour toujours ;
       recalculé chaque soir à partir du jour courant, il fuirait devant le
       robot et aucune attente n'expirerait jamais. */
    if (!fin || fin >= aujourdHui) continue;
    try {
      const motif = parLaFin
        ? l.origine === "desk"
          ? `Cette ligne n'était sondée que jusqu'au ${fmtDate(fin, false)}, et ce jour est passé.`
          : `Votre attente était valable jusqu'au ${fmtDate(fin, false)}, et ce jour est passé. Rien ne vous engageait, et rien ne vous engage : redites-le quand vous voudrez.`
        : l.origine === "desk"
          ? `L'horizon du ${fmtDate(fin, false)} est passé : la maison ne sonde plus cette ligne.`
          : `Vous étiez prêt à partir du ${fmtDate(fin, false)}, et cette date est passée sans qu'une séance s'ouvre. Rien ne vous engageait, et rien ne vous engage : redites-le quand vous voudrez.`;
      await r.updateLigneSondee(l.id, { state: "close", closedReason: motif });
      /* AU REGISTRE, comme la clôture faite à la main. Le desk qui clôt une
         attente laisse « sondage.statut » ; le robot ne laissait rien, et le
         même événement tracé par une porte et pas par l'autre fait un registre
         qui paraît complet. */
      await audit("sondage.statut", "sondage", l.id, {
        before: { state: l.state },
        after: { state: "close", closedReason: motif },
        reason: `${l.ref} · ${parLaFin ? "fenêtre fermée le" : "horizon du"} ${fmtDate(fin, false)}${parLaFin ? "" : " passé"}`,
        actor: ROBOT,
      });
      await r.logEvent({ kind: "system", html: `Sondage <b>${l.ref}</b> : <b>clos</b>, ${parLaFin ? "sa fenêtre se fermait" : "la date"} du ${fmtDate(fin, false)} est passée · rien n'était engagé` });
      /* ET LE CLIENT L'APPREND. Le motif ci-dessus est écrit à la deuxième
         personne — il l'a toujours été — et il attendait que le client revienne
         le chercher. L'envoi vient APRÈS l'écriture et son échec ne la défait
         pas : une attente dont la date est passée doit se fermer, sinon elle
         compte dans un consensus que plus personne ne peut honorer. */
      const envoi = await direLaClotureDeLAttente(l, motif);
      if (l.userId && !envoi.sent)
        await r.logEvent({ kind: "avis_manque", html: `Sondage <b>${l.ref}</b> : <b>clôture non annoncée au client</b> · ${envoi.error ?? "canal injoignable"} · à lui dire de la main` });
      closes.push(l.ref);
    } catch (e) {
      refus.push({ ref: l.ref, raison: e instanceof Error ? e.message : "échec" });
    }
  }

  /* LE SEUIL SE MESURE APRÈS LES CLÔTURES, et l'ordre compte : une demande
     portée au Trésor doit l'être sur ce qui tient encore, pas sur ce qui tenait
     ce matin. Deux cents millions dont la moitié vient d'expirer ne sont pas
     deux cents millions. */
  const apres = (await r.listLignesSondees()).filter((l) => l.state !== "close");
  const mures: TourDuSondage["mures"] = [];
  for (const c of consensus(apres).filter(mur)) {
    const niveau = c.niveau == null ? "sans condition" : c.unite === "taux" ? fmtPct(c.niveau, 2) : `${c.niveau.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
    await r.logEvent({
      kind: "desk",
      html: `Sondage : <b>${c.instrument} ${c.country} ${c.tenor}</b> est à porter — ${fmt(c.montant)} FCFA de ${c.clients} clients, autour de ${niveau}${c.auPlusTot ? `, tous prêts à partir du ${fmtDate(c.auPlusTot, false)}` : ""} · seuil ${fmt(SEUIL_MONTANT)} / ${SEUIL_CLIENTS} clients`,
    });
    mures.push({ ligne: `${c.instrument} ${c.country} ${c.tenor}`, montant: c.montant, clients: c.clients });
  }

  return { vues: vivantes.length, closes, mures, refus };
}
