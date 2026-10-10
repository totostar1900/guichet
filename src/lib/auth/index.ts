import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { readDevSession } from "./dev";
import { isDesk, isResponsable, type Session } from "./types";
import { clientOrigin } from "@/lib/hosts";
import { estEssai } from "@/lib/essai";

// Sur la branche d essai, connexion de developpement : voir src/lib/essai.ts.
export const authMode = (): "supabase" | "dev" => (!estEssai() && process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "dev");

/** Current session, or null. Cached per request. Tier 2 comes from an approved KYC file. */
export const getSession = cache(async (): Promise<Session | null> => {
  let s: Session | null;
  if (authMode() === "supabase") {
    const { readSupabaseSession } = await import("./supabase");
    s = await readSupabaseSession();
  } else {
    s = await readDevSession();
  }
  if (s && s.role === "client") {
    const { repo } = await import("@/lib/data");
    s = await résoudreLAcces(s);
    const f = await repo().getClientFileByUser(s.userId);
    if (f) {
      /* Nominative structure: the account is active once the SVT has returned the
         sub-account number AND the client has accepted the convention, which now
         comes after the desk's approval. An approved file without that signature
         binds nobody : it opens nothing. */
      /* « ACCEPTÉE » VEUT DIRE « À JOUR », ET PAS SEULEMENT « SIGNÉE UN JOUR ».
         Le 9 octobre 2026 la convention reçoit le mandat d'ouverture : la
         maison ouvre des comptes au nom du client sur la foi de ce texte. Un
         client qui a signé la veille n'a mandaté personne, et le laisser
         passer pour habilité ferait reposer chaque ouverture sur un
         consentement qu'il n'a pas donné. Un seul point de vérité, ici :
         peutOPCVM, peutTitres et le palier en découlent sans le savoir. */
      const { conventionAJour } = await import("@/lib/kyc/checklist");
      s.conventionAccepted = conventionAJour(f);
      s.tier = f.status === "approuve" && f.review.custodianAccount && s.conventionAccepted ? 2 : 1;
      s.kycStatus = f.status;
      if (f.identity.name) s.name = f.identity.name;
      /* LE PLAFOND PAR ORDRE, CALCULÉ ICI OÙ LES DEUX ÉTAGES SONT SOUS LA
         MAIN : le dossier vient d'être lu, et l'accès a déposé le sien
         au-dessus. Le plus bas gagne, parce qu'une délégation ne dépasse
         jamais le mandat dont elle sort. Le garde le lira sans rien
         relire. */
      const { plafondEffectif } = await import("@/lib/domain/plafond-du-compte");
      const p = plafondEffectif(f.identity.plafondParOrdre, s.plafondParOrdre);
      s.plafondParOrdre = p.montant;
      s.plafondSource = p.source === "aucun" ? undefined : p.source;
    }
  }
  return s;
});

/**
 * L'ACCÈS NOMMÉ, RÉSOLU À CHAQUE REQUÊTE.
 *
 * Une personne qui n'a pas de dossier à elle peut en avoir un en tant que
 * représentant légal ou cotitulaire désigné d'un compte qui n'est pas une
 * personne physique. Dans ce cas la session CHANGE DE COMPTE : `userId`
 * devient celui du compte, et `agissant` garde la personne.
 *
 * LA LIAISON SE FAIT À LA PREMIÈRE CONNEXION, et une fois. Le desk accorde
 * l'accès à un canal, pas à un identifiant : il n'a de compte à créer pour
 * personne, et la preuve est le code reçu à ce canal. Dès la première
 * connexion, l'accès porte l'identifiant, et c'est lui qui sert ensuite : un
 * numéro qui changerait de mains ne reprendrait pas l'accès.
 *
 * RIEN NE SE DEVINE EN SILENCE. On ne cherche un accès que pour une personne
 * SANS dossier à elle : un client qui a son propre compte reste sur son
 * compte, quoi qu'il arrive, et ne risque jamais de se retrouver chez un
 * autre par un numéro mal saisi.
 */
async function résoudreLAcces(s: Session): Promise<Session> {
  const { repo } = await import("@/lib/data");
  const r = repo();
  try {
    if (await r.getClientFileByUser(s.userId)) return s;

    let acces = await r.accesDeLaPersonne(s.userId);
    if (!acces) {
      /* Pas encore lié : on cherche par le canal que cette connexion prouve.
         Un e-mail prouve l'adresse, une connexion par code prouve le numéro ;
         un numéro non vérifié ne prouve rien et n'ouvre rien. */
      const { clefDeCanal } = await import("@/lib/domain/acces-nomme");
      const clefs = [s.email ? clefDeCanal("email", s.email) : "", s.phoneVerified && s.phone ? clefDeCanal("phone", s.phone) : ""].filter(Boolean);
      for (const clef of clefs) {
        const trouve = await r.accesParCanal(clef);
        if (trouve && !trouve.personneUserId) {
          await r.lierAcces(trouve.id, s.userId);
          acces = { ...trouve, personneUserId: s.userId };
          break;
        }
      }
    }
    if (!acces || acces.revoqueLe || acces.personneUserId !== s.userId) return s;
    return { ...s, userId: acces.compteUserId, agissant: { accesId: acces.id, nom: acces.nom, role: acces.role }, plafondParOrdre: acces.plafondParOrdre };
  } catch {
    /* UNE LECTURE QUI ÉCHOUE NE DOIT PAS DÉCONNECTER TOUT LE MONDE : sans
       accès, la session reste celle de la personne, et c'est le cas de
       l'immense majorité des clients. */
    return s;
  }
}

/** Redirects to login when anonymous; returns the session otherwise. */
export async function requireSession(next = "/"): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  return s;
}

/** Second factor is mandatory for the desk unless DESK_MFA=off (documented escape hatch for the very first login). */
export const mfaRequired = (): boolean => process.env.DESK_MFA !== "off";

/** Desk-only areas and actions (opérateur or responsable), behind the second factor. */
export async function requireDesk(next = "/desk"): Promise<Session> {
  const s = await requireSession(next);
  // A client on the desk: back to the client site (on the desk host, « / » would only come back here).
  if (!isDesk(s)) redirect(`${clientOrigin()}/?acces=desk`);
  if (s.provider === "supabase" && mfaRequired()) {
    if (!s.mfaEnrolled) redirect(`/connexion/mfa?enrol=1&next=${encodeURIComponent(next)}`);
    if (!s.mfaVerified) redirect(`/connexion/mfa?next=${encodeURIComponent(next)}`);
  }
  return s;
}

/** Responsable-only: team, approvals. */
export async function requireResponsable(next = "/desk"): Promise<Session> {
  const s = await requireDesk(next);
  if (!isResponsable(s)) redirect("/desk?acces=responsable");
  return s;
}
