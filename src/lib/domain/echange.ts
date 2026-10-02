/**
 * Ce qui fait un échange, et la clef qui le nomme.
 *
 * LE DÉFAUT QU'ON CORRIGE. La boîte aux lettres groupait par ADRESSE : tout ce
 * qu'un correspondant a jamais écrit tenait dans un fil unique. La BEAC envoie
 * un avis par séance, donc dix-sept affaires distinctes dans un seul fil sans
 * fin, où rien ne peut être dit réglé. Et l'étiquette, posée là, disait que la
 * personne EST une réclamation, alors que « réclamation » décrit un échange.
 *
 * TROIS CHEMINS, DU PLUS SÛR AU PLUS ESTIMÉ, et le premier qui répond l'emporte.
 *
 *   1. Les en-têtes. `In-Reply-To` nomme le message auquel on répond : c'est le
 *      seul chemin qui ne devine rien. Il dit l'appartenance au lieu de la
 *      supposer.
 *   2. L'objet, normalisé, chez le même correspondant. Les préfixes de réponse
 *      et de transfert tombent, les accents aussi, et la casse. Fiable, mais pas
 *      sûr : « Bonjour » n'identifie rien, c'est pourquoi l'adresse entre dans
 *      la clef.
 *   3. Le silence. WhatsApp n'a pas d'objet, et rien d'autre ne sépare deux
 *      affaires. Un nouvel échange commence après un silence. C'EST UNE
 *      ESTIMATION, et l'écran le dit en toutes lettres : une estimation
 *      présentée comme un fait est pire qu'un regroupement grossier.
 *
 * LA CLEF EST ÉCRITE À L'ARRIVÉE, pas recalculée à chaque lecture. Les
 * étiquettes et les reports s'accrochent à elle : recalculée, un changement de
 * règle les ferait sauter d'un échange à l'autre sans que personne ne comprenne.
 * Ce qu'un message a reçu, il le garde.
 */

/** Après ce silence, un échange sans objet est tenu pour clos. */
export const SILENCE_MS = 36 * 60 * 60 * 1000;

/** Au delà, la clef ne gagne plus rien en précision et encombre la table. */
const OBJET_MAX = 120;

/**
 * Les préfixes empilés par les messageries, dans les deux langues de la maison
 * et dans celles que les correspondants emploient.
 */
const PREFIXES = /^\s*(?:re|ref|rep|rép|tr|fw|fwd|rv|antw|aw)\s*(?:\[\d+\])?\s*:\s*/i;

/**
 * L'objet réduit à ce qui l'identifie : sans préfixe de réponse, sans accent,
 * sans casse, sans espaces en trop.
 */
export function normaliserObjet(objet: string | undefined): string {
  if (!objet) return "";
  let x = objet.replace(/\s+/g, " ").trim();
  /* Les préfixes s'empilent : « Re: TR : Re: … ». On les retire un par un
     jusqu'à ce qu'il n'en reste plus, sinon seul le premier tomberait et deux
     messages du même échange auraient deux clefs. */
  for (;;) {
    const y = x.replace(PREFIXES, "");
    if (y === x) break;
    x = y;
  }
  return x
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, OBJET_MAX);
}

export type Arrivee = {
  channel: "whatsapp" | "email";
  from: string;
  subject?: string;
  receivedAt: string;
  /** L'en-tête du courriel : le message auquel celui-ci répond. */
  inReplyTo?: string;
};

export type Voisins = {
  /** La clef de l'échange du message cité en réponse, si on le connaît. */
  cleDuParent?: string;
  /** Le dernier message du même correspondant, sur le même canal. */
  dernier?: { receivedAt: string; convKey?: string };
};

/** Par quel chemin la clef a été trouvée : l'écran s'en sert pour le dire. */
export type Chemin = "entete" | "objet" | "silence";

export type CleTrouvee = { cle: string; chemin: Chemin };

/**
 * `cleDEchange` ne lit rien et n'écrit rien : on lui donne l'arrivée et ses
 * voisins, elle rend la clef. C'est ce qui la rend vérifiable cas par cas,
 * y compris les cas qu'on ne voit qu'une fois par an.
 */
export function cleDEchange(a: Arrivee, v: Voisins): CleTrouvee {
  /* 1. L'en-tête : la réponse rejoint l'échange du message cité. */
  if (a.inReplyTo && v.cleDuParent) return { cle: v.cleDuParent, chemin: "entete" };

  /* 2. L'objet, chez le même correspondant. Un objet vide ne dit rien : il
        tombe au chemin suivant plutôt que de former une clef « sans objet » qui
        rassemblerait des affaires sans rapport. */
  const objet = normaliserObjet(a.subject);
  if (objet) return { cle: `o:${a.channel}:${a.from.toLowerCase()}:${objet}`, chemin: "objet" };

  /* 3. Le silence. Le message continue le précédent s'il arrive avant la fin du
        silence ; sinon il ouvre un échange, daté de lui-même. */
  const precedent = v.dernier;
  if (precedent?.convKey) {
    const ecart = Date.parse(a.receivedAt) - Date.parse(precedent.receivedAt);
    /* Un écart illisible ou négatif ne prouve pas la continuité : dans le doute
       on ouvre un échange, ce qui se répare d'un geste, au lieu de coller deux
       affaires, ce qui se remarque trop tard. */
    if (Number.isFinite(ecart) && ecart >= 0 && ecart < SILENCE_MS) return { cle: precedent.convKey, chemin: "silence" };
  }
  return { cle: `s:${a.channel}:${a.from.toLowerCase()}:${a.receivedAt}`, chemin: "silence" };
}

/** Le chemin se lit dans la clef : pas de colonne de plus pour le redire. */
export const cheminDeLaCle = (cle: string): Chemin => (cle.startsWith("o:") ? "objet" : "silence");
