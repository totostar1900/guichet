import type { Dit } from "./services";
import type { ContexteClient } from "./services";
import type { Offer } from "./types";
import { enSouscription, fondsListes, lignesDeLaCote, seancesAnnoncees } from "./listes";
import { sectionDe, type Section } from "./sections";
import { joursAvant, joursEnMots } from "./echeances";
import { rendementDuFonds } from "./fund-perf";
import { displayStatus, familyShort, isActionable, offerFamily, tauxActuariel } from "./status";
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
  /**
   * CETTE LIGNE EST UNE DÉFINITION, ET NON UN CHIFFRE.
   *
   * La case de droite est celle d'un nombre : gras, aligné à droite, au degré
   * du corps de lecture. Les lignes de repli des tuiles de séance y mettaient
   * « un coupon, une durée » — vu à l'écran le 25 octobre 2026, ça criait
   * comme un montant et se lisait sur deux hauteurs. Le contenu est bon, sa
   * typographie ne l'était pas : ce drapeau le rend au poids d'une phrase.
   */
  prose?: true;
}

/** Deux lignes sous une tuile ; au-delà, c'est une liste. */
export const APERCUS_PAR_TUILE = 2;

/**
 * LE NOM D'UNE LIGNE DANS UNE COLONNE DE 188 PIXELS.
 *
 * Le titre complet d'une ligne cotée fait quarante-six caractères — « OTA
 * Cameroun 6,25 % · 8 juil. 2031 : secondaire » — et passait donc sur deux
 * hauteurs, puis le chiffre sur une troisième. Le dirigeant a demandé que
 * chaque aperçu tienne sur UNE ligne.
 *
 * CE QUI PART EST LE QUALIFICATIF, et lui seul : « : secondaire », « : action
 * cotée ». Il dit le LIEU — la cote — et le lieu est déjà le nom de la tuile.
 * Ce qui reste est ce qui distingue une ligne d'une autre : l'émetteur, le
 * coupon, l'échéance. Aucune troncature, aucun point de suspension : la règle
 * de la maison depuis « FCP Trés… » est qu'un nom coupé n'apprend rien.
 */
export const nomDeLigne = (o: Pick<Offer, "title">): string => o.title.split(" : ")[0];

/**
 * LE NOM D'UN FONDS DANS UNE COLONNE DE 156 PIXELS.
 *
 * « FCP Harvest Actions CEMAC » fait cent cinquante pixels à lui seul : avec
 * son chiffre à côté, la ligne passait sur deux hauteurs quoi qu'on fasse.
 * Le dirigeant a demandé une ligne par aperçu, « quitte à abréger ».
 *
 * CE QUI PART EST CE QUI NE DISTINGUE RIEN. « FCP » et « SICAV » disent la
 * forme juridique, que la tuile annonce déjà — elle s'appelle « Fonds » ;
 * « CEMAC » et « zone CEMAC » disent la zone, qui est la seule qu'on
 * distribue ; « parts A » dit une catégorie de parts qui n'apparaît qu'au
 * moment de souscrire. Reste le nom propre, qui est ce qu'on cherche.
 *
 * AUCUNE TRONCATURE, ET C'EST LA RÈGLE DE LA MAISON depuis « FCP Trés… » :
 * deux noms coupés au même endroit deviennent le même nom, et un aperçu qui
 * ne distingue plus rien n'apprend rien. Ici on retire des mots entiers,
 * connus, et le nom complet reste sur la fiche du fonds.
 *
 * CE QU'ON NE RETIRE PAS, ET C'EST LA LIMITE DE L'ABRÉGÉ : la CATÉGORIE.
 * « Actions », « Obligataire », « Trésorerie » disent le risque, et une
 * performance sans sa catégorie se compare à tort — seize pour cent sur un
 * fonds d'actions et sept sur un fonds obligataire ne se lisent pas de la
 * même façon. Mesuré le 25 octobre 2026 : garder la catégorie coûte sept
 * pixels de trop dans une colonne de 156, donc une seconde hauteur pour les
 * noms les plus longs. C'est le bon échange : une ligne de plus contre un
 * chiffre qu'on ne peut pas mal lire.
 */
export function nomDeFonds(titre: string): string {
  const sansForme = titre.replace(/^(FCP|SICAV|OPCVM)\s+/i, "");
  const sansZone = sansForme.replace(/\s+(de la\s+)?(zone\s+)?CEMAC\b/i, "");
  return sansZone.replace(/\s*[-·]?\s*parts?\s+[A-Z]\b/i, "").trim() || titre;
}

