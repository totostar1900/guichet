import Link from "next/link";
import { repo } from "@/lib/data";
import { positionFor } from "@/lib/documents/position";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL } from "@/lib/domain/market";
import { fmt, fmtDate, fmtDateTime, fmtPct, fmtPrice, localIso } from "@/lib/format";
import { bocUrl } from "@/lib/market/boc";
import { ExecuteForm, HideButton, IngestForm, QuoteForm, SettleButton, UploadForm } from "./Forms";
import deskStyles from "../page.module.css";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marché secondaire" };

export default async function MarketPage() {
  const r = repo();
  const [offers, intents, bulletins, navs] = await Promise.all([r.listOffers(), r.listIntents(), r.listBulletins(10), r.latestFundNavs()]);
  const lines = offers.filter((o) => o.kind === "MARCHE").sort((a, b) => (a.instrument ?? "").localeCompare(b.instrument ?? "") || a.title.localeCompare(b.title));
  const byId = new Map(offers.map((o) => [o.id, o]));
  const orders = intents.filter((i) => (i.type === "achat" || i.type === "vente") && i.state !== "annulee").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = bulletins[0];
  const today = localIso(new Date());
  const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);

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
        <Link href="/desk/reporting">Reporting</Link>
      </nav>

      <div className="panel">
        <div className="panel-h">
          <h2>Bulletin Officiel de la Cote — BVMAC</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            Téléchargé chaque jour de bourse à 18 h 30 UTC, lu automatiquement, cours et VL versés dans le Guichet · le PDF est conservé
          </span>
        </div>
        {last ? (
          <div className={styles.bulletin}>
            <div>
              <span>Dernier bulletin</span>
              <b>n° {last.number || "—"}</b>
              <small>
                séance du {fmtDate(last.sessionDate)} · {last.ingestedBy === "cron" ? "automatique" : "desk"} · {fmtDateTime(last.ingestedAt)}
              </small>
            </div>
            <div>
              <span>BVMAC All Share</span>
              <b>{last.indexValue != null ? fmt(last.indexValue) : "—"}</b>
              <small>{last.indexVariationPct != null ? `${signed(last.indexVariationPct)} sur la séance` : ""}</small>
            </div>
            <div>
              <span>Lignes lues</span>
              <b>
                {last.counts.equities} · {last.counts.bonds} · {last.counts.funds}
              </b>
              <small>actions · obligations · OPCVM</small>
            </div>
            <div>
              <span>État</span>
              <b>{last.status === "ok" ? "Complet" : last.status === "partiel" ? "À vérifier" : "Échec"}</b>
              <small>
                {last.sourceUrl?.startsWith("http") ? (
                  <a href={last.sourceUrl} target="_blank" rel="noreferrer">
                    PDF source
                  </a>
                ) : (
                  last.sourceUrl ?? ""
                )}
              </small>
            </div>
          </div>
        ) : (
          <p className="muted" style={{ padding: "12px 16px", fontSize: ".84rem" }}>
            Aucun bulletin ingéré pour l&apos;instant. Lancez l&apos;ingestion d&apos;une séance ci-dessous (l&apos;adresse du jour est {bocUrl(today)}).
          </p>
        )}
        {last && (last.anomalies.length > 0 || last.warnings.length > 0) && (
          <div className={styles.alerts}>
            <b>À vérifier avant de s&apos;appuyer sur ces cours</b>
            <ul>
              {last.anomalies.map((a) => (
                <li key={a}>{a}</li>
              ))}
              {last.warnings.map((w) => (
                <li key={w}>Lecture : {w}</li>
              ))}
            </ul>
          </div>
        )}
        {last && last.notices.length > 0 && (
          <p className="muted" style={{ margin: "0 16px 12px", fontSize: ".8rem" }}>
            Avis publiés : {last.notices.join(" · ")}
          </p>
        )}
        <div className={styles.tools}>
          <div>
            <span>Ingérer une séance (ou relancer celle du jour)</span>
            <IngestForm defaultDate={today} />
          </div>
          <div>
            <span>Secours : le PDF reçu par e-mail</span>
            <UploadForm />
          </div>
        </div>
        {bulletins.length > 1 && (
          <p className="muted" style={{ margin: "0 16px 12px", fontSize: ".76rem" }}>
            Historique : {bulletins.map((b) => `n° ${b.number || "?"} (${fmtDate(b.sessionDate)}${b.status !== "ok" ? `, ${b.status}` : ""})`).join(" · ")}
          </p>
        )}
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>Cotations</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            Dernier cours = clôture du bulletin ; acheteur / vendeur = fourchette indicative du desk. La saisie manuelle n&apos;est qu&apos;un secours et se voit sur la fiche.
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Ligne</th>
                <th>Source</th>
                <th className="r">Dernier</th>
                <th className="r">Acheteur</th>
                <th className="r">Vendeur</th>
                <th>Mis à jour</th>
                <th>Secours (saisie)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((o) => {
                const isBond = o.instrument === "obligation";
                const f = (v?: number) => (v == null ? "—" : isBond ? fmtPrice(v) : fmt(v));
                return (
                  <tr key={o.id} className={o.hidden ? styles.hiddenRow : undefined}>
                    <td>
                      <b>
                        <Link href={`/offres/${o.id}`} style={{ textDecoration: "none" }}>
                          {o.title}
                        </Link>
                      </b>
                      <br />
                      <span className="mono muted">{o.isin}</span>
                      <small className="muted"> · {isBond ? "obligation · % du nominal" : "action · FCFA"}</small>
                    </td>
                    <td>
                      <span className={styles.src}>{o.priceSource === "boc" ? "Bulletin BVMAC" : o.priceSource === "desk" ? "Saisie desk" : "Amorce"}</span>
                      {o.hidden && (
                        <>
                          <br />
                          <small className="muted">masquée du Guichet</small>
                        </>
                      )}
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
                    <td className={styles.right}>
                      <HideButton offerId={o.id} hidden={Boolean(o.hidden)} />
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    Aucune ligne cotée : ingérez un bulletin, les lignes se créent toutes seules.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>Valeurs liquidatives des OPCVM</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {navs.length} fonds publiés par les sociétés de gestion agréées COSUMAF, tels que lus dans le dernier bulletin
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Fonds</th>
                <th>Société de gestion · dépositaire</th>
                <th>Catégorie</th>
                <th className="r">VL</th>
                <th>Date</th>
                <th className="r">Var.</th>
                <th className="r">Depuis l&apos;origine</th>
              </tr>
            </thead>
            <tbody>
              {navs.map((n) => (
                <tr key={n.fundKey}>
                  <td>
                    <b>{n.name}</b>
                  </td>
                  <td>
                    {n.manager}
                    <br />
                    <small className="muted">{n.depositary}</small>
                  </td>
                  <td>
                    {FUND_CATEGORY_LABEL[n.category]}
                    <br />
                    <small className="muted">{FUND_FREQUENCY_LABEL[n.frequency]}</small>
                  </td>
                  <td className="r num">{fmt(n.nav)}</td>
                  <td className="num">{fmtDate(n.navDate)}</td>
                  <td className="r num">{signed(n.variationPct)}</td>
                  <td className="r num">{signed(n.perfSinceInceptionPct)}</td>
                </tr>
              ))}
              {navs.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    Aucune VL : elles arrivent avec le premier bulletin ingéré.
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
