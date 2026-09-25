import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { FromSante } from "@/components/desk/FromSante";
import type { Offer } from "@/lib/domain/types";
import { repo } from "@/lib/data";
import { positionFor } from "@/lib/documents/position";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL } from "@/lib/domain/market";
import { fmt, fmtDate, fmtDateTime, fmtPct, fmtPrice, localIso } from "@/lib/format";
import { bocUrl } from "@/lib/market/boc";
import { ExecuteForm, FundBordereauButton, FundTermsForm, HideButton, IngestForm, QuoteForm, SettleButton, SignalForm, UploadForm } from "./Forms";
import { loadSignalPolicy } from "@/lib/policy";
import { isResponsable } from "@/lib/auth/types";
import { getSession } from "@/lib/auth";
import { FundGroups, type FundGroup } from "./FundGroups";
import { fundAnnualPct } from "@/lib/domain/fund-perf";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";
import { deskFills, lineFills } from "@/lib/market/fill";
import { FillRate } from "@/components/desk/FillRate";
import { CrossBook } from "@/components/desk/CrossBook";
import { crossings } from "@/lib/domain/crossing";

export const dynamic = "force-dynamic";

/** Les deux rangements qui répondent à une question du desk, et le retour à la liste. */
const GROUPINGS: [string, string][] = [
  ["aucun", "rien"],
  ["gestion", "société de gestion"],
  ["depot", "dépositaire"],
];
export const metadata = { title: "Marché secondaire" };

