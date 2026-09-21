import type { DocumentType } from "@/lib/domain/types";

/**
 * The life of a relationship as the desk tells it: six operations, each a
 * row of steps with who acts, what the intention's state becomes, and the
 * documents born at that step. One source for the documentation's flows,
 * the map of documents and the acts panel: change a step here, every page
 * follows. Free-text labels are French; the pages translate them.
 */
export type Actor = "client" | "desk" | "tiers";

export interface FlowDoc {
  type: DocumentType;
  /** A variant name when the model serves several purposes (« Bulletin d'ordre (marché secondaire) »). */
  variant?: string;
}

export interface FlowStep {
  actor: Actor;
  /** Who exactly acts (« Trésor · SVT », « Dépositaire »). */
  who: string;
  title: string;
  /** The intention's or file's state after the step, as the app shows it. */
  state?: string;
  /** The clock that runs on this step, when there is one. */
  clock?: string;
  docs: FlowDoc[];
  /** A received document that Guichet does not produce (the broker's confirmation…). */
  received?: string;
}

export interface Flow {
  key: string;
  title: string;
  intro: string;
  steps: FlowStep[];
}

export const ACTOR_LABEL: Record<Actor, string> = { client: "le client", desk: "le desk", tiers: "contrepartie" };

export const FLOWS: Flow[] = [
  {
    key: "ouverture",
    title: "Ouverture",
    intro: "Une fois par client. Rien ne se signe avant l'approbation du dossier ; la convention est acceptée par code à usage unique ; le compte-titres est ouvert chez le dépositaire.",
    steps: [
      { actor: "client", who: "Client", title: "Ouvre son dossier dans Mon espace", state: "dossier : soumis", docs: [] },
      { actor: "desk", who: "Desk", title: "Revue KYC, sanctions / PPE, cotation du risque", state: "dossier : approuvé", docs: [{ type: "dossier_svt" }] },
      { actor: "client", who: "Client", title: "Accepte la convention par code", state: "convention : acceptée", docs: [{ type: "convention" }, { type: "mandat", variant: "Mandat, si un tiers passe les ordres" }] },
      { actor: "tiers", who: "Dépositaire", title: "Ouvre le compte-titres, le desk saisit son numéro", state: "compte : ouvert", docs: [] },
    ],
  },
  {
    key: "primaire",
    title: "Souscription primaire",
    intro: "Adjudication BTA / OTA ou APE. L'intention part avec deux canaux prouvés et le profil vérifié ; le desk confirme, le client signe et vire, le desk soumet au SVT, le résultat et le règlement reviennent en avis.",
    steps: [
      { actor: "client", who: "Client", title: "Intention ferme : montant, prix limite, canal", state: "reçue", docs: [] },
      { actor: "desk", who: "Desk", title: "Vérifie (dossier, canaux, profil) et confirme", state: "confirmée", clock: "rappel dans l'heure ouvrée", docs: [{ type: "bulletin", variant: "Bulletin d'ordre de souscription" }, { type: "fonds" }] },
      { actor: "client", who: "Client", title: "Signe le bulletin, vire sur le compte ségrégué", state: "signé · fonds reçus", docs: [] },
      { actor: "desk", who: "Desk", title: "Soumet l'adjudication en un bordereau", state: "transmise", docs: [{ type: "bordereau", variant: "Bordereau de soumission SVT" }] },
      { actor: "tiers", who: "Trésor · SVT", title: "Résultat de l'adjudication", state: "servie · non servie", docs: [{ type: "allocation" }, { type: "non_allocation" }] },
      { actor: "tiers", who: "Dépositaire", title: "Règlement-livraison, titres inscrits au nom du client", state: "réglée", clock: "T+n", docs: [{ type: "opere" }] },
    ],
  },
  {
    key: "achat",
    title: "Achat secondaire",
    intro: "Ligne cotée à la BVMAC. Même bulletin, passage « marché secondaire » ; l'ordre va à la société de bourse ; sa confirmation d'exécution est classée au Dépôt.",
    steps: [
      { actor: "client", who: "Client", title: "Intention d'achat : quantité, prix limite ou marché", state: "reçue", docs: [] },
      { actor: "desk", who: "Desk", title: "Confirme", state: "confirmée", docs: [{ type: "bulletin", variant: "Bulletin d'ordre (marché secondaire)" }, { type: "fonds", variant: "Appel de fonds : prix × quantité + frais" }] },
      { actor: "client", who: "Client", title: "Signe et vire", state: "signé · fonds reçus", docs: [] },
      { actor: "desk", who: "Desk", title: "Passe l'ordre à la société de bourse", state: "transmise", docs: [], received: "Confirmation d'exécution de la société de bourse, classée au Dépôt" },
      { actor: "tiers", who: "Dépositaire", title: "Règlement-livraison T+n", state: "réglée", clock: "T+n", docs: [{ type: "opere", variant: "Avis d'opéré : cours, frais, coupon couru" }] },
    ],
  },
  {
    key: "vente",
    title: "Vente · cession",
    intro: "Le client vend une ligne qu'il détient. Pas d'appel de fonds : le produit lui est viré. L'ordre porte l'attestation du cédant (titres libres, coupon couru).",
    steps: [
      { actor: "client", who: "Client", title: "Intention de vente depuis sa position", state: "reçue", docs: [] },
      { actor: "desk", who: "Desk", title: "Confirme (quantité détenue vérifiée)", state: "confirmée", docs: [{ type: "cession" }] },
      { actor: "client", who: "Client", title: "Signe l'ordre", state: "signé", docs: [] },
      { actor: "desk", who: "Desk", title: "Passe l'ordre (société de bourse, ou SVT pour un rachat de bons)", state: "transmise", docs: [] },
      { actor: "tiers", who: "Dépositaire", title: "Livraison des titres, produit viré au client", state: "réglée", docs: [{ type: "opere", variant: "Avis d'opéré : produit net de cession" }] },
    ],
  },
  {
    key: "opcvm",
    title: "OPCVM",
    intro: "Fonds ouverts à la souscription. Compte approuvé obligatoire. Ordres regroupés par société de gestion, exécutés à la VL du jour de cut-off.",
    steps: [
      { actor: "client", who: "Client", title: "Souscription (montant) ou rachat (parts)", state: "reçue", docs: [] },
      { actor: "desk", who: "Desk", title: "Confirme", state: "confirmée", docs: [{ type: "bulletin", variant: "Bulletin de souscription OPCVM" }, { type: "cession", variant: "Ordre de rachat" }, { type: "fonds", variant: "Appel de fonds (souscription)" }] },
      { actor: "desk", who: "Desk", title: "Regroupe par société de gestion avant le cut-off", state: "transmise", clock: "cut-off", docs: [{ type: "bordereau", variant: "Bordereau OPCVM" }] },
      { actor: "tiers", who: "Société de gestion", title: "Exécute à la VL, confirme le nombre de parts", state: "réglée", docs: [{ type: "opere", variant: "Avis d'opéré : parts, VL, droits" }] },
    ],
  },
  {
    key: "vie",
    title: "Vie du titre · fin",
    intro: "Une fois les titres en compte, jusqu'à la fin de la relation.",
    steps: [
      { actor: "tiers", who: "Émetteur", title: "Paie un coupon ou rembourse à l'échéance", state: "flux payé", docs: [{ type: "coupon" }] },
      { actor: "client", who: "Client", title: "Demande un relevé ou une attestation", state: "à la demande", docs: [{ type: "releve" }, { type: "attestation" }] },
      { actor: "client", who: "Client", title: "Dépose une réclamation", state: "reçue → traitée", clock: "accusé sous 2 jours ouvrés, réponse sous 30 jours", docs: [{ type: "reclamation" }] },
      { actor: "client", who: "Client", title: "Demande le transfert ou la clôture", state: "en clôture → clos", docs: [{ type: "transfert" }] },
      { actor: "desk", who: "Desk", title: "Exécute chez le dépositaire, clôt le dossier", state: "clos", docs: [{ type: "releve", variant: "Relevé final" }] },
    ],
  },
];
