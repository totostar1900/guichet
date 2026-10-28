"use client";

import { useState } from "react";
import { Attente, Bandeau, Boite, Champ, chiffres, MILLIERS, Pied, Recap, Tete, Trop } from "../commun";
import styles from "../commun.module.css";
import propres from "./epargne.module.css";

/**
 * UN MONTANT, UN JOUR, ET CE QUE ÇA FAIT DANS UN AN.
 *
 * LE JOUR EST LA SEULE QUESTION NEUVE de cette maquette — tout le reste vient
 * des pièces communes, et c'est voulu : « on ne veut pas une présentation
 * entièrement nouvelle à chaque fois ».
 *
 * Sur un téléphone, une date se choisit de deux façons : trois listes
 * déroulantes — jour, mois, année — qui demandent trois gestes et un déroulé
 * pour une seule décision ; ou une grille qu'on touche. Ici la question est
 * plus simple encore qu'une date : c'est un JOUR DU MOIS, qui revient.
 * Vingt-huit cases, et le choix se fait au pouce.
 *
 * POURQUOI VINGT-HUIT ET PAS TRENTE ET UN : le 31 n'existe pas sept mois sur
 * douze, et le 29 deux années sur trois. Un prélèvement programmé le 31 tombe,
 * selon les maisons, le 30, le 1er ou pas du tout — et c'est le genre de règle
 * qu'on découvre le jour où elle coûte un rejet. On ne propose donc que des
 * jours qui existent tous les mois, et on le dit.
 *
 * CE QUE ÇA FAIT DANS UN AN est à la date ce que « ≈ 11 titres » est au
 * montant : la conséquence sous la main, pendant qu'on choisit.
 */
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
      <Bandeau essaie="un montant, un jour du mois" />
      <Tete sur="Versement chaque mois" titre={titre} isin={isin} />

      {etape === 1 ? (
        <>
          <Boite
            id="montant"
            question="Combien voulez-vous verser chaque mois ?"
            valeur={brut ? MILLIERS(montant) : ""}
            onChange={(v) => setBrut(chiffres(v).slice(0, 10))}
            unite="FCFA"
            dessous={
              montant === 0 ? (
                <Attente>Ce que cela fait dans l&apos;année s&apos;affiche ici pendant que vous tapez.</Attente>
              ) : montant < minimum ? (
                <Trop>Le minimum est de {MILLIERS(minimum)} FCFA par versement.</Trop>
              ) : (
                <>
                  <b>{MILLIERS(montant * 12)} FCFA sur douze mois</b>
                  <span> · environ {parts.toFixed(2).replace(".", ",")} parts par versement, à la valeur du jour</span>
                </>
              )
            }
          />

          {/* LA MÊME CARTE QUE LE MONTANT, avec une grille au lieu d'un
              chiffre : c'est « Champ » qui la dessine, et non cette maquette.
              Elle la recopiait, jusqu'à ce qu'une épreuve le relève. */}
          <Champ
            question="Quel jour du mois ?"
            nomme="jourLabel"
            dessous={
              jour === null ? (
                <Attente>Les jours s&apos;arrêtent à 28 : au-delà, le mois n&apos;existe pas toujours.</Attente>
              ) : (
                <>
                  <b>Premier versement le {prochain}</b>
                  <span> · puis le {jour} de chaque mois</span>
                </>
              )
            }
          >
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
          </Champ>

          <Pied mot="Continuer" pret={pret} sur={() => setEtape(2)} note="Vous l'arrêtez quand vous voulez, sans frais." />
        </>
      ) : (
        <>
          <Recap
            titre="Vérifiez, puis envoyez"
            lignes={[
              { quoi: "Chaque mois", dit: `${MILLIERS(montant)} FCFA`, fort: true },
              { quoi: "Le", dit: `${jour} de chaque mois · premier versement le ${prochain}` },
              { quoi: "Sur douze mois", dit: `${MILLIERS(montant * 12)} FCFA` },
            ]}
            mot="Chaque mois, le desk passe pour vous un ordre réel sur cette ligne, à votre nom. Le nombre de parts dépend de la valeur du jour : il change d'un mois à l'autre. Vous l'arrêtez quand vous voulez."
          />
          <Pied mot="Envoyer au desk" sur={() => setEtape(1)} second="Corriger" surSecond={() => setEtape(1)} />
        </>
      )}
    </div>
  );
}
