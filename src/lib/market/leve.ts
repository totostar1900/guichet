import type { BudgetEtat, Country } from "@/lib/domain/types";
import { compteDansLesResultats, type AuctionResult } from "./auction-results";
import { porteDesTitres } from "./budget";

/**
 * CE QUI A ÉTÉ LEVÉ, ET LE POURCENTAGE QU'ON NE CALCULERA PAS.
 *
 * La demande était « l'écart déclaré / levé » : le programme de titres publics
 * d'un côté — 400,0 milliards pour le Cameroun 2026 —, ce que l'État a
 * effectivement placé de l'autre, et le rapport des deux. La planche en donnait
 * même la phrase : « Cameroun : 78 % du programme levé à mi-parcours. »
 *
 * CE RAPPORT NE SE CALCULE PAS SUR CES DONNÉES, et c'est le résultat de ce
 * fichier. Trois raisons, chacune vérifiée sur le dépôt :
 *
 *  1. LE RELEVÉ COUVRE DES SEMAINES, PAS UN EXERCICE. Les huit séances
 *     camerounaises de 2026 vont du 3 août au 14 septembre : quarante-trois
 *     jours. Diviser 162,0 par 400,0 donnerait « 40 % du programme », alors
 *     que la phrase exacte est « 162,0 milliards sur six semaines de séances
 *     que la maison détient ». Le premier chiffre serait faux d'une précision
 *     rassurante ; le second est vrai et moins flatteur.
 *  2. LE PÉRIMÈTRE DE LA LIGNE DÉCLARÉE EST INCONNU. Le plan de financement
 *     écrit « Titres publics · marché monétaire, 400,0 » sans dire si c'est du
 *     brut émis ou du net d'amortissement. Les deux lectures sont courantes
 *     dans la zone, et elles ne donnent pas le même dénominateur.
 *  3. LES BTA SE RENOUVELLENT DANS L'ANNÉE. Un bon à treize semaines reconduit
 *     quatre fois lève quatre fois son montant en brut pour un seul
 *     financement. Leur échéance n'est pas relevée — elle est vide sur toutes
 *     les séances de bons du dépôt —, donc le roulement est invisible.
 *
 * CE QUI SE CALCULE, LUI, EST EXACT ET RÉPOND À LA VRAIE QUESTION. La note du
 * desk demandait : « le calendrier d'adjudications dira si les 400 milliards
 * tiennent ». Ce n'est pas « combien du programme est fait » — inconnaissable
 * ici — c'est « quand cet État se présente, obtient-il ce qu'il demande ».
 * Le Cameroun sert 91 % de ce qu'il annonce ; le Gabon, 49 %. Un État qui
 * place la moitié de ce qu'il annonce ne placera pas son programme, et cela se
 * mesure sans rien supposer.
 *
 * L'INCLUSION SUIT LA RÈGLE DE LA MAISON, `compteDansLesResultats`, et aucune
 * autre : « dix conditions finissent par diverger, et celle qui diverge est
 * celle qu'on oublie ». Les séances désertes — servi zéro — comptent donc,
 * parce qu'une adjudication déserte est un fait sur la demande.
 */
export interface Leve {
  pays: Country;
  exercice: number;
  seances: number;
  /** Des chiffres que personne n'a relus : ils comptent, et cela se dit. */
  nonRelues: number;
  /** Le montant servi n'est pas relevé : la somme les ignore, le compte les nomme. */
  sansMontant: number;
  /** Un code d'émission vu deux fois le même jour : le total peut doubler. */
  codesEnDouble: number;
  /** Le brut servi, en francs, toutes séances relevées confondues. */
  servi: number;
  parInstrument: { BTA: number; OTA: number };
  /** Le dénominateur honnête : les seules séances où les DEUX chiffres existent. */
  annonce: number;
  serviApparie: number;
  /** Ce que l'État obtient de ce qu'il demande. Le seul rapport que ce fichier rende. */
  tauxDeService?: number;
  premiere: string;
  derniere: string;
  joursCouverts: number;
}

const JOUR = 86_400_000;

/** Les jours couverts, bornes comprises : une seule séance couvre un jour, pas zéro. */
export const joursEntre = (a: string, b: string): number => {
  const x = new Date(a).getTime();
  const y = new Date(b).getTime();
  return Number.isNaN(x) || Number.isNaN(y) ? 0 : Math.round((y - x) / JOUR) + 1;
};

export function leveDe(resultats: AuctionResult[], pays: Country, exercice: number): Leve | undefined {
  const ex = resultats.filter((r) => r.country === pays && r.sessionOn.startsWith(String(exercice)) && compteDansLesResultats(r));
  if (ex.length === 0) return undefined;

  const dates = ex.map((r) => r.sessionOn).sort();
  const avecLesDeux = ex.filter((r) => r.served != null && r.announced != null && r.announced > 0);
  const annonce = avecLesDeux.reduce((s, r) => s + r.announced!, 0);
  const serviApparie = avecLesDeux.reduce((s, r) => s + r.served!, 0);

  /* UN MÊME CODE D'ÉMISSION DEUX FOIS LE MÊME JOUR est une lecture passée deux
     fois, pas deux tranches : les tranches d'une même opération portent des
     codes distincts — le Cameroun en aligne cinq le 14 septembre. On les
     COMPTE sans les retirer : laquelle des deux est la bonne ne se devine pas,
     et retirer au hasard remplacerait un doute visible par une erreur muette. */
  const vus = new Set<string>();
  let codesEnDouble = 0;
  for (const r of ex) {
    if (!r.codeEmission) continue;
    const k = `${r.sessionOn}|${r.codeEmission}`;
    if (vus.has(k)) codesEnDouble++;
    else vus.add(k);
  }

  return {
    pays,
    exercice,
    seances: ex.length,
    nonRelues: ex.filter((r) => !r.confirmedBy).length,
    sansMontant: ex.filter((r) => r.served == null).length,
    codesEnDouble,
    servi: ex.reduce((s, r) => s + (r.served ?? 0), 0),
    parInstrument: {
      BTA: ex.filter((r) => r.instrument === "BTA").reduce((s, r) => s + (r.served ?? 0), 0),
      OTA: ex.filter((r) => r.instrument === "OTA").reduce((s, r) => s + (r.served ?? 0), 0),
    },
    annonce,
    serviApparie,
    tauxDeService: annonce > 0 ? serviApparie / annonce : undefined,
    premiere: dates[0],
    derniere: dates[dates.length - 1],
    joursCouverts: joursEntre(dates[0], dates[dates.length - 1]),
  };
}

