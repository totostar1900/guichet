"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { fmt, parseAmount } from "@/lib/format";
import { groupedInput, regroup } from "@/lib/ui/grouped";
import styles from "./page.module.css";

/**
 * PLACER CE QUI DORT, SANS INVENTER UN SECOND MÉCANISME.
 *
 * La maison ne rémunère pas la provision, et c'est une décision tenue : payer
 * un intérêt sur des fonds reçus du public est le métier d'un établissement de
 * crédit sous COBAC, pas d'une société de bourse. La sortie décidée le
 * 9 octobre 2026 est de placer ce solde en parts d'un fonds monétaire
 * inscrites au nom du client : le rendement est celui du fonds, la maison ne
 * promet rien, et elle place son propre produit.
 *
 * CE N'EST DONC PAS UN SERVICE DE PLUS, C'EST UNE SOUSCRIPTION. Un placement
 * est un ordre sur un fonds, qui se signe comme les autres et que la provision
 * couvre déjà sans virement. Le désinvestissement est un rachat. Construire
 * ici un « compte rémunéré » avec ses propres écritures aurait dédoublé le
 * journal des espèces et la chaîne des ordres pour n'ajouter qu'un nom.
 *
 * LE MONTANT SE CHOISIT ICI, ET C'EST POURQUOI CE BLOC EST PASSÉ CLIENT.
 * Il proposait « placer tout le disponible », une somme à prendre ou à
 * laisser : on plaçait tout, ou on renonçait. Le champ porte le montant, les
 * milliers se séparent pendant la frappe comme ailleurs dans la maison, et
 * chaque fonds reçoit ce montant-là. La proposition reste une proposition :
 * rien n'est coché d'avance et le client reste maître de son argent.
 */
export function PlacerLaProvision({ disponible, fonds }: { disponible: number; fonds: { id: string; titre: string; gestionnaire: string; droits?: number }[] }) {
  const t = useT();
  const [montant, setMontant] = useState(() => regroup(String(disponible)));
  if (!fonds.length) return null;
  const valeur = parseAmount(montant);
  /* Un montant au-delà du disponible serait refusé à la signature : on le dit
     ici, où il se tape, plutôt qu'à la fin du parcours. */
  const trop = valeur > disponible;
  const utilisable = valeur > 0 && !trop;
  return (
    <section className={styles.geste} id="placer">
      <div className={styles.gTete}>
        <i className={styles.n}>2</i>
        <div>
          <b>{t("La faire travailler")}</b>
          <small>{t("En parts d'un fonds monétaire, à votre nom")}</small>
        </div>
      </div>
      <div className={styles.gCorps}>
        <p>{t("Pour qu'elle ne dorme pas, placez tout ou partie du disponible. Le rendement est celui du fonds ; nous n'en promettons aucun.")}</p>
        {disponible > 0 ? (
          <>
            <div className={styles.rangee}>
              <label className={`field ${styles.champ}`}>
                {t("Montant à placer")}
                <input value={montant} inputMode="numeric" aria-describedby="placer-garde" {...groupedInput(setMontant)} />
              </label>
              <button type="button" className="btn sm" onClick={() => setMontant(regroup(String(disponible)))}>
                {t("Tout le disponible")}
              </button>
            </div>
            {trop && (
              <p id="placer-garde" className={styles.avert}>
                {t("Vous n'avez que {m} FCFA de disponible : le reste est mis de côté par vos ordres en cours, ou déjà placé.", { m: fmt(disponible) })}
              </p>
            )}
            <ul className={styles.fonds}>
              {fonds.map((f) => (
                <li key={f.id}>
                  <span>
                    <b>{f.titre}</b>
                    <small>
                      {f.gestionnaire}
                      {typeof f.droits === "number" ? ` · ${t("droits d'entrée {p} %", { p: f.droits.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) })}` : ""}
                    </small>
                  </span>
                  {utilisable ? (
                    <Link className="btn primary sm" href={`/offres/${f.id}/intention?intent=souscription&qty=${Math.round(valeur)}`}>
                      {t("Placer ici")}
                    </Link>
                  ) : (
                    <button type="button" className="btn sm" disabled>
                      {t("Placer ici")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className={styles.avert}>{t("Rien de disponible à placer pour l'instant.")}</p>
        )}
        {/* LE PRIX SE DIT AVANT, PAS AU RACHAT. Une part de fonds ne se reprend
            pas dans la seconde : tant qu'elle est placée, la somme ne règle
            plus un ordre. C'est le seul inconvénient du placement. */}
        <p className={styles.avert}>
          {t("Une fois placée, la somme ne règle plus un ordre : il faut d'abord racheter les parts, ce qui prend le délai de centralisation du fonds.")}
        </p>
      </div>
    </section>
  );
}
