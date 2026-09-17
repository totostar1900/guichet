import type { ClientFile, ClientKind, KycDocKind, RiskRating } from "@/lib/domain/kyc";

/** Groupements: an informal group (indivision de mandataires) may hold at most this nominal; above it, the group must be a declared association. */
export const INDIVISION_CEILING = 25_000_000;
export const isIndivision = (f: ClientFile): boolean => f.kind === "groupement" && /indivision/i.test(f.identity.legalForm ?? "");
/** Declared 12-month amount band → lower bound in FCFA (for the form-level check). */
export function declaredAmountFloor(band?: string): number {
  if (!band) return 0;
  if (/plus de 100/i.test(band)) return 100_000_001;
  if (/25 à 100/i.test(band)) return 25_000_001;
  if (/5 à 25/i.test(band)) return 5_000_000;
  return 0;
}

export const KIND_LABEL: Record<ClientKind, string> = {
  physique: "Personne physique",
  morale: "Personne morale",
  groupement: "Groupement · tontine · association",
  institutionnel: "Institutionnel",
};

export const DOC_LABEL: Record<KycDocKind, string> = {
  piece_identite_recto: "Pièce d'identité — recto",
  piece_identite_verso: "Pièce d'identité — verso",
  selfie: "Selfie (vérification du visage)",
  justificatif_domicile: "Justificatif de domicile (< 3 mois)",
  rib: "RIB d'un compte au nom du client",
  niu: "Attestation NIU (identifiant fiscal)",
  rccm: "Extrait RCCM / immatriculation",
  statuts: "Statuts à jour",
  pouvoirs: "Pouvoirs / PV désignant les signataires",
  beneficiaires_effectifs: "Déclaration des bénéficiaires effectifs (> 25 %)",
  recepisse: "Récépissé de déclaration ou acte constitutif",
  pv_mandataires: "PV désignant les mandataires et la règle de décision",
  liste_membres: "Liste des membres",
  matrice_signataires: "Matrice des signataires et plafonds",
  autre: "Autre pièce",
};

/** Documents required before a file can be submitted, by client type. */
export function requiredDocs(kind: ClientKind, residentAbroad = false): KycDocKind[] {
  switch (kind) {
    case "physique":
      return residentAbroad
        ? ["piece_identite_recto", "piece_identite_verso", "selfie", "justificatif_domicile", "rib"]
        : ["piece_identite_recto", "piece_identite_verso", "selfie", "justificatif_domicile", "rib", "niu"];
    case "morale":
      return ["rccm", "statuts", "niu", "pouvoirs", "beneficiaires_effectifs", "piece_identite_recto", "rib"];
    case "groupement":
      return ["recepisse", "pv_mandataires", "piece_identite_recto", "rib", "liste_membres"];
    case "institutionnel":
      return ["rccm", "pouvoirs", "matrice_signataires", "rib"];
  }
}

export const STATUS_LABEL: Record<ClientFile["status"], string> = {
  brouillon: "Brouillon",
  soumis: "Soumis",
  en_revue: "En revue",
  complements: "Compléments demandés",
  approuve: "Approuvé — compte actif",
  refuse: "Refusé",
};

export const RISK_LABEL: Record<RiskRating, string> = { faible: "Faible", moyen: "Moyen", eleve: "Élevé" };

/** Review cadence by risk rating (years). */
export const REVIEW_YEARS: Record<RiskRating, number> = { faible: 5, moyen: 3, eleve: 1 };

/**
 * What blocks the submission — deliberately short: who you are, how to reach
 * you, where the money comes from, your profile, your consent. Pieces and the
 * rest are collected by the desk afterwards (see missingForApproval).
 */
export function missingForSubmission(f: ClientFile): string[] {
  const out: string[] = [];
  if (!f.identity.name) out.push("nom");
  if (!f.identity.phone && !f.identity.email) out.push("téléphone ou e-mail");
  if (isIndivision(f) && declaredAmountFloor(f.funds.expectedAmount) > INDIVISION_CEILING) out.push("association déclarée requise au-delà de 25 M FCFA (montant envisagé trop élevé pour une indivision)");
  if (!f.funds.source) out.push("origine des fonds");
  if (!f.profile.objectives || !f.profile.horizon || !f.profile.riskTolerance) out.push("questionnaire investisseur");
  if (!f.consents.dataAt) out.push("consentement données");
  if (!f.consents.conventionAt) out.push("acceptation de la convention");
  return out;
}

