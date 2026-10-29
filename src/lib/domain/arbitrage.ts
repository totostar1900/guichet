import type { Intent, Offer } from "./types";

/**
 * L'ARBITRAGE : DÉPLACER DE L'ARGENT D'UNE LIGNE À UNE AUTRE, ET NE LE
 * DÉPLACER QUE SI LE TRAJET ENTIER TIENT.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ, le 25 octobre 2026 : « Arbitrage généralise
 * l'idée de déplacer de l'argent, d'un instrument à l'autre. L'argent ne bouge
 * que si l'opération entière est faisable de bout en bout. Cela protège
 * l'investisseur sur un marché peu liquide et évite de se désinvestir d'une
 * position pour un instrument pas si sûr. » Puis, le même jour : « c'est une
 * protection qui vient avec une contrainte ».
 *
 * LA CONTRAINTE NE SE PAIE PAS AU MÊME PRIX SELON LA JAMBE, et c'est tout le
 * dessin de ce module. Trois cas, et le troisième est un refus.
 *
 *   SIMULTANÉ — un fonds vers un fonds. Les deux jambes se règlent sur une
 *   valeur liquidative, et une VL se publie. Un fonds ouvert DOIT racheter et
 *   accepte de souscrire : c'est la seule atomicité vraie dont la place
 *   dispose. Ce qu'on « manque », c'est au pire une journée de valorisation.
 *
 *   CONDITIONNEL — dès qu'une jambe passe par le carnet de la BVMAC. Il n'y a
 *   PAS de simultanéité possible : un ordre peut rester non exécuté plusieurs
 *   séances. Ce n'est donc pas « deux transactions qui confirment ensemble »,
 *   c'est UNE PAIRE ARMÉE que le desk ne déclenche que le jour où les deux
 *   jambes tiennent le même jour. L'asymétrie justifie la contrainte :
 *     · sans elle, la vente part, elle s'exécute, et au règlement la ligne
 *       d'arrivée n'est plus là ou son prix a bougé. Le client s'est
 *       désinvesti pour détenir du cash sur un marché où il ne rachètera
 *       peut-être pas ce qu'il vient de vendre. Perte non bornée, non
 *       réversible.
 *     · avec elle, la ligne d'arrivée part à un autre, la vente ne se
 *       déclenche jamais, et le client n'a rien. Position intacte, cash
 *       intact, perte = un gain espéré.
 *
 *   REFUSÉ PAR CONSTRUCTION — arrivée en adjudication ou en souscription
 *   d'émission, départ par un rachat du Trésor. L'allocation n'est pas décidée
 *   par la maison et n'est connue que des jours plus tard : une soumission peut
 *   être servie à un autre prix, en partie, ou pas du tout. Appeler cela un
 *   arbitrage promettrait exactement ce que le dirigeant veut empêcher. La page
 *   refuse, DIT POURQUOI, et propose les deux gestes séparés. Doctrine de la
 *   maison, appliquée telle quelle : un trou nommé vaut mieux qu'une promesse
 *   plausible.
 *
 * LES DEUX BORNES SONT OBLIGATOIRES, tranché par le dirigeant le 26 octobre
 * 2026. Sans elles, une paire armée est une promesse sans fin et le client n'a
 * aucun moment où on lui rend la main :
 *   · le PLANCHER, en francs, sous lequel on ne vend pas ;
 *   · la DATE, au-delà de laquelle tout s'annule, position intacte.
 * Elles valent aussi pour le cas simultané, qui est le même geste : une VL peut
 * tomber, des droits de sortie peuvent mordre, et une centralisation peut se
 * faire attendre. Un service qui change de règles selon la ligne est un service
 * que personne n'explique.
 *
 * ET UN ARBITRAGE QUI EXPIRE SANS RIEN FAIRE N'EST PAS UNE PANNE : c'est le
 * service qui a fonctionné. Tout ce que ce module nomme le dit dans ces
 * termes-là, parce que le client qui lit « échoué » conclura l'inverse.
 *
 * Module sans dépendance d'exécution : il se lit du serveur comme du
 * navigateur, et une épreuve l'atteint sans monter de base.
 */

/** Le cas d'un couple départ → arrivée. */
export type CasDArbitrage = "simultane" | "conditionnel" | "refuse";

export interface Verdict {
  cas: CasDArbitrage;
  /** Pourquoi, en une phrase, et dans les trois cas — pas seulement au refus. */
  raison: string;
}

/* ------------------------------------------------------------------ *
 * CE QU'ON PEUT QUITTER, CE QU'ON PEUT REJOINDRE
 * ------------------------------------------------------------------ */

/**
 * Les lignes qu'on peut QUITTER : celles qui se revendent à la maison ou au
 * carnet. On ne quitte pas une adjudication — on n'y détient rien tant qu'elle
 * n'a pas servi, et ce qu'elle a servi est devenu une ligne cotée ou un titre
 * conservé.
 */
