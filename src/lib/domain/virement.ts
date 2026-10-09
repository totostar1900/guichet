/**
 * LES VIREMENTS BANCAIRES ENTRANTS, ET POURQUOI ILS DEMANDENT UN MODULE.
 *
 * La banque a répondu non le 9 octobre 2026 : il n'y aura pas de numéro de
 * compte par client. Un virement entrant arrive donc sur un seul compte de
 * règlement, et la seule chose qui le rattache à quelqu'un est le motif que
 * le client a recopié à la main dans le formulaire de sa banque.
 *
 * Tout ce qui suit découle de cette phrase. Le motif est tapé par une
 * personne, lu par une autre, et il voyage à travers deux systèmes qui le
 * tronquent, le majusculent et parfois en mangent la ponctuation. Il arrive
 * donc souvent juste, parfois presque, et parfois pas du tout.
 *
 * TROIS RÈGLES GOUVERNENT CE FICHIER.
 *
 *   1. UN CRÉDIT EST UN FAIT, UN RATTACHEMENT EST UNE DÉCISION. La ligne du
 *      relevé existe dès sa lecture, même sans nom. Sans cela, l'argent arrivé
 *      sans nom n'existerait nulle part : ni au journal d'un client, ni dans
 *      une file, et personne ne saurait qu'il attend.
 *
 *   2. LA MACHINE LIT, UNE PERSONNE CONFIRME. C'est déjà la règle des
 *      adjudications, pour la même raison : deviner inscrirait l'argent d'un
 *      client au journal d'un autre, et un journal ne se corrige pas, il se
 *      contre-passe.
 *
 *   3. UNE LIGNE DE RELEVÉ NE S'INSCRIT QU'UNE FOIS. Un relevé relu deux fois
 *      créerait un double crédit, qui ressemble à deux virements et que
 *      personne ne verrait passer. L'empreinte ci-dessous est ce qui l'empêche,
 *      et la base la tient unique.
 */

/** Ce que la maison fait d'un crédit reçu. */
export type EtatDuVirement =
  | "recu" // lu au relevé, pas encore rattaché : de l'argent qui attend un nom
  | "rattache" // inscrit au journal d'un client
  | "restitue"; // renvoyé à son émetteur, fonds d'un tiers ou jamais identifié

/**
 * Un crédit, tel qu'il se garde.
 *
 * `motif` se garde TEL QUEL, sans normalisation : c'est la pièce. Le motif
 * normalisé se recalcule à la lecture, et une contestation porte sur ce que le
 * relevé imprime, pas sur ce que notre lecteur en a fait.
 */
export interface VirementRecu {
  id: string;
  /** La date de valeur, le jour où l'argent est arrivé. */
  at: string;
  amount: number;
  /** Le donneur d'ordre, tel qu'il est écrit au relevé. */
  payer: string;
  motif?: string;
  /** La référence de la ligne chez la banque, quand le relevé en porte une. */
  bankRef?: string;
  /** L'empreinte de la ligne : c'est elle qui est unique, voir `empreinte`. */
  fingerprint: string;
  state: EtatDuVirement;
  /** Le client, dès le rattachement. Absent, le crédit n'a pas de nom. */
  userId?: string;
  /** Le mouvement créé au journal du client. */
  cashEntry?: string;
  note?: string;
  readBy?: string;
  closedAt?: string;
  closedBy?: string;
  /** Obligatoire sur une restitution : c'est l'argent de quelqu'un qu'on renvoie. */
  closedReason?: string;
  createdAt: string;
}

export type NewVirement = Omit<VirementRecu, "id" | "state" | "createdAt" | "fingerprint"> & { fingerprint?: string };

/**
 * Au-delà de trois jours, un crédit sans nom appelle quelqu'un.
 *
 * Trois jours parce qu'un virement de place en met deux : en dessous, l'attente
 * est normale et la file se range d'elle-même. Au-delà, c'est un client qui
 * regarde une page vide en se demandant où est son argent.
 */
export const JOURS_AVANT_ALERTE = 3;

const SANS_ACCENT = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

/**
 * Les mots qui ne distinguent personne.
 *
 * Les comparer ferait concorder « MME ABENA » et « MME MVONDO », et les garder
 * ferait différer « ABENA MARIE » et « MME ABENA MARIE ». Les formes sociales
 * y sont pour la même raison : une banque écrit « SARL TECHNOPLUS » là où le
 * dossier dit « TECHNOPLUS SARL ».
 */
const MOTS_VIDES = new Set(["M", "MR", "MME", "MLLE", "MONSIEUR", "MADAME", "DE", "DU", "DES", "LA", "LE", "LES", "ET", "SARL", "SA", "SAS", "SNC", "SCI", "ETS", "ETABLISSEMENTS", "GIE", "EURL", "SASU"]);

