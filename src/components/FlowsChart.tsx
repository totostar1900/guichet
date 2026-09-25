"use client";

import { useT } from "@/i18n/client";
import type { CashFlow } from "@/lib/finance";
import { useState } from "react";
import { RangeRead, TrackMarks, TrackTip, togglePin, trackStyles, useTracker } from "./charts/tracker";
import type { BondResult } from "@/lib/finance";
import { fmt, fmtDate, fmtPct, fmtUnits } from "@/lib/format";

/**
 * Cash flows for one bond position: one outflow at settlement, then coupons and
 * capital. One scale for in and out; hover a bar for the exact amount and the
 * running total (what has come back so far against what went out).
 */
/**
 * `scale` : la largeur du dessin, 1 etant la pleine mesure.
 *
 * Le viewBox ne bouge pas, seule la boite retrecit : les barres, les dates et
 * les montants suivent donc la meme reduction, ce qui est exactement ce qu'on
 * veut. Le simulateur du Guide et l'echeancier sous un ordre en prennent huit
 * dixiemes ; la ligne lue du desk six, parce que la page y porte aussi le
 * cycle de vie, les pieces et la piste d'audit, et que le graphique ne doit
 * pas en occuper la moitie.
 */
/**
 * Les versements d'une ligne, dessinés.
 *
 * Deux appelants, une seule courbe : le bloc de référence de la fiche, qui
 * tient un calcul complet, et l'échéancier sous l'ordre, qui n'a que ses flux
 * et le décaissement saisi. Le second passe donc « outlay » et « flows »
 * plutôt qu'un résultat entier, et le dessin ne change pas pour autant.
 */