export default async function MarketPage({ searchParams }: { searchParams: Promise<{ filtre?: string; depuis?: string; point?: string; groupe?: string }> }) {
  const sp = await searchParams;
  const t = await getT();
  const r = repo();
  const [offers, intents, bulletins, fills, signal, me] = await Promise.all([r.listOffers(), r.listIntents(), r.listBulletins(10), lineFills(), loadSignalPolicy(), getSession()]);
  // Ce que nos propres ordres sont devenus, ligne par ligne : à côté de ce que le marché offrait.
  const ours = deskFills(intents);
  const lastSession = bulletins.filter((b) => b.status === "ok").map((b) => b.sessionDate).sort().reverse()[0];
  const stale = (o: Offer) => Boolean(lastSession && !o.hidden && o.lastPriceOn && o.lastPriceOn < lastSession);
  const allLines = offers.filter((o) => o.kind === "MARCHE").sort((a, b) => (a.instrument ?? "").localeCompare(b.instrument ?? "") || a.title.localeCompare(b.title));
  const lines = sp.filtre === "sans-cours" ? allLines.filter(stale) : allLines;
  const byId = new Map(offers.map((o) => [o.id, o]));
  // Les clients qui se font face : le meme carnet d'ordres, lu par paires.
  const book = crossings(offers, intents)
    .map((c) => ({ c, o: byId.get(c.offerId) }))
    .filter((x): x is { c: (typeof x)["c"]; o: Offer } => Boolean(x.o));
  const crossable = book.reduce((t, x) => t + x.c.qty, 0);
  const orders = intents.filter((i) => (i.type === "achat" || i.type === "vente" || i.type === "souscription" || i.type === "rachat") && i.state !== "annulee").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const funds = offers.filter((o) => o.kind === "FONDS" && o.fund).sort((a, b) => Number(Boolean(b.fund?.distributed)) - Number(Boolean(a.fund?.distributed)) || a.title.localeCompare(b.title));
  const fundById = new Map(funds.map((o) => [o.id, o]));
  const pendingByManager = new Map<string, number>();
  for (const i of orders) {
    const o = fundById.get(i.offerId);
    if (o?.fund && (i.state === "confirmee" || i.state === "transmise")) pendingByManager.set(o.fund.manager, (pendingByManager.get(o.fund.manager) ?? 0) + 1);
  }
  const last = bulletins[0];
  const now = new Date();
  const today = localIso(new Date());
  const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);

  // Quinze fonds à plat se lisent encore ; la question que le desk pose à
  // cette table (qui gère quoi, et chez qui est-ce déposé) se parcourt alors
  // colonne du milieu, ligne à ligne. Deux rangements la répondent d'un coup.
  const by = sp.groupe === "gestion" || sp.groupe === "depot" ? sp.groupe : "aucun";
  const groupOf = (o: Offer) => (by === "gestion" ? o.fund!.manager : o.fund!.depositary) || "—";
  const fundRow = (o: Offer) => {
    const fu = o.fund!;
    const annual = fundAnnualPct(fu, now);
    return (
      <tr key={o.id} className={fu.distributed ? undefined : styles.hiddenRow}>
        <td>
          <b>
            <Link href={`/desk/lignes/${o.id}`} style={{ textDecoration: "none" }}>
              {o.title}
            </Link>
          </b>
          <br />
          <small className="muted">{fu.distributed ? `ouvert · convention ${fu.agreementRef ?? "—"}` : "sur demande"}</small>
        </td>
        <td>
          {fu.manager}
          <br />
          <small className="muted">{fu.depositary}</small>
        </td>
        <td>
          {t(FUND_CATEGORY_LABEL[fu.category])}
          <br />
          <small className="muted">{t(FUND_FREQUENCY_LABEL[fu.frequency])}</small>
        </td>
        <td className="r num">
          {fmt(fu.nav)}
          <br />
          <small className="muted">{fmtDate(fu.navDate)}</small>
        </td>
        <td className="r num">
          {signed(fu.variationPct)}
          <br />
          <small className="muted">{signed(fu.perfSinceInceptionPct)}</small>
        </td>
        {/* Le cumulé depuis l'origine ne compare rien : un fonds né en mars et
            un fonds né en 2019 n'ont pas couru la même distance. Ramené à
            l'année, oui. Rien sous six mois de vie, on extrapolerait. */}
        <td className="r num" title={t("Le taux constant qui, composé depuis la création, donnerait la performance cumulée")}>
          {annual == null ? "—" : signed(annual)}
          <br />
          <small className="muted">{annual == null ? t("moins de six mois") : t("depuis le {d}", { d: fmtDate(fu.inceptionDate, false) })}</small>
        </td>
        <td>
          <FundTermsForm offerId={o.id} fund={fu} />
        </td>
      </tr>
    );
  };
  const groups: FundGroup[] = by === "aucun" ? [] : [...new Set(funds.map((o) => groupOf(o)))]
    .sort((a, b2) => a.localeCompare(b2))
    .map((label) => {
      const rows = funds.filter((o) => groupOf(o) === label);
      return {
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        label,
        note: by === "gestion" ? [...new Set(rows.map((o) => o.fund!.depositary))].join(" · ") : [...new Set(rows.map((o) => o.fund!.manager))].join(" · "),
        count: rows.length,
        open: rows.filter((o) => o.fund?.distributed).length,
        rows: <>{rows.map(fundRow)}</>,
      };
    });

  return (
    <>
      <DeskNav current="/desk/marche" />
      {sp.depuis === "sante" && <FromSante point={sp.point ?? ""} count={sp.filtre === "sans-cours" ? `${lines.length} / ${allLines.length}` : undefined} />}

      <div className="panel" data-coach="import">
        <div className="panel-h">
          <h2>{t("Bulletin Officiel de la Cote : BVMAC")}</h2>
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
                {t(last.ingestedBy === "cron" ? "séance du {d} · automatique · {t}" : "séance du {d} · desk · {t}", { d: fmtDate(last.sessionDate), t: fmtDateTime(last.ingestedAt) })}
              </small>
            </div>
            <div>
              <span>{t("BVMAC All Share")}</span>
              <b>{last.indexValue != null ? fmt(last.indexValue) : "—"}</b>
              <small>{last.indexVariationPct != null ? t("{v} sur la séance", { v: signed(last.indexVariationPct) }) : ""}</small>
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
            {t("Aucun bulletin ingéré pour l'instant. Lancez l'ingestion d'une séance ci-dessous (l'adresse du jour est {url}).", { url: bocUrl(today) })}
          </p>
        )}
        {last && (last.anomalies.length > 0 || last.warnings.length > 0) && (
          <div className={styles.alerts}>
            <b>{t("À vérifier avant de s'appuyer sur ces cours")}</b>
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
            <span>{t("Ingérer une séance (ou relancer celle du jour)")}</span>
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

      <div className="panel" id="cotations">
        {sp.filtre === "sans-cours" && (
          <p className={styles.filterLine}>
            <b>
              {lines.length} / {allLines.length} {t("lignes sans cours à la dernière séance")}
              {lastSession ? ` (${fmtDate(lastSession)})` : ""}
            </b>
            <Link href="/desk/marche#cotations">{t("Toutes les lignes")}</Link>
          </p>
        )}
        <div className="panel-h">
          <h2>{t("Cotations")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {t("Dernier cours = clôture du bulletin ; acheteur / vendeur = fourchette indicative du desk. La saisie manuelle n'est qu'un secours et se voit sur la fiche. La liquidité compte les séances où la ligne s'est échangée sur les douze derniers mois : elle dit si un ordre aurait eu une contrepartie.")}
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
                <th>{t("Liquidité (12 mois)")}</th>
                <th>{t("Mis à jour")}</th>
                <th>{t("Secours (saisie)")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((o) => {
                const isBond = o.instrument === "obligation";
                const f = (v?: number) => (v == null ? "—" : isBond ? fmtPrice(v) : fmt(v));
                return (
                  <tr key={o.id} className={o.hidden ? styles.hiddenRow : stale(o) ? styles.staleRow : undefined}>
                    <td>
                      <b>
                        <Link href={`/desk/lignes/${o.id}`} style={{ textDecoration: "none" }}>
                          {o.title}
                        </Link>
                      </b>
                      <br />
                      <span className="mono muted">{o.isin}</span>
                      <small className="muted"> · {t(isBond ? "obligation · % du nominal" : "action · FCFA")}</small>
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
                    <td>
                      <FillRate line={o.isin ? fills.get(o.isin) : undefined} desk={ours.get(o.id)} />
                    </td>
                    <td className="num">
                      {o.lastPriceOn ? fmtDate(o.lastPriceOn) : "—"}
                      {stale(o) && <small className={styles.staleTag}> {t("avant la dernière séance")}</small>}
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

      <div className="panel" id="opcvm">
        <div className="panel-h">
          <h2>OPCVM : {t("{n} fonds lus au bulletin, {m} ouvert(s) à la souscription", { n: funds.length, m: funds.filter((o) => o.fund?.distributed).length })}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {t("VL publiées par les sociétés de gestion agréées COSUMAF. Un fonds n'est proposé à la souscription qu'avec une convention de distribution : cochez « distribué », renseignez la référence, les droits et le minimum.")}
          </span>
        </div>
        <div className={styles.groupPick} role="group" aria-label={t("Regrouper les fonds")}>
          <span className="muted">{t("Regrouper par")}</span>
          {GROUPINGS.map(([k, label]) => (
            <Link key={k} href={`/desk/marche${k === "aucun" ? "" : `?groupe=${k}`}#opcvm`} className={by === k ? styles.groupOn : undefined}>
              {t(label)}
            </Link>
          ))}
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
                <th className="r">{t("Var. · depuis l'origine")}</th>
                <th className="r">{t("Par an")}</th>
                <th>{t("Conditions de distribution")}</th>
              </tr>
            </thead>
            {funds.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="muted">
                    {t("Aucun fonds : ils arrivent avec le premier bulletin ingéré.")}
                  </td>
                </tr>
              </tbody>
            ) : by === "aucun" ? (
              <tbody>{funds.map(fundRow)}</tbody>
            ) : (
              <FundGroups groups={groups} cols={7} />
            )}
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Appariements possibles")}</h2>
          <span className="muted right" style={{ fontSize: ".8rem" }}>
            {crossable
              ? t("{n} titres peuvent changer de main sans passer par le marché", { n: fmt(crossable) })
              : t("le prix se négocie dans la bande : la maison ne le fixe pas")}
          </span>
        </div>
        <CrossBook lines={book} fills={fills} />
        {/* Ce que le Guichet en dit aujourd'hui, et qui peut en décider. */}
        {isResponsable(me) ? (
          <SignalForm p={signal} />
        ) : (
          <small className="muted">{signal.tell ? t("Les clients connectés voient qu'une contrepartie existe.") : t("Le carnet reste au desk : le client n'en voit rien.")}</small>
        )}
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Ordres de bourse et d'OPCVM")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {t("reçu → confirmé (ordre signé, appel de fonds) → placé / centralisé → exécuté (cours ou VL, quantité) → réglé")}
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
                      <span className={`st ${i.type}`}>{t(INTENT_LABEL[i.type])}</span>
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
                      <span className={`st ${i.state}`}>{t(INTENT_STATE_LABEL[i.state])}</span>
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
                    {t("Aucun ordre de bourse pour l'instant.")}
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
