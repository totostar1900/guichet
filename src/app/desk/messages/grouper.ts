/**
 * Ranger une réponse dans son échange, quand elle n'a pas de clef.
 *
 * DEPUIS LA MIGRATION 0058, une réponse porte l'échange dans lequel elle a été
 * écrite : rien à deviner. Ce fichier ne sert qu'aux réponses d'AVANT, et il
 * continuera de servir le jour où un envoi partira d'ailleurs que de la boîte
 * aux lettres.
 *
 * LA RÈGLE : une réponse rejoint l'échange qui était ouvert quand elle est
 * partie, c'est-à-dire celui du dernier message reçu avant elle. C'est ce que
 * l'opérateur avait sous les yeux, et c'est la seule chose qu'on sache avec
 * quelque chance d'être juste.
 *
 * POURQUOI PAS PAR L'OBJET. On pourrait comparer les objets. Ça marche tant que
 * l'opérateur garde celui du message auquel il répond, et ça casse le jour où il
 * l'ajuste, ce qui est précisément ce qu'on lui demande de faire. La date, elle,
 * ne s'ajuste pas.
 *
 * CE QUI RESTE FAUX. Une réponse écrite pendant qu'une autre affaire venait
 * d'arriver se rangera au mauvais endroit. C'est une estimation, elle ne
 * concerne que le passé, et elle vaut mieux que de laisser les réponses hors de
 * tout échange : un fil qui montre la question sans la réponse est pire qu'un
 * fil mal coupé.
 */

/** Un message reçu, réduit à ce que le rangement demande. */
export type Repere = { at: string; convKey?: string };

/**
 * `recus` n'a pas besoin d'être trié : la fonction cherche, elle ne parcourt pas
 * dans un ordre supposé. Un appelant qui trie d'abord ferait reposer le résultat
 * sur son tri, et le jour où il change, le rangement change sans prévenir.
 */
export function echangeDUneReponse(envoyeeLe: string, recus: Repere[], secours: string): string {
  const t = Date.parse(envoyeeLe);
  if (!Number.isFinite(t)) return secours;

  let avant: { at: number; cle: string } | undefined;
  let apres: { at: number; cle: string } | undefined;
  for (const r of recus) {
    if (!r.convKey) continue;
    const u = Date.parse(r.at);
    if (!Number.isFinite(u)) continue;
    if (u <= t) {
      if (!avant || u > avant.at) avant = { at: u, cle: r.convKey };
    } else if (!apres || u < apres.at) {
      apres = { at: u, cle: r.convKey };
    }
  }
  /* Le dernier reçu avant l'envoi : l'échange que l'opérateur avait sous les
     yeux. */
  if (avant) return avant.cle;
  /* Rien avant : le desk a écrit le premier, et le client a répondu ensuite. La
     réponse ouvre donc l'échange auquel le premier message reçu appartient. */
  if (apres) return apres.cle;
  /* Aucun message reçu de ce correspondant : des réponses seules. Elles se
     regroupent entre elles plutôt que de disparaître de l'écran. */
  return secours;
}

/** La clef de secours d'un correspondant à qui on n'a jamais reçu de message. */
export const cleDeSecours = (channel: string, addr: string): string => `r:${channel}:${addr.toLowerCase()}`;

/**
 * Le titre d'un échange : son objet s'il en a un, sinon sa date d'ouverture.
 *
 * Un échange sans objet est un échange WhatsApp, coupé au silence : « Échange du
 * 2 octobre » dit ce qu'il est, là où le premier mot du premier message ferait
 * croire à un sujet qui n'existe pas.
 */
export function titreDEchange(objet: string | undefined, ouvertLe: string, direLaDate: (iso: string) => string): string {
  const o = objet?.trim();
  return o || `Échange du ${direLaDate(ouvertLe)}`;
}
