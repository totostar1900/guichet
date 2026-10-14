import type { SerieVue } from "@/lib/domain/fraicheur";
import type { Trimestre } from "./mur-echeances";

/**
 * LES TROIS ALERTES DU DESK SUR LA DETTE.
 *
 * UNE ALERTE N'EST PAS UN CHIFFRE QUI DÉPASSE, C'EST UNE PHRASE QUI DIT QUOI
 * FAIRE. Les trois pages de dette que nous venons de construire rendent des
 * mesures, et une mesure ne se regarde que si quelqu'un la regarde. Ces trois
 * alertes sont ce qui va chercher le desk quand il ne cherchait rien.
 *
 * ELLES NE SE RESSEMBLENT PAS, et c'est voulu : trois familles de défaut, pas
 * trois seuils sur le même chiffre.
 *
 *   LE SERVICE QUI VIENT est un fait du calendrier. Il n'est jamais anormal,
 *   il est seulement grand ou petit, et il se lit en avance de phase.
 *
 *   UNE SOURCE QUI SE TAIT est une panne, et elle ne se voit pas : rien ne
 *   manque à l'écran quand plus rien n'arrive. C'est la famille de défauts la
 *   plus coûteuse de la maison, et la seule qui exige qu'on la provoque.
 *
 *   UN TROU DANS LA SÉRIE est une faute de lecture déjà commise. Elle ne
 *   presse pas, mais elle fausse toutes les autres mesures en silence.
 *
 * AUCUNE N'EST UNE INJONCTION. Chacune porte ce qu'elle a mesuré et ce que le
 * desk peut en faire ; aucune ne déclenche quoi que ce soit, parce qu'une
 * alerte qui agit seule finit par agir à tort.
 */

export type Niveau = "info" | "attention" | "grave";

export interface Alerte {
  clef: string;
  niveau: Niveau;
  /** Le titre, court, qui tient sur une ligne. */
  titre: string;
  /** Ce qui a été mesuré, en toutes lettres et avec le chiffre. */
  dit: string;
  /** Ce que le desk peut en faire. Vide quand il n'y a rien à faire. */
  faire?: string;
  /** Où aller voir. */
  ou?: string;
}

const mds = (n: number) => `${(n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mds`;

/**
 * CE QUE LA ZONE DOIT SERVIR AU PROCHAIN TRIMESTRE.
 *
 * Les seuils ne sont pas ronds par hasard : la médiane trimestrielle mesurée
 * sur les douze prochains trimestres est de l'ordre de cent cinquante
 * milliards, et le plus lourd approche cinq cents. On prévient à deux cents,
 * on insiste à trois cent cinquante, et le seuil est écrit ici plutôt que
 * dans l'écran pour qu'il se discute.
 */
export const SEUIL_SERVICE_ATTENTION = 200e9;
export const SEUIL_SERVICE_GRAVE = 350e9;

export function alerteDuService(mur: Trimestre[]): Alerte | undefined {
  const prochain = mur[0];
  if (!prochain) return undefined;
  const du = prochain.capital + prochain.coupon;
  if (du <= 0) return undefined;
  const niveau: Niveau = du >= SEUIL_SERVICE_GRAVE ? "grave" : du >= SEUIL_SERVICE_ATTENTION ? "attention" : "info";
  const partAdjugee = du > 0 ? ((prochain.parPorte.adjuge.capital + prochain.parPorte.adjuge.coupon) / du) * 100 : 0;
  return {
    clef: `service-${prochain.clef}`,
    niveau,
    titre: `${mds(du)} à servir au ${prochain.clef}`,
    dit: `${mds(prochain.capital)} de capital et ${mds(prochain.coupon)} de coupons, sur ${prochain.lignes} ligne(s). ${Math.round(partAdjugee)} % passe par l'adjudication, dont nous ne voyons pas toutes les séances.`,
    faire: niveau === "info" ? undefined : "Regarder si les Trésors concernés ont annoncé le refinancement, et à quel coût.",
    ou: "/desk/dette",
  };
}

