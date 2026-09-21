/* Onboarding · KYC · compte-titres : domain model (see supabase/migrations/0006_kyc.sql). */

export type ClientKind = "physique" | "morale" | "groupement" | "institutionnel";
export type KycStatus = "brouillon" | "soumis" | "en_revue" | "complements" | "approuve" | "refuse" | "en_cloture" | "clos";

/** A power given to a third party to pass orders: prepared by the desk, signed by the client and the mandatary. */
export interface Mandate {
  id: string;
  personName: string;
  idNumber?: string;
  relation?: string;
  scope: { orders: boolean; notices: boolean; fundsOnly: boolean };
  until?: string; // YYYY-MM-DD
  docId?: string;
  docNumber?: string;
  status: "prepare" | "signe" | "revoque";
  createdAt: string;
  createdBy?: string;
  signedAt?: string;
  revokedAt?: string;
}

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
  fileKey: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  verified?: boolean;
}

export interface KycPerson {
  role: "representant" | "mandataire" | "beneficiaire_effectif";
  name: string;
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
  consents: { dataAt?: string; whatsappAt?: string; conventionAt?: string; conventionMethod?: string; pendingCodeHash?: string; pendingCodeAt?: string };
  review: { risk?: RiskRating; notes?: string; reviewedBy?: string; reviewedAt?: string; nextReviewOn?: string; custodianAccount?: string; requestedItems?: string };
  /** Sanctions / PEP screening: the officer's attestation (mandatory) and the last automatic pre-check (optional). */
  /** Acts on the file: mandates given, the closure in progress. */
  acts?: { mandates?: Mandate[]; closure?: Closure };
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
