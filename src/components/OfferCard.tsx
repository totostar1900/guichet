import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import { countdown, displayStatus, headlineYield, isPast, KIND_LABEL, OPERATION_LABEL, statusLabel } from "@/lib/domain/status";
import { tenorText } from "@/lib/finance";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL } from "@/lib/domain/market";
import { fmt, fmtDate, fmtDateTime, fmtPct, fmtPrice } from "@/lib/format";
import styles from "./OfferCard.module.css";

function Hero({ o }: { o: Offer }) {
  const y = headlineYield(o);
  if (o.kind === "RACHAT")
    return (
      <div className={styles.hero}>
        <div className={`${styles.big} num`}>100 %</div>
        <div className={styles.lbl}>
          du nominal,
          <br />
          rachat au pair
        </div>
      </div>
    );
  if (o.kind === "ACTIONS")
    return (
      <div className={styles.hero}>
        <div className={`${styles.big} num`}>{fmt(o.pricePerShare ?? 0)}</div>
        <div className={styles.lbl}>
          FCFA par action
          <br />
          dividende {y != null ? fmtPct(y, 2) : "—"} · cours {o.lastPrice ? fmt(o.lastPrice) : "—"}
        </div>
      </div>
    );
  if (o.kind === "FONDS" && o.fund) {
    const v = o.fund.variationPct;
    return (
      <div className={styles.hero}>
        <div className={`${styles.big} num`}>{fmt(o.fund.nav)}</div>
        <div className={styles.lbl}>
          FCFA · valeur liquidative au {fmtDate(o.fund.navDate, false)}
          <br />
          {v != null ? `${v > 0 ? "+" : ""}${fmtPct(v, 2)} sur la période · ` : ""}
          {o.fund.perfSinceInceptionPct > 0 ? "+" : ""}
          {fmtPct(o.fund.perfSinceInceptionPct, 2)} depuis l&apos;origine
        </div>
      </div>
    );
  }
  if (o.kind === "MARCHE") {
    const isBond = o.instrument === "obligation";
    return (
      <div className={styles.hero}>
        <div className={`${styles.big} num`}>{o.lastPrice != null ? (isBond ? fmtPrice(o.lastPrice) : fmt(o.lastPrice)) : "—"}</div>
        <div className={styles.lbl}>
          {isBond ? "dernier cours (% du nominal)" : "FCFA · dernier cours"}
          {o.lastPriceOn ? ` au ${fmtDate(o.lastPriceOn, false)}` : ""}
          <br />
          {o.bid != null && o.ask != null ? `acheteur ${isBond ? fmtPrice(o.bid) : fmt(o.bid)} · vendeur ${isBond ? fmtPrice(o.ask) : fmt(o.ask)}` : y != null ? `rendement ${fmtPct(y, 2)}` : o.market}
        </div>
      </div>
    );
  }
  if (o.kind === "BTA")
    return (
      <div className={styles.hero}>
        <div className={`${styles.big} num`}>{y != null ? fmtPct(y) : "—"}</div>
        <div className={styles.lbl}>
          rendement actuariel
          <br />à {fmtPct(o.precountRate ?? 0, 2)} précompté{o.rateNote ? " (indicatif)" : ""}
        </div>
      </div>
    );
  const price = o.servedPricePct ?? o.pricePct ?? 100;
  return (
    <div className={styles.hero}>
      <div className={`${styles.big} num`}>{y != null ? fmtPct(y) : "—"}</div>
      <div className={styles.lbl}>
        rendement actuariel brut
        <br />
        {o.servedPricePct ? "servi" : "si servi"} à {fmtPrice(price)}
        {o.priceNote ? " (indicatif)" : ""}
      </div>
    </div>
  );
}

