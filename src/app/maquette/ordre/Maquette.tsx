"use client";

import { useMemo, useState } from "react";
import { Attente, Bandeau, Bascule, Boite, chiffres, MILLIERS, Pied, Recap, Tete, Trop } from "../commun";
import styles from "../commun.module.css";

/**
 * LA FORME PROPOSÉE : UN SEUL GESTE PAR ÉCRAN, ET LE MONTANT EN GRAND.
 *
 * Ce que la forme actuelle fait et qu'on lui reproche : elle pose, sur un même
 * écran, le sens de l'ordre, la quantité, le cours, un rappel de quotité, les
 * coordonnées et un pied de page — tout en 0,8 rem, dans des boîtes de la même
 * taille. Rien n'y est premier, donc rien n'y est grand, et le client tape le
 * chiffre qui engage son argent dans un champ de la taille d'un champ de
 * recherche.
 *
 * CE QUE CELLE-CI CHANGE, ET POURQUOI :
 *
 *   LE MONTANT EST LE SUJET. Il occupe une boîte à lui, dans la plus grande
 *   police de l'écran, avec son unité collée : c'est le seul chiffre que le
 *   client écrit de sa main, et c'est celui qu'il relira avant de signer.
 *
 *   CE QU'IL OBTIENT SE LIT SOUS SA MAIN, pendant qu'il tape. « 1 170 000 FCFA
 *   ≈ 13 actions » répond à la question qu'il se pose vraiment, et le reste
 *   (quotité, arrondi, cours) devient une conséquence qu'on montre au lieu
 *   d'une règle qu'on énonce d'avance.
 *
 *   AUCUN MONTANT N'EST SUGGÉRÉ. Quatre pastilles — 500 k, 1 M, 5 M, 10 M —
 *   ont vécu une heure dans cette maquette et sont parties le jour même :
 *   proposer des sommes, c'est en recommander, et ce n'est pas le rôle d'un
 *   guichet. Le client écrit la sienne.
 *
 *   DEUX ÉCRANS, PAS TROIS. Le second est un RÉCAPITULATIF, pas un formulaire :
 *   c'est la proposition faite le 28 octobre et laissée à votre arbitrage —
 *   un client dont le dossier est approuvé et les canaux prouvés ne retape
 *   rien, sa ligne de contact se lit et se corrige d'un lien.
 *
 * RIEN N'EST ENVOYÉ : les boutons avancent dans la maquette et s'arrêtent là.
 */

