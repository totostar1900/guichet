import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { healthChecks } from "@/lib/health";
import { repo } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Santé du système" };

const LEVEL: Record<string, string> = { ok: "OK", warn: "À surveiller", crit: "Action requise" };

export default async function SantePage() {
  const t = await getT();
  const [checks, bulletins, notifications] = await Promise.all([healthChecks(), repo().listBulletins(12), repo().listNotifications(40)]);
  const worst = checks.some((c) => c.level === "crit") ? "crit" : checks.some((c) => c.level === "warn") ? "warn" : "ok";
  return (
    <>
      <DeskNav current="/desk/sante" />

      <div className={styles.head}>
        <div>
          <h1>{t("Santé du système")}</h1>
          <p className="muted">{t("Ce que la machine fait toute seule — et ce qui attend le desk. Vérifié à chaque passage du cron du soir ; un e-mail part au desk quand un point passe en rouge.")}</p>
        </div>
        <span className={`${styles.badge} ${styles[worst]}`}>{LEVEL[worst]}</span>
      </div>

      <div className={styles.grid}>
        {checks.map((c) => (
          <div key={c.key} className={`${styles.check} ${styles[c.level]}`}>
            <span className={styles.label}>{t(c.label)}</span>
            <b>{t(c.value)}</b>
            {c.detail && <small>{t(c.detail)}</small>}
          </div>
        ))}
      </div>

      <div className={styles.cols}>
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Derniers bulletins")}</h2>
            <Link className="btn sm" href="/desk/marche">
              {t("Marché")}
            </Link>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Séance")}</th>
                <th>N°</th>
                <th>{t("État")}</th>
                <th className="r">{t("Actions")}</th>
                <th className="r">{t("Oblig.")}</th>
                <th className="r">{t("OPCVM")}</th>
                <th>{t("Ingéré")}</th>
              </tr>
            </thead>
            <tbody>
              {bulletins.map((b) => (
                <tr key={b.id}>
                  <td className="mono">{b.sessionDate}</td>
                  <td className="mono">{b.number}</td>
                  <td>
                    <span className={`st ${b.status === "ok" ? "confirmee" : b.status === "partiel" ? "recue" : "annulee"}`}>{t(b.status)}</span>
                  </td>
                  <td className="r num">{b.counts.equities}</td>
                  <td className="r num">{b.counts.bonds}</td>
                  <td className="r num">{b.counts.funds}</td>
                  <td className="muted">
                    {fmtDateTime(b.ingestedAt)} · {b.ingestedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Derniers messages")}</h2>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Quand")}</th>
                <th>{t("Canal")}</th>
                <th>À</th>
                <th>{t("Objet")}</th>
                <th>{t("État")}</th>
              </tr>
            </thead>
            <tbody>
              {notifications.slice(0, 15).map((n) => (
                <tr key={n.id}>
                  <td className="muted">{fmtDateTime(n.createdAt)}</td>
                  <td>{n.channel}</td>
                  <td>{n.contactName ?? n.to}</td>
                  <td className="muted">{n.subject ?? n.kind}</td>
                  <td>
                    <span className={`st ${n.status === "sent" ? "confirmee" : n.status === "failed" ? "annulee" : "recue"}`}>{n.status}</span>
                    {n.error && <small className="muted"> {n.error}</small>}
                  </td>
                </tr>
              ))}
              {notifications.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    {t("Aucun message préparé pour l'instant.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
