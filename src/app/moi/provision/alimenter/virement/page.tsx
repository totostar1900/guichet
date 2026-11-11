import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { loadReglement } from "@/lib/policy";
import { reglementUtilisable } from "@/lib/domain/reglement";
import { referenceDeProvision } from "@/lib/domain/cash";
import { getT } from "@/i18n/server";
import { Copier } from "../../Copier";
import styles from "../../page.module.css";
import barre from "@/components/mobile/BarreDEtape.module.css";
import { BarreCollante } from "@/components/mobile/BarreDEtape";
import { BoutonRetour } from "@/components/mobile/BoutonRetour";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Par virement") };
}

/**
 * APPROVISIONNER, DEUXIÈME ÉTAPE : LE VIREMENT (10 novembre 2026).
 *
 * Les coordonnées se recopient dans le formulaire de la banque DANS CET ORDRE : bénéficiaire, banque, RIB, motif. Le motif est en dernier, et marqué : c'est la seule des quatre lignes qu'on ne peut pas omettre sans que l'argent arrive sans nom.
 * « J'ai fait le virement » mène à la confirmation ; il ne s'offre que si les coordonnées sont publiées : un bouton qui dirait « fait » après des points de suspension ne vaudrait rien.
 */
export default async function VirementPage() {
  const t = await getT();
  const s = await requireSession("/moi/provision/alimenter/virement");
  const reference = referenceDeProvision(s.userId);
  /* LES COORDONNÉES VIENNENT DU DESK, pas du code : voir /desk/referentiel/reglement. Tant qu'elles ne sont pas publiées, la page le DIT au lieu d'afficher des points de suspension. */
  const reglement = await loadReglement();
  const virementPossible = reglementUtilisable(reglement);

  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          surTitre={t("Mon argent chez nous")}
          titre={t("Par virement")}
          phrase={t("C'est vous qui l'envoyez, depuis votre banque, quand vous voulez. Nous le reconnaissons à son arrivée.")}
        />

        <div className={styles.chemin}>
          {virementPossible ? (
            <>
              <dl className={styles.coord}>
                <div>
                  <dt>{t("Bénéficiaire")}</dt>
                  <dd>
                    <span>{reglement.beneficiaire}</span>
                    <Copier valeur={reglement.beneficiaire} quoi={t("le bénéficiaire")} />
                  </dd>
                </div>
                <div>
                  {/* PAS « Banque » TOUT COURT : cette clef est déjà le secteur
                      d'une société cotée, traduit « Banking ». Un mot seul fait
                      une clef fragile, et la maison s'est déjà fait prendre. */}
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
                {/* LE BIC NE PARAÎT QUE S'IL EXISTE. Une ligne vide de plus ne
                    vaut pas mieux qu'une ligne absente, et un virement de la
                    zone n'en a pas besoin. */}
                {reglement.bic ? (
                  <div>
                    <dt>{t("BIC / SWIFT")}</dt>
                    <dd>
                      <span className="mono">{reglement.bic}</span>
                      <Copier valeur={reglement.bic} quoi={t("le BIC")} />
                    </dd>
                  </div>
                ) : null}
                {/* LE MOTIF EN DERNIER : c'est son rang dans le formulaire de la
                    banque. Et marqué, parce que c'est la seule des quatre lignes
                    qu'on ne peut pas omettre. */}
                <div className={styles.ligneMotif}>
                  <dt>
                    {t("Motif du virement")} <span>{t("obligatoire")}</span>
                  </dt>
                  <dd>
                    <b className="mono">{reference}</b>
                    <Copier valeur={reference} quoi={t("le motif du virement")} />
                  </dd>
                </div>
              </dl>
              <p className={styles.avert}>
                {t("Les quatre lignes se recopient dans cet ordre dans le formulaire de votre banque.")} {t("Le motif rattache votre virement à votre compte : sans lui, il arrive sans nom. Le compte émetteur doit être au vôtre.")}
              </p>
            </>
          ) : (
            /* CE QUI MANQUE SE NOMME. Des points de suspension à la place d'un
               RIB sont pires qu'une ligne absente : un client les recopie, et
               son virement n'arrive nulle part. Le motif reste affiché — il
               est à lui, il ne dépend d'aucune coordonnée, et il servira le
               jour où le desk aura publié le compte. */
            <>
              <div className={styles.manque}>
                <b>{t("Les coordonnées ne sont pas encore publiées")}</b>
                <p>{t("Demandez-les à votre conseiller avant de faire un virement : nous préférons vous le dire plutôt que vous laisser recopier un numéro incomplet.")}</p>
              </div>
              <dl className={styles.coord}>
                <div className={styles.ligneMotif}>
                  <dt>
                    {t("Motif du virement")} <span>{t("obligatoire")}</span>
                  </dt>
                  <dd>
                    <b className="mono">{reference}</b>
                    <Copier valeur={reference} quoi={t("le motif du virement")} />
                  </dd>
                </div>
              </dl>
              <p className={styles.avert}>{t("Ce motif est le vôtre et ne changera pas : c'est lui qui rattachera votre virement à votre compte.")}</p>
            </>
          )}
        </div>

        <BarreCollante>
          <BoutonRetour href="/moi/argent" className={`btn ${barre.retour}`}>
            {t("Retour")}
          </BoutonRetour>
          {virementPossible && (
            <Link href="/moi/provision/alimenter/virement/envoye" className={`btn primary ${barre.suivant}`}>
              {t("J'ai fait le virement")}
            </Link>
          )}
        </BarreCollante>
      </div>
    </Glissement>
  );
}