/**
 * CE QUE LES DEUX TUILES DES SÉANCES DISENT QUAND IL N'Y EN A AUCUNE.
 *
 * ENTRE DEUX SÉANCES, ELLES SORTAIENT NUES — un en-tête, une ligne, et un
 * grand vide à côté de tuiles pleines. Le dirigeant l'a demandé le soir du
 * 25 octobre 2026 : « s'il n'y en a pas, mettre un peu de contenu ».
 *
 * CE N'EST PAS UNE EXCUSE, ET C'EST TOUTE LA DIFFÉRENCE. La règle de la
 * maison — « un aperçu vide ne se remplace pas par une phrase d'excuse » —
 * visait « aucune séance en ce moment », qui occupe la place sans rien
 * apprendre. Ces quatre lignes-là apprennent quelque chose, et à celui
 * précisément qui en a besoin : le client qui ouvre la page un jour où il n'y
 * a rien est celui qui ne sait pas encore ce qu'est une OTA.
 *
 * RIEN N'EST INVENTÉ ICI. Les deux premières reprennent, en plus court, les
 * notes de section du registre — « Adjugées à la BEAC, avec un coupon et une
 * durée », « Précomptés : vous payez moins que le nominal et recevez le
 * nominal à l'échéance ». Les deux autres reprennent les étapes du sondage.
 * Une définition écrite deux fois finit par se contredire ; celles-ci sont
 * des abrégés de la même source, et les épreuves le vérifient.
 */
const SANS_SEANCE: Apercu[] = [
  { nom: "Obligations du Trésor", dit: { key: "un coupon, une durée" }, prose: true },
  { nom: "Bons du Trésor", dit: { key: "précomptés, sous un an" }, prose: true },
];

/**
 * LE SONDAGE DIT CE QU'IL PERMET, et non ce qu'il n'est pas.
 *
 * Il disait « ce n'est pas un ordre » : vrai, et formulé à l'envers. Une
 * tuile qu'on lit un jour creux est une invitation, pas un avertissement ;
 * « sans engagement » dit la même chose et donne envie d'entrer. Demandé le
 * soir du 25 octobre 2026, et la règle vaut pour les quatre lignes.
 */
const ARBITRAGE: Apercu[] = [
  { nom: "Rachat et souscription", dit: { key: "signés ensemble" }, prose: true },
  { nom: "Les deux valeurs", dit: { key: "dites avant de signer" }, prose: true },
];

