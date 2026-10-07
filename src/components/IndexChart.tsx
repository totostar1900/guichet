"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { type Lu, TrackBand, TrackMarks, trackStyles, useTracker } from "./charts/tracker";
import { BarreDePlage } from "./charts/BarreDePlage";
import { IndiceEtNegoce } from "./market/IndiceEtNegoce";
import { ampleurVariations, echelonVariations } from "@/lib/domain/indice-fenetre";
import { fmt, fmtDate, money } from "@/lib/format";
import { gouttiere } from "@/components/charts/gouttiere";
import styles from "./IndexChart.module.css";

export interface ChartPoint {
  date: string;
  value: number;
  variationPct?: number;
  /** The shares that traded on that session (mnemo and variation), when the index moved. */
  movers?: { mnemo: string; variationPct: number }[];
  /** Equity trading of the session, all shares: titles, FCFA, number of trades. */
  titles?: number;
  amount?: number;
  trades?: number;
}
export interface OverlaySeries {
  mnemo: string;
  name: string;
  points: { date: string; value: number; titles?: number; amount?: number; trades?: number; variationPct?: number }[];
  /** Shares in issue and in public hands (the last count read), so a capitalisation exists for every session. */
  sharesTotal?: number;
  sharesFloat?: number;
}

export type IndexView = "niveau" | "variations" | "volumes" | "contributions" | "calendrier" | "societes" | "capitalisation" | "flottant";
type PeriodKey = "1m" | "3m" | "ytd" | "12m" | "all";
type Marks = "ligne" | "ligne_mouvements" | "points";
const PERIODS: [PeriodKey, string][] = [
  ["1m", "1 mois"],
  ["3m", "3 mois"],
  /* « 1er janv. » ET NON « Depuis le 1er janvier ». Mesuré à 384 px : les
     cinq périodes faisaient 441 px et « Tout » passait seul à la ligne
     suivante, donc hors de vue — et c'est précisément celle qui montre les
     697 séances lues depuis décembre 2023. */
  ["ytd", "1er janv."],
  ["12m", "12 mois"],
  ["all", "Tout"],
];
const VIEWS: [IndexView, string][] = [
  /* « COURS » ET NON « NIVEAU ». Le second est le terme exact d'un indice et
     se lit comme du jargon ; « cours » est le mot de marché, et il laisse
     « Variations » à côté sans ambiguïté. La clef interne reste « niveau »,
     qui est dans des adresses partagées. */
  ["niveau", "Cours"],
  /* LES VARIATIONS SONT UNE VUE, et pas une lecture du niveau. Un indice qui
     passe de 100 à 101 puis de 1000 à 1010 a bougé deux fois d'un pour cent,
     et la courbe du niveau ne le montre pas : la seconde marche y paraît dix
     fois plus haute. */
  ["variations", "Variations"],
  ["volumes", "Cours + volumes"],
  ["contributions", "Contributions"],
  ["calendrier", "Calendrier"],
  ["societes", "Sociétés en base 100"],
  ["capitalisation", "Capitalisation"],
  ["flottant", "Flottant"],
];
type CapReading = "francs" | "log" | "croissance" | "part";
const CAP_READINGS: [CapReading, string][] = [
  ["francs", "en francs"],
  ["log", "échelle log"],
  ["croissance", "croissance, base 100"],
  ["part", "part de la cote"],
];
/** One sentence per reading : what the eye is looking at, opened on demand. */
const CAP_HOW: Record<CapReading, string> = {
  francs: "La cote en francs : la courbe bleue est la somme des capitalisations (cours × nombre de titres), la dorée la part en mains du public. L'écart entre les deux est ce qui ne se négocie pas. La barre du dessous donne la répartition du jour : une société qui prend les trois quarts de la barre prend les trois quarts de l'indice.",
  log: "Même chose en francs, mais l'axe est logarithmique : une même hausse en pourcentage occupe la même hauteur, qu'elle parte de 10 milliards ou de 1 000. C'est la lecture des professionnels sur un historique long : la taille et la croissance se voient dans le même cadre.",
  croissance: "Chaque société part de 100 au début de la période : la courbe dit sa croissance, pas sa taille. Une petite valeur qui double monte plus haut que la plus grosse société de la cote, ce que l'indice, lui, ne montre jamais.",
  part: "La part de chaque société dans la capitalisation de la cote, séance après séance. Une courbe qui monte gagne du terrain sur les autres, même si sa capitalisation baisse : c'est la lecture de la concentration dans le temps.",
};

/** « Comment lire » : one short paragraph the reader opens when a view needs it, closed by default. */
function HowTo({ text }: { text: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.howTo}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {t("Comment lire ce graphique ?")} {open ? "×" : ""}
      </button>
      {open && <p>{text}</p>}
    </div>
  );
}

