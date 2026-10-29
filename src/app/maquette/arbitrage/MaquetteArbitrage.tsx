"use client";

import { useState } from "react";
import { FENETRE_MAX_JOURS } from "@/lib/domain/arbitrage";
import { Attente, Bandeau, Boite, Champ, chiffres, MILLIERS, Pied, Recap, Tete, Trop } from "../commun";
import styles from "../commun.module.css";
import propres from "./arbitrage.module.css";

/**
 * DEUX LIGNES, ET UN CHIFFRE QUI DIT NON.
 *
 * C'est la cinquième maquette et la dernière, et elle pose deux questions que
 * les quatre autres n'ont jamais posées. Tout le reste leur est emprunté.
 *
 *   L'ÉCRAN A DEUX SUJETS. Les quatre autres parlent d'une ligne : on y place
 *   une somme, on y propose un taux, on y verse chaque mois, on en cède une
 *   part. Un arbitrage n'est ni le départ ni l'arrivée, c'est le MOUVEMENT
 *   entre les deux — et c'est la seule chose que la forme actuelle ne montre
 *   pas. Elle en fait une liste déroulante, « Replacer le produit dans
 *   (facultatif) », posée au bas d'un formulaire de vente. Le geste le plus
 *   engageant du guichet y est invisible, et son étiquette dit « facultatif ».
 *
 *   LE CHIFFRE QU'ON TAPE DIT NON. Partout ailleurs, le montant écrit par le
 *   client est ce qu'il VEUT : placer un million, céder quarante titres,
 *   verser cinquante mille. Le plancher est l'inverse — c'est le montant sous
 *   lequel il refuse que la vente parte. C'est le premier chiffre de la
 *   maison qui est une limite et non une intention, et la forme doit le dire,
 *   sans quoi il se lit comme un objectif.
 *
 * ET LA CONSÉQUENCE QUI COMPTE EST CELLE DE « RIEN ». Les quatre autres
 * montrent ce que le chiffre produit. Ici, ce que le client doit comprendre
 * AVANT de signer est qu'il peut ne rien se passer du tout — et que ce jour-là
 * le service aura fonctionné, pas échoué. Le domaine le dit déjà dans ses
 * mots (« c'est la protection qui a joué ») ; l'écran, lui, le dit après.
 * Ici il le dit pendant qu'on choisit, à l'endroit où les autres maquettes
 * écrivent « ≈ 13 titres ».
 *
 * LES QUATRE-VINGT-DIX JOURS NE SONT PAS DÉCIDÉS ICI : « FENETRE_MAX_JOURS »
 * est lu du domaine. Une maquette qui réinventerait la borne de la maison
 * finirait par s'en écarter, et c'est exactement ce qu'on cherche à empêcher
 * depuis la quatrième.
 */
export interface Cible {
  id: string;
  titre: string;
  quoi: string;
  /** Vrai quand les deux jambes se règlent sur une valeur liquidative. */
  simultane: boolean;
}

