"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { poserLeBrouillon } from "@/lib/brouillon";
import type { IntentResult } from "@/app/offres/[id]/actions";
import { submitIntent } from "@/app/offres/[id]/actions";
import type { ChannelStatus } from "@/lib/domain/types";
import { normalizePhone, fmtPct } from "@/lib/format";
import { ProofBlock } from "@/components/ProofBlock";
import { TrustNudge } from "@/components/TrustNudge";
import { equivalence, estimate, marketEstimate, montantPourUnites, produitAttendu, redemptionEstimate, surveyTrio } from "@/lib/domain/estimate";
import { orderChecks, resteApres } from "@/lib/domain/checks";
import { counterUnit } from "@/lib/domain/counter";
import { sensDeLaCondition } from "@/lib/domain/survey";
import { FENETRE_MAX_JOURS, plancherFaceAuProduit } from "@/lib/domain/arbitrage";
import type { Repere } from "@/lib/market/repere";
import { marketBondCalc } from "@/lib/domain/status";
import { OrderFlows } from "@/components/OrderFlows";
import { Info } from "./Info";
import { Select } from "@/components/ui/Select";
import { INTENT_LABEL, sensDeLIntention } from "@/lib/domain/intent";
import type { IntentType, Offer } from "@/lib/domain/types";
import { fmt, parseAmount, parseUnits } from "@/lib/format";
import styles from "./IntentForm.module.css";
import { useDates, useLang, useT } from "@/i18n/client";
import { amountFlag } from "@/data/profile";
import { Amount } from "./Amount";
import { RefTotals } from "./RefTotals";
import { orderPlan, orderTotals } from "./OrderFlows";
import { groupDigits, groupedInput } from "@/lib/ui/grouped";

const BY: Record<string, string> = { WhatsApp: "sur WhatsApp", Appel: "par téléphone", "E-mail": "par e-mail" };

/**
 * Le prix d’un titre, en francs.
 *
 * Une obligation se cote en pourcentage du nominal : 101 % sur un nominal de
 * 10 000 vaut 10 100 francs le titre. Une action se cote en francs, et le cours
 * est le prix. Le prix limite l’emporte quand il est posé : c’est celui que le
 * client dit accepter, donc celui qui borne sa dépense.
 */
function unitPrice(o: Offer, type: IntentType, limit: number | null): number {
  const ref = limit ?? (type === "vente" ? (o.bid ?? o.lastPrice ?? 0) : (o.ask ?? o.lastPrice ?? 0));
  return o.instrument === "obligation" ? (o.nominal * ref) / 100 : ref;
}

/**
 * Combien de titres une somme achète, arrondi à la quotité par le bas.
 *
 * Par le bas, toujours : un ordre qui dépasserait la somme annoncée serait une
 * mauvaise surprise à l’appel de fonds, et le carnet ne prend de toute façon que
 * des titres entiers, par multiples de la quotité.
 */
function qtyForCash(o: Offer, type: IntentType, cash: number, limit: number | null): number {
  const p = unitPrice(o, type, limit);
  if (!cash || p <= 0) return 0;
  const lot = o.lotSize && o.lotSize > 0 ? o.lotSize : 1;
  return Math.floor(cash / p / lot) * lot;
}

/** Une ligne que le client peut viser depuis celle-ci : la page les a déjà filtrées. */
export interface SwitchTarget {
  id: string;
  title: string;
  /** Un fonds : la paire est simultanée. Sinon elle passe par le carnet, et elle est armée. */
  fonds: boolean;
}

/* Les durées proposées pour une fenêtre d'arbitrage : des durées, comme on les
   pense, bornées par le domaine. */
const DUREES = [15, 30, 45, 60, 90].filter((j) => j <= FENETRE_MAX_JOURS);

