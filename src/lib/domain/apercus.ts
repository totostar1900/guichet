import type { Dit } from "./services";
import type { ContexteClient } from "./services";
import type { Offer } from "./types";
import { enSouscription, fondsListes, lignesDeLaCote, seancesAnnoncees } from "./listes";
import { sectionDe } from "./sections";
import { joursAvant, joursEnMots } from "./echeances";
import { rendementDuFonds } from "./fund-perf";
import { displayStatus, displayYield, isActionable } from "./status";
import { fmt, fmtDate, fmtPct } from "@/lib/format";

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
export function apercusDuService(cle: string, offers: Offer[], ctx: ContexteClient, now: Date = new Date()): Apercu[] {
  /* « primaire » N'EN REÇOIT PAS, ET C'EST LE SEUL REFUS DE CETTE LISTE.
     Ses deux lignes seraient les deux prochaines séances — exactement celles
     que « Ce qui ferme bientôt » pose en tête de cette même racine, à quelques
     centaines de pixels de là. Deux listes de la même chose sur un écran
     divergent toujours, et c'est la leçon que `nav-groups` écrit en tête de
     fichier. La maquette les dessinait parce qu'elle ne portait pas encore la
     bande ; la bande a gagné, elle arrive plus haut et dit le temps qui reste.
     Les trois autres tuiles, elles, montrent ce que rien d'autre ne montre
     ici : la cote, les fonds ouverts, la part qu'on détient. */

  /* « rachat » N'EN REÇOIT PAS NON PLUS, pour la raison exacte de
     « primaire » : un rachat du Trésor est une séance annoncée au sens de
     `seancesAnnoncees`, donc `echeancesProches` le porte déjà, donc « Ce qui
     ferme bientôt » l'annonce en tête de cette même racine avec le temps qui
     reste. Vérifié le 25 octobre 2026 : `lieuDe` range RACHAT dans
     « adjudications », et la bande ne filtre que sur l'état et la fenêtre. */

  if (cle === "cote") {
    /* LES ÉMISSIONS EN SOUSCRIPTION SORTENT DE CET APERÇU, et il a fallu leur
       propre tuile pour s'en apercevoir. `lignesDeLaCote` les contient à bon
       droit — elles paraissent bien sur `/titres` — mais la ligne sous
       l'en-tête de cette tuile dit « à un cours », et une émission en
       souscription n'en a pas : elle a un prix fixé par l'émetteur. L'aperçu
       aurait donc démenti sa propre tuile, et montré deux fois la même ligne
       dès que « En souscription » paraît à côté. */
    return lignesDeLaCote(offers)
      .filter((o) => sectionDe(o) !== "souscription")
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

  if (cle === "souscription") {
    /* LA CLÔTURE, ET ELLE SEULE. Une fenêtre de souscription se rate, et c'est
       la seule chose qui décide ici.
       PAS LE PRIX, ET CE N'EST PAS UN OUBLI : une introduction le porte dans
       `pricePerShare`, un emprunt obligataire dans `nominal` et `pricePct`.
       Un seul champ écrit à cet endroit aurait donné un chiffre juste pour une
       famille et un zéro pour l'autre — et un zéro à côté d'un nom se lit
       comme un prix. Le prix se lit sur la page de la ligne, qui sait de quelle
       famille elle est.

       `joursEnMots` ET NON `countdown`, pour deux raisons mesurées au
       navigateur le 25 octobre 2026. La première est la place : « clôture dans
       34 j 4 h » sortait de sa tuile de 19 px, parce que cette case est celle
       d'un CHIFFRE — « 183 parts », « VL 10 820 FCFA » — et pas d'une phrase.
       La seconde est l'unité : `countdown` descend à l'heure, ce qui a un sens
       pour une séance qui ferme à midi, et aucun pour une fenêtre de
       souscription qui dure des semaines. `joursEnMots` est la façon dont la
       maison dit déjà un délai, et elle dit « demain » quand c'est demain. */
    return enSouscription(offers)
      .slice(0, APERCUS_PAR_TUILE)
      .map((o): Apercu => ({ nom: o.title, dit: joursEnMots(joursAvant(o.deadlineAt)) }));
  }

  if (cle === "fonds") {
    /* LE RENDEMENT, JAMAIS LA VALEUR LIQUIDATIVE — décision du dirigeant,
       25 octobre 2026. Une VL ne se compare pas d'un fonds à l'autre : entre
       « VL 10 820 » et « VL 12 430 », rien ne dit lequel a mieux travaillé, et
       les deux chiffres occupaient pourtant la ligne la plus lue de la tuile.
       La VL reste sur la fiche du fonds, où elle répond à une autre question :
       à quel prix on entre.
       LE CHOIX DU CHIFFRE VIT DANS `fund-perf`, pas ici : cinq endroits le
       faisaient déjà à la main, et deux ne s'accordaient pas. */
    return fondsListes(offers)
      .slice(0, APERCUS_PAR_TUILE)
      .map((f): Apercu => {
        const r = rendementDuFonds(f.fund, now);
        /* Un fonds de trois mois n'a pas de rendement, et « 0,0 % » se lirait
           comme une contre-performance : on dit ce qui manque. */
        if (!r) return { nom: f.title, dit: { key: "pas encore d'historique" } };
        return { nom: f.title, dit: { key: r.cleCourte, params: { r: `${r.pct > 0 ? "+" : ""}${fmtPct(r.pct, 1)}` } } };
      });
  }

  /* CE QU'ON TROUVE À UNE SÉANCE, ET NON QUAND ELLE FERME. « Ce qui ferme
     bientôt » porte déjà les deux prochaines clôtures en tête de cette même
     racine ; redire le délai ici serait la seconde liste qui finit par
     diverger. La composition, elle, n'est écrite nulle part : elle répond à
     « qu'est-ce que j'y trouve », qui est la question d'un client qui hésite
     à ouvrir la page. */
  if (cle === "primaire") {
    const seances = seancesAnnoncees(offers).filter((o) => isActionable(displayStatus(o)));
    const parSection = [
      ["obligations_tresor", "Obligations du Trésor"],
      ["bons_tresor", "Bons du Trésor"],
    ] as const;
    return parSection
      .map(([section, nom]) => ({ nom, n: seances.filter((o) => sectionDe(o) === section).length }))
      .filter((x) => x.n > 0)
      .slice(0, APERCUS_PAR_TUILE)
      .map(({ nom, n }): Apercu => ({ nom, dit: n === 1 ? { key: "1 séance" } : { key: "{n} séances", params: { n } } }));
  }

  /* LE SONDAGE PORTE LA SÉANCE SUR LAQUELLE ON PEUT SE DIRE PRENEUR, et une
     seule : c'est la prochaine qui décide. L'ancienne règle disait « ce n'est
     pas un catalogue mais une intention » — vrai, et c'est justement pourquoi
     la ligne nomme la séance et non le service. */
  if (cle === "sondage") {
    /* DEUX SOURCES, ET LA PREMIÈRE EST CELLE DE LA BEAC. `prochaineSeance`
       vient du communiqué, qui fait foi ; elle est pourtant vide dès que le
       flux ne répond pas — c'est le cas de tout le dépôt mémoire, où la tuile
       sortait donc nue à côté d'une tuile « Adjudications » bien remplie.
       Le repli lit les séances que la page affiche de toute façon.

       ET LA DATE EST CELLE DE LA CLÔTURE, dite comme une date et non comme un
       délai : « Ce qui ferme bientôt » compte les jours, cette ligne dit
       jusqu'à quand on peut encore se déclarer. Ce n'est pas la même phrase,
       et ce n'est pas le même geste. */
    const p = ctx.prochaineSeance;
    if (p) return [{ nom: `${p.quoi} · ${p.pays}`, dit: { key: "avant le {d}", params: { d: p.le } } }];
    const devant = seancesAnnoncees(offers)
      .filter((o) => isActionable(displayStatus(o)) && o.deadlineAt)
      .sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt))[0];
    return devant ? [{ nom: devant.title, dit: { key: "avant le {d}", params: { d: fmtDate(devant.deadlineAt) } } }] : [];
  }

  if (cle === "passage") {
    /* CE QU'ON PEUT DÉPLACER, et non où le déplacer : le passage part d'une
       part détenue. Sans part, la tuile n'a rien à annoncer — et le service
       lui-même est déjà « à activer » dans ce cas. */
    const p = ctx.partsDeFonds;
    return p ? [{ nom: p.titre, dit: { key: "{n} parts", params: { n: fmt(p.parts) } } }] : [];
  }

  /**
   * LES SERVICES DE COMPTE PORTENT LEUR PROPRE ÉTAT, et c'est la donnée la
   * plus personnelle de la page.
   *
   * Ils n'avaient rien : l'ancienne note disait « les rayons Programmer et
   * Tenir restent des bandes, et leur état vit dans leur étiquette » — c'était
   * vrai quand ils étaient des bandes, et faux depuis qu'ils sont des tuiles
   * comme les autres. Un client qui a une épargne programmée doit lire son
   * montant et son jour sans ouvrir quoi que ce soit ; c'est la règle que ce
   * module applique déjà aux fonds et à la cote.
   *
   * RIEN N'EST INVENTÉ QUAND IL N'Y A RIEN : un service jamais pris rend une
   * liste vide, et la tuile se referme sur son nom et sa ligne fixe. La phrase
   * du service, elle, dit déjà ce qui SE PASSERAIT.
   */
  if (cle === "provision" && ctx.disponible > 0) {
    return [{ nom: "Disponible pour un ordre", dit: { key: "{m} FCFA", params: { m: fmt(ctx.disponible) } } }];
  }

  if (cle === "epargne" && ctx.epargne) {
    return [
      { nom: ctx.epargne.destination, dit: { key: "{m} FCFA", params: { m: fmt(ctx.epargne.montant) } } },
      /* « le {j} » SEUL A ÉTÉ REFUSÉ par le cliquet des clefs à trous, et à
         raison : deux lettres fixes n'orientent aucun traducteur, et la même
         clef attraperait un jour autre chose. Celle-ci existait déjà. */
      { nom: "Prochain versement", dit: { key: "le {j} de chaque mois", params: { j: ctx.epargne.jour } } },
    ];
  }

  if (cle === "reinvestissement" && ctx.reinvestissement) {
    return [
      { nom: ctx.reinvestissement.destination, dit: { key: "à chaque encaissement" } },
      { nom: "En dessous, rien ne part", dit: { key: "{m} FCFA", params: { m: fmt(ctx.reinvestissement.plancher) } } },
    ];
  }

  if (cle === "garde" && ctx.lignes > 0) {
    return [{ nom: "Inscrites à votre nom", dit: ctx.lignes === 1 ? { key: "1 ligne" } : { key: "{n} lignes", params: { n: ctx.lignes } } }];
  }

  return [];
}
