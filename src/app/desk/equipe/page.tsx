import { DeskNav } from "@/components/DeskNav";
import { mfaRequired, requireResponsable } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { AddStaffForm, RoleForm } from "./Forms";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Équipe" };

/** Who can act for the company, at which level, with or without a second factor. Responsable only. */
export default async function EquipePage() {
  const t = await getT();
  const me = await requireResponsable("/desk/equipe");
  const staff = await repo().listStaff();
  const bootstrap = (process.env.DESK_EMAILS ?? "").trim();
  return (
    <>
      <DeskNav current="/desk/equipe" />
      <div className={styles.head} data-coach="roles">
        <h1>{t("Équipe")}</h1>
        <p className="muted">
          {t("Trois niveaux.")} <b>{t("Client")}</b> {t(": lit et déclare des intentions.")} <b>{t("Opérateur desk")}</b> {t(": valide, publie, traite les intentions, tient le référentiel.")} <b>{t("Responsable")}</b> {t(": opérateur + gestion de l'équipe et approbations. Le système (crons, robot) n'est pas un utilisateur. Tout changement de niveau est journalisé.")}
        </p>
      </div>

      <div className={styles.cols}>
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Accès desk")} ({staff.length})</h2>
            <span className="muted">{t(mfaRequired() ? "Second facteur obligatoire" : "Second facteur désactivé (DESK_MFA=off)")}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Personne")}</th>
                <th>{t("Niveau")}</th>
                <th>{t("Second facteur")}</th>
                <th>{t("Depuis")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.name}</b>
                    <br />
                    <small className="muted">{s.email ?? s.phone ?? s.id}</small>
                  </td>
                  <td>
                    <span className={`${styles.role} ${styles[s.role]}`}>{t(ROLE_LABEL[s.role])}</span>
                  </td>
                  <td>{s.mfaEnrolledAt ? <span className={styles.okTag}>{t("activé")} {fmtDateTime(s.mfaEnrolledAt)}</span> : <span className={styles.warnTag}>{t("à activer à la prochaine connexion")}</span>}</td>
                  <td>
                    {s.roleSetAt ? fmtDateTime(s.roleSetAt) : "—"}
                    {s.roleSetBy && <small className="muted">{t(`· par ${s.roleSetBy}`)}</small>}
                  </td>
                  <td className="r">
                    <RoleForm userId={s.id} role={s.role} self={s.id === me.userId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="panel">
            <div className="panel-h">
              <h2>{t("Donner l'accès")}</h2>
            </div>
            <AddStaffForm />
            <p className={styles.note}>{t("La personne se connecte d'abord une fois au Guichet avec son adresse (code e-mail) ; vous lui donnez ensuite l'accès ici. À sa connexion suivante, elle active son second facteur (application d'authentification), puis entre sur le desk.")}</p>
          </div>
          <div className="panel">
            <div className="panel-h">
              <h2>{t("Règles")}</h2>
            </div>
            <ul className={styles.rules}>
              <li>{t("Personne ne modifie son propre niveau ; il reste toujours au moins un responsable.")}</li>
              <li>{t("Retirer l'accès ne supprime rien : le compte redevient client, l'historique de ses actions reste dans le journal.")}</li>
              <li>{t("Téléphone perdu : un responsable retire l'accès puis le redonne ; la personne réactive son second facteur.")}</li>
              <li>
                {bootstrap ? (
                  <>
                    {t("Amorçage :")} <code className="mono">DESK_EMAILS</code> {t(bootstrap.includes(",") ? "est encore renseigné ({n} adresses). Chaque adresse devient responsable à sa première connexion ; une fois l'équipe en place, videz la variable sur Vercel." : "est encore renseigné ({n} adresse). Chaque adresse devient responsable à sa première connexion ; une fois l'équipe en place, videz la variable sur Vercel.", { n: bootstrap.split(",").length })}
                  </>
                ) : (
                  <>
                    {t("Amorçage terminé :")} <code className="mono">{t("DESK_EMAILS")}</code> {t("est vide, seule cette page donne l'accès.")}
                  </>
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
