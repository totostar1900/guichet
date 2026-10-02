import type { CashEntry, CashKind } from "./cash";

/**
 * Ce qui est échu, et ce qui est réellement arrivé.
 *
 * L'application connaissait la date d'un coupon, jamais son encaissement. Elle
 * disait donc « échu », qui est vérifié, et jamais « reçu », qui ne l'était
 * pas, et ce mot prudent était la seule chose qui tenait lieu de comptabilité.
 * Un client lisait « 180 000 FCFA échus depuis le 14 mars » sans savoir si
 * l'argent était là.
 *
 * Trois états, et la distinction est tout le service :
 *
 *   À VENIR  : l'échéance n'est pas passée. Rien à faire.
 *   ATTENDU  : l'échéance est passée, le journal ne porte rien. C'est une
 *              créance sur l'émetteur, et le nombre de jours de retard est
 *              l'information que le desk doit voir.
 *   ENCAISSÉ : un mouvement du journal porte la clef de ce flux. Là seulement
 *              le mot « reçu » est permis, et là seulement un réinvestissement
 *              a de quoi se financer.
 *
 * Le rapprochement se fait par une CLEF portée par le mouvement, et non par un
 * rapprochement de montants et de dates. Deux coupons du même jour et du même
 * montant sur deux lignes voisines se confondraient, et une comptabilité qui
 * devine n'est pas une comptabilité. La clef est écrite au moment où l'on
 * enregistre, une fois pour toutes.
 *
 * Module sans dépendance d'exécution : il se lit du serveur comme du
 * navigateur, et un test l'atteint sans monter de base.
 */

/** Un flux tel que l'échéancier d'une ligne le donne. */
export interface Flux {
  date: string;
  amount: number;
  label: string;
}

/** Ce qu'une ligne tenue apporte au rapprochement. */
export interface LigneTenue {
  /** L'opération réglée qui a créé la position : elle identifie la ligne du client. */
  intentId: string;
  titre: string;
  /** Les flux dont la date est passée. */
  echus: Flux[];
  /** Ceux dont la date ne l'est pas. */
  aVenir: Flux[];
}

export type EtatEncaissement = "encaisse" | "attendu" | "a_venir";

export interface FluxSuivi extends Flux {
  /** La clef qui relie ce flux à son mouvement au journal. */
  cle: string;
  intentId: string;
  titre: string;
  etat: EtatEncaissement;
  /** Les jours écoulés depuis l'échéance, pour un flux attendu. */
  retardJours?: number;
  /** Le jour de valeur du mouvement qui le porte, pour un flux encaissé. */
  encaisseLe?: string;
  /**
   * Ce qui a réellement été reçu, quand ce flux est encaissé.
   *
   * Ce n'est pas « amount », qui reste ce que l'échéancier annonçait. Les deux
   * diffèrent dès qu'un émetteur paie autre chose que ce qu'il devait, et
   * c'est ce montant-ci qui compte dans un rendement.
   */
  montantRecu?: number;
}

const jour = (iso: string) => iso.slice(0, 10);

/**
 * La clef d'un flux : l'opération, la date, le montant, et son rang.
 *
 * Le rang ne sert qu'au cas pathologique de deux flux identiques le même jour
 * sur la même ligne. Sans lui, les deux partageraient une clef et le second
 * paraîtrait encaissé dès que le premier l'est.
 */
export const cleDuFlux = (intentId: string, f: Flux, rang = 0): string =>
  `${intentId}|${jour(f.date)}|${Math.round(f.amount)}${rang ? `|${rang}` : ""}`;

/** Les clefs d'un échéancier, les doublons recevant leur rang. */
function clesDe(intentId: string, flux: Flux[]): string[] {
  const vus = new Map<string, number>();
  return flux.map((f) => {
    const nu = cleDuFlux(intentId, f);
    const n = vus.get(nu) ?? 0;
    vus.set(nu, n + 1);
    return cleDuFlux(intentId, f, n);
  });
}

