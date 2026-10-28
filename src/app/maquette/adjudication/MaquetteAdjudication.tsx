"use client";

import { useMemo, useState } from "react";
import { Attente, Bandeau, Boite, chiffres, MILLIERS, Pied, Recap, Tete, Trop } from "../commun";
import styles from "../commun.module.css";
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
      <Bandeau essaie="deux champs : un montant, une enchère" />
      <Tete sur="Adjudication du Trésor" titre={titre} isin={isin} />

      {etape === 1 ? (
        <>
          <Boite
            id="montant"
            question="Combien voulez-vous placer ?"
            valeur={brut ? MILLIERS(montant) : ""}
            onChange={(v) => setBrut(chiffres(v).slice(0, 12))}
            unite="FCFA"
            dessous={
              montant === 0 ? (
                <Attente>Le nombre de bons s&apos;affiche ici pendant que vous tapez.</Attente>
              ) : t === 0 ? (
                <Attente>Posez votre taux ci-dessous : c&apos;est lui qui fixe le prix d&apos;un bon.</Attente>
              ) : bons === 0 ? (
                <Trop>Trop court pour un bon : il en faut {MILLIERS(prixUnitaire)} FCFA au minimum.</Trop>
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
              )
            }
          />

          <Boite
            id="taux"
            question="À quel taux proposez-vous ?"
            valeur={taux}
            onChange={(v) => setTaux(tauxPropre(v))}
            unite="%"
            gabarit="0,00"
            mode="decimal"
            entre={
              /* LE REPÈRE DU MARCHÉ, entre le chiffre et sa conséquence : la
                 seule pièce que cette maquette ajoute aux autres. */
              <p className={propres.repere}>
                <span className={propres.jauge} aria-hidden="true">
                  <span className={propres.marque} style={{ left: `${Math.min(100, Math.max(0, ((t || tauxIndicatif) / (tauxIndicatif * 2)) * 100))}%` }} />
                </span>
                Dernière adjudication servie à <b>{tauxIndicatif.toFixed(2).replace(".", ",")} %</b>
              </p>
            }
            dessous={
              t === 0 ? (
                <Attente>Un taux plus bas est servi plus souvent et rapporte moins ; un taux plus haut rapporte davantage, s&apos;il est servi.</Attente>
              ) : (
                <>
                  <b>{t < tauxIndicatif ? "Sous le dernier servi" : t > tauxIndicatif ? "Au-dessus du dernier servi" : "Au dernier servi"}</b>
                  <span>
                    {" "}
                    {t < tauxIndicatif ? "— servi plus souvent, rapporte moins." : t > tauxIndicatif ? "— rapporte davantage, servi moins souvent." : "— au repère du marché."}
                  </span>
                </>
              )
            }
          />

          <Pied mot="Continuer" pret={pret} sur={() => setEtape(2)} note={`${jours} jours jusqu'à l'échéance · nominal ${MILLIERS(nominal)} FCFA par bon`} />
        </>
      ) : (
        <>
          {/* « SI » EST LE MOT DE CETTE PAGE : une adjudication ne se promet
              pas, et le récapitulatif ne doit pas laisser croire l'inverse. */}
          <Recap
            titre="Vérifiez, puis envoyez"
            lignes={[
              { quoi: "Vous proposez", dit: `${MILLIERS(debourse)} FCFA`, fort: true },
              { quoi: "À quel taux", dit: `${taux} %` },
              { quoi: "Soit", dit: `${MILLIERS(bons)} ${bons > 1 ? "bons" : "bon"} de ${MILLIERS(nominal)} FCFA` },
              { quoi: "Si vous êtes servi", dit: `vous recevez ${MILLIERS(rendu)} FCFA le ${echeance ? new Date(echeance).toLocaleDateString("fr-FR") : "—"}` },
            ]}
            mot="Le Trésor sert les taux les plus bas d'abord. Vous pouvez n'être servi qu'en partie, ou pas du tout ; le desk vous le dit le jour des résultats."
          />
          <Pied mot="Envoyer au desk" sur={() => setEtape(1)} second="Corriger" surSecond={() => setEtape(1)} />
        </>
      )}
    </div>
  );
}
