"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./maquette.module.css";

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
const MILLIERS = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ");
const chiffres = (v: string) => v.replace(/\D/g, "");

export function Maquette({ titre, isin, cours, quotite, detenu, marche }: { titre: string; isin: string; cours: number; quotite: number; detenu: number; marche: string }) {
  const [sens, setSens] = useState<"achat" | "vente">("achat");
  const [brut, setBrut] = useState("");
  const [etape, setEtape] = useState<1 | 2>(1);
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
      <p className={styles.bandeau}>
        Maquette · rien n&apos;est envoyé · <span>proposition du 28 octobre</span>
      </p>

      <header className={styles.tete}>
        <span className={styles.marche}>{marche}</span>
        <h1 className={styles.titre}>{titre}</h1>
        <span className={styles.isin}>{isin}</span>
      </header>

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
      ) : etape === 1 ? (
        <>
          {/* UNE BASCULE, ET NON DEUX ONGLETS. Demandé le 28 octobre : deux
              cibles pleine largeur se lisaient comme deux destinations, alors
              qu'il n'y a qu'UNE question, qui a deux réponses. La bosse glisse
              d'un mot à l'autre, et c'est elle qui dit lequel est choisi.
              DEUX BOUTONS RADIO EN DESSOUS, parce qu'un « switch » dirait
              « vente : activée » à qui l'écoute, et que ce n'est pas un
              réglage mais un choix entre deux. */}
          <fieldset className={styles.bascule}>
            <legend className={styles.bascLegende}>Sens de l&apos;ordre</legend>
            <span className={styles.bosse} data-sens={sens} aria-hidden="true" />
            {(["achat", "vente"] as const).map((s) => (
              <label key={s} className={sens === s ? styles.motOn : styles.mot}>
                <input type="radio" name="sens" value={s} checked={sens === s} onChange={() => { setSens(s); setBrut(""); }} />
                {s === "achat" ? "J'achète" : "Je vends"}
              </label>
            ))}
          </fieldset>

          <section className={styles.carte}>
            <label className={styles.champLabel} htmlFor="montant">
              {sens === "achat" ? "Combien voulez-vous placer ?" : "Combien voulez-vous retirer ?"}
            </label>
            <div className={styles.saisie}>
              <input
                id="montant"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={brut ? MILLIERS(montant) : ""}
                onChange={(e) => setBrut(chiffres(e.target.value).slice(0, 12))}
              />
              <span className={styles.unite}>FCFA</span>
            </div>

            <p className={styles.equiv} aria-live="polite">
              {montant === 0 ? (
                <span className={styles.equivVide}>Le nombre de titres s&apos;affiche ici pendant que vous tapez.</span>
              ) : vu.titres === 0 ? (
                <span className={styles.equivCourt}>Trop court pour un titre : il en faut {MILLIERS(cours * Math.max(1, quotite))} FCFA au minimum.</span>
              ) : (
                <>
                  <b>≈ {MILLIERS(vu.titres)} {vu.titres > 1 ? "titres" : "titre"}</b>
                  <span>
                    {" "}à {MILLIERS(cours)} FCFA
                    {vu.reste > 0 ? ` · ${MILLIERS(vu.reste)} FCFA resteront de côté` : ""}
                  </span>
                </>
              )}
            </p>

          </section>

          <div className={styles.pied}>
            <button type="button" className={styles.action} disabled={!pret} onClick={() => setEtape(2)}>
              Continuer
            </button>
            <small>{sens === "achat" ? `Cours ${MILLIERS(cours)} FCFA · quotité ${MILLIERS(quotite)}` : `Vous détenez ${MILLIERS(detenu)} titres`}</small>
          </div>
        </>
      ) : (
        <>
          <section className={styles.carte}>
            <h2 className={styles.recapTitre}>Vérifiez, puis envoyez</h2>
            {/* QUATRE LIGNES, PAS SIX. « Vous achetez » et le nom de la ligne
                étaient déjà dits par l'en-tête deux centimètres plus haut, et
                les répéter poussait l'action sous le pli — mesuré sur la
                capture : le bouton d'envoi n'était pas à l'écran. */}
            <dl className={styles.recap}>
              <div className={styles.recapFort}>
                <dt>{sens === "achat" ? "Vous achetez pour" : "Vous vendez pour"}</dt>
                <dd>{MILLIERS(vu.exact)} FCFA</dd>
              </div>
              <div>
                <dt>Soit</dt>
                <dd>
                  {MILLIERS(vu.titres)} {vu.titres > 1 ? "titres" : "titre"} à {MILLIERS(cours)} FCFA
                </dd>
              </div>
              <div>
                <dt>Règlement</dt>
                <dd>T+3, sur votre provision</dd>
              </div>
              {/* LES COORDONNÉES SE LISENT, ELLES NE SE RETAPENT PAS. Elles
                  sont là pour être VÉRIFIÉES — c'est par elles que l'accusé,
                  la confirmation du conseiller et le bulletin à signer
                  arrivent — et les trois tiennent en trois lignes. */}
              <div>
                <dt>On vous répond</dt>
                <dd className={styles.coordonnees}>
                  <span>Georges Nitcheu</span>
                  <span>georges.nitcheu@gmail.com</span>
                  <span>WhatsApp +237 6 87 67 67 67</span>
                </dd>
              </div>
            </dl>
            <p className={styles.recapMot}>
              Un conseiller vous confirme avant la clôture ; l&apos;exécution dépend du marché.
            </p>
            {/* CORRIGER SES COORDONNÉES EST UN AUTRE GESTE, et il a son
                endroit : la page qui les tient. Le dire ici en toutes lettres
                vaut mieux qu'un champ de plus — mais il faut dire aussi ce
                qu'on perd, sinon le lien est un piège. */}
            <p className={styles.recapMot}>
              <Link href="/moi/identite" className={styles.lien}>
                Modifier mes coordonnées
              </Link>{" "}
              — vous quitterez cet ordre, et rien ne sera envoyé.
            </p>
          </section>

          <div className={styles.pied}>
            <button type="button" className={styles.action} onClick={() => setEnvoye(true)}>
              Envoyer au desk
            </button>
            <button type="button" className={styles.second} onClick={() => setEtape(1)}>
              Corriger le montant
            </button>
          </div>
        </>
      )}
    </div>
  );
}
