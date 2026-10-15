import { createHash } from "node:crypto";
import type { BeacAuction } from "./beac";

/**
 * LE JOURNAL DES ANNONCES DE LA BEAC : CE QU'ON A VU, ET QUAND.
 *
 * POURQUOI IL EXISTE. La page d'annonces est lue toutes les heures depuis des
 * mois, et jetée. Zéro adjudication à venir en base. Or une séance programmée
 * puis annulée ne laisse AUCUNE trace ailleurs : la page montre l'état
 * courant, et le passé d'un calendrier n'existe nulle part. C'est la seule
 * matière de ce chantier qui se perd en temps réel, et chaque semaine sans ce
 * journal est une semaine d'histoire définitivement absente.
 *
 * TROIS FAITS SE DÉDUISENT ENSUITE, SANS AUTRE TRAVAIL :
 *   une adresse qui apparaît          un ajout au calendrier
 *   un contenu qui change             une révision, datée
 *   une adresse qui disparaît         une annulation ou un report
 *
 * Ce dernier est le signal le plus net qu'un Trésor perd l'accès au marché, et
 * aujourd'hui il est totalement invisible.
 *
 * CE QUE CE JOURNAL NE PEUT PAS DIRE, écrit ici plutôt que découvert plus
 * tard : la LISTE des annonces ne porte pas les montants. Pays, instrument,
 * maturité et date de séance se lisent dans le titre ; le montant annoncé est
 * à l'intérieur du PDF. Les révisions de MONTANT demanderont donc la lecture
 * des documents, qui est un autre lot. Ajouts, annulations et reports, eux,
 * se lisent de la liste seule.
 *
 * ON N'ÉCRIT QUE CE QUI CHANGE. À mille documents et vingt-quatre lectures par
 * jour, écrire chaque tour ferait huit millions de lignes par an pour dire
 * que rien ne bouge. L'empreinte du contenu utile décide.
 *
 * Module pur : il prend ce que la BEAC affiche et ce qu'on savait, et rend ce
 * qu'il y a lieu d'écrire. Aucune base, donc un test l'atteint sans en monter
 * une.
 */

/** Une ligne du journal, telle qu'elle s'écrit. */
export interface ObservationBeac {
  url: string;
  present: boolean;
  titre: string;
  genre?: string;
  pays?: string;
  instrument?: string;
  tenor?: string;
  /** La date de séance, en ISO, quand le titre la donne. */
  seance?: string;
  abondement: boolean;
  empreinte: string;
  /**
   * LA PAGE OÙ CETTE PIÈCE A ÉTÉ VUE, et c'est ce qui borne les disparitions.
   * Le journal porte maintenant quatre pages de statistiques en plus de celle
   * des annonces : sans cette colonne, le robot des annonces déclare disparu
   * tout ce qu'il ne voit pas, c'est-à-dire tout le reste.
   */
  page?: string;
}

/** Ce que la base sait du dernier état d'un document. */
export interface DernierEtat {
  url: string;
  present: boolean;
  empreinte: string;
  page?: string;
}

/**
 * L'empreinte du contenu UTILE, et le choix de ce qui en fait partie.
 *
 * Le titre n'y entre pas : la BEAC le remanie parfois sans que rien ne change
 * pour nous (« - République du Tchad » contre « - République Tchad », vu sur
 * deux communiqués voisins). Une empreinte sur le titre écrirait une révision
 * à chaque coquille, et le journal se remplirait de faux mouvements.
 *
 * Ce qui en fait partie est ce qui change la séance : son genre, son pays, son
 * instrument, sa maturité, sa date, et le fait qu'elle abonde une ligne
 * existante.
 */
export const empreinteDe = (a: BeacAuction): string =>
  createHash("sha256")
    .update([a.kind, a.country ?? "", a.instrument ?? "", a.tenor ?? "", a.on ?? "", a.abondement ? "1" : "0"].join("\u0000"))
    .digest("hex")
    .slice(0, 16);

const observation = (a: BeacAuction, present: boolean, page?: string): ObservationBeac => ({
  page,
  url: a.doc.url,
  present,
  titre: a.doc.title,
  genre: a.kind,
  pays: a.country,
  instrument: a.instrument,
  tenor: a.tenor,
  seance: a.on,
  abondement: a.abondement,
  empreinte: empreinteDe(a),
});

export interface Verdict {
  /** Ce qu'il y a lieu d'écrire, et rien de plus. */
  aEcrire: ObservationBeac[];
  /** Pour le journal du robot : ce que ce tour a trouvé. */
  ajouts: number;
  revisions: number;
  disparitions: number;
  inchanges: number;
}

/**
 * Ce qu'il y a lieu d'écrire, à partir de ce que la BEAC affiche et de ce que
 * la base savait.
 *
 * UNE LECTURE RATÉE N'EST PAS UNE PAGE VIDE, et la différence vaut toutes les
 * disparitions du journal. Le flux distingue déjà « aucune séance annoncée »
 * de « nous n'avons pas pu lire la BEAC », parce que confondre les deux
 * ferait dire au Guichet une chose qu'il ne sait pas. Ici l'enjeu est pire :
 * une page non lue, prise pour une page vide, écrirait une annulation sur
 * CHAQUE adjudication du calendrier, en une seule fois. D'où ce booléen, et
 * le refus d'écrire quoi que ce soit sans lui.
 */
export function journaliser(vues: BeacAuction[], connus: DernierEtat[], lectureReussie: boolean, page = "annonces"): Verdict {
  const vide: Verdict = { aEcrire: [], ajouts: 0, revisions: 0, disparitions: 0, inchanges: 0 };
  if (!lectureReussie) return vide;

  /* ON NE COMPARE QU'AUX LIGNES DE SA PROPRE PAGE. Une pièce vue ailleurs
     n'est pas absente d'ici : elle n'y a jamais été. */
  const siennes = connus.filter((c) => (c.page ?? "annonces") === page);
  const parUrl = new Map(siennes.map((c) => [c.url, c]));
  const aEcrire: ObservationBeac[] = [];
  let ajouts = 0;
  let revisions = 0;
  let inchanges = 0;

  const vuesParUrl = new Map<string, BeacAuction>();
  for (const a of vues) if (a.doc?.url) vuesParUrl.set(a.doc.url, a);

  for (const [url, a] of vuesParUrl) {
    const connu = parUrl.get(url);
    const o = observation(a, true, page);
    if (!connu) {
      aEcrire.push(o);
      ajouts++;
    } else if (connu.empreinte !== o.empreinte || !connu.present) {
      /* Un document revenu après une disparition compte comme une révision :
         il se réinscrit au calendrier, et c'est un fait à dater. */
      aEcrire.push(o);
      revisions++;
    } else {
      inchanges++;
    }
  }

  /* LES DISPARITIONS. On ne les écrit que sur un document encore marqué
     présent : sans cela, une adjudication absente depuis six mois ferait une
     ligne de plus à chaque tour, et le journal dirait vingt fois la même
     annulation. */
  let disparitions = 0;
  for (const c of siennes) {
    if (!c.present || vuesParUrl.has(c.url)) continue;
    aEcrire.push({ url: c.url, present: false, titre: "", abondement: false, empreinte: c.empreinte, page });
    disparitions++;
  }

  return { aEcrire, ajouts, revisions, disparitions, inchanges };
}
