"use client";

import { useMemo, useRef, useState } from "react";
import type { Country } from "@/lib/domain/types";
import { CEMAC_COLOR, COUNTRY_COLOR } from "@/lib/market/couleurs";
import { useT } from "@/i18n/client";
import styles from "./CourbeInteractive.module.css";

/**
 * La courbe des taux de la zone, et ce qu'on peut lui demander.
 *
 * Six Trésors empruntent au même guichet, et leurs courbes ne se lisent que
 * côte à côte : un 3 ans congolais ne dit rien seul, il dit quelque chose
 * au-dessus d'un 3 ans camerounais. Tout ce qui suit sert cette comparaison.
 *
 * Trois partis pris de tracé.
 *
 *   L'abscisse est logarithmique, et porte la vie restante. Trois mois et dix
 *   ans sur une échelle linéaire écrasent toute la partie courte contre l'axe,
 *   là où se passe l'essentiel des séances de la zone ; et un abondement de six
 *   ans à dix-huit mois de son terme appartient au court, quel que soit le nom
 *   de sa ligne.
 *
 *   Chaque ligne porte son nom à son extrémité. Une légende oblige à faire
 *   l'aller-retour entre une couleur et un mot ; l'étiquette au bout se lit là
 *   où l'œil est déjà.
 *
 *   Le survol montre tous les Trésors au même horizon, avec l'écart en points
 *   de base entre le plus cher et le moins cher. C'est la seule lecture qui
 *   compte sur une courbe souveraine : une valeur isolée ne dit rien.
 *
 * La CEMAC consolidée est une moyenne des Trésors présents à chaque horizon, et
 * elle est nommée pour ce qu'elle est. Ce n'est pas une référence de marché : on
 * moyenne des signatures très différentes, et le sens de l'exercice est de
 * donner un niveau de zone, pas un taux auquel quiconque emprunte.
 */

export interface PointCourbe {
  id: string;
  /** La vie restante en années : l'abscisse. */
  annees: number;
  /** Cette vie restante mise en mots, « 11 mois », « 1,5 ans ». */
  mot: string;
  pct: number;
  origine: string;
  hypotheses: string[];
  /** La durée annoncée, qui nomme la ligne sans la dater. */
  etiquette: string;
  abondement: boolean;
  mince: boolean;
  on: string;
  code?: string;
  /** L'âge de la séance au jour d'observation : une courbe ne vaut pas mieux que son point le plus vieux. */
  age: number;
}
export interface CourbePays {
  pays: Country;
  points: PointCourbe[];
  plusVieux: number;
  derniere: string;
}

type Choix = "tous" | "cemac" | Country;
interface Serie {
  nom: string;
  couleur: string;
  points: { annees: number; mot: string; pct: number; mince?: boolean; abondement?: boolean; etiquette?: string; n?: number; age?: number; on?: string }[];
  gros?: boolean;
}

const W = 900;
const H = 330;
const P = { l: 54, r: 104, t: 18, b: 46 };

export interface Fenetre {
  jours: number;
  /** Ce que la profondeur s'appelle : « 3 mois », « 2 ans ». */
  mot: string;
  pays: CourbePays[];
}

