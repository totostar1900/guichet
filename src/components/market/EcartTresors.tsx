"use client";

import { useMemo, useRef, useState } from "react";
import type { Country } from "@/lib/domain/types";
import { COUNTRY_COLOR } from "@/lib/market/couleurs";
import { useT } from "@/i18n/client";
import type { CourbePays } from "./CourbeInteractive";
import styles from "./EcartTresors.module.css";

/**
 * L'écart entre deux Trésors, à horizon comparable.
 *
 * C'était une table, et une table contre un seul Trésor : le premier de la
 * liste servait de référence à tous les autres, ce qui répond à une question
 * que personne ne pose. Un desk compare deux signatures qu'il a en tête, pas
 * toutes contre une.
 *
 * Deux choix, donc, et un graphique. L'écart en points de base par horizon se
 * lit d'un coup d'œil : où la prime s'ouvre, où elle se referme, et si elle
 * change de signe. Une table le dit aussi, mais ligne par ligne.
 *
 * Le nombre de jours qui sépare les deux séances reste porté partout. Deux
 * séances distantes de six semaines donnent un écart qui mesure le calendrier
 * et non la signature, et c'est le seul piège de cette mesure : les barres au
 * delà du seuil sont hachurées, et la bulle le répète.
 */

export interface Ecart {
  horizon: string;
  annees: number;
  bp: number;
  apart: number;
}

const W = 820;
const H = 260;
const P = { l: 56, r: 24, t: 20, b: 44 };

