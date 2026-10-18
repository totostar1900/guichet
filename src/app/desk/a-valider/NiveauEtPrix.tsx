"use client";

import { useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import { bondCalc, btaCalc, prixPourRendement, tauxPrecompteForRendement } from "@/lib/finance";
import type { NiveauMarche } from "@/lib/market/niveau-marche";
import { FeuilleDuNiveau } from "@/components/desk/FeuilleDuNiveau";
import styles from "./page.module.css";

/**
 * LE DESK ARRÊTE UN RENDEMENT, LE PRIX EN DÉCOULE.
 *
 * Avant, le champ portait un prix et rien d'autre, avec « 95 » pour valeur par
 * défaut et une phrase de contexte dessous. Deux choses manquaient.
 *
 *   LE DESK NE PENSE PAS EN PRIX. Il arrête « je sers à 7,28 % ». Le prix est
 *   une conséquence, et la lui faire calculer de tête, sur une convention
 *   ICMA avec période brisée, revient à lui demander une approximation qu'il
 *   n'aura aucun moyen de vérifier.
 *
 *   LE NIVEAU DU MARCHÉ N'ÉTAIT QU'UN POINT. Sans sa dispersion ni son âge,
 *   un chiffre de l'an dernier et un chiffre du mois dernier se ressemblent.
 *
 * LES DEUX CHAMPS SONT LIÉS DANS LES DEUX SENS, et c'est volontaire : une
 * pièce qui imprime un prix se saisit en prix, une décision se prend en
 * rendement. Le lien passe par `bondCalc` et son inverse, donc par la MÊME
 * fonction que la fiche emploiera pour afficher le rendement au client : le
 * nombre que le desk voit ici est celui que le client lira.
 *
 * SEUL LE CHAMP ATTENDU PAR LE FORMULAIRE EST POSTÉ. Le rendement est une
 * commodité de saisie, pas une donnée : l'offre porte un prix ou un taux
 * précompté, et ajouter un troisième champ qui dit la même chose ouvrirait la
 * porte aux trois qui se contredisent.
 */

type Bond = { nominal: number; couponRate: number; settleOn: string; maturityOn: string; lastCouponOn?: string | null };
type Bta = { nominal: number; settleOn: string; maturityOn: string };

const fr = (v: number, n = 2) => v.toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n });
const lire = (s: string): number | undefined => {
  const v = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : undefined;
};

export function NiveauEtPrix({
  kind,
  niveau,
  bond,
  bta,
  valeurInitiale,
  pays,
}: {
  kind: "BTA" | "OTA";
  niveau?: NiveauMarche;
  bond?: Bond;
  bta?: Bta;
  valeurInitiale?: number;
  pays?: string;
}) {
  const tr = useT();
  const [feuille, setFeuille] = useState(false);

  /* Le champ posté part du niveau mesuré quand il existe. Une valeur par
     défaut sortie de nulle part, « 95 » ou « 5,5 », a l'air d'une mesure une
     fois dans le champ : c'est le défaut que cet écran corrige. */
  const depart = valeurInitiale ?? depuisLeNiveau(kind, niveau, bond, bta);
  const [valeur, setValeur] = useState<string>(depart == null ? "" : fr(depart, kind === "BTA" ? 4 : 3));
  const [rdt, setRdt] = useState<string>("");

  /* Le rendement affiché suit la valeur postée, sauf pendant que le desk tape
     dans le champ du rendement : sans cela, l'arrondi de l'aller-retour ferait
     sauter le curseur au millième près à chaque frappe. */
  const [saisieEnRendement, setSaisieEnRendement] = useState(false);
  const rendementCalcule = useMemo(() => {
    const v = lire(valeur);
    if (v == null) return undefined;
    try {
      if (kind === "BTA" && bta) return btaCalc(bta, 10_000_000, v).yieldPct;
      if (bond) return bondCalc(bond, 10_000_000, v).irr;
    } catch {
      return undefined;
    }
    return undefined;
  }, [valeur, kind, bond, bta]);

  const rendementAffiche = saisieEnRendement ? rdt : rendementCalcule == null || !Number.isFinite(rendementCalcule) ? "" : fr(rendementCalcule);

  function changerRendement(texte: string) {
    setSaisieEnRendement(true);
    setRdt(texte);
    const y = lire(texte);
    if (y == null) return;
    const v = kind === "BTA" ? (bta ? tauxPrecompteForRendement(bta, y) : undefined) : bond ? prixPourRendement(bond, y) : undefined;
    if (v != null) setValeur(fr(v, kind === "BTA" ? 4 : 3));
  }

  const ecart = niveau && rendementCalcule != null && Number.isFinite(rendementCalcule) ? Math.round((niveau.point - rendementCalcule) * 100) : undefined;
  const loin = ecart != null && Math.abs(ecart) > 60;

  return (
    <>
      <div className={styles.niveauGrille}>
        <label className="field">
          {kind === "BTA" ? tr("Rendement retenu (%)") : tr("Rendement retenu (%)")}
          <input
            type="text"
            inputMode="decimal"
            value={rendementAffiche}
            onChange={(e) => changerRendement(e.target.value)}
            onBlur={() => setSaisieEnRendement(false)}
            placeholder={niveau ? fr(niveau.point) : tr("aucun niveau mesuré")}
          />
        </label>
        <label className="field">
          {kind === "BTA" ? tr("Taux précompté indicatif (%)") : tr("Prix Purpose (% du nominal)")}
          <input
            name={kind === "BTA" ? "precountRate" : "pricePct"}
            type="text"
            inputMode="decimal"
            value={valeur}
            onChange={(e) => {
              setSaisieEnRendement(false);
              setValeur(e.target.value);
            }}
          />
        </label>
      </div>

      <Niveau niveau={niveau} ecart={ecart} loin={loin} tr={tr} onVoir={() => setFeuille(true)} />
      {feuille && niveau ? <FeuilleDuNiveau niveau={niveau} pays={pays} onFermer={() => setFeuille(false)} /> : null}
    </>
  );
}

