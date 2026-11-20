/**
 * QUAND L'APPLICATION SE VERROUILLE (19 novembre 2026, le client : « chez d'autres applications, l'application se verrouille quand on la laisse ouverte et inerte, ou quand on la quitte plus de 30 secondes » ; « pas réglable par le client »).
 *
 * Deux seuils, FIXES, qui ne se règlent pas :
 * - on QUITTE l'application plus de 5 minutes : verrou au retour ;
 * - on la LAISSE OUVERTE ET INERTE plus de 5 minutes (défiler, toucher, écrire comptent comme une activité) : verrou.
 *
 * LA SIGNATURE D'UN ORDRE OBLIGE À SORTIR chercher le code dans l'e-mail ou dans WhatsApp, et le dossier à ouvrir l'appareil photo : quand un code vient d'être envoyé, la tolérance passe à 10 minutes.
 *
 * Fonction PURE, sans horloge ni stockage : le navigateur lui donne les heures, et l'épreuve lui en invente. Les minuteurs d'un navigateur sont gelés en arrière-plan : on compare des heures, jamais des durées comptées.
 */
export const SEUIL_ARRIERE_PLAN = 300_000;
export const SEUIL_INERTIE = 300_000;
export const TOLERANCE_APRES_UN_CODE = 600_000;

export type EtatDuVerrou = {
  maintenant: number;
  /** l'heure où l'application a quitté l'écran, s'il y est revenu depuis */
  quitteLe?: number;
  /** la dernière activité (toucher, défilement, frappe) */
  derniereActivite: number;
  /** jusqu'à quand un code envoyé repousse le verrou */
  graceJusqua?: number;
};

export function faudraitVerrouiller(e: EtatDuVerrou): boolean {
  const grace = e.graceJusqua !== undefined && e.maintenant < e.graceJusqua;
  if (e.quitteLe !== undefined) {
    const absent = e.maintenant - e.quitteLe;
    if (absent > (grace ? TOLERANCE_APRES_UN_CODE : SEUIL_ARRIERE_PLAN)) return true;
  }
  const inerte = e.maintenant - e.derniereActivite;
  return inerte > (grace ? TOLERANCE_APRES_UN_CODE : SEUIL_INERTIE);
}

/** Le navigateur note ici qu'un code vient de partir : le verrou attend. */
export const CLE_GRACE = "guichet_verrou_grace";
export const CLE_VERROU = "guichet_verrou";
export function reporterLeVerrou(): void {
  try {
    sessionStorage.setItem(CLE_GRACE, String(Date.now() + TOLERANCE_APRES_UN_CODE));
  } catch {
    // stockage refusé : le verrou garde ses seuils ordinaires
  }
}

/**
 * SIX CHIFFRES (19 novembre 2026, le client : « six chiffres », comme Revolut) : un million de combinaisons au lieu de dix mille, pour un code qui se tape au pouce. Un seul endroit dit le nombre : le clavier, le serveur et les textes le lisent ici.
 */
export const CHIFFRES_DU_CODE = 6;
export const FORME_DU_CODE = new RegExp(`^\\d{${CHIFFRES_DU_CODE}}$`);
export const MESSAGE_FORME_DU_CODE = `Le code comporte ${CHIFFRES_DU_CODE} chiffres.`;
/** Un chiffre répété, ou une suite montante ou descendante : le premier code qu'on essaierait sur un téléphone trouvé. */
export function codeTropSimple(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  const monte = "0123456789012345678901234567890123456789".includes(pin);
  const descend = "9876543210987654321098765432109876543210".includes(pin);
  return monte || descend;
}
