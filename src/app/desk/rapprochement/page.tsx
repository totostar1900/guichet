import { DeskNav } from "@/components/DeskNav";
import { getT } from "@/i18n/server";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { ecart } from "@/lib/domain/rapprochement";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { Declarer } from "./Declarer";
import { duDuJour } from "./actions";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rapprochement" };

/**
 * Ce que la maison doit à ses clients, face à ce qu'elle tient.
 *
 * La règle des espèces s'est ouverte le 2 octobre 2026 : l'argent qui se trouve
 * sur les comptes de la maison appartient au client et peut y rester aussi
 * longtemps qu'il le souhaite. Cette phrase crée l'obligation de contrôle que
 * l'ancienne règle évitait en ne gardant rien, et cette page est ce contrôle.
 *
 * L'APPLICATION NE CONNAÎT QU'UN CÔTÉ, et la page le dit plutôt que de le
 * cacher. Le journal des espèces dit ce que la maison doit à chacun, et c'est
 * le seul endroit qui le dise. Mais rien ici ne lit le solde des comptes à la
 * BEAC, à la BVMAC ou en banque : l'autre côté se déclare, contre sa pièce,
 * exactement comme l'encaissement d'un coupon.
 *
 * Le jour où ces soldes nous parviendront autrement qu'à la main, c'est la
 * moitié déclarée de cette page qui disparaîtra, et pas le contrôle.
 */
export default async function RapprochementPage() {
  await requireDesk("/desk/rapprochement");
  const t = await getT();
  const r = repo();
  const [du, historique] = await Promise.all([duDuJour(), r.listRapprochements(24).catch(() => [])]);
  const aujourdHui = localIso(new Date());
  const dernier = historique[0];

  return (
    <>
      <DeskNav current="/desk/rapprochement" />
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1>{t("Rapprochement")}</h1>
            <p className="muted">
              {t(
                "Le solde d'un client lui appartient et reste tant qu'il le souhaite. Ce contrôle compare ce que la maison doit, que le journal des espèces sait, à ce qu'elle tient, que ses relevés disent et qu'un opérateur déclare ici.",
              )}
            </p>
          </div>
        </header>

        <div className={styles.band}>
          <div>
            <span>{t("Dû aux clients")}</span>
            <b>{fmt(du.owed)}</b>
          </div>
          <div>
            <span>{t("Dont affecté à un ordre")}</span>
            <b>{fmt(du.assigned)}</b>
          </div>
          <div>
            <span>{t("Dont réclamable")}</span>
            <b>{fmt(du.reclamable)}</b>
          </div>
          <div>
            <span>{t("Clients avec un solde")}</span>
            <b>{du.clients}</b>
          </div>
          <div>
            <span>{t("Dernier contrôle")}</span>
            <b>{dernier ? fmtDate(dernier.onDate) : "—"}</b>
          </div>
        </div>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Déclarer les soldes du jour")}</h2>
            <span className="muted">{t("Un compte par ligne, avec sa pièce. L'écart se calcule pendant que vous saisissez.")}</span>
          </div>
          <div className={styles.pb}>
            <Declarer du={du} aujourdHui={aujourdHui} />
          </div>
        </section>

        {historique.length > 0 && (
          <section className="panel">
            <div className="panel-h">
              <h2>{t("Les contrôles passés")}</h2>
              <span className="muted">{t("Chaque ligne garde les deux chiffres tels qu'ils ont été comparés ce jour-là.")}</span>
            </div>
            <div className="scroll-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("Date")}</th>
                    <th className="r">{t("Dû")}</th>
                    <th className="r">{t("Tenu")}</th>
                    <th className="r">{t("Écart")}</th>
                    <th>{t("Comptes")}</th>
                    <th>{t("Explication")}</th>
                    <th>{t("Par")}</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((h) => {
                    const e = ecart(h.owed, h.held);
                    return (
                      <tr key={h.id}>
                        <td>{fmtDate(h.onDate)}</td>
                        <td className="r">{fmt(Math.round(h.owed))}</td>
                        <td className="r">{fmt(Math.round(h.held))}</td>
                        <td className="r">
                          <span className={e.sens === "manque" ? "st annulee" : e.sens === "excedent" ? "st transmise" : "st reglee"}>
                            {e.montant > 0 ? "+" : e.montant < 0 ? "−" : ""}
                            {fmt(Math.abs(e.montant))}
                          </span>
                        </td>
                        <td className="muted">{h.accounts.map((a) => a.label).join(" · ") || "—"}</td>
                        <td className="muted">{h.note ?? "—"}</td>
                        <td className="muted">{h.createdBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Ce que ce contrôle dit, et ce qu'il ne dit pas")}</h2>
          </div>
          <div className={styles.pb}>
            <ol className={styles.steps}>
              <li>
                {t(
                  "Le dû vient du journal des espèces, client par client. C'est le seul endroit qui dise à qui appartient chaque franc des comptes de la maison : la ségrégation repose entièrement sur lui.",
                )}
              </li>
              <li>
                {t(
                  "Un solde négatif d'un client ne compense pas celui d'un autre. La maison ne doit pas « le net » : elle doit à chacun ce qu'elle lui doit, et un journal négatif est une anomalie que le total ne doit pas absorber en silence.",
                )}
              </li>
              <li>
                {t(
                  "Le tenu est déclaré, pas lu. L'application ne connaît pas le solde des comptes à la BEAC, à la BVMAC ou en banque : un opérateur le saisit contre ses relevés, et la pièce reste avec le chiffre.",
                )}
              </li>
              <li>
                {t(
                  "Tenir plus que ce qu'on doit est ordinaire, tenir moins ne l'est jamais. L'argent propre de la maison est sur les mêmes comptes, et un virement peut être en route ; mais un manque est la seule chose grave que ce contrôle existe pour voir.",
                )}
              </li>
              <li>{t("Un rapprochement ne se modifie pas : on en fait un autre. Sa valeur tient entièrement à ce qu'il n'a pas été réécrit après coup.")}</li>
            </ol>
          </div>
        </section>
      </div>
    </>
  );
}