const SANS_SONDAGE: Apercu[] = [
  { nom: "Dites votre taux", dit: { key: "sans engagement" }, prose: true },
  { nom: "Avant la clôture", dit: { key: "le desk vous rappelle" }, prose: true },
];

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
        /**
         * LE TAUX ACTUARIEL, ET RIEN QUI LUI RESSEMBLE — 25 octobre 2026.
         *
         * Cette ligne disait « {r} de rendement » pour les deux familles. Or
         * `headlineYield` ne rend pas la même chose des deux côtés : pour une
         * obligation, le taux de rendement interne calculé sur les flux
         * réels ; pour une action, le dividende rapporté au cours. Les deux
         * paraissaient sous le même mot, à 2,8 % et 6,9 %, et rien ne disait
         * que les comparer n'a aucun sens. `tauxActuariel` refuse désormais
         * de rendre un taux là où il n'y en a pas, et l'action montre ce
         * qu'elle a vraiment : son cours.
         *
         * DEUX DÉCIMALES, ET LE MOT EN MOINS. Un taux actuariel se lit à la
         * décimale près — c'est sur lui qu'on arbitre entre deux lignes — et
         * « de rendement » coûtait la moitié de la largeur de la colonne,
         * ce qui faisait passer la ligne sur deux hauteurs. La ligne fixe de
         * la tuile dit déjà « à un cours ».
         */
        const taux = tauxActuariel(o);
        if (taux != null) return { nom: nomDeLigne(o), dit: { key: "{r} / an", params: { r: fmtPct(taux, 2) } } };
        return { nom: nomDeLigne(o), dit: { key: "{m} FCFA", params: { m: fmt(Math.round(o.lastPrice ?? 0)) } } };
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
    /* LES DEUX MEILLEURS, ET NON LES DEUX PREMIERS DU CATALOGUE — demande du
       dirigeant le soir du 25 octobre 2026. Deux lignes prises dans l'ordre
       du dépôt ne disent rien ; les deux meilleures performances disent où
       regarder. Le classement se fait sur le MÊME chiffre que celui qu'on
       affiche, sans quoi la tuile montrerait un ordre qu'elle ne justifie
       pas : un fonds à 7 % sur douze mois passerait derrière un fonds à 9 %
       annualisé depuis 2019, et le lecteur verrait 7 au-dessus de 9.
       Un fonds sans historique ferme la marche : il n'a pas de rang. */
    return fondsListes(offers)
      .map((f) => ({ f, r: rendementDuFonds(f.fund, now) }))
      .sort((a, b) => (b.r?.pct ?? -Infinity) - (a.r?.pct ?? -Infinity))
      .slice(0, APERCUS_PAR_TUILE)
      .map(({ f, r }): Apercu => {
        /* Un fonds de trois mois n'a pas de rendement, et « 0,0 % » se lirait
           comme une contre-performance : on dit ce qui manque, et on le dit
           au poids d'une phrase, puisque ce n'en est pas un chiffre. */
        if (!r) return { nom: nomDeFonds(f.title), dit: { key: "première année en cours" }, prose: true };
        return { nom: nomDeFonds(f.title), dit: { key: r.cleCourte, params: { r: `${r.pct > 0 ? "+" : ""}${fmtPct(r.pct, 1)}` } } };
      });
  }

  /* CE QU'ON TROUVE À UNE SÉANCE, ET NON QUAND ELLE FERME. « Ce qui ferme
     bientôt » porte déjà les deux prochaines clôtures en tête de cette même
     racine ; redire le délai ici serait la seconde liste qui finit par
     diverger. La composition, elle, n'est écrite nulle part : elle répond à
     « qu'est-ce que j'y trouve », qui est la question d'un client qui hésite
     à ouvrir la page. */
  if (cle === "primaire") {
    /* UNE LIGNE PAR FAMILLE, AVEC SON TAUX — demande du dirigeant, le soir du
       25 octobre 2026. La composition (« 1 séance · 2 séances ») disait
       combien il y en a ; elle ne disait pas ce que ça rapporte, qui est la
       seule chose sur laquelle on décide d'ouvrir la page. Une OTA et une
       BTA : les deux familles d'une séance, chacune son taux actuariel. */
    const ouvertes = seancesAnnoncees(offers).filter((o) => isActionable(displayStatus(o)));
    const premiere = (section: Section) =>
      ouvertes
        .filter((o) => sectionDe(o) === section && tauxActuariel(o) != null)
        .sort((a, b) => (a.deadlineAt ?? "").localeCompare(b.deadlineAt ?? ""))[0];
    const lignes = (["obligations_tresor", "bons_tresor"] as const)
      .map(premiere)
      .filter((o): o is Offer => Boolean(o))
      /* LE NOM EST COMPACT, et c'est la place qui l'impose : « OTA 6,25 % ·
         5 ans · Gabon » et son taux font 181 px dans une colonne de 156,
         donc deux hauteurs. La famille et le pays suffisent à choisir — le
         coupon et le terme sont sur la page qui s'ouvre juste après.
         « country » ET NON « countryName » : le second porte la forme
         officielle — « République du Tchad » — qui reprend à elle seule
         toute la largeur gagnée. Le premier est le nom d'usage, celui
         que le calendrier et la bande emploient déjà. */
      .map((o): Apercu => ({ nom: `${familyShort(offerFamily(o))} · ${o.country ?? o.countryName ?? o.issuer}`, dit: { key: "{r} / an", params: { r: fmtPct(tauxActuariel(o)!, 2) } } }));
    return lignes.length ? lignes : SANS_SEANCE;
  }

  /* LE SONDAGE PORTE LA SÉANCE SUR LAQUELLE ON PEUT SE DIRE PRENEUR, et une
     seule : c'est la prochaine qui décide. L'ancienne règle disait « ce n'est
     pas un catalogue mais une intention » — vrai, et c'est justement pourquoi
     la ligne nomme la séance et non le service. */
  if (cle === "sondage") {
    /* LA MÊME DÉCOUPE, AVEC L'ÉCHÉANCE EN PLUS. On se dit preneur sur une
       DURÉE autant que sur un taux : un bon à treize semaines et une
       obligation à cinq ans ne se déclarent pas pour les mêmes raisons. Le
       nom porte donc la famille et le terme, la valeur le taux. */
    const ouvertes = seancesAnnoncees(offers).filter((o) => isActionable(displayStatus(o)));
    const premiere = (section: Section) =>
      ouvertes
        .filter((o) => sectionDe(o) === section && tauxActuariel(o) != null && o.maturityOn)
        .sort((a, b) => (a.deadlineAt ?? "").localeCompare(b.deadlineAt ?? ""))[0];
    const lignes = (["obligations_tresor", "bons_tresor"] as const)
      .map(premiere)
      .filter((o): o is Offer => Boolean(o))
      .map((o): Apercu => ({
        nom: `${familyShort(offerFamily(o))} · ${fmtDate(o.maturityOn!, false)}`,
        dit: { key: "{r} / an", params: { r: fmtPct(tauxActuariel(o)!, 2) } },
      }));
    if (lignes.length) return lignes;
    return SANS_SONDAGE;
  }

  if (cle === "passage") {
    /**
     * L'ARBITRAGE EXPLIQUE CE QU'IL FAIT, ET NE COMPTE PAS DES PARTS.
     *
     * Il affichait « Trésorerie Corridor · 183 parts », c'est-à-dire ce qu'on
     * peut déplacer. Décision du dirigeant le 26 octobre 2026 : remplacer par
     * du contenu d'explication. Et c'est juste, pour une raison qui tient au
     * service : le nombre de parts ne décide de RIEN ici. Un client qui
     * détient une ligne sait qu'il la détient ; ce qu'il ignore, c'est ce que
     * l'arbitrage lui épargne — sortir d'un fonds sans savoir à quel prix il
     * rentrera dans l'autre.
     *
     * Ces deux lignes disent donc la mécanique, qui est la seule chose propre
     * à ce service : les deux jambes signées ensemble, et les deux valeurs
     * liquidatives dites avant la signature. Elles reprennent, en plus court,
     * les étapes que la fiche du service écrit déjà.
     */
    return ARBITRAGE;
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

  return [];
}