/**
 * La nature comptable d'un flux, d'après ce que l'échéancier l'appelle.
 *
 * Un flux qui rend du capital solde la ligne d'autant : il se range en
 * remboursement même quand il porte aussi le dernier coupon. Le libellé
 * complet reste écrit sur le mouvement, et rien ne se perd.
 */
export const natureDuFlux = (label: string): CashKind => (/capital|remboursement/i.test(label) ? "remboursement" : "coupon");

/**
 * Les flux d'un client, chacun dans son état, du plus ancien au plus récent.
 *
 * Un mouvement du journal qui ne porte pas de clef ne rapproche rien : ce sont
 * les provisions, les règlements, les frais, qui ne répondent d'aucune
 * échéance. Seuls les mouvements clefés comptent ici.
 */
export function suivre(lignes: LigneTenue[], entries: CashEntry[], now = new Date()): FluxSuivi[] {
  const aujourdHui = jour(now.toISOString());
  const parCle = new Map<string, CashEntry>();
  for (const e of entries) if (e.flowKey && !parCle.has(e.flowKey)) parCle.set(e.flowKey, e);

  const out: FluxSuivi[] = [];
  for (const l of lignes) {
    const tous = [...l.echus, ...l.aVenir];
    const cles = clesDe(l.intentId, tous);
    tous.forEach((f, i) => {
      const cle = cles[i];
      const porte = parCle.get(cle);
      const passe = jour(f.date) <= aujourdHui;
      const etat: EtatEncaissement = porte ? "encaisse" : passe ? "attendu" : "a_venir";
      out.push({
        ...f,
        cle,
        intentId: l.intentId,
        titre: l.titre,
        etat,
        retardJours: etat === "attendu" ? Math.max(0, Math.round((Date.parse(aujourdHui) - Date.parse(jour(f.date))) / 86_400_000)) : undefined,
        encaisseLe: porte ? jour(porte.at) : undefined,
        montantRecu: porte?.amount,
      });
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Ce que l'émetteur doit et qui n'est pas arrivé : la file de travail du desk. */
export const attendus = (suivis: FluxSuivi[]): FluxSuivi[] => suivis.filter((f) => f.etat === "attendu");

/**
 * Ce qui est arrivé, au montant et à la date du mouvement qui le porte.
 *
 * C'est la seule liste qu'un calcul de rendement a le droit de lire. Un flux
 * dont la date est passée sans qu'on ait constaté le crédit n'est pas de
 * l'argent revenu, et le compter en ferait un.
 */
export const encaisses = (suivis: FluxSuivi[]): { date: string; amount: number; label: string }[] =>
  suivis
    .filter((f) => f.etat === "encaisse")
    .map((f) => ({ date: f.encaisseLe ?? f.date, amount: f.montantRecu ?? f.amount, label: f.label }));

/** Ce qui est arrivé et disponible, depuis une date : de quoi financer un réinvestissement. */
export function encaisseDepuis(suivis: FluxSuivi[], depuis?: string): number {
  return suivis.filter((f) => f.etat === "encaisse" && (!depuis || f.date >= depuis)).reduce((s, f) => s + f.amount, 0);
}

/**
 * Le compte des trois états, pour une bande de chiffres.
 *
 * `retardMax` est le chiffre qui décide : un coupon en retard de trois jours
 * est un délai de place, un coupon en retard de soixante jours est un incident
 * dont quelqu'un doit être informé.
 */
export function bilan(suivis: FluxSuivi[]): { encaisse: number; attendu: number; aVenir: number; nbAttendus: number; retardMax: number } {
  const somme = (e: EtatEncaissement) => suivis.filter((f) => f.etat === e).reduce((s, f) => s + f.amount, 0);
  const enRetard = attendus(suivis);
  return {
    encaisse: somme("encaisse"),
    attendu: somme("attendu"),
    aVenir: somme("a_venir"),
    nbAttendus: enRetard.length,
    retardMax: enRetard.reduce((m, f) => Math.max(m, f.retardJours ?? 0), 0),
  };
}