export function FlowsChart({ r, outlay, flows, settleOn, scale: size = 1 }: { r?: BondResult; outlay?: number; flows?: CashFlow[]; settleOn: string; scale?: number }) {
  const t = useT();
  const [pins, setPins] = useState<string[]>([]);
  const out = r ? r.outlay : (outlay ?? 0);
  const rest = r ? r.flows : (flows ?? []);
  const pts = [{ date: new Date(settleOn.length === 10 ? `${settleOn}T00:00:00` : settleOn), amount: -out, label: t("Souscription") }, ...rest];
  const W = 560;
  const H = 276;
  const padL = 16;
  const padR = 16;
  const base = 142; // the zero line
  const upRoom = 104; // above the axis: bars + value label
  const downRoom = 62; // below: the outlay bar, its label sits under it
  const maxPos = Math.max(...pts.filter((p) => p.amount > 0).map((p) => p.amount), 1);
  const maxNeg = Math.max(...pts.filter((p) => p.amount < 0).map((p) => -p.amount), 1);
  const scale = Math.min(upRoom / maxPos, downRoom / maxNeg);
  const slot = (W - padL - padR) / pts.length;
  const bw = Math.min(64, slot * 0.5);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const dense = pts.length > 7;
  const cum: number[] = [];
  pts.reduce((s, p, i) => (cum[i] = s + p.amount), 0);
  const keys = pts.map((p, i) => `${iso(p.date)}|${i}`);
  const cx = (i: number) => padL + slot * i + slot / 2;
  const barTop = (i: number) => (pts[i].amount < 0 ? base + 1 : base - Math.max(3, Math.abs(pts[i].amount) * scale) - 1);
  const track = useTracker({ keys, x: cx, yAt: barTop, W, H, pins, onPin: (k) => setPins((cur) => togglePin(cur, k)) });
  const hover = track.hover;
  const h = hover != null ? pts[hover] : null;
  const idx = (k: string) => keys.indexOf(k);
  const iA = track.pinA ? idx(track.pinA) : -1;
  const iB = track.pinB ? idx(track.pinB) : -1;
  const backBetween = iA >= 0 && iB >= 0 ? pts.slice(iA + 1, iB + 1).filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0) : 0;

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: Math.round(768 * size), margin: "8px auto 0" }}>
      <svg className={`chart chartSm ${trackStyles.track}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("Flux de trésorerie")} {...track.handlers}>
        <line className="axis" x1={padL} x2={W - padR} y1={base} y2={base} strokeWidth="1" />
        {pts.map((p, i) => {
          const x = padL + slot * i + slot / 2 - bw / 2;
          const bh = Math.max(3, Math.abs(p.amount) * scale);
          const neg = p.amount < 0;
          const y = neg ? base + 1 : base - bh - 1;
          const showVal = !dense || i === 0 || i === pts.length - 1 || hover === i;
          return (
            <g key={i} style={{ opacity: hover != null && hover !== i ? 0.55 : 1 }}>
              <rect x={padL + slot * i} y={0} width={slot} height={H} fill={hover === i ? "var(--navy)" : "transparent"} fillOpacity={0.05} />
              <rect x={x} y={y} width={bw} height={bh} rx="3" fill={neg ? "var(--chart-out)" : "var(--chart-in)"} />
              {showVal && (
                <text className="val" x={x + bw / 2} y={neg ? y + bh + 13 : y - 6} textAnchor="middle">
                  {neg ? "−" : "+"}
                  {fmtUnits(Math.abs(p.amount))}
                </text>
              )}
              <text x={x + bw / 2} y={H - 20} textAnchor="middle" style={{ fontSize: dense ? 8.5 : undefined }}>
                {dense ? String(p.date.getFullYear()) : `${fmtDate(iso(p.date), false)} ${p.date.getFullYear()}`}
              </text>
              {!dense && (
                <text x={x + bw / 2} y={H - 7} textAnchor="middle" style={{ fill: "var(--ink-3)" }}>
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
        <TrackMarks x={(k) => cx(idx(k))} y={(k) => barTop(idx(k))} hover={hover != null ? keys[hover] : undefined} pinA={track.pinA} pinB={track.pinB} padT={0} padB={28} H={H} />
      </svg>
      {h && hover != null && (
        <TrackTip pos={track.pos}>
          <b>
            {h.amount < 0 ? "−" : "+"}
            {fmt(Math.abs(h.amount))} FCFA
          </b>
          <span>
            {h.label} · {fmtDate(iso(h.date))}
          </span>
          <span>
            {t("cumul à cette date")} : <em className={cum[hover] >= 0 ? trackStyles.up : trackStyles.down}>{cum[hover] < 0 ? "−" : "+"}{fmt(Math.abs(cum[hover]))} FCFA</em>
          </span>
          <small>{iA >= 0 && iB < 0 ? t("toucher pour lire ce qui revient jusqu'à ce flux") : t("toucher deux flux pour lire ce qui revient entre eux")}</small>
        </TrackTip>
      )}
      {iA >= 0 && iB >= 0 ? (
        <RangeRead onClear={() => setPins([])} clearLabel={t("effacer")}>
          <b>
            {fmtDate(iso(pts[iA].date))} → {fmtDate(iso(pts[iB].date))}
          </b>{" "}
          : <b className={trackStyles.up}>+{fmt(backBetween)} FCFA</b> {t("reçus en {n} flux", { n: String(iB - iA) })} · {t("cumul")} {cum[iA] < 0 ? "−" : "+"}{fmt(Math.abs(cum[iA]))} → {cum[iB] < 0 ? "−" : "+"}{fmt(Math.abs(cum[iB]))} FCFA
          {out ? ` · ${fmtPct((backBetween / out) * 100, 1)} ${t("de la mise")}` : ""}
        </RangeRead>
      ) : iA >= 0 ? (
        <RangeRead onClear={() => setPins([])} clearLabel={t("effacer")}>
          <b>{fmtDate(iso(pts[iA].date))}</b> : {t("touchez un second flux pour lire ce qui revient entre les deux")}
        </RangeRead>
      ) : null}
    </div>
  );
}
