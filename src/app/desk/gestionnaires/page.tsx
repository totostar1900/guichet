import { DeskNav } from "@/components/DeskNav";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { accesLu, KIND_ACCES_GESTIONNAIRE } from "@/lib/domain/gestionnaire-acces";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { FormulaireDInvitation } from "./Formulaire";
import { retirerUnAcces } from "./actions";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gestionnaires" };

/**
 * LES GESTIONNAIRES DE FONDS INVITÉS (28 novembre 2026, planche « Espace gestionnaire », 1B) : la direction seule pose et retire un accès. Une adresse, une personne, les sociétés de gestion dont elle lit
 * les fonds (au nom du bulletin). Aucune donnée de fonds ni de commissionnement n'est lue ici.
 */
export default async function GestionnairesPage() {
  await requireResponsable("/desk/gestionnaires");
  const t = await getT();
  const lignes = (await repo().listPrive(KIND_ACCES_GESTIONNAIRE)).map((r) => accesLu(r.key, r.data)).filter((a): a is NonNullable<typeof a> => Boolean(a)).sort((a, b) => a.email.localeCompare(b.email));
  return (
    <div className={styles.page}>
      <DeskNav current="/desk/gestionnaires" />
      <header className={styles.head}>
        <h1>{t("Gestionnaires de fonds")}</h1>
        <p>{t("Les personnes des sociétés de gestion qui lisent l'espace gestionnaire : l'encours de nos clients dans leurs fonds, jour par jour, et le nombre de porteurs à partir de cinq. Elles ne voient ni un client, ni un ordre, ni ce que la maison reçoit d'elles.")}</p>
      </header>
      <section className={styles.bloc}>
        <h2>{t("Inviter")}</h2>
        <FormulaireDInvitation />
      </section>
      <section className={styles.bloc}>
        <h2>{t("Accès posés")}</h2>
        {lignes.length === 0 ? (
          <p className={styles.vide}>{t("Aucun accès posé. Personne ne peut encore lire l'espace gestionnaire.")}</p>
        ) : (
          <div className={styles.large}>
            <table className={styles.tableau}>
              <thead>
                <tr>
                  <th>{t("Adresse")}</th>
                  <th>{t("Personne")}</th>
                  <th>{t("Sociétés lues")}</th>
                  <th>{t("Posé")}</th>
                  <th>{t("État")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lignes.map((a) => (
                  <tr key={a.email}>
                    <td>{a.email}</td>
                    <td>{a.nom}</td>
                    <td>{a.gestionnaires.join(", ")}</td>
                    <td>{a.le ? `${fmtDate(a.le, true)} · ${a.invitePar}` : "—"}</td>
                    <td>{a.actif ? t("Actif") : t("Retiré")}</td>
                    <td>
                      {a.actif && (
                        <form action={retirerUnAcces}>
                          <input type="hidden" name="email" value={a.email} />
                          <button className="btn sm" type="submit">
                            {t("Retirer")}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