const motsDUnNom = (s: string): string[] =>
  SANS_ACCENT(s)
    .split(/[^A-Z0-9]+/)
    .filter((w) => w.length >= 2 && !MOTS_VIDES.has(w));

/**
 * L'alphabet des références d'alimentation, répété ici exprès.
 *
 * Il vit dans `cash.ts`, qui fabrique les références ; il est redit ici, qui
 * les reconnaît. La duplication est assumée : ce module doit pouvoir dire
 * « ce motif contient un caractère que nos références n'emploient pas » sans
 * dépendre de celui qui les produit, et le cliquet vérifie que les deux
 * alphabets restent les mêmes.
 */
export const ALPHABET_REFERENCE = "ACDEFGHJKLMNPQRTUVWXY349";
const DANS_L_ALPHABET = (s: string) => [...s].every((c) => ALPHABET_REFERENCE.includes(c));

/**
 * Les références que le motif pourrait porter, dans l'ordre où elles méritent
 * d'être essayées.
 *
 * « PROVISION PR-QHDK4T » donne les jetons PROVISION, PR et QHDK4T : d'où le
 * détour par les jetons plutôt qu'une expression régulière sur la chaîne
 * entière, qui lirait « PROVISION » comme un PR suivi de sept caractères.
 *
 * Un jeton de six caractères SEUL est aussi candidat, parce qu'un client qui
 * oublie le préfixe est fréquent et que rien ne se décide ici : la résolution
 * confronte ces candidats aux références réelles, et un montant ou une date
 * n'en est jamais une, leurs chiffres n'étant pas dans l'alphabet.
 */
export function motifsCandidats(motif: string): string[] {
  const jetons = SANS_ACCENT(motif).split(/[^A-Z0-9]+/).filter(Boolean);
  const out: string[] = [];
  const pousser = (six: string) => {
    const ref = `PR-${six}`;
    if (six.length === 6 && !out.includes(ref)) out.push(ref);
  };
  jetons.forEach((jeton, i) => {
    if (/^PR[A-Z0-9]{6}$/.test(jeton)) pousser(jeton.slice(2));
    else if (jeton === "PR" && jetons[i + 1]) pousser(jetons[i + 1].slice(0, 6));
  });
  /* Les jetons nus viennent après : une référence préfixée dans la même ligne
     doit gagner, puisque le client l'a écrite exprès. */
  for (const jeton of jetons) if (jeton.length === 6 && DANS_L_ALPHABET(jeton)) pousser(jeton);
  return out;
}

/** Une substitution, une insertion ou une suppression, et pas deux. */
function aUnCaractereDOffset(a: string, b: string): boolean {
  if (a === b) return false;
  if (a.length === b.length) {
    let n = 0;
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) n += 1;
    return n === 1;
  }
  const [court, long] = a.length < b.length ? [a, b] : [b, a];
  if (long.length - court.length !== 1) return false;
  for (let i = 0; i <= court.length; i += 1) if (long.slice(0, i) + long.slice(i + 1) === court) return true;
  return false;
}

export type Resolution =
  | { kind: "exacte"; ref: string; userId: string }
  | { kind: "proche"; candidats: { ref: string; userId: string }[] }
  | { kind: "aucune" };

/**
 * Du motif au client, ou à l'aveu qu'on ne sait pas.
 *
 * `proche` existe pour le cas mesuré : nos références n'emploient ni O ni 0,
 * et un client qui écrit PR-OTLA9M a voulu écrire PR-NTLA9M. La maison ne le
 * décide pas pour lui, elle le propose : un rattachement faux met l'argent
 * d'un client au journal d'un autre, et il n'existe pas de bouton pour
 * défaire ça.
 */
export function resoudreLeMotif(motif: string | undefined, refs: Map<string, string>): Resolution {
  if (!motif) return { kind: "aucune" };
  const candidats = motifsCandidats(motif);
  for (const c of candidats) {
    const userId = refs.get(c);
    if (userId) return { kind: "exacte", ref: c, userId };
  }
  const proches: { ref: string; userId: string }[] = [];
  for (const c of candidats) {
    const six = c.slice(3);
    for (const [ref, userId] of refs) {
      if (aUnCaractereDOffset(six, ref.slice(3)) && !proches.some((p) => p.ref === ref)) proches.push({ ref, userId });
    }
  }
  return proches.length ? { kind: "proche", candidats: proches } : { kind: "aucune" };
}

export type Intitule = "concorde" | "differe" | "inconnu";

