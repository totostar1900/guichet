import type { BondResult } from "@/lib/finance";
import { fmt, fmtDate } from "@/lib/format";

/** Cash flows for one bond position: one outflow at settlement, then coupons and capital. */
export function FlowsChart({ r, settleOn }: { r: BondResult; settleOn: string }) {
  const pts = [{ date: new Date(settleOn.length === 10 ? `${settleOn}T00:00:00` : settleOn), amount: -r.outlay, label: "Souscription" }, ...r.flows];
  const W = 560;
  const H = 190;
  const padL = 16;
  const padR = 16;
  const base = 112;
  const maxAbs = Math.max(...pts.map((p) => Math.abs(p.amount)), 1);
  const scale = 70 / maxAbs;
  const slot = (W - padL - padR) / pts.length;
  const bw = Math.min(64, slot * 0.5);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Flux de trésorerie">
      <line className="axis" x1={padL} x2={W - padR} y1={base} y2={base} strokeWidth="1" />
      {pts.map((p, i) => {
        const x = padL + slot * i + slot / 2 - bw / 2;
        const h = Math.max(3, Math.abs(p.amount) * scale);
        const neg = p.amount < 0;
        const y = neg ? base + 1 : base - h - 1;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} rx="3" fill={neg ? "var(--chart-out)" : "var(--chart-in)"}>
              <title>{`${p.label} · ${fmtDate(iso(p.date))} · ${fmt(p.amount)} FCFA`}</title>
            </rect>
            <text className="val" x={x + bw / 2} y={neg ? y + h + 14 : y - 6} textAnchor="middle">
              {neg ? "−" : "+"}
              {fmt(Math.abs(p.amount))}
            </text>
            <text x={x + bw / 2} y={H - 22} textAnchor="middle">
              {fmtDate(iso(p.date), false)} {p.date.getFullYear()}
            </text>
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" style={{ fill: "var(--ink-3)" }}>
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