/**
 * POURQUOI LE RAPPORT AU PROGRAMME N'EST PAS RENDU.
 *
 * L'écran doit l'écrire, et l'écrire en nommant ce qui manque : un refus sans
 * motif se lit comme une lacune de l'outil, et quelqu'un finira par faire la
 * division à la main dans un coin.
 */
export const POURQUOI = {
  couverture: "Le relevé ne couvre que {jours} jour(s) de l'exercice, du {premiere} au {derniere} : le total vaut pour ces séances-là, pas pour l'année.",
  perimetre: "Le plan de financement ne dit pas si sa ligne de titres est du brut émis ou du net d'amortissement : les deux lectures existent dans la zone, et elles ne donnent pas le même dénominateur.",
  rollBta: "Les bons se renouvellent dans l'année et leur échéance n'est pas relevée : un bon à treize semaines reconduit quatre fois lève quatre fois son montant pour un seul financement.",
  planAnnuel: "Le calendrier déclaré, lui, porte du brut par instrument comme les séances : la part placée se calcule donc contre lui, et c'est un plancher — ce qui a été placé sur les séances relevées, pas sur l'année.",
  nonRelues: "{n} séance(s) portent des chiffres que personne n'a relus.",
  codesEnDouble: "{n} séance(s) portent un code d'émission déjà vu ce jour-là : le total peut les compter deux fois.",
} as const;

export type MotifDeRefus = { cle: keyof typeof POURQUOI; params: Record<string, string> };

export function pourquoiPasDeTaux(b: BudgetEtat, l: Leve): MotifDeRefus[] {
  const out: MotifDeRefus[] = [
    { cle: "couverture", params: { jours: String(l.joursCouverts), premiere: l.premiere, derniere: l.derniere } },
  ];
  /* LE PÉRIMÈTRE S'EST TRANCHÉ LE 25 OCTOBRE, sur les calendriers signés : le
     programme déclaré porte du brut par instrument, comme les séances. Le
     motif ne vaut donc plus que là où ce calendrier manque. */
  if (b.programmeBeac) out.push({ cle: "planAnnuel", params: {} });
  else {
    if (porteDesTitres(b)) out.push({ cle: "perimetre", params: {} });
    if (l.parInstrument.BTA > 0) out.push({ cle: "rollBta", params: {} });
  }
  if (l.nonRelues > 0) out.push({ cle: "nonRelues", params: { n: String(l.nonRelues) } });
  if (l.codesEnDouble > 0) out.push({ cle: "codesEnDouble", params: { n: String(l.codesEnDouble) } });
  return out;
}

/**
 * LE SEUIL, ET SA CONSÉQUENCE EN CLAIR. Sous trois quarts servis, placer un
 * programme de 400 milliards demande d'en annoncer plus de 530 : c'est ce que
 * le desk doit voir venir, et c'est pourquoi le nombre est celui-là.
 *
 * TROIS SÉANCES AU MOINS : une seule adjudication ratée est un incident, pas
 * une tendance, et le carnet ne doit pas crier sur un incident.
 */
/**
 * CE QUI A ÉTÉ PLACÉ SUR CE QUI ÉTAIT DÉCLARÉ, INSTRUMENT PAR INSTRUMENT.
 *
 * Le calendrier annuel déclare du BRUT par instrument, et les séances servent
 * du BRUT par instrument : les deux se comparent enfin sans supposer un
 * périmètre. C'est ce qui manquait, et qui faisait refuser le rapport.
 *
 * CE QUE CE RAPPORT N'EST PAS, et l'écran doit le dire avec lui : un taux
 * d'exécution de l'exercice. Le relevé des séances ne couvre que quelques
 * semaines, donc ce qu'il donne est un PLANCHER — ce qui a été placé sur les
 * séances que la maison détient, pas sur l'année.
 */
export const placeSurDeclare = (l: Leve, p: BudgetEtat["programmeBeac"]): { bta?: number; ota?: number; total?: number } | undefined => {
  if (!p) return undefined;
  /* LE SERVI EST EN FRANCS, LE DÉCLARÉ EN MILLIONS. Les ramener avant de
     diviser : sans cela le rapport sort un million de fois trop grand, et il
     aurait l'air d'un pourcentage plausible. */
  const r = (servi: number, declare?: number) => (declare && declare > 0 ? servi / 1_000_000 / declare : undefined);
  return { bta: r(l.parInstrument.BTA, p.bta), ota: r(l.parInstrument.OTA, p.ota), total: r(l.servi, p.total) };
};

export const SERVICE_FAIBLE = 0.75;
export const SEANCES_MINIMUM = 3;

export const serviceFaible = (l: Leve): boolean => l.seances >= SEANCES_MINIMUM && l.tauxDeService !== undefined && l.tauxDeService < SERVICE_FAIBLE;
