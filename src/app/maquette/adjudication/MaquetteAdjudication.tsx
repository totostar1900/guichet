"use client";

import { useMemo, useState } from "react";
import styles from "../ordre/maquette.module.css";
import propres from "./adjudication.module.css";

/**
 * DEUX CHAMPS, ET LE SECOND EST UNE ENCHÈRE.
 *
 * Le montant se saisit comme dans la première maquette : grand, avec ses
 * milliers qui se posent pendant la frappe, et ce qu'il donne — ici des bons
 * d'un million — qui se lit sous la main.
 *
 * LE TAUX EST L'AUTRE PROBLÈME, et il n'a rien à voir. Ce n'est pas une somme
 * qu'on possède, c'est une offre qu'on fait sans savoir si elle sera retenue.
 * Trois choses doivent donc se voir en même temps que le chiffre tapé :
 *
 *   CE QUE LE MARCHÉ A FAIT la dernière fois, pour que l'enchère ait un
 *   repère au lieu d'être un pari dans le vide.
 *
 *   DANS QUEL SENS ON SE DÉPLACE. Le Trésor sert les taux les plus bas
 *   d'abord : demander moins, c'est être servi plus souvent et gagner moins ;
 *   demander plus, c'est gagner davantage SI l'on est servi. Cette phrase est
 *   la seule chose que le client a besoin de comprendre, et elle n'est écrite
 *   nulle part aujourd'hui.
 *
 *   CE QUE ÇA FAIT EN FRANCS. « 4,90 % » ne dit rien ; « vous payez 975 500
 *   FCFA par bon et recevez 1 000 000 à l'échéance » dit tout.
 *
 * LE RÉCAPITULATIF PORTE LE MOT « SI » : une adjudication ne se promet pas.
 */
const MILLIERS = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ");
const chiffres = (v: string) => v.replace(/\D/g, "");
/** Un taux se tape avec une virgule ou un point, et deux décimales au plus. */
const tauxPropre = (v: string) => v.replace(/[^0-9,.]/g, "").replace(".", ",").replace(/(,\d{0,2}).*/, "$1").slice(0, 6);
const enNombre = (v: string) => Number(v.replace(",", ".") || 0);