export function CourbeInteractive({
  fenetres,
  ariaLabel,
  aujourdhui,
  observeLe,
  choixDate,
}: {
  fenetres: Fenetre[];
  ariaLabel: string;
  /**
   * La courbe du jour, quand on en regarde une passée : elle est tracée en
   * filigrane derrière, parce qu'une courbe passée seule ne dit rien. Dix pour
   * cent à trois ans en 2023 n'est ni cher ni bon marché tant qu'on ignore ce
   * que c'est aujourd'hui.
   */
  aujourdhui?: CourbePays[];
  observeLe?: string;
  choixDate?: React.ReactNode;
}) {
  const t = useT();
  /**
   * La profondeur par défaut est la plus courte qui montre déjà tout.
   *
   * Mesuré : à quatre-vingt-dix jours comme à un an, la zone donne les mêmes
   * points. Commencer court et proposer d'aller plus loin vaut mieux que
   * l'inverse, parce qu'une courbe des taux dit le coût de l'argent aujourd'hui.
   */
  const [profondeur, setProfondeur] = useState(0);
  const pays = fenetres[profondeur]?.pays ?? [];
  const [choix, setChoix] = useState<Choix>("tous");
  const [survol, setSurvol] = useState<{ x: number; y: number; horizon: string; lignes: { nom: string; couleur: string; pct: number }[]; note?: string } | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);

  const tous = useMemo(() => pays.flatMap((p) => p.points), [pays]);
  const vieux = useMemo(() => (tous.length ? Math.max(...tous.map((p) => p.age)) : 0), [tous]);
  /**
   * L'abscisse est calculée sur tous les points, y compris ceux qu'on ne
   * regarde pas : les horizons gardent leur place d'un Trésor à l'autre, et
   * c'est ce qui permet de comparer en basculant entre deux sélections.
   */
  const abscisse = useMemo(() => {
    if (!tous.length) return null;
    const xs = tous.map((p) => Math.log(p.annees));
    return { x0: Math.min(...xs), x1: Math.max(...xs) };
  }, [tous]);

  /**
   * La zone consolidée : à chaque horizon, la moyenne des Trésors présents.
   *
   * Un horizon porté par un seul Trésor n'est pas une moyenne de zone, c'est ce
   * Trésor : il est donc écarté plutôt que recopié sous un autre nom.
   */
  const cemac = useMemo((): Serie["points"] => {
    const par = new Map<string, { annees: number; mot: string; v: number[]; ages: number[] }>();
    for (const p of pays)
      for (const q of p.points) {
        const e = par.get(q.mot) ?? { annees: q.annees, mot: q.mot, v: [], ages: [] };
        e.v.push(q.pct);
        e.ages.push(q.age);
        par.set(q.mot, e);
      }
    return [...par.values()]
      .filter((e) => e.v.length > 1)
      .map((e) => ({
        annees: e.annees,
        mot: e.mot,
        pct: e.v.reduce((a, b) => a + b, 0) / e.v.length,
        n: e.v.length,
        // Une moyenne n'est pas plus fraîche que le plus ancien des prix qu'elle moyenne.
        age: Math.max(...e.ages),
      }))
      .sort((a, b) => a.annees - b.annees);
  }, [pays]);

  const series = useMemo((): Serie[] => {
    const brutes: Serie[] =
      choix === "cemac"
        ? [{ nom: t("CEMAC"), couleur: CEMAC_COLOR, points: cemac, gros: true }]
        : pays.filter((p) => choix === "tous" || choix === p.pays).map((p) => ({ nom: p.pays, couleur: COUNTRY_COLOR[p.pays], points: p.points }));
    /**
     * Une série vide ne se trace pas, et surtout ne se nomme pas.
     *
     * La vue consolidée n'existe qu'aux horizons portés par deux Trésors au
     * moins : le jour où aucun ne se recouvre, elle est vide, et chercher son
     * dernier point pour y poser une étiquette faisait tomber la page entière.
     */
    return brutes.filter((s) => s.points.length > 0);
  }, [choix, pays, cemac, t]);

  /**
   * L'ordonnée suit ce qu'on regarde.
   *
   * Calculée sur toute la zone, elle écrasait le Cameroun contre l'axe dès que
   * le Congo montait à dix-sept pour cent : cent seize points de base d'écart
   * entre trois mois et sept ans devenaient une ligne droite. Une courbe qu'on
   * a choisi de lire seule se lit à sa propre échelle.
   */
  const ordonnee = useMemo(() => {
    const ys = series.flatMap((s) => s.points.map((p) => p.pct));
    if (!ys.length) return null;
    // Un demi-point de part et d'autre au minimum : une série presque plate ne
    // doit pas se retrouver étirée sur toute la hauteur par une marge nulle.
    const marge = Math.max((Math.max(...ys) - Math.min(...ys)) * 0.14, 0.25);
    return { lo: Math.min(...ys) - marge, hi: Math.max(...ys) + marge };
  }, [series]);

  if (!abscisse || !ordonnee) return null;
  const echelle = { ...abscisse, ...ordonnee };
  const X = (a: number) => P.l + ((Math.log(a) - echelle.x0) / (echelle.x1 - echelle.x0 || 1)) * (W - P.l - P.r);
  const Y = (v: number) => H - P.b - ((v - echelle.lo) / (echelle.hi - echelle.lo || 1)) * (H - P.t - P.b);

  const graduations: number[] = [];
  for (let v = Math.ceil(echelle.lo); v <= echelle.hi; v++) graduations.push(v);

  /** Les abscisses sont les horizons réellement adjugés, pas une graduation inventée. */
  const horizons = [...new Map(tous.map((p) => [p.mot, p])).values()].sort((a, b) => a.annees - b.annees);
  const nommes = new Set<string>();
  let droite = Number.POSITIVE_INFINITY;
  for (let i = horizons.length - 1; i >= 0; i--) {
    const x = X(horizons[i].annees);
    if (droite - x < 52) continue;
    nommes.add(horizons[i].mot);
    droite = x;
  }

  const bouger = (e: React.PointerEvent) => {
    const r = boite.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width) * W;
    if (x < P.l || x > W - P.r || !series.length) return setSurvol(null);
    const vise = Math.exp(echelle.x0 + ((x - P.l) / (W - P.l - P.r)) * (echelle.x1 - echelle.x0));
    const proches = series
      .map((se) => ({ se, p: se.points.reduce((m, q) => (Math.abs(Math.log(q.annees) - Math.log(vise)) < Math.abs(Math.log(m.annees) - Math.log(vise)) ? q : m)) }))
      .sort((a, b) => b.p.pct - a.p.pct);
    const ref = proches[0].p;
    const ecart = proches.length > 1 ? Math.round((proches[0].p.pct - proches[proches.length - 1].p.pct) * 100) : undefined;
    setSurvol({
      x: X(ref.annees),
      y: Y(ref.pct),
      horizon: ref.mot,
      lignes: proches.map(({ se, p }) => ({ nom: se.nom, couleur: se.couleur, pct: p.pct })),
      note: [
        ecart != null ? t("écart de {n} points de base entre {a} et {b}", { n: ecart, a: proches[0].se.nom, b: proches[proches.length - 1].se.nom }) : undefined,
        ref.abondement ? t("abondement : étiquette « {e} »", { e: ref.etiquette ?? "" }) : undefined,
        ref.age != null && ref.age > 90 ? t("séance vieille de {n} jours", { n: ref.age }) : undefined,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
    });
  };

  return (
    <div>
      <div className={styles.filtres}>
        <div className={styles.grp}>
          <span className={styles.etiq} id="courbe-tresor">
            {t("Trésor")}
          </span>
          <div className={styles.seg} role="group" aria-labelledby="courbe-tresor">
            <button type="button" aria-pressed={choix === "tous"} onClick={() => setChoix("tous")}>
              {t("Tous")}
            </button>
            <button type="button" aria-pressed={choix === "cemac"} onClick={() => setChoix("cemac")} title={t("La moyenne des Trésors présents à chaque horizon : un niveau de zone, pas un taux auquel quiconque emprunte.")}>
              <i style={{ background: CEMAC_COLOR }} aria-hidden="true" />
              {t("CEMAC")}
            </button>
            {pays.map((p) => (
              <button key={p.pays} type="button" aria-pressed={choix === p.pays} onClick={() => setChoix(p.pays)}>
                <i style={{ background: COUNTRY_COLOR[p.pays] }} aria-hidden="true" />
                {p.pays}
              </button>
            ))}
          </div>
        </div>

        {choixDate}

        <div className={styles.grp}>
          <span className={styles.etiq} id="courbe-profondeur">
            {t("Profondeur")}
          </span>
          <div className={styles.seg} role="group" aria-labelledby="courbe-profondeur">
            {fenetres.map((f, i) => (
              <button key={f.jours} type="button" aria-pressed={profondeur === i} onClick={() => setProfondeur(i)}>
                {f.mot}
              </button>
            ))}
          </div>
        </div>

        {/* L'âge du plus vieux point, en clair : une courbe datée doit avoir l'air datée. */}
        {vieux > 0 && (
          <p className={`${styles.age} ${vieux > 90 ? styles.ageVieux : ""}`}>
            {observeLe ? `${t("au {d}", { d: observeLe })} · ` : ""}
            {t("point le plus ancien : {n} jours", { n: vieux })}
          </p>
        )}
      </div>

      {!series.length && (
        <div className="empty">
          {choix === "cemac" ? t("Aucun horizon n'est porté par deux Trésors à la fois : il n'y a pas de niveau de zone à consolider.") : t("Aucun point à tracer pour ce choix.")}
        </div>
      )}

      <div className={styles.fig} ref={boite} onPointerMove={bouger} onPointerLeave={() => setSurvol(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className={styles.svg}>
          {graduations.map((v) => (
            <g key={v}>
              <line x1={P.l} y1={Y(v)} x2={W - P.r} y2={Y(v)} className={styles.grille} />
              <text x={P.l - 9} y={Y(v) + 4} textAnchor="end" className={styles.tick}>
                {v.toLocaleString("fr-FR")} %
              </text>
            </g>
          ))}
          {horizons.map((h) => (
            <g key={h.mot}>
              <line x1={X(h.annees)} y1={P.t} x2={X(h.annees)} y2={H - P.b} className={styles.grilleV} />
              {nommes.has(h.mot) && (
                <text x={X(h.annees)} y={H - P.b + 18} textAnchor="middle" className={styles.tick}>
                  {h.mot}
                </text>
              )}
            </g>
          ))}
          <path d={`M${P.l} ${P.t}V${H - P.b}H${W - P.r}`} className={styles.axe} />

          {survol && <line x1={survol.x} y1={P.t} x2={survol.x} y2={H - P.b} className={styles.suivi} />}

          {/* Le présent en filigrane : un repère, pas une série qu'on lit. */}
          {aujourdhui?.map((c) => {
            const pts = choix === "tous" || choix === c.pays ? c.points : [];
            if (pts.length < 2) return null;
            return (
              <polyline
                key={`fantome-${c.pays}`}
                points={pts.map((p) => `${X(p.annees)},${Y(p.pct)}`).join(" ")}
                fill="none"
                stroke={COUNTRY_COLOR[c.pays]}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.3}
              />
            );
          })}

          {series.map((se) => (
            <g key={se.nom}>
              {se.points.length > 1 && (
                <polyline points={se.points.map((p) => `${X(p.annees)},${Y(p.pct)}`).join(" ")} fill="none" stroke={se.couleur} strokeWidth={se.gros ? 3 : 2} strokeLinejoin="round" strokeLinecap="round" />
              )}
              {se.points.map((p) => (
                <circle
                  key={p.mot}
                  cx={X(p.annees)}
                  cy={Y(p.pct)}
                  r={se.gros ? 5 : 4}
                  fill={p.mince ? "var(--surface)" : se.couleur}
                  stroke={se.couleur}
                  strokeWidth={2}
                  /* Le point pâlit avec les mois : un prix de dix-huit mois n'est
                     pas un prix d'aujourd'hui, et cela doit se voir sans lire une
                     colonne. */
                  opacity={p.age == null ? 1 : Math.max(0.35, 1 - p.age / 900)}
                >
                  <title>{`${se.nom} · ${p.mot} · ${p.pct.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %${p.on ? ` · ${t("séance du {d}", { d: p.on })}` : ""}`}</title>
                </circle>
              ))}
              {/* Le nom au bout de la ligne : l'œil est déjà là, il n'a pas à repartir vers une légende. */}
              <text x={X(se.points[se.points.length - 1].annees) + 10} y={Y(se.points[se.points.length - 1].pct) + 4} className={styles.nom} fill={se.couleur}>
                {se.nom}
              </text>
            </g>
          ))}
        </svg>

        {survol && (
          <div className={styles.bulle} style={{ left: `${Math.min((survol.x / W) * 100 + 2, 74)}%`, top: `${Math.max(2, (survol.y / H) * 100 - 6)}%` }}>
            <div className={styles.bulleTitre}>{t("{h} à courir", { h: survol.horizon })}</div>
            {survol.lignes.map((l) => (
              <div key={l.nom} className={styles.bulleLigne}>
                <span>
                  <i style={{ background: l.couleur }} aria-hidden="true" />
                  {l.nom}
                </span>
                <b>{l.pct.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %</b>
              </div>
            ))}
            {survol.note && <div className={styles.bulleNote}>{survol.note}</div>}
          </div>
        )}
      </div>

      <div className={styles.legende}>
        {series.map((se) => (
          <span key={se.nom}>
            <i style={{ background: se.couleur }} aria-hidden="true" />
            {se.nom}
          </span>
        ))}
        <span className="muted">
          <i className={styles.creux} aria-hidden="true" />
          {t("séance mince : tracée, non représentative")}
        </span>
        {aujourdhui && aujourdhui.length > 0 && (
          <span className="muted">
            <i className={styles.fantome} aria-hidden="true" />
            {t("la courbe d'aujourd'hui, pour repère")}
          </span>
        )}
      </div>
    </div>
  );
}
