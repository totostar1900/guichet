import type { Dit } from "./services";
import type { ContexteClient } from "./services";
import type { Offer } from "./types";
import { fondsListes, lignesDeLaCote } from "./listes";
import { displayYield } from "./status";
import { fmt, fmtPct } from "@/lib/format";

/**
 * CE QUI ATTEND DERRIÈRE UNE TUILE DE TRADE.
 *
 * LE TROU QUE CELA BOUCHE. Les cinq tuiles de la racine portaient leur nom et
 * la phrase du service — ce qu'on y fait —, et rien de ce qu'on y TROUVE. Un
 * client qui hésite entre « Adjudications » et « Investir dans un fonds »
 * devait ouvrir les deux pour savoir si l'une d'elles avait quelque chose à
 * lui montrer cette semaine-là. La maquette le disait depuis le début : deux
 * lignes sous chaque tuile.
 *
 * AUCUNE LECTURE DE PLUS, ET C'EST LA CONDITION QUI A DÉCIDÉ. Les offres sont
 * déjà en main sur cette page, et le contexte du client est en cache par
 * requête. Un aperçu qui aurait demandé une requête par tuile aurait été
 * écarté comme l'a été le volet « la séance » de la page d'arrivée — une
 * dizaine de requêtes pour un ornement. Ici, tout sort de ce qui est lu.
 *
 * LES SÉLECTEURS SONT CEUX DE LA MAISON. `seancesAnnoncees` (par
 * `echeancesProches`), `lignesDeLaCote` et `fondsListes` décident déjà ce
 * qu'une page de catalogue montre ; les reprendre garantit qu'une tuile ne
 * promet pas une ligne que sa destination n'affiche pas.
 *
 * DEUX AU PLUS. Trois lignes sous une tuile en font une liste, et la racine
 * redeviendrait la page de catalogue qu'elle sert à éviter.
 */
export interface Apercu {
  /** Le titre de la ligne, tel que la maison l'écrit. Une donnée, pas une clef. */
  nom: string;
  /** Ce qu'on en dit : un chiffre mis en forme, ou le temps qui reste. */
  dit: Dit;
}

/** Deux lignes sous une tuile ; au-delà, c'est une liste. */
export const APERCUS_PAR_TUILE = 2;

/**
 * UN SERVICE SANS APERÇU N'EN REÇOIT PAS DE FAUX.
 *
 * « Se dire preneur » ne porte rien : ce n'est pas un catalogue mais une
 * intention qu'on déclare, et sa phrase dit déjà tout — « sans engagement, le
 * desk vous rappelle avant la clôture ». Les rayons « Programmer » et
 * « Tenir » restent des bandes, et leur état vit dans leur étiquette.
 *
 * ET UN APERÇU VIDE NE SE REMPLACE PAS PAR UNE PHRASE D'EXCUSE. Aucune séance
 * ouverte cette semaine, c'est une tuile sans ses deux lignes — la même règle
 * que le niveau 3 de la page d'arrivée, appliquée à l'intérieur d'une tuile.
 */
export function apercusDuService(cle: string, offers: Offer[], ctx: ContexteClient): Apercu[] {
  /* « primaire » N'EN REÇOIT PAS, ET C'EST LE SEUL REFUS DE CETTE LISTE.
     Ses deux lignes seraient les deux prochaines séances — exactement celles
     que « Ce qui ferme bientôt » pose en tête de cette même racine, à quelques
     centaines de pixels de là. Deux listes de la même chose sur un écran
     divergent toujours, et c'est la leçon que `nav-groups` écrit en tête de
     fichier. La maquette les dessinait parce qu'elle ne portait pas encore la
     bande ; la bande a gagné, elle arrive plus haut et dit le temps qui reste.
     Les trois autres tuiles, elles, montrent ce que rien d'autre ne montre
     ici : la cote, les fonds ouverts, la part qu'on détient. */

  if (cle === "actions") {
    return lignesDeLaCote(offers)
      .slice(0, APERCUS_PAR_TUILE)
      .map((o): Apercu => {
        /* LE RENDEMENT QUAND IL EXISTE, LE COURS SINON. Une action n'a pas de
           rendement à montrer ici — son dividende est passé, pas promis — et
           une obligation cotée sans cours publié n'a que son coupon. */
        const r = displayYield(o);
        if (r.pct != null) return { nom: o.title, dit: { key: "{r} de rendement", params: { r: fmtPct(r.pct, 1) } } };
        return { nom: o.title, dit: { key: "{m} FCFA", params: { m: fmt(Math.round(o.lastPrice ?? 0)) } } };
      });
  }

  if (cle === "fonds") {
    return fondsListes(offers)
      .slice(0, APERCUS_PAR_TUILE)
      .map((f) => ({ nom: f.title, dit: { key: "VL {n} FCFA", params: { n: fmt(Math.round(f.fund.nav)) } } }));
  }

  if (cle === "passage") {
    /* CE QU'ON PEUT DÉPLACER, et non où le déplacer : le passage part d'une
       part détenue. Sans part, la tuile n'a rien à annoncer — et le service
       lui-même est déjà « à activer » dans ce cas. */
    const p = ctx.partsDeFonds;
    return p ? [{ nom: p.titre, dit: { key: "{n} parts", params: { n: fmt(p.parts) } } }] : [];
  }

  return [];
}
