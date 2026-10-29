"use client";

import { useState } from "react";
import { Attente, Bandeau, Bascule, Boite, Champ, chiffres, MILLIERS, Pied, Recap, Tete, Trop } from "../commun";
import styles from "../commun.module.css";
import propres from "./ligne.module.css";

/**
 * PROPOSER SA PROPRE LIGNE : UNE PAGE, PLUSIEURS RÉPONSES, ET DEUX
 * VALIDATIONS DONT LA PREMIÈRE MONTRE L'OBJET.
 *
 * CE QU'ON REPROCHE À LA FORME ACTUELLE, et chaque reproche a sa réponse ici.
 *
 *   ELLE S'OUVRE EN FEUILLE QUI MONTE. La feuille avait sa raison — déplié
 *   sous son bouton, le gabarit poussait la moitié de la page vers le bas —
 *   mais elle soigne le symptôme. Sept champs, leurs explications et deux
 *   validations ne sont pas un panneau : c'est une PAGE, avec son adresse,
 *   son retour, et son titre. Une feuille qu'on ferme par mégarde emporte ce
 *   qu'on venait d'écrire ; une page, non.
 *
 *   ELLE NE LAISSE CHOISIR QU'UN TRÉSOR ET QU'UNE DURÉE. Or un client qui
 *   dit « je prendrais du 5 ans camerounais » dit presque toujours « ou du
 *   7 ans, ou du gabonais au même niveau ». La forme actuelle lui fait
 *   remplir six fois le même formulaire, ou choisir au hasard — et le desk
 *   reçoit une intention plus étroite que la vraie.
 *
 *   ELLE DEMANDE « PRÊT À PARTIR DE (JOURS) ». Un nombre de jours est une
 *   soustraction que le client doit faire, et c'est une borne qui n'a pas de
 *   fin. Voir « LA FENÊTRE D'ÉMISSION » plus bas.
 *
 *   ELLE RANGE LE MOT AU DESK DANS UN « textarea » GRIS. Le desk répond
 *   pourtant : il clôt une ligne avec un motif que le client lit. C'est une
 *   conversation rendue comme un formulaire. Voir « LES BULLES ».
 *
 *   ELLE ENVOIE D'UN SEUL CLIC. Voir « LES DEUX VALIDATIONS ».
 *
 * CE QUE PLUSIEURS RÉPONSES COÛTENT, ET C'EST LA VRAIE QUESTION QUE CETTE
 * MAQUETTE POSE À LA MAISON. Le domaine groupe les intentions par
 * « instrument | pays | durée » — c'est « cleDeGroupe » — et le consensus
 * ADDITIONNE les montants d'un groupe. Deux Trésors et trois durées font
 * donc SIX lignes, et si chacune porte 50 millions, le desk lit 300 millions
 * de demande là où le client en a 50. Le seuil du mur est à 100 millions :
 * on le franchirait avec un client et une seule intention.
 *
 * LA MAQUETTE NE TRANCHE PAS CELA, ELLE LE REND VISIBLE. L'aperçu montre les
 * six lignes et écrit, en toutes lettres, que le montant vaut pour CELLE QUI
 * SORTIRA et non pour chacune. Si la forme est retenue, le domaine devra
 * porter la réponse — un lien entre les lignes sœurs, ou un montant partagé —
 * et ce sera une décision de la maison, pas d'un écran.
 */

/* Les six Trésors de la zone, et les durées de chaque compartiment : la vraie
   page les lit du domaine, et la maquette les reçoit d'elle pour ne pas
   inventer une liste qui s'en écarterait. */
export interface Catalogue {
  pays: string[];
  dureesOTA: string[];
  dureesBTA: string[];
}

type Compartiment = "OTA" | "BTA";

/** Le mois courant, et celui d'après : les deux bords par défaut de rien. */
const moisISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const direLeMois = (v: string) => {
  const [a, m] = v.split("-");
  const i = Number(m) - 1;
  return i >= 0 && i < 12 ? `${MOIS[i]} ${a}` : "";
};