/** Ce que le marché a payé, ou le fait qu'il n'ait rien payé de comparable. */
function Niveau({
  niveau,
  ecart,
  loin,
  tr,
  onVoir,
}: {
  niveau?: NiveauMarche;
  ecart?: number;
  loin: boolean;
  tr: (s: string, v?: Record<string, string>) => string;
  onVoir: () => void;
}) {
  if (!niveau)
    return (
      <small className={styles.ref}>
        {tr("Aucune séance comparable : même Trésor, même panier d'échéance, ligne neuve.")}
        <em>{tr("Rien n'est proposé faute de mieux. Le desk décide seul, en le sachant.")}</em>
      </small>
    );

  const n = niveau;
  const pb = ecart == null ? null : `${ecart > 0 ? "+" : ""}${ecart} pb`;
  return (
    <small className={`${styles.ref} ${styles.refNiveau} ${loin ? styles.refThin : ""}`}>
      <b>
        {tr("Marché : {v} %", { v: fr(n.point) })} <span>{tr("fourchette {a} – {b} %", { a: fr(n.bas), b: fr(n.haut) })}</span>
      </b>
      <em>
        {tr("{n} séance(s) comparable(s) · la plus récente le {d}, il y a {j} jour(s) · panier « {p} »", {
          n: String(n.seances.length),
          d: n.derniere.sessionOn,
          j: String(n.ageJours),
          p: n.panier,
        })}
      </em>
      {n.uneSeule ? <em>{tr("Une seule séance : aucune dispersion mesurée, c'est la forme d'un seul carnet.")}</em> : null}
      {n.ecartees.abondements > 0 ? (
        <em>{tr("{n} abondement(s) écarté(s) : leur prix est conventionnel et leur rendement suit le reliquat.", { n: String(n.ecartees.abondements) })}</em>
      ) : null}
      {n.ecartees.nonRelues > 0 ? <em>{tr("{n} séance(s) écartée(s) faute d'être relue(s).", { n: String(n.ecartees.nonRelues) })}</em> : null}
      {pb ? <em className={loin ? styles.refLoin : undefined}>{tr("Écart au niveau mesuré : {v}", { v: pb })}</em> : null}
      <button type="button" className={styles.refVoir} onClick={onVoir}>
        {tr("Voir le détail")}
      </button>
    </small>
  );
}

/** Le prix, ou le taux, que le niveau mesuré donnerait tel quel. */
function depuisLeNiveau(kind: "BTA" | "OTA", niveau?: NiveauMarche, bond?: Bond, bta?: Bta): number | undefined {
  if (!niveau) return undefined;
  if (kind === "BTA") return bta ? tauxPrecompteForRendement(bta, niveau.point) : undefined;
  return bond ? prixPourRendement(bond, niveau.point) : undefined;
}