export function EcartTresors({ pays, comparables, seuilJours }: { pays: CourbePays[]; comparables: Record<string, Ecart[]>; seuilJours: number }) {
  const t = useT();
  const noms = pays.map((p) => p.pays);
  const [a, setA] = useState<Country>(noms[0]);
  const [b, setB] = useState<Country>(noms[1] ?? noms[0]);
  const [vise, setVise] = useState<number | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);

  /**
   * Les écarts sont calculés côté serveur pour chaque paire : le client ne
   * refait pas d'appariement, il choisit lequel regarder. Une paire manquante
   * se lit dans l'autre sens, l'écart n'étant qu'un signe à changer.
   */
  const ecarts = useMemo((): Ecart[] => {
    if (a === b) return [];
    const direct = comparables[`${a}|${b}`];
    if (direct) return direct;
    const inverse = comparables[`${b}|${a}`];
    return inverse ? inverse.map((e) => ({ ...e, bp: -e.bp })) : [];
  }, [a, b, comparables]);

  const echelle = useMemo(() => {
    if (!ecarts.length) return null;
    const vs = ecarts.map((e) => e.bp);
    const amplitude = Math.max(Math.abs(Math.min(...vs)), Math.abs(Math.max(...vs)), 25);
    // Symétrique autour de zéro : c'est le signe qui se lit d'abord, et une
    // échelle décentrée ferait croire à une prime là où il y a une décote.
    return { lo: -amplitude * 1.15, hi: amplitude * 1.15 };
  }, [ecarts]);

  const choix = (valeur: Country, poser: (c: Country) => void, id: string, mot: string) => (
    <div className={styles.grp}>
      <label htmlFor={id}>{t(mot)}</label>
      <select id={id} value={valeur} onChange={(e) => poser(e.target.value as Country)}>
        {noms.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div>
      <div className={styles.filtres}>
        {choix(a, setA, "ecart-a", "Trésor")}
        <span className={styles.contre}>{t("contre")}</span>
        {choix(b, setB, "ecart-b", "Référence")}
        <button
          type="button"
          className={`btn sm ghost ${styles.inverser}`}
          onClick={() => {
            setA(b);
            setB(a);
          }}
        >
          {t("Inverser")}
        </button>
      </div>

      {a === b ? (
        <div className="empty">{t("Choisissez deux Trésors différents.")}</div>
      ) : !ecarts.length || !echelle ? (
        <div className="empty">{t("Ces deux Trésors ne portent aucun horizon en commun sur la fenêtre observée.")}</div>
      ) : (
        <>
          <div
            className={styles.fig}
            ref={boite}
            onPointerMove={(e) => {
              const r = boite.current?.getBoundingClientRect();
              if (!r) return;
              const pas = (W - P.l - P.r) / ecarts.length;
              const i = Math.floor((((e.clientX - r.left) / r.width) * W - P.l) / pas);
              setVise(i >= 0 && i < ecarts.length ? i : null);
            }}
            onPointerLeave={() => setVise(null)}
          >
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("Écart entre {a} et {b}, par horizon", { a, b })} className={styles.svg}>
              <defs>
                {/* Les hachures disent « daté, pas mesuré » sans avoir à lire une colonne. */}
                <pattern id="ecart-hachure" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                  <rect width="6" height="6" fill="var(--ink-3)" opacity="0.18" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink-3)" strokeWidth="3" opacity="0.5" />
                </pattern>
              </defs>
              {(() => {
                const Y = (v: number) => H - P.b - ((v - echelle.lo) / (echelle.hi - echelle.lo)) * (H - P.t - P.b);
                const pas = (W - P.l - P.r) / ecarts.length;
                const pasGrille = Math.max(25, Math.ceil(echelle.hi / 4 / 25) * 25);
                const lignes = [];
                for (let v = Math.ceil(echelle.lo / pasGrille) * pasGrille; v <= echelle.hi; v += pasGrille) lignes.push(v);
                return (
                  <>
                    {lignes.map((v) => (
                      <g key={v}>
                        <line x1={P.l} y1={Y(v)} x2={W - P.r} y2={Y(v)} className={styles.grille} />
                        <text x={P.l - 9} y={Y(v) + 4} textAnchor="end" className={styles.tick}>
                          {v > 0 ? `+${v}` : v}
                        </text>
                      </g>
                    ))}
                    {/* Le zéro : c'est lui qui sépare une prime d'une décote. */}
                    <line x1={P.l} y1={Y(0)} x2={W - P.r} y2={Y(0)} className={styles.zero} />
                    <text x={W - P.r - 4} y={Y(0) - 7} textAnchor="end" className={styles.zeroMot}>
                      {t("0 · même prix")}
                    </text>
                    {ecarts.map((e, i) => {
                      const haut = Math.min(Y(0), Y(e.bp));
                      const bas = Math.max(Y(0), Y(e.bp));
                      const date = e.apart > seuilJours;
                      return (
                        <g key={`${e.horizon}-${i}`}>
                          <rect
                            x={P.l + i * pas + pas * 0.24}
                            y={haut}
                            width={pas * 0.52}
                            height={Math.max(1.5, bas - haut)}
                            rx={3}
                            fill={date ? "url(#ecart-hachure)" : e.bp >= 0 ? COUNTRY_COLOR[a] : COUNTRY_COLOR[b]}
                            opacity={vise == null || vise === i ? 1 : 0.5}
                          />
                          <text x={P.l + i * pas + pas * 0.5} y={e.bp >= 0 ? haut - 7 : bas + 15} textAnchor="middle" className={styles.valeur}>
                            {e.bp > 0 ? `+${e.bp}` : e.bp}
                          </text>
                          <text x={P.l + i * pas + pas * 0.5} y={H - P.b + 18} textAnchor="middle" className={styles.tick}>
                            {e.horizon}
                          </text>
                        </g>
                      );
                    })}
                    <path d={`M${P.l} ${P.t}V${H - P.b}`} className={styles.axe} />
                  </>
                );
              })()}
            </svg>

            {vise != null && (
              <div className={styles.bulle} style={{ left: `${Math.min(((P.l + vise * ((W - P.l - P.r) / ecarts.length)) / W) * 100 + 2, 70)}%`, top: "6%" }}>
                <div className={styles.bulleTitre}>{ecarts[vise].horizon}</div>
                <div className={styles.bulleLigne}>
                  <span>{t("Écart")}</span>
                  <b>{`${ecarts[vise].bp > 0 ? "+" : ""}${ecarts[vise].bp} pb`}</b>
                </div>
                <div className={styles.bulleLigne}>
                  <span>{ecarts[vise].bp >= 0 ? t("{a} paie plus cher", { a }) : t("{b} paie plus cher", { b })}</span>
                </div>
                <div className={styles.bulleNote}>
                  {ecarts[vise].apart > seuilJours
                    ? t("{n} jours entre les deux séances : cet écart mesure le calendrier, pas la signature.", { n: ecarts[vise].apart })
                    : t("{n} jours entre les deux séances : comparable.", { n: ecarts[vise].apart })}
                </div>
              </div>
            )}
          </div>

          <div className={styles.legende}>
            <span>
              <i style={{ background: COUNTRY_COLOR[a] }} aria-hidden="true" />
              {t("{a} paie plus cher", { a })}
            </span>
            <span>
              <i style={{ background: COUNTRY_COLOR[b] }} aria-hidden="true" />
              {t("{b} paie plus cher", { b })}
            </span>
            <span className="muted">
              <i className={styles.hachure} aria-hidden="true" />
              {t("séances trop éloignées : écart daté, pas mesuré")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
