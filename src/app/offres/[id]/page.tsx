import Link from "next/link";
import { notFound } from "next/navigation";
import { FlowsChart } from "@/components/FlowsChart";
import { IntentForm } from "@/components/IntentForm";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { allowedIntents } from "@/lib/domain/intent";
import { displayStatus, headlineYield, isPast, KIND_LABEL, OPERATION_LABEL, STATUS_LABEL } from "@/lib/domain/status";
import type { IntentType, Offer } from "@/lib/domain/types";
import { bondCalc, btaAmountForBonds, btaCalc, daysBetween, firstCouponDate, tenorText } from "@/lib/finance";
import { fmt, fmtDate, fmtDateTime, fmtPct, fmtPrice } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ intent?: string }> };

export async function generateMetadata({ params }: Props) {
  const o = await repo().getOffer((await params).id);
  return { title: o ? o.title : "Offre" };
}

function Kpis({ o }: { o: Offer }) {
  const y = headlineYield(o);
  const items: [string, string, boolean][] =
    o.kind === "OTA" || o.kind === "APE"
      ? [
          [`Rendement ${o.servedPricePct ? "servi" : "visé"}`, y != null ? fmtPct(y, 2) : "—", true],
          [`Prix ${o.servedPricePct ? "servi" : "Purpose"}`, fmtPrice(o.servedPricePct ?? o.pricePct ?? 100), false],
          ["Coupon annuel", fmtPct(o.couponRate ?? 0, 2), false],
        ]
      : o.kind === "BTA"
        ? [
            ["Rendement actuariel", y != null ? fmtPct(y, 2) : "—", true],
            ["Taux précompté", fmtPct(o.precountRate ?? 0, 2), false],
            ["Durée", o.maturityOn ? `${daysBetween(o.settleOn, o.maturityOn)} jours` : "—", false],
          ]
        : o.kind === "ACTIONS"
          ? [
              ["Prix de souscription", fmt(o.pricePerShare ?? 0), true],
              ["Dernier cours", o.lastPrice ? fmt(o.lastPrice) : "—", false],
              ["Rendement du dividende", y != null ? fmtPct(y, 2) : "—", false],
            ]
          : [
              ["Prix de rachat", "100 %", true],
              ["Échéance initiale", o.maturityOn ? fmtDate(o.maturityOn) : "—", false],
              ["Volume racheté", o.sizeLabel ?? "—", false],
            ];
  return (
    <div className={styles.kpis}>
      {items.map(([k, v, gold]) => (
        <div key={k} className={`${styles.kpi} ${gold ? styles.gold : ""}`}>
          <span>{k}</span>
          <b className="num">{v}</b>
        </div>
      ))}
    </div>
  );
}

