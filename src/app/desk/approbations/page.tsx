import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { diffRecords, FIELD_FR } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { isResponsable } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { loadPolicy } from "@/lib/policy";
import { DecideForm, PolicyForm } from "./Forms";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Approbations" };

const short = (v: unknown): string => (v == null ? "—" : typeof v === "object" ? JSON.stringify(v).slice(0, 60) : String(v));

/** Four-eyes queue: what an opérateur proposed outside the delegated window, and the window itself. */
export default async function ApprobationsPage() {
  const me = await requireDesk("/desk/approbations");
  const r = repo();
  const [open, done, policy] = await Promise.all([r.listApprovals(true), r.listApprovals(false), loadPolicy()]);
  const offers = new Map((await r.listOffers()).map((o) => [o.id, o]));
  const resp = isResponsable(me);
  return (
    <>
      <DeskNav current="/desk/approbations" badges={{ "/desk/approbations": open.length }} />
      <div className={styles.head}>
        <h1>Approbations</h1>
        <p className="muted">
          Quatre yeux sans goulot d&apos;étranglement : à l&apos;intérieur de la fenêtre déléguée, un opérateur publie seul ; en dehors, sa proposition attend un responsable, qui la voit ici avec l&apos;avant / après et l&apos;approuve ou la refuse avec une note. La personne qui propose ne peut jamais approuver.
        </p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>En attente ({open.length})</h2>
          {!resp && <span className="muted">Seul un responsable décide.</span>}
        </div>
        {open.length === 0 && <div className="empty">Rien à approuver.</div>}
        {open.map((a) => {
          const cur = offers.get(a.entityId);
          const diffs = diffRecords(cur, a.payload).slice(0, 12);
          return (
            <div key={a.id} className={styles.item}>
              <div className={styles.itemHead}>
                <div>
                  <b>{a.title}</b>
                  <br />
                  <small className="muted">
                    {a.kind === "offer_quote" ? "Cours" : "Publication"} · proposé par {a.requestedBy} le {fmtDateTime(a.requestedAt)} ·{" "}
                    <Link href={`/desk/lignes/${a.entityId}`}>historique</Link>
                  </small>
                </div>
                <span className={styles.reason}>{a.reason}</span>
              </div>
              <table className={styles.diff}>
                <tbody>
                  {diffs.map((d) => (
                    <tr key={d.key}>
                      <td>{FIELD_FR[d.key] ?? d.key}</td>
                      <td className={styles.before}>{short(d.before)}</td>
                      <td className={styles.after}>{short(d.after)}</td>
                    </tr>
                  ))}
                  {diffs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">
                        Nouvelle ligne (aucune version publiée à comparer).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {resp && a.requestedBy !== me.name ? <DecideForm id={a.id} /> : <small className="muted">{a.requestedBy === me.name ? "Votre proposition : un autre responsable doit décider." : ""}</small>}
            </div>
          );
        })}
      </div>

      <div className={styles.cols}>
        <div className="panel">
          <div className="panel-h">
            <h2>Fenêtre déléguée</h2>
            <span className="muted">{policy.enabled ? "active" : "désactivée"}</span>
          </div>
          {resp ? (
            <PolicyForm p={policy} />
          ) : (
            <ul className={styles.rules}>
              <li>
                Prix OTA / APE : {policy.pricePct.min}–{policy.pricePct.max} % du nominal
              </li>
              <li>
                Taux précompté BTA : {policy.precountRate.min}–{policy.precountRate.max} %
              </li>
              <li>Cours saisi : au plus ±{policy.quoteMovePct} % du dernier cours</li>
              <li>Fonds : droits d&apos;entrée ≤ {policy.fundEntryFeeMax} %</li>
            </ul>
          )}
        </div>
        <div className="panel">
          <div className="panel-h">
            <h2>Décidées récemment</h2>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Quand</th>
                <th>Ligne</th>
                <th>Proposé par</th>
                <th>Décision</th>
              </tr>
            </thead>
            <tbody>
              {done.slice(0, 20).map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.decidedAt ? fmtDateTime(a.decidedAt) : "—"}</td>
                  <td>
                    {a.title}
                    <br />
                    <small className="muted">{a.reason}</small>
                  </td>
                  <td>{a.requestedBy}</td>
                  <td>
                    <span className={`st ${a.decision === "approuve" ? "confirmee" : "annulee"}`}>{a.decision === "approuve" ? "Approuvée" : "Refusée"}</span>
                    <br />
                    <small className="muted">
                      {a.decidedBy}
                      {a.note ? ` — ${a.note}` : ""}
                    </small>
                  </td>
                </tr>
              ))}
              {done.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    Aucune décision encore.
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
