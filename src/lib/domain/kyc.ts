/* Onboarding · KYC · compte-titres — domain model (see supabase/migrations/0006_kyc.sql). */

export type ClientKind = "physique" | "morale" | "groupement" | "institutionnel";
export type KycStatus = "brouillon" | "soumis" | "en_revue" | "complements" | "approuve" | "refuse";
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
  funds: { source?: string; expectedAmount?: string; bankName?: string; pep: boolean; pepDetails?: string };
  profile: { objectives?: string; horizon?: string; experience?: string; riskTolerance?: string; lossCapacity?: string; category: "non_professionnel" | "professionnel" };
  consents: { dataAt?: string; whatsappAt?: string; conventionAt?: string; conventionMethod?: string; pendingCodeHash?: string; pendingCodeAt?: string };
  review: { risk?: RiskRating; notes?: string; reviewedBy?: string; reviewedAt?: string; nextReviewOn?: string; custodianAccount?: string; requestedItems?: string };
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