/**
 * Le donneur d'ordre est-il le titulaire déclaré ?
 *
 * L'article 3 de la convention refuse et restitue tout versement d'un tiers,
 * et c'est le seul contrôle que la maison fasse d'office sur un virement : il
 * ne regarde pas l'opportunité du versement, seulement son origine.
 *
 * La comparaison est tolérante dans un seul sens : tous les mots du nom le plus
 * court doivent se retrouver dans l'autre. « ABENA MARIE » passe pour « MME
 * ABENA MARIE CLAIRE », « SARL TECHNOPLUS » ne passe pas pour « ABENA MARIE
 * CLAIRE ». `inconnu` n'est pas un demi-oui : c'est un dossier sans intitulé
 * de compte déclaré, donc une question à poser au client, pas un doute à lever
 * d'un clic.
 */
export function intituleConcordant(payer: string | undefined, holder: string | undefined): Intitule {
  const declare = motsDUnNom(holder ?? "");
  if (!declare.length) return "inconnu";
  const recu = motsDUnNom(payer ?? "");
  if (!recu.length) return "inconnu";
  const [court, long] = recu.length <= declare.length ? [recu, declare] : [declare, recu];
  return court.every((w) => long.includes(w)) ? "concorde" : "differe";
}

export type Verdict = "a_rattacher" | "tiers" | "intitule_inconnu" | "proche" | "orphelin";

/**
 * Ce que l'écran doit montrer pour une ligne, en un mot.
 *
 * Un seul de ces cinq verdicts ouvre un geste unique, « Rattacher » : les
 * quatre autres montrent et attendent. C'est le partage entre ce que la
 * machine peut conclure et ce qu'une personne doit trancher.
 */
export function verdictDuVirement(r: Resolution, intitule: Intitule): Verdict {
  if (r.kind === "aucune") return "orphelin";
  if (r.kind === "proche") return "proche";
  if (intitule === "differe") return "tiers";
  if (intitule === "inconnu") return "intitule_inconnu";
  return "a_rattacher";
}

/**
 * L'EMPREINTE D'UNE LIGNE DE RELEVÉ, ET POURQUOI ELLE N'EST PAS LA RÉFÉRENCE
 * DE LA BANQUE.
 *
 * Les relevés de la zone n'en portent pas toujours, et quand ils en portent
 * une, elle se recopie à la main : la demander serait ajouter la saisie la plus
 * ennuyeuse de l'écran pour garantir la chose la plus importante, ce qui finit
 * toujours de la même façon.
 *
 * Elle est donc DÉRIVÉE de ce que la ligne dit : jour, montant, donneur
 * d'ordre, motif. Un relevé collé deux fois rend deux fois les mêmes
 * empreintes, et la base refuse les secondes.
 *
 * LE PRIX À DIRE : deux virements réellement identiques le même jour, du même
 * donneur, pour le même montant et le même motif rendent la même empreinte. Ce
 * cas existe, il est rare, et il se tranche à la main : l'opérateur confirme
 * qu'il s'agit d'un second virement, `occurrence` monte, et la décision laisse
 * sa trace au lieu d'être supposée.
 */
