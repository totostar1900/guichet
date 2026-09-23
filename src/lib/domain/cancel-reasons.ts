/**
 * Pourquoi un ordre est clos sans suite.
 *
 * Une liste fermée, et pour chaque motif la phrase que le client lit. Les deux
 * vont ensemble : un motif que le desk choisit sans que le client l'apprenne
 * n'est qu'une case à cocher, et une phrase écrite à la main chaque fois finit
 * par dire trois choses différentes de la même règle.
 *
 * La règle de la maison s'applique ici comme ailleurs : on dit ce qu'on sait.
 * « Les documents de votre dossier ne nous sont pas parvenus » est un fait.
 * « Votre dossier semble incomplet » serait une appréciation, et n'a pas sa
 * place dans un message signé de la maison.
 *
 * « autre » existe parce qu'une liste fermée est toujours incomplète : elle
 * exige alors la précision écrite, et c'est elle que le client lit.
 */
export interface CancelReason {
  key: string;
  /** Ce que l'opérateur choisit. */
  label: string;
  /** Ce que le client lit, à la place du motif nu. */
  toClient: string;
  /** Le motif ne se suffit pas : l'opérateur doit préciser. */
  needsNote?: boolean;
}

export const CANCEL_REASONS: CancelReason[] = [
  { key: "client", label: "Demande du client", toClient: "à votre demande" },
  { key: "echeance", label: "Échéance dépassée", toClient: "la date limite de dépôt des offres est passée" },
  { key: "documents", label: "Documents non reçus", toClient: "les pièces de votre dossier ne nous sont pas parvenues à temps" },
  { key: "ligne_close", label: "Ligne clôturée avant transmission", toClient: "la ligne a été clôturée avant que votre ordre puisse être transmis" },
  { key: "position", label: "Position insuffisante", toClient: "les titres à céder ne figurent pas en quantité suffisante sur votre compte" },
  { key: "capacite", label: "Hors de la capacité du client", toClient: "cet ordre dépasse ce que votre dossier nous permet d'exécuter" },
  { key: "doublon", label: "Doublon", toClient: "cet ordre faisait double emploi avec un autre déjà enregistré" },
  { key: "autre", label: "Autre motif", toClient: "", needsNote: true },
];

export const cancelReason = (key?: string): CancelReason | undefined => CANCEL_REASONS.find((r) => r.key === key);

/** Le motif tel qu'il se garde : la clé, puis la précision de l'opérateur. */
export const packReason = (key: string, note?: string): string => (note?.trim() ? `${key} · ${note.trim()}` : key);

/** La clé et la précision, relues depuis ce qui a été gardé. */
export function unpackReason(stored?: string): { key?: string; note?: string } {
  if (!stored) return {};
  const i = stored.indexOf(" · ");
  return i < 0 ? { key: stored } : { key: stored.slice(0, i), note: stored.slice(i + 3) };
}

/** Ce que le desk lit : le libellé du motif, et la précision quand il y en a une. */
export function reasonForDesk(stored?: string): string {
  const { key, note } = unpackReason(stored);
  const r = cancelReason(key);
  if (!r) return note ?? stored ?? "";
  return note ? `${r.label} · ${note}` : r.label;
}

/**
 * Ce que le client lit, en une phrase.
 *
 * La précision de l'opérateur prend la place de la phrase toute faite quand
 * elle existe : elle est plus proche du cas, et c'est pour cela qu'elle a été
 * écrite.
 */
export function reasonForClient(stored?: string): string {
  const { key, note } = unpackReason(stored);
  const r = cancelReason(key);
  return (note || r?.toClient || "").trim();
}
