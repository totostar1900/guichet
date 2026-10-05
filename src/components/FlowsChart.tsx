"use client";

import { useT } from "@/i18n/client";
import type { CashFlow } from "@/lib/finance";
import { useState } from "react";
import { type Lu, RangeRead, TrackBand, TrackMarks, togglePin, trackStyles, useTracker } from "./charts/tracker";
import type { BondResult } from "@/lib/finance";
import { fmt, fmtDate, fmtPct, fmtUnits, money } from "@/lib/format";

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
  const track = useTracker({ keys, x: cx, W, pins, onPin: (k) => setPins((cur) => togglePin(cur, k)) });
  const hover = track.hover;
  const h = hover != null ? pts[hover] : null;
  const idx = (k: string) => keys.indexOf(k);
  const iA = track.pinA ? idx(track.pinA) : -1;
  const iB = track.pinB ? idx(track.pinB) : -1;
  const backBetween = iA >= 0 && iB >= 0 ? pts.slice(iA + 1, iB + 1).filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0) : 0;
  const total = pts.filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0);
  const signe = (v: number) => `${v < 0 ? "−" : "+"}${fmt(Math.abs(v))} FCFA`;
  /* Un versement garde ses francs, c'est le point qu'on désigne ; une somme se
     lit en ordre de grandeur, et le tableau dessous porte l'exact. */
  const gros = (v: number) => `${v < 0 ? "−" : "+"}${money(Math.abs(v))} FCFA`;
  /* AU REPOS, L'ÉCHÉANCIER ENTIER : ce qui revient, contre ce qui sort. C'est la
     question qu'on se pose en arrivant, et il fallait jusqu'ici poser un doigt
     sur la dernière barre pour en approcher la réponse. Sous le doigt, le
     versement désigné et le cumul à sa date. */
  const lu: Lu = h
    ? {
        quand: fmtDate(iso(h.date)),
        dit: h.label,
        valeur: signe(h.amount),
        droite: [
          <>
            {t("cumul")} <em className={cum[hover ?? 0] >= 0 ? trackStyles.up : trackStyles.down}>{gros(cum[hover ?? 0])}</em>
          </>,
        ],
      }
    : iA >= 0 && iB >= 0
      ? {
          /* LA PÉRIODE : ce qui revient entre les deux flux. Le cumul de début
             et de fin ne tient pas ici, il reste sur la ligne du dessous, qui
             ne dit plus que lui. */
          quand: fmtDate(iso(pts[iA].date)),
          dit: t("au {d}", { d: fmtDate(iso(pts[iB].date)) }),
          valeur: `+${money(backBetween)} FCFA`,
          sous: t("{n} versements", { n: String(iB - iA) }),
          droite: out ? [<>{fmtPct((backBetween / out) * 100, 1)} {t("de la mise")}</>] : undefined,
        }
      : iA >= 0
        ? {
            quand: fmtDate(iso(pts[iA].date)),
            dit: t("épinglé"),
            valeur: signe(pts[iA].amount),
            sous: t("un second flux pour le total"),
          }
        : {
            quand: t("l'échéancier"),
            dit: t("{n} versements", { n: String(pts.length - 1) }),
            valeur: gros(total),
            sous: t("ce qui revient"),
            droite: [
              <>
                {t("la mise")} {money(out)}
              </>,
              out ? <>{fmtPct((total / out - 1) * 100, 1)} {t("de plus")}</> : null,
            ].filter((node): node is React.ReactElement => node !== null),
          };

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: Math.round(768 * size), margin: "8px auto 0" }}>
      <TrackBand lu={lu} onClear={iA >= 0 ? () => setPins([]) : undefined} clearLabel={t("effacer")} />
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
      {iA >= 0 && iB >= 0 ? (
        <RangeRead clearLabel={t("effacer")}>
          {t("cumul")} : {signe(cum[iA])} → {signe(cum[iB])}
        </RangeRead>
      ) : null}
    </div>
  );
}