/**
 * UNE SOURCE QUI SE TAIT, ET POURQUOI C'EST LA PLUS COÛTEUSE.
 *
 * Rien ne manque à l'écran quand plus rien n'arrive : les pages affichent la
 * dernière valeur connue, qui a l'air d'une valeur. C'est la seule famille de
 * défauts qui exige qu'on aille la chercher, et le module `fraicheur` la
 * mesure déjà série par série. On ne refait donc pas le jugement, on le
 * relaie, en ne gardant que les séries de la dette.
 */
const SERIES_DE_DETTE = new Set(["serie-encours", "serie-adjudications", "serie-avis-emission", "serie-calendrier-beac"]);

export function alerteDesSources(vues: SerieVue[]): Alerte | undefined {
  const muettes = vues.filter((v) => SERIES_DE_DETTE.has(v.cle) && v.etat !== "recoit");
  if (!muettes.length) return undefined;
  const pire = muettes.reduce((a, v) => ((v.depuis ?? 0) > (a.depuis ?? 0) ? v : a));
  return {
    clef: "sources",
    niveau: muettes.some((v) => v.etat === "vide") ? "grave" : "attention",
    titre: muettes.length === 1 ? `${pire.quoi} ne reçoit plus` : `${muettes.length} séries de la dette ne reçoivent plus`,
    /* QUATRE FOIS LA MEME PHRASE N EST PAS QUATRE INFORMATIONS. Les quatre
       series taries rendaient « la serie n a jamais rien recu » repete mot
       pour mot : on nomme les series et on ne dit la phrase qu une fois,
       sauf si elles different vraiment. */
    dit: phraseDesSeries(muettes),
    faire: "Vérifier que la source publie encore, avant de conclure que le marché s'est arrêté.",
    ou: "/desk/sante",
  };
}

/**
 * UN TROU DANS LA SÉRIE D'ENCOURS.
 *
 * Une ligne absente d'une séance fait baisser le total exactement comme une
 * extinction de dette. Mesuré le 14 octobre 2026 : 784 relevés manquent, et
 * les confondre avec des remboursements ferait publier une courbe qui descend
 * quand c'est la lecture qui a lâché.
 */
export function alerteDesTrous(manquants: number, attendus: number, seances: number): Alerte | undefined {
  if (manquants <= 0 || attendus <= 0) return undefined;
  const part = (manquants / attendus) * 100;
  return {
    clef: "trous-encours",
    niveau: part >= 10 ? "grave" : part >= 2 ? "attention" : "info",
    titre: `${manquants} relevés d'encours manquent`,
    dit: `${part.toFixed(1)} % de la série, sur ${seances} séance(s). Une ligne absente fait baisser le total exactement comme un remboursement : tant qu'elle manque, la courbe descend là où c'est la lecture qui a lâché.`,
    faire: "Relire les séances trouées après une montée du lecteur, et porter au fournisseur ce qui n'est pas de nous.",
    ou: "/desk/bulletins",
  };
}

/** Une phrase pour plusieurs séries : les noms, puis le diagnostic commun. */
function phraseDesSeries(muettes: SerieVue[]): string {
  const distincts = [...new Set(muettes.map((v) => v.diagnostic).filter(Boolean))];
  const noms = muettes.map((v) => v.quoi).join(", ");
  if (distincts.length === 0) return noms;
  if (distincts.length === 1) return muettes.length === 1 ? distincts[0] : `${noms} : ${distincts[0]}`;
  /* Le point médian sépare, l'espace seule colle : vu à l'écran, quatre
     diagnostics bout à bout se lisaient comme une seule phrase bancale. */
  return muettes
    .map((v) => (v.diagnostic ? `${v.quoi} : ${v.diagnostic}` : ""))
    .filter(Boolean)
    .join(" · ");
}

/** Les trois, dans l ordre où le desk doit les lire : le plus grave d abord. */
const POIDS: Record<Niveau, number> = { grave: 0, attention: 1, info: 2 };

export function alertes(x: { mur: Trimestre[]; series: SerieVue[]; manquants: number; attendus: number; seances: number }): Alerte[] {
  return [alerteDuService(x.mur), alerteDesSources(x.series), alerteDesTrous(x.manquants, x.attendus, x.seances)]
    .filter((a): a is Alerte => !!a)
    .sort((a, b) => POIDS[a.niveau] - POIDS[b.niveau]);
}