/** Read-only reference block at the published price. */
function Reference({ o }: { o: Offer }) {
  if ((o.kind === "OTA" || o.kind === "APE") && o.couponRate != null && o.maturityOn) {
    const price = o.servedPricePct ?? o.pricePct ?? 100;
    const r = bondCalc({ nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn, commissionPct: o.commissionPct }, 10_000_000, price);
    return (
      <>
        <h3>Pour 10 000 000 FCFA de nominal, au prix {o.servedPricePct ? "servi" : "Purpose"}</h3>
        <div className="out">
          <div>Titres (nominal {fmt(o.nominal)})</div>
          <div>{fmt(r.titles)}</div>
          <div>Prix {fmtPrice(price)}</div>
          <div>{fmt(r.titles * r.pricePerTitle)}</div>
          <div>Coupon couru ({r.accruedDays} jours)</div>
          <div>{r.accruedDays ? fmt(r.accrued) : "néant, ligne nouvelle"}</div>
          <div className="tot">Décaissement le {fmtDate(o.settleOn, false)}</div>
          <div>{fmt(r.outlay)} FCFA</div>
          <div>Commission {fmtPct(o.commissionPct, 2)}</div>
          <div>{fmt(r.commission)}</div>
          <div>Gain net hors commission, jusqu&apos;au terme</div>
          <div>{fmt(r.gain)}</div>
          <div className="hl">Rendement actuariel brut</div>
          <div>{fmtPct(r.irr, 2)}</div>
        </div>
        <FlowsChart r={r} settleOn={o.settleOn} />
      </>
    );
  }
  if (o.kind === "BTA" && o.precountRate != null && o.maturityOn) {
    const b = { nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn };
    const r = btaCalc(b, btaAmountForBonds(b, 10, o.precountRate), o.precountRate);
    return (
      <>
        <h3>Pour 10 bons de {fmt(o.nominal)} FCFA</h3>
        <div className="out">
          <div>Bons</div>
          <div>{fmt(r.n)}</div>
          <div>Prix d&apos;achat par bon</div>
          <div>{fmt(r.pricePerBond)}</div>
          <div className="tot">Décaissement le {fmtDate(o.settleOn, false)}</div>
          <div>{fmt(r.outlay)} FCFA</div>
          <div>Remboursé le {fmtDate(o.maturityOn, false)}</div>
          <div>{fmt(r.redemption)}</div>
          <div>Intérêt (précompté)</div>
          <div>{fmt(r.gain)}</div>
          <div className="hl">Rendement actuariel</div>
          <div>{fmtPct(r.yieldPct, 2)}</div>
        </div>
      </>
    );
  }
  if (o.kind === "ACTIONS" && o.pricePerShare) {
    const n = 100;
    return (
      <>
        <h3>Pour {n} actions</h3>
        <div className="out">
          <div>Actions</div>
          <div>{n}</div>
          <div className="tot">Montant à libérer</div>
          <div>{fmt(n * o.pricePerShare)} FCFA</div>
          <div>Dividende attendu ({fmt(o.dividendPerShare ?? 0)} / action)</div>
          <div>{fmt(n * (o.dividendPerShare ?? 0))}</div>
          {o.lastPrice && (
            <>
              <div>Valeur au dernier cours ({fmt(o.lastPrice)})</div>
              <div>{fmt(n * o.lastPrice)}</div>
              <div className="hl">Plus-value latente au cours du {o.lastPriceOn ? fmtDate(o.lastPriceOn, false) : "—"}</div>
              <div>+{fmt(n * (o.lastPrice - o.pricePerShare))}</div>
            </>
          )}
        </div>
      </>
    );
  }
  const n = 500;
  const proceeds = n * o.nominal;
  return (
    <>
      <h3>Pour {n} titres cédés</h3>
      <div className="out">
        <div>Titres cédés</div>
        <div>{n}</div>
        <div className="tot">Produit de cession à 100 %</div>
        <div>{fmt(proceeds)} FCFA</div>
        <div>Coupon couru</div>
        <div>réglé par le Trésor</div>
        <div>Commission {fmtPct(o.commissionPct, 2)}</div>
        <div>{fmt((proceeds * o.commissionPct) / 100)}</div>
        <div className="hl">Encaissement le {fmtDate(o.settleOn, false)}</div>
        <div>{fmt(proceeds * (1 - o.commissionPct / 100))}</div>
      </div>
    </>
  );
}

