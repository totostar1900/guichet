"use client";

import { useT } from "@/i18n/client";
import { useState } from "react";
import type { BondResult } from "@/lib/finance";
import { fmt, fmtDate, fmtUnits } from "@/lib/format";

/**
 * Cash flows for one bond position: one outflow at settlement, then coupons and
 * capital. One scale for in and out; hover a bar for the exact amount and the
 * running total (what has come back so far against what went out).
 */
export function FlowsChart({ r, settleOn }: { r: BondResult; settleOn: string }) {
  const t = useT();
  const [hover, setHover] = useState<number | null>(null);
  const pts = [{ date: new Date(settleOn.length === 10 ? `${settleOn}T00:00:00` : settleOn), amount: -r.outlay, label: t("Souscription") }, ...r.flows];
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
  const h = hover != null ? pts[hover] : null;

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 768, margin: "8px auto 0" }}>
      <svg className="chart chartSm" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("Flux de trésorerie")} onMouseLeave={() => setHover(null)}>
        <line className="axis" x1={padL} x2={W - padR} y1={base} y2={base} strokeWidth="1" />
        {pts.map((p, i) => {
          const x = padL + slot * i + slot / 2 - bw / 2;
          const bh = Math.max(3, Math.abs(p.amount) * scale);
          const neg = p.amount < 0;
          const y = neg ? base + 1 : base - bh - 1;
          const showVal = !dense || i === 0 || i === pts.length - 1 || hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} style={{ opacity: hover != null && hover !== i ? 0.55 : 1 }}>
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
      </svg>
      {h && hover != null && (
        <div className="chartTip" style={{ left: `${((padL + slot * hover + slot / 2) / W) * 100}%` }}>
          <b>
            {h.amount < 0 ? "−" : "+"}
            {fmt(Math.abs(h.amount))} FCFA
          </b>
          <span>
            {h.label} · {fmtDate(iso(h.date))}
          </span>
          <span>
            cumul à cette date : {cum[hover] < 0 ? "−" : "+"}
            {fmt(Math.abs(cum[hover]))} FCFA
          </span>
        </div>
      )}
    </div>
  );
}
