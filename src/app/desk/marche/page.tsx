import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import { positionFor } from "@/lib/documents/position";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL } from "@/lib/domain/market";
import { fmt, fmtDate, fmtDateTime, fmtPct, fmtPrice, localIso } from "@/lib/format";
import { bocUrl } from "@/lib/market/boc";
import { ExecuteForm, FundBordereauButton, FundTermsForm, HideButton, IngestForm, QuoteForm, SettleButton, UploadForm } from "./Forms";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marché secondaire" };

export default async function MarketPage() {
  const t = await getT();
  const r = repo();
  const [offers, intents, bulletins] = await Promise.all([r.listOffers(), r.listIntents(), r.listBulletins(10)]);
  const lines = offers.filter((o) => o.kind === "MARCHE").sort((a, b) => (a.instrument ?? "").localeCompare(b.instrument ?? "") || a.title.localeCompare(b.title));
  const byId = new Map(offers.map((o) => [o.id, o]));
  const orders = intents.filter((i) => (i.type === "achat" || i.type === "vente" || i.type === "souscription" || i.type === "rachat") && i.state !== "annulee").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const funds = offers.filter((o) => o.kind === "FONDS" && o.fund).sort((a, b) => Number(Boolean(b.fund?.distributed)) - Number(Boolean(a.fund?.distributed)) || a.title.localeCompare(b.title));
  const fundById = new Map(funds.map((o) => [o.id, o]));
  const pendingByManager = new Map<string, number>();
  for (const i of orders) {
    const o = fundById.get(i.offerId);
    if (o?.fund && (i.state === "confirmee" || i.state === "transmise")) pendingByManager.set(o.fund.manager, (pendingByManager.get(o.fund.manager) ?? 0) + 1);
  }
  const last = bulletins[0];
  const today = localIso(new Date());
  const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);

  return (
    <>
      <DeskNav current="/desk/marche" />

      <div className="panel" data-coach="import">
        <div className="panel-h">
          <h2>{t("Bulletin Officiel de la Cote — BVMAC")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {t("Téléchargé chaque jour de bourse à 18 h 30 UTC, lu automatiquement, cours et VL versés dans le Guichet · le PDF est conservé")}
          </span>
        </div>
        {last ? (
          <div className={styles.bulletin}>
            <div>
              <span>{t("Dernier bulletin")}</span>
              <b>n° {last.number || "—"}</b>
              <small>
                séance du {fmtDate(last.sessionDate)} · {last.ingestedBy === "cron" ? "automatique" : "desk"} · {fmtDateTime(last.ingestedAt)}
              </small>
            </div>
            <div>
              <span>{t("BVMAC All Share")}</span>
              <b>{last.indexValue != null ? fmt(last.indexValue) : "—"}</b>
              <small>{last.indexVariationPct != null ? `${signed(last.indexVariationPct)} sur la séance` : ""}</small>
            </div>
            <div>
              <span>{t("Lignes lues")}</span>
              <b>
                {last.counts.equities} · {last.counts.bonds} · {last.counts.funds}
              </b>
              <small>{t("actions · obligations · OPCVM")}</small>
            </div>
            <div>
              <span>{t("État")}</span>
              <b>{last.status === "ok" ? "Complet" : last.status === "partiel" ? "À vérifier" : "Échec"}</b>
              <small>
                {last.sourceUrl?.startsWith("http") ? (
                  <a href={last.sourceUrl} target="_blank" rel="noreferrer">
                    {t("PDF source")}
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
            <span>{t("Secours : le PDF reçu par e-mail")}</span>
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
          <h2>{t("Cotations")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            Dernier cours = clôture du bulletin ; acheteur / vendeur = fourchette indicative du desk. La saisie manuelle n&apos;est qu&apos;un secours et se voit sur la fiche.
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Ligne")}</th>
                <th>{t("Source")}</th>
                <th className="r">{t("Dernier")}</th>
                <th className="r">{t("Acheteur")}</th>
                <th className="r">{t("Vendeur")}</th>
                <th>{t("Mis à jour")}</th>
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
                          <small className="muted">{t("masquée du Guichet")}</small>
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
                      <QuoteForm offerId={o.id} last={o.lastPrice} bid={o.bid} ask={o.ask} step={isBond ? "0.001" : "1"} version={o.version} />
                    </td>
                    <td className={styles.right}>
                      <HideButton offerId={o.id} hidden={Boolean(o.hidden)} />
                      <Link className="btn sm ghost" href={`/desk/lignes/${o.id}`} title={t("Versions et piste d’audit")}>
                        v{o.version}
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    {t("Aucune ligne cotée : ingérez un bulletin, les lignes se créent toutes seules.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>OPCVM — {funds.length} fonds lus au bulletin, {funds.filter((o) => o.fund?.distributed).length} ouvert{funds.filter((o) => o.fund?.distributed).length > 1 ? "s" : ""} à la souscription</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            VL publiées par les sociétés de gestion agréées COSUMAF. Un fonds n&apos;est proposé à la souscription qu&apos;avec une convention de distribution : cochez « distribué », renseignez la référence, les droits et le minimum.
          </span>
        </div>
        {pendingByManager.size > 0 && (
          <div className={styles.managers}>
            {[...pendingByManager.entries()].map(([m, n]) => (
              <FundBordereauButton key={m} manager={m} count={n} />
            ))}
          </div>
        )}
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Fonds")}</th>
                <th>{t("Société de gestion · dépositaire")}</th>
                <th>{t("Catégorie")}</th>
                <th className="r">VL</th>
                <th className="r">{t("Var. · origine")}</th>
                <th>{t("Conditions de distribution")}</th>
              </tr>
            </thead>
            <tbody>
              {funds.map((o) => {
                const f = o.fund!;
                return (
                  <tr key={o.id} className={f.distributed ? undefined : styles.hiddenRow}>
                    <td>
                      <b>
                        <Link href={`/offres/${o.id}`} style={{ textDecoration: "none" }}>
                          {o.title}
                        </Link>
                      </b>
                      <br />
                      <small className="muted">{f.distributed ? `ouvert · convention ${f.agreementRef ?? "—"}` : "sur demande"}</small>
                    </td>
                    <td>
                      {f.manager}
                      <br />
                      <small className="muted">{f.depositary}</small>
                    </td>
                    <td>
                      {FUND_CATEGORY_LABEL[f.category]}
                      <br />
                      <small className="muted">{FUND_FREQUENCY_LABEL[f.frequency]}</small>
                    </td>
                    <td className="r num">
                      {fmt(f.nav)}
                      <br />
                      <small className="muted">{fmtDate(f.navDate)}</small>
                    </td>
                    <td className="r num">
                      {signed(f.variationPct)}
                      <br />
                      <small className="muted">{signed(f.perfSinceInceptionPct)}</small>
                    </td>
                    <td>
                      <FundTermsForm offerId={o.id} fund={f} />
                    </td>
                  </tr>
                );
              })}
              {funds.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    {t("Aucun fonds : ils arrivent avec le premier bulletin ingéré.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>Ordres de bourse et d&apos;OPCVM</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            reçu → confirmé (ordre signé, appel de fonds) → placé / centralisé → exécuté (cours ou VL, quantité) → réglé
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Réf.")}</th>
                <th>{t("Client")}</th>
                <th>{t("Ligne")}</th>
                <th>{t("Sens")}</th>
                <th className="r">{t("Quantité")}</th>
                <th className="r">{t("Limite")}</th>
                <th className="r">{t("Estimation")}</th>
                <th>{t("État")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((i) => {
                const o = byId.get(i.offerId);
                if (!o) return null;
                const p = positionFor(i, o);
                const isBond = o.instrument === "obligation";
                const isFund = o.kind === "FONDS";
                const qty = (v: number) => (isFund ? v.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : fmt(v));
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
                      {qty(p.units)}
                      {isFund ? <small className="muted"> parts{i.type === "souscription" && i.servedUnits == null ? " (est.)" : ""}</small> : null}
                      {i.servedUnits != null && i.servedUnits !== p.units ? <small className="muted"> (exéc. {qty(i.servedUnits)})</small> : null}
                    </td>
                    <td className="r num">{isFund ? `VL ${fmt(o.fund?.nav ?? 0)}` : i.limitPrice != null ? (isBond ? fmtPrice(i.limitPrice) : fmt(i.limitPrice)) : "marché"}</td>
                    <td className="r num">
                      {fmt(Math.abs(p.total))}
                      {i.executedPrice != null ? <small className="muted"> @ {isBond ? fmtPrice(i.executedPrice) : fmt(i.executedPrice)}</small> : null}
                    </td>
                    <td>
                      <span className={`st ${i.state}`}>{INTENT_STATE_LABEL[i.state]}</span>
                    </td>
                    <td className={styles.right}>
                      {i.state === "transmise" && <ExecuteForm intentId={i.id} units={p.units} refPrice={isFund ? (o.fund?.nav ?? 0) : (i.limitPrice ?? (i.type === "vente" ? (o.bid ?? o.lastPrice ?? 0) : (o.ask ?? o.lastPrice ?? 0)))} step={isBond ? "0.001" : isFund ? "0.01" : "1"} unitStep={isFund ? "0.001" : "1"} />}
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
