"use client";

import { useState } from "react";
import styles from "../ordre/maquette.module.css";
import propres from "./epargne.module.css";

/**
 * UN MONTANT, UN JOUR, ET CE QUE ÇA FAIT DANS UN AN.
 *
 * LE JOUR EST LA QUESTION NEUVE. Sur un téléphone, une date se choisit de
 * deux façons : trois listes déroulantes — jour, mois, année — qui demandent
 * trois gestes et un déroulé pour une seule décision ; ou une grille qu'on
 * touche. Ici la question est plus simple encore qu'une date : c'est un JOUR
 * DU MOIS, qui revient. Vingt-huit cases, et le choix se fait au pouce.
 *
 * POURQUOI VINGT-HUIT ET PAS TRENTE ET UN : le 31 n'existe pas sept mois sur
 * douze, et le 29 deux années sur trois. Un prélèvement programmé le 31
 * tombe, selon les maisons, le 30, le 1er ou pas du tout — et c'est le genre
 * de règle qu'on découvre le jour où elle coûte un rejet. On ne propose donc
 * que des jours qui existent tous les mois, et on le dit.
 *
 * CE QUE ÇA FAIT DANS UN AN est à la date ce que « ≈ 11 titres » est au
 * montant : la conséquence sous la main, pendant qu'on choisit. Douze
 * versements de 50 000 font 600 000 — personne ne le calcule de tête en
 * décidant, et c'est pourtant la seule question qui compte.
 */
const MILLIERS = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ");
const chiffres = (v: string) => v.replace(/\D/g, "");
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function MaquetteEpargne({ titre, isin, vl, minimum }: { titre: string; isin: string; vl: number; minimum: number }) {
  const [brut, setBrut] = useState("");
  const [jour, setJour] = useState<number | null>(null);
  const [etape, setEtape] = useState<1 | 2>(1);

  const montant = Number(chiffres(brut) || 0);
  const parts = vl > 0 ? montant / vl : 0;
  const pret = montant >= minimum && jour !== null;

  /* Le premier versement : le prochain « jour » à venir, sans rien promettre
     d'autre — la maquette ne connaît pas le calendrier de la banque. */
  const prochain = (() => {
    if (jour === null) return "";
    const d = new Date();
    const cible = new Date(d.getFullYear(), d.getMonth() + (d.getDate() >= jour ? 1 : 0), jour);
    return `${cible.getDate()} ${MOIS[cible.getMonth()]} ${cible.getFullYear()}`;
  })();

  return (
    <div className={styles.ecran}>
      <p className={styles.bandeau}>
        Maquette · rien n&apos;est envoyé · <span>un montant, un jour du mois</span>
      </p>

      <header className={styles.tete}>
        <span className={styles.marche}>Versement chaque mois</span>
        <h1 className={styles.titre}>{titre}</h1>
        <span className={styles.isin}>{isin}</span>
      </header>

      {etape === 1 ? (
        <>
          <section className={styles.carte}>
            <label className={styles.champLabel} htmlFor="montant">
              Combien voulez-vous verser chaque mois ?
            </label>
            <div className={styles.saisie}>
              <input id="montant" inputMode="numeric" autoComplete="off" placeholder="0" value={brut ? MILLIERS(montant) : ""} onChange={(e) => setBrut(chiffres(e.target.value).slice(0, 10))} />
              <span className={styles.unite}>FCFA</span>
            </div>
            <p className={styles.equiv} aria-live="polite">
              {montant === 0 ? (
                <span className={styles.equivVide}>Ce que cela fait dans l&apos;année s&apos;affiche ici pendant que vous tapez.</span>
              ) : montant < minimum ? (
                <span className={styles.equivCourt}>Le minimum est de {MILLIERS(minimum)} FCFA par versement.</span>
              ) : (
                <>
                  <b>{MILLIERS(montant * 12)} FCFA sur douze mois</b>
                  <span>
                    {" "}· environ {parts.toFixed(2).replace(".", ",")} parts par versement, à la valeur du jour
                  </span>
                </>
              )}
            </p>
          </section>

          <section className={styles.carte}>
            <span className={styles.champLabel} id="jourLabel">
              Quel jour du mois ?
            </span>
            {/* VINGT-HUIT CASES, ET LE POUCE CHOISIT. Une liste déroulante
                demanderait un geste pour l'ouvrir, un pour défiler, un pour
                choisir — trois pour une décision qui en vaut un. */}
            <div className={propres.grille} role="group" aria-labelledby="jourLabel">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((j) => (
                <button key={j} type="button" aria-pressed={jour === j} className={jour === j ? propres.jourOn : propres.jour} onClick={() => setJour(j)}>
                  {j}
                </button>
              ))}
            </div>
            <p className={styles.equiv} aria-live="polite">
              {jour === null ? (
                <span className={styles.equivVide}>Les jours s&apos;arrêtent à 28 : au-delà, le mois n&apos;existe pas toujours.</span>
              ) : (
                <>
                  <b>Premier versement le {prochain}</b>
                  <span> · puis le {jour} de chaque mois</span>
                </>
              )}
            </p>
          </section>

          <div className={styles.pied}>
            <button type="button" className={styles.action} disabled={!pret} onClick={() => setEtape(2)}>
              Continuer
            </button>
            <small>Vous l&apos;arrêtez quand vous voulez, sans frais.</small>
          </div>
        </>
      ) : (
        <>
          <section className={styles.carte}>
            <h2 className={styles.recapTitre}>Vérifiez, puis envoyez</h2>
            <dl className={styles.recap}>
              <div className={styles.recapFort}>
                <dt>Chaque mois</dt>
                <dd>{MILLIERS(montant)} FCFA</dd>
              </div>
              <div>
                <dt>Le</dt>
                <dd>{jour} de chaque mois · premier versement le {prochain}</dd>
              </div>
              <div>
                <dt>Sur douze mois</dt>
                <dd>{MILLIERS(montant * 12)} FCFA</dd>
              </div>
              <div>
                <dt>On vous répond</dt>
                <dd className={styles.coordonnees}>
                  <span>Georges Nitcheu</span>
                  <span>georges.nitcheu@gmail.com</span>
                  <span>WhatsApp +237 6 87 67 67 67</span>
                </dd>
              </div>
            </dl>
            {/* CE QU'UN VERSEMENT PROGRAMMÉ N'EST PAS : un placement garanti.
                Le dire ici, une fois, vaut mieux qu'une étoile en bas de page. */}
            <p className={styles.recapMot}>
              Chaque mois, le desk passe pour vous un ordre réel sur cette ligne, à votre nom. Le nombre de parts dépend de la valeur du jour : il change d&apos;un mois à
              l&apos;autre. Vous l&apos;arrêtez quand vous voulez.
            </p>
          </section>

          <div className={styles.pied}>
            <button type="button" className={styles.action} onClick={() => setEtape(1)}>
              Envoyer au desk
            </button>
            <button type="button" className={styles.second} onClick={() => setEtape(1)}>
              Corriger
            </button>
          </div>
        </>
      )}
    </div>
  );
}