export default async function OfferPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [o, session] = await Promise.all([repo().getOffer(id), getSession()]);
  if (!o) notFound();
  const st = displayStatus(o);
  const past = isPast(st);
  const types = allowedIntents(o, st);
  const initial = (types.includes(sp.intent as IntentType) ? sp.intent : types[0]) as IntentType;

  const stampPending = Boolean(o.priceNote || o.rateNote);
  const stamp = o.servedPricePct ? "Prix servi à l'adjudication" : stampPending ? "Indicatif — prix à fixer par le desk" : `Prix fixé par le desk · ${o.pricedAt ? fmtDateTime(o.pricedAt) : "—"} · v${o.version}`;
  const priceText = o.kind === "RACHAT" ? "au pair (100 %)" : o.kind === "ACTIONS" ? `${fmt(o.pricePerShare ?? 0)} FCFA / action` : o.kind === "BTA" ? `taux ${fmtPct(o.precountRate ?? 0, 2)}` : `prix ${fmtPrice(o.servedPricePct ?? o.pricePct ?? 100)}`;

  const firstCoupon = o.kind === "OTA" && o.maturityOn ? firstCouponDate(o.settleOn, o.maturityOn) : undefined;
  const timeline: [string, string][] =
    o.kind === "ACTIONS"
      ? [
          ["Ouverture", fmtDate(o.opensAt)],
          ["Clôture", fmtDate(o.deadlineAt)],
          ["Règlement", fmtDate(o.settleOn)],
          ["Cotation", "BVMAC"],
        ]
      : [
          ["Dépôt des offres", fmtDateTime(o.deadlineAt)],
          ["Résultats", o.resultsAt ? fmtDateTime(o.resultsAt) : "—"],
          ["Règlement", fmtDate(o.settleOn)],
          [o.kind === "BTA" ? "Remboursement" : o.kind === "RACHAT" ? "Échéance initiale" : "Premier coupon", firstCoupon ? fmtDate(firstCoupon.toISOString().slice(0, 10)) : o.maturityOn ? fmtDate(o.maturityOn) : "—"],
        ];

  const risks =
    o.kind === "ACTIONS"
      ? [
          ["Volatilité et liquidité.", "Le cours dépend de l'offre et de la demande sur un compartiment actions encore étroit ; la BVMAC borne les variations quotidiennes."],
          ["Perte en capital.", "Comme tout actionnaire, l'investisseur peut perdre tout ou partie de sa mise."],
          ["Dividende non garanti.", "Le dividende dépend des résultats et de la décision de l'assemblée."],
        ]
      : [
          ["Crédit.", "L'émetteur est un État de la CEMAC ; coupons et capital dépendent de sa capacité à honorer sa dette."],
          ["Allocation.", "Prix et volumes servis sont arrêtés par le Trésor : une soumission peut être servie à un autre prix, en partie, ou pas du tout."],
          ["Liquidité.", "Conservé jusqu'au terme, le titre délivre le rendement calculé ; cédé avant, il se négocie au prix d'un secondaire encore étroit."],
        ];

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <Link href="/" className={styles.back}>
          ← Toutes les offres
        </Link>
        <div className={styles.head}>
          <div className={`eyebrow ${styles.eyebrow}`}>
            <span className="cc">{o.country.toUpperCase()}</span> {KIND_LABEL[o.kind]} · {OPERATION_LABEL[o.operation]} <span className={`pill ${st}`}>{STATUS_LABEL[st]}</span>
            {o.isExample && <span className="tag-ex">exemple</span>}
          </div>
          <h1 className="display">{o.title}</h1>
          <div className={styles.issuer}>
            {o.issuer} · <span className="mono">{o.isin}</span>
          </div>
        </div>

        <section className={styles.sec}>
          <div style={{ marginBottom: 10 }}>
            <span className={`stamp ${stampPending ? "pending" : ""}`}>{stamp}</span>
          </div>
          <Kpis o={o} />
          <p className={styles.blurb}>{o.blurb}</p>
          {o.resultLine && <div className={styles.result}>{o.resultLine}</div>}
        </section>

        <section className={styles.sec}>
          <Reference o={o} />
          <p className={styles.note}>
            Chiffres de référence au prix publié. Pour votre montant, indiquez-le dans votre intention ; le desk vous confirme le décaissement exact. Pour explorer d&apos;autres prix ou durées, utilisez le{" "}
            <Link href="/simulateur">simulateur</Link>.
          </p>
        </section>

        <section className={styles.sec}>
          <h3>Calendrier</h3>
          <div className={styles.tl}>
            {timeline.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.sec}>
          <h3>Documents</h3>
          <div className={styles.docs}>
            {o.documents.length === 0 && <span className="muted" style={{ fontSize: ".82rem" }}>Documents archivés.</span>}
            {o.documents.map((d) => (
              <div key={d.name} className={styles.doc}>
                <span className="mono">PDF</span>
                {d.name}
                <span className={styles.docMeta}>{d.meta}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.sec}>
          <h3>À garder en tête</h3>
          <ul className={styles.risks}>
            {risks.map(([t, d]) => (
              <li key={t}>
                <b>{t}</b> {d}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className={styles.side}>
        <IntentForm offer={o} types={types} initialType={initial} priceText={priceText} past={past} signedIn={Boolean(session)} />
        {o.maturityOn && !past && (
          <div className={styles.sideNote}>
            Durée réelle <b>{tenorText(o.settleOn, o.maturityOn)}</b> · règlement le {fmtDate(o.settleOn)} · {o.sizeLabel ?? ""}
          </div>
        )}
      </aside>
    </div>
  );
}