/** Seven readable hues for the companies, in the order of the split and of the growth lines. */
const GROWTH = ["var(--chart-out)", "var(--gold)", "#2a8a9a", "#7a5cc0", "#1e7f4f", "#b4600a", "#6b7280"];
const shift = (iso: string, days: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() - days * 86400e3).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400e3);
const lvl = (v: number, d = 2) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${lvl(v, d)} %`);

/**
 * The index, every session read, under one selector of views: the level
 * (crosshair, pins, base 100, one share overlaid), the level with the
 * session's trading as bars, the calendar of a year of sessions, and the
 * listed shares as small charts against the index. Sessions further than
 * a week apart are not joined : a missing bulletin is a gap, not a line.
 */
export function IndexChart({ points, overlays, defaultPeriod = "12m" }: { points: ChartPoint[]; overlays: OverlaySeries[]; defaultPeriod?: PeriodKey }) {
  const t = useT();
  const [view, setView] = useState<IndexView>("niveau");
  const [period, setPeriod] = useState<PeriodKey>(defaultPeriod);
  const [rebase, setRebase] = useState(false);
  const [overlay, setOverlay] = useState("");
  const [pins, setPins] = useState<string[]>([]);
  const [marks, setMarks] = useState<Marks>("ligne_mouvements");
  // the company dimension of the calendar, the capitalisation and the float
  const [company, setCompany] = useState("");
  const co = overlays.find((o) => o.mnemo === company);
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(760);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = (width: number) => setW(Math.max(320, Math.floor(width)));
    measure(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((es) => measure(es[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const withVol = view === "volumes";
  const H = W < 480 ? 240 : 320;
  const padR = 14;
  const padT = 14;
  const padB = 28;

  const last = points[points.length - 1];
  const debutDe = (k: PeriodKey) => {
    if (!last) return "";
    if (k === "1m") return shift(last.date, 30);
    if (k === "3m") return shift(last.date, 91);
    if (k === "12m") return shift(last.date, 365);
    if (k === "ytd") return `${last.date.slice(0, 4)}-01-01`;
    return "";
  };
  /**
   * LA FENÊTRE EST UNE PLAGE D'INDICES, ET C'EST ELLE LE ZOOM.
   *
   * Les cinq boutons de période ne posaient qu'une borne gauche, toujours
   * accrochée à la dernière séance : impossible de regarder le printemps
   * 2024 sans tout afficher. La fenêtre est maintenant un couple de bornes
   * sur la série, que les boutons posent et que la barre à deux poignées
   * déplace. Resserrer, c'est zoomer, et tout ce qui est calculé plus bas
   * — les graduations, les volumes, les contributions, le calendrier — se
   * recalcule sur les points retenus, parce que tout part de « pts ».
   *
   * Elle vit en mémoire et non dans l'adresse : la page de l'indice est
   * rendue sur le serveur, et une poignée qui écrirait l'adresse à chaque
   * pas traînerait d'un aller-retour par pixel.
   */
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const bornesPeriode = useMemo(() => {
    const d = debutDe(period);
    const i = d ? points.findIndex((p) => p.date >= d) : 0;
    return [i < 0 ? 0 : i, points.length - 1] as [number, number];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, points, last]);
  const fenetre = zoom ?? bornesPeriode;
  const pts = useMemo(() => points.slice(fenetre[0], fenetre[1] + 1), [points, fenetre]);
  const choisirPeriode = (k: PeriodKey) => {
    setPeriod(k);
    setZoom(null);
  };
  const ov = overlays.find((o) => o.mnemo === overlay);
  /* La borne gauche de la fenêtre, pour tout ce qui se recoupe par date :
     la valeur comparée, les petites multiples, les contributions. */
  const debut = points[fenetre[0]]?.date ?? "";
  const ovPts = useMemo(() => (ov ? ov.points.filter((p) => p.date >= debut) : []), [ov, debut]);
  const showBase = rebase || Boolean(ov);
  const base = <P extends { date: string; value: number }>(arr: P[]): (P & { y: number })[] => {
    const b = arr[0]?.value;
    return b ? arr.map((p) => ({ ...p, y: (p.value / b) * 100 })) : [];
  };
  const series = useMemo(() => (showBase ? base(pts) : pts.map((p) => ({ ...p, y: p.value }))), [pts, showBase]);
  const ovSeries = useMemo(() => (ov ? base(ovPts) : []), [ovPts, ov]);
  // the trading of each session, all shares or one

  const dates = pts.map((p) => p.date);
  const d0 = dates[0] ?? "2000-01-01";
  const dN = dates[dates.length - 1] ?? "2000-01-02";
  /* Toutes les dates de la série, pour la barre de plage : ce sont elles qui
     la bornent, et non la fenêtre, sans quoi celle-ci ne pourrait que se
     resserrer et jamais se rouvrir. */
  const toutesLesDates = points.map((p) => p.date);
  const span = Math.max(1, daysBetween(d0, dN));
  const ys = [...series.map((p) => p.y), ...ovSeries.map((p) => p.y)];
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  const pad = (hi - lo || lo * 0.02 || 1) * 0.08;
  lo -= pad;
  hi += pad;
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);
  /* Le niveau de l indice tient en cinq caracteres, le volume d une seance en
     francs non : « 1 182,2 M » en demande neuf, et la gouttiere s y plie. */
  const padL = gouttiere(tickVals.map((v) => lvl(v, 0)));
  const x = (d: string) => padL + (daysBetween(d0, d) / span) * (W - padL - padR);
  const plotB = H - padB;
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (plotB - padT);
  const segments = (arr: { date: string; y: number }[]) => {
    const out: string[] = [];
    let cur: string[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (i > 0 && daysBetween(arr[i - 1].date, arr[i].date) > 7) {
        if (cur.length) out.push(cur.join(" "));
        cur = [];
      }
      cur.push(`${x(arr[i].date).toFixed(1)},${y(arr[i].y).toFixed(1)}`);
    }
    if (cur.length) out.push(cur.join(" "));
    return out;
  };
  // as many date ticks as the width can carry, first and last always
  const dateTicks: string[] = [];
  {
    const n = W < 480 ? 1 : W < 760 ? 3 : 5;
    const step = Math.max(1, span / n);
    for (let k = 0; k <= n; k++) dateTicks.push(shift(dN, Math.round(span - k * step)));
  }
  const tickDate = (d: string) => (W < 480 ? new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" }) : fmtDate(d));
  const togglePin = (date: string) => setPins((cur) => (cur.includes(date) ? cur.filter((d) => d !== date) : cur.length >= 2 ? [date] : [...cur, date].sort()));
  const setRange = (a: string, b: string) => setPins(a === b ? [a] : [a, b]);
  const at = (d: string) => pts.find((p) => p.date === d);
  const track = useTracker({ keys: dates, x: (i) => x(dates[i]), W, pins, onPin: togglePin, onRange: setRange });
  const hover = track.hover;
  if (!last || pts.length < 2) return <div className="empty">{t("Pas assez de séances lues sur cette période.")}</div>;
  const hp = hover != null ? pts[hover] : undefined;
  /* AU REPOS, LA DERNIÈRE SÉANCE. C'est la valeur que la page entière
     commente, et il fallait jusqu'ici poser un doigt sur le bord droit du
     tracé pour la lire. Sous le doigt, la séance désignée prend sa place. */
  const sInfo = (d: string) => series.find((p) => p.date === d);
  const oInfo = (d: string) => ovSeries.filter((p) => p.date <= d).pop();
  const pinA = pins[0] ? at(pins[0]) : undefined;
  const pinB = pins[1] ? at(pins[1]) : undefined;
  const between = pinA && pinB ? pts.filter((p) => p.date > pinA.date && p.date <= pinB.date) : [];
  const moved = between.filter((p) => (p.variationPct ?? 0) !== 0).length;
  const vu = hp ?? (pinA && !pinB ? pinA : undefined) ?? pts[pts.length - 1];
  /* L'ordre des quatre états : le doigt, la période, l'épingle seule, le
     repos. La période ne se lit plus sous le graphique : elle EST le bandeau,
     et les deux champs de dates en dessous la posent toujours. */
  const luIndice: Lu =
    !hp && pinA && pinB
      ? {
          quand: fmtDate(pinA.date),
          dit: t("au {d}", { d: fmtDate(pinB.date) }),
          valeur: <em className={pinB.value >= pinA.value ? styles.upT : styles.downT}>{signed(((pinB.value - pinA.value) / pinA.value) * 100)}</em>,
          /* Mesuré à 375 px : les deux niveaux (100 px) ne tiennent pas sous
             la valeur, qui ne reçoit que 77 px une fois les deux dates et les
             deux écarts servis. Ils passent donc à droite, avec le reste de ce
             qui s est passé, et le montant échangé prend leur place. */
          sous: `${money(between.reduce((a2, q) => a2 + (q.amount ?? 0), 0))} FCFA`,
          droite: [
            <>{t("{n} séances, {m} bougées", { n: String(between.length), m: String(moved) })}</>,
            <>
              {lvl(pinA.value)} → {lvl(pinB.value)}
            </>,
          ],
        }
      : {
          quand: fmtDate(vu.date),
          dit: hp ? t("séance lue") : pinA && !pinB ? t("épinglée") : t("dernière séance"),
          valeur: lvl(vu.value),
          /* LA QUATRIÈME CHOSE N APPARAÎT QUE SI LA PLACE EXISTE. Mesuré à
             375 px : les trois zones remplissent déjà la largeur, et ce qui
             s ajoute se fait couper en deux. Le seuil est celui que le reste
             du graphique emploie déjà pour ses propres décisions. */
          sous: !hp && pinA && !pinB ? t("une seconde date pour l'écart") : W >= 480 ? (vu.titles ? `${fmt(vu.titles)} ${t("titres")} · ${money(vu.amount ?? 0)} FCFA` : t("aucun échange sur les actions")) : undefined,
          droite: [
            <>
              <em className={(vu.variationPct ?? 0) > 0 ? styles.upT : (vu.variationPct ?? 0) < 0 ? styles.downT : ""}>{signed(vu.variationPct)}</em>
              {ov && oInfo(vu.date) ? ` · ${ov.mnemo} ${lvl(oInfo(vu.date)!.y, 1)}` : ""}
            </>,
            /* CE QUE LE BANDEAU NOMME, C'EST LA FENÊTRE, PAS LE BOUTON.
               L'écart se mesurait déjà depuis la première séance affichée,
               mais la ligne s'intitulait « 12 mois » même après qu'on ait
               déplacé la barre : le chiffre bougeait sous une étiquette qui
               ne bougeait pas, et on croyait que rien ne s'était mis à jour. */
            <>
              {zoom ? t("depuis le {d}", { d: fmtDate(d0) }) : t(PERIODS.find(([k]) => k === period)?.[1] ?? "Tout")}{" "}
              <em className={vu.value >= pts[0].value ? styles.upT : styles.downT}>{signed(((vu.value - pts[0].value) / pts[0].value) * 100)}</em>
            </>,
          ],
        };
  /* LA VUE « COURS + VOLUMES » EST DÉLÉGUÉE au composant partagé avec le
     panneau du desk : trois étages, trois axes, un seul axe du temps. Elle ne
     passe donc plus par le tracé du niveau, qui ne portait qu'une grandeur de
     volume à la fois et aucune graduation. */
  const lineView = view === "niveau";

  return (
    <div className={styles.wrap} ref={boxRef}>
      <div className={styles.views} role="tablist" aria-label={t("Vue")}>
        {VIEWS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}>
            {t(label)}
          </button>
        ))}
      </div>
      <div className={styles.bar}>
        <div className={styles.pills} role="tablist" aria-label={t("Période")}>
          {PERIODS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={period === k && !zoom} onClick={() => choisirPeriode(k)}>
              {t(label)}
            </button>
          ))}
        </div>
        {lineView && (
          <>
            <label className={styles.check}>
              <input type="checkbox" checked={showBase} disabled={Boolean(ov)} onChange={(e) => setRebase(e.target.checked)} /> {t("base 100")}
            </label>
            <Select compact label={t("Tracé")} value={marks} onChange={(v) => setMarks(v as Marks)} options={[{ value: "ligne", label: t("ligne") }, { value: "ligne_mouvements", label: t("ligne et mouvements") }, { value: "points", label: t("points") }]} />
            <Select compact label={t("Comparer à")} value={overlay} onChange={setOverlay} options={[{ value: "", label: t("aucune valeur") }, ...overlays.map((o) => ({ value: o.mnemo, label: o.mnemo, hint: o.name }))]} />
          </>
        )}
        {(view === "calendrier" || view === "capitalisation" || view === "flottant") && (
          <Select compact label={t("Société")} value={company} onChange={setCompany} options={[{ value: "", label: view === "capitalisation" ? t("toutes, empilées") : t("toutes les sociétés") }, ...overlays.map((o) => ({ value: o.mnemo, label: o.mnemo, hint: o.name }))]} />
        )}
      </div>

      {/* UNE SEULE BARRE DE PLAGE, ET POUR TOUTES LES VUES.
          Il y en avait deux, qui ne disaient pas la même chose : des poignées
          qui déplaçaient la fenêtre, et deux champs de dates qui posaient des
          épingles. Choisir une date ne changeait donc rien à ce qu'on voyait,
          d'autant qu'une épingle hors de la fenêtre ne se résolvait pas du
          tout. Les deux champs et les deux poignées règlent maintenant la même
          chose, la fenêtre ; l'épingle reste un clic sur le tracé ou sur une
          case du calendrier. Et la barre sort de la vue Niveau : les huit vues
          partent toutes des séances retenues, elles ont toutes besoin d'elle. */}
      <BarreDePlage dates={toutesLesDates} fenetre={fenetre} surFenetre={setZoom} surTout={() => setZoom(null)} motTout={t("revenir à la période")} />

      {lineView && (
        <>
          <TrackBand lu={luIndice} onClear={pinA ? () => setPins([]) : undefined} clearLabel={t("effacer")} />
          <svg viewBox={`0 0 ${W} ${H}`} className={`${styles.svg} ${trackStyles.track}`} role="img" aria-label={t("Indice BVMAC All Share, {n} séances du {a} au {b}", { n: String(pts.length), a: fmtDate(d0), b: fmtDate(dN) })} {...track.handlers}>
            {tickVals.map((v) => (
              <g key={v}>
                <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className={styles.grid} />
                <text x={padL - 6} y={y(v) + 3} textAnchor="end" className={styles.tick}>
                  {lvl(v, 0)}
                </text>
              </g>
            ))}
            {dateTicks.map((d, i) => (
              <text key={d} x={x(d)} y={H - 8} textAnchor={i === 0 ? "start" : i === dateTicks.length - 1 ? "end" : "middle"} className={styles.tick}>
                {tickDate(d)}
              </text>
            ))}
            {showBase && <line x1={padL} x2={W - padR} y1={y(100)} y2={y(100)} className={styles.baseLine} />}
            {segments(ovSeries).map((s, i) => (
              <polyline key={`o${i}`} points={s} className={styles.overlay} />
            ))}
            {marks !== "points" &&
              segments(series).map((s, i) => (
                <polyline key={i} points={s} className={styles.line} />
              ))}
            {marks === "points" && series.map((p) => <circle key={`m${p.date}`} cx={x(p.date)} cy={y(p.y)} r={2.4} className={styles.dot} />)}
            {series
              .filter((p) => marks !== "ligne" && (p.variationPct ?? 0) !== 0)
              .map((p) => (
                <circle key={p.date} cx={x(p.date)} cy={y(p.y)} r={3.5} className={(p.variationPct ?? 0) > 0 ? styles.up : styles.down}>
                  <title>
                    {fmtDate(p.date)} · {signed(p.variationPct)} {p.movers?.length ? `· ${p.movers.map((m) => `${m.mnemo} ${signed(m.variationPct)}`).join(", ")}` : ""}
                  </title>
                </circle>
              ))}
            <TrackMarks x={(k) => x(k)} y={(k) => y(sInfo(k)?.y ?? 0)} hover={hp?.date} pinA={pinA?.date} pinB={pinB?.date} padT={padT} padB={padB} H={H} />
          </svg>
          <p className={styles.legend}>
            <span>
              <i className={styles.kLine} /> {t("indice BVMAC All Share")}{showBase ? ` · ${t("base 100")}` : ""}
            </span>
            {ov && (
              <span>
                <i className={`${styles.kLine} ${styles.kGold} ${styles.kDash}`} /> {ov.mnemo} · {ov.name} ({t("base 100")})
              </span>
            )}
            <span>
              <i className={`${styles.sw} ${styles.kUp}`} /> {t("séance en hausse")} <i className={`${styles.sw} ${styles.kDown}`} /> {t("séance en baisse")}
            </span>
            {pinA && pinB && (
              <span>
                <i className={`${styles.sw} ${styles.kRange}`} /> {t("intervalle épinglé")}
              </span>
            )}
          </p>
          {pinA ? null : (
            <p className={styles.pinsRead}>
              {t("Touchez un point pour lire sa séance, deux pour lire l'écart entre elles.")}
            </p>
          )}
          <HowTo
            text={t(
              "Le niveau publié de l'indice, séance après séance. Les points colorés sont les séances où il a bougé, vert en hausse, orange en baisse ; les autres séances valent exactement le cours de la veille. Une coupure de la ligne veut dire qu'aucun bulletin n'a été lu pendant plus d'une semaine, jamais qu'il ne s'est rien passé.",
            )}
          />
        </>
      )}

      {withVol && <IndiceEtNegoce avecBarre={false} seances={pts.map((p) => ({ on: p.date, niveau: p.value, montant: p.amount ?? 0, transactions: p.trades ?? 0 }))} />}

      {view === "calendrier" && (
        <Calendar
          points={pts}
          W={W}
          pins={pins}
          company={co}
          from={debut || d0}
          to={dN}
          onPick={(d) => {
            /* ON NE CHANGE PLUS DE VUE. Le clic épinglait et sautait sur le
               Niveau : le calendrier disparaissait avec sa bulle avant
               qu'on l'ait lue. L'épingle est posée, la vue Niveau la
               montrera quand on ira la voir. */
            if (!at(d)) return;
            togglePin(d);
          }}
        />
      )}

      {view === "societes" && <SmallMultiples index={pts} overlays={overlays} from={debut} />}

      {view === "variations" && <Variations index={pts} W={W} pins={pins} onPin={togglePin} onRange={setRange} />}

      {view === "contributions" && <Contributions index={pts} overlays={overlays} from={pinA && pinB ? pinA.date : d0} to={pinA && pinB ? pinB.date : dN} />}

      {view === "capitalisation" && <Capitalisation index={pts} overlays={overlays} W={W} company={co} pins={pins} onPin={togglePin} onRange={setRange} />}

      {view === "flottant" && <FloatView index={pts} overlays={overlays} W={W} company={co} pins={pins} onPin={togglePin} onRange={setRange} />}
    </div>
  );
}

/** Close of a share at or before a date (sessions are sparse) ; at the start of a history, the first close after it. */
const closeAt = (o: OverlaySeries, date: string) => o.points.filter((p) => p.date <= date).pop()?.value ?? o.points.find((p) => p.date > date)?.value;
/** Signed points of index, « +3,68 pt ». */
const pts = (v: number) => `${v > 0 ? "+" : ""}${lvl(v, 2)} pt`;
/** Capitalisation of a share at a date, on the last share count read. */
const capAt = (o: OverlaySeries, date: string, kind: "total" | "float") => {
  const c = closeAt(o, date);
  const n = kind === "total" ? o.sharesTotal : o.sharesFloat;
  return c && n ? c * n : 0;
};

/** The period's move split by share : weight at the start × the share's own move, on the chosen weighting. */
/**
 * LES VARIATIONS SÉANCE PAR SÉANCE, en barres autour de zéro.
 *
 * La courbe du niveau ne les montre pas : un indice qui passe de 100 à 101
 * puis de 1 000 à 1 010 a bougé deux fois d'un pour cent, et la seconde
 * marche y paraît dix fois plus haute. Sur cette vue, les deux barres ont la
 * même hauteur, qui est le fait.
 *
 * LES SÉANCES IMMOBILES GARDENT LEUR PLACE, en trait sur le zéro : la cote
 * de la BVMAC ne bouge que quelques dizaines de fois par an, et une vue qui
 * ne montrerait que les mouvements laisserait croire à un marché agité.
 *
 * L'ÉCHELLE NE SE RÈGLE PLUS SUR LE PLUS GRAND MOUVEMENT. Mesuré sur les 697
 * séances du dépôt : 136 ont bougé, de 0,415 % au milieu, et quinze au-delà de
 * 3 %, jusqu'à 6,78 %. Un axe tendu à ±6,78 donnait sept pixels au mouvement
 * médian : la vue montrait cinq pics et une ligne plate, c'est-à-dire rien.
 * L'axe tient donc le corps de la distribution — le neuvième décile des
 * séances qui ont bougé dans la fenêtre — et les barres qui le dépassent sont
 * coupées net, prolongées d'un trait pointillé, et comptées sous le tracé. Le
 * neuvième décile se mesure dans la fenêtre et non une fois pour toutes :
 * le marché a changé d'amplitude, le mouvement médian passant de 0,06 % en
 * 2024 à 0,99 % en 2026.
 */
function Variations({ index, W, pins, onPin, onRange }: { index: ChartPoint[]; W: number; pins: string[]; onPin: (d: string) => void; onRange: (a: string, b: string) => void }) {
  const t = useT();
  const H = W < 480 ? 220 : 280;
  const padL = 44;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const vals = index.map((p) => p.variationPct ?? 0);
  const amp = ampleurVariations(vals);
  const dehors = index.filter((p) => Math.abs(p.variationPct ?? 0) > amp + 1e-9);
  const y = (v: number) => padT + ((amp - Math.max(-amp, Math.min(amp, v))) / (2 * amp)) * (H - padT - padB);
  const x = (i: number) => padL + (index.length < 2 ? 0 : (i / (index.length - 1)) * (W - padL - padR));
  const bw = Math.max(1.5, Math.min(9, (W - padL - padR) / Math.max(index.length, 1) - 1));
  const bouges = index.filter((p) => (p.variationPct ?? 0) !== 0);
  const hausse = bouges.filter((p) => (p.variationPct ?? 0) > 0).length;
  /* Les graduations tombent sur des valeurs que le tracé atteint. */
  const pas = echelonVariations(amp);
  const ticks: number[] = [];
  for (let v = -Math.floor(amp / pas) * pas; v <= amp + 1e-9; v += pas) ticks.push(Math.round(v * 1000) / 1000);
  const dates = index.map((p) => p.date);
  const pct = (v: number) => `${v > 0 ? "+" : ""}${String(Math.round(v * 100) / 100).replace(".", ",")} %`;
  const track = useTracker({ keys: dates, x: (i) => x(i), W, pins, onPin, onRange });
  const iDe = (d: string) => Math.max(0, dates.indexOf(d));
  const vu = track.hover != null ? index[track.hover] : undefined;
  const a = track.pinA ? index[iDe(track.pinA)] : undefined;
  const b = track.pinB ? index[iDe(track.pinB)] : undefined;
  const entre = a && b ? index.filter((p) => p.date > a.date && p.date <= b.date) : [];
  /* Le bandeau dit la séance lue, ou ce que les deux épingles enferment : une
     vue des mouvements se lit en comptant ceux qui ont eu lieu. */
  const lu: Lu =
    !vu && a && b
      ? {
          quand: fmtDate(a.date),
          dit: t("au {d}", { d: fmtDate(b.date) }),
          valeur: `${entre.filter((p) => (p.variationPct ?? 0) !== 0).length} / ${entre.length}`,
          sous: t("séances bougées"),
          droite: [<>{t("{n} en hausse", { n: String(entre.filter((p) => (p.variationPct ?? 0) > 0).length) })}</>, <>{t("plus fort : {v}", { v: pct(entre.reduce((m, p) => (Math.abs(p.variationPct ?? 0) > Math.abs(m) ? (p.variationPct ?? 0) : m), 0)) })}</>],
        }
      : {
          quand: fmtDate((vu ?? a ?? index[index.length - 1]).date),
          dit: vu ? t("séance lue") : a ? t("épinglée") : t("dernière séance"),
          valeur: (() => {
            const v = (vu ?? a ?? index[index.length - 1]).variationPct ?? 0;
            return <em className={v > 0 ? styles.upT : v < 0 ? styles.downT : ""}>{pct(v)}</em>;
          })(),
          sous: ((vu ?? a ?? index[index.length - 1]).variationPct ?? 0) === 0 ? t("le cours de la veille") : undefined,
          droite: [<>{t("{n} bougées sur {m}", { n: String(bouges.length), m: String(index.length) })}</>, <>{t("axe à ±{v}", { v: pct(amp).replace("+", "") })}</>],
        };
  return (
    <>
      <TrackBand lu={lu} onClear={track.pinA ? () => onPin(track.pinA!) : undefined} clearLabel={t("effacer")} />
      <svg viewBox={`0 0 ${W} ${H}`} className={`${styles.svg} ${trackStyles.track}`} role="img" aria-label={t("Variation de l'indice séance par séance")} {...track.handlers}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className={styles.grid} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" className={styles.tick}>
              {v > 0 ? "+" : ""}
              {String(v).replace(".", ",")} %
            </text>
          </g>
        ))}
        {index.map((p, i) => {
          const v = p.variationPct ?? 0;
          const h = Math.abs(y(v) - y(0));
          const coupe = Math.abs(v) > amp + 1e-9;
          return (
            <g key={p.date}>
              <rect x={x(i) - bw / 2} y={v >= 0 ? y(v) : y(0)} width={bw} height={Math.max(1.5, h)} className={v > 0 ? styles.varUp : v < 0 ? styles.varDown : styles.varPlat}>
                <title>{`${fmtDate(p.date)} · ${pct(v)}`}</title>
              </rect>
              {/* COUPÉE NET, ET ELLE LE DIT : une pointe au bout de la barre,
                  qui sort du cadre. Un pointillé, essayé d'abord, se lisait
                  comme trois points flottant au-dessus du tracé : à deux
                  pixels de large, une barre ne se prolonge pas, elle se
                  termine autrement. */}
              {coupe && (
                <polygon
                  points={v > 0 ? `${x(i) - 4},${padT} ${x(i) + 4},${padT} ${x(i)},${padT - 7}` : `${x(i) - 4},${H - padB} ${x(i) + 4},${H - padB} ${x(i)},${H - padB + 7}`}
                  className={v > 0 ? styles.varUp : styles.varDown}
                />
              )}
            </g>
          );
        })}
        <TrackMarks x={(d) => x(iDe(d))} y={(d) => y(index[iDe(d)]?.variationPct ?? 0)} hover={track.hover != null ? dates[track.hover] : undefined} pinA={track.pinA} pinB={track.pinB} padT={padT} padB={padB} H={H} />
      </svg>
      <p className={styles.note}>
        {t("{n} séances sur {m} ont bougé, dont {h} en hausse. Les autres cotent exactement le cours de la veille.", {
          n: String(bouges.length),
          m: String(index.length),
          h: String(hausse),
        })}
        {dehors.length > 0
          ? ` ${t("{k} dépassent l'échelle, jusqu'à {v} : leur barre est coupée, et sa pointe sort du cadre.", {
              k: String(dehors.length),
              v: pct(dehors.reduce((m, p) => (Math.abs(p.variationPct ?? 0) > Math.abs(m) ? (p.variationPct ?? 0) : m), 0)),
            })}`
          : ""}
      </p>
      <HowTo text={t("Chaque barre est l'écart d'une séance à la précédente, en pour cent. Une barre plate sur le zéro est une séance sans mouvement, et il y en a beaucoup : la cote ne bouge que quelques dizaines de fois par an. L'axe tient le corps des mouvements de la fenêtre et non le plus grand d'entre eux : tendu sur le plus grand, il donnait sept pixels au mouvement médian. C'est la vue qui compare un mouvement d'aujourd'hui à un mouvement d'il y a deux ans, ce que la courbe du cours ne permet pas.")} />
    </>
  );
}

function Contributions({ index, overlays, from, to }: { index: ChartPoint[]; overlays: OverlaySeries[]; from: string; to: string }) {
  const t = useT();
  const [kind, setKind] = useState<"total" | "float">("total");
  const a = index.find((p) => p.date >= from);
  const b = [...index].reverse().find((p) => p.date <= to);
  if (!a || !b || a.date >= b.date) return <div className="empty">{t("Choisissez deux dates sur la vue Niveau, ou une période.")}</div>;
  const caps = overlays.map((o) => ({ o, cap: capAt(o, a.date, kind) }));
  const total = caps.reduce((s, x) => s + x.cap, 0);
  const rows = caps
    .map(({ o, cap }) => {
      const c0 = closeAt(o, a.date);
      const c1 = closeAt(o, b.date);
      const move = c0 && c1 ? (c1 / c0 - 1) * 100 : 0;
      const weight = total ? (cap / total) * 100 : 0;
      return { o, weight, move, pts: (weight / 100) * move };
    })
    .sort((x, y) => Math.abs(y.pts) - Math.abs(x.pts));
  const sum = rows.reduce((s, r) => s + r.pts, 0);
  const published = (b.value / a.value - 1) * 100;
  const max = Math.max(0.1, ...rows.map((r) => Math.abs(r.pts)));
  const top = rows[0];
  return (
    <div className={styles.contribWrap}>
      <div className={styles.bar}>
        <span>
          {t("du {a} au {b}", { a: fmtDate(a.date), b: fmtDate(b.date) })} · {t("indice")} <b className={published >= 0 ? styles.upT : styles.downT}>{signed(published)}</b>
        </span>
        <Select compact label={t("pondération")} value={kind} onChange={(v) => setKind(v as "total" | "float")} options={[{ value: "total", label: t("capital global") }, { value: "float", label: t("flottant coté") }]} />
      </div>
      <div className={styles.contrib}>
        {rows.map((r) => (
          <div key={r.o.mnemo} className={styles.contribRow}>
            <Link href={`/societes/${r.o.mnemo.toLowerCase()}?depuis=indice`}>{r.o.mnemo}</Link>
            <span className={styles.contribTrack}>
              <i className={styles.contribZero} />
              <i className={`${styles.contribBar} ${r.pts >= 0 ? styles.contribUp : styles.contribDown}`} style={r.pts >= 0 ? { left: "50%", width: `${(r.pts / max) * 50}%` } : { right: "50%", width: `${(-r.pts / max) * 50}%` }} />
            </span>
            <b className={r.pts > 0 ? styles.upT : r.pts < 0 ? styles.downT : ""}>{pts(r.pts)}</b>
            <small>
              {t("poids")} {lvl(r.weight, 1)} % × {t("cours")} {signed(r.move, 1)}
            </small>
          </div>
        ))}
      </div>
      <p className={styles.legend}>
        <span>
          {t("Somme")} : <b>{pts(sum)}</b>
          {top && sum ? ` · ${top.o.mnemo} ${t("a fait")} ${lvl(Math.min(999, Math.abs((top.pts / sum) * 100)), 0)} % ${t("du mouvement")}` : ""}
        </span>
        <span>
          {t("écart avec la variation publiée")} : {pts(published - sum)} · {t("poids en début de période, cours de clôture ; la note de méthode dit le reste")}
        </span>
      </p>
      <HowTo text={t("Le mouvement de la période, partagé entre les sociétés : la barre de chacune est son poids multiplié par la variation de son cours, en points d'indice. Une très forte hausse sur une petite valeur donne une petite barre ; c'est ainsi que la performance de l'indice appartient à une ou deux sociétés. L'écart avec la variation publiée mesure ce que nos cours lus n'expliquent pas.")} />
    </div>
  );
}

/** The sum of the capitalisations, session after session, total and float stacked. */
function Capitalisation({ index, overlays, W, company, pins, onPin, onRange }: { index: ChartPoint[]; overlays: OverlaySeries[]; W: number; company?: OverlaySeries; pins: string[]; onPin: (d: string) => void; onRange: (a: string, b: string) => void }) {
  const t = useT();
  const [floatOnly, setFloatOnly] = useState(false);
  // four readings : the exchange in francs (linear or log, size and growth in one frame), each company in base 100, or each one's share of the exchange
  const [reading, setReading] = useState<CapReading>("francs");
  const H = W < 480 ? 220 : 280;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const kind: "total" | "float" = floatOnly ? "float" : "total";
  const set = company ? [company] : overlays;
  const rows = index.map((p) => ({ date: p.date, total: set.reduce((s, o) => s + capAt(o, p.date, "total"), 0), float: set.reduce((s, o) => s + capAt(o, p.date, "float"), 0) }));
  const ready = rows.length >= 2 && rows[rows.length - 1].total > 0;
  const d0 = rows[0]?.date ?? "2000-01-01";
  const dN = rows[rows.length - 1]?.date ?? "2000-01-02";
  const span = Math.max(1, daysBetween(d0, dN));
  // the growth reading : every company in base 100 on the period, one shared scale
  const lines = (company ? [company] : overlays).map((o) => ({ o, pts: index.map((p) => ({ date: p.date, cap: capAt(o, p.date, kind) })) })).map(({ o, pts }) => ({ o, pts: pts[0]?.cap ? pts.map((q) => ({ date: q.date, y: (q.cap / pts[0].cap) * 100 })) : [] })).filter((l) => l.pts.length > 1);
  const growthY = lines.flatMap((l) => l.pts.map((p) => p.y));
  const gLo = growthY.length ? Math.min(...growthY, 100) - 2 : 98;
  const gHi = growthY.length ? Math.max(...growthY, 100) + 2 : 102;
  const topF = Math.max(1, ...rows.map((r) => (floatOnly ? r.float : r.total))) * 1.06;
  // the shares of the exchange, session by session : each company's capitalisation over the total of that session
  const shares = (company ? [company] : overlays).map((o) => ({ o, pts: index.map((p) => { const tot = overlays.reduce((s2, q) => s2 + capAt(q, p.date, kind), 0); return { date: p.date, y: tot ? (capAt(o, p.date, kind) / tot) * 100 : 0 }; }) }));
  const logLo = Math.max(1, Math.min(...rows.flatMap((r) => [r.total, r.float]).filter((v) => v > 0)) * 0.8);
  const logHi = Math.max(logLo * 2, ...rows.map((r) => r.total)) * 1.25;
  /* Arrondi au centième, pour la même raison que la courbe fusionnée : la
     norme n'oblige pas « Math.log10 » à être correctement arrondie, et le V8
     du serveur et celui du navigateur peuvent différer d'un ulp. L'écart ne
     se verrait jamais à l'écran, mais il suffit à faire échouer l'hydratation
     et à faire refaire toute la page. L'arithmétique ordinaire, elle, est
     déterministe : seules les fonctions transcendantes sont en cause. */
  const lg = (v: number) => Math.round(Math.log10(Math.max(logLo, v)) * 1e6) / 1e6;
  const decades: number[] = [];
  for (let p = Math.floor(Math.log10(logLo)); Math.pow(10, p) <= logHi; p++) for (const m of [1, 3]) { const v = m * Math.pow(10, p); if (v >= logLo && v <= logHi) decades.push(v); }
  const flat = reading === "francs" || reading === "log";
  const ticks =
    reading === "francs"
      ? [0, 0.25, 0.5, 0.75, 1].map((v) => topF * v)
      : reading === "log"
        ? decades
        : reading === "part"
          ? [0, 25, 50, 75, 100]
          : [gLo, (gLo + gHi) / 2, 100, gHi].filter((v, i, a) => a.indexOf(v) === i);
  /** L etiquette d une graduation, ecrite une fois pour la gouttiere et pour le dessin. */
  const etiquette = (v: number) => (flat ? money(v) : reading === "part" ? `${lvl(v, 0)} %` : lvl(v, 0));
  const padL = gouttiere(ticks.map(etiquette), 52);
  const x = (d: string) => padL + (daysBetween(d0, d) / span) * (W - padL - padR);
  const last = rows[rows.length - 1];
  const plot = (v: number) => padT + (1 - v) * (H - padT - padB);
  const y = (v: number) =>
    reading === "francs"
      ? plot(v / topF)
      : reading === "log"
        ? plot((lg(v) - lg(logLo)) / (lg(logHi) - lg(logLo)))
        : reading === "part"
          ? plot(v / 100)
          : plot((v - gLo) / (gHi - gLo));
  const path = (k: "total" | "float") => rows.map((r) => `${x(r.date).toFixed(1)},${y(r[k]).toFixed(1)}`).join(" ");
  const area = (k: "total" | "float") => `${x(d0).toFixed(1)},${y(0).toFixed(1)} ${path(k)} ${x(dN).toFixed(1)},${y(0).toFixed(1)}`;
  const curves = reading === "part" ? shares : lines;
  const dates = rows.map((r) => r.date);
  const rowAt = (d: string) => rows.find((r) => r.date === d)!;
  const yOf = (d: string) => (flat ? y(floatOnly ? rowAt(d).float : rowAt(d).total) : y(curves[0]?.pts.find((p) => p.date === d)?.y ?? (reading === "part" ? 50 : 100)));
  const track = useTracker({ keys: dates, x: (i) => x(dates[i]), W, pins, onPin, onRange });
  const hp = track.hover != null ? rows[track.hover] : undefined;
  const rA = track.pinA ? rowAt(track.pinA) : undefined;
  const rB = track.pinB ? rowAt(track.pinB) : undefined;
  /* Quatre lectures, deux formes de bandeau : en francs la somme et son
     flottant, en base 100 ou en parts une ligne par société, avec la pastille
     de sa courbe. Au repos, la dernière séance dans les deux cas. */
  const vuCap = hp ?? (rA && !rB ? rA : undefined) ?? rows[rows.length - 1];
  const ecartCap = (de: number, a: number) => <em className={a >= de ? styles.upT : styles.downT}>{signed(de ? ((a - de) / de) * 100 : 0, 1)}</em>;
  const luCap: Lu = !hp && rA && rB
    ? {
        quand: fmtDate(rA.date),
        dit: t("au {d}", { d: fmtDate(rB.date) }),
        series: [
          { couleur: "var(--chart-out)", nom: t("capital global"), valeur: <>{money(rA.total)} → {money(rB.total)} {ecartCap(rA.total, rB.total)}</> },
          { couleur: "var(--gold)", nom: t("flottant coté"), valeur: <>{money(rA.float)} → {money(rB.float)} {ecartCap(rA.float, rB.float)}</> },
        ],
      }
    : flat
    ? {
        quand: fmtDate(vuCap?.date ?? dN),
        dit: hp ? t("séance lue") : rA && !rB ? t("épinglée") : t("dernière séance"),
        /* « FCFA » et la part du flottant attendent 480 px : mesuré à 375,
           « 1 727,2 Md FCFA » se faisait couper par une colonne de droite qui
           disait l'unité une seconde fois. */
        valeur: W >= 480 ? `${money(vuCap?.total ?? 0)} FCFA` : money(vuCap?.total ?? 0),
        sous: t("capital global"),
        droite: [
          <>
            {t("flottant coté")} {money(vuCap?.float ?? 0)}
          </>,
          W >= 480 ? <>{vuCap?.total ? lvl((vuCap.float / vuCap.total) * 100, 0) : "—"} % {t("du capital")}</> : null,
        ].filter((node): node is React.ReactElement => node !== null),
      }
    : {
        quand: fmtDate(vuCap?.date ?? dN),
        dit: hp ? t("séance lue") : t("dernière séance"),
        series: curves.slice(0, 3).map((l, i) => ({
          couleur: GROWTH[i % GROWTH.length],
          nom: l.o.mnemo,
          valeur: (() => {
            const v = l.pts.find((p) => p.date === (vuCap?.date ?? dN))?.y ?? 100;
            return reading === "part" ? `${lvl(v, 1)} %` : lvl(v, 1);
          })(),
        })),
      };
  if (!ready) return <div className="empty">{t("Le nombre de titres des sociétés n'est pas encore lu : pas de capitalisation à montrer.")}</div>;
  // today's split : one bar, the whole exchange, heaviest first
  const split = [...overlays].map((o) => ({ o, cap: capAt(o, dN, kind) })).filter((p) => p.cap > 0).sort((a, b) => b.cap - a.cap);
  const splitTotal = split.reduce((s, p) => s + p.cap, 0);
  const growthOf = (l: { pts: { y: number }[] }) => (l.pts.length ? l.pts[l.pts.length - 1].y - 100 : 0);
  const ranked = [...lines].sort((a, b) => growthOf(b) - growthOf(a));
  return (
    <div className={styles.capWrap}>
      <div className={styles.bar}>
        <div className={styles.pills} role="tablist" aria-label={t("Lecture")}>
          {CAP_READINGS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={reading === k} onClick={() => setReading(k)}>
              {t(label)}
            </button>
          ))}
        </div>
        <label className={styles.check}>
          <input type="radio" name="capk" checked={!floatOnly} onChange={() => setFloatOnly(false)} /> {t("capital global")}
        </label>
        <label className={styles.check}>
          <input type="radio" name="capk" checked={floatOnly} onChange={() => setFloatOnly(true)} /> {t("flottant coté")}
        </label>
      </div>
      <TrackBand lu={luCap} onClear={rA ? () => onPin(rA.date) : undefined} clearLabel={t("effacer")} />
      <svg viewBox={`0 0 ${W} ${H}`} className={`${styles.svg} ${trackStyles.track}`} role="img" aria-label={t("Capitalisation de la cote, séance après séance")} {...track.handlers}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className={v === 100 && reading === "croissance" ? styles.baseLine : styles.grid} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" className={styles.tick}>
              {etiquette(v)}
            </text>
          </g>
        ))}
        {flat ? (
          <>
            {!floatOnly && (
              <>
                <polygon points={area("total")} className={styles.areaTotal} />
                <polyline points={path("total")} className={styles.line} />
              </>
            )}
            <polygon points={area("float")} className={styles.areaFloat} />
            <polyline points={path("float")} className={styles.overlay} />
          </>
        ) : (
          curves.map((l, i) => (
            <g key={l.o.mnemo}>
              <polyline points={l.pts.map((p) => `${x(p.date).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ")} className={styles.growth} style={{ stroke: GROWTH[i % GROWTH.length] }} />
              <text x={W - padR - 2} y={y(l.pts[l.pts.length - 1].y) + 3} textAnchor="end" className={`${styles.tick} ${styles.stackLabel}`} style={{ fill: GROWTH[i % GROWTH.length] }}>
                {l.o.mnemo}
              </text>
            </g>
          ))
        )}
        <text x={padL} y={H - 8} className={styles.tick}>
          {fmtDate(d0)}
        </text>
        <text x={W - padR} y={H - 8} textAnchor="end" className={styles.tick}>
          {fmtDate(dN)}
        </text>
        <TrackMarks x={x} y={yOf} hover={hp?.date} pinA={track.pinA} pinB={track.pinB} padT={padT} padB={padB} H={H} />
      </svg>
      {flat && !company && splitTotal > 0 && (
        <div className={styles.splitWrap}>
          <div className={styles.splitHead}>
            {t("Aujourd'hui, qui pèse quoi")} · {floatOnly ? t("flottant coté") : t("capital global")} {money(splitTotal)} FCFA
          </div>
          <div className={styles.split}>
            {split.map((p, i) => (
              <span key={p.o.mnemo} className={styles.splitPart} style={{ width: `${(p.cap / splitTotal) * 100}%`, background: GROWTH[i % GROWTH.length] }} title={`${p.o.mnemo} · ${money(p.cap)} FCFA`}>
                {(p.cap / splitTotal) * 100 >= 8 ? `${p.o.mnemo} ${lvl((p.cap / splitTotal) * 100, 0)} %` : ""}
              </span>
            ))}
          </div>
          <p className={styles.legend}>
            {split.map((p, i) => (
              <span key={p.o.mnemo}>
                <i className={styles.kDot} style={{ background: GROWTH[i % GROWTH.length] }} /> {p.o.mnemo} {lvl((p.cap / splitTotal) * 100, 1)} %
              </span>
            ))}
          </p>
        </div>
      )}
      <p className={styles.legend}>
        {flat ? (
          <>
            {!floatOnly && (
              <span>
                <i className={styles.kLine} /> {company ? `${company.mnemo} · ` : ""}
                {t("capital global")} : {money(last.total)} FCFA
              </span>
            )}
            <span>
              <i className={`${styles.kLine} ${styles.kGold}`} /> {t("flottant coté")} : {money(last.float)} FCFA ({last.total ? lvl((last.float / last.total) * 100, 0) : "—"} %)
            </span>
            <span>{t("cours de clôture × nombre de titres lu au bulletin ; la même courbe que l'indice, en francs")}</span>
          </>
        ) : reading === "part" ? (
          <>
            <span>{t("la part de chaque société dans la capitalisation de la cote, séance par séance")}</span>
            {shares[0] && (
              <span>
                {shares.map((l) => `${l.o.mnemo} ${lvl(l.pts[l.pts.length - 1].y, 1)} %`).join(" · ")}
              </span>
            )}
          </>
        ) : (
          <>
            <span>{t("chaque société à 100 au début de la période : la taille ne cache plus la croissance")}</span>
            {ranked[0] && (
              <span>
                {t("la plus forte")} : <b>{ranked[0].o.mnemo}</b> {signed(growthOf(ranked[0]), 1)} · {t("la plus faible")} : <b>{ranked[ranked.length - 1].o.mnemo}</b> {signed(growthOf(ranked[ranked.length - 1]), 1)}
              </span>
            )}
          </>
        )}
      </p>
      <HowTo text={t(CAP_HOW[reading])} />
    </div>
  );
}