const DEPARTS: Offer["kind"][] = ["FONDS", "MARCHE"];

/**
 * Les lignes qu'on peut REJOINDRE sans rien promettre de faux : un fonds, qui
 * doit souscrire, et une ligne cotée, qui s'achète au carnet. Les autres —
 * adjudications, introductions, émissions — allouent, et l'allocation n'est pas
 * la nôtre.
 */
const ARRIVEES: Offer["kind"][] = ["FONDS", "MARCHE"];

/**
 * CE QUI EMPÊCHE CET ARBITRAGE, OU RIEN.
 *
 * Elle remplace « switchBlock », qui ne connaissait que les fonds et disait
 * « un passage part d'un fonds » à qui voulait vendre une action. Les messages
 * sont lus par le client : ils nomment la ligne et la raison, jamais un code.
 */
export function arbitrageImpossible(depart: Offer, arrivee: Offer | undefined): string | null {
  if (!arrivee) return "La ligne d'arrivée est introuvable.";
  if (arrivee.id === depart.id) return "La ligne d'arrivée est la ligne de départ.";
  if (!DEPARTS.includes(depart.kind)) {
    /* Le rachat du Trésor a son propre refus : c'est une SORTIE, et le Trésor
       peut n'en retenir qu'une partie. Le confondre avec « on ne détient rien
       ici » ferait croire à une erreur de la page. */
    if (depart.kind === "RACHAT") return "Un rachat du Trésor est une sortie, pas un départ d'arbitrage : le Trésor peut n'en retenir qu'une partie, et ce qu'il retient n'est connu qu'après.";
    return "Un arbitrage part d'un fonds ou d'une ligne cotée : c'est ce qui se revend.";
  }
  if (!ARRIVEES.includes(arrivee.kind)) return "Un arbitrage n'arrive pas sur une adjudication ni sur une émission : l'allocation n'est pas décidée par la maison, et elle n'est connue que des jours plus tard.";
  if (arrivee.hidden || arrivee.status === "withdrawn") return "Cette ligne n'est plus proposée.";
  /* Un fonds lu au bulletin mais sans convention de distribution ne se souscrit
     pas : le proposer comme arrivée promettrait une opération qui n'existe pas. */
  if (arrivee.kind === "FONDS" && !arrivee.fund?.distributed) return "Ce fonds n'est pas encore distribué par la maison.";
  return null;
}

/**
 * LE CAS, UNE FOIS L'ARBITRAGE POSSIBLE — et le refus porte sa raison.
 *
 * Le verdict sort dans les trois cas, et non « null quand tout va bien » : la
 * page doit écrire au client ce qu'il achète comme contrainte AVANT qu'il
 * signe, y compris quand tout va bien. C'est la différence entre un coût
 * visible et un coût découvert.
 */
export function casDArbitrage(depart: Offer, arrivee: Offer | undefined): Verdict {
  const bad = arbitrageImpossible(depart, arrivee);
  if (bad || !arrivee) return { cas: "refuse", raison: bad ?? "La ligne d'arrivée est introuvable." };
  if (depart.kind === "FONDS" && arrivee.kind === "FONDS")
    return { cas: "simultane", raison: "Les deux jambes se règlent sur une valeur liquidative : le rachat et la souscription se signent ensemble, et les deux VL retenues vous sont dites avant la signature." };
  return { cas: "conditionnel", raison: "Une des deux jambes passe par le carnet de la BVMAC, où un ordre peut rester plusieurs séances sans trouver preneur. La paire est donc ARMÉE : rien ne part tant que les deux jambes ne tiennent pas le même jour." };
}

