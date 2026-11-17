import { getT } from "@/i18n/server";
import { fmt } from "@/lib/format";
import { loadReglement } from "@/lib/policy";
import { reglementUtilisable } from "@/lib/domain/reglement";
import type { Intent } from "@/lib/domain/types";
import { Copier } from "@/app/moi/provision/Copier";
import prov from "@/app/moi/provision/page.module.css";
import styles from "./page.module.css";

/**
 * « POUR FINIR » : CE QU'IL RESTE À FAIRE UNE FOIS L'ORDRE SIGNÉ (16 novembre 2026, planche « Mon argent », 6A ; partagé le 17 novembre avec la page de confirmation, 4A).
 *
 * Un ordre signé suffit : la page dit comment le régler. Les coordonnées viennent du desk (Référentiel › Règlement), le motif est la référence de l'ordre. Rien à virer quand la provision a couvert
 * l'ordre, ni pour un rachat : le produit part sur le compte de règlement. Une seule écriture pour la page de l'ordre et pour celle de la confirmation : deux copies auraient divergé.
 */
export async function PourFinir({ intent, aRegler, titre, rachat, couvert }: { intent: Intent; aRegler: number; titre: boolean; rachat: boolean; couvert: boolean }) {
  const t = await getT();
  if (rachat) return <p className={styles.fin}>{t("Rien à virer : le produit sera viré sur votre compte de règlement après l'exécution.")}</p>;
  if (couvert || aRegler <= 0) return null;
  const reglement = await loadReglement();
  const virementPossible = reglementUtilisable(reglement);
  return (
    <section className={styles.recap}>
      <div className={styles.recapH}>{t("Pour finir")}</div>
      <p className={styles.virer}>{titre ? t("Virez au plus {m} FCFA", { m: fmt(aRegler) }) : t("Virez {m} FCFA", { m: fmt(aRegler) })}</p>
      {virementPossible ? (
        <dl className={prov.coord}>
          <div>
            <dt>{t("Bénéficiaire")}</dt>
            <dd>
              <span>{reglement.beneficiaire}</span>
              <Copier valeur={reglement.beneficiaire} quoi={t("le bénéficiaire")} />
            </dd>
          </div>
          <div>
            <dt>{t("Banque du bénéficiaire")}</dt>
            <dd>
              <span>{reglement.banque}</span>
              <Copier valeur={reglement.banque} quoi={t("la banque")} />
            </dd>
          </div>
          <div>
            <dt>{t("RIB / IBAN")}</dt>
            <dd>
              <span className="mono">{reglement.rib}</span>
              <Copier valeur={reglement.rib} quoi={t("le RIB")} />
            </dd>
          </div>
          <div className={prov.ligneMotif}>
            <dt>
              {t("Motif du virement")} <span>{t("obligatoire")}</span>
            </dt>
            <dd>
              <b className="mono">{intent.ref}</b>
              <Copier valeur={intent.ref} quoi={t("le motif du virement")} />
            </dd>
          </div>
        </dl>
      ) : (
        <p className={styles.hint}>{t("Les coordonnées ne sont pas encore publiées : demandez-les à votre conseiller. Le motif de votre virement sera la référence {r}.", { r: intent.ref })}</p>
      )}
    </section>
  );
}