/** The published index against a float-weighted reading of the same prices, base 100, and the float rotation per share. */
function FloatView({ index, overlays, W, company, pins, onPin, onRange }: { index: ChartPoint[]; overlays: OverlaySeries[]; W: number; company?: OverlaySeries; pins: string[]; onPin: (d: string) => void; onRange: (a: string, b: string) => void }) {
  const t = useT();
  const H = W < 480 ? 220 : 260;
  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  // chain the float-weighted session returns : Σ (float cap of the previous session) × (close / previous close − 1)
  const reading: { date: string; y: number }[] = [];
  let level = 100;
  index.forEach((p, i) => {
    if (i > 0) {
      const prev = index[i - 1].date;
      const caps = overlays.map((o) => ({ o, cap: capAt(o, prev, "float") }));
      const tot = caps.reduce((s, c) => s + c.cap, 0);
      let r = 0;
      for (const { o, cap } of caps) {
        const c0 = closeAt(o, prev);
        const c1 = closeAt(o, p.date);
        if (c0 && c1 && tot) r += (cap / tot) * (c1 / c0 - 1);
      }
      level *= 1 + r;
    }
    reading.push({ date: p.date, y: level });
  });
  const pub = index.map((p) => ({ date: p.date, y: (p.value / index[0].value) * 100 }));
  const d0 = index[0].date;
  const dN = index[index.length - 1].date;
  const span = Math.max(1, daysBetween(d0, dN));
  const x = (d: string) => padL + (daysBetween(d0, d) / span) * (W - padL - padR);
  // a company picked : its own price in base 100, drawn against the two market readings
  const coLine = company ? (() => {
    const first = closeAt(company, index[0].date);
    return first ? index.map((p) => ({ date: p.date, y: ((closeAt(company, p.date) ?? first) / first) * 100 })) : [];
  })() : [];
  const all = [...pub.map((p) => p.y), ...reading.map((p) => p.y), ...coLine.map((p) => p.y)];
  const lo = Math.min(...all) - 1;
  const hi = Math.max(...all) + 1;
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const path = (arr: { date: string; y: number }[]) => arr.map((p) => `${x(p.date).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const pubEnd = pub[pub.length - 1].y - 100;
  const readEnd = reading[reading.length - 1].y - 100;
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);
  const dates = index.map((p) => p.date);
  const track = useTracker({ keys: dates, x: (i) => x(dates[i]), W, pins, onPin, onRange });
  const hp = track.hover != null ? index[track.hover] : undefined;
  const at = (arr: { date: string; y: number }[], d: string) => arr.find((p) => p.date === d)?.y ?? 100;
  /* Les deux lectures côte à côte, et l'écart entre elles : c'est toute la
     raison d'être de cette vue, et elle se lit maintenant sans un geste. */
  const dVu = hp?.date ?? (track.pinA && !track.pinB ? track.pinA : undefined) ?? dN;
  const pA = track.pinA;
  const pB = track.pinB;
  const luFlot: Lu = !hp && pA && pB
    ? {
        quand: fmtDate(pA),
        dit: t("au {d}", { d: fmtDate(pB) }),
        series: [
          { couleur: "var(--chart-out)", nom: t("indice publié"), valeur: <em className={at(pub, pB) >= at(pub, pA) ? styles.upT : styles.downT}>{signed((at(pub, pB) / at(pub, pA) - 1) * 100, 1)}</em> },
          { couleur: "var(--gold)", nom: t("en flottant"), valeur: <em className={at(reading, pB) >= at(reading, pA) ? styles.upT : styles.downT}>{signed((at(reading, pB) / at(reading, pA) - 1) * 100, 1)}</em> },
        ],
      }
    : {
    quand: fmtDate(dVu),
    dit: hp ? t("séance lue") : pA && !pB ? t("épinglée") : t("dernière séance"),
    series: [
      { couleur: "var(--chart-out)", nom: t("indice publié"), valeur: lvl(at(pub, dVu), 1) },
      { couleur: "var(--gold)", nom: t("en flottant"), valeur: lvl(at(reading, dVu), 1) },
      ...(coLine.length > 1 && company ? [{ couleur: "#2a8a9a", nom: company.mnemo, valeur: lvl(at(coLine, dVu), 1) }] : []),
    ],
    droite: [
      <>
        {t("écart")} <em className={at(pub, dVu) >= at(reading, dVu) ? styles.upT : styles.downT}>{signed(at(pub, dVu) - at(reading, dVu), 1).replace(" %", " pt")}</em>
      </>,
    ],
  };
  // the rotation window : the pinned range when there is one, else the period
  const rFrom = track.pinA && track.pinB ? track.pinA : d0;
  const rTo = track.pinA && track.pinB ? track.pinB : dN;
  // rotation : amount traded over the window ÷ float capitalisation at its end
  const rot = overlays
    .map((o) => {
      const amount = o.points.filter((p) => p.date > rFrom && p.date <= rTo).reduce((s, p) => s + (p.amount ?? 0), 0);
      const cap = capAt(o, rTo, "float");
      return { o, amount, cap, pct: cap ? (amount / cap) * 100 : 0 };
    })
    .sort((a, b) => b.pct - a.pct);
  const rotMax = Math.max(1, ...rot.map((r) => r.pct));
  const totAmount = rot.reduce((s, r) => s + r.amount, 0);
  const totCap = rot.reduce((s, r) => s + r.cap, 0);
  const hasCaps = totCap > 0;
  return (
    <div className={styles.capWrap}>
      {hasCaps ? (
        <>
          <TrackBand lu={luFlot} onClear={pA ? () => onPin(pA) : undefined} clearLabel={t("effacer")} />
          <svg viewBox={`0 0 ${W} ${H}`} className={`${styles.svg} ${trackStyles.track}`} role="img" aria-label={company ? t("{m}, lecture en flottant et indice publié, base 100", { m: company.mnemo }) : t("Indice publié et lecture en flottant, base 100")} {...track.handlers}>
            {tickVals.map((v) => (
              <g key={v}>
                <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className={styles.grid} />
                <text x={padL - 6} y={y(v) + 3} textAnchor="end" className={styles.tick}>
                  {lvl(v, 0)}
                </text>
              </g>
            ))}
            <line x1={padL} x2={W - padR} y1={y(100)} y2={y(100)} className={styles.baseLine} />
            <polyline points={path(reading)} className={styles.overlay} />
            <polyline points={path(pub)} className={styles.line} />
            {coLine.length > 1 && <polyline points={path(coLine)} className={styles.growth} style={{ stroke: "#2a8a9a" }} />}
            <text x={padL} y={H - 8} className={styles.tick}>
              {fmtDate(d0)}
            </text>
            <text x={W - padR} y={H - 8} textAnchor="end" className={styles.tick}>
              {fmtDate(dN)}
            </text>
            <TrackMarks x={x} y={(d) => y(at(pub, d))} hover={hp?.date} pinA={track.pinA} pinB={track.pinB} padT={padT} padB={padB} H={H} />
          </svg>
          {pA && pB && <p className={styles.pinsRead}>{t("la rotation ci-dessous est celle de cet intervalle")}</p>}
          <p className={styles.legend}>
            <span>
              <i className={styles.kLine} /> {t("indice publié, capital global")} : {signed(pubEnd, 1)}
            </span>
            <span>
              <i className={`${styles.kLine} ${styles.kGold}`} /> {t("lecture en flottant coté (Guichet, non publiée)")} : {signed(readEnd, 1)}
            </span>
            {coLine.length > 1 && company && (
              <span>
                <i className={styles.kLine} style={{ background: "#2a8a9a" }} /> {company.mnemo} : {signed(coLine[coLine.length - 1].y - 100, 1)}
              </span>
            )}
            <span>{t("les mêmes cours, pesés par les seuls titres en mains du public : l'écart dit combien le mouvement tenait à des titres qui ne s'échangent pas")}</span>
          </p>
        </>
      ) : (
        <div className="empty">{t("Le nombre de titres des sociétés n'est pas encore lu : pas de lecture en flottant à montrer.")}</div>
      )}
      <div className={styles.contrib}>
        <div className={styles.contribHead}>
          {t("Rotation du flottant · montant échangé ÷ flottant coté")} · {fmtDate(rFrom)} → {fmtDate(rTo)}
        </div>
        {company && totCap > 0 && (
          <p className={styles.legend}>
            <span>
              <b>{company.mnemo}</b> : {lvl((capAt(company, dN, "float") / totCap) * 100, 1)} % {t("du flottant de la cote")} ({money(capAt(company, dN, "float"))} FCFA) · {lvl((capAt(company, dN, "total") / overlays.reduce((s, o) => s + capAt(o, dN, "total"), 0)) * 100, 1)} % {t("du capital global")} · {t("flottant")} {capAt(company, dN, "total") ? lvl((capAt(company, dN, "float") / capAt(company, dN, "total")) * 100, 0) : "—"} % {t("de son capital")}
            </span>
          </p>
        )}
        {rot.map((r) => (
          <div key={r.o.mnemo} className={`${styles.contribRow} ${company && company.mnemo === r.o.mnemo ? styles.contribOn : ""}`}>
            <Link href={`/societes/${r.o.mnemo.toLowerCase()}?depuis=indice`}>{r.o.mnemo}</Link>
            <span className={styles.contribTrack}>
              <i className={`${styles.contribBar} ${styles.contribGold}`} style={{ left: 0, width: `${(r.pct / rotMax) * 100}%` }} />
            </span>
            <b>{lvl(r.pct, r.pct < 10 ? 1 : 0)} %</b>
            <small>
              {money(r.amount)} FCFA {t("sur")} {money(r.cap)}
            </small>
          </div>
        ))}
      </div>
      <p className={styles.legend}>
        <span>
          {t("Cote entière")} : {totCap ? lvl((totAmount / totCap) * 100, 0) : "—"} % {t("du flottant a changé de mains sur la période")} ({money(totAmount)} {t("sur")} {money(totCap)} FCFA)
        </span>
        <span>{t("une rotation faible veut dire qu'une position peut prendre des mois à sortir")}</span>
      </p>
      <HowTo text={t("En haut, l'indice publié (pesé par le capital global) et la même séquence de cours pesée par le seul flottant : quand les deux s'écartent, le mouvement tenait à des titres qui ne s'échangent pas. Choisir une société ajoute son cours en base 100. En bas, la rotation : le montant échangé sur la période divisé par le flottant coté, la mesure honnête de la facilité à entrer et à sortir.")} />
    </div>
  );
}

/** A year (or the period) of sessions : one cell per weekday, a column per week ; colour is the move, dashed is a bulletin not read. */
function Calendar({ points, company, from, to, onPick, W, pins }: { points: ChartPoint[]; company?: OverlaySeries; from: string; to: string; onPick: (d: string) => void; W: number; pins: string[] }) {
  const t = useT();
  const byDate = new Map(points.map((p) => [p.date, p]));
  const coByDate = new Map((company?.points ?? []).map((p) => [p.date, p]));
  // the bubble is fixed to the viewport (the panel clips its overflow) and kept inside it
  /**
   * LA BULLE S'ANCRE AU CLIC, ET LE CALENDRIER RESTE.
   *
   * Toucher une case menait à la vue Niveau : le calendrier disparaissait
   * avec sa bulle, et on n'avait pas eu le temps de la lire. Deux choses
   * changent. Le clic ÉPINGLE SANS CHANGER DE VUE — l'épingle sert à la vue
   * Niveau, on y va quand on veut, pas quand le clic le décide. Et la bulle
   * qu'il ouvre est ANCRÉE : le survol d'une autre case ne la remplace plus,
   * elle attend sa croix, Échap, ou un clic dehors.
   */
  const [tip, setTip] = useState<{ date: string; x: number; y: number; above: boolean; ancre?: boolean } | null>(null);
  const touch = useRef(false);
  const calRef = useRef<HTMLDivElement>(null);
  // the bubble left by a finger closes on the next touch or click elsewhere, on a scroll, or on Escape
  useEffect(() => {
    if (!tip) return;
    const outside = (e: Event) => {
      const el = calRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      setTip(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTip(null);
    /* Une bulle ancrée survit au défilement : on la lit justement en
       faisant défiler la page sous elle. */
    const onScroll = () => !tip.ancre && setTip(null);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [tip]);
  const showTip = (date: string, el: HTMLElement, ancre = false) => {
    /* Une bulle ancrée ne cède pas au survol : seul un nouveau clic, la
       croix ou Échap la déplacent. */
    if (tip?.ancre && !ancre) return;
    const r = el.getBoundingClientRect();
    const half = 130;
    const x = Math.min(window.innerWidth - half - 8, Math.max(half + 8, r.left + r.width / 2));
    const above = r.bottom + 200 > window.innerHeight;
    setTip({ date, x, y: above ? r.top - 6 : r.bottom + 6, above, ancre });
  };
  const tipPoint = tip ? byDate.get(tip.date) : undefined;
  /* Les deux épingles ne valent quelque chose qu'ensemble : tant qu'il n'y
     en a qu'une, il n'y a pas d'écart à lire. */
  const ecartEpingles = (() => {
    if (pins.length < 2) return undefined;
    const a = byDate.get(pins[0]);
    const b = byDate.get(pins[1]);
    if (!a || !b || !(a.value > 0)) return undefined;
    return { a: a.date, b: b.date, pct: ((b.value - a.value) / a.value) * 100 };
  })();
  const prevOf = (d: string) => {
    const i = points.findIndex((p) => p.date === d);
    return i > 0 ? points[i - 1] : undefined;
  };
  const start = new Date(`${from}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(`${to}T12:00:00Z`);
  const weeks: string[][] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 7)) {
    const w: string[] = [];
    for (let k = 0; k < 5; k++) w.push(new Date(d.getTime() + k * 86400e3).toISOString().slice(0, 10));
    weeks.push(w);
  }
  const cls = (d: string) => {
    if (d < from || d > to) return styles.calOut;
    const p = byDate.get(d);
    if (!p) return styles.calMissing;
    if (company) {
      const q = coByDate.get(d);
      if (!q) return styles.calFlat;
      const cv = q.variationPct ?? 0;
      if (cv === 0) return (q.trades ?? 0) > 0 ? styles.calTraded : styles.calFlat;
      const ca = Math.abs(cv);
      return `${cv > 0 ? styles.calUp : styles.calDown} ${styles[`calL${ca >= 3 ? 3 : ca >= 1 ? 2 : 1}`]}`;
    }
    const v = p.variationPct ?? 0;
    if (v === 0) return styles.calFlat;
    const a = Math.abs(v);
    const lvlCls = a >= 1 ? 3 : a >= 0.3 ? 2 : 1;
    return `${v > 0 ? styles.calUp : styles.calDown} ${styles[`calL${lvlCls}`]}`;
  };
  const missing = weeks.flat().filter((d) => d >= from && d <= to && !byDate.has(d)).length;
  const monthAt = (i: number) => {
    const m = weeks[i][0].slice(0, 7);
    return i === 0 || weeks[i - 1][0].slice(0, 7) !== m ? new Date(`${weeks[i][0]}T12:00:00Z`).toLocaleDateString("fr-FR", { month: "short" }) : "";
  };
  const day = ["lun", "mar", "mer", "jeu", "ven"];
  /**
   * EN PORTRAIT, DEUX FORMES, ET UNE SEULE COMMANDE POUR EN CHANGER : LA PLAGE.
   *
   * Couché au-dessus de 560 px, une colonne par semaine. En dessous, la forme
   * debout donnait cinquante-trois lignes de cases carrées de 52 px dans une
   * boîte à défilement de 487 px : mesuré à 375 px, dix semaines visibles sur
   * cinquante-trois, une boîte qui défile dans une page qui défile déjà, et
   * plus aucun repère de mois une fois qu'on était descendu.
   *
   * Au-delà de trois mois, UNE LIGNE PAR MOIS : les jours de bourse en
   * largeur (vingt-trois au plus), les mois qui descendent, l'année marquée
   * d'un filet. Vingt-quatre mois tiennent en 360 px, trente-six en 540 : la
   * page défile, le calendrier non.
   *
   * En deçà, LA GRILLE DU MOIS, cases de 44 px qu'on touche. La date se lit
   * sur un rail à gauche, une par semaine, et non dans la case : les fonds
   * vont d'une teinte à 35 % jusqu'au vert plein, et aucune couleur de texte
   * ne se lit sur les deux.
   */
  const debout = W < 560;
  const joursOuvres = weeks.flat().filter((d) => d >= from && d <= to);
  const moisGroupes: { cle: string; nom: string; court: string; an: string; jours: string[] }[] = [];
  for (const d of joursOuvres) {
    const cle = d.slice(0, 7);
    const dernier = moisGroupes[moisGroupes.length - 1];
    if (dernier?.cle === cle) dernier.jours.push(d);
    else {
      const j = new Date(`${d}T12:00:00Z`);
      moisGroupes.push({ cle, nom: j.toLocaleDateString("fr-FR", { month: "long" }), court: j.toLocaleDateString("fr-FR", { month: "short" }), an: cle.slice(0, 4), jours: [d] });
    }
  }
  /* LA BASCULE SE JUGE SUR LA DURÉE, PAS SUR LE NOMBRE DE BLOCS : une
     fenêtre de deux mois peut toucher quatre mois civils quand elle est
     rognée des deux bouts, et le compte de blocs la renvoyait alors au
     ruban. Cent jours laissent le jeu qu'il faut à « trois mois ». */
  const grilleDuMois = debout && daysBetween(from, to) <= 100 && moisGroupes.length <= 4;
  const cellule = (d: string) => {
    const p = byDate.get(d);
    const inRange = d >= from && d <= to;
    const label = p ? `${fmtDate(d)} · ${lvl(p.value)} · ${signed(p.variationPct)}` : inRange ? `${fmtDate(d)} · ${t("bulletin non lu")}` : "";
    return p ? (
      <button
        key={d}
        type="button"
        data-date={d}
        className={`${styles.calCell} ${cls(d)}`}
        aria-label={label}
        onPointerDown={(e) => {
          touch.current = e.pointerType === "touch";
        }}
        onClick={(e) => {
          setTip(null);
          showTip(d, e.currentTarget, true);
          onPick(d);
        }}
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") showTip(d, e.currentTarget);
        }}
        onFocus={(e) => showTip(d, e.currentTarget)}
      />
    ) : (
      <i key={d} className={`${styles.calCell} ${cls(d)}`} aria-label={label || undefined} onPointerEnter={inRange ? (e) => showTip(d, e.currentTarget) : undefined} onClick={inRange ? (e) => showTip(d, e.currentTarget) : undefined} />
    );
  };
  return (
    <div
      ref={calRef}
      className={styles.calWrap}
      onPointerLeave={(e) => e.pointerType !== "touch" && !tip?.ancre && setTip(null)}
      onPointerMove={(e) => {
        if (e.pointerType !== "touch" || e.buttons === 0) return;
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const d = el?.getAttribute("data-date");
        if (d && d !== tip?.date) showTip(d, el!);
      }}
    >
      {grilleDuMois ? (
        <div className={styles.calGrille}>
          {moisGroupes.map((m) => (
            <div key={m.cle}>
              <div className={styles.calMoisTitre}>
                {m.nom} {m.an}
              </div>
              <div className={styles.calGrilleJours}>
                <span />
                {day.map((nom) => (
                  <span key={nom} className={styles.calDay}>
                    {nom}
                  </span>
                ))}
                {weeks
                  .filter((w) => w.some((d) => d.slice(0, 7) === m.cle))
                  .map((w) => (
                    <div key={`${m.cle}-${w[0]}`} style={{ display: "contents" }}>
                      {/* LA DATE SUR UN RAIL, PAS DANS LA CASE : le lundi de
                          la semaine, en chiffres, là où aucune couleur de
                          texte ne tiendrait sur des fonds allant d'une
                          teinte à 35 % au vert plein. */}
                      <span className={styles.calRail}>{Number(w[0].slice(8, 10))}</span>
                      {w.map((d) => (d.slice(0, 7) === m.cle ? cellule(d) : <i key={d} className={`${styles.calCell} ${styles.calOut}`} />))}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : debout ? (
        <div className={styles.calRuban}>
          {moisGroupes.map((m, i) => (
            <Fragment key={m.cle}>
              {m.an !== moisGroupes[i - 1]?.an && <div className={styles.calAn}>{m.an}</div>}
              <div className={styles.calRubanLigne}>
                <span className={styles.calMonth}>{m.court}</span>
                <div className={styles.calRubanJours}>{m.jours.map((d) => cellule(d))}</div>
              </div>
            </Fragment>
          ))}
        </div>
      ) : (
        <div className={styles.cal} style={{ gridTemplateColumns: `28px repeat(${weeks.length}, 1fr)` }}>
          <span />
          {weeks.map((w, i) => (
            <span key={`tete-${w[0]}`} className={styles.calMonth}>
              {monthAt(i)}
            </span>
          ))}
          {[0, 1, 2, 3, 4].map((k) => (
            <div key={k} style={{ display: "contents" }}>
              <span className={styles.calDay}>{day[k]}</span>
              {weeks.map((w) => cellule(w[k]))}
            </div>
          ))}
        </div>
      )}
      {tip && (
        <div className={`${styles.calTip} ${tip.above ? styles.calTipAbove : ""}`} style={{ left: tip.x, top: tip.y }} role="status">
          {tip.ancre && (
            <button type="button" className={styles.calTipClose} onClick={() => setTip(null)} aria-label={t("Fermer")} title={t("Fermer")}>
              ×
            </button>
          )}
          <b>{new Date(`${tip.date}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</b>
          {/* L'ÉCART DES DEUX ÉPINGLES, DANS LA BULLE. Épingler depuis le
              calendrier posait une borne dont le résultat ne se lisait que
              sur une autre vue : on cliquait deux cases et rien ne changeait
              sous les yeux. Dès que les deux sont posées, la bulle dit ce
              qu'elles valent ensemble. */}
          {ecartEpingles && (
            <small className={styles.calTipEcart}>
              {t("du {a} au {b}", { a: fmtDate(ecartEpingles.a), b: fmtDate(ecartEpingles.b) })} : <b>{signed(ecartEpingles.pct)}</b>
            </small>
          )}
          {tipPoint && company ? (
            (() => {
              const q = coByDate.get(tip.date);
              return q ? (
                <>
                  <div className={styles.calTipRow}>
                    <span className={styles.calTipLevel}>
                      {company.mnemo} {fmt(q.value)}
                    </span>
                    <em className={`${styles.calTipDelta} ${(q.variationPct ?? 0) > 0 ? styles.calTipUp : (q.variationPct ?? 0) < 0 ? styles.calTipDown : ""}`}>{signed(q.variationPct)}</em>
                  </div>
                  <small>{q.trades ? `${fmt(q.titles ?? 0)} ${t("titres")} · ${money(q.amount ?? 0)} FCFA · ${q.trades} ${t("transaction(s)")}` : t("pas d'échange sur cette valeur")}</small>
                  <small>
                    {t("l'indice")} : {lvl(tipPoint.value)} · {signed(tipPoint.variationPct)}
                  </small>
                  <small className={styles.calTipHint}>{tip.ancre ? t("épinglée : la vue Niveau la montre") : t("toucher pour épingler")}</small>
                </>
              ) : (
                <small>{t("cours de cette valeur non lu sur cette séance")}</small>
              );
            })()
          ) : tipPoint ? (
            <>
              <div className={styles.calTipRow}>
                <span className={styles.calTipLevel}>{lvl(tipPoint.value)}</span>
                <em className={`${styles.calTipDelta} ${(tipPoint.variationPct ?? 0) > 0 ? styles.calTipUp : (tipPoint.variationPct ?? 0) < 0 ? styles.calTipDown : ""}`}>{signed(tipPoint.variationPct)}</em>
              </div>
              {prevOf(tip.date) && (
                <small>
                  {t("séance précédente")} {fmtDate(prevOf(tip.date)!.date)} : {lvl(prevOf(tip.date)!.value)}
                </small>
              )}
              {tipPoint.movers?.length ? (
                <div className={styles.calTipMovers}>
                  {tipPoint.movers.map((m) => (
                    <span key={m.mnemo}>
                      {m.mnemo} <em className={m.variationPct > 0 ? styles.calTipUp : m.variationPct < 0 ? styles.calTipDown : ""}>{m.variationPct !== 0 ? signed(m.variationPct) : t("échange")}</em>
                    </span>
                  ))}
                </div>
              ) : (tipPoint.variationPct ?? 0) !== 0 ? (
                <small>{t("cours d'action non lus sur cette séance")}</small>
              ) : null}
              <small>{tipPoint.titles ? `${fmt(tipPoint.titles)} ${t("titres")} · ${money(tipPoint.amount ?? 0)} FCFA · ${tipPoint.trades ?? 0} ${t("transaction(s)")}` : t("aucun échange sur les actions")}</small>
              <small className={styles.calTipHint}>{tip.ancre ? t("épinglée : la vue Niveau la montre") : t("toucher pour épingler")}</small>
            </>
          ) : (
            <small>{t("Jour ouvré sans bulletin lu : jour férié, séance non tenue ou bulletin non publié.")}</small>
          )}
        </div>
      )}
      <p className={styles.legend}>
        <span>
          <i className={`${styles.sw} ${styles.calFlat}`} /> {t("séance à 0,00 %")}
        </span>
        <span>
          <i className={`${styles.sw} ${styles.calUp} ${styles.calL3}`} /> {t("hausse")}
        </span>
        <span>
          <i className={`${styles.sw} ${styles.calDown} ${styles.calL3}`} /> {t("baisse")}
        </span>
        {company && (
          <span>
            <i className={`${styles.sw} ${styles.calTraded}`} /> {t("échange sans changement de cours")}
          </span>
        )}
        <span>
          <i className={`${styles.sw} ${styles.calMissing}`} /> {t("jour ouvré sans bulletin lu (jours fériés compris)")}
        </span>
        {company && (
          <span>
            <b>{company.mnemo}</b> : {[...coByDate.entries()].filter(([d, q]) => d >= from && d <= to && (q.variationPct ?? 0) !== 0).length} {t("séances avec changement de cours")}, {[...coByDate.entries()].filter(([d, q]) => d >= from && d <= to && (q.trades ?? 0) > 0).length} {t("avec échange")}
          </span>
        )}
        <span>
          {points.length} {t("séances lues")}, {points.filter((p) => (p.variationPct ?? 0) !== 0).length} {t("avec mouvement")}, {missing} {t("sans bulletin")} · {t("toucher une séance l'épingle sur la vue Niveau")}
        </span>
      </p>
      <HowTo
        text={t(
          debout
            ? "Une case par jour ouvré. La couleur dit le mouvement de la séance, l'intensité sa force ; le gris est une séance à 0,00 %, le pointillé un jour sans bulletin lu (jour férié, séance non tenue ou bulletin non publié). Au-delà de trois mois, une ligne par mois et les jours de bourse en largeur : toute la période tient d'un coup. En deçà, la grille du mois, avec des cases qu'on touche et la date des lundis sur le rail de gauche. C'est la barre de plage, en haut, qui fait passer de l'une à l'autre."
            : "Une case par jour ouvré, une colonne par semaine. La couleur dit le mouvement de la séance, l'intensité sa force ; le gris est une séance à 0,00 %, le pointillé un jour sans bulletin lu (jour férié, séance non tenue ou bulletin non publié). Choisir une société colore les cases avec le cours de cette valeur, hachurées quand elle s'échange sans changer de prix.",
        )}
      />
    </div>
  );
}

/** Each listed share against the index, both in base 100 over the period, one small chart per share. */
function SmallMultiples({ index, overlays, from }: { index: ChartPoint[]; overlays: OverlaySeries[]; from: string }) {
  const t = useT();
  const i0 = index[0]?.value;
  if (!i0) return null;
  const ix = index.map((p) => ({ date: p.date, y: (p.value / i0) * 100 }));
  const iEnd = ix[ix.length - 1].y - 100;
  return (
    <div className={styles.smWrap}>
      <div className={styles.sm}>
        {overlays.map((o) => {
          const pts = o.points.filter((p) => p.date >= from);
          const s0 = pts[0]?.value;
          if (!s0 || pts.length < 2) return null;
          const s = pts.map((p) => ({ date: p.date, y: (p.value / s0) * 100 }));
          const sEnd = s[s.length - 1].y - 100;
          const all = [...s.map((p) => p.y), ...ix.map((p) => p.y)];
          const lo = Math.min(...all) - 1;
          const hi = Math.max(...all) + 1;
          const d0 = ix[0].date < s[0].date ? ix[0].date : s[0].date;
          const dN = ix[ix.length - 1].date > s[s.length - 1].date ? ix[ix.length - 1].date : s[s.length - 1].date;
          const span = Math.max(1, daysBetween(d0, dN));
          const x = (d: string) => 4 + (daysBetween(d0, d) / span) * 192;
          const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * 50;
          const path = (arr: { date: string; y: number }[]) => arr.map((p) => `${x(p.date).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
          const alone = Math.abs(sEnd - iEnd) >= 2;
          return (
            <Link key={o.mnemo} href={`/societes/${o.mnemo.toLowerCase()}?depuis=indice`} className={styles.smCard}>
              <b>
                {o.mnemo} <span className={sEnd > 0 ? styles.upT : sEnd < 0 ? styles.downT : ""}>{signed(sEnd, 1)}</span>
              </b>
              <small>
                {o.name} · {t("l'indice")} {signed(iEnd, 1)}
              </small>
              <svg viewBox="0 0 200 62" className={styles.smSvg} aria-label={`${o.mnemo} ${t("et l'indice, base 100")}`}>
                <line x1="4" x2="196" y1={y(100)} y2={y(100)} className={styles.grid} />
                <polyline points={path(ix)} className={styles.overlay} />
                <polyline points={path(s)} className={styles.line} />
              </svg>
              <small>{alone ? (sEnd > iEnd ? t("a fait plus que le marché") : t("a fait moins que le marché")) : t("a suivi le marché")}</small>
            </Link>
          );
        })}
      </div>
      <p className={styles.legend}>
        <span>
          <i className={styles.kLine} /> {t("la société")}
        </span>
        <span>
          <i className={`${styles.kLine} ${styles.kGold}`} /> {t("l'indice")}
        </span>
        <span>{t("base 100 au début de la période · toucher une vignette ouvre la société")}</span>
      </p>
      <HowTo text={t("Une vignette par société : son cours en trait plein, l'indice en pointillé doré, les deux ramenés à 100 au début de la période. La courbe au-dessus du pointillé a fait mieux que le marché, celle en dessous moins bien. Les paliers sont les séances sans transaction, pas des jours de stabilité.")} />
    </div>
  );
}