/** Les lignes qu'on peut rejoindre depuis celle-ci, nommées. */
export function arriveesPossibles(depart: Offer, offers: Offer[]): Offer[] {
  return offers.filter((o) => arbitrageImpossible(depart, o) == null).sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Le produit d'une vente, tel qu'il repart en achat.
 *
 * `positionFor` compte ce que le client reçoit en négatif, parce qu'il compte du
 * point de vue de ce qu'il faut régler. L'arbitrage a besoin du même chiffre dans
 * l'autre sens, et arrondi au franc : une souscription se libelle en francs
 * entiers, et la fraction perdue vaut mieux qu'un montant que la banque ne sait
 * pas virer.
 */
export function produitDeLaVente(total: number): number {
  return Math.max(0, Math.floor(-total));
}

/**
 * COMBIEN DE TITRES UN PRODUIT DE VENTE ACHÈTE, SUR UNE LIGNE COTÉE.
 *
 * UNE JAMBE D'ARRIVÉE NE SE LIBELLE PAS TOUJOURS EN FRANCS. Une souscription de
 * fonds, si : le montant part, et la VL décide des parts. Un achat au carnet,
 * non : « amount » y est une QUANTITÉ, et c'est le prix qui décide du
 * décaissement. L'arbitrage arrive avec des francs et doit donc convertir —
 * sans quoi le desk inscrirait « 4 200 000 » dans une case qui compte des
 * titres, et passerait un ordre quatre millions de fois trop gros.
 *
 * LE COÛT EST LINÉAIRE EN n — principal, coupon couru et commission montent
 * tous les trois par titre — donc une division suffit. La boucle qui suit ne
 * sert qu'au jour où il cesserait de l'être : elle descend plutôt que de
 * dépasser, parce qu'un titre de trop est un ordre que la provision ne couvre
 * pas.
 *
 * `coutDe` est passé en argument plutôt qu'importé : ce module se lit du
 * navigateur, et le moteur de calcul tire la moitié du domaine derrière lui.
 */
export function quantiteAchetable(produit: number, coutDe: (n: number) => number): number {
  const unitaire = coutDe(1);
  if (!(unitaire > 0) || produit < unitaire) return 0;
  let n = Math.floor(produit / unitaire);
  while (n > 0 && coutDe(n) > produit) n -= 1;
  return n;
}

/* ------------------------------------------------------------------ *
 * LES DEUX BORNES, OBLIGATOIRES
 * ------------------------------------------------------------------ */

export interface Bornes {
  /** En francs : sous ce produit de vente, on ne vend pas. */
  plancher?: number | null;
  /** Jour (AAAA-MM-JJ) au-delà duquel tout s'annule, position intacte. */
  dateLimite?: string | null;
}

/**
 * CE QUI MANQUE AUX BORNES, UNE PHRASE PAR MANQUE.
 *
 * Les deux sont obligatoires dès qu'une arrivée est choisie — décision du
 * dirigeant. Elles sont rendues ici plutôt que dans le formulaire parce que le
 * serveur doit les refuser aussi : un formulaire est une commodité, pas une
 * garantie, et l'ordre arrive par une action qu'on peut appeler sans lui.
 *
 * LA FENÊTRE EST BORNÉE DES DEUX CÔTÉS. Une date d'hier arme un arbitrage déjà
 * mort, que rien ne déclenchera et que le client croira vivant. Et une date à
 * trois ans n'est plus une borne : c'est l'absence de borne écrite en chiffres,
 * exactement ce que l'obligation ferme. Quatre-vingt-dix jours, parce que
 * c'est l'ordre de grandeur d'une centralisation mensuelle répétée trois fois,
 * et qu'au-delà le client ferait mieux de reposer son geste au vu du marché.
 */
export const FENETRE_MAX_JOURS = 90;

export function bornesManquantes(b: Bornes, aujourdHui: string): string[] {
  const dits: string[] = [];
  if (b.plancher == null || !(b.plancher > 0)) dits.push("Dites le plancher : le montant sous lequel vous ne voulez pas que la vente parte.");
  if (!b.dateLimite) dits.push("Dites la date limite : au-delà, l'arbitrage s'annule et votre position reste telle quelle.");
  else if (b.dateLimite <= aujourdHui) dits.push("La date limite est passée : un arbitrage armé sur une date échue ne partira jamais.");
  else if (joursEntre(aujourdHui, b.dateLimite) > FENETRE_MAX_JOURS) dits.push(`La date limite ne va pas au-delà de ${FENETRE_MAX_JOURS} jours : au-delà, ce n'est plus une borne.`);
  return dits;
}

/**
 * CE QUE LE PLANCHER DIT, COMPARÉ À CE QUE LA VENTE RAPPORTERAIT AUJOURD'HUI.
 *
 * Un plancher posé au-dessus du produit attendu arme un arbitrage MORT-NÉ :
 * « peutPartir » le refusera chaque soir, en silence, jusqu'à l'expiration —
 * et le client lira alors la phrase de la maison, « ce n'est pas une panne,
 * c'est la protection qui a joué ». Elle sera vraie, et elle cachera que rien
 * n'avait jamais eu la moindre chance de partir.
 *
 * ET POURTANT ON NE REFUSE RIEN. Le produit n'est qu'une ESTIMATION : une VL
 * bouge, un cours encore plus. « Je ne pars qu'au-dessus de ce que ça vaut
 * aujourd'hui » est un ordre parfaitement sensé — c'est même à cela qu'un
 * plancher sert. Le défaut n'était pas la permission, c'était le silence.
 * Cette fonction dit donc la relation ; elle ne ferme pas la porte.
 *
 * « sans_objet » tant qu'il n'y a rien à comparer : sans montant saisi, le
 * produit vaut zéro, et annoncer « au-dessus » serait un verdict sur une
 * question que le client n'a pas encore posée.
 */
export type PlancherFaceAuProduit = "sans_objet" | "tient" | "au_dessus";

export function plancherFaceAuProduit(plancher: number | null | undefined, produitEstime: number): PlancherFaceAuProduit {
  if (plancher == null || !(plancher > 0) || !(produitEstime > 0)) return "sans_objet";
  return plancher > produitEstime ? "au_dessus" : "tient";
}

/** Jours pleins entre deux jours ISO, sans fuseau : les deux sont des dates, pas des instants. */
export function joursEntre(du: string, au: string): number {
  return Math.round((Date.parse(`${au.slice(0, 10)}T00:00:00Z`) - Date.parse(`${du.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
}

/* ------------------------------------------------------------------ *
 * L'ÉTAT D'UN ARBITRAGE, DIT AU CLIENT
 * ------------------------------------------------------------------ */

export type EtatDArbitrage = "arme" | "parti" | "expire" | "sans_suite";

export interface EtatVu {
  etat: EtatDArbitrage;
  /** Le mot de l'état, pour une pastille. */
  mot: string;
  /** La phrase entière, pour la ligne sous la pastille. */
  phrase: string;
}

/**
 * CE QU'UN ARBITRAGE EST EN TRAIN DE FAIRE, EN FRANÇAIS.
 *
 * « Armé, rien n'a bougé » est la phrase qui manquait : un client dont l'ordre
 * ne bouge pas conclut que la maison l'a oublié, et il rappelle. Et un
 * arbitrage expiré doit se lire comme un succès — c'est la protection qui a
 * joué — sinon le client lit « ça n'a pas marché » et n'en reposera jamais.
 */
export function etatDArbitrage(i: Pick<Intent, "state" | "switchToOfferId" | "switchBy">, aujourdHui: string): EtatVu | null {
  if (!i.switchToOfferId) return null;
  if (i.state === "servie" || i.state === "reglee") return { etat: "parti", mot: "Parti", phrase: "Les deux jambes sont parties : le produit de la vente a rejoint la ligne d'arrivée." };
  if (i.state === "annulee" || i.state === "non_servie") {
    const expire = Boolean(i.switchBy && i.switchBy <= aujourdHui);
    return expire
      ? { etat: "expire", mot: "Expiré", phrase: "La date limite est passée sans que les deux jambes tiennent le même jour. Rien n'a bougé : votre position est intacte, et votre argent aussi. C'est la protection qui a joué." }
      : { etat: "sans_suite", mot: "Sans suite", phrase: "Cet arbitrage a été clos avant son terme. Rien n'a bougé : votre position est intacte." };
  }
  return { etat: "arme", mot: "Armé", phrase: "Rien n'a bougé. La vente ne partira que le jour où la ligne d'arrivée tient au même moment, et au-dessus de votre plancher." };
}

/**
 * CE QUI PEUT PARTIR AUJOURD'HUI, ET SINON POURQUOI PAS.
 *
 * Le desk l'appelle avant de déclencher la paire, et le robot du soir avant de
 * laisser passer un jour de plus. Les deux posent la même question, donc elle
 * se pose ici une fois.
 */
export function peutPartir(b: Bornes, produit: number, aujourdHui: string): { ok: boolean; raison?: string } {
  if (b.dateLimite && b.dateLimite < aujourdHui) return { ok: false, raison: "la date limite est passée" };
  if (b.plancher != null && produit < b.plancher) return { ok: false, raison: `le produit de la vente (${produit}) est sous le plancher signé (${b.plancher})` };
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * LES TROIS GESTES, CÔTE À CÔTE
 * ------------------------------------------------------------------ */

/**
 * LA PROTECTION EST UN CHOIX PAR OPÉRATION, PAS UN RÉGIME.
 *
 * Deux des trois gestes existaient déjà et n'étaient pas nommés : vendre seul,
 * acheter seul. Un client qui prend la voie non protégée doit SAVOIR qu'il la
 * prend — c'est la seule façon pour que la voie protégée veuille dire quelque
 * chose. Ce que chacun garantit, et ce qu'il coûte, se lit avant de signer.
 */
export const GESTES: { cle: "arbitrage" | "vendre" | "acheter"; nom: string; garanti: string; risque: string }[] = [
  { cle: "arbitrage", nom: "Arbitrage", garanti: "Vous ne vous désinvestissez que si l'arrivée est tenue.", risque: "L'opération peut ne jamais partir." },
  { cle: "vendre", nom: "Vendre d'abord", garanti: "La vente part tout de suite.", risque: "Vous détenez du cash sans garantie de rachat." },
  { cle: "acheter", nom: "Acheter seulement", garanti: "L'achat part tout de suite.", risque: "Il faut la provision." },
];
