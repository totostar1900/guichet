import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { bulletinsToReread, healthChecks, lineIssues } from "@/lib/health";
import { HEALTH_HOW } from "@/lib/health-how";
import { repo } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { rereadAction, withdrawLineAction } from "./actions";
import { Reread } from "./Reread";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Santé du système" };

/** The target page's address with « depuis=sante&point=… » before any #anchor. */
function fromSante(href: string, key: string): string {
  const [path, hash] = href.split("#");
  return `${path}${path.includes("?") ? "&" : "?"}depuis=sante&point=${key}${hash ? `#${hash}` : ""}`;
}

const LEVEL: Record<string, string> = { ok: "OK", warn: "À surveiller", crit: "Action requise" };
const KIND_LABEL: Record<string, string> = { sortie: "Sortie de cote", absente: "Non publiée", prix: "Cours", date: "Date", instrument: "Instrument", doublon: "Doublon" };

export default async function SantePage() {
  const t = await getT();
  const [checks, bulletins, notifications, arriere, ecarts] = await Promise.all([healthChecks(), repo().listBulletins(12), repo().listNotifications(40), bulletinsToReread(), lineIssues()]);
  const worst = checks.some((c) => c.level === "crit") ? "crit" : checks.some((c) => c.level === "warn") ? "warn" : "ok";
  return (
    <>
      <DeskNav current="/desk/sante" />

      <div className={styles.head}>
        <div>
          <h1>{t("Santé du système")}</h1>
          <p className="muted">{t("Ce que la machine fait toute seule : et ce qui attend le desk. Vérifié à chaque passage du cron du soir ; un e-mail part au desk quand un point passe en rouge.")}</p>
        </div>
        <span className={`${styles.badge} ${styles[worst]}`}>{LEVEL[worst]}</span>
      </div>

      <div className={styles.grid}>
        {checks.map((c) => {
          const how = HEALTH_HOW[c.key];
          const act = c.level !== "ok" && how;
          const inner = (
            <>
              <span className={styles.label}>{t(c.label)}</span>
              <b>{t(c.value)}</b>
              {c.detail && <small>{t(c.detail)}</small>}
              {act && <span className={styles.go}>{t("Traiter")} →</span>}
            </>
          );
          return act ? (
            <Link key={c.key} className={`${styles.check} ${styles[c.level]} ${styles.act}`} href={fromSante(how.href, c.key)} title={t(how.how)}>
              {inner}
            </Link>
          ) : (
            <div key={c.key} className={`${styles.check} ${styles[c.level]}`}>
              {inner}
            </div>
          );
        })}
      </div>

      {ecarts.length > 0 && (
        <section className="panel" id="lignes">
          <div className="panel-h">
            <h2>{t("Lignes et bulletin")}</h2>
            <span className="muted">{t("{n} écart entre ce que le Guichet publie et ce que le bulletin cote.", { n: ecarts.length })}</span>
          </div>
          <p className={styles.p}>
            {t("Une ligne sortie de la cote dont l'échéance est passée se clôture seule à la lecture du bulletin : elle cesse d'être commandable, sa page reste consultable, et rien n'est dit au client sur la raison. Celles dont l'échéance est inconnue ou estimée attendent une décision. Le bulletin dit ce qui se cote, pas ce qui a été payé : quand des clients détiennent encore la ligne, le remboursement se vérifie auprès du dépositaire avant tout, et l'avis de remboursement est ce qui l'atteste. Un cours ou un instrument qui diffère du bulletin est un défaut de lecture, pas une décision : relancer la lecture de la séance.")}
          </p>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Écart")}</th>
                  <th>ISIN</th>
                  <th>{t("Ligne")}</th>
                  <th>{t("Ce que dit le bulletin")}</th>
                  <th className="r">{t("Porteurs")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ecarts.map((e, i) => (
                  <tr key={`${e.kind}-${e.isin}-${i}`}>
                    <td>
                      <span className={`st ${e.kind === "sortie" ? "recue" : "annulee"}`}>{t(KIND_LABEL[e.kind])}</span>
                    </td>
                    <td className="mono">{e.isin}</td>
                    <td>{e.title}</td>
                    <td className="muted">{t(e.detail)}</td>
                    <td className="r num">
                      {e.holders ? (
                        <b title={t("Des clients détiennent encore cette ligne : le remboursement se vérifie auprès du dépositaire avant toute chose.")}>{e.holders}</b>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="r">
                      {e.kind === "sortie" && e.offerId ? <Reread action={withdrawLineAction} label={t("Clôturer")} date={undefined} offerId={e.offerId} /> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {arriere.length > 0 && (
        <section className="panel" id="relire">
          <div className="panel-h">
            <h2>{t("Bulletins à relire")}</h2>
            <span className="muted">
              {t("{n} séances lues à moitié : le lecteur les a marquées au moment même, elles attendent une relecture.", { n: arriere.length })}
            </span>
          </div>
          <p className={styles.p}>
            {t("Chaque bulletin garde l'adresse de son PDF d'origine : une relecture le reprend tel quel, avec le lecteur d'aujourd'hui. Une séance sans cours d'action fausse la lecture de l'indice, c'est elle qu'il faut reprendre en premier.")}
          </p>
          <div className={styles.actions}>
            <Reread action={rereadAction} label={t("Relire les plus anciens")} primary />
            <Link className="btn sm ghost" href="/desk/marche">
              {t("Marché")} →
            </Link>
          </div>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Séance")}</th>
                  <th>N°</th>
                  <th>{t("État")}</th>
                  <th className="r">{t("Actions")}</th>
                  <th>{t("Ce que le lecteur a dit")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {arriere.slice(0, 30).map((b) => (
                  <tr key={b.id}>
                    <td className="mono">{b.sessionDate}</td>
                    <td className="mono">{b.number}</td>
                    <td>
                      <span className={`st ${b.status === "partiel" ? "recue" : "annulee"}`}>{t(b.status)}</span>
                    </td>
                    <td className="r num">{b.counts?.equities ?? 0}</td>
                    <td className="muted">{(b.anomalies[0] ?? b.warnings[0] ?? "—").slice(0, 90)}</td>
                    <td className="r">
                      <Reread action={rereadAction} label={t("Relire")} date={b.sessionDate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {arriere.length > 30 && (
            <p className="muted">{t("… et {n} autres, reprises six par six.", { n: arriere.length - 30 })}</p>
          )}
        </section>
      )}

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