export function MaquetteLigne({ catalogue }: { catalogue: Catalogue }) {
  const [compartiment, setCompartiment] = useState<Compartiment>("OTA");
  const [pays, setPays] = useState<string[]>([]);
  const [durees, setDurees] = useState<string[]>([]);
  const [niveau, setNiveau] = useState("");
  const [montantBrut, setMontantBrut] = useState("");
  const [tot, setTot] = useState("");
  const [tard, setTard] = useState("");
  const [mot, setMot] = useState("");
  const [etape, setEtape] = useState<"saisie" | "apercu" | "confirmer">("saisie");

  const dureesDuCompartiment = compartiment === "OTA" ? catalogue.dureesOTA : catalogue.dureesBTA;
  const montant = Number(chiffres(montantBrut) || 0);
  const lignes = pays.length * durees.length;
  const fenetreALEnvers = Boolean(tot && tard && tard < tot);
  const pret = lignes > 0 && montant > 0 && niveau.trim() !== "" && Boolean(tot) && Boolean(tard) && !fenetreALEnvers;

  /* Un jeton qui s'ajoute, et non qui remplace : c'est toute la différence
     avec les jetons de l'épargne et de l'arbitrage. */
  const bascule = (liste: string[], v: string, pose: (l: string[]) => void) => pose(liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]);

  /** Les lignes telles que le desk les recevra, dans son ordre à lui. */
  const toutesLesLignes = pays.flatMap((p) => durees.map((d) => ({ cle: `${p}|${d}`, pays: p, duree: d })));
  const montrees = toutesLesLignes.slice(0, 6);

  return (
    <div className={styles.ecran}>
      <Bandeau essaie="une page, plusieurs réponses, deux validations" />
      <Tete sur="Sondage · avant qu'une séance ouvre" titre="Proposer votre propre ligne" isin="Rien n'est engagé" />

      {etape === "saisie" ? (
        <>
          {/* LE COMPARTIMENT D'ABORD, parce qu'il décide des champs qui
              suivent : une OTA porte un coupon, un bon se vend précompté et
              son taux EST son niveau. La bascule vient du kit depuis
              aujourd'hui — la maquette d'ordre l'avait, et deux copies
              auraient divergé. */}
          <Bascule
            legende="Ce que vous cherchez"
            nom="compartiment"
            choix={[
              { valeur: "OTA", mot: "Obligation" },
              { valeur: "BTA", mot: "Bon" },
            ]}
            valeur={compartiment}
            onChange={(v) => {
              setCompartiment(v);
              /* Les durées d'un bon ne sont pas celles d'une obligation :
                 les garder d'un compartiment à l'autre proposerait « 7 ans »
                 sur un bon, qui ne va pas au-delà de l'année. */
              setDurees([]);
            }}
          />

          <Champ
            question="Quels Trésors ?"
            nomme="paysLabel"
            dessous={
              pays.length === 0 ? (
                <Attente>Vous pouvez en prendre plusieurs : le desk saura que l&apos;un vaut l&apos;autre pour vous.</Attente>
              ) : (
                <>
                  <b>
                    {pays.length} Trésor{pays.length > 1 ? "s" : ""}
                  </b>
                  <span> · {pays.join(", ")}</span>
                </>
              )
            }
          >
            <div className={propres.jetons} role="group" aria-labelledby="paysLabel">
              {catalogue.pays.map((p) => (
                <button key={p} type="button" aria-pressed={pays.includes(p)} className={pays.includes(p) ? propres.jetonOn : propres.jeton} onClick={() => bascule(pays, p, setPays)}>
                  {pays.includes(p) && (
                    <span className={propres.coche} aria-hidden="true">
                      ✓
                    </span>
                  )}
                  {p}
                </button>
              ))}
            </div>
          </Champ>

          <Champ
            question={compartiment === "OTA" ? "Quelles durées ?" : "Quelles échéances ?"}
            nomme="dureesLabel"
            dessous={
              durees.length === 0 ? (
                <Attente>Plusieurs aussi : « du 5 ans ou du 7 ans » est une vraie réponse, et la maison ne l&apos;entendait pas.</Attente>
              ) : lignes > 0 ? (
                <>
                  {/* LE PRODUIT DES DEUX CHOIX, DIT PENDANT QU'ON CHOISIT.
                      C'est le seul endroit où le client peut voir qu'il
                      vient de proposer six lignes — après, c'est trop
                      tard, et le desk reçoit six fois son montant. */}
                  <b>
                    {lignes} ligne{lignes > 1 ? "s" : ""} pour le desk
                  </b>
                  <span>
                    {" "}
                    · {pays.length} Trésor{pays.length > 1 ? "s" : ""} × {durees.length} durée{durees.length > 1 ? "s" : ""}
                  </span>
                </>
              ) : (
                <Attente>Choisissez aussi un Trésor, et le nombre de lignes s&apos;affichera ici.</Attente>
              )
            }
          >
            <div className={propres.jetons} role="group" aria-labelledby="dureesLabel">
              {dureesDuCompartiment.map((d) => (
                <button key={d} type="button" aria-pressed={durees.includes(d)} className={durees.includes(d) ? propres.jetonOn : propres.jeton} onClick={() => bascule(durees, d, setDurees)}>
                  {durees.includes(d) && (
                    <span className={propres.coche} aria-hidden="true">
                      ✓
                    </span>
                  )}
                  {d}
                </button>
              ))}
            </div>
          </Champ>

          <Boite
            id="niveau"
            question={compartiment === "BTA" ? "Quel taux accepteriez-vous, au moins ?" : "Quel coupon attendez-vous, au moins ?"}
            valeur={niveau}
            onChange={(v) => setNiveau(v.replace(/[^\d,.]/g, "").slice(0, 6))}
            unite="%"
            gabarit="0,00"
            mode="decimal"
            dessous={
              niveau.trim() === "" ? (
                <Attente>C&apos;est votre seuil, pas une prévision : en dessous, vous ne prenez pas.</Attente>
              ) : (
                <>
                  <b>Au moins {niveau.replace(".", ",")} %</b>
                  <span> · le desk ne vous proposera rien en dessous</span>
                </>
              )
            }
          />

          <Boite
            id="montant"
            question="Combien prendriez-vous ?"
            valeur={montantBrut ? MILLIERS(montant) : ""}
            onChange={(v) => setMontantBrut(chiffres(v).slice(0, 12))}
            unite="FCFA"
            dessous={
              montant === 0 ? (
                <Attente>Ce que votre montant veut dire quand vous proposez plusieurs lignes s&apos;affiche ici.</Attente>
              ) : lignes > 1 ? (
                <>
                  <b>{MILLIERS(montant)} FCFA sur celle qui sortira</b>
                  <span> · et non sur chacune des {lignes} : vous ne vous engagez pas {lignes} fois</span>
                </>
              ) : (
                <>
                  <b>{MILLIERS(montant)} FCFA</b>
                  <span> · ce que vous prendriez si cette ligne sortait</span>
                </>
              )
            }
          />

          {/**
           * LA FENÊTRE D'ÉMISSION, ET LE VOCABULAIRE QU'ELLE REMPLACE.
           *
           * « Prêt à partir de (jours) » demandait trois choses de travers.
           * Un NOMBRE DE JOURS est une soustraction que le client doit
           * faire et que la maison refait ensuite — c'est d'ailleurs ce
           * calcul qui a produit le défaut du 26 octobre, où la date du
           * consensus fuyait d'un jour chaque matin. « À PARTIR DE » n'a pas
           * de fin : une intention sans bord est une intention qu'on ne peut
           * ni clore ni honorer. Et « PRÊT » parle du client, quand ce qui
           * compte est la SÉANCE.
           *
           * L'UNITÉ EST LE MOIS, ET C'EST LE POINT. Un Trésor annonce sa
           * séance environ une semaine avant : personne, pas même le desk,
           * ne peut nommer le jour trois mois d'avance. Demander une date
           * exacte serait demander une précision que la place n'a pas, et
           * obtenir un chiffre faux dit avec assurance. Le mois est la plus
           * petite maille vraie.
           *
           * LES DEUX BORNES SE DISENT « AU PLUS TÔT » ET « AU PLUS TARD »,
           * comme le plancher et la date limite d'un arbitrage : c'est le
           * registre de la maison pour une borne, et il est déjà appris.
           */}
          <Champ
            question="Sur quelles émissions seriez-vous preneur ?"
            nomme="fenetreLabel"
            dessous={
              !tot || !tard ? (
                <Attente>Le Trésor annonce une séance environ une semaine avant : on dit le mois, pas le jour.</Attente>
              ) : fenetreALEnvers ? (
                <Trop>La fin de la fenêtre est avant son début.</Trop>
              ) : (
                <>
                  <b>
                    De {direLeMois(tot)} à {direLeMois(tard)}
                  </b>
                  <span> · au-delà, votre intention s&apos;éteint d&apos;elle-même</span>
                </>
              )
            }
          >
            <div className={propres.fenetre} role="group" aria-labelledby="fenetreLabel">
              <span className={propres.borne}>
                <span className={propres.borneMot}>Au plus tôt</span>
                <input className={propres.borneChamp} type="month" min={moisISO(new Date())} value={tot} onChange={(e) => setTot(e.target.value)} aria-label="Au plus tôt" />
              </span>
              <span className={propres.tiret} aria-hidden="true">
                →
              </span>
              <span className={propres.borne}>
                <span className={propres.borneMot}>Au plus tard</span>
                <input className={propres.borneChamp} type="month" min={tot || moisISO(new Date())} value={tard} onChange={(e) => setTard(e.target.value)} aria-label="Au plus tard" />
              </span>
            </div>
          </Champ>

          {/* LES BULLES. Le mot au desk n'est pas une case de formulaire :
              c'est un mot qu'on adresse à quelqu'un, et ce quelqu'un répond.
              La bulle du desk est là d'avance parce que le desk a toujours
              la même question — et qu'y répondre vaut mieux que deviner ce
              qu'il faut écrire dans un champ vide. */}
          <Champ
            question="Ce que le desk doit savoir"
            pour="mot"
            dessous={
              mot.trim() === "" ? (
                <Attente>Facultatif — mais c&apos;est ce qui fait qu&apos;une ligne est comprise plutôt que classée.</Attente>
              ) : (
                <>
                  <b>Le desk vous répond ici</b>
                  <span> · sa réponse viendra se poser sous la vôtre</span>
                </>
              )
            }
          >
            <span className={propres.fil}>
              <span className={propres.bulleDesk}>
                <span className={propres.qui}>Le desk</span>
                Ce qui nous aide le plus : pourquoi cette durée, et ce qui vous ferait changer d&apos;avis.
              </span>
              <textarea
                id="mot"
                className={propres.ecrire}
                maxLength={600}
                value={mot}
                onChange={(e) => setMot(e.target.value)}
                placeholder="Votre réponse…"
              />
            </span>
          </Champ>

          <Pied mot="Voir ce que le desk recevra" pret={pret} sur={() => setEtape("apercu")} note="Rien n'est envoyé : vous verrez d'abord vos lignes." />
        </>
      ) : etape === "apercu" ? (
        <>
          {/**
           * LA PREMIÈRE DES DEUX VALIDATIONS : ON MONTRE L'OBJET.
           *
           * Un récapitulatif redit les champs — « OTA, Cameroun, 5 ans ». Un
           * aperçu montre LA LIGNE, dans la forme où le desk la lira. La
           * différence ne compte nulle part autant qu'ici : une proposition
           * à deux Trésors et trois durées ne fait pas une ligne mais six,
           * et aucune phrase ne le fait comprendre aussi vite que six cartes
           * posées les unes sous les autres.
           */}
          <section className={styles.carte}>
            <h2 className={styles.recapTitre}>Ce que le desk recevra</h2>
            <p className={styles.recapMot}>
              {lignes > 1 ? (
                <>
                  Votre proposition fait <b>{lignes} lignes</b>. Chacune rejoint les intentions des autres clients sur la même durée et le même Trésor.{" "}
                  <b>{MILLIERS(montant)} FCFA</b> valent pour celle qui sortira, pas pour chacune.
                </>
              ) : (
                <>
                  Votre proposition fait <b>une ligne</b>, qui rejoindra les intentions des autres clients sur la même durée et le même Trésor.
                </>
              )}
            </p>
            <div className={propres.apercu}>
              {montrees.map((l) => (
                <div key={l.cle} className={propres.carteLigne}>
                  <span className={propres.carteTitre}>
                    {compartiment} {l.pays} · {l.duree}
                  </span>
                  <span className={propres.carteDit}>
                    {compartiment === "BTA" ? "taux" : "coupon"} au moins {niveau.replace(".", ",")} % · {MILLIERS(montant)} FCFA · de {direLeMois(tot)} à {direLeMois(tard)}
                  </span>
                </div>
              ))}
              {toutesLesLignes.length > montrees.length && <p className={propres.reste}>et {toutesLesLignes.length - montrees.length} autres, sur le même modèle.</p>}
            </div>
            {mot.trim() !== "" && (
              <span className={propres.fil}>
                <span className={propres.bulleMoi}>
                  <span className={propres.qui}>Vous</span>
                  {mot}
                </span>
              </span>
            )}
          </section>

          <Pied mot="C'est bien cela" sur={() => setEtape("confirmer")} second="Corriger" surSecond={() => setEtape("saisie")} note="Rien n'est encore parti." />
        </>
      ) : (
        <>
          {/**
           * LA SECONDE VALIDATION : ON DIT CE QU'ON ENGAGE, ET CE QU'ON
           * N'ENGAGE PAS.
           *
           * Deux validations pour un sondage peuvent sembler une de trop.
           * Elles ne le sont pas, et pour une raison précise : la première
           * vérifie la FORME — est-ce bien six lignes, est-ce bien ces
           * durées — et la seconde la PORTÉE : ce qu'une intention engage,
           * et ce qu'elle n'engage pas. Un client qui n'a pas lu la seconde
           * croira s'être engagé, et c'est le reproche que la maison s'est
           * déjà fait sur ce service.
           */}
          <Recap
            titre="Ce que vous envoyez"
            lignes={[
              { quoi: "Vous proposez", dit: `${lignes} ligne${lignes > 1 ? "s" : ""} · ${compartiment}`, fort: true },
              { quoi: "Au niveau de", dit: `${niveau.replace(".", ",")} % au moins` },
              { quoi: "Pour", dit: `${MILLIERS(montant)} FCFA sur celle qui sortira` },
              { quoi: "Entre", dit: `${direLeMois(tot)} et ${direLeMois(tard)}` },
            ]}
            mot="Une intention n'est pas un ordre : rien n'est engagé, rien n'est bloqué sur votre compte, et vous la retirez quand vous voulez. Elle dit au desk ce que vous prendriez si la ligne sortait — et c'est ce qui décide des séances qu'il demande aux Trésors."
          />
          <Pied mot="Envoyer au desk" sur={() => setEtape("saisie")} second="Revoir mes lignes" surSecond={() => setEtape("apercu")} />
        </>
      )}
    </div>
  );
}
