import Link from "next/link";
import { repo } from "@/lib/data";
import { fmt, fmtDate, fmtDateTime, fmtMillions } from "@/lib/format";
import { activity, clientRegister, defaultPeriod, orderJournal, type Period } from "@/lib/reporting";
import { positionsFrom } from "@/lib/positions";
import deskStyles from "../page.module.css";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reporting" };

const DOC_FR: Record<string, string> = { bulletin: "bulletins", fonds: "appels de fonds", cession: "ordres de cession", bordereau: "bordereaux SVT", allocation: "avis d'allocation", non_allocation: "avis de non-allocation", opere: "avis d'opéré", convention: "conventions", dossier_svt: "dossiers SVT", releve: "relevés", attestation: "attestations" };

export default async function ReportingPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
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
      <nav className={deskStyles.sub} aria-label="Desk">
        <Link href="/desk">Carnet du jour</Link>
        <Link href="/desk/a-valider">À valider</Link>
        <Link href="/desk/clients">Clients</Link>
        <Link href="/desk/documents">Documents</Link>
        <Link href="/desk/resultats">Résultats & positions</Link>
        <Link href="/desk/marche">Marché</Link>
        <Link href="/desk/robot">Robot</Link>
        <Link href="/desk/reporting" aria-current="page">
          Reporting
        </Link>
        <Link href="/desk/sante">Santé</Link>
      </nav>

      <form className={styles.period} method="get">
        <span className="eyebrow">Période</span>
        <label className="field">
          Du
          <input type="date" name="from" defaultValue={p.from} />
        </label>
        <label className="field">
          Au
          <input type="date" name="to" defaultValue={p.to} />
        </label>
        <button className="btn" type="submit">
          Appliquer
        </button>
        <a className="btn primary" href={`/desk/reporting/pdf?${q}`} target="_blank" rel="noreferrer">
          Rapport d&apos;activité PDF
        </a>
        <span className="muted" style={{ fontSize: ".78rem" }}>
          Tout est recalculé depuis les lignes du registre : rien n&apos;est saisi à la main, tout est reproductible.
        </span>
      </form>

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span>Intentions reçues</span>
          <b>{Object.values(act.intents).reduce((s, n) => s + n, 0)}</b>
          <small>{Object.entries(act.intents).map(([k, n]) => `${n} ${k.toLowerCase()}`).join(" · ") || "—"}</small>
        </div>
        <div className={styles.kpi}>
          <span>Ordres fermes reçus</span>
          <b>{fmtMillions(act.firmAmount)}</b>
          <small>montants estimés à la réception</small>
        </div>
        <div className={styles.kpi}>
          <span>Exécutés · réglés</span>
          <b>
            {act.executedCount} · {act.settledCount}
          </b>
          <small>{Object.entries(act.settledByInstrument).map(([k, v]) => `${k} ${fmtMillions(v)}`).join(" · ") || "aucun règlement"}</small>
        </div>
        <div className={styles.kpi}>
          <span>Comptes ouverts · encours</span>
          <b>
            {act.newAccounts} · {fmtMillions(act.positionsNominal)}
          </b>
          <small>{act.holders} porteur{act.holders > 1 ? "s" : ""} · nominal en conservation</small>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>Journal des ordres</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {journal.length} ordre{journal.length > 1 ? "s" : ""} du {fmtDate(p.from)} au {fmtDate(p.to)} — horodatage de chaque étape
          </span>
          <a className="btn sm right" href={`/desk/reporting/export?type=ordres&${q}`}>
            Exporter CSV
          </a>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Reçu</th>
                <th>Client</th>
                <th>Instrument · ligne</th>
                <th>Sens</th>
                <th className="r">Quantité</th>
                <th className="r">Montant</th>
                <th>Prix</th>
                <th>Canal</th>
                <th>État</th>
                <th>Confirmé</th>
                <th>Transmis</th>
                <th>Exécuté</th>
                <th>Réglé</th>
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
                  <td className="num">{o.price}</td>
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
                    Aucun ordre ferme sur la période.
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
            <h2>Activité par segment</h2>
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
                  <td className="muted">Aucun règlement sur la période.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="panel-h">
            <h2>Documents et diffusion</h2>
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
                  <td className="muted">Rien sur la période.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>Registre des clients</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {clients.length} dossier{clients.length > 1 ? "s" : ""} · statut, risque, revue, contrôle sanctions
          </span>
          <a className="btn sm right" href={`/desk/reporting/export?type=clients`}>
            Exporter CSV
          </a>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Client</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Risque</th>
                <th>Approuvé</th>
                <th>Prochaine revue</th>
                <th>Sous-compte</th>
                <th>Sanctions / PPE</th>
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
                  <td>{c.kind}</td>
                  <td>{c.status}</td>
                  <td>{c.risk || "—"}</td>
                  <td className="num">{c.approvedAt ? fmtDate(c.approvedAt) : "—"}</td>
                  <td className="num">{c.nextReviewOn ? fmtDate(c.nextReviewOn) : "—"}</td>
                  <td className="mono">{c.custodianAccount ?? "—"}</td>
                  <td>{c.screening}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    Aucun dossier client.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>Positions en conservation</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {positions.length} position{positions.length > 1 ? "s" : ""} · à la date du jour
          </span>
          <a className="btn sm right" href={`/desk/reporting/export?type=positions`}>
            Exporter CSV
          </a>
        </div>
      </div>
    </>
  );
}