export function Maquette({ titre, isin, cours, quotite, detenu, marche }: { titre: string; isin: string; cours: number; quotite: number; detenu: number; marche: string }) {
  const [sens, setSens] = useState<"achat" | "vente">("achat");
  const [brut, setBrut] = useState("");
  /* « coordonnees » est le DÉTOUR : dans l'application c'est une vraie page,
     atteinte avec un billet de retour. Ici elle est jouée dans la maquette,
     sans quoi on ne verrait pas ce qu'on vient juger — à savoir que l'ordre
     est retrouvé intact. */
  const [etape, setEtape] = useState<1 | 2 | "coordonnees">(1);
  const [envoye, setEnvoye] = useState(false);

  const montant = Number(chiffres(brut) || 0);
  const vu = useMemo(() => {
    if (sens === "achat") {
      const titres = cours > 0 ? Math.floor(Math.floor(montant / cours) / Math.max(1, quotite)) * Math.max(1, quotite) : 0;
      return { titres, exact: titres * cours, reste: montant - titres * cours };
    }
    const titres = Math.min(detenu, Math.floor(montant / Math.max(1, cours)));
    return { titres, exact: titres * cours, reste: 0 };
  }, [sens, montant, cours, quotite, detenu]);

  const pret = vu.titres > 0;

  return (
    <div className={styles.ecran}>
      <Bandeau essaie="proposition du 28 octobre" />
      <Tete sur={marche} titre={titre} isin={isin} />

      {envoye ? (
        <section className={styles.carte}>
          <div className={styles.recuRond}>✓</div>
          <h2 className={styles.recuTitre}>C&apos;est parti au desk</h2>
          <p className={styles.recuMot}>
            Un conseiller vous confirme par WhatsApp avant la clôture, puis vous envoie le bulletin à signer.
          </p>
          <button type="button" className={styles.second} onClick={() => { setEnvoye(false); setEtape(1); setBrut(""); }}>
            Rejouer la maquette
          </button>
        </section>
      ) : etape === "coordonnees" ? (
        <>
          <p className={styles.garde}>
            Votre ordre est gardé : <b>{MILLIERS(vu.exact)} FCFA</b> sur {titre}.
          </p>
          <section className={styles.carte}>
            <h2 className={styles.recapTitre}>Vos coordonnées</h2>
            <p className={styles.recapMot}>
              Dans l&apos;application, ceci est la page « Profil », atteinte d&apos;ici avec un billet de retour. Elle est jouée dans la maquette pour qu&apos;on
              voie l&apos;aller ET le retour.
            </p>
            <dl className={styles.recap}>
              <div>
                <dt>Nom</dt>
                <dd>Georges Nitcheu</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>georges.nitcheu@gmail.com</dd>
              </div>
              <div>
                <dt>WhatsApp</dt>
                <dd>+237 6 87 67 67 67</dd>
              </div>
            </dl>
          </section>
          <Pied mot="Revenir à mon ordre" sur={() => setEtape(2)} note="Il vous attend aussi dans vos notifications, tant qu'il n'est pas envoyé." />
        </>
      ) : etape === 1 ? (
        <>
          {/* LA BASCULE EST MONTÉE DANS LE KIT le 29 octobre, quand la
              sixième maquette a eu besoin de la même pièce pour « OTA ou
              BTA ». Elle était écrite ici ; la recopier là-bas l'aurait fait
              diverger à la première retouche. */}
          <Bascule
            legende="Sens de l'ordre"
            nom="sens"
            choix={[
              { valeur: "achat", mot: "J'achète" },
              { valeur: "vente", mot: "Je vends" },
            ]}
            valeur={sens}
            onChange={(s) => {
              setSens(s);
              setBrut("");
            }}
          />

          <Boite
            id="montant"
            question={sens === "achat" ? "Combien voulez-vous placer ?" : "Combien voulez-vous retirer ?"}
            valeur={brut ? MILLIERS(montant) : ""}
            onChange={(v) => setBrut(chiffres(v).slice(0, 12))}
            unite="FCFA"
            dessous={
              montant === 0 ? (
                <Attente>Le nombre de titres s&apos;affiche ici pendant que vous tapez.</Attente>
              ) : vu.titres === 0 ? (
                <Trop>Trop court pour un titre : il en faut {MILLIERS(cours * Math.max(1, quotite))} FCFA au minimum.</Trop>
              ) : (
                <>
                  <b>
                    ≈ {MILLIERS(vu.titres)} {vu.titres > 1 ? "titres" : "titre"}
                  </b>
                  <span>
                    {" "}à {MILLIERS(cours)} FCFA
                    {vu.reste > 0 ? ` · ${MILLIERS(vu.reste)} FCFA resteront de côté` : ""}
                  </span>
                </>
              )
            }
          />

          <Pied
            mot="Continuer"
            pret={pret}
            sur={() => setEtape(2)}
            note={sens === "achat" ? `Cours ${MILLIERS(cours)} FCFA · quotité ${MILLIERS(quotite)}` : `Vous détenez ${MILLIERS(detenu)} titres`}
          />
        </>
      ) : (
        <>
          {/* QUATRE LIGNES, PAS SIX. « Vous achetez » et le nom de la ligne
              étaient déjà dits par l'en-tête deux centimètres plus haut, et
              les répéter poussait l'action sous le pli — mesuré sur la
              capture : le bouton d'envoi n'était pas à l'écran.
              LES COORDONNÉES SE LISENT, ELLES NE SE RETAPENT PAS : elles sont
              là pour être VÉRIFIÉES, c'est par elles que l'accusé, la
              confirmation du conseiller et le bulletin à signer arrivent. */}
          <Recap
            titre="Vérifiez, puis envoyez"
            lignes={[
              { quoi: sens === "achat" ? "Vous achetez pour" : "Vous vendez pour", dit: `${MILLIERS(vu.exact)} FCFA`, fort: true },
              { quoi: "Soit", dit: `${MILLIERS(vu.titres)} ${vu.titres > 1 ? "titres" : "titre"} à ${MILLIERS(cours)} FCFA` },
              { quoi: "Règlement", dit: "T+3, sur votre provision" },
            ]}
            mot="Un conseiller vous confirme avant la clôture ; l'exécution dépend du marché."
            apres={
              /* L'ORDRE N'EST PLUS PERDU EN CHEMIN. Corriger ses coordonnées
                 est un autre geste, qui a sa page — mais le faire ne doit pas
                 coûter le montant qu'on vient de taper. On part avec un billet
                 de retour, et il faut dire ce qu'on garde, sinon le lien est
                 un piège. */
              <p className={styles.recapMot}>
                <button type="button" className={styles.lien} onClick={() => setEtape("coordonnees")}>
                  Modifier mes coordonnées
                </button>{" "}
                — votre ordre est gardé pendant ce temps.
              </p>
            }
          />

          <Pied mot="Envoyer au desk" sur={() => setEnvoye(true)} second="Corriger le montant" surSecond={() => setEtape(1)} />
        </>
      )}
    </div>
  );
}
