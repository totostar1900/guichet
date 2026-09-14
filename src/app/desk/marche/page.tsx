import Link from "next/link";
import { repo } from "@/lib/data";
import { positionFor } from "@/lib/documents/position";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { fmt, fmtDate, fmtDateTime, fmtPrice } from "@/lib/format";
import { ExecuteForm, QuoteForm, SettleButton } from "./Forms";
import deskStyles from "../page.module.css";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marché secondaire" };

export default async function MarketPage() {
  const r = repo();
  const [offers, intents] = await Promise.all([r.listOffers(), r.listIntents()]);
  const lines = offers.filter((o) => o.kind === "MARCHE");
  const byId = new Map(offers.map((o) => [o.id, o]));
  const orders = intents.filter((i) => (i.type === "achat" || i.type === "vente") && i.state !== "annulee").sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <nav className={deskStyles.sub} aria-label="Desk">
        <Link href="/desk">Carnet du jour</Link>
        <Link href="/desk/a-valider">À valider</Link>
        <Link href="/desk/clients">Clients</Link>
        <Link href="/desk/documents">Documents</Link>
        <Link href="/desk/resultats">Résultats & positions</Link>
        <Link href="/desk/marche" aria-current="page">
          Marché
        </Link>
        <Link href="/desk/robot">Robot</Link>
      </nav>

      <div className="panel">
        <div className="panel-h">
          <h2>Cotations</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            Dernier cours, acheteur, vendeur — saisis par le desk depuis la BVMAC ou le SVT ; horodatés sur la fiche
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Ligne</th>
                <th>Marché</th>
                <th className="r">Dernier</th>
                <th className="r">Acheteur</th>
                <th className="r">Vendeur</th>
                <th>Mis à jour</th>
                <th>Nouveau cours</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((o) => {
                const isBond = o.instrument === "obligation";
                const f = (v?: number) => (v == null ? "—" : isBond ? fmtPrice(v) : fmt(v));
                return (
                  <tr key={o.id}>
                    <td>
                      <b>
                        <Link href={`/offres/${o.id}`} style={{ textDecoration: "none" }}>
                          {o.title}
                        </Link>
                      </b>
                      <br />
                      <span className="mono muted">{o.isin}</span>
                    </td>
                    <td>
                      {o.market}
                      <br />
                      <small className="muted">{isBond ? "obligation · % du nominal" : "action · FCFA"}</small>
                    </td>
                    <td className="r num">{f(o.lastPrice)}</td>
                    <td className="r num">{f(o.bid)}</td>
                    <td className="r num">{f(o.ask)}</td>
                    <td className="num">
                      {o.lastPriceOn ? fmtDate(o.lastPriceOn) : "—"}
                      <br />
                      <small className="muted">{o.pricedAt ? fmtDateTime(o.pricedAt) : ""}</small>
                    </td>
                    <td>
                      <QuoteForm offerId={o.id} last={o.lastPrice} bid={o.bid} ask={o.ask} step={isBond ? "0.001" : "1"} />
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    Aucune ligne cotée. Déposez une fiche valeur dans « À valider » avec le type Marché secondaire.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>Ordres de bourse</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            reçu → confirmé (ordre de bourse signé, appel de fonds) → placé → exécuté (prix, quantité) → réglé T+3
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Client</th>
                <th>Ligne</th>
                <th>Sens</th>
                <th className="r">Quantité</th>
                <th className="r">Limite</th>
                <th className="r">Estimation</th>
                <th>État</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((i) => {
                const o = byId.get(i.offerId);
                if (!o) return null;
                const p = positionFor(i, o);
                const isBond = o.instrument === "obligation";
                return (
                  <tr key={i.id}>
                    <td className="mono">{i.ref}</td>
                    <td className="who">
                      {i.clientName}
                      <small>{i.clientSegment}</small>
                    </td>
                    <td>{o.title}</td>
                    <td>
                      <span className={`st ${i.type}`}>{INTENT_LABEL[i.type]}</span>
                    </td>
                    <td className="r num">
                      {fmt(p.units)}
                      {i.servedUnits != null && i.servedUnits !== p.units ? <small className="muted"> (exéc. {fmt(i.servedUnits)})</small> : null}
                    </td>
                    <td className="r num">{i.limitPrice != null ? (isBond ? fmtPrice(i.limitPrice) : fmt(i.limitPrice)) : "marché"}</td>
                    <td className="r num">
                      {fmt(Math.abs(p.total))}
                      {i.executedPrice != null ? <small className="muted"> @ {isBond ? fmtPrice(i.executedPrice) : fmt(i.executedPrice)}</small> : null}
                    </td>
                    <td>
                      <span className={`st ${i.state}`}>{INTENT_STATE_LABEL[i.state]}</span>
                    </td>
                    <td className={styles.right}>
                      {i.state === "transmise" && <ExecuteForm intentId={i.id} units={p.units} refPrice={i.limitPrice ?? (i.type === "vente" ? (o.bid ?? o.lastPrice ?? 0) : (o.ask ?? o.lastPrice ?? 0))} step={isBond ? "0.001" : "1"} />}
                      {i.state === "servie" && <SettleButton intentId={i.id} />}
                      {(i.state === "recue" || i.state === "confirmee") && (
                        <Link className="btn sm" href="/desk">
                          {i.state === "recue" ? "Confirmer dans le carnet" : "Placer (transmettre) dans le carnet"}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted">
                    Aucun ordre de bourse pour l&apos;instant.
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