/** Everything the desk still needs before approving: identity details, representatives, every required piece. */
export function missingForApproval(f: ClientFile): string[] {
  const out: string[] = [...missingForSubmission(f)];
  if (f.kind === "physique" && !f.identity.birthDate) out.push("date de naissance");
  if (f.kind === "physique" && !f.identity.idNumber) out.push("numéro de pièce d'identité");
  if ((f.kind === "morale" || f.kind === "institutionnel") && !f.identity.registration) out.push("RCCM / immatriculation");
  if (f.kind === "groupement" && !f.identity.legalForm) out.push("forme du groupement");
  if (f.kind !== "physique" && f.persons.length === 0) out.push("au moins un représentant ou mandataire");
  const have = new Set(f.documents.map((d) => d.kind));
  requiredDocs(f.kind, f.identity.residentAbroad).forEach((k) => {
    if (!have.has(k)) out.push(DOC_LABEL[k].toLowerCase());
  });
  return out;
}

export interface Check {
  label: string;
  ok: boolean | null; // null = manual / not wired
  detail?: string;
}

/** Automatic checks the desk sees at review time. */
export function autoChecks(f: ClientFile, now = new Date()): Check[] {
  const checks: Check[] = [];
  if (f.kind === "physique" && f.identity.birthDate) {
    const age = (now.getTime() - new Date(f.identity.birthDate).getTime()) / (365.25 * 86400e3);
    checks.push({ label: "Majorité", ok: age >= 18, detail: `${Math.floor(age)} ans` });
  }
  if (f.identity.idExpiresOn) {
    const days = (new Date(f.identity.idExpiresOn).getTime() - now.getTime()) / 86400e3;
    checks.push({ label: "Validité de la pièce", ok: days > 0, detail: days > 0 ? `expire dans ${Math.floor(days)} j` : "expirée" });
  }
  const miss = missingForSubmission(f);
  checks.push({ label: "Dossier complet", ok: miss.length === 0, detail: miss.length ? `manque : ${miss.slice(0, 4).join(", ")}${miss.length > 4 ? "…" : ""}` : "toutes les pièces requises" });
  const pep = f.funds.pep || f.persons.some((p) => p.pep);
  checks.push({ label: "PPE déclaré", ok: !pep, detail: pep ? "oui — diligence renforcée" : "non" });
  if (f.kind === "groupement") checks.push({ label: "Forme du groupement", ok: isIndivision(f) ? declaredAmountFloor(f.funds.expectedAmount) <= INDIVISION_CEILING : true, detail: isIndivision(f) ? `indivision de mandataires — plafond ${(INDIVISION_CEILING / 1e6).toFixed(0)} M FCFA de nominal` : (f.identity.legalForm ?? "—") });
  checks.push({ label: "RIB du compte de règlement", ok: f.funds.bankAccount ? null : false, detail: f.funds.bankAccount ? `${f.funds.bankName ?? ""} ${f.funds.bankAccount} — intitulé « ${f.funds.bankHolder ?? "?"} » : même nom que le client, à vérifier sur la pièce` : "manquant — indispensable pour virer ventes, rachats et coupons" });
  const sc = f.screening;
  checks.push({
    label: "Sanctions / PPE (listes)",
    ok: sc?.attestedAt ? sc.outcome !== "confirme" : null,
    detail: sc?.attestedAt ? `attesté par ${sc.attestedBy} — ${sc.lists ?? "listes non précisées"} — ${sc.outcome === "aucun" ? "aucune correspondance" : sc.outcome === "faux_positif" ? "faux positif documenté" : "correspondance confirmée"}` : sc?.auto ? `pré-contrôle ${sc.auto.provider} : ${sc.auto.hits.length} correspondance(s) — attestation du desk requise` : "attestation du desk requise avant approbation",
  });
  if (f.identity.residentAbroad) checks.push({ label: "Résident à l'étranger", ok: null, detail: "appel vidéo + justificatif d'adresse étranger" });
  return checks;
}

/** Suggested rating from the file — the desk decides. */
export function suggestedRisk(f: ClientFile): RiskRating {
  if (f.funds.pep || f.persons.some((p) => p.pep)) return "eleve";
  if (f.identity.residentAbroad || f.kind === "groupement" || f.kind === "morale") return "moyen";
  return "faible";
}