/* Les durées proposées : des mois, comme on les pense, bornés par le domaine. */
const DUREES = [15, 30, 45, 60, 90].filter((j) => j <= FENETRE_MAX_JOURS);
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function MaquetteArbitrage({ titre, isin, detenu, cibles }: { titre: string; isin: string; detenu: number; cibles: Cible[] }) {
  const [vers, setVers] = useState<Cible | null>(null);
  const [brut, setBrut] = useState("");
  const [jours, setJours] = useState<number | null>(null);
  const [etape, setEtape] = useState<1 | 2 | 3>(1);

  const plancher = Number(chiffres(brut) || 0);
  /* Le plancher ne peut pas dépasser ce que la position vaut : au-dessus, la
     vente ne partirait jamais, et l'arbitrage serait mort-né sans le dire. */
  const impossible = plancher > detenu;
  const pretBornes = plancher > 0 && !impossible && jours !== null;

  const limite = (() => {
    if (jours === null) return "";
    const d = new Date();
    d.setDate(d.getDate() + jours);
    return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
  })();

  return (
    <div className={styles.ecran}>
      <Bandeau essaie="deux lignes, et un chiffre qui dit non" />
      <Tete sur="Déplacer un placement" titre={titre} isin={isin} />

      {etape === 1 ? (
        <>
          {/* LE TRAJET EST LA CONSÉQUENCE DU CHOIX, ET IL EST DONC SOUS LUI.
              Deux déplacements, et chacun avait sa raison.
              IL A D'ABORD EU SA PROPRE CARTE, avec son libellé à lui —
              l'épreuve d'harmonisation l'a refusé, à juste titre :
              « champLabel » appartient au kit, et une maquette qui le
              redessine se détache à la première retouche.
              IL EST ENSUITE PASSÉ AU-DESSUS DE LA LISTE, et la capture l'a
              refusé à son tour : la ligne choisie s'y lisait DEUX FOIS à huit
              pixels d'écart, dans le panneau « Vous rejoignez » et sur le
              bouton doré juste dessous. Un écho, pas une confirmation.
              SA PLACE EST LA FENTE QUE LE KIT RÉSERVE À CELA. « ≈ 13 titres »
              est à un montant ce que ce trajet est à une ligne d'arrivée :
              ce que la réponse produit, lu sous la main qui répond. */}
          <Champ
            question="Où voulez-vous déplacer ce placement ?"
            nomme="ciblesLabel"
            dessous={
              <>
                <span className={propres.trajet}>
                  <span className={propres.jambe}>
                    <span className={propres.role}>Vous quittez</span>
                    <span className={propres.ligne}>{titre}</span>
                    <span className={propres.sousLigne}>{MILLIERS(detenu)} FCFA au dernier cours</span>
                  </span>
                  <span className={propres.fleche} aria-hidden="true">
                    ↓
                  </span>
                  <span className={vers ? propres.jambe : `${propres.jambe} ${propres.jambeVide}`}>
                    <span className={propres.role}>Vous rejoignez</span>
                    <span className={propres.ligne}>{vers ? vers.titre : "à choisir ci-dessus"}</span>
                    <span className={propres.sousLigne}>{vers ? vers.quoi : "les lignes où l'on est sûr d'arriver"}</span>
                  </span>
                </span>
                {!vers ? (
                  <Attente>Seules paraissent les lignes où l&apos;on est sûr d&apos;arriver : ni adjudication, ni émission.</Attente>
                ) : vers.simultane ? (
                  <>
                    <b>Les deux jambes se signent ensemble</b>
                    <span> · les deux valeurs liquidatives retenues vous sont dites avant la signature.</span>
                  </>
                ) : (
                  <>
                    <b>La paire est armée : rien ne part tant que les deux jambes ne tiennent pas le même jour</b>
                    <span> · vous ne vous désinvestissez que si l&apos;arrivée est tenue, au prix de pouvoir ne jamais partir.</span>
                  </>
                )}
              </>
            }
          >
            <div className={propres.choix} role="group" aria-labelledby="ciblesLabel">
              {cibles.map((c) => (
                <button key={c.id} type="button" aria-pressed={vers?.id === c.id} className={vers?.id === c.id ? propres.cibleOn : propres.cible} onClick={() => setVers(c)}>
                  <span className={propres.ligne}>{c.titre}</span>
                  <span className={propres.sousLigne}>{c.quoi}</span>
                </button>
              ))}
            </div>
          </Champ>

          <Pied mot="Continuer" pret={Boolean(vers)} sur={() => setEtape(2)} note="Vous posez vos deux bornes à l'écran suivant." />
        </>
      ) : etape === 2 ? (
        <>
          {/* LE SEUL CHIFFRE DE LA MAISON QUI EST UNE LIMITE. La question est
              écrite au négatif — « sous quel montant refusez-vous » — parce
              qu'« indiquez un plancher » se lit comme un objectif à
              atteindre, et qu'un client qui vise son plancher arme un
              arbitrage qui ne partira jamais. */}
          <Boite
            id="plancher"
            question="Sous quel montant refusez-vous que la vente parte ?"
            valeur={brut ? MILLIERS(plancher) : ""}
            onChange={(v) => setBrut(chiffres(v).slice(0, 12))}
            unite="FCFA"
            dessous={
              plancher === 0 ? (
                <Attente>Ce que votre refus protège s&apos;affiche ici pendant que vous tapez.</Attente>
              ) : impossible ? (
                <Trop>Votre position vaut {MILLIERS(detenu)} FCFA : au-dessus, la vente ne partirait jamais.</Trop>
              ) : (
                <>
                  <b>Rien ne part sous {MILLIERS(plancher)} FCFA</b>
                  <span> · votre position en vaut {MILLIERS(detenu)}</span>
                </>
              )
            }
          />

          <Champ
            question="Jusqu'à quand laissez-vous courir ?"
            nomme="fenetreLabel"
            dessous={
              jours === null ? (
                <Attente>Au-delà de la date, tout s&apos;annule et votre position reste telle quelle.</Attente>
              ) : (
                <>
                  <b>Jusqu&apos;au {limite}</b>
                  <span> · passé ce jour, rien n&apos;a bougé : votre position est intacte, et votre argent aussi.</span>
                </>
              )
            }
          >
            {/* DES DURÉES, ET NON UN CALENDRIER. « Je laisse courir un mois »
                est la pensée du client ; lui demander de la traduire en un
                jour du calendrier ajoute une traduction et deux gestes. */}
            <div className={propres.fenetre} role="group" aria-labelledby="fenetreLabel">
              {DUREES.map((j) => (
                <button key={j} type="button" aria-pressed={jours === j} className={jours === j ? propres.dureeOn : propres.duree} onClick={() => setJours(j)}>
                  {j} j
                </button>
              ))}
            </div>
          </Champ>

          <Pied
            mot="Continuer"
            pret={pretBornes}
            sur={() => setEtape(3)}
            second="Changer de ligne"
            surSecond={() => setEtape(1)}
            note={`La fenêtre ne va pas au-delà de ${FENETRE_MAX_JOURS} jours : au-delà, ce n'est plus une borne.`}
          />
        </>
      ) : (
        <>
          <Recap
            titre="Vérifiez, puis envoyez"
            /* UNE SEULE LIGNE FORTE, ET C'EST LE PLANCHER.
               Trois états ont été mesurés avant celui-ci, sur un 390 × 844.
               DÉPART ET ARRIVÉE FORTS, une rangée chacun : le bouton
               « Armer » tombait 223 px sous la barre d'onglets — la faute
               signalée le 28 octobre sur le passage d'ordre, retrouvée sur
               la cession, revenue ici une troisième fois.
               LE TRAJET FORT, en une rangée : encore 109 px dessous, et la
               capture a dit pourquoi — le grand degré du kit est fait pour
               UN CHIFFRE, et deux noms de lignes y tiennent sur quatre
               lignes de 2,6 rem.
               LE PLANCHER FORT : c'est le seul chiffre que le client a
               écrit, c'est celui que le desk vérifiera, et c'est la thèse de
               cette maquette — « deux lignes, et un chiffre qui dit non ».
               Le trajet se lit au degré courant, en tête, où il est le sujet
               sans avoir à être le plus gros. */
            lignes={[
              { quoi: "Le déplacement", dit: `${titre} → ${vers?.titre ?? "—"}` },
              { quoi: "Rien ne part sous", dit: `${MILLIERS(plancher)} FCFA`, fort: true },
              { quoi: "Jusqu'au", dit: limite },
            ]}
            /* LA PHRASE DE LA MAISON, MOT POUR MOT. Le domaine écrit déjà
               « c'est la protection qui a joué » pour un arbitrage expiré ;
               la dire ici, AVANT, est tout l'objet de cette maquette. Un
               client qui découvre après coup que rien n'a bougé lit « ça n'a
               pas marché » et n'en reposera jamais. */
            mot={
              vers?.simultane
                ? "Les deux jambes se règlent sur une valeur liquidative et se signent ensemble. Si la date passe sans qu'elles tiennent, tout s'annule : votre position est intacte, et votre argent aussi. Ce n'est pas une panne, c'est la protection qui a joué."
                : "Une jambe passe par le carnet de la BVMAC : rien ne part tant que les deux ne tiennent pas le même jour, au-dessus de votre plancher. Si la date passe sans cela, tout s'annule : votre position est intacte, et votre argent aussi. Ce n'est pas une panne, c'est la protection qui a joué."
            }
          />
          <Pied mot="Armer l'arbitrage" sur={() => setEtape(1)} second="Corriger les bornes" surSecond={() => setEtape(2)} />
        </>
      )}
    </div>
  );
}
