/* Onboarding · KYC · compte-titres : domain model (see supabase/migrations/0006_kyc.sql). */

export type ClientKind = "physique" | "morale" | "groupement" | "institutionnel";
export type KycStatus = "brouillon" | "soumis" | "en_revue" | "complements" | "approuve" | "refuse" | "en_cloture" | "clos";

/*
 * LA PROCURATION N'EXISTE PLUS, ET C'EST UNE DÉCISION DE LA MAISON.
 *
 * Il y avait ici une `Mandate` : un pouvoir donné à un tiers de transmettre
 * des ordres au nom du client, préparé par le desk, signé des deux. Retirée
 * le 10 octobre 2026, parce que la règle de la maison est que le client est
 * SEUL à passer ses transactions.
 *
 * Elle ne s'exerçait de toute façon jamais à l'écran : aucun mandataire n'a
 * jamais pu se connecter, l'acte était de papier et l'ordre aurait transité
 * par une personne du desk. Un acte réglementaire que le produit n'honore
 * pas est une promesse qu'il ne tiendra pas le jour où on l'invoque.
 *
 * À ne pas confondre avec le mandat de PRÉLÈVEMENT (src/lib/domain/mandat.ts),
 * qui reste : celui-là autorise la maison à tirer sur le compte en banque du
 * client, il ne donne de pouvoir à personne sur ses titres.
 */

/** The end of the relationship: a transfer of positions and / or the closure of the account. */
export interface Closure {
  scope: "tout" | "partiel" | "vide";
  destination?: string;
  destinationAccount?: string;
  reason?: string;
  isins?: string[];
  docId?: string;
  docNumber?: string;
  requestedAt: string;
  requestedBy?: string;
  signedAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
}
export type RiskRating = "faible" | "moyen" | "eleve";

export type KycDocKind =
  | "piece_identite_recto"
  | "piece_identite_verso"
  | "selfie"
  | "justificatif_domicile"
  | "rib"
  | "niu"
  | "rccm"
  | "statuts"
  | "pouvoirs"
  | "beneficiaires_effectifs"
  | "recepisse"
  | "pv_mandataires"
  | "liste_membres"
  | "matrice_signataires"
  | "autre";

export interface KycDocument {
  kind: KycDocKind;
  /**
   * Ce que le client dit de cette pièce, quand elle n'a pas de genre.
   *
   * Les pièces attendues se nomment seules : un recto est un recto. Une pièce
   * libre, non : « bulletin de paie de septembre » se range dans un dossier,
   * « Autre pièce » n'y sert à personne et oblige le conseiller à l'ouvrir
   * pour savoir ce que c'est.
   */
  label?: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  verified?: boolean;
}

/**
 * Les personnes d'un dossier, et ce que chacune peut.
 *
 * `representant` : le signataire légal d'une société ou d'une association,
 * qui agit POUR le titulaire parce que le titulaire est une personne morale.
 * `cotitulaire` : les deux ou trois désignés d'un groupement, qui sont le
 * titulaire lui-même, en indivision. `beneficiaire_effectif` : celui qui
 * détient plus de 25 %, et qui ne passe aucun ordre à ce titre.
 *
 * Aucune des trois n'est un tiers à qui le client aurait donné pouvoir : ce
 * rôle-là, le mandataire, a été retiré le 10 octobre 2026 (voir plus haut).
 */
export interface KycPerson {
  role: "representant" | "cotitulaire" | "beneficiaire_effectif";
  name: string;
  /**
   * LA DATE DE NAISSANCE, DEMANDÉE DEPUIS LE 10 OCTOBRE 2026.
   *
   * Elle manquait, et son absence coûtait aux deux endroits où un nom seul
   * ne discrimine personne. Le contrôle sanctions reçoit le nom de chaque
   * personne du dossier, et son propre champ de notes demande d'écarter
   * l'homonymie « date de naissance comparée » : le desk ne l'avait pas
   * sous les yeux. Et le registre des personnes écartées accroche par le
   * numéro de pièce ou par le couple nom + date de naissance ; sans la
   * date, un représentant légal ne pouvait produire qu'une correspondance
   * de numéro, c'est à dire la seule prise que changer de pièce annule.
   */
  birthDate?: string;
  idNumber?: string;
  share?: number; // % for beneficial owners
  pep?: boolean;
}

export interface ClientFile {
  id: string;
  userId: string;
  kind: ClientKind;
  status: KycStatus;
  identity: {
    name: string; // person or entity
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    residentAbroad?: boolean;
    birthDate?: string;
    nationality?: string;
    profession?: string;
    taxId?: string; // NIU
    idType?: string;
    idNumber?: string;
    idExpiresOn?: string;
    registration?: string; // RCCM / récépissé
    legalForm?: string; // SARL, SA, association déclarée, indivision de mandataires…
    decisionRule?: string; // groupements: double signature, plafond…
  };
  persons: KycPerson[];
  documents: KycDocument[];
  funds: {
    source?: string;
    expectedAmount?: string;
    bankName?: string;
    /** Settlement account in the client's name : where sale, redemption, coupon and redemption proceeds are paid. */
    bankAccount?: string; // RIB / IBAN
    bankHolder?: string; // intitulé du compte, must match the client
    pep: boolean;
    pepDetails?: string;
  };
  profile: { objectives?: string; horizon?: string; experience?: string; riskTolerance?: string; lossCapacity?: string; category: "non_professionnel" | "professionnel" };
  consents: {
    dataAt?: string;
    whatsappAt?: string;
    conventionAt?: string;
    conventionMethod?: string;
    /**
     * La version du texte accepté (voir CONVENTION_VERSION).
     *
     * Absente, elle signifie « acceptée avant que les versions existent »,
     * donc un texte antérieur au mandat d'ouverture : la maison redemande.
     */
    conventionVersion?: string;
    /** Où le code d'acceptation est parti : la convention imprimée le nomme, et le client peut le relire à l'écran. */
    conventionTo?: string;
    pendingCodeHash?: string;
    pendingCodeAt?: string;
    /** Essais ratés sur le code en cours : au-delà de cinq il est brûlé. */
    pendingCodeTries?: number;
    /** La destination du code en cours, pour que l'écran puisse la nommer après un rechargement. */
    pendingCodeTo?: string;
  };
  review: { risk?: RiskRating; notes?: string; reviewedBy?: string; reviewedAt?: string; nextReviewOn?: string; custodianAccount?: string; requestedItems?: string };
  /** Sanctions / PEP screening: the officer's attestation (mandatory) and the last automatic pre-check (optional). */
  /** Acts on the file: the closure in progress. */
  acts?: { closure?: Closure };
  screening?: {
    attestedBy?: string;
    attestedAt?: string;
    lists?: string; // "Liste ONU, UE, OFAC ; PPE : recherche presse"
    outcome?: "aucun" | "faux_positif" | "confirme";
    notes?: string;
    auto?: { provider: string; checkedAt: string; queries: string[]; hits: { name: string; score: number; datasets: string[]; topics: string[]; url?: string }[]; error?: string };
  };
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export function emptyClientFile(userId: string, kind: ClientKind, name: string, contact: { phone?: string; email?: string }): Omit<ClientFile, "id"> {
  const now = new Date().toISOString();
  return {
    userId,
    kind,
    status: "brouillon",
    identity: { name, phone: contact.phone, email: contact.email, country: "Cameroun" },
    persons: [],
    documents: [],
    funds: { pep: false },
    profile: { category: kind === "institutionnel" ? "professionnel" : "non_professionnel" },
    consents: {},
    review: {},
    createdAt: now,
    updatedAt: now,
  };
}
