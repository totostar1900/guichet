import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { MOTIFS } from "@/lib/domain/prelevement";
import { lireLesMandats } from "../donnees";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mes prélèvements") };
}

/**
 * L'HISTORIQUE DES PRÉLÈVEMENTS, SUR SA PAGE (15 novembre 2026, option A) : ce qui a été annoncé et ce qui est arrivé, et les mandats révoqués, qui restent lisibles :
 * une contestation porte sur un prélèvement passé, et une ligne effacée ne se conteste plus. Un rejet se relit ici : sa banque l'a peut-être facturé.
 */
export default async function HistoriquePage() {
  const t = await getT();
  const s = await requireSession("/moi/prelevements/historique");
  const { mandats, tirages } = await lireLesMandats(s.userId);
  const anciens = mandats.filter((m) => m.state === "revoque");
  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete titre={t("Mes prélèvements")} phrase={t("Ce qui est passé, ce qui est annoncé, et les mandats révoqués.")} />
        {tirages.length === 0 ? (
          <p className="muted">{t("Aucun prélèvement pour l'instant.")}</p>
        ) : (
          <ul className={styles.tirages}>
            {tirages.slice(0, 24).map((x) => {
              const m = mandats.find((y) => y.id === x.mandatId);
              return (
                <li key={x.id}>
                  <span className={styles.tQuand}>{fmtDate(x.dueOn)}</span>
                  <b className={styles.tMontant}>{t("{m} FCFA", { m: fmt(x.amount) })}</b>
                  <span className={styles.tQuoi}>{m?.objet === "instruction" ? t("Épargne programmée") : t("Provision")}</span>
                  <span className={x.state === "rejete" ? styles.tRejet : x.state === "encaisse" ? styles.tOk : styles.tAttente}>
                    {x.state === "encaisse"
                      ? t("reçu")
                      : x.state === "rejete"
                        ? t(MOTIFS[x.rejectCode ?? "autre"].auClient)
                        : x.state === "remis"
                          ? t("présenté à votre banque")
                          : x.announcedAt
                            ? t("annoncé, à venir")
                            : t("à venir")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {anciens.length > 0 && (
          <section className={styles.bloc}>
            <h2>{t("Mandats révoqués")}</h2>
            <ul className={styles.liste}>
              {anciens.map((m) => (
                <li key={m.id} className={styles.ancien}>
                  <span className="mono">{m.ref}</span> · {m.objet === "provision" ? t("Provision") : t("Épargne programmée")} · {t("révoqué le {d}", { d: fmtDate(m.revokedAt ?? "") })}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Glissement>
  );
}
