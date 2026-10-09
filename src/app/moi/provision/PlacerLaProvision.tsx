import Link from "next/link";
import { getT } from "@/i18n/server";
import { fmt } from "@/lib/format";
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
 * LA PROPOSITION EST UNE PROPOSITION. Elle paraît quand il y a de quoi placer,
 * elle ne coche rien d'avance, et le client reste maître de son argent : c'est
 * la différence entre proposer et balayer.
 */
export async function PlacerLaProvision({ disponible, fonds }: { disponible: number; fonds: { id: string; titre: string; gestionnaire: string }[] }) {
  const t = await getT();
  if (!fonds.length) return null;
  return (
    <section className={styles.bloc}>
      <h2>{t("Le faire travailler")}</h2>
      <p className={styles.note}>
        {t(
          "Votre provision vous appartient et attend vos ordres. Pour qu'elle ne dorme pas, vous pouvez en placer tout ou partie en parts d'un fonds monétaire, inscrites à votre nom. Le rendement est celui du fonds ; nous n'en promettons aucun.",
        )}
      </p>
      {disponible > 0 ? (
        <ul className={styles.liste}>
          {fonds.map((f) => (
            <li key={f.id}>
              <Link href={`/offres/${f.id}/intention?intent=souscription&qty=${disponible}`}>
                <span>
                  <b>{f.titre}</b>
                  <small>{f.gestionnaire}</small>
                </span>
                <b className={styles.montant}>{t("Placer {m} FCFA", { m: fmt(disponible) })}</b>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.note}>{t("Rien de disponible à placer pour l'instant.")}</p>
      )}
      {/* LE PRIX SE DIT AVANT, PAS AU RACHAT. Une part de fonds ne se reprend
          pas dans la seconde : tant qu'elle est placée, la somme ne règle plus
          un ordre. C'est le seul inconvénient du placement, et il se dit ici. */}
      <p className={styles.note}>
        {t("Une fois placée, la somme n'est plus disponible pour régler un ordre : il faut d'abord racheter les parts, ce qui prend le délai de centralisation du fonds.")}
      </p>
    </section>
  );
}