export function empreinte(l: { at: string; amount: number; payer: string; motif?: string }, occurrence = 1): string {
  const base = [l.at.slice(0, 10), Math.round(l.amount), SANS_ACCENT(l.payer).replace(/[^A-Z0-9]+/g, ""), SANS_ACCENT(l.motif ?? "").replace(/[^A-Z0-9]+/g, "")].join("|");
  let h = 2166136261;
  for (let i = 0; i < base.length; i += 1) {
    h ^= base.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `${l.at.slice(0, 10)}-${h.toString(36).toUpperCase().padStart(7, "0")}${occurrence > 1 ? `-${occurrence}` : ""}`;
}

export interface LigneLue {
  at: string;
  amount: number;
  payer: string;
  motif?: string;
  /**
   * L'empreinte de la ligne, pour reconnaître d'un coup d'œil celles qui sont
   * déjà inscrites.
   *
   * Elle se recalcule au serveur à partir des mêmes champs : rien de ce que
   * l'écran montre d'une ligne lue n'est modifiable, et c'est ce qui la rend
   * stable. Une correction se fait dans le texte collé, qui se relit.
   */
  fingerprint: string;
  /** La ligne telle qu'elle a été collée : c'est elle qu'on relit en cas de doute. */
  brut: string;
}

const MOIS_JOUR_AN = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/;
const ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/;

function laDate(ligne: string): string | undefined {
  const iso = ISO.exec(ligne);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = MOIS_JOUR_AN.exec(ligne);
  if (!m) return undefined;
  const [, j, mo, a] = m;
  const an = a.length === 2 ? `20${a}` : a;
  /* Un relevé de la zone écrit jour/mois : l'inverse donnerait le 10 septembre
     pour le 9 octobre, un décalage d'un mois qu'aucun total ne révèle. */
  const jour = Number(j);
  const mois = Number(mo);
  if (jour < 1 || jour > 31 || mois < 1 || mois > 12) return undefined;
  return `${an}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

/**
 * Le montant d'une ligne : le dernier nombre, et seulement s'il est gros.
 *
 * Le dernier, parce qu'un relevé finit par ses colonnes chiffrées et commence
 * par sa date. Gros, parce qu'un numéro de pièce ou une année traîne partout
 * et qu'aucun virement de la maison ne fait moins de mille francs. Le franc
 * CFA n'a pas de centimes : une virgule dans un relevé est un séparateur de
 * milliers autant qu'une décimale, donc les deux se lisent comme un séparateur
 * et le montant s'arrondit.
 */
function leMontant(ligne: string): number | undefined {
  /* LA DATE ET LA RÉFÉRENCE PARTENT D'ABORD, et ce n'est pas une précaution :
     « PR-UCKRK9   500 000 » se lisait 9 500 000, le 9 final de la référence
     se collant au montant par-dessus les espaces. Un virement de 500 000
     entrait au journal pour neuf millions et demi, et rien dans la page ne le
     disait. Mesuré à l'écran, le 9 octobre 2026. */
  const sansBruit = ligne
    .replace(ISO, " ")
    .replace(MOIS_JOUR_AN, " ")
    .replace(/\bPR[\s-]?[A-Z0-9]{6}\b/gi, " ");
  /* Un séparateur de milliers est UN caractère suivi de trois chiffres. Sans
     cette borne, deux nombres séparés par des espaces n'en font qu'un. */
  const nombres = [...sansBruit.matchAll(/\d+(?:[ .,' ]\d{3})*/g)].map((m) => m[0]);
  for (let i = nombres.length - 1; i >= 0; i -= 1) {
    const brut = nombres[i].replace(/[\s.,' ]/g, "");
    if (!/^\d+$/.test(brut)) continue;
    const n = Number(brut);
    if (n >= 1000) return n;
  }
  return undefined;
}

/**
 * Lire un relevé collé, et ne rien perdre en silence.
 *
 * Les lignes illisibles reviennent avec les autres, parce qu'une ligne tombée
 * sans bruit est un virement orphelin de plus et que la page doit pouvoir la
 * montrer. Acquitter n'est pas se taire.
 */
export function lireLeReleve(texte: string): { lignes: LigneLue[]; illisibles: string[] } {
  const lignes: LigneLue[] = [];
  const illisibles: string[] = [];
  for (const brut of texte.split(/\r?\n/)) {
    const ligne = brut.trim();
    if (!ligne) continue;
    const at = laDate(ligne);
    const amount = leMontant(ligne);
    if (!at || !amount) {
      illisibles.push(ligne);
      continue;
    }
    /* Un relevé n'a pas de colonnes stables d'une banque à l'autre : on ne
       découpe donc pas, on RETIRE ce qu'on sait nommer, et ce qui reste est le
       donneur d'ordre. Les mots de la mécanique bancaire partent avec, sans
       quoi « VIR RECU » deviendrait la moitié de chaque nom. */
    const motif = motifsCandidats(ligne)[0];
    const payer = ligne
      .replace(ISO, " ")
      .replace(MOIS_JOUR_AN, " ")
      .replace(/\bPR[\s-]?[A-Z0-9]{6}\b/gi, " ")
      .replace(/\d[\d\s.,']*\d|\d/g, " ")
      .replace(/\b(VIR|VIREMENT|RE[CÇ]U|CREDIT|TRANSFERT|PROVISION|EPARGNE|POUR|DE|DU)\b/gi, " ")
      .replace(/[^A-Za-zÀ-ÿ' -]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    lignes.push({ at, amount, payer, motif, fingerprint: empreinte({ at, amount, payer, motif }), brut: ligne });
  }
  return { lignes, illisibles };
}

/** L'âge d'un crédit sans nom, en jours. C'est lui qui range la file. */
export function anciennete(v: Pick<VirementRecu, "at">, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(`${v.at.slice(0, 10)}T00:00:00Z`).getTime()) / 86_400_000));
}

/** Ce qu'une restitution exige avant de partir : un motif écrit, jamais supposé. */
export function peutRestituer(v: Pick<VirementRecu, "state">, motif: string | undefined): boolean {
  return v.state === "recu" && Boolean(motif && motif.trim().length >= 3);
}
