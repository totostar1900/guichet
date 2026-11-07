import type { PosteBudget } from "@/lib/domain/types";
import { slugDuPays } from "./budget";
import type { Country } from "@/lib/domain/types";

/** L'entité des pièces d'un budget : « budget-tchad-2026 ». */
export const entiteDeBudget = (pays: string, exercice = 2026): string => `budget-${slugDuPays(pays as Country)}-${exercice}`;

/**
 * LES PIÈCES CONSERVÉES : UNE COPIE DE CHAQUE SOURCE PUBLIQUE QUE LA FICHE CITE (7 novembre 2026, demande du dirigeant).
 *
 * Un lien se périme : un ministère déplace sa loi de finances, une agence retire un communiqué. La copie garde ce que le Desk a lu, tel qu'il l'a lu, avec son
 * empreinte (SHA-256) et le jour où elle a été prise. Elle sert à la preuve, pas à l'affichage : la fiche garde le lien d'origine à côté.
 */
export interface PieceArchivee {
  id: string;
  /** Ce que la pièce documente : « etat-tchad », « beac »… ou « budget-tchad-2026 ». */
  entite: string;
  objet: "budget" | "notation" | "autre";
  titre: string;
  editeur: string;
  /** L'adresse d'où elle vient, quand elle a été prise sur le web ; vide pour un fichier déposé à la main. */
  urlOrigine?: string;
  /** La clef dans le dépôt « sources ». */
  cle: string;
  sha256: string;
  taille: number;
  typeMime: string;
  archiveLe: string;
  archivePar: string;
}
export type NouvellePiece = Omit<PieceArchivee, "id">;

export const TAILLE_MAX_PIECE = 60 * 1024 * 1024;
export const TYPES_ADMIS = ["application/pdf", "text/html", "image/png", "image/jpeg"];

/** Le nom de fichier d'une pièce : la date, un bout de l'empreinte et le titre, pour qu'une même pièce prise deux fois ne s'écrase pas. */
export function cleDePiece(entite: string, titre: string, sha256: string, typeMime: string, jour: string): string {
  const ext = typeMime === "application/pdf" ? "pdf" : typeMime === "text/html" ? "html" : typeMime === "image/png" ? "png" : "jpg";
  const nom = titre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "piece";
  return `pieces/${entite}/${jour}-${sha256.slice(0, 8)}-${nom}.${ext}`;
}

/** Le type d'une réponse HTTP ou d'un fichier, ramené à un des types admis (ou rien). */
export function typeAdmis(contentType: string | null | undefined, octets?: Uint8Array): string | undefined {
  const t = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (octets && octets.length > 4 && String.fromCharCode(...octets.slice(0, 5)) === "%PDF-") return "application/pdf";
  return TYPES_ADMIS.includes(t) ? t : undefined;
}

/**
 * LES POSTES D'UN BUDGET, SAISIS UN PAR LIGNE : « libellé | montant en milliards de FCFA ».
 * Le montant se lit avec une virgule ou un point, et se range en millions (la mesure de la maison). Une ligne sans montant lisible est refusée avec son numéro :
 * rien n'est deviné.
 */
export function lireLignesBudget(texte: string): { postes: (PosteBudget & { titres?: boolean })[]; refus: string[] } {
  const postes: (PosteBudget & { titres?: boolean })[] = [];
  const refus: string[] = [];
  texte.split("\n").map((l) => l.trim()).forEach((l, i) => {
    if (!l) return;
    const [libelle, brut, marque] = l.split("|").map((x) => x.trim());
    const n = Number((brut ?? "").replace(/\s/g, "").replace(",", "."));
    if (!libelle || brut === undefined || brut === "" || !Number.isFinite(n)) {
      refus.push(`ligne ${i + 1} : « ${l} » (libellé | montant en milliards)`);
      return;
    }
    const cle = libelle.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || `ligne_${i + 1}`;
    postes.push({ cle, libelle, montant: Math.round(n * 1000), ...(marque?.toLowerCase() === "titres" ? { titres: true } : {}) });
  });
  return { postes, refus };
}
