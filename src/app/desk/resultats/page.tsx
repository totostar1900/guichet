import Link from "next/link";
import { repo } from "@/lib/data";
import { positionFor } from "@/lib/documents/position";
import { displayStatus } from "@/lib/domain/status";
import type { Intent, Offer } from "@/lib/domain/types";
import { parseDate } from "@/lib/finance";
import { fmt, fmtDate, fmtDateTime } from "@/lib/format";
import { positionsFrom, upcomingFlows } from "@/lib/positions";
import { ResultsForm, SettlementForm } from "./Forms";
import deskStyles from "../page.module.css";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Résultats & positions" };

export default async function ResultsPage() {
  const r = repo();
  const [offers, intents] = await Promise.all([r.listOffers(), r.listIntents()]);
  const now = new Date();

  // Auctions with work to do: transmitted orders (results, entered once the issuer publishes) or served orders (settlement).
  const groups = new Map<string, { country: string; deadlineAt: string; issuer: string; offers: Offer[] }>();
  offers
    .filter((o) => o.kind !== "ACTIONS" && (intents.some((i) => i.offerId === o.id && (i.state === "transmise" || i.state === "servie")) || (parseDate(o.deadlineAt) <= now && now.getTime() - parseDate(o.deadlineAt).getTime() < 30 * 86400e3)))
    .forEach((o) => {
      const key = `${o.country}|${o.deadlineAt}`;
      const g = groups.get(key) ?? { country: o.country, deadlineAt: o.deadlineAt, issuer: o.issuer, offers: [] };
      g.offers.push(o);
      groups.set(key, g);
    });
  const auctions = Array.from(groups.values()).map((g) => {
    const lines = g.offers.map((o) => ({ o, transmitted: intents.filter((i) => i.offerId === o.id && i.state === "transmise"), served: intents.filter((i) => i.offerId === o.id && i.state === "servie") }));
    return { ...g, lines, toResult: lines.reduce((s, l) => s + l.transmitted.length, 0), toSettle: lines.reduce((s, l) => s + l.served.length, 0) };
  });

  const positions = positionsFrom(intents, offers, now);
  const upcoming = upcomingFlows(positions, 30, now);
  const unitLabel = (i: Intent, o: Offer) => positionFor(i, o).label;

  return (
    <>
      <nav className={deskStyles.sub} aria-label="Desk">
        <Link href="/desk">Carnet du jour</Link>
        <Link href="/desk/a-valider">À valider</Link>
        <Link href="/desk/clients">Clients</Link>
        <Link href="/desk/documents">Documents</Link>
        <Link href="/desk/resultats" aria-current="page">
          Résultats & positions
        </Link>
      </nav>

      {auctions.length === 0 && <div className="empty">Aucune adjudication close en attente de résultats ou de règlement.</div>}

      {auctions.map((a) => (
        <div className="panel" key={`${a.country}|${a.deadlineAt}`}>
          <div className="panel-h">
            <h2>
              {a.issuer} — adjudication du {fmtDate(a.deadlineAt)}
            </h2>
            <span className="muted" style={{ fontSize: ".8rem" }}>
              {parseDate(a.deadlineAt) > now ? "clôture à venir · " : ""}{a.toResult} ordre{a.toResult > 1 ? "s" : ""} en attente de résultats · {a.toSettle} servi{a.toSettle > 1 ? "s" : ""} à régler · règlement le {fmtDate(a.offers[0].settleOn)}
            </span>
          </div>

          {a.toResult > 0 && (
            <ResultsForm
              offerIds={a.lines.filter((l) => l.transmitted.length > 0).map((l) => l.o.id)}
              lines={a.lines
                .filter((l) => l.transmitted.length > 0)
                .map((l) => ({
                  offerId: l.o.id,
                  title: l.o.title,
                  isin: l.o.isin,
                  kind: l.o.kind,
                  proposed: l.o.kind === "BTA" ? (l.o.precountRate ?? 0) : (l.o.pricePct ?? 100),
                  orders: l.transmitted.map((i) => ({ id: i.id, ref: i.ref, client: i.clientName, units: unitLabel(i, l.o), amount: i.amount ?? 0 })),
                }))}
            />
          )}

          {a.toSettle > 0 && (
            <div className={styles.settle}>
              <div>
                <b>Règlement-livraison</b>
                <div className="muted" style={{ fontSize: ".8rem" }}>
                  {a.lines
                    .filter((l) => l.served.length > 0)
                    .map((l) => `${l.o.title} : ${l.served.map((i) => `${i.clientName} ${fmt(i.servedUnits ?? 0)}`).join(", ")}`)
                    .join(" · ")}
                </div>
              </div>
              <SettlementForm offerIds={a.lines.filter((l) => l.served.length > 0).map((l) => l.o.id)} settleOn={fmtDate(a.offers[0].settleOn)} />
            </div>
          )}

          {a.toResult === 0 && a.toSettle === 0 && (
            <div className={styles.doneRow}>
              {a.lines.map((l) => (
                <span key={l.o.id}>
                  {l.o.title} — {l.o.resultLine ?? (displayStatus(l.o, now) === "closed" ? "aucun ordre transmis" : "—")}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="panel">
        <div className="panel-h">
          <h2>Positions clients</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {positions.length} position{positions.length > 1 ? "s" : ""} · dérivées des ordres réglés
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Client</th>
                <th>Ligne</th>
                <th className="r">Quantité</th>
                <th className="r">Nominal</th>
                <th className="r">Coût</th>
                <th>Prochain flux</th>
                <th>Échéance</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.intent.id}>
                  <td className="who">
                    {p.intent.clientName}
                    <small>{p.intent.clientSegment}</small>
                  </td>
                  <td>
                    {p.offer.title}
                    <br />
                    <span className="mono muted">{p.offer.isin}</span>
                  </td>
                  <td className="r num">
                    {fmt(p.units)} {p.unitWord}
                  </td>
                  <td className="r num">{fmt(p.nominalAmount)}</td>
                  <td className="r num">{fmt(p.costBasis)}</td>
                  <td>{p.nextFlow ? `${fmtDate(p.nextFlow.date)} · ${fmt(p.nextFlow.amount)} · ${p.nextFlow.label}` : "—"}</td>
                  <td>{p.maturityOn ? fmtDate(p.maturityOn) : "—"}</td>
                </tr>
              ))}
              {positions.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    Aucune position réglée pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>Flux des 30 prochains jours</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            Les avis de coupon partent à J-3 et le jour même (tâche planifiée /api/cron/coupons)
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Ligne</th>
                <th>Nature</th>
                <th className="r">Montant brut</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((u) => (
                <tr key={`${u.position.intent.id}-${u.flow.date}`}>
                  <td className="num">
                    {fmtDate(u.flow.date)} <span className="muted">(J{u.inDays ? `+${u.inDays}` : ""})</span>
                  </td>
                  <td>{u.position.intent.clientName}</td>
                  <td>{u.position.offer.title}</td>
                  <td>{u.flow.label}</td>
                  <td className="r num">{fmt(u.flow.amount)}</td>
                </tr>
              ))}
              {upcoming.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Aucun coupon ni remboursement dans les 30 jours.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted" style={{ fontSize: ".74rem" }}>
        Dernière lecture : {fmtDateTime(now.toISOString())}.
      </p>
    </>
  );
}
