import { CLES_DE_REGLE, LIBELLE_DE_REGLE, baremeALaDate, cleDeRegle, fraisDuClient, recetteDeTiers, type BaremeDeFrais, type CleDeRegle, type HistoriqueDeFrais, type OperationDeFrais } from "@/lib/domain/frais";

/**
 * LE SUIVI DES FRAIS (14 novembre 2026, planche 4A) : trois chiffres et un tableau famille × opération, calculés SANS table à part.
 *
 * Chaque ordre exécuté porte déjà sa date, son montant et son état ; la règle de SA date se lit dans l'historique (`regleALaDate`),
 * donc le mois dernier ne bouge pas quand la direction change un taux. Rien ici n'est lu par le client : on y sépare ce que le
 * client paie à la maison (sa règle) de ce que la maison reçoit de tiers, que le client ne voit jamais.
 *
 * Ce que le suivi ne sait PAS encore : ce qui a réellement été reçu d'un partenaire ou d'un émetteur (le rapprochement avec leur
 * relevé n'existe pas), ni la rétrocession mensuelle sur encours. Les chiffres « reçu de tiers » sont donc ce qui est ATTENDU.
 */
export interface OrdreExecute {
  id: string;
  /** La ligne de l'ordre : le rapprochement range ce qui est attendu par fonds. */
  offerId: string;
  ref: string;
  /** Le jour de l'ordre (AAAA-MM-JJ) : la règle qui valait ce jour-là s'applique. */
  jour: string;
  famille: "fonds" | "titres" | "adjudication";
  operation: OperationDeFrais;
  /** Le montant sur lequel la règle s'applique (brut du fonds, principal du titre). */
  base: number;
  /** Les droits du fonds sur cette opération en francs, pour la part de droits qui revient à la maison ; zéro hors fonds. */
  droitsDuFonds: number;
  /** Un taux fixé sur la ligne elle-même (`Offer.commissionPct`) : il remplace la règle, et ce qu'il rapporte est à la maison. */
  fraisDeLaLigne: number;
  /** Réglé par le client ? Sinon : à encaisser. */
  regle: boolean;
}

export interface LigneDeSuivi {
  ordre: OrdreExecute;
  cle: CleDeRegle;
  /** Ce que le client paie à la maison sur cet ordre. */
  fraisDuClient: number;
  /** Ce que la maison attend d'un partenaire ou d'un émetteur sur cet ordre. */
  recetteDeTiers: number;
}

export interface Suivi {
  lignes: LigneDeSuivi[];
  /** Les frais du client sur les ordres exécutés et pas encore réglés. */
  aEncaisser: number;
  /** Les frais du client sur les ordres réglés. */
  encaisses: number;
  /** Ce que la maison attend de tiers sur les ordres exécutés (reçu : pas suivi). */
  aRecevoirDeTiers: number;
  /** Une ligne par règle, y compris celles qui n'ont rien : une case absente se voit. */
  parRegle: { cle: CleDeRegle; libelle: string; ordres: number; base: number; fraisDuClient: number; recetteDeTiers: number }[];
}

export function suiviDesFrais(ordres: OrdreExecute[], bareme: BaremeDeFrais, historique: HistoriqueDeFrais): Suivi {
  const lignes: LigneDeSuivi[] = [];
  for (const o of ordres) {
    const cle = cleDeRegle(o.famille, o.operation);
    if (!cle) continue;
    const regle = baremeALaDate(bareme, historique, o.jour)[cle];
    const frais = o.fraisDeLaLigne > 0 ? Math.round(o.fraisDeLaLigne) : fraisDuClient(regle, o.base, o.jour);
    lignes.push({ ordre: o, cle, fraisDuClient: frais, recetteDeTiers: recetteDeTiers(regle, o.base, o.jour, o.droitsDuFonds) });
  }
  const somme = (f: (l: LigneDeSuivi) => number, garde: (l: LigneDeSuivi) => boolean = () => true) => lignes.filter(garde).reduce((s, l) => s + f(l), 0);
  return {
    lignes,
    aEncaisser: somme((l) => l.fraisDuClient, (l) => !l.ordre.regle),
    encaisses: somme((l) => l.fraisDuClient, (l) => l.ordre.regle),
    aRecevoirDeTiers: somme((l) => l.recetteDeTiers),
    parRegle: CLES_DE_REGLE.map((cle) => {
      const l = lignes.filter((x) => x.cle === cle);
      return { cle, libelle: LIBELLE_DE_REGLE[cle], ordres: l.length, base: l.reduce((s, x) => s + x.ordre.base, 0), fraisDuClient: l.reduce((s, x) => s + x.fraisDuClient, 0), recetteDeTiers: l.reduce((s, x) => s + x.recetteDeTiers, 0) };
    }),
  };
}
