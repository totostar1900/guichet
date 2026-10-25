import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { loadReglement } from "@/lib/policy";
import { cequiManque, REGLEMENT_KEY, type CoordonneesDeReglement } from "@/lib/domain/reglement";
import { REF } from "@/lib/reference";
import { ReglementForm } from "./Form";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compte de règlement" };

/**
 * LE COMPTE SUR LEQUEL LES CLIENTS VIRENT.
 *
 * Il était en dur : le bénéficiaire dans le code, la banque et le RIB dans
 * deux variables d'environnement. Changer de banque de règlement demandait
 * donc un déploiement, et tant que personne n'avait rempli ces variables, la
 * page du client affichait « …………… (RIB à renseigner) » — des points de
 * suspension à l'endroit exact où l'on tape un numéro de compte. Cette page
 * est la moitié qui manquait, comme pour le délai de souffrance.
 *
 * ELLE N'EST PAS UN RÉGLAGE DE PLUS. Un seuil mal posé fait du bruit ; un RIB
 * mal posé envoie l'argent de toute la clientèle ailleurs, et c'est la forme
 * exacte que prend la fraude au virement. D'où les deux temps : un brouillon,
 * puis une publication PAR UNE AUTRE PERSONNE — la règle des quatre yeux, qui
 * regarde la personne et non le rôle. Dans une maison qui n'a qu'un
 * responsable, le contrôle est impossible et non à inventer : le geste passe,
 * et il se dit au journal.
 *
 * ET ELLE MONTRE OÙ CES LIGNES SORTENT. Trois endroits les portent — l'écran
 * du client, l'appel de fonds d'un ordre, celui d'une souscription de fonds —
 * et un RIB se publie en sachant ce qu'on réimprime.
 */
export default async function ReglementPage() {
  const me = await requireResponsable("/desk/referentiel/reglement");
  const t = await getT();

  const actuel = await loadReglement();
  const row = (await repo().listReference(REF.policy)).find((x) => x.key === REGLEMENT_KEY);
  const brouillon = row?.draft?.op === "set" ? (row.draft.data as CoordonneesDeReglement) : undefined;
  /* Y a-t-il quelqu'un d'autre pour publier ? La même question que
     « quatreYeux », posée ici pour le DIRE avant le geste plutôt qu'après. */
  const staff = await repo().listStaff().catch(() => []);
  const seul = staff.filter((m) => m.role === "responsable" && m.name !== me.name).length === 0;
  const manque = cequiManque(actuel);

  return (
    <>
      <DeskNav current="/desk/referentiel/reglement" />
      <div className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Compte de règlement")}</h1>
          <p className="muted">
            {t(
              "Les coordonnées que le client recopie dans le formulaire de sa banque, et que portent les appels de fonds. Elles s'écrivent ici : aucun déploiement, et aucune variable d'environnement à toucher.",
            )}
          </p>
        </header>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Ce que les clients lisent en ce moment")}</h2>
          </div>
          <div className={styles.corps}>
            {manque.length > 0 ? (
              <p className={styles.trou}>
                {/* LES LIBELLÉS NE SE MINUSCULISENT PAS : « RIB / IBAN » devenait
                    « rib / iban », c'est-à-dire plus un sigle. Ils se citent tels
                    que les porte la ligne qu'ils nomment. */}
                {t("Rien n'est encore publié : {quoi}. Tant que c'est le cas, le chemin du virement dit au client de s'adresser au desk au lieu d'afficher des coordonnées incomplètes.", {
                  quoi: manque.map((m) => t(m)).join(", "),
                })}
              </p>
            ) : null}
            <dl className={styles.lu}>
              <div>
                <dt>{t("Bénéficiaire")}</dt>
                <dd>{actuel.beneficiaire || <i>{t("— rien —")}</i>}</dd>
              </div>
              <div>
                <dt>{t("Banque du bénéficiaire")}</dt>
                <dd>{actuel.banque || <i>{t("— rien —")}</i>}</dd>
              </div>
              <div>
                <dt>{t("RIB / IBAN")}</dt>
                <dd className="mono">{actuel.rib || <i>{t("— rien —")}</i>}</dd>
              </div>
              <div>
                <dt>{t("BIC / SWIFT")}</dt>
                <dd className="mono">{actuel.bic || <i>{t("— rien —")}</i>}</dd>
              </div>
            </dl>
            {/* « PUBLIÉ LE » SE LIT DE « data », ET NON DE « updatedAt ».
                Relevé en jouant le parcours le 25 octobre 2026 : enregistrer un
                brouillon CRÉE la ligne du référentiel, avec sa date, et
                « data » reste nul. La page annonçait donc « Publié le
                25 octobre » sous quatre lignes vides, c'est-à-dire une
                publication qui n'avait pas eu lieu. Une date fausse sur un
                panneau qui dit « ce que les clients lisent » est pire que pas
                de date du tout. */}
            <p className="muted">
              {row?.data != null
                ? t("Publié le {d}{par}.", { d: row.updatedAt.slice(0, 10), par: row.updatedBy ? t(", écrit par {q}", { q: row.updatedBy }) : "" })
                : t("Valeurs livrées avec le code, jamais écrites au desk.")}
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Les écrire")}</h2>
          </div>
          <div className={styles.corps}>
            <p>
              {t(
                "Un enregistrement ne publie rien : il laisse un brouillon, qu'une autre personne du desk relit et publie. Ce n'est pas une formalité — un faux RIB arrive toujours par une seule main pressée, et c'est la seconde main qui l'arrête.",
              )}
            </p>
            <ReglementForm actuel={actuel} brouillon={brouillon} parQui={row?.draftBy} cestMoi={!!row?.draftBy && row.draftBy === me.name} seul={seul} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Où ces lignes sortent")}</h2>
          </div>
          <div className={styles.corps}>
            <ul className={styles.sorties}>
              <li>
                <Link href="/moi/provision/alimenter">{t("Approvisionner votre compte")}</Link> — {t("les trois lignes et le motif, avec un bouton de recopie par ligne.")}
              </li>
              <li>{t("L'appel de fonds d'un ordre : le motif y est la référence de l'ordre, pas celle du compte.")}</li>
              <li>{t("L'appel de fonds d'une souscription de fonds, et celui d'un versement complémentaire.")}</li>
            </ul>
            <p className="muted">
              {t("Un document déjà émis garde les coordonnées qu'il portait : un PDF est une pièce, pas une vue.")} <Link href="/desk/journal">{t("Le journal")}</Link>{" "}
              {t("garde qui a écrit et qui a publié, et l'audit garde l'avant et l'après.")}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