function facts(o: Offer): [string, string][] {
  const tenor = o.maturityOn ? tenorText(o.settleOn, o.maturityOn) : "—";
  if (o.kind === "ACTIONS")
    return [
      ["Minimum", `${o.minShares ?? 1} actions`],
      ["Souscription", `${fmtDate(o.opensAt, false)} → ${fmtDate(o.deadlineAt, false)}`],
      ["Dividende", o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—"],
      ["Titres", o.sharesOffered ? fmt(o.sharesOffered) : "—"],
    ];
  if (o.kind === "FONDS" && o.fund)
    return [
      ["Catégorie", FUND_CATEGORY_LABEL[o.fund.category]],
      ["Valorisation", FUND_FREQUENCY_LABEL[o.fund.frequency].replace("VL ", "")],
      ["Minimum", o.fund.distributed ? `${fmt(o.fund.minAmount)} FCFA` : "sur demande"],
      ["Droits d'entrée", o.fund.distributed ? fmtPct(o.fund.entryFeePct, 2) : "—"],
    ];
  if (o.kind === "MARCHE")
    return o.instrument === "obligation"
      ? [
          ["Marché", o.market ?? "—"],
          ["Coupon", fmtPct(o.couponRate ?? 0, 2)],
          ["Échéance", o.maturityOn ? fmtDate(o.maturityOn) : "—"],
          ["Com.", fmtPct(o.commissionPct, 2)],
        ]
      : [
          ["Marché", o.market ?? "—"],
          ["Quantité min", String(o.lotSize ?? 1)],
          ["Dividende", o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—"],
          ["Com.", fmtPct(o.commissionPct, 2)],
        ];
  if (o.kind === "BTA")
    return [
      ["Nominal", fmt(o.nominal)],
      ["Durée", tenor],
      ["Échéance", o.maturityOn ? fmtDate(o.maturityOn) : "—"],
      ["Com.", fmtPct(o.commissionPct, 2)],
    ];
  if (o.kind === "RACHAT")
    return [
      ["Prix de rachat", "100 %"],
      ["Échéance", o.maturityOn ? fmtDate(o.maturityOn) : "—"],
      ["Volume", o.sizeLabel ?? "—"],
      ["Com.", fmtPct(o.commissionPct, 2)],
    ];
  return [
    ["Coupon", fmtPct(o.couponRate ?? 0, 2)],
    ["Prix", fmtPrice(o.servedPricePct ?? o.pricePct ?? 100)],
    ["Durée réelle", tenor],
    ["Com.", fmtPct(o.commissionPct, 2)],
  ];
}

export function OfferCard({ o, now, layout = "cards" }: { o: Offer; now: Date; layout?: "cards" | "list" }) {
  const st = displayStatus(o, now);
  const past = isPast(st);
  const href = `/offres/${o.id}`;
  const dlText = o.kind === "FONDS" ? (st === "quoted" ? `Souscription à la prochaine VL${o.fund?.cutoff ? ` · centralisation ${o.fund.cutoff}` : ""}` : "VL publiée au bulletin · distribution sur demande") : st === "quoted" ? `Cotation continue · règlement T+${o.settlementDays ?? 3}` : st === "upcoming" ? `Ouvre ${fmtDateTime(o.opensAt)}` : past ? `Close le ${fmtDate(o.deadlineAt)}` : `Clôture ${fmtDateTime(o.deadlineAt)}`;
  const cd = st === "quoted" || st === "on_request" ? "" : st === "upcoming" ? countdown(o.opensAt, now) : past ? "" : countdown(o.deadlineAt, now);

  const ctas = o.kind === "FONDS" ? (
    st === "quoted" ? (
      <>
        <Link className="btn primary" href={`${href}?intent=souscription`}>
          Souscrire
        </Link>
        <Link className="btn" href={`${href}?intent=rachat`}>
          Racheter
        </Link>
        <Link className="btn ghost" href={`${href}?intent=info`}>
          Question
        </Link>
      </>
    ) : (
      <>
        <Link className="btn" href={href}>
          Voir la fiche
        </Link>
        <Link className="btn ghost" href={`${href}?intent=info`}>
          Souscrire — sur demande
        </Link>
      </>
    )
  ) : st === "quoted" ? (
    <>
      <Link className="btn primary" href={`${href}?intent=achat`}>
        Acheter
      </Link>
      <Link className="btn" href={`${href}?intent=vente`}>
        Vendre
      </Link>
      <Link className="btn ghost" href={`${href}?intent=info`}>
        Question
      </Link>
    </>
  ) : past ? (
    <>
      <Link className="btn" href={href}>
        Voir la fiche
      </Link>
      <Link className="btn ghost" href={`${href}?intent=info`}>
        Une question
      </Link>
    </>
  ) : o.kind === "RACHAT" ? (
    <>
      <Link className="btn primary" href={`${href}?intent=cession`}>
        Céder mes titres
      </Link>
      <Link className="btn ghost" href={`${href}?intent=info`}>
        Une question
      </Link>
    </>
  ) : st === "upcoming" ? (
    <>
      <Link className="btn primary" href={`${href}?intent=appetit`}>
        Me réserver
      </Link>
      <Link className="btn" href={`${href}?intent=rappel`}>
        Me rappeler à l&apos;ouverture
      </Link>
    </>
  ) : (
    <>
      <Link className="btn primary" href={`${href}?intent=ferme`}>
        Prise ferme
      </Link>
      <Link className="btn" href={`${href}?intent=appetit`}>
        Appétit
      </Link>
      <Link className="btn ghost" href={`${href}?intent=info`}>
        Question
      </Link>
    </>
  );

  return (
    <article className={`${styles.card} ${past ? styles.past : ""} ${layout === "list" ? styles.list : ""}`}>
      <div className={styles.head}>
        <div>
          <div className={`eyebrow ${styles.eyebrow}`}>
            <span className="cc">{o.country.toUpperCase()}</span>
            {KIND_LABEL[o.kind]} · {OPERATION_LABEL[o.operation]}
            {o.isExample && <span className="tag-ex">exemple</span>}
          </div>
          <h3 className={styles.title}>
            <Link href={href}>{o.title}</Link>
          </h3>
          <div className={styles.issuer}>
            {o.issuer} · <span className="mono">{o.isin}</span>
          </div>
        </div>
        <span className={`pill ${st}`}>{statusLabel(o, st)}</span>
      </div>
      <Hero o={o} />
      <div className={styles.facts}>
        {facts(o).map(([k, v]) => (
          <div key={k}>
            <span>{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
      {o.resultLine && <div className={styles.result}>{o.resultLine}</div>}
      <div className={styles.deadline}>
        <span>{dlText}</span>
        {cd && <span className={`${styles.cd} ${st === "closing" ? styles.hot : ""}`}>{cd}</span>}
      </div>
      <div className={styles.actions}>{ctas}</div>
    </article>
  );
}