export function MaquetteAdjudication({ titre, isin, nominal, tauxIndicatif, echeance, reglement }: { titre: string; isin: string; nominal: number; tauxIndicatif: number; echeance: string; reglement: string }) {
  const [brut, setBrut] = useState("");
  const [taux, setTaux] = useState("");
  const [etape, setEtape] = useState<1 | 2>(1);

  const montant = Number(chiffres(brut) || 0);
  const t = enNombre(taux);
  const jours = useMemo(() => {
    const a = new Date(reglement || Date.now());
    const b = new Date(echeance || Date.now());
    return Math.max(1, Math.round((b.getTime() - a.getTime()) / 864e5));
  }, [reglement, echeance]);

  /* LE PRIX D'UN BON À INTÉRÊTS PRÉCOMPTÉS : on paie le nominal moins les
     intérêts de la période. C'est volontairement la formule simple, celle que
     la maquette doit MONTRER ; le vrai calcul vit dans « lib/finance ». */
  const prixUnitaire = t > 0 ? nominal * (1 - (t / 100) * (jours / 365)) : 0;
  const bons = prixUnitaire > 0 ? Math.floor(montant / prixUnitaire) : 0;
  const debourse = bons * prixUnitaire;
  const rendu = bons * nominal;
  const pret = bons > 0 && t > 0;

  return (
    <div className={styles.ecran}>
      <p className={styles.bandeau}>
        Maquette · rien n&apos;est envoyé · <span>deux champs : un montant, une enchère</span>
      </p>

      <header className={styles.tete}>
        <span className={styles.marche}>Adjudication du Trésor</span>
        <h1 className={styles.titre}>{titre}</h1>
        <span className={styles.isin}>{isin}</span>
      </header>

      {etape === 1 ? (
        <>
          <section className={styles.carte}>
            <label className={styles.champLabel} htmlFor="montant">
              Combien voulez-vous placer ?
            </label>
            <div className={styles.saisie}>
              <input id="montant" inputMode="numeric" autoComplete="off" placeholder="0" value={brut ? MILLIERS(montant) : ""} onChange={(e) => setBrut(chiffres(e.target.value).slice(0, 12))} />
              <span className={styles.unite}>FCFA</span>
            </div>
            <p className={styles.equiv} aria-live="polite">
              {montant === 0 ? (
                <span className={styles.equivVide}>Le nombre de bons s&apos;affiche ici pendant que vous tapez.</span>
              ) : t === 0 ? (
                <span className={styles.equivVide}>Posez votre taux ci-dessous : c&apos;est lui qui fixe le prix d&apos;un bon.</span>
              ) : bons === 0 ? (
                <span className={styles.equivCourt}>Trop court pour un bon : il en faut {MILLIERS(prixUnitaire)} FCFA au minimum.</span>
              ) : (
                <>
                  <b>
                    ≈ {MILLIERS(bons)} {bons > 1 ? "bons" : "bon"} de {MILLIERS(nominal)} FCFA
                  </b>
                  <span>
                    {" "}· vous décaissez {MILLIERS(debourse)} FCFA
                    {montant - debourse >= 1 ? ` · ${MILLIERS(montant - debourse)} FCFA resteront de côté` : ""}
                  </span>
                </>
              )}
            </p>
          </section>

          <section className={styles.carte}>
            <label className={styles.champLabel} htmlFor="taux">
              À quel taux proposez-vous ?
            </label>
            <div className={styles.saisie}>
              <input id="taux" inputMode="decimal" autoComplete="off" placeholder="0,00" value={taux} onChange={(e) => setTaux(tauxPropre(e.target.value))} />
              <span className={styles.unite}>%</span>
            </div>

            {/* LE REPÈRE, PUIS LE SENS, PUIS LES FRANCS : trois lignes, et
                elles n'apparaissent que quand elles ont quelque chose à dire. */}
            <p className={propres.repere}>
              <span className={propres.jauge} aria-hidden="true">
                <span className={propres.marque} style={{ left: `${Math.min(100, Math.max(0, ((t || tauxIndicatif) / (tauxIndicatif * 2)) * 100))}%` }} />
              </span>
              Dernière adjudication servie à <b>{tauxIndicatif.toFixed(2).replace(".", ",")} %</b>
            </p>
            <p className={styles.equiv} aria-live="polite">
              {t === 0 ? (
                <span className={styles.equivVide}>Un taux plus bas est servi plus souvent et rapporte moins ; un taux plus haut rapporte davantage, s&apos;il est servi.</span>
              ) : (
                <>
                  <b>{t < tauxIndicatif ? "Sous le dernier servi" : t > tauxIndicatif ? "Au-dessus du dernier servi" : "Au dernier servi"}</b>
                  <span>
                    {" "}
                    {t < tauxIndicatif ? "— servi plus souvent, rapporte moins." : t > tauxIndicatif ? "— rapporte davantage, servi moins souvent." : "— au repère du marché."}
                  </span>
                </>
              )}
            </p>
          </section>

          <div className={styles.pied}>
            <button type="button" className={styles.action} disabled={!pret} onClick={() => setEtape(2)}>
              Continuer
            </button>
            <small>
              {jours} jours jusqu&apos;à l&apos;échéance · nominal {MILLIERS(nominal)} FCFA par bon
            </small>
          </div>
        </>
      ) : (
        <>
          <section className={styles.carte}>
            <h2 className={styles.recapTitre}>Vérifiez, puis envoyez</h2>
            <dl className={styles.recap}>
              <div className={styles.recapFort}>
                <dt>Vous proposez</dt>
                <dd>{MILLIERS(debourse)} FCFA</dd>
              </div>
              <div>
                <dt>À quel taux</dt>
                <dd>{taux} %</dd>
              </div>
              <div>
                <dt>Soit</dt>
                <dd>
                  {MILLIERS(bons)} {bons > 1 ? "bons" : "bon"} de {MILLIERS(nominal)} FCFA
                </dd>
              </div>
              <div>
                <dt>Si vous êtes servi</dt>
                <dd>
                  vous recevez {MILLIERS(rendu)} FCFA le {echeance ? new Date(echeance).toLocaleDateString("fr-FR") : "—"}
                </dd>
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
            {/* « SI » EST LE MOT DE CETTE PAGE : une adjudication ne se promet
                pas, et le récapitulatif ne doit pas laisser croire l'inverse. */}
            <p className={styles.recapMot}>
              Le Trésor sert les taux les plus bas d&apos;abord. Vous pouvez n&apos;être servi qu&apos;en partie, ou pas du tout ; le desk vous le dit le jour des résultats.
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
