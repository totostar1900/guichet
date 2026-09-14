"use client";

import { useState } from "react";
import { FlowsChart } from "./FlowsChart";
import { bondCalc, btaCalc, parseDate } from "@/lib/finance";
import { fmt, fmtDate, fmtPct, fmtPrice, parseAmount } from "@/lib/format";
import styles from "./Simulator.module.css";

/** Free-form bond / bill simulator — deliberately separate from any live offer. */
export function Simulator() {
  const [kind, setKind] = useState<"OTA" | "BTA">("OTA");
  const [amount, setAmount] = useState("10 000 000");
  const [coupon, setCoupon] = useState(6.5);
  const [price, setPrice] = useState(95);
  const [rate, setRate] = useState(5.5);
  const [settle, setSettle] = useState("2026-09-16");
  const [maturity, setMaturity] = useState("2028-09-16");
  const [last, setLast] = useState("");

  const amt = parseAmount(amount);
  const valid = settle && maturity && parseDate(maturity) > parseDate(settle);

  return (
    <>
      <div className={styles.calc}>
        <label className="field">
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value as "OTA" | "BTA")}>
            <option value="OTA">Obligation à coupon annuel (OTA, APE)</option>
            <option value="BTA">Bon à intérêts précomptés (BTA)</option>
          </select>
        </label>
        <label className="field">
          Montant nominal (FCFA)
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => setAmount(fmt(amt))} />
        </label>
        {kind === "OTA" ? (
          <>
            <label className="field">
              Coupon annuel (%)
              <input type="number" step="0.05" value={coupon} onChange={(e) => setCoupon(+e.target.value)} />
            </label>
            <label className="field">
              Prix (% du nominal)
              <input type="number" step="0.5" value={price} onChange={(e) => setPrice(+e.target.value)} />
            </label>
          </>
        ) : (
          <label className="field">
            Taux précompté (%)
            <input type="number" step="0.05" value={rate} onChange={(e) => setRate(+e.target.value)} />
          </label>
        )}
        <label className="field">
          Date de règlement
          <input type="date" value={settle} onChange={(e) => setSettle(e.target.value)} />
        </label>
        <label className="field">
          Échéance
          <input type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} />
        </label>
        {kind === "OTA" && (
          <label className="field">
            Dernier coupon versé (vide si ligne nouvelle)
            <input type="date" value={last} onChange={(e) => setLast(e.target.value)} />
          </label>
        )}
      </div>

      {!valid && <div className="muted" style={{ fontSize: ".85rem", marginTop: 10 }}>L&apos;échéance doit être postérieure au règlement.</div>}

      {valid && kind === "OTA" && (() => {
        const nominal = 10_000;
        const lastOk = last && parseDate(last) < parseDate(settle) ? last : null;
        const r = bondCalc({ nominal, couponRate: coupon, settleOn: settle, maturityOn: maturity, lastCouponOn: lastOk, commissionPct: 0.5 }, amt, price);
        return (
          <>
            <div className="out" style={{ marginTop: 12 }}>
              <div>Titres (nominal {fmt(nominal)})</div>
              <div>{fmt(r.titles)}</div>
              <div>Prix {fmtPrice(price)}</div>
              <div>{fmt(r.titles * r.pricePerTitle)}</div>
              <div>Coupon couru ({r.accruedDays} jours)</div>
              <div>{r.accruedDays ? fmt(r.accrued) : "néant, ligne nouvelle"}</div>
              <div className="tot">Décaissement le {fmtDate(settle, false)}</div>
              <div>{fmt(r.outlay)} FCFA</div>
              <div>Gain net hors commission, jusqu&apos;au terme</div>
              <div>{fmt(r.gain)}</div>
              <div className="hl">Rendement actuariel brut</div>
              <div>{fmtPct(r.irr, 2)}</div>
            </div>
            {r.titles > 0 && <FlowsChart r={r} settleOn={settle} />}
          </>
        );
      })()}

      {valid && kind === "BTA" && (() => {
        const r = btaCalc({ nominal: 1_000_000, settleOn: settle, maturityOn: maturity }, amt, rate);
        return (
          <div className="out" style={{ marginTop: 12 }}>
            <div>Bons (nominal 1 000 000)</div>
            <div>{fmt(r.n)}</div>
            <div>Prix d&apos;achat par bon</div>
            <div>{fmt(r.pricePerBond)}</div>
            <div className="tot">Décaissement le {fmtDate(settle, false)}</div>
            <div>{fmt(r.outlay)} FCFA</div>
            <div>Remboursé le {fmtDate(maturity, false)}</div>
            <div>{fmt(r.redemption)}</div>
            <div>Intérêt (précompté)</div>
            <div>{fmt(r.gain)}</div>
            <div className="hl">Rendement actuariel ({r.days} jours)</div>
            <div>{fmtPct(r.yieldPct, 2)}</div>
          </div>
        );
      })()}
    </>
  );
}
