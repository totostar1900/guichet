import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import { fmt, fmtDate, fmtDateTime, fmtMillions } from "@/lib/format";
import { activity, clientRegister, defaultPeriod, orderJournal, type Period } from "@/lib/reporting";
import { positionsFrom } from "@/lib/positions";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reporting" };

const DOC_FR: Record<string, string> = { bulletin: "bulletins", fonds: "appels de fonds", cession: "ordres de cession", bordereau: "bordereaux SVT", allocation: "avis d'allocation", non_allocation: "avis de non-allocation", opere: "avis d'opéré", convention: "conventions", dossier_svt: "dossiers SVT", releve: "relevés", attestation: "attestations" };

export default async function ReportingPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const d = defaultPeriod();
  const p: Period = { from: sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : d.from, to: sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : d.to };
  const r = repo();
  const [offers, intents, events, files, docs, notifs] = await Promise.all([r.listOffers(), r.listIntents(), r.listEvents(5000), r.listClientFiles(), r.listDocuments(), r.listNotifications(5000)]);
  const journal = orderJournal(intents, offers, events, p);
  const clients = clientRegister(files);
  const act = activity(intents, offers, files, docs, notifs, p);
  const positions = positionsFrom(intents, offers);
  const q = `from=${p.from}&to=${p.to}`;
  const fmtT = (iso?: string) => (iso ? fmtDateTime(iso) : "—");

  return (
    <>
      <DeskNav current="/desk/reporting" />

      <form className={styles.period} method="get">
        <span className="eyebrow">{t("Période")}</span>
        <label className="field">
          Du
          <input type="date" name="from" defaultValue={p.from} />
        </label>
        <label className="field">
          Au
          <input type="date" name="to" defaultValue={p.to} />
        </label>
        <button className="btn" type="submit">
          {t("Appliquer")}
        </button>
        <a className="btn primary" href={`/desk/reporting/pdf?${q}`} target="_blank" rel="noreferrer">
          {t("Rapport d'activité PDF")}
        </a>
        <span className="muted" style={{ fontSize: ".78rem" }}>
          {t("Tout est recalculé depuis les lignes du registre : rien n'est saisi à la main, tout est reproductible.")}
        </span>
      </form>

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span>{t("Intentions reçues")}</span>
          <b>{Object.values(act.intents).reduce((s, n) => s + n, 0)}</b>
          <small>{Object.entries(act.intents).map(([k, n]) => `${n} ${k.toLowerCase()}`).join(" · ") || "—"}</small>
        </div>
        <div className={styles.kpi}>
          <span>{t("Ordres fermes reçus")}</span>
          <b>{fmtMillions(act.firmAmount)}</b>
          <small>{t("montants estimés à la réception")}</small>
        </div>
        <div className={styles.kpi}>
          <span>{t("Exécutés · réglés")}</span>
          <b>
            {act.executedCount} · {act.settledCount}
          </b>
          <small>{Object.entries(act.settledByInstrument).map(([k, v]) => `${k} ${fmtMillions(v)}`).join(" · ") || t("aucun règlement")}</small>
        </div>
        <div className={styles.kpi}>
          <span>{t("Comptes ouverts · encours")}</span>
          <b>
            {act.newAccounts} · {fmtMillions(act.positionsNominal)}
          </b>
          <small>{act.holders} porteur{act.holders > 1 ? "s" : ""} · nominal en conservation</small>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Journal des ordres")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {t(journal.length > 1 ? "{n} ordres du {a} au {b} : horodatage de chaque étape" : "{n} ordre du {a} au {b} : horodatage de chaque étape", { n: journal.length, a: fmtDate(p.from), b: fmtDate(p.to) })}
          </span>
          <a className="btn sm right" href={`/desk/reporting/export?type=ordres&${q}`}>
            {t("Exporter CSV")}
          </a>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Réf.")}</th>
                <th>{t("Reçu")}</th>
                <th>{t("Client")}</th>
                <th>{t("Instrument · ligne")}</th>
                <th>{t("Sens")}</th>
                <th className="r">{t("Quantité")}</th>
                <th className="r">{t("Montant")}</th>
                <th>{t("Prix")}</th>
                <th>{t("Canal")}</th>
                <th>{t("État")}</th>
                <th>{t("Confirmé")}</th>
                <th>{t("Transmis")}</th>
                <th>{t("Exécuté")}</th>
                <th>{t("Réglé")}</th>
              </tr>
            </thead>
            <tbody>
              {journal.map((o) => (
                <tr key={o.ref}>
                  <td className="mono">{o.ref}</td>
                  <td className="num">{fmtT(o.receivedAt)}</td>
                  <td className="who">
                    {o.client}
                    <small>{o.segment}</small>
                  </td>
                  <td>
                    {o.instrument} · {o.line}
                    <br />
                    <span className="mono muted">{o.isin}</span>
                  </td>
                  <td>{o.sens}</td>
                  <td className="r num">{fmt(o.quantity)}</td>
                  <td className="r num">{fmt(o.amount)}</td>
                  <td className="num">{t(o.price)}</td>
                  <td>{o.channel}</td>
                  <td>{o.state}</td>
                  <td className="num">{fmtT(o.confirmedAt)}</td>
                  <td className="num">{fmtT(o.transmittedAt)}</td>
                  <td className="num">{fmtT(o.executedAt)}</td>
                  <td className="num">{fmtT(o.settledAt)}</td>
                </tr>
              ))}
              {journal.length === 0 && (
                <tr>
                  <td colSpan={14} className="muted">
                    {t("Aucun ordre ferme sur la période.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.two}>
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Activité par segment")}</h2>
          </div>
          <table className="tbl">
            <tbody>
              {Object.entries(act.settledBySegment).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td className="r num">{fmt(v)} FCFA réglés</td>
                </tr>
              ))}
              {Object.keys(act.settledBySegment).length === 0 && (
                <tr>
                  <td className="muted">{t("Aucun règlement sur la période.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Documents et diffusion")}</h2>
          </div>
          <table className="tbl">
            <tbody>
              {Object.entries(act.documents).map(([k, n]) => (
                <tr key={k}>
                  <td>{DOC_FR[k] ?? k}</td>
                  <td className="r num">{n}</td>
                </tr>
              ))}
              {Object.entries(act.notifications).map(([k, n]) => (
                <tr key={k}>
                  <td>messages {k}</td>
                  <td className="r num">{n}</td>
                </tr>
              ))}
              {Object.keys(act.documents).length + Object.keys(act.notifications).length === 0 && (
                <tr>
                  <td className="muted">{t("Rien sur la période.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Registre des clients")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {clients.length} dossier{clients.length > 1 ? "s" : ""} · statut, risque, revue, contrôle sanctions
          </span>
          <a className="btn sm right" href={`/desk/reporting/export?type=clients`}>
            {t("Exporter CSV")}
          </a>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Client")}</th>
                <th>{t("Type")}</th>
                <th>{t("Statut")}</th>
                <th>{t("Risque")}</th>
                <th>{t("Approuvé")}</th>
                <th>{t("Prochaine revue")}</th>
                <th>{t("Sous-compte")}</th>
                <th>{t("Sanctions / PPE")}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.name + c.createdAt}>
                  <td>
                    <b>{c.name}</b>
                    <br />
                    <small className="muted">{[c.city, c.country].filter(Boolean).join(", ")}</small>
                  </td>
                  <td>{t(c.kind)}</td>
                  <td>{t(c.status)}</td>
                  <td>{c.risk ? t(c.risk) : "—"}</td>
                  <td className="num">{c.approvedAt ? fmtDate(c.approvedAt) : "—"}</td>
                  <td className="num">{c.nextReviewOn ? fmtDate(c.nextReviewOn) : "—"}</td>
                  <td className="mono">{c.custodianAccount ?? "—"}</td>
                  <td>{t(c.screening)}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    {t("Aucun dossier client.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Positions en conservation")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {t(positions.length > 1 ? "{n} positions · à la date du jour" : "{n} position · à la date du jour", { n: positions.length })}
          </span>
          <a className="btn sm right" href={`/desk/reporting/export?type=positions`}>
            {t("Exporter CSV")}
          </a>
        </div>
      </div>
    </>
  );
}