export function IntentForm({ offer, types, initialType, initialAmount, held = 0, switchTargets = [], fenetre, repere, past, signedIn, tier = 0, phone = "", phoneProven = false, email = "", name = "", channels, bridge, profileFlag, investable, monthly }: { offer: Offer; types: IntentType[]; initialType: IntentType; initialAmount?: number; held?: number; switchTargets?: SwitchTarget[]; /** Les deux bouts de la fenêtre d'un arbitrage, calculés au serveur : voir « intent-context ». */ fenetre?: { min: string; max: string }; /** Ce qu'une séance comparable a réellement servi, dans l'unité du champ : voir « market/repere ». */ repere?: Repere; past: boolean; signedIn: boolean; tier?: number; phone?: string; /** le numéro de la session a été confirmé par un code à la connexion */ phoneProven?: boolean; email?: string; name?: string; channels?: ChannelStatus; bridge?: { phone: string; token: string }; profileFlag?: string; investable?: number; /** Le versement programmé, quand la ligne en accepte un : l'autre branche du choix. */ monthly?: ReactNode }) {
  // The profile name is "Prénom Nom" when the client typed it, or an e-mail stub otherwise.
  const nameParts = name.trim().split(/\s+/).filter(Boolean);
  const [firstName, lastName] = nameParts.length >= 2 ? [nameParts[0], nameParts.slice(1).join(" ")] : ["", ""];
  const [state, action, pending] = useActionState<IntentResult | null, FormData>(submitIntent, null);
  const { fmtDate } = useDates();
  const t = useT();
  const lang = useLang();
  const fmtUnits = (v: number) => (offer.kind === "FONDS" ? v.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : fmt(v));
  const [amount, setAmount] = useState(initialAmount ? fmtUnits(initialAmount) : "");
  const [type, setType] = useState<IntentType>(initialType);
  const [limit, setLimit] = useState("");
  // La ligne d arrivee d un arbitrage : il faut un etat, la liste de la maison
  // etant controlee, la native ne l etait pas.
  const [switchTo, setSwitchTo] = useState("");
  /* LES DEUX BORNES, OBLIGATOIRES dès qu'une arrivée est choisie — tranché par
     le dirigeant le 26 octobre 2026. Elles ne paraissent qu'avec l'arrivée :
     posées d'avance, elles demanderaient deux chiffres à qui ne fait qu'un
     ordre ordinaire, c'est-à-dire à presque tout le monde. */
  const [floor, setFloor] = useState("");
  const [by, setBy] = useState("");
  /**
   * ON ACHÈTE AVEC UNE SOMME, ON VEND CE QU'ON DÉTIENT.
   *
   * L'ordre part toujours en titres : c'est ce que le carnet prend. Mais le
   * formulaire s'OUVRAIT là-dessus, et un client qui veut placer cinq cent
   * mille francs devait d'abord les traduire en titres, au cours, de tête,
   * avant de pouvoir dire quoi que ce soit. Il pense en francs, parce que
   * c'est ce qu'il a sur son compte.
   *
   * Vendre est l'inverse exact : on dispose d'un nombre de titres et non d'une
   * somme, et « tout vendre » n'a de sens qu'en titres. Le choix ne se pose
   * donc que pour un achat, et il s'ouvre en francs.
   */
  const [unit, setUnit] = useState<"titres" | "francs">("francs");
  /**
   * LA SOMME D'UN ORDRE DE BOURSE S'AMORÇAIT DEPUIS NULLE PART.
   *
   * Relevé le 28 octobre 2026 en reprenant un ordre commencé : l'adresse
   * portait « qty=1 086 000 », la page le lisait, le formulaire le posait
   * dans « amount »… et l'écran restait vide. Sur une ligne cotée en achat,
   * le champ qui commande tout est « cash » — une somme — et « amount » n'y
   * sert qu'en mode titres. Personne ne l'amorçait, donc AUCUN lien portant
   * un montant ne pré-remplissait une ligne cotée : ni la reprise, ni une
   * carte, ni un lien du desk.
   */
  const [cash, setCash] = useState(offer.kind === "MARCHE" && !["vente", "rachat", "cession"].includes(initialType) && initialAmount ? groupDigits(String(Math.round(initialAmount))) : "");
  const [channel, setChannel] = useState<"WhatsApp" | "Appel" | "E-mail">("WhatsApp");
  // L’e-mail du compte : celui de la session quand le fournisseur le donne, sinon
  // celui que le profil a prouvé. On lisait le premier seulement ; quand il
  // manquait, le formulaire acceptait n’importe quelle adresse bien formée et la
  // marquait « prouvée », alors qu’un compte connecté se parle à son adresse.
  const accountEmail = (email || (channels?.emailVerifiedAt && channels.email) || "").trim().toLowerCase();
  const [who, setWho] = useState({ firstName, lastName, phone: bridge?.phone || phone || channels?.phone || "", email: email || channels?.email || "" });
  // The proofs: the phone as proven on the profile (or just now), the e-mail as the account's (or just proven by a guest).
  // Trois façons de connaître un numéro prouvé, et la connexion en est une : le
  // lien WhatsApp du desk, le code que le profil a déjà validé, ou la connexion
  // par téléphone elle-même.
  const [provenPhone, setProvenPhone] = useState<string | null>(bridge?.phone ?? (channels?.phoneVerifiedAt && channels.phone ? channels.phone : null) ?? (phoneProven && phone ? normalizePhone(phone) : null));
  const [provenEmail, setProvenEmail] = useState<string | null>(signedIn && accountEmail ? accountEmail : null);
  // No WhatsApp sender on this host: the desk confirms by phone, the button opens, the intention is marked unproven.
  const [phonePending, setPhonePending] = useState(false);
  const phoneOk = Boolean(provenPhone && normalizePhone(who.phone) === provenPhone);
  // Une session dont on ne connaît aucune adresse (le serveur de développement) ne
  // prouve rien : là, une adresse bien formée passe. Partout ailleurs, l'adresse du
  // compte est la seule.
  const emailOk = signedIn && !accountEmail ? who.email.includes("@") : Boolean(provenEmail && who.email.trim().toLowerCase() === provenEmail);
  // The intention leaves the client's profile: they say so before it goes, and the desk reads it.
  const [profileOk, setProfileOk] = useState(false);
  const [amountOk, setAmountOk] = useState(false);
  // On a phone the form is read in three steps (montant → coordonnées → récapitulatif); desktop shows everything.
  const [step, setStep] = useState(1);
  /**
   * UNE FOIS, OU CHAQUE MOIS : la décision avant les champs.
   *
   * Les deux demandes ne se remplissent pas pareil et ne veulent pas dire la
   * même chose : l'une place une somme maintenant, l'autre donne un ordre qui
   * se répète. Elles vivaient pourtant l'une sous l'autre, et le bloc mensuel,
   * frère du formulaire dans la page, restait visible pendant les coordonnées
   * et le récapitulatif : on remplissait un montant unique en lisant une offre
   * qui en proposait un autre.
   *
   * Le choix ne se pose que sur téléphone, comme les étapes, et pour la même
   * raison : sur grand écran tout tient d'un bloc, les deux demandes se voient
   * ensemble, et rien ne se cache. La feuille de style décide donc seule, à
   * partir de `data-mode` ; ici on tient l'état et rien d'autre.
   *
   * « » tant que rien n'est choisi, et « une » d'emblée quand la ligne n'accepte
   * pas de versement programmé : il n'y a alors pas de choix à poser.
   */
  const [mode, setMode] = useState<"" | "une" | "mois">(monthly ? "" : "une");
  const formRef = useRef<HTMLFormElement>(null);
  /**
   * CE QUI MANQUE POUR AVANCER, DIT SANS BOUGER L'ÉCRAN.
   *
   * Mesuré sur la fiche à 1280 px avant correction : « Continuer » avec un
   * montant vide jetait la page de 650 à 158 — QUATRE CENT QUATRE-VINGT-DOUZE
   * PIXELS vers le haut, sous le pouce de quelqu'un qui venait de viser un
   * bouton. Ce n'était pas un caprice : le refus mettait le focus sur le champ
   * fautif, et c'est le navigateur qui saute pour le montrer. « reportValidity »
   * fait de même, en attachant sa bulle au champ.
   *
   * Un refus doit se faire COMPRENDRE, pas se faire chercher : la phrase se
   * pose donc À CÔTÉ DU BOUTON qu'on vient de toucher, là où le regard est
   * déjà, et le focus part sans emporter la page avec lui.
   */
  const [refus, setRefus] = useState("");
  const goTo = (n: number) => {
    if (n > step && formRef.current) {
      // Every field of the current step must be valid before moving on.
      const fields = formRef.current.querySelectorAll<HTMLInputElement>(`[data-step="${step}"] input, [data-step="${step}"] textarea`);
      for (const el of fields) {
        if (!el.checkValidity()) {
          setRefus(el.validationMessage || t("Ce champ n'est pas encore rempli."));
          el.focus({ preventScroll: true });
          return;
        }
      }
      if (step === 1 && needsAmount && (!ordered || blocked)) {
        setRefus(t("Indiquez d'abord le montant de votre demande."));
        formRef.current.querySelector<HTMLInputElement>("[data-order-field]")?.focus({ preventScroll: true });
        return;
      }
    }
    setRefus("");
    /* AUCUN BOUTON DE CE PARCOURS NE DÉPLACE L'ÉCRAN.
       Demandé le 28 octobre 2026, et mesuré sur la fiche à 1280 px : un clic
       sur « Continuer » jetait la page de 650 à 158 — QUATRE CENT QUATRE-VINGT-
       DOUZE PIXELS vers le haut, sous le pouce de quelqu'un qui venait de
       viser un bouton. La colonne du formulaire est COLLANTE au-dessus de
       1000 px : elle suit déjà la page, et ce rappel à l'ordre ne servait
       qu'à faire perdre sa place au lecteur.
       Sous 1000 px la colonne est posée dans le flux, et il n'y a rien à
       rattraper non plus : la rangée d'actions ne bouge pas d'une étape à
       l'autre, c'est le contenu AU-DESSUS d'elle qui change. Le regard est
       déjà là où il faut. */
    setStep(n);
  };
  const parse = (s: string) => (offer.kind === "FONDS" && type === "rachat" ? parseUnits(s) : parseAmount(s));
  const market = offer.kind === "MARCHE";
  // Le sondage ne vit que sur le primaire obligataire, et seulement quand le client
  // annonce une demande : une information ou un rappel ne porte pas de condition.
  const survey = (offer.kind === "OTA" || offer.kind === "APE" || offer.kind === "BTA") && (type === "appetit" || type === "ferme");
  /* L'ARBITRAGE : QUITTER CETTE LIGNE POUR UNE AUTRE, EN UNE INSTRUCTION.
     Il ne s'offrait que depuis un rachat de fonds — un sixième des lignes
     qu'on détient. Il s'offre maintenant depuis toute vente, et c'est la
     généralisation demandée le 25 octobre 2026. */
  const canSwitch = (type === "rachat" || type === "vente") && switchTargets.length > 0;
  const arrivee = switchTargets.find((x) => x.id === switchTo);
  /* LE CAS SE LIT SUR L'ARRIVÉE, et il décide de la phrase que le client lit
     avant de signer : de fonds à fonds les deux jambes se règlent sur une VL,
     partout ailleurs une jambe passe par le carnet et la paire est ARMÉE. Le
     coût de la contrainte doit être visible, pas découvert. */
  const simultane = Boolean(arrivee?.fonds && offer.kind === "FONDS");
  /* CE QUE LE PLANCHER DIT, comparé à ce que la vente rapporterait
     aujourd'hui. Posé au-dessus, il arme un arbitrage mort-né que le
     robot refusera chaque soir en silence jusqu'à l'expiration. */

  const limitNum = limit ? Number(limit.replace(",", ".")) : null;
  const lim = limitNum != null && !isNaN(limitNum) && limitNum > 0 ? limitNum : null;
  /* LE SENS DU LEVIER, ET IL S'INVERSE D'UN COMPARTIMENT À L'AUTRE : le Trésor
     sert d'abord ce qui lui coûte le moins, donc les taux les plus bas sur un
     bon et les prix les plus hauts sur une obligation. Le repère est le niveau
     annoncé — celui qui sert déjà de gabarit au champ —, et la phrase change
     avec le chiffre tapé plutôt que de rester une consigne figée. */
  /* LES DURÉES D'UN ARBITRAGE, ET LA DATE QU'ELLES ÉCRIVENT.
     La borne haute n'est pas décidée ici : « FENETRE_MAX_JOURS » vient du
     domaine, et un écran qui la réinventerait finirait par s'en écarter. Le
     jour de départ vient du serveur, par « fenetre.min » qui est déjà demain :
     « new Date() » pendant un rendu donnerait une valeur au serveur et une
     autre au navigateur. */
  const dateApres = (jours: number) => (fenetre ? new Date(Date.parse(`${fenetre.min}T00:00:00Z`) + (jours - 1) * 86_400_000).toISOString().slice(0, 10) : "");
  /* LE REPÈRE, RENDU UNE FOIS POUR LES DEUX CHAMPS QUI POSENT LA MÊME
     QUESTION. Il dit ce qu'une séance comparable a servi, là où le gabarit du
     champ ne dit que ce que le Trésor annonce. Quand il ne tient qu'à une
     séance, il le dit : c'est la forme d'un seul carnet, pas celle du marché. */
  const repereDit = repere ? (
    <small className={styles.repere}>
      {t("Dernière séance comparable")} : <b>{fmtPct(repere.niveau, 2)}</b> {t("le")} {fmtDate(repere.le)}
      {repere.uneSeule && <> · {t("une seule séance, donc aucune dispersion mesurée")}</>}
    </small>
  ) : null;
  const sens = useMemo(() => {
    const d = sensDeLaCondition(offer);
    const annonce = offer.kind === "BTA" ? offer.precountRate : offer.pricePct;
    if (lim == null || annonce == null || lim === annonce) return { mot: d.attente, ecart: "aucun" as const };
    return lim < annonce ? { mot: d.dessous, ecart: "dessous" as const } : { mot: d.dessus, ecart: "dessus" as const };
  }, [offer, lim]);
  // Vendre ou racheter part d'un nombre de titres détenus : la somme n'y a pas
  // de sens, et « tout vendre » encore moins.
  const vend = type === "vente" || type === "rachat" || type === "cession";
  const byCash = market && !vend && unit === "francs";
  // Une seule quantité commande tout le reste : l’estimation, les contrôles, le passage
  // à l’étape suivante, et ce qui part au desk. Saisie en titres, ou déduite d’une somme.
  const ordered = byCash ? qtyForCash(offer, type, parseAmount(cash), lim) : parse(amount);
  // Ce que l'ordre coûte, ce qu'il rend et à quel taux : les trois viennent du
  // même calcul que l'échéancier, pour la quantité saisie plutôt que pour un
  // montant de référence rond.
  const plan = orderPlan(offer, market ? ordered : 0, market ? 0 : ordered, lim);
  const totals = orderTotals(plan);
  const est = estimate(offer, ordered);
  // « ordered » porte des titres sur la cote et des francs au primaire, et
  // `estimate` attend des francs : sur une ligne cotée son décaissement vaut
  // zéro, ce qui grisait l'estimation d'un ordre parfaitement valable et
  // privait le garde-fou du profil de son montant. Le compartiment décide.
  const mktBond = market && offer.instrument === "obligation" && ordered > 0 ? marketBondCalc(offer, ordered * offer.nominal, lim ?? offer.ask ?? offer.lastPrice ?? 0) : null;
  const outlay = market ? (mktBond?.outlay ?? (ordered > 0 ? ordered * unitPrice(offer, type, lim) : 0)) : (est.outlay ?? 0);
  const sized = market ? ordered > 0 : est.ok;
  /* CE QUE LA VENTE RAPPORTERAIT AUJOURD'HUI : le domaine le dit pour les
     trois sorties, dont deux où « outlay » est aveugle — négatif sur un
     rachat du Trésor, nul sur un fonds. */
  const produit = produitAttendu(offer, type, ordered, outlay);
  const plancherDit = plancherFaceAuProduit(parseAmount(floor), produit);


  /**
   * L'ORDRE COMMENCÉ SURVIT À LA PAGE, ET SE RAPPELLE À LA CLOCHE.
   *
   * Demandé le 28 octobre 2026 : « sans date limite, s'assurer que l'ordre
   * commencé apparaisse dans les notifications tant qu'il n'est pas confirmé
   * ou annulé ». Un montant tapé puis abandonné — une page fermée, un appel
   * reçu, un détour par ses coordonnées — n'était retrouvable nulle part : il
   * fallait tout retaper, et le plus souvent on ne revenait pas.
   *
   * IL NE PART PAS AU DESK : il vit sur l'appareil, parce que rien n'a été
   * envoyé et que la maison ne doit pas détenir un engagement que le client
   * n'a pas pris. Voir « lib/brouillon ».
   *
   * IL S'EFFACE QUAND L'ORDRE PART — c'est le « confirmé » de la demande ; le
   * « annulé » se joue depuis la cloche, où il se montre.
   */
  useEffect(() => {
    if (state?.ok) return poserLeBrouillon(null);
    /* CE QU'ON GARDE EST CE QUE L'ADRESSE DE REPRISE SAIT RELIRE, et les deux
       ne sont pas toujours le même nombre. « amount » porte des titres ou des
       francs selon le champ où l'on a tapé ; l'adresse, elle, n'a qu'un
       paramètre, et la page le relit dans l'unité PAR DÉFAUT du formulaire —
       les francs pour un achat en bourse. Mesuré avant correction : douze
       titres tapés revenaient en « 12 FCFA », donc zéro titre, donc un champ
       vide. On garde donc la somme pour ce cas-là, et la saisie telle quelle
       partout ailleurs, où l'unité par défaut est déjà la bonne. */
    const enTitres = market && !vend && unit === "titres" && outlay > 0;
    /* Groupé comme le client l'aurait tapé : la cloche montre un nombre qui
       se lit, pas une suite de chiffres. */
    const montant = enTitres ? groupDigits(String(Math.round(outlay))) : amount;
    poserLeBrouillon(montant.trim() ? { offerId: offer.id, titre: offer.title, type, montant } : null);
  }, [amount, type, state?.ok, offer.id, offer.title, market, vend, unit, outlay]);
  const takes = type !== "vente" && type !== "cession" && type !== "rachat";
  // The outlay against the savings the client said they can invest this year: a word, and a confirmation past half of it.
  const amountMark = investable != null && outlay ? amountFlag({ investable, kind: "equilibre", horizonYears: [0, 1], measures: { horizon: 0, tolerance: 0, knowledge: 0, capacity: 0 }, answers: {}, updatedAt: "" }, outlay) : null;
  const amountWarn = amountMark?.level === "warn" ? amountMark[lang] : undefined;
  const ready = signedIn && (phoneOk || phonePending) && emailOk && (!profileFlag || profileOk) && (!amountWarn || amountOk);
  const needsAmount = type === "ferme" || type === "cession" || type === "appetit" || type === "achat" || type === "vente" || type === "souscription" || type === "rachat";
  // Les trois cases d'une adjudication, quand la demande en porte une.
  const trio = survey && needsAmount ? surveyTrio(offer, ordered, lim) : null;
  // L'équivalence sous le champ : elle vivait dans la bulle « Le calcul », donc
  // il fallait la demander pour la voir. Elle se lit maintenant pendant la frappe.
  //
  // Là où le trio est affiché, elle se tait : le prix unitaire arrondi au franc
  // fait un total à un franc du décaissement calculé sans arrondi, et deux
  // nombres qui se contredisent sur le même écran valent moins qu'un seul.
  const equiv = needsAmount && !trio ? equivalence(offer, ordered, type) : null;
  // Ce que la demande laisse de côté, par la même règle que sur la cote : une
  // unité est entière.
  // Au franc entier : le prix d'un bon porte des centimes, et « 0 FCFA ne sont
  // pas placés » arrondi vers le haut deviendrait « 1 FCFA » — une phrase
  // alarmante sur une poussière.
  const trioRest = trio ? Math.max(0, Math.floor(ordered - trio.count * trio.amountPerUnit)) : 0;
  // Sur une ligne cotée, ce que la somme demandée laisse de côté : un titre ne
  // se coupe pas, et le carnet n'en prend que des entiers, par quotité.
  const marketRest = byCash && ordered > 0 ? Math.max(0, parseAmount(cash) - Math.round(ordered * unitPrice(offer, type, lim))) : 0;
  /* LE FRANC, ET SES CENTIMES QUAND IL EN A.
     Un prix de bon en porte presque toujours ; un nominal d'obligation jamais.
     Écrire « 9 700,00 » là où il n'y a rien à dire ajoute du bruit, et taire
     « ,22 » là où il y a quelque chose fait deux totaux sur un écran. */
  const franc = (n: number) => {
    const [entier, deci] = n.toFixed(2).split(".");
    return deci === "00" ? groupDigits(entier) : `${groupDigits(entier)},${deci}`;
  };
  /* CE QUI SORT PART DE CE QU'ON DÉTIENT, et la maison a un nom pour « ce qui
     sort » : la liste écrite ici à la main oubliait la cession, comme deux
     autres endroits l'oubliaient. */
  const sortie = sensDeLIntention(type) === "reduit";
  // Consistency of the order as typed: minimum, whole titles, quotité, limit price, position held.
  const checks = needsAmount && ordered ? orderChecks(offer, type, ordered, lim, { held: sortie && held > 0 ? held : undefined, needsAccount: signedIn && tier < 2 && (type === "ferme" || type === "cession" || type === "achat" || type === "vente") }).filter((c) => c.level !== "ok") : [];
  const blocked = checks.some((c) => c.level === "block");
  /* LA PHRASE QU'ON SE DIT EN TAPANT. Elle se tait quand la position n'est pas
     lue : « il vous restera 0 » serait un mensonge présenté comme un calcul. */
  const reste = sortie && held > 0 ? resteApres(offer, type, held, ordered) : undefined;

  if (state?.ok) {
    return (
      <div className={styles.wrap}>
        <div className={styles.done}>
          <div className={styles.receiptHead}>
            <span className={styles.tick} aria-hidden="true">
              ✓
            </span>
            <span>
              <b>{t("Votre intention est enregistrée")}</b>
              <small>{t("Gardez cette référence : elle sert de référence de virement.")}</small>
            </span>
          </div>
          <div className={styles.ref}>{state.ref}</div>
          <dl className={styles.receipt}>
            <dt>{t("Votre demande")}</dt>
            <dd>
              {t(INTENT_LABEL[state.type])}
              {ordered ? ` · ${market ? `${fmt(ordered)} ${t(offer.instrument === "obligation" ? "titres" : "actions")}` : `${fmtUnits(ordered)} ${t(offer.kind === "FONDS" && type === "rachat" ? "parts" : "FCFA")}`}` : ""}
            </dd>
            <dt>{t("La ligne")}</dt>
            <dd>{t(offer.title)}</dd>
            {/* LE PRIX MANQUAIT, et c'est ce qu'on signe. Le reçu disait le type,
                la quantité et la ligne : on repartait avec « 105 titres » sans
                savoir à combien, ni ce que ça engage. Le prix d'exécution n'est
                pas connu d'avance sur la cote, mais la limite posée l'est, et le
                cours de référence aussi : c'est cela qu'on rappelle, en disant
                lequel des deux c'est. */}
            <dt>{t("Le prix")}</dt>
            <dd>
              {market
                ? lim
                  ? t(offer.instrument === "obligation" ? "au plus {p} % du nominal" : "au plus {p} FCFA", { p: fmt(lim) })
                  : t("au cours du jour · dernier coté {p}", { p: offer.instrument === "obligation" ? `${offer.ask ?? offer.lastPrice ?? "—"} %` : `${fmt(offer.ask ?? offer.lastPrice ?? 0)} FCFA` })
                : t("au prix publié")}
            </dd>
            {ordered > 0 && (
              <>
                <dt>{t(vend ? "Produit estimé" : "Décaissement estimé")}</dt>
                <dd>
                  {fmt(Math.round(ordered * unitPrice(offer, type, lim)))} {t("FCFA")}
                  <small className={styles.estNote}>{t("estimation : le prix définitif est celui de l'exécution")}</small>
                </dd>
              </>
            )}
            <dt>{t("On vous répond")}</dt>
            <dd>{t(BY[state.channel])}</dd>
          </dl>
          <div className={styles.next}>{t("La suite")}</div>
          <ul className={styles.steps}>
            <li>
              {t("Accusé de réception envoyé sur WhatsApp au")} <b>{state.phone}</b> {t("et par e-mail à")} <b>{state.email}</b>
              {state.sent.some((x) => x.status === "skipped") ? t(" (envoi automatique en cours d'activation : le desk vous écrit à la main)") : state.sent.some((x) => x.status === "failed") ? t(" : un envoi a échoué, le desk vous recontacte") : ""}.
            </li>
            <li>{t("Un conseiller vous confirme {by} : vérifiez que ce numéro reçoit bien les appels et WhatsApp.", { by: t(BY[state.channel]) })}</li>
            {/* UN ORDRE OPCVM SE SIGNE TOUT DE SUITE, et le reçu y conduit au
                lieu d'annoncer une attente. L'ancienne phrase promettait un
                bulletin par e-mail, donc un aller-retour : c'est exactement ce
                qu'on supprime. */}
            <li>{state.aSigner ? t("Il vous reste à lire et signer votre ordre, ici même : c'est le dernier geste avant le go du desk.") : t("Le bulletin à signer et l'appel de fonds arrivent par e-mail ; l'exécution vous est confirmée sur les deux canaux.")}</li>
          </ul>
          {state.aSigner && (
            <div className={styles.needAccount}>
              <Link className="btn primary sm" href={`/moi/ordres/${state.id}`}>
                {t("Lire et signer mon ordre")}
              </Link>
            </div>
          )}
          {/* Un accusé de réception part d’un domaine que la boîte du client ne connaît pas encore : il finit souvent au courrier indésirable. */}
          <p className={styles.spam}>
            {t("Si l’accusé n’arrive pas dans quelques minutes, regardez vos courriers indésirables, et marquez-le comme légitime : les suivants arriveront dans la boîte de réception.")}
          </p>
          {state.needsAccount && (
            <div className={styles.needAccount}>
              {t("Pour transmettre cet ordre, votre compte-titres doit être ouvert : dix minutes sur votre téléphone.")}{" "}
              <Link className="btn primary sm" href={`/ouvrir-un-compte?next=${encodeURIComponent(`/offres/${offer.id}`)}`}>
                {t("Ouvrir mon compte")}
              </Link>
            </div>
          )}
          <TrustNudge />
          <div className={styles.doneActions}>
            <Link className="btn sm" href={`/offres/${offer.id}`}>
              {t("Autre intention")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // L'étiquette suit l'unité en cours : « Quantité (titres) » au-dessus d'un
  // champ où l'on tape des francs se lit comme une erreur de l'écran.
  const amtLabel = t(market ? (byCash ? "Montant (FCFA)" : offer.instrument === "obligation" ? "Quantité (titres)" : "Quantité (actions)") : offer.kind === "FONDS" ? (type === "rachat" ? "Parts à racheter" : "Montant (FCFA)") : offer.kind === "ACTIONS" ? "Montant (FCFA)" : offer.kind === "RACHAT" ? "Titres à céder" : offer.kind === "BTA" ? "Montant (FCFA)" : "Montant nominal (FCFA)");

  return (
    <>
    <div className={styles.wrap} data-mode={mode}>
      <h3 className="display">{t(past ? "Une question sur cette ligne ?" : "Votre intention sur cette ligne")}</h3>
      {monthly && (
        <div className={styles.choice}>
          <p className={styles.choiceLead}>{t("Deux demandes différentes : celle que vous choisissez décide du formulaire qui suit.")}</p>
          <button type="button" className={styles.choiceCard} onClick={() => setMode("une")}>
            <b>{t("Une fois")}</b>
            <span>{t("Je place un montant, maintenant.")}</span>
          </button>
          <button type="button" className={styles.choiceCard} onClick={() => setMode("mois")}>
            <b>{t("Chaque mois")}</b>
            <span>{t("Je donne l'ordre une fois, il se répète jusqu'à ce que je l'arrête.")}</span>
          </button>
        </div>
      )}
      <form action={action} ref={formRef} data-at={step} className={styles.form}>
        <input type="hidden" name="offerId" value={offer.id} />
        {bridge && <input type="hidden" name="de" value={bridge.token} />}
        <div className={styles.stepBar} aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <i key={n} className={n <= step ? styles.stepDone : undefined} />
          ))}
        </div>
        <div className={styles.stepTitle}>{t(step === 1 ? "1 · Votre demande" : step === 2 ? "2 · Vos coordonnées" : "3 · Récapitulatif")}</div>
        <div data-step="1">
        {/* UNE BASCULE QUAND IL Y A DEUX RÉPONSES, LA RANGÉE QUAND IL Y EN A
            PLUS. Les pastilles posaient deux cibles côte à côte, qui se
            lisaient comme deux destinations alors qu'il n'y a qu'UNE
            question. La bosse glisse de l'une à l'autre, et c'est elle qui
            dit laquelle est choisie.
            LA RANGÉE RESTE POUR TROIS ET PLUS : une bascule à trois réponses
            est une liste, et la forcer ici reviendrait à inventer un objet
            que personne ne sait lire. */}
        {types.length === 2 ? (
          <fieldset className={styles.bascule}>
            <legend className={styles.basculeLegende}>{t("Ce que vous voulez faire")}</legend>
            <span className={styles.bosse} data-second={type === types[1] ? "oui" : "non"} aria-hidden="true" />
            {types.map((it) => (
              <label key={it} className={type === it ? styles.motOn : styles.mot}>
                <input type="radio" name="type" value={it} checked={type === it} onChange={() => setType(it)} />
                {t(INTENT_LABEL[it])}
              </label>
            ))}
          </fieldset>
        ) : (
          <div className={styles.radio}>
            {types.map((it) => (
              <label key={it}>
                <input type="radio" name="type" value={it} checked={type === it} onChange={() => setType(it)} />
                {t(INTENT_LABEL[it])}
              </label>
            ))}
          </div>
        )}
        <div className={styles.row}>
          {needsAmount && market ? (
            /* LES TROIS CASES LIÉES : quantité × cours = total.

               Le formulaire posait déjà la question dans les deux sens, par un
               interrupteur « en titres / en FCFA » au-dessus d'un seul champ,
               et renvoyait la conversion dans une phrase en dessous. Trois
               nombres dont deux se déduisaient restaient donc à tenir de tête,
               et le cours, qui décide des deux autres, n'était visible nulle
               part : il dormait dans un champ « Prix limite (facultatif) »
               plus bas.

               Celle qu'on ne touche pas en dernier est celle qui suit : taper
               une quantité recalcule le total, taper un total recalcule la
               quantité. L'interrupteur disparaît, non parce qu'il gênait mais
               parce qu'il ne décide plus rien : le champ où l'on tape dit déjà
               l'unité, et le mot « calculé » dit l'autre. L'état qu'il
               pilotait, lui, reste, et c'est le champ touché qui le pose. */
            <div className={`${styles.trio} ${styles.carteDuChiffre}`}>
              {/* LE DEGRÉ SUIT LE CHAMP TOUCHÉ, et « byCash » le sait déjà :
                  c'est lui qui décide de « calculé » et de « vous tapez
                  ici ». Le chiffre qu'on écrit grandit ; celui qui se déduit
                  reste lisible sans prendre la parole. */}
              <label className={`field ${byCash ? styles.chiffreSuit : styles.chiffreTape}`}>
                <span>{t(offer.instrument === "obligation" ? "Quantité (titres)" : "Quantité (actions)")}</span>
                <input
                  data-order-field
                  name={byCash ? undefined : "amount"}
                  inputMode="numeric"
                  placeholder="80"
                  value={byCash ? (ordered ? groupDigits(String(ordered)) : "") : amount}
                  {...groupedInput((v) => {
                    setUnit("titres");
                    setAmount(v);
                  })}
                />
                <small className={byCash ? styles.calc : styles.typed}>{t(byCash ? "calculé, à la quotité par le bas" : "vous tapez ici")}</small>
              </label>
              <span className={styles.trioOp} aria-hidden="true">
                ×
              </span>
              <label className={`field ${styles.limite}`}>
                <span>{t(lim ? (offer.instrument === "obligation" ? "Votre limite (% du nominal)" : "Votre limite (FCFA)") : offer.instrument === "obligation" ? "Cours (% du nominal)" : "Cours (FCFA)")}</span>
                <input name="limitPrice" type="number" step={offer.instrument === "obligation" ? "0.001" : "1"} placeholder={String((vend ? offer.bid : offer.ask) ?? offer.lastPrice ?? "")} value={limit} onChange={(e) => setLimit(e.target.value)} />
                <small className={lim ? styles.typed : styles.calc}>{t(lim ? "votre limite : le desk ne dépasse pas" : "dernier cours publié · laissez vide pour au mieux")}</small>
              </label>
              <span className={styles.trioOp} aria-hidden="true">
                =
              </span>
              <label className={`field ${byCash && !vend ? styles.chiffreTape : styles.chiffreSuit}`}>
                <span>{t(vend ? "Produit estimé (FCFA)" : "Total (FCFA)")}</span>
                <input
                  inputMode="numeric"
                  placeholder="1 000 000"
                  readOnly={vend}
                  value={byCash ? cash : ordered ? groupDigits(String(Math.round(ordered * unitPrice(offer, type, lim)))) : ""}
                  {...groupedInput((v) => {
                    if (vend) return;
                    setUnit("francs");
                    setCash(v);
                  })}
                />
                <small className={byCash ? styles.typed : styles.calc}>{t(lim ? "au cours de votre limite" : "estimé au dernier cours")}</small>
              </label>
              {/* Ce qui part au desk reste une quantité : c'est ce que le carnet prend. */}
              {byCash && <input type="hidden" name="amount" value={ordered ? String(ordered) : ""} />}
              <div className={styles.trioFoot}>
                {byCash && !ordered && parseAmount(cash) > 0 && <span className={styles.rest}>{t("Cette somme n'atteint pas un titre au cours de référence.")}</span>}
                {/* UN TITRE NE SE COUPE PAS, et ce qui reste ne se disait nulle
                    part : le total affiché descendait sous la somme demandée
                    sans un mot. */}
                {marketRest > 0 && (
                  <span className={styles.rest}>
                    {t("{v} FCFA ne sont pas placés : un titre de plus coûterait {d} FCFA de trop.", { v: fmt(marketRest), d: fmt(Math.max(0, Math.round(unitPrice(offer, type, lim)) - marketRest)) })}
                  </span>
                )}
                {/* CE QU'IL VOUS RESTERA. Sur une sortie, la question n'est pas
                    ce que la somme achète mais ce qu'on garde, et le guichet
                    ne le disait nulle part. */}
                {reste && (
                  <span className={styles.reste}>
                    {t("Il vous restera")} {reste.dit} {t(reste.mot)}
                  </span>
                )}
                {held > 0 && type === "vente" && (
                  <small className={styles.held}>
                    {/* Le mot de l'unité vient du domaine, ici aussi : sur une
                        ligne cotée les deux listes disaient la même chose,
                        mais deux listes qui disent la même chose finissent par
                        ne plus la dire. */}
                    {t("Vous détenez")} {fmtUnits(held)} {t(counterUnit(offer))} ·{" "}
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => {
                        setUnit("titres");
                        setAmount(fmtUnits(held));
                      }}
                    >
                      {t("tout vendre")}
                    </button>
                  </small>
                )}
              </div>
            </div>
          ) : trio ? (
            /* LES MÊMES TROIS CASES, SUR UNE ADJUDICATION, et c'est là qu'elles
               servent le plus : l'arithmétique y trompe davantage qu'ailleurs.

               Un bon du Trésor se paie moins que son nominal, parce que
               l'intérêt est compté d'avance : on avançait dix millions et on
               ne voyait nulle part qu'ils achètent dix bons à 978 514, ni que
               214 861 restent sur le compte. Le calcul existait pourtant déjà,
               mais il ne sortait que sur la fiche et sur le bordereau.

               La case du milieu est le PRIX DE L'UNITÉ, pas le taux : c'est lui
               qui multiplie, et un taux ne multiplie rien. Le taux reste
               saisissable juste en dessous, puisque c'est lui que le client
               décide et que l'adjudication retiendra. */
            <div className={`${styles.trio} ${styles.carteDuChiffre}`}>
              {/* LE DEGRÉ SUIT LA CASE TOUCHÉE, ICI AUSSI — et « unit » le
                  sait déjà faire. Il ne servait qu'au marché, sous garde
                  « market » ; s'en servir ici ne change rien là-bas et évite
                  un second état qui dirait la même chose. Les deux cases se
                  tapent et écrivent le même « amount » : sans cela, rien ne
                  dirait laquelle fait foi, et celle qu'on remplit resterait
                  petite pendant que l'autre grandit. */}
              <label className={`field ${unit === "titres" ? styles.chiffreTape : styles.chiffreSuit}`}>
                <span>{t(offer.kind === "BTA" ? "Quantité (bons)" : "Quantité (titres)")}</span>
                {/* AU FRANC SUPÉRIEUR, et ce n'est pas une coquetterie : le
                    montant qu'on pose ici sera relu par un calcul qui divise et
                    prend l'entier par le bas. Arrondi au plus proche, la
                    quantité qu'on venait de taper revenait diminuée d'une unité
                    chaque fois que le prix d'un bon tombait sous la demie —
                    c'est-à-dire une fois sur deux. */}
                <input
                  inputMode="numeric"
                  placeholder="10"
                  value={trio.count ? groupDigits(String(trio.count)) : ""}
                  {...groupedInput((v) => {
                    setUnit("titres");
                    setAmount(groupDigits(String(montantPourUnites(trio, Number(v.replace(/\D/g, "")) || 0))));
                  })}
                />
                <small className={styles.calc}>{t("à l'entier : une unité ne se coupe pas")}</small>
              </label>
              <span className={styles.trioOp} aria-hidden="true">
                ×
              </span>
              <label className="field">
                <span>{t(offer.kind === "BTA" ? "Prix du bon (FCFA)" : "Prix du titre (FCFA)")}</span>
                <input readOnly value={franc(trio.each)} />
                <small className={styles.calc}>
                  {t(offer.kind === "BTA" ? "à {r} % précompté sur un nominal de {n} FCFA" : "à {r} % d'un nominal de {n} FCFA", { r: String(trio.rate).replace(".", ","), n: fmt(offer.nominal) })}
                </small>
              </label>
              <span className={styles.trioOp} aria-hidden="true">
                =
              </span>
              <label className={`field ${unit === "titres" ? styles.chiffreSuit : styles.chiffreTape}`}>
                <span>{t(offer.kind === "BTA" ? "À décaisser (FCFA)" : "Principal (FCFA)")}</span>
                <input
                  data-order-field
                  inputMode="numeric"
                  placeholder="10 000 000"
                  value={trio.total ? franc(trio.total) : ""}
                  {...groupedInput((v) => {
                    setUnit("francs");
                    setAmount(groupDigits(String(Math.round((Number(v.replace(/\D/g, "")) || 0) * trio.amountPerTotal))));
                  })}
                />
                <small className={styles.calc}>{t(offer.kind === "BTA" ? "ce que vous avancez · le nominal vous revient à l'échéance" : "hors coupon couru, qui s'achète avec le titre")}</small>
              </label>
              <input type="hidden" name="amount" value={ordered ? String(ordered) : ""} />
              <div className={styles.trioFoot}>
                {trioRest > 0 && (
                  <span className={styles.rest}>
                    {t("{v} FCFA ne sont pas placés : une unité de plus demanderait {d} FCFA de plus.", { v: fmt(trioRest), d: fmt(Math.max(0, trio.amountPerUnit - trioRest)) })}
                  </span>
                )}
                {/* La condition du client : ce qu'il demande pour dire oui. Un
                    appétit qui ne porte qu'un montant ne répond pas à la
                    question de l'émetteur, à quel niveau cette demande tient
                    encore. Le sens dépend du compartiment, et le mot avec : on
                    paie un prix, on reçoit un taux. */}
                {/* LA MÊME CONDITION, DONC LE MÊME CORPS. Le champ de la limite
                    avait été relevé sur le marché et oublié ici, alors que
                    c'est sur une adjudication qu'il décide le plus : il dit à
                    quel niveau la demande tient encore. */}
                <label className={`field ${styles.limite}`}>
                  <span>
                    {t(offer.kind === "BTA" ? "Taux minimum (facultatif)" : "Prix maximum (facultatif)")} : {t(offer.kind === "BTA" ? "% précompté" : "% du nominal")}
                  </span>
                  <input name="limitPrice" type="number" step={offer.kind === "BTA" ? "0.01" : "0.001"} placeholder={String((offer.kind === "BTA" ? offer.precountRate : offer.pricePct) ?? "")} value={limit} onChange={(e) => setLimit(e.target.value)} />
                  {/* DEUX CHOSES QUE LE CHIFFRE SEUL NE DIT PAS : ce que la
                      place a servi la dernière fois, et dans quel sens on se
                      déplace. Le gabarit du champ ne porte que le niveau
                      ANNONCÉ, qui est le vœu du Trésor ; et le sens s'inverse
                      entre un bon et une obligation, ce qui est toute la
                      difficulté. Les deux viennent du domaine, parce que ce
                      sont des règles du marché et non des tournures d'écran. */}
                  {repereDit}
                  <small className={styles.sens}>{t(sens.mot)}</small>
                  <small className="muted">{t("Sans condition, votre demande tient quel que soit le résultat.")}</small>
                </label>
              </div>
            </div>
          ) : needsAmount ? (
            /* LE CHIFFRE EST LE SUJET : carte, neuvième degré, conséquence
               sous la main. Voir « LE CHIFFRE QUE LE CLIENT ÉCRIT » dans la
               feuille. Ici il n'y a qu'un nombre tapé, donc il le porte
               toujours. */
            <label className={`field ${styles.carteDuChiffre} ${styles.chiffreTape}`}>
              {amtLabel}
              <input
                data-order-field
                name="amount"
                inputMode="numeric"
                placeholder={offer.kind === "RACHAT" ? "500" : "10 000 000"}
                value={amount}
                {...groupedInput(setAmount, { decimals: offer.kind === "FONDS" && type === "rachat" })}
              />
              {equiv && (
                <small className={styles.conv}>
                  <b className={styles.equiv}>{t(equiv.line)}</b>
                  {equiv.restLine && <span className={styles.rest}>{t(equiv.restLine)}</span>}
                </small>
              )}
              {/* CE QU'IL VOUS RESTERA, ici aussi : c'est le champ du rachat
                  du Trésor et du rachat de parts, les deux sorties qui ne
                  passent pas par le trio. */}
              {reste && (
                <small className={styles.reste}>
                  {t("Il vous restera")} {reste.dit} {t(reste.mot)}
                </small>
              )}
              {/* « TOUT CÉDER » MANQUAIT AU TRÉSOR. La cession est la sortie
                  qui porte le mot, et c'était la seule des trois sans sa
                  position : ni plafond, ni raccourci. */}
              {held > 0 && sortie && (
                <small className={styles.held}>
                  {/* LE MOT DE L'UNITÉ VIENT DU DOMAINE, et il a fallu qu'un
                      rachat du Trésor devienne visible pour qu'on le voie :
                      cette ligne écrivait sa propre liste, et « instrument »
                      n'existe que sur une ligne cotée. Sur un rachat
                      d'obligations elle disait donc « vous détenez 500
                      ACTIONS », à deux lignes de « il vous restera 300
                      TITRES » — deux mots pour une même chose, sur un même
                      écran, dont un faux. « counterUnit » répond déjà pour
                      les trois sorties, et « resteApres » le lit. */}
                  {t("Vous détenez")} {fmtUnits(held)} {t(counterUnit(offer))} ·{" "}
                  <button type="button" className={styles.linkBtn} onClick={() => setAmount(fmtUnits(held))}>
                    {t(type === "rachat" ? "tout racheter" : type === "cession" ? "tout céder" : "tout vendre")}
                  </button>
                </small>
              )}
            </label>
          ) : (
            <span />
          )}
          {/* La condition d'un sondage : ce que le client demande pour dire oui.

              Un appétit disait un montant et s'arrêtait là, et porté à l'émetteur il
              ne répondait pas à sa question : à quel niveau cette demande tient-elle
              encore ? Le sens dépend du compartiment, et le mot avec : on paie un
              prix, on reçoit un taux. */}
          {/* Où va le produit du rachat.

              Sans ce choix, le client passait deux ordres sans rapport : un rachat,
              puis une souscription s'il y pensait et quand il y pensait. Entre les
              deux, son argent était sorti du marché et rien ne le lui rappelait.

              Aucun montant n'est annoncé ici, parce qu'aucun n'est connu : il vaudra
              les parts à la prochaine valeur liquidative, nette des droits de sortie,
              et cette valeur se publie après. */}
          {canSwitch && (
            <div className="field">
              {/* LA LISTE DE L'APPLICATION, ET NON CELLE DU TÉLÉPHONE.
                  Une liste native s'ouvre en roue au bas de l'écran, avec sa
                  propre typographie et sans la phrase qui dit ce que chaque
                  ligne est. Celle-ci garde la langue, l'encre et la recherche,
                  et c'est la même qu'au réinvestissement, où elle sert déjà. */}
              <Select
                name="switchToOffer"
                label={t("Replacer le produit dans (facultatif)")}
                value={switchTo}
                onChange={setSwitchTo}
                block
                options={[{ value: "", label: t("non : virer le produit sur mon compte") }, ...switchTargets.map((x) => ({ value: x.id, label: x.title }))]}
              />
              {!switchTo && <small className="muted">{t("Sans arrivée, le produit est viré sur votre compte et vous décidez ensuite.")}</small>}
            </div>
          )}
          {/* CE QUE L'ARBITRAGE COÛTE, ÉCRIT AVANT LA SIGNATURE.
              La protection vient avec une contrainte, et une contrainte
              découverte après coup n'est pas une protection : c'est une
              panne. La phrase change avec le cas — simultané ou armé — parce
              que le prix n'est pas le même. */}
          {canSwitch && switchTo && (
            <div className={styles.arbitrage}>
              {/* LE MOUVEMENT, MONTRÉ.
                  Un arbitrage n'est ni le départ ni l'arrivée : c'est le
                  trajet entre les deux, et c'est la seule chose que l'écran ne
                  montrait pas. La ligne qu'on quitte n'était nommée nulle part
                  dans ce panneau, et celle qu'on rejoint ne se lisait qu'à
                  l'intérieur d'une liste repliée, tronquée à « FCP… ». Le
                  geste le plus engageant du guichet était invisible. */}
              <div className={styles.trajet}>
                <span className={styles.jambe}>
                  <span className={styles.jambeRole}>{t("Vous quittez")}</span>
                  <span className={styles.jambeLigne}>{t(offer.title)}</span>
                </span>
                <span className={styles.fleche} aria-hidden="true">
                  ↓
                </span>
                <span className={styles.jambe}>
                  <span className={styles.jambeRole}>{t("Vous rejoignez")}</span>
                  <span className={styles.jambeLigne}>{arrivee?.title ?? "—"}</span>
                </span>
              </div>
              <p className={styles.arbTitre}>{t(simultane ? "Les deux jambes se signent ensemble" : "La paire est armée : rien ne part tant que les deux jambes ne tiennent pas le même jour")}</p>
              <p className={styles.arbDit}>
                {t(
                  simultane
                    ? "Le rachat et la souscription se règlent sur une valeur liquidative, et les deux VL retenues vous sont dites avant la signature."
                    : "Une des deux jambes passe par le carnet de la BVMAC, où un ordre peut rester plusieurs séances sans trouver preneur. Vous ne vous désinvestissez donc que si l'arrivée est tenue — au prix de pouvoir ne jamais partir.",
                )}
              </p>
              {/* LE SEUL CHIFFRE DE LA MAISON QUI EST UNE LIMITE.
                  Partout ailleurs, le montant qu'écrit le client est ce qu'il
                  VEUT : placer un million, céder quarante titres, verser
                  cinquante mille. Celui-ci est l'inverse — le montant sous
                  lequel il REFUSE que la vente parte. « Plancher (FCFA) » est
                  le mot du desk et se lit comme une valeur à atteindre ; un
                  client qui vise son plancher arme un arbitrage qui ne partira
                  jamais. La question se pose donc au négatif. */}
              <label className={`field ${styles.arbPlancher}`}>
                {t("Sous quel montant refusez-vous que la vente parte ?")} : {t("FCFA")}
                {/* Les milliers se séparent pendant la frappe, comme partout
                    ailleurs : ce champ s'en était dispensé, et c'est le seul
                    endroit du formulaire où l'on comptait encore ses zéros. */}
                <input name="switchFloor" inputMode="numeric" value={floor} {...groupedInput(setFloor)} required />
                {plancherDit === "au_dessus" ? (
                  <small className={styles.arbTrop}>{t("Au-dessus de ce que la vente rapporterait aujourd'hui ({v} FCFA) : rien ne partira tant que le prix n'aura pas monté.", { v: fmt(produit) })}</small>
                ) : plancherDit === "tient" ? (
                  <small className={styles.suiteArb}>
                    <b>{t("Rien ne part sous {v} FCFA", { v: fmt(parseAmount(floor)) })}</b>
                    <span> · {t("la vente en rapporterait {v} aujourd'hui", { v: fmt(produit) })}</span>
                  </small>
                ) : (
                  <small className="muted">{t("Sous ce produit de vente, rien ne part.")}</small>
                )}
              </label>
              {/* DES DURÉES, ET NON UN CALENDRIER. « Je laisse courir un mois »
                  est la pensée du client ; lui demander de la traduire en un
                  jour du calendrier ajoute une traduction et deux gestes — la
                  roue du téléphone, et la visée. La date reste dans le champ,
                  qui part au serveur et que le desk relira ; ce sont les
                  boutons qui l'écrivent. */}
              <fieldset className={`field ${styles.arbFenetre}`}>
                <legend>{t("Jusqu'à quand laissez-vous courir ?")}</legend>
                <input type="hidden" name="switchBy" value={by} />
                <div className={styles.durees}>
                  {DUREES.map((j) => (
                    <button key={j} type="button" aria-pressed={by !== "" && by === dateApres(j)} className={by !== "" && by === dateApres(j) ? styles.dureeOn : styles.duree} onClick={() => setBy(dateApres(j))}>
                      {j} j
                    </button>
                  ))}
                </div>
                {by ? (
                  <small className={styles.suiteArb}>
                    <b>{t("Jusqu'au {d}", { d: fmtDate(by) })}</b>
                    <span> · {t("passé ce jour, rien n'a bougé : votre position est intacte, et votre argent aussi.")}</span>
                  </small>
                ) : (
                  <small className="muted">{t("Au-delà, l'arbitrage s'annule et votre position reste telle quelle.")}</small>
                )}
              </fieldset>
              {/* UN ARBITRAGE QUI EXPIRE N'EST PAS UNE PANNE : c'est la
                  protection qui a joué. Dit ici, avant, parce qu'un client qui
                  le découvre après lit « ça n'a pas marché ». */}
              <p className={styles.arbDit}>{t("Si la date passe sans que les deux jambes tiennent, tout s'annule : votre position est intacte, et votre argent aussi.")}</p>
            </div>
          )}
          {/* La condition a rejoint les trois cases : elle y est sous le prix
              qu'elle décide. Elle n'a plus de champ séparé ici, qui en ferait un
              second limitPrice dans le même formulaire. */}
          {survey && !trio && (
            <label className={`field ${styles.limite}`}>
              {t(offer.kind === "BTA" ? "Taux minimum (facultatif)" : "Prix maximum (facultatif)")} :{" "}
              {t(offer.kind === "BTA" ? "% précompté" : "% du nominal")}
              <input
                name="limitPrice"
                type="number"
                step={offer.kind === "BTA" ? "0.01" : "0.001"}
                placeholder={String((offer.kind === "BTA" ? offer.precountRate : offer.pricePct) ?? "")}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
              {/* LE MÊME REPÈRE ET LE MÊME SENS QU'AU-DESSUS. Deux champs
                  posent la même question dans ce formulaire ; en instruire un
                  seul, c'est laisser l'autre parier. */}
              {repereDit}
              <small className={styles.sens}>{t(sens.mot)}</small>
              <small className="muted">{t("Sans condition, votre demande tient quel que soit le résultat.")}</small>
            </label>
          )}
          {/* Le prix limite a rejoint les trois cases : il est la case du milieu,
              puisque c'est lui qui décide des deux autres. Il n'a plus de champ
              séparé plus bas, qui en ferait un second dans le même formulaire. */}
        </div>
        {needsAmount && (
          <>
            {/* Les trois chiffres que le client cherche, pour ce qu'il vient de
                saisir : ce qu'il sort, ce qui lui revient, et le taux que cela
                fait. C'est la bande du bloc de référence de la fiche, qui les
                donne pour un montant rond ; ici ce sont les siens.

                Le détail du calcul passe dans une bulle : une phrase qu'on lit
                une fois pour vérifier, pas un chiffre qu'on suit. */}
            {sized && outlay > 0 ? (
              <RefTotals
                figures={[
                  {
                    label: t(takes ? "Total à décaisser" : "Total encaissé"),
                    value: (
                      <>
                        <Amount value={outlay} />
                        <Info text={t(market ? marketEstimate(offer, ordered, type, lim) : offer.kind === "FONDS" && type === "rachat" ? redemptionEstimate(offer, parse(amount)) : est.text)} label={t("Le calcul")} subtle />
                      </>
                    ),
                  },
                  ...(takes && totals.received > 0
                    ? [{ label: t("Total à recevoir"), value: <Amount value={totals.received} />, note: t("{n} versement(s) jusqu'à l'échéance", { n: plan.flows.length }) }]
                    : []),
                ]}
                rate={
                  takes && totals.yieldPct != null
                    ? { label: t(market ? "Rendement actuariel annuel brut à ce cours" : "Rendement actuariel annuel brut"), value: fmtPct(totals.yieldPct, 2), note: t(market ? "au cours de référence : le prix d'exécution le fera bouger" : "si la ligne est gardée jusqu'à l'échéance") }
                    : undefined
                }
              />
            ) : (
              <div className={`${styles.estimate} ${styles.estimateOff}`}>{t(market ? marketEstimate(offer, ordered, type, lim) : offer.kind === "FONDS" && type === "rachat" ? redemptionEstimate(offer, parse(amount)) : est.text)}</div>
            )}
            <OrderFlows offer={offer} quantity={market ? ordered : 0} amount={market ? 0 : ordered} limit={lim} type={type} />
          </>
        )}
        {checks.length > 0 && (
          <ul className={styles.checks} aria-live="polite">
            {checks.map((c) => (
              <li key={c.key} className={c.level === "block" ? styles.checkBlock : styles.checkWarn}>
                <span>{t(c.text)}</span> <Info text={t(c.why)} label={t(c.level === "block" ? "Pourquoi l'ordre ne passe pas" : "Pourquoi ce message")} subtle />
              </li>
            ))}
          </ul>
        )}
        {signedIn && tier < 2 && (type === "souscription" || type === "rachat") && (
          <div className={styles.tierNote}>
            {t("Souscrire à un fonds demande un dossier client approuvé (les parts sont inscrites à votre nom chez le dépositaire). Envoyez votre intention, elle est gardée, puis")}{" "}
            <Link href={`/ouvrir-un-compte?next=${encodeURIComponent(`/offres/${offer.id}`)}`}>{t("complétez votre dossier")}</Link> (10 min).
          </div>
        )}
        {signedIn && tier < 2 && (type === "ferme" || type === "cession" || type === "achat" || type === "vente") && (
          <div className={styles.tierNote}>
            {t("Prises fermes, cessions et ordres de bourse demandent un compte-titres ouvert. Envoyez quand même votre intention, elle est gardée, puis")}{" "}
            <Link href={`/ouvrir-un-compte?next=${encodeURIComponent(`/offres/${offer.id}`)}`}>{t("ouvrez votre compte")}</Link> (10 min).
          </div>
        )}
        </div>
        <div data-step="2">
        <fieldset className={styles.contact}>
          <legend>{t("Vos coordonnées")}</legend>
          <div className={styles.row}>
            <label className="field">
              <span>
                {t("Prénom")} <em className={styles.req}>· {t("requis")}</em>
              </span>
              <input name="firstName" autoComplete="given-name" placeholder={t("Prénom")} value={who.firstName} onChange={(e) => setWho({ ...who, firstName: e.target.value })} required minLength={2} />
            </label>
            <label className="field">
              <span>
                {t("Nom")} <em className={styles.req}>· {t("requis")}</em>
              </span>
              <input name="lastName" autoComplete="family-name" placeholder={t("Nom")} value={who.lastName} onChange={(e) => setWho({ ...who, lastName: e.target.value })} required minLength={2} />
            </label>
          </div>
          <div className={styles.row}>
            <label className="field">
              <span>
                {t("Téléphone (WhatsApp)")} <em className={styles.req}>· {t("requis")}</em>
              </span>
              <input name="contactPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+237 6 87 67 67 67" value={who.phone} onChange={(e) => setWho({ ...who, phone: e.target.value })} required pattern="[+0-9 \(\)\.\-]{8,}" title={t("Numéro avec indicatif, ex. +237 6 87 67 67 67")} />
              {phoneOk && <em className={styles.proven}>✓ {t(bridge && normalizePhone(who.phone) === bridge.phone ? "reconnu par le lien WhatsApp du desk" : "prouvé")}</em>}
            </label>
            <label className="field">
              <span>
                E-mail <em className={styles.req}>· {t("requis")}</em>
              </span>
              <input name="contactEmail" type="email" inputMode="email" autoComplete="email" placeholder={t("vous@exemple.com")} value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} required readOnly={Boolean(signedIn && provenEmail)} />
              {emailOk && <em className={styles.proven}>✓ {t("prouvé")}</em>}
            </label>
          </div>
          {!signedIn && !emailOk && <ProofBlock kind="email" target={who.email} onProven={setProvenEmail} />}
          {signedIn && Boolean(accountEmail) && !emailOk && <em className={styles.proofError}>{t("L'e-mail est celui de votre compte ; pour en changer, passez par Votre compte › Sécurité.")}</em>}
          {signedIn && emailOk && !phoneOk && who.phone.replace(/\D/g, "").length >= 8 && <ProofBlock kind="phone" target={who.phone} onProven={setProvenPhone} onUnavailable={() => setPhonePending(true)} />}
          {!signedIn && emailOk && <em className={styles.proofDemo}>{t("Connexion en cours…")}</em>}
          <div className={styles.channelLbl}>{t("Me joindre par")}</div>
          <div className={styles.channels}>
            {(["WhatsApp", "Appel", "E-mail"] as const).map((c) => (
              <label key={c}>
                <input type="radio" name="channel" value={c} checked={channel === c} onChange={() => setChannel(c)} />
                {t(c)}
              </label>
            ))}
          </div>
          <p className={styles.procedure}>
            {t("Prénom et nom tels que sur votre pièce d'identité (ils figurent sur le bulletin). E-mail et WhatsApp sont prouvés par un code, une seule fois : accusé de réception immédiat sur les deux, confirmation d'un conseiller {by}, bulletin à signer par e-mail. En donnant ce numéro, vous acceptez d'être contacté sur WhatsApp pour cette opération.", { by: t(BY[channel]) })}
          </p>
        </fieldset>
        <label className="field" style={{ marginBottom: 10 }}>
          {t("Message (facultatif)")}
          <textarea name="message" rows={2} placeholder={t(offer.kind === "RACHAT" ? "Titres détenus chez… / date de disponibilité" : "Ex. : plutôt la ligne la plus courte ; contrainte de trésorerie le 16.")} />
        </label>
        </div>
        <div data-step="3">
        <div className={styles.recap}>
          <div>
            <span>{t("Ligne")}</span>
            <b>{t(offer.title)}</b>
          </div>
          <div>
            <span>{t("Demande")}</span>
            <b>{t(INTENT_LABEL[type])}</b>
          </div>
          {needsAmount && (
            <div>
              <span>{amtLabel}</span>
              <b>{parse(amount) ? (type === "rachat" ? fmtUnits(parse(amount)) : fmt(parse(amount))) : "—"}</b>
            </div>
          )}
          {/* Le récapitulatif disait la quantité tapée et rien d'autre : on
              signait « 10 000 000 FCFA » sans savoir combien de parts, ni ce
              qui restait de côté. */}
          {equiv && (
            <div className={styles.recapEquiv}>
              <span>{t("Soit environ")}</span>
              <b>
                {/* La mise en garde est déjà sous le champ : ici elle ferait
                    quatre lignes dans un tableau qui en tient une. */}
                {t(equiv.line).replace("≈ ", "").split(" · ")[0]}
                {equiv.restLine && <small>{t(equiv.restLine)}</small>}
              </b>
            </div>
          )}
          {/* LA CONDITION, AU MOMENT OÙ L'ON SIGNE.

              Le récapitulatif disait la ligne, la nature de la demande, le
              montant et le contact — et pas la condition. Sur une
              adjudication, c'est pourtant le second des deux nombres qui
              décident, et celui qui engage le plus : on signait un taux
              minimum qu'on ne voyait plus depuis deux écrans. Elle paraît ici
              avec le MOT DE SON COMPARTIMENT, et avec le « si » qui dit qu'une
              adjudication ne se promet pas. */}
          {survey && lim != null && (
            <div>
              <span>{t(offer.kind === "BTA" ? "Taux minimum" : "Prix maximum")}</span>
              <b>
                {fmtPct(lim, 2)}
                <small>{t("Si l'adjudication sort au-delà, votre demande n'est pas servie.")}</small>
              </b>
            </div>
          )}
          <div>
            <span>{t("Contact")}</span>
            <b>
              {who.firstName} {who.lastName} · {t(channel)} · {channel === "E-mail" ? who.email : who.phone}
            </b>
          </div>
        </div>
        {state && !state.ok && <div className={styles.error}>{state.error}</div>}
        {!ready && (
          <div className={styles.login}>
            {t(!signedIn ? "Votre e-mail doit être prouvé par son code (étape 2) : il vous connecte, sans compte à créer d'avance." : !phoneOk ? "Votre numéro WhatsApp doit être prouvé par son code (étape 2), une seule fois." : "L'e-mail doit être celui de votre connexion (étape 2).")}
            <button type="button" className="btn primary sm" onClick={() => goTo(2)}>
              {t("Aller à l'étape 2")}
            </button>
          </div>
        )}
        {amountWarn && (
          <label className={styles.profileBox}>
            <input type="checkbox" checked={amountOk} onChange={(e) => setAmountOk(e.target.checked)} />
            <span>
              <b>{t("Ce montant est {flag}.", { flag: amountWarn })}</b> {t("Je le sais et je confirme mon intention ; un conseiller en parlera avec moi.")}
            </span>
          </label>
        )}
        {profileFlag && (
          <label className={styles.profileBox}>
            <input type="checkbox" checked={profileOk} onChange={(e) => setProfileOk(e.target.checked)} />
            <span>
              <b>{t("Cette ligne est {flag}.", { flag: profileFlag })}</b> {t("Je le sais et je confirme mon intention ; un conseiller en parlera avec moi.")}
            </span>
          </label>
        )}
        <input type="hidden" name="profileFlag" value={[profileFlag && profileOk ? profileFlag : "", amountWarn && amountOk ? amountWarn : ""].filter(Boolean).join(" · ")} />
        </div>
        {/* UNE SEULE RANGÉE D'ACTIONS.

            « Envoyer au desk » vivait dans le pied de l'étape 3, « Retour » dans
            une barre en dessous : sur téléphone, deux rangées, et le pouce
            devait choisir entre deux boutons qui ne se voyaient pas ensemble.
            Le bouton d'envoi rejoint la barre, qui devient la seule rangée.
            Le pied garde sa phrase, et sur grand écran les deux restent côte à
            côte comme avant, par le cadre qui les entoure. */}
        {/* La phrase du refus, à côté du bouton qu'on vient de toucher. */}
        {refus && (
          <p className={styles.refus} role="alert">
            {refus}
          </p>
        )}
        <div className={styles.actions}>
          <div className={styles.foot} data-step="3">
            <small>{t(offer.kind === "FONDS" ? "Une souscription est exécutée à la prochaine valeur liquidative ; elle est confirmée par un conseiller et un bulletin à signer. La décision reste la vôtre ; la performance dépend du marché." : "Une prise ferme engage la transmission de votre offre à l'adjudication ; elle est confirmée par un conseiller et un bulletin à signer. La décision reste la vôtre ; l'allocation dépend de l'adjudication.")}</small>
          </div>
          <div className={styles.stepNav}>
            {/* À la première étape, « Retour » remonte au choix plutôt que de
                disparaître : sans lui on ne peut plus changer d'avis sans
                recharger la page. */}
            {(step > 1 || monthly) && (
              <button type="button" className="btn ghost" onClick={() => (step > 1 ? goTo(step - 1) : setMode(""))}>
                {t("Retour")}
              </button>
            )}
            {step < 3 && (
              <button type="button" className={`btn primary ${styles.next}`} onClick={() => goTo(step + 1)}>
                {t("Continuer")}
              </button>
            )}
            <button className={`btn primary ${styles.send}`} type="submit" disabled={pending || !ready}>
              {t(pending ? "Envoi…" : "Envoyer au desk")}
            </button>
          </div>
        </div>
      </form>
    </div>
    {/* LE BLOC MENSUEL RESTE UN FRÈRE DU CADRE, et non un enfant : sur grand
        écran il garde exactement la place et l'allure qu'il avait, sous le
        formulaire, dans son propre encart. Ce qui change est qu'il porte
        maintenant le même état, donc la feuille de style peut le cacher avec
        les étapes qu'il doublait. */}
    {monthly && (
      <div className={styles.monthly} data-mode={mode}>
        {/* Sur grand écran les deux demandes se voient ensemble : ce retour
            n'aurait rien à ramener, et il ne s'affiche pas. */}
        <button type="button" className={`btn ghost ${styles.backToChoice}`} onClick={() => setMode("")}>
          {t("Retour")}
        </button>
        {monthly}
      </div>
    )}
    </>
  );
}
